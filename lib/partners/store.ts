import "server-only"

import { FieldValue } from "firebase-admin/firestore"
import type { UserRecord } from "firebase-admin/auth"

import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin"
import { normalizeEmail, normalizeReferralCode } from "@/lib/partners/codes"
import type {
  PartnerDocument,
  PartnerStatus,
  ReferralConversionDocument,
  ReferralConversionType,
} from "@/lib/partners/types"

export function getPartnersCollection() {
  return getAdminDb().collection("partners")
}

export function getPartnerRef(code: string) {
  return getPartnersCollection().doc(code)
}

export function getReferralConversionsCollection() {
  return getAdminDb().collection("referralConversions")
}

export function getReferralConversionRef(conversionId: string) {
  return getReferralConversionsCollection().doc(conversionId)
}

export async function getActivePartnerByCode(code: string | null): Promise<PartnerDocument | null> {
  const normalized = normalizeReferralCode(code)
  if (!normalized) return null

  const snapshot = await getPartnerRef(normalized).get()
  if (!snapshot.exists) return null

  const data = snapshot.data() as PartnerDocument
  if (data.status !== "active") return null
  return { ...data, code: normalized }
}

export async function getActivePartnerByEmail(email: string | null): Promise<PartnerDocument | null> {
  const normalized = normalizeEmail(email)
  if (!normalized) return null

  const snapshot = await getPartnersCollection().where("email", "==", normalized).limit(5).get()

  const match = snapshot.docs
    .map((doc) => doc.data() as PartnerDocument)
    .find((partner) => partner.status === "active")

  return match ?? null
}

export async function listPartners(): Promise<PartnerDocument[]> {
  const snapshot = await getPartnersCollection().get()
  return snapshot.docs
    .map((doc) => doc.data() as PartnerDocument)
    .sort((left, right) => left.name.localeCompare(right.name))
}

export async function upsertPartner(input: {
  code: string
  name: string
  email: string
  uid?: string | null
  grantPremium?: boolean
  commissionPercent?: number
  discountPercent?: number
  status?: PartnerStatus
}): Promise<PartnerDocument> {
  const code = normalizeReferralCode(input.code)
  const email = normalizeEmail(input.email)
  const name = input.name.trim()

  if (!code) {
    throw new Error("Invalid partner code.")
  }
  if (!email) {
    throw new Error("Invalid partner email.")
  }
  if (!name) {
    throw new Error("Partner name is required.")
  }

  const existing = await getPartnerRef(code).get()
  const payload = {
    code,
    name,
    email,
    uid: input.uid ?? existing.get("uid") ?? null,
    status: input.status ?? "active",
    grantPremium: input.grantPremium ?? true,
    commissionPercent: clampPercent(input.commissionPercent, 20),
    discountPercent: clampPercent(input.discountPercent, 20),
    updatedAt: FieldValue.serverTimestamp(),
    createdAt: existing.exists ? existing.get("createdAt") : FieldValue.serverTimestamp(),
  }

  await getPartnerRef(code).set(payload, { merge: true })
  return payload as unknown as PartnerDocument
}

function clampPercent(value: number | undefined, fallback: number) {
  if (typeof value !== "number" || Number.isNaN(value)) return fallback
  return Math.min(100, Math.max(0, Math.round(value)))
}

export async function listAdminUsers(query: string): Promise<
  Array<{ uid: string; email: string; displayName: string }>
