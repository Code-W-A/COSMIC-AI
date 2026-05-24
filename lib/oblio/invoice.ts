import "server-only"

import { randomUUID } from "node:crypto"

import { FieldValue, Timestamp } from "firebase-admin/firestore"
import type Stripe from "stripe"

import { isBillingProfileComplete } from "@/lib/billing/profile"
import {
  getInvoiceCorrectionRef,
  getInvoiceJobRef,
  getInvoiceJobsCollection,
  getSystemLockRef,
  getUserDocument,
} from "@/lib/firebase/firestore"
import { getAdminDb } from "@/lib/firebase/admin"
import { logError, logInfo, logWarn } from "@/lib/logging/logger"
import { oblioClient } from "@/lib/oblio/client"
import { getOblioConfig } from "@/lib/oblio/config"

const RETRY_DELAYS_MS = [5 * 60 * 1000, 30 * 60 * 1000, 2 * 60 * 60 * 1000, 12 * 60 * 60 * 1000]
const OBLIO_RETRY_LOCK_NAME = "oblioRetry"
const OBLIO_RETRY_LOCK_TTL_MS = 8 * 60 * 1000

type OblioInvoiceResponse = {
  status?: number
  statusMessage?: string
  data?: {
    seriesName?: string
    number?: string | number
    link?: string
  }
}

type CorrectionStatus = "pending" | "issued" | "failed" | "pending_manual" | "voided"

function getExpandableId(value: unknown) {
  if (!value) return null
  if (typeof value === "string") return value
  if (typeof value === "object" && "id" in value && typeof value.id === "string") {
    return value.id
  }
  return null
}

function getSubscriptionIdFromInvoice(invoice: Stripe.Invoice) {
  const parentSubscription =
    invoice.parent?.type === "subscription_details"
      ? invoice.parent.subscription_details?.subscription
      : null
  const parentId = getExpandableId(parentSubscription)

  if (parentId) return parentId

  return getExpandableId((invoice as Stripe.Invoice & { subscription?: unknown }).subscription)
}

function getPlanLabel(invoice: Stripe.Invoice) {
  const metadataPlan = typeof invoice.metadata?.plan === "string" ? invoice.metadata.plan : ""

  if (metadataPlan === "premium") return "Premium"
  if (metadataPlan === "cosmic_plus") return "Cosmic Plus"

  const lineDescription = invoice.lines.data.find((line) => line.description)?.description
  if (lineDescription) return lineDescription

  return "Cosmic AI Subscription"
}

function toCurrencyValue(valueInCents?: number | null) {
  if (typeof valueInCents !== "number") return 0
  return Number((valueInCents / 100).toFixed(2))
}

function formatDateFromUnix(unixSeconds?: number | null) {
  if (!unixSeconds) return new Date().toISOString().slice(0, 10)
  return new Date(unixSeconds * 1000).toISOString().slice(0, 10)
}

function getNextRetryTimestamp(attemptCount: number) {
  const delay = RETRY_DELAYS_MS[attemptCount - 1]
  if (!delay) return null
  return Timestamp.fromMillis(Date.now() + delay)
}

function getLastError(error: unknown) {
  if (error instanceof Error) return error.message
  if (typeof error === "string") return error
  return "Unknown Oblio error"
}

function toRetryInvoiceSnapshot(invoice: Stripe.Invoice) {
  return {
    id: invoice.id,
    customer: invoice.customer,
    amount_paid: invoice.amount_paid,
    amount_due: invoice.amount_due,
    total: invoice.total,
    currency: invoice.currency,
    metadata: invoice.metadata ?? {},
    status_transitions: invoice.status_transitions ?? {},
    parent: invoice.parent ?? null,
    subscription: (invoice as Stripe.Invoice & { subscription?: unknown }).subscription ?? null,
    lines: {
      data: (invoice.lines?.data ?? []).map((line) => ({
        description: line.description ?? "",
      })),
    },
  }
}

function getOblioInvoiceData(response: OblioInvoiceResponse) {
  return {
    seriesName: typeof response.data?.seriesName === "string" ? response.data.seriesName : undefined,
    number:
      typeof response.data?.number === "string" || typeof response.data?.number === "number"
        ? String(response.data.number)
        : undefined,
    link: typeof response.data?.link === "string" ? response.data.link : undefined,
  }
}

