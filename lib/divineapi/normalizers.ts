import type {
  Aspect,
  DailyHoroscopeData,
  HouseCusp,
  NatalChartData,
  PlanetPlacement,
} from "@/lib/divineapi/types"

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value))
}

function asRecord(value: unknown) {
  return isRecord(value) ? value : {}
}

function dataOf(raw: unknown) {
  const record = asRecord(raw)
  if (Array.isArray(record.data)) return { data: record.data }
  return asRecord(record.data ?? record)
}

function firstString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim()
    if (typeof value === "number") return String(value)
  }

  return undefined
}

function stringOrNumber(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" || typeof value === "number") return value
  }

  return undefined
}

function booleanOrString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "boolean" || typeof value === "string") return value
  }

  return undefined
}

function arrayFromUnknown(value: unknown) {
  if (Array.isArray(value)) return value
  if (isRecord(value)) {
    return Object.entries(value).map(([name, item]) =>
      isRecord(item) ? { name, ...item } : { name, value: item }
    )
  }
  return []
}

function findArray(data: Record<string, unknown>, paths: string[]) {
  for (const path of paths) {
    const value = path.split(".").reduce<unknown>((current, key) => {
      if (!isRecord(current)) return undefined
      return current[key]
    }, data)
    const result = arrayFromUnknown(value)
    if (result.length) return result
  }

  return []
}

function getNested(data: Record<string, unknown>, path: string) {
  return path.split(".").reduce<unknown>((current, key) => {
    if (!isRecord(current)) return undefined
    return current[key]
  }, data)
}

function normalizePlanet(item: unknown): PlanetPlacement | null {
  const planet = asRecord(item)
  const name = firstString(
    planet.name,
    planet.planet,
    planet.planet_name,
    planet.body,
    planet.id
  )

  if (!name) return null

  return {
    name,
    sign: firstString(planet.sign, planet.zodiac, planet.zodiac_sign, planet.rashi),
    house: stringOrNumber(planet.house, planet.house_number),
    degree: stringOrNumber(planet.degree, planet.norm_degree),
    fullDegree: stringOrNumber(planet.fullDegree, planet.full_degree, planet.fullDegree),
    longitude: stringOrNumber(planet.longitude, planet.total_degree),
    retrograde: booleanOrString(planet.retrograde, planet.is_retro, planet.isRetro),
    element: firstString(planet.element),
    modality: firstString(planet.modality, planet.mode),
  }
}

function normalizeHouse(item: unknown, index: number): HouseCusp | null {
  const house = asRecord(item)
  const houseNumber = stringOrNumber(house.house, house.house_number, house.number) ?? index + 1

  return {
    house: houseNumber,
    sign: firstString(house.sign, house.zodiac, house.zodiac_sign),
    degree: stringOrNumber(house.degree, house.norm_degree),
    fullDegree: stringOrNumber(house.fullDegree, house.full_degree),
  }
}

function normalizeAspect(item: unknown): Aspect | null {
  const aspect = asRecord(item)
  const planet1 = firstString(
    aspect.planet1,
    aspect.planet_1,
    aspect.planetOne,
    aspect.first_planet,
    aspect.from,
    aspect.p1_name
  )
  const planet2 = firstString(
    aspect.planet2,
    aspect.planet_2,
    aspect.planetTwo,
    aspect.second_planet,
    aspect.to,
    aspect.p2_name
  )
  const aspectName = firstString(aspect.aspect, aspect.aspect_name, aspect.type)

  if (!planet1 && !planet2 && !aspectName) return null

  return {
    planet1,
    planet2,
    aspect: aspectName,
    orb: stringOrNumber(aspect.orb),
    applying: booleanOrString(aspect.applying, aspect.is_applying),
  }
}

export function normalizeDailyHoroscopeResponse(raw: unknown): DailyHoroscopeData {
  const data = dataOf(raw)
  const categoriesSource = asRecord(
    data.categories ?? data.category ?? data.prediction ?? data.horoscope
  )

  return {
    raw,
    date: firstString(data.date),
    sign: firstString(data.sign, data.zodiac_sign),
    horoscopeData: firstString(
      data.horoscope_data,
      data.horoscopeData,
      data.personal,
      data.overall,
      categoriesSource.personal,
      categoriesSource.overall
    ),
    categories: {
      love: firstString(categoriesSource.love, categoriesSource.relationship, data.love),
      career: firstString(categoriesSource.career, categoriesSource.profession, data.career),
      health: firstString(categoriesSource.health, data.health),
      emotions: firstString(categoriesSource.emotions, categoriesSource.emotion, data.emotions),
      travel: firstString(categoriesSource.travel, data.travel),
      luck: firstString(categoriesSource.luck, data.luck),
    },
  }
}

