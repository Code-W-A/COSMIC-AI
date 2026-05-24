type DateParts = {
  year: number
  month: number
  day: number
}

type DateTimeParts = DateParts & {
  hour: number
  minute: number
  second: number
}

type LocalDateTimeInput = {
  date: string
  time?: string
}

type TimezoneResolutionInput = {
  explicitTimezone?: string | number
  timezoneOffsetAtBirth?: string | number
  timezoneIana?: string
  localDateTime?: LocalDateTimeInput
  referenceDate?: Date
  fallbackTimezone?: string | number
}

function toFiniteNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return undefined
}

function roundToTwo(value: number) {
  return Math.round(value * 100) / 100
}

function parseDateOnly(value: string): DateParts | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim())
  if (!match) return null

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])

  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return null
  if (month < 1 || month > 12) return null
  if (day < 1 || day > 31) return null

  return { year, month, day }
}

function parseTimeOnly(value?: string): { hour: number; minute: number; second: number } | null {
  if (!value || !value.trim()) return { hour: 0, minute: 0, second: 0 }
  const match = /^(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(value.trim())
  if (!match) return null

  const hour = Number(match[1])
  const minute = Number(match[2])
  const second = Number(match[3] ?? "0")

  if (
    !Number.isInteger(hour) ||
    !Number.isInteger(minute) ||
    !Number.isInteger(second) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59 ||
    second < 0 ||
    second > 59
  ) {
    return null
  }

  return { hour, minute, second }
}

function parseLocalDateTime(input: LocalDateTimeInput): DateTimeParts | null {
  const dateParts = parseDateOnly(input.date)
  const timeParts = parseTimeOnly(input.time)
  if (!dateParts || !timeParts) return null

  return {
    ...dateParts,
    ...timeParts,
  }
}

function getFormatterForDateParts(timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  })
}

function extractParts(parts: Intl.DateTimeFormatPart[]): DateTimeParts | null {
  const values: Partial<Record<Intl.DateTimeFormatPartTypes, number>> = {}

  for (const part of parts) {
    if (
      part.type === "year" ||
      part.type === "month" ||
      part.type === "day" ||
      part.type === "hour" ||
      part.type === "minute" ||
      part.type === "second"
    ) {
      values[part.type] = Number(part.value)
    }
  }

  const year = values.year
  const month = values.month
  const day = values.day
  const hour = values.hour
  const minute = values.minute
  const second = values.second

  if (
    typeof year !== "number" ||
    typeof month !== "number" ||
    typeof day !== "number" ||
    typeof hour !== "number" ||
    typeof minute !== "number" ||
    typeof second !== "number"
  ) {
    return null
  }

  return { year, month, day, hour, minute, second }
}

function getOffsetHoursForInstant(date: Date, timeZone: string): number | undefined {
  try {
    const formatter = getFormatterForDateParts(timeZone)
    const parts = extractParts(formatter.formatToParts(date))
    if (!parts) return undefined

    const asUtc = Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second
    )

    const offsetHours = (asUtc - date.getTime()) / 3_600_000
    return roundToTwo(offsetHours)
  } catch {
    return undefined
  }
}

function isValidIanaTimeZone(timeZone?: string) {
  if (!timeZone) return false
  try {
    new Intl.DateTimeFormat("en-US", { timeZone })
    return true
  } catch {
    return false
  }
}

function localDateTimeToUtcTimestamp(input: DateTimeParts) {
  return Date.UTC(
    input.year,
    input.month - 1,
    input.day,
    input.hour,
    input.minute,
    input.second
  )
}

