export type LocationAutocompleteSuggestion = {
  placeId: string
  description: string
  mainText: string
  secondaryText?: string | null
}

export type ResolvedBirthLocation = {
  placeId: string
  birthPlace: string
  latitude: number
  longitude: number
  timezoneIana: string
  timezoneOffsetAtBirth: number
  timezoneOffsetNow: number
}

