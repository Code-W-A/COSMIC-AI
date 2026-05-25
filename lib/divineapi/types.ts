export type ZodiacSign =
  | "Aries"
  | "Taurus"
  | "Gemini"
  | "Cancer"
  | "Leo"
  | "Virgo"
  | "Libra"
  | "Scorpio"
  | "Sagittarius"
  | "Capricorn"
  | "Aquarius"
  | "Pisces"

export type BirthDetails = {
  name?: string
  birthDate: string
  birthTime: string
  birthPlace: string
  birthPlacePlaceId?: string
  sexAtBirth: "male" | "female"
  latitude?: number
  longitude?: number
  timezoneIana?: string
  timezoneOffsetAtBirth?: number
  timezone?: string | number
}

export type DailyHoroscopeData = {
  raw: unknown
  date?: string
  sign?: string
  horoscopeData?: string
  categories?: {
    love?: string
    career?: string
    health?: string
    emotions?: string
    travel?: string
    luck?: string
  }
}

export type PlanetPlacement = {
  name: string
  sign?: string
  house?: string | number
  degree?: string | number
  fullDegree?: string | number
  longitude?: string | number
  retrograde?: boolean | string
  element?: string
  modality?: string
}

export type HouseCusp = {
  house: string | number
  sign?: string
  degree?: string | number
  fullDegree?: string | number
}

export type Aspect = {
  planet1?: string
  planet2?: string
  aspect?: string
  orb?: string | number
  applying?: boolean | string
}

export type NatalChartData = {
  raw: unknown
  summary: {
    sunSign?: string
    moonSign?: string
    risingSign?: string
    planets?: PlanetPlacement[]
    houses?: HouseCusp[]
    aspects?: Aspect[]
    chartImageSvg?: string
    chartImageBase64?: string
    interpretations?: Record<string, unknown>
    dominantElements?: unknown
    dominantModalities?: unknown
  }
}

export type CompatibilityData = {
  raw?: unknown
  mode: "synastry_api" | "dual_natal_interpretation"
  personA?: NatalChartData
  personB?: NatalChartData
  summary?: {
    score?: number
    emotional?: string
    communication?: string
    attraction?: string
    challenges?: string
  }
}
