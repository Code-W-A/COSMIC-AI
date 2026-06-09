export type BirthDateParts = {
  year: number
  month: number
  day: number
}

export type BirthTimeParts = {
  hour: number
  minute: number
}

const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/
const TIME_PATTERN = /^(\d{2}):(\d{2})$/

export function getDaysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate()
}

export function getBirthYearOptions(minYear = 1920, maxYear = new Date().getFullYear()) {
  const years: number[] = []
  for (let year = maxYear; year >= minYear; year -= 1) {
    years.push(year)
  }
  return years
}

export function parseBirthDate(value: string | null | undefined): BirthDateParts | null {
  if (!value) return null
  const match = ISO_DATE_PATTERN.exec(value.trim())
  if (!match) return null

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])

  if (!isValidBirthDateParts({ year, month, day })) return null
  return { year, month, day }
}

export function formatBirthDate(parts: BirthDateParts) {
  const year = String(parts.year).padStart(4, "0")
  const month = String(parts.month).padStart(2, "0")
  const day = String(parts.day).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export function parseBirthTime(value: string | null | undefined): BirthTimeParts | null {
  if (!value) return null
  const match = TIME_PATTERN.exec(value.trim())
  if (!match) return null

  const hour = Number(match[1])
  const minute = Number(match[2])

  if (!isValidBirthTimeParts({ hour, minute })) return null
  return { hour, minute }
}

export function formatBirthTime(parts: BirthTimeParts) {
  const hour = String(parts.hour).padStart(2, "0")
  const minute = String(parts.minute).padStart(2, "0")
  return `${hour}:${minute}`
}

export function isValidBirthDateParts(parts: BirthDateParts) {
  if (!Number.isInteger(parts.year) || parts.year < 1900 || parts.year > 2100) return false
  if (!Number.isInteger(parts.month) || parts.month < 1 || parts.month > 12) return false
  if (!Number.isInteger(parts.day) || parts.day < 1) return false
  return parts.day <= getDaysInMonth(parts.year, parts.month)
}

export function isValidBirthTimeParts(parts: BirthTimeParts) {
  return (
    Number.isInteger(parts.hour) &&
    parts.hour >= 0 &&
    parts.hour <= 23 &&
    Number.isInteger(parts.minute) &&
    parts.minute >= 0 &&
    parts.minute <= 59
  )
}

export function isValidBirthDateString(value: string) {
  return parseBirthDate(value) !== null
}

export function isValidBirthTimeString(value: string) {
  return parseBirthTime(value) !== null
}

export function clampBirthDateParts(parts: BirthDateParts): BirthDateParts {
  const maxDay = getDaysInMonth(parts.year, parts.month)
  return {
    year: parts.year,
    month: parts.month,
    day: Math.min(parts.day, maxDay),
  }
}

export const BIRTH_MONTH_KEYS = [
  "birthDate.month.january",
  "birthDate.month.february",
  "birthDate.month.march",
  "birthDate.month.april",
  "birthDate.month.may",
  "birthDate.month.june",
  "birthDate.month.july",
  "birthDate.month.august",
  "birthDate.month.september",
  "birthDate.month.october",
  "birthDate.month.november",
  "birthDate.month.december",
] as const
