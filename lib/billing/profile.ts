import type { BillingProfileDocument, UserDocument } from "@/types/user"

import type { BillingProfileInput, BillingProfilePayload } from "@/types/billing"

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : ""
}

export function validateBillingProfileInput(body: Record<string, unknown>): BillingProfileInput | null {
  const fullName = clean(body.fullName)
  const email = clean(body.email).toLowerCase()
  const phone = clean(body.phone)
  const addressLine1 = clean(body.addressLine1)
  const city = clean(body.city)
  const county = clean(body.county)
  const country = clean(body.country)
  const postalCode = clean(body.postalCode)

  if (!fullName || !emailPattern.test(email)) return null
  if (!phone || !addressLine1 || !city || !county || !country || !postalCode) return null

  return {
    type: "individual",
    fullName,
    email,
    phone,
    addressLine1,
    city,
    county,
    country,
    postalCode,
  }
}

export function isBillingProfileComplete(profile?: Partial<BillingProfileDocument> | null) {
  if (!profile) return false

  const required = [
    profile.fullName,
    profile.email,
    profile.phone,
    profile.addressLine1,
    profile.city,
    profile.county,
    profile.country,
    profile.postalCode,
  ]

  return profile.type === "individual" && Boolean(profile.isComplete) && required.every((value) => {
    return typeof value === "string" && value.trim().length > 0
  })
}

export function getBillingProfilePayload(userDocument?: UserDocument | null): BillingProfilePayload | null {
  const profile = userDocument?.billingProfile

  if (!profile) return null

  return {
    type: "individual",
    fullName: profile.fullName ?? "",
    email: profile.email ?? "",
    phone: profile.phone ?? "",
    addressLine1: profile.addressLine1 ?? "",
    city: profile.city ?? "",
    county: profile.county ?? "",
    country: profile.country ?? "",
    postalCode: profile.postalCode ?? "",
    isComplete: isBillingProfileComplete(profile),
  }
}
