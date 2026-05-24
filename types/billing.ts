export interface BillingProfileInput {
  type: "individual"
  fullName: string
  email: string
  phone: string
  addressLine1: string
  city: string
  county: string
  country: string
  postalCode: string
}

export interface BillingProfilePayload extends BillingProfileInput {
  isComplete: boolean
}

export interface BillingProfileResponse {
  profile: BillingProfilePayload | null
  isComplete: boolean
}
