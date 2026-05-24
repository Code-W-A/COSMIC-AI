import type { BillingProfileDocument, UserDocument } from "@/types/user"

import type { BillingProfileInput, BillingProfilePayload } from "@/types/billing"
import {
  BUCHAREST_SECTORS,
  ROMANIA_COUNTIES,
  canonicalizeRomaniaCity,
  canonicalizeRomaniaCounty,
  isBucharestCounty,
  isRomaniaCountry,
  normalizeCountryValue,
} from "@/lib/billing/address"

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : ""
}

export function validateBillingProfileInput(body: Record<string, unknown>): BillingProfileInput | null {
  const fullName = clean(body.fullName)
  const email = clean(body.email).toLowerCase()
  const phone = clean(body.phone)
  const addressLine1 = clean(body.addressLine1)
  const countryRaw = clean(body.country)
  const countyRaw = clean(body.county)
  const cityRaw = clean(body.city)
  const postalCode = clean(body.postalCode)

  if (!fullName || !emailPattern.test(email)) return null
  if (!phone || !addressLine1 || !cityRaw || !countyRaw || !countryRaw || !postalCode) return null

  const country = normalizeCountryValue(countryRaw)
  let county = countyRaw
  let city = cityRaw

  if (isRomaniaCountry(country)) {
    county = canonicalizeRomaniaCounty(countyRaw)
    const normalizedCounty = county.toLowerCase()

    const isAllowedCounty = ROMANIA_COUNTIES.some(
      (knownCounty) => knownCounty.toLowerCase() === normalizedCounty
    )
    if (!isAllowedCounty) return null

    city = canonicalizeRomaniaCity(county, cityRaw)

    if (isBucharestCounty(county)) {
      const isAllowedSector = BUCHAREST_SECTORS.some(
        (sector) => sector.toLowerCase() === city.toLowerCase()
      )
      if (!isAllowedSector) return null
    } else if (!city.trim()) {
      return null
    }
  }

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
