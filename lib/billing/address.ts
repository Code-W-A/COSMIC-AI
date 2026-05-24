import type { Locale } from "@/lib/i18n/locale"

export type CountryOption = {
  code: string
  value: string
  label: string
}

const EXCLUDED_REGION_CODES = new Set([
  "AC",
  "AN",
  "BU",
  "CP",
  "CS",
  "CT",
  "DD",
  "DG",
  "DY",
  "EA",
  "EU",
  "EZ",
  "FX",
  "HV",
  "IC",
  "JT",
  "MI",
  "NH",
  "NQ",
  "PU",
  "PZ",
  "QO",
  "RH",
  "SU",
  "TA",
  "TP",
  "UK",
  "UN",
  "VD",
  "WK",
  "XA",
  "XB",
  "XK",
  "YD",
  "YU",
  "ZR",
  "ZZ",
])

function simplify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
}

export const ROMANIA_COUNTIES = [
  "Alba",
  "Arad",
  "Argeș",
  "Bacău",
  "Bihor",
  "Bistrița-Năsăud",
  "Botoșani",
  "Brăila",
  "Brașov",
  "București",
  "Buzău",
  "Călărași",
  "Caraș-Severin",
  "Cluj",
  "Constanța",
  "Covasna",
  "Dâmbovița",
  "Dolj",
  "Galați",
  "Giurgiu",
  "Gorj",
  "Harghita",
  "Hunedoara",
  "Ialomița",
  "Iași",
  "Ilfov",
  "Maramureș",
  "Mehedinți",
  "Mureș",
  "Neamț",
  "Olt",
  "Prahova",
  "Sălaj",
  "Satu Mare",
  "Sibiu",
  "Suceava",
  "Teleorman",
  "Timiș",
  "Tulcea",
  "Vâlcea",
  "Vaslui",
  "Vrancea",
] as const

export const BUCHAREST_SECTORS = [
  "Sector 1",
  "Sector 2",
  "Sector 3",
  "Sector 4",
  "Sector 5",
  "Sector 6",
] as const

export function isRomaniaCountry(value: string) {
  const normalized = simplify(value)
  return normalized === "romania"
}

export function isBucharestCounty(value: string) {
  const normalized = simplify(value)
  return normalized === "bucuresti" || normalized === "bucharest"
}

export function canonicalizeCountry(value: string) {
  const trimmed = value.trim()
  return isRomaniaCountry(trimmed) ? "Romania" : trimmed
}

export function canonicalizeRomaniaCounty(value: string) {
  const normalized = simplify(value)
  for (const county of ROMANIA_COUNTIES) {
    if (simplify(county) === normalized) {
      return county
    }
  }
  if (normalized === "bucharest") return "București"
  return value.trim()
}

export function canonicalizeRomaniaCity(county: string, city: string) {
  const trimmedCity = city.trim()

  if (!isBucharestCounty(county)) {
    return trimmedCity
  }

  const normalized = simplify(trimmedCity)
  for (const sector of BUCHAREST_SECTORS) {
    if (simplify(sector) === normalized) {
      return sector
    }
  }

  return trimmedCity
}

function buildCountryCodeList() {
  const countryCodes: string[] = []
  const formatter = new Intl.DisplayNames(["en"], { type: "region" })
  const seenNames = new Set<string>()

  for (let first = 65; first <= 90; first += 1) {
    for (let second = 65; second <= 90; second += 1) {
      const code = String.fromCharCode(first, second)
      if (EXCLUDED_REGION_CODES.has(code)) continue

      const label = formatter.of(code)
      if (!label || label === code) continue
      if (seenNames.has(label)) continue

      seenNames.add(label)
      countryCodes.push(code)
    }
  }

  return countryCodes.sort((a, b) => {
    if (a === "RO") return -1
    if (b === "RO") return 1
    return a.localeCompare(b)
  })
}

const COUNTRY_CODES = buildCountryCodeList()
const ENGLISH_REGION_NAMES = new Intl.DisplayNames(["en"], { type: "region" })
const ROMANIAN_REGION_NAMES = new Intl.DisplayNames(["ro"], { type: "region" })
const COUNTRY_VALUES = COUNTRY_CODES.map((code) => ({
  code,
  value: ENGLISH_REGION_NAMES.of(code) ?? code,
}))

const countryValueLookup = new Map<string, string>()
for (const country of COUNTRY_VALUES) {
  countryValueLookup.set(simplify(country.code), country.value)
  countryValueLookup.set(simplify(country.value), country.value)

  const roLabel = ROMANIAN_REGION_NAMES.of(country.code)
  if (roLabel) {
    countryValueLookup.set(simplify(roLabel), country.value)
  }
}

export function getCountryOptions(locale: Locale): CountryOption[] {
  const displayLocale = locale === "ro" ? "ro" : "en"
  const formatter = new Intl.DisplayNames([displayLocale], { type: "region" })

  return COUNTRY_VALUES.map((country) => {
    const label = formatter.of(country.code) ?? country.value
    return {
      code: country.code,
      value: country.value,
      label,
    }
  }).sort((left, right) => {
    if (left.code === "RO") return -1
    if (right.code === "RO") return 1
    return left.label.localeCompare(right.label)
  })
}

export function normalizeCountryValue(value: string) {
  const normalized = simplify(value)
  if (!normalized) return ""

  if (normalized === "romania") return "Romania"

  return countryValueLookup.get(normalized) ?? value.trim()
}