> {
  const normalizedQuery = query.trim().toLowerCase()
  const [authList, snapshot] = await Promise.all([
    getAdminAuth()
      .listUsers(1000)
      .catch(() => ({ users: [] as UserRecord[] })),
    getAdminDb().collection("users").limit(500).get(),
  ])

  const usersByUid = new Map<string, { uid: string; email: string; displayName: string }>()

  for (const record of authList.users) {
    usersByUid.set(record.uid, {
      uid: record.uid,
      email: record.email ?? "",
      displayName: record.displayName ?? "",
    })
  }

  for (const doc of snapshot.docs) {
    const data = doc.data() as { email?: unknown; displayName?: unknown; name?: unknown }
    const existing = usersByUid.get(doc.id)
    const email =
      typeof data.email === "string" && data.email
        ? data.email
        : existing?.email ?? ""
    const displayName =
      (typeof data.displayName === "string" && data.displayName) ||
      (typeof data.name === "string" && data.name) ||
      existing?.displayName ||
      ""
    usersByUid.set(doc.id, { uid: doc.id, email, displayName })
  }

  const users = Array.from(usersByUid.values())

  if (!normalizedQuery) {
    return users
      .filter((user) => user.email)
      .sort((left, right) => left.email.localeCompare(right.email))
      .slice(0, 50)
  }

  return users
    .filter((user) => {
      const email = user.email.toLowerCase()
      const name = user.displayName.toLowerCase()
      return email.includes(normalizedQuery) || name.includes(normalizedQuery) || user.uid === query.trim()
    })
    .sort((left, right) => left.email.localeCompare(right.email))
    .slice(0, 50)
}

export async function recordReferralConversion(params: {
  conversionId: string
  type: ReferralConversionType
  partnerCode: string
  uid: string
  email?: string | null
  plan?: string | null
  interval?: string | null
  amountPaid?: number | null
  currency?: string | null
  billingPhase?: string | null
  stripeInvoiceId?: string | null
  stripeSessionId?: string | null
}): Promise<boolean> {
  const ref = getReferralConversionRef(params.conversionId)
  const existing = await ref.get()
  if (existing.exists) return false

  const document: Record<string, unknown> = {
    type: params.type,
    partnerCode: params.partnerCode,
    uid: params.uid,
    email: params.email ?? null,
    createdAt: FieldValue.serverTimestamp(),
  }

  if (params.plan) document.plan = params.plan
  if (params.interval) document.interval = params.interval
  if (typeof params.amountPaid === "number") document.amountPaid = params.amountPaid
  if (params.currency) document.currency = params.currency
  if (params.billingPhase) document.billingPhase = params.billingPhase
  if (params.stripeInvoiceId) document.stripeInvoiceId = params.stripeInvoiceId
  if (params.stripeSessionId) document.stripeSessionId = params.stripeSessionId

  await ref.create(document)
  return true
}

export async function listConversionsForPartner(partnerCode: string): Promise<ReferralConversionDocument[]> {
  const snapshot = await getReferralConversionsCollection()
    .where("partnerCode", "==", partnerCode)
    .limit(200)
    .get()

  return snapshot.docs
    .map((doc) => doc.data() as ReferralConversionDocument)
    .sort((left, right) => {
      const leftMs =
        typeof left.createdAt?.seconds === "number" ? left.createdAt.seconds : 0
      const rightMs =
        typeof right.createdAt?.seconds === "number" ? right.createdAt.seconds : 0
      return rightMs - leftMs
    })
}

export async function getConversionCountsByPartner(): Promise<
  Record<string, { signupCount: number; paidCount: number; paidAmountTotal: number }>
> {
  const snapshot = await getReferralConversionsCollection().get()
  const counts: Record<string, { signupCount: number; paidCount: number; paidAmountTotal: number }> = {}

  for (const doc of snapshot.docs) {
    const data = doc.data() as ReferralConversionDocument
    const code = data.partnerCode
    if (!code) continue
    if (!counts[code]) {
      counts[code] = { signupCount: 0, paidCount: 0, paidAmountTotal: 0 }
    }
    if (data.type === "signup") counts[code].signupCount += 1
    if (data.type === "invoice_paid") {
      counts[code].paidCount += 1
      counts[code].paidAmountTotal += typeof data.amountPaid === "number" ? data.amountPaid : 0
    }
  }

  return counts
}