export function normalizePlanets(raw: unknown): PlanetPlacement[] {
  const data = dataOf(raw)
  return findArray(data, [
    "data",
    "planetary.data",
    "planets",
    "planetary_positions",
    "planet_positions",
    "planet_positions.planets",
    "natal.planets",
    "p1_data",
    "p2_data",
    "synastry.p1_data",
    "synastry.p2_data",
  ])
    .map(normalizePlanet)
    .filter((planet): planet is PlanetPlacement => Boolean(planet))
}

export function normalizeHouses(raw: unknown): HouseCusp[] {
  const data = dataOf(raw)
  return findArray(data, [
    "houses.data.houses",
    "houses.data",
    "houses",
    "houses.houses",
    "houseCusps",
    "house_cusps",
    "cusps",
    "natal.houses",
    "data.houses",
  ])
    .map(normalizeHouse)
    .filter((house): house is HouseCusp => Boolean(house))
}

export function normalizeAspects(raw: unknown): Aspect[] {
  const data = dataOf(raw)
  return findArray(data, [
    "data",
    "aspects.data.aspects",
    "aspects.data",
    "aspects",
    "aspects.aspects",
    "aspect_table",
    "aspectTable",
    "natal.aspects",
    "data.aspects",
  ])
    .map(normalizeAspect)
    .filter((aspect): aspect is Aspect => Boolean(aspect))
}

export function extractSunSign(raw: unknown) {
  const data = dataOf(raw)
  const direct = firstString(data.sunSign, data.sun_sign, getNested(data, "sun.sign"))
  if (direct) return direct

  return normalizePlanets(raw).find((planet) => planet.name.toLowerCase() === "sun")?.sign
}

export function extractMoonSign(raw: unknown) {
  const data = dataOf(raw)
  const direct = firstString(data.moonSign, data.moon_sign, getNested(data, "moon.sign"))
  if (direct) return direct

  return normalizePlanets(raw).find((planet) => planet.name.toLowerCase() === "moon")?.sign
}

export function extractRisingSign(raw: unknown) {
  const data = dataOf(raw)
  const ascendant = asRecord(data.ascendant ?? data.asc)
  const direct = firstString(
    data.risingSign,
    data.rising_sign,
    data.ascendant,
    ascendant.sign,
    ascendant.zodiac_sign
  )
  if (direct) return direct

  const ascendantPlacement = normalizePlanets(raw).find((planet) =>
    ["ascendant", "asc"].includes(planet.name.toLowerCase())
  )
  if (ascendantPlacement?.sign) return ascendantPlacement.sign

  return normalizeHouses(raw)[0]?.sign
}

export function normalizeNatalChartResponse(raw: unknown): NatalChartData {
  const data = dataOf(raw)
  const chart = asRecord(data.chart)
  const interpretations = asRecord(
    data.interpretations ?? data.interpretation ?? data.readings ?? data.analysis
  )

  return {
    raw,
    summary: {
      sunSign: extractSunSign(raw),
      moonSign: extractMoonSign(raw),
      risingSign: extractRisingSign(raw),
      planets: normalizePlanets(raw),
      houses: normalizeHouses(raw),
      aspects: normalizeAspects(raw),
      chartImageSvg: firstString(
        data.svg,
        data.chart_svg,
        data.chartSvg,
        chart.svg,
        getNested(data, "chart.svg"),
        getNested(data, "chart.data.svg"),
        getNested(data, "chart.data.chart_svg"),
        getNested(data, "chart.data.chartSvg")
      ),
      chartImageBase64: firstString(
        data.chart_base64,
        data.chartImageBase64,
        data.base64,
        chart.base64,
        getNested(data, "chart.base64"),
        getNested(data, "chart.data.base64"),
        getNested(data, "chart.data.chart_base64"),
        getNested(data, "chart.data.chartImageBase64")
      ),
      interpretations: Object.keys(interpretations).length ? interpretations : undefined,
      dominantElements: data.dominantElements ?? data.dominant_elements ?? data.elements,
      dominantModalities: data.dominantModalities ?? data.dominant_modalities ?? data.modalities,
    },
  }
}