function toMillisFromTimestampLike(value: unknown) {
  if (!value || typeof value !== "object") return 0
  const maybeTimestamp = value as { seconds?: unknown }
  if (typeof maybeTimestamp.seconds === "number") return maybeTimestamp.seconds * 1000
  return 0
}

async function acquireRetryLock() {
  const owner = randomUUID()
  const lockRef = getSystemLockRef(OBLIO_RETRY_LOCK_NAME)
  const now = Date.now()

  const acquired = await getAdminDb().runTransaction(async (tx) => {
    const snapshot = await tx.get(lockRef)
    const data = snapshot.data() as Record<string, unknown> | undefined
    const expiresAtMs = typeof data?.expiresAtMs === "number" ? data.expiresAtMs : 0

    if (expiresAtMs > now) {
      return false
    }

    tx.set(
      lockRef,
      {
        owner,
        expiresAtMs: now + OBLIO_RETRY_LOCK_TTL_MS,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    )

    return true
  })

  return acquired ? owner : null
}

async function releaseRetryLock(owner: string) {
  const lockRef = getSystemLockRef(OBLIO_RETRY_LOCK_NAME)

  await getAdminDb().runTransaction(async (tx) => {
    const snapshot = await tx.get(lockRef)
    const data = snapshot.data() as Record<string, unknown> | undefined

    if (data?.owner !== owner) return

    tx.set(
      lockRef,
      {
        owner: FieldValue.delete(),
        expiresAtMs: 0,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    )
  })
}

async function buildInvoicePayload(uid: string, invoice: Stripe.Invoice) {
  const userDocument = await getUserDocument(uid)

  if (!userDocument?.billingProfile || !isBillingProfileComplete(userDocument.billingProfile)) {
    throw new Error("Billing profile is incomplete.")
  }

  const profile = userDocument.billingProfile
  const config = getOblioConfig()

  return {
    cif: config.cif,
    idempotencyKey: invoice.id,
    seriesName: config.seriesName,
    issueDate: formatDateFromUnix(invoice.status_transitions?.paid_at ?? null),
    language: config.language,
    currency: config.currency,
    sendEmail: config.sendEmail ? 1 : 0,
    client: {
      cif: "",
      name: profile.fullName,
      address: profile.addressLine1,
      state: profile.county,
      city: profile.city,
      country: profile.country,
      email: profile.email,
      phone: profile.phone,
      contact: profile.fullName,
      vatPayer: 0,
    },
    products: [
      {
        name: getPlanLabel(invoice),
        price: toCurrencyValue(invoice.amount_paid || invoice.amount_due || invoice.total),
        currency: config.currency,
        quantity: 1,
        vatIncluded: 1,
        productType: "Serviciu",
        measuringUnit: "buc",
      },
    ],
    internalNote: `Stripe invoice ${invoice.id}`,
  }
}

async function createManualCorrection(
  correctionRef: FirebaseFirestore.DocumentReference,
  payload: {
    uid: string
    stripeInvoiceId: string
    stripeCreditNoteId?: string
    stripeEventId?: string
    amount?: number
    currency?: string
    action: "credit_note_created" | "credit_note_voided" | "invoice_voided"
    lastError: string
    rawStripeObject?: Record<string, unknown>
    previousAttemptCount?: number
  }
) {
  const attemptCount = (payload.previousAttemptCount ?? 0) + 1

  await correctionRef.set(
    {
      uid: payload.uid,
      stripeInvoiceId: payload.stripeInvoiceId,
      stripeCreditNoteId: payload.stripeCreditNoteId,
      stripeEventId: payload.stripeEventId,
      amount: payload.amount,
      currency: payload.currency,
      action: payload.action,
      status: "pending_manual",
      attemptCount,
      lastError: payload.lastError,
      rawStripeObject: payload.rawStripeObject ?? null,
      updatedAt: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  )

  return { status: "pending_manual" as const }
}

export async function issueOblioInvoiceForStripeInvoice(params: { uid: string; invoice: Stripe.Invoice }) {
  const { uid, invoice } = params
  const stripeInvoiceId = invoice.id
  const stripeCustomerId = getExpandableId(invoice.customer)
  const stripeSubscriptionId = getSubscriptionIdFromInvoice(invoice)
  const jobRef = getInvoiceJobRef(stripeInvoiceId)
  const jobSnapshot = await jobRef.get()
  const existing = jobSnapshot.data() as Record<string, unknown> | undefined

  if (existing?.status === "issued") {
    return { status: "issued" as const }
  }

  const attemptCount = typeof existing?.attemptCount === "number" ? existing.attemptCount + 1 : 1

  try {
    const payload = await buildInvoicePayload(uid, invoice)
    const response = await oblioClient.request<OblioInvoiceResponse>("/api/docs/invoice", {
      method: "POST",
      body: payload,
      idempotencyKey: stripeInvoiceId,
    })

    await jobRef.set(
      {
        uid,
        stripeInvoiceId,
        stripeCustomerId,
        stripeSubscriptionId,
        rawStripeInvoice: toRetryInvoiceSnapshot(invoice),
        status: "issued",
        attemptCount,
        lastError: FieldValue.delete(),
        nextRetryAt: FieldValue.delete(),
        oblioInvoice: getOblioInvoiceData(response),
        createdAt: existing?.createdAt ?? FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    )

    await logInfo("oblio.invoice", "oblio_invoice_issued", {
      uid,
      stripeInvoiceId,
      stripeSubscriptionId,
    })

    return { status: "issued" as const }
  } catch (error) {
    const nextRetryAt = getNextRetryTimestamp(attemptCount)
    const status = nextRetryAt ? "pending" : "failed"

    await jobRef.set(
      {
        uid,
        stripeInvoiceId,
        stripeCustomerId,
        stripeSubscriptionId,
        rawStripeInvoice: toRetryInvoiceSnapshot(invoice),
        status,
        attemptCount,
        lastError: getLastError(error),
        nextRetryAt: nextRetryAt ?? FieldValue.delete(),
        createdAt: existing?.createdAt ?? FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    )

    await logWarn("oblio.invoice", "oblio_invoice_issue_failed", {
      uid,
      stripeInvoiceId,
      stripeSubscriptionId,
      attemptCount,
      status,
      error,
    })

    return { status: status as "pending" | "failed" }
  }
}

async function getIssuedOblioInvoiceForStripeInvoice(stripeInvoiceId: string) {
  const snapshot = await getInvoiceJobRef(stripeInvoiceId).get()
  const data = snapshot.data() as Record<string, unknown> | undefined
  const oblioInvoice = data?.oblioInvoice as Record<string, unknown> | undefined

  if (!oblioInvoice || typeof oblioInvoice !== "object") {
    return null
  }

  const seriesName = typeof oblioInvoice.seriesName === "string" ? oblioInvoice.seriesName : ""
  const number =
    typeof oblioInvoice.number === "string" || typeof oblioInvoice.number === "number"
      ? String(oblioInvoice.number)
      : ""

  if (!seriesName || !number) return null

  return {
    seriesName,
    number,
  }
}

async function issuePartialCorrectionForCreditNote(params: {
  uid: string
  stripeInvoiceId: string
  creditNote: Stripe.CreditNote
  correctionId: string
  stripeEventId?: string
  existingAttemptCount?: number
}) {
  const { uid, stripeInvoiceId, creditNote, correctionId, stripeEventId, existingAttemptCount } = params
  const correctionRef = getInvoiceCorrectionRef(correctionId)
  const originalInvoice = await getIssuedOblioInvoiceForStripeInvoice(stripeInvoiceId)
  const total = typeof creditNote.total === "number" ? creditNote.total : 0

  if (!originalInvoice) {
    return createManualCorrection(correctionRef, {
      uid,
      stripeInvoiceId,
      stripeCreditNoteId: creditNote.id,
      stripeEventId,
      amount: total,
      currency: creditNote.currency,
      action: "credit_note_created",
      lastError: "Missing issued Oblio invoice for referenced Stripe invoice.",
      rawStripeObject: {
        id: creditNote.id,
        invoice: getExpandableId(creditNote.invoice),
        total,
        currency: creditNote.currency,
      },
      previousAttemptCount: existingAttemptCount,
    })
  }

  if (total <= 0) {
    return createManualCorrection(correctionRef, {
      uid,
      stripeInvoiceId,
      stripeCreditNoteId: creditNote.id,
      stripeEventId,
      amount: total,
      currency: creditNote.currency,
      action: "credit_note_created",
      lastError: "Credit note total must be greater than zero for partial storno.",
      rawStripeObject: {
        id: creditNote.id,
        invoice: getExpandableId(creditNote.invoice),
        total,
        currency: creditNote.currency,
      },
      previousAttemptCount: existingAttemptCount,
    })
  }

  const config = getOblioConfig()

  const payload = {
    cif: config.cif,
    seriesName: config.seriesName,
    issueDate: formatDateFromUnix(creditNote.created),
    language: config.language,
    currency: config.currency,
    referenceDocument: {
      type: "Factura",
      seriesName: originalInvoice.seriesName,
      number: Number(originalInvoice.number),
      refund: 1,
    },
    products: [
      {
        name: `Storno partial Stripe ${stripeInvoiceId}`,
        price: toCurrencyValue(total),
        currency: config.currency,
        quantity: 1,
        vatIncluded: 1,
        productType: "Serviciu",
        measuringUnit: "buc",
      },
    ],
    internalNote: `Stripe credit note ${creditNote.id}`,
  }

  const attemptCount = (existingAttemptCount ?? 0) + 1

  try {
    const response = await oblioClient.request<OblioInvoiceResponse>("/api/docs/invoice", {
      method: "POST",
      body: payload,
      idempotencyKey: creditNote.id,
    })

    await correctionRef.set(
      {
        uid,
        stripeInvoiceId,
        stripeCreditNoteId: creditNote.id,
        stripeEventId,
        amount: total,
        currency: creditNote.currency,
        action: "credit_note_created",
        status: "issued",
        attemptCount,
        lastError: FieldValue.delete(),
        nextRetryAt: FieldValue.delete(),
        oblioInvoice: getOblioInvoiceData(response),
        rawStripeObject: {
          id: creditNote.id,
          invoice: getExpandableId(creditNote.invoice),
          total,
          currency: creditNote.currency,
          type: creditNote.type,
        },
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    )

    await logInfo("oblio.correction", "oblio_partial_correction_issued", {
      uid,
      stripeInvoiceId,
      stripeCreditNoteId: creditNote.id,
    })

    return { status: "issued" as const }
  } catch (error) {
    await correctionRef.set(
      {
        uid,
        stripeInvoiceId,
        stripeCreditNoteId: creditNote.id,
        stripeEventId,
        amount: total,
        currency: creditNote.currency,
        action: "credit_note_created",
        status: "pending_manual",
        attemptCount,
        lastError: getLastError(error),
        rawStripeObject: {
          id: creditNote.id,
          invoice: getExpandableId(creditNote.invoice),
          total,
          currency: creditNote.currency,
          type: creditNote.type,
        },
        nextRetryAt: FieldValue.delete(),
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    )

    await logWarn("oblio.correction", "oblio_partial_correction_pending_manual", {
      uid,
      stripeInvoiceId,
      stripeCreditNoteId: creditNote.id,
      error,
    })

    return { status: "pending_manual" as const }
  }
}

export async function issueOblioCorrectionForStripeCreditNote(params: {
  uid: string
  creditNote: Stripe.CreditNote
  stripeEventId?: string
}) {
  const { uid, creditNote, stripeEventId } = params
  const stripeInvoiceId = getExpandableId(creditNote.invoice)

  if (!stripeInvoiceId) {
    return { status: "pending_manual" as const }
  }

  const correctionId = `credit_note:${creditNote.id}`
  const correctionRef = getInvoiceCorrectionRef(correctionId)
  const snapshot = await correctionRef.get()
  const existing = snapshot.data() as Record<string, unknown> | undefined

  if (existing?.status === "issued") {
    return { status: "issued" as const }
  }

  const existingAttemptCount = typeof existing?.attemptCount === "number" ? existing.attemptCount : 0

  return issuePartialCorrectionForCreditNote({
    uid,
    stripeInvoiceId,
    creditNote,
    correctionId,
    stripeEventId,
    existingAttemptCount,
  })
}

export async function markOblioCorrectionVoided(params: {
  uid: string
  creditNote: Stripe.CreditNote
  stripeEventId?: string
}) {
  const { uid, creditNote, stripeEventId } = params
  const stripeInvoiceId = getExpandableId(creditNote.invoice)

  if (!stripeInvoiceId) {
    return { status: "pending_manual" as const }
  }

  const correctionId = `credit_note:${creditNote.id}`
  const correctionRef = getInvoiceCorrectionRef(correctionId)
  const snapshot = await correctionRef.get()
  const existing = snapshot.data() as Record<string, unknown> | undefined
  const existingAttemptCount = typeof existing?.attemptCount === "number" ? existing.attemptCount : 0
  const oblioInvoice = existing?.oblioInvoice as Record<string, unknown> | undefined
  const seriesName = typeof oblioInvoice?.seriesName === "string" ? oblioInvoice.seriesName : ""
  const number =
    typeof oblioInvoice?.number === "string" || typeof oblioInvoice?.number === "number"
      ? String(oblioInvoice.number)
      : ""

  if (!seriesName || !number) {
    return createManualCorrection(correctionRef, {
      uid,
      stripeInvoiceId,
      stripeCreditNoteId: creditNote.id,
      stripeEventId,
      amount: typeof creditNote.total === "number" ? creditNote.total : undefined,
      currency: creditNote.currency,
      action: "credit_note_voided",
      lastError: "Missing Oblio correction invoice reference for credit note void.",
      rawStripeObject: {
        id: creditNote.id,
        invoice: stripeInvoiceId,
      },
      previousAttemptCount: existingAttemptCount,
    })
  }

  const config = getOblioConfig()
  const attemptCount = existingAttemptCount + 1

  try {
    await oblioClient.request<OblioInvoiceResponse>("/api/docs/invoice/cancel", {
      method: "PUT",
      body: {
        cif: config.cif,
        seriesName,
        number,
      },
      bodyFormat: "form",
      idempotencyKey: `${creditNote.id}:void`,
    })

    await correctionRef.set(
      {
        uid,
        stripeInvoiceId,
        stripeCreditNoteId: creditNote.id,
        stripeEventId,
        action: "credit_note_voided",
        status: "voided",
        attemptCount,
        lastError: FieldValue.delete(),
        updatedAt: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    )

    await logInfo("oblio.correction", "oblio_correction_voided", {
      uid,
      stripeInvoiceId,
      stripeCreditNoteId: creditNote.id,
    })

    return { status: "voided" as const }
  } catch (error) {
    await correctionRef.set(
      {
        uid,
        stripeInvoiceId,
        stripeCreditNoteId: creditNote.id,
        stripeEventId,
        action: "credit_note_voided",
        status: "failed",
        attemptCount,
        lastError: getLastError(error),
        updatedAt: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    )

    await logWarn("oblio.correction", "oblio_correction_void_failed", {
      uid,
      stripeInvoiceId,
      stripeCreditNoteId: creditNote.id,
      error,
    })

    return { status: "failed" as const }
  }
}

export async function cancelOblioInvoiceForStripeInvoice(params: {
  uid: string
  stripeInvoiceId: string
  stripeEventId?: string
}) {
  const { uid, stripeInvoiceId, stripeEventId } = params
  const correctionId = `invoice_void:${stripeInvoiceId}`
  const correctionRef = getInvoiceCorrectionRef(correctionId)
  const snapshot = await correctionRef.get()
  const existing = snapshot.data() as Record<string, unknown> | undefined

  if (existing?.status === "issued") {
    return { status: "issued" as const }
  }

  const sourceInvoice = await getIssuedOblioInvoiceForStripeInvoice(stripeInvoiceId)
  const attemptCount = typeof existing?.attemptCount === "number" ? existing.attemptCount + 1 : 1

  if (!sourceInvoice) {
    return createManualCorrection(correctionRef, {
      uid,
      stripeInvoiceId,
      stripeEventId,
      action: "invoice_voided",
      lastError: "Missing issued Oblio invoice for Stripe invoice void event.",
      rawStripeObject: {
        stripeInvoiceId,
      },
      previousAttemptCount: attemptCount - 1,
    })
  }

  const config = getOblioConfig()

  try {
    await oblioClient.request<OblioInvoiceResponse>("/api/docs/invoice/cancel", {
      method: "PUT",
      body: {
        cif: config.cif,
        seriesName: sourceInvoice.seriesName,
        number: sourceInvoice.number,
      },
      bodyFormat: "form",
      idempotencyKey: `invoice_void:${stripeInvoiceId}`,
    })

    await correctionRef.set(
      {
        uid,
        stripeInvoiceId,
        stripeEventId,
        action: "invoice_voided",
        status: "issued",
        attemptCount,
        lastError: FieldValue.delete(),
        updatedAt: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    )

    await logInfo("oblio.correction", "oblio_invoice_canceled_from_void", {
      uid,
      stripeInvoiceId,
    })

    return { status: "issued" as const }
  } catch (error) {
    await correctionRef.set(
      {
        uid,
        stripeInvoiceId,
        stripeEventId,
        action: "invoice_voided",
        status: "failed",
        attemptCount,
        lastError: getLastError(error),
        updatedAt: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    )

    await logWarn("oblio.correction", "oblio_invoice_cancel_failed", {
      uid,
      stripeInvoiceId,
      error,
    })

    return { status: "failed" as const }
  }
}

export async function runPendingOblioRetries(limit = 20) {
  const lockOwner = await acquireRetryLock()

  if (!lockOwner) {
    await logWarn("oblio.retry", "oblio_retry_lock_active")
    return {
      processed: 0,
      skippedDueToLock: true,
      results: [] as Array<{ stripeInvoiceId: string; status: "issued" | "pending" | "failed" | "skipped" }>,
    }
  }

  try {
    const now = Timestamp.now()
    const snapshot = await getInvoiceJobsCollection()
      .where("status", "==", "pending")
      .where("nextRetryAt", "<=", now)
      .orderBy("nextRetryAt", "asc")
      .limit(limit)
      .get()

    const results: Array<{ stripeInvoiceId: string; status: "issued" | "pending" | "failed" | "skipped" }> = []

    for (const doc of snapshot.docs) {
      const data = doc.data() as Record<string, unknown>
      const stripeInvoiceId = doc.id
      const uid = typeof data.uid === "string" ? data.uid : ""

      if (!uid) {
        await doc.ref.set(
          {
            status: "failed",
            lastError: "Missing uid for invoice job.",
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        )

        results.push({ stripeInvoiceId, status: "failed" })
        continue
      }

      const stripeInvoiceIdFromJob = typeof data.stripeInvoiceId === "string" ? data.stripeInvoiceId : stripeInvoiceId

      try {
        const rawInvoice = data.rawStripeInvoice

        if (!rawInvoice || typeof rawInvoice !== "object") {
          await logWarn("oblio.invoice", "oblio_retry_missing_invoice_payload", {
            uid,
            stripeInvoiceId,
          })
          await doc.ref.set(
            {
              status: "failed",
              lastError: "Missing rawStripeInvoice payload for retry.",
              nextRetryAt: FieldValue.delete(),
              updatedAt: FieldValue.serverTimestamp(),
            },
            { merge: true }
          )
          results.push({ stripeInvoiceId, status: "failed" })
          continue
        }

        const invoice = rawInvoice as Stripe.Invoice
        const outcome = await issueOblioInvoiceForStripeInvoice({ uid, invoice })
        results.push({ stripeInvoiceId: stripeInvoiceIdFromJob, status: outcome.status })
      } catch (error) {
        await logError("oblio.invoice", "oblio_retry_failed", {
          uid,
          stripeInvoiceId,
          error,
        })
        results.push({ stripeInvoiceId: stripeInvoiceIdFromJob, status: "failed" })
      }
    }

    return {
      processed: results.length,
      skippedDueToLock: false,
      lockAgeMs: Date.now() - toMillisFromTimestampLike((await getSystemLockRef(OBLIO_RETRY_LOCK_NAME).get()).data()?.updatedAt),
      results,
    }
  } finally {
    await releaseRetryLock(lockOwner)
  }
}