export function getOffsetHoursForTimeZoneAtLocalDateTime(
  timeZone: string,
  localDateTime: LocalDateTimeInput
): number | undefined {
  if (!isValidIanaTimeZone(timeZone)) return undefined
  const parsed = parseLocalDateTime(localDateTime)
  if (!parsed) return undefined

  const targetLocalAsUtc = localDateTimeToUtcTimestamp(parsed)
  let guessUtc = targetLocalAsUtc

  for (let i = 0; i < 6; i += 1) {
    const offset = getOffsetHoursForInstant(new Date(guessUtc), timeZone)
    if (typeof offset !== "number") return undefined
    const nextGuess = targetLocalAsUtc - offset * 3_600_000

    if (Math.abs(nextGuess - guessUtc) < 1_000) {
      guessUtc = nextGuess
      break
    }

    guessUtc = nextGuess
  }

  return getOffsetHoursForInstant(new Date(guessUtc), timeZone)
}

export function getOffsetHoursForTimeZoneAtDate(timeZone: string, date = new Date()) {
  if (!isValidIanaTimeZone(timeZone)) return undefined
  return getOffsetHoursForInstant(date, timeZone)
}

export function getDatePartsInTimeZone(timeZone: string, date = new Date()): DateParts | null {
  if (!isValidIanaTimeZone(timeZone)) return null

  try {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
    const values: Partial<Record<"year" | "month" | "day", number>> = {}

    for (const part of formatter.formatToParts(date)) {
      if (part.type === "year" || part.type === "month" || part.type === "day") {
        values[part.type] = Number(part.value)
      }
    }

    const year = values.year
    const month = values.month
    const day = values.day

    if (
      typeof year !== "number" ||
      typeof month !== "number" ||
      typeof day !== "number"
    ) {
      return null
    }

    return { year, month, day }
  } catch {
    return null
  }
}

export function buildLocalDateKeyForTimeZone(timeZone?: string, date = new Date()) {
  if (!timeZone) return null
  const parts = getDatePartsInTimeZone(timeZone, date)
  if (!parts) return null

  const month = String(parts.month).padStart(2, "0")
  const day = String(parts.day).padStart(2, "0")
  return `${parts.year}-${month}-${day}`
}

export function buildLocalDateKeyForOffset(offsetHours: number, date = new Date()) {
  const parts = getDatePartsForOffset(offsetHours, date)
  if (!parts) return null

  const month = String(parts.month).padStart(2, "0")
  const day = String(parts.day).padStart(2, "0")
  return `${parts.year}-${month}-${day}`
}

export function getDatePartsForOffset(offsetHours: number, date = new Date()): DateParts | null {
  if (!Number.isFinite(offsetHours)) return null
  const shifted = new Date(date.getTime() + offsetHours * 3_600_000)
  const year = shifted.getUTCFullYear()
  const month = shifted.getUTCMonth() + 1
  const day = shifted.getUTCDate()

  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return null
  }

  return { year, month, day }
}

export function resolveDivineTimezoneOffsetHours({
  explicitTimezone,
  timezoneOffsetAtBirth,
  timezoneIana,
  localDateTime,
  referenceDate,
  fallbackTimezone,
}: TimezoneResolutionInput) {
  const explicit = toFiniteNumber(explicitTimezone)
  if (typeof explicit === "number") return roundToTwo(explicit)

  const profileBirthOffset = toFiniteNumber(timezoneOffsetAtBirth)
  if (typeof profileBirthOffset === "number") return roundToTwo(profileBirthOffset)

  if (timezoneIana && localDateTime) {
    const derivedFromLocal = getOffsetHoursForTimeZoneAtLocalDateTime(timezoneIana, localDateTime)
    if (typeof derivedFromLocal === "number") return roundToTwo(derivedFromLocal)
  }

  if (timezoneIana) {
    const derivedFromDate = getOffsetHoursForTimeZoneAtDate(timezoneIana, referenceDate ?? new Date())
    if (typeof derivedFromDate === "number") return roundToTwo(derivedFromDate)
  }

  const fallback = toFiniteNumber(fallbackTimezone)
  if (typeof fallback === "number") return roundToTwo(fallback)

  return undefined
}

export function detectBrowserTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone
  } catch {
    return undefined
  }
}

export function getCurrentSystemOffsetHours() {
  return roundToTwo(-new Date().getTimezoneOffset() / 60)
}
