import "server-only"

import type Stripe from "stripe"

import { getUserDocument } from "@/lib/firebase/firestore"
import { logInfo } from "@/lib/logging/logger"
import { getOblioBillingPhase } from "@/lib/oblio/invoice"
import { recordReferralConversion } from "@/lib/partners/store"

export async function recordPaidReferralFromInvoice(params: {
  uid: string
  invoice: Stripe.Invoice
}) {
  const user = await getUserDocument(params.uid)
  const partnerCode = user?.referredBy
  if (!partnerCode) return false
  if (user.premiumSource === "complimentary_partner") return false

  const amountPaid = params.invoice.amount_paid ?? 0
  if (amountPaid <= 0) return false

  const created = await recordReferralConversion({
    conversionId: `${partnerCode}:invoice:${params.invoice.id}`,
    type: "invoice_paid",
    partnerCode,
    uid: params.uid,
    email: user.email ?? null,
    plan: typeof params.invoice.metadata?.plan === "string" ? params.invoice.metadata.plan : user.subscriptionPlan,
    interval:
      typeof params.invoice.metadata?.interval === "string"
        ? params.invoice.metadata.interval
        : user.subscriptionInterval ?? null,
    amountPaid,
    currency: params.invoice.currency,
    billingPhase: getOblioBillingPhase(params.invoice),
    stripeInvoiceId: params.invoice.id,
  })

  if (created) {
    await logInfo("partners", "referral_invoice_attributed", {
      uid: params.uid,
      partnerCode,
      stripeInvoiceId: params.invoice.id,
      amountPaid,
      billingPhase: getOblioBillingPhase(params.invoice),
    })
  }

  return created
}
