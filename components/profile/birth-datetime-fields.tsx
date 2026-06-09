"use client"

import { useEffect, useMemo, useState } from "react"
import type { LucideIcon } from "lucide-react"

import { useTranslations } from "@/lib/i18n/client"
import {
  BIRTH_MONTH_KEYS,
  clampBirthDateParts,
  formatBirthDate,
  formatBirthTime,
  getBirthYearOptions,
  getDaysInMonth,
  parseBirthDate,
  parseBirthTime,
} from "@/lib/profile/birth-datetime"

const selectClassName =
  "w-full rounded-xl border border-border bg-[rgba(255,255,255,0.04)] px-3 py-3.5 text-sm text-foreground outline-none transition hover:border-[#6D4BFF]/30 hover:bg-[rgba(255,255,255,0.06)] focus:border-[#6D4BFF]/50 focus:bg-[rgba(255,255,255,0.06)] focus:ring-1 focus:ring-[#6D4BFF]/30"

type FieldLabelProps = {
  label: string
  icon?: LucideIcon
}

function FieldLabel({ label, icon: Icon }: FieldLabelProps) {
  return (
    <span className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
      {Icon ? <Icon className="h-3.5 w-3.5 text-[#B69CFF]" /> : null}
      {label}
    </span>
  )
}

type BirthDateFieldsProps = {
  value: string
  onChange: (value: string) => void
  label: string
  icon?: LucideIcon
  testIdPrefix?: string
  wrapperTestId?: string
  className?: string
}

export function BirthDateFields({
  value,
  onChange,
  label,
  icon,
  testIdPrefix = "",
  wrapperTestId,
  className,
}: BirthDateFieldsProps) {
  const { t, locale } = useTranslations()
  const parsed = parseBirthDate(value)
  const [day, setDay] = useState(parsed?.day ? String(parsed.day) : "")
  const [month, setMonth] = useState(parsed?.month ? String(parsed.month) : "")
  const [year, setYear] = useState(parsed?.year ? String(parsed.year) : "")

  useEffect(() => {
    const next = parseBirthDate(value)
    setDay(next?.day ? String(next.day) : "")
    setMonth(next?.month ? String(next.month) : "")
    setYear(next?.year ? String(next.year) : "")
  }, [value])

  const yearOptions = useMemo(() => getBirthYearOptions(), [])
  const monthOptions = useMemo(
    () =>
      BIRTH_MONTH_KEYS.map((key, index) => ({
        value: String(index + 1),
        label: t(key),
      })),
    [t]
  )

  const dayOptions = useMemo(() => {
    const yearNumber = Number(year)
    const monthNumber = Number(month)
    if (!yearNumber || !monthNumber) {
      return Array.from({ length: 31 }, (_, index) => index + 1)
    }
    const maxDay = getDaysInMonth(yearNumber, monthNumber)
    return Array.from({ length: maxDay }, (_, index) => index + 1)
  }, [month, year])

  function emitChange(nextDay: string, nextMonth: string, nextYear: string) {
    if (!nextDay || !nextMonth || !nextYear) {
      onChange("")
      return
    }

    const parts = clampBirthDateParts({
      year: Number(nextYear),
      month: Number(nextMonth),
      day: Number(nextDay),
    })

    onChange(formatBirthDate(parts))
  }

  function handleDayChange(nextDay: string) {
    setDay(nextDay)
    emitChange(nextDay, month, year)
  }

  function handleMonthChange(nextMonth: string) {
    setMonth(nextMonth)
    if (day && year) {
      const maxDay = getDaysInMonth(Number(year), Number(nextMonth))
      const adjustedDay = Number(day) > maxDay ? String(maxDay) : day
      setDay(adjustedDay)
      emitChange(adjustedDay, nextMonth, year)
      return
    }
    emitChange(day, nextMonth, year)
  }

  function handleYearChange(nextYear: string) {
    setYear(nextYear)
    if (day && month) {
      const maxDay = getDaysInMonth(Number(nextYear), Number(month))
      const adjustedDay = Number(day) > maxDay ? String(maxDay) : day
      setDay(adjustedDay)
      emitChange(adjustedDay, month, nextYear)
      return
    }
    emitChange(day, month, nextYear)
  }

  return (
    <div className={className} data-testid={wrapperTestId}>
      <FieldLabel label={label} icon={icon} />
      <div className="grid grid-cols-3 gap-2">
        <select
          data-testid={`${testIdPrefix}birth-date-day`}
          value={day}
          onChange={(event) => handleDayChange(event.target.value)}
          className={selectClassName}
          aria-label={t("birthDate.day")}
        >
          <option value="">{t("birthDate.placeholder.day")}</option>
          {dayOptions.map((optionDay) => (
            <option key={optionDay} value={String(optionDay)}>
              {optionDay}
            </option>
          ))}
        </select>
        <select
          data-testid={`${testIdPrefix}birth-date-month`}
          value={month}
          onChange={(event) => handleMonthChange(event.target.value)}
          className={selectClassName}
          aria-label={t("birthDate.month")}
        >
          <option value="">{t("birthDate.placeholder.month")}</option>
          {monthOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <select
          data-testid={`${testIdPrefix}birth-date-year`}
          value={year}
          onChange={(event) => handleYearChange(event.target.value)}
          className={selectClassName}
          aria-label={t("birthDate.year")}
        >
          <option value="">{t("birthDate.placeholder.year")}</option>
          {yearOptions.map((optionYear) => (
            <option key={optionYear} value={String(optionYear)}>
              {optionYear}
            </option>
          ))}
        </select>
      </div>
      <p className="mt-1.5 text-xs text-muted-foreground">
        {locale === "ro" ? "Format: ZZ-LL-AAAA" : "Format: YYYY-MM-DD"}
      </p>
    </div>
  )
}

type BirthTimeFieldsProps = {
  value: string
  onChange: (value: string) => void
  label: string
  icon?: LucideIcon
  testIdPrefix?: string
  wrapperTestId?: string
  className?: string
}

export function BirthTimeFields({
  value,
  onChange,
  label,
  icon,
  testIdPrefix = "",
  wrapperTestId,
  className,
}: BirthTimeFieldsProps) {
  const { t } = useTranslations()
  const parsed = parseBirthTime(value)
  const [hour, setHour] = useState(parsed ? String(parsed.hour) : "")
  const [minute, setMinute] = useState(parsed ? String(parsed.minute) : "")

  useEffect(() => {
    const next = parseBirthTime(value)
    setHour(next ? String(next.hour) : "")
    setMinute(next ? String(next.minute) : "")
  }, [value])

  const hourOptions = useMemo(() => Array.from({ length: 24 }, (_, index) => index), [])
  const minuteOptions = useMemo(() => Array.from({ length: 60 }, (_, index) => index), [])

  function emitChange(nextHour: string, nextMinute: string) {
    if (nextHour === "" || nextMinute === "") {
      onChange("")
      return
    }

    onChange(
      formatBirthTime({
        hour: Number(nextHour),
        minute: Number(nextMinute),
      })
    )
  }

  return (
    <div className={className} data-testid={wrapperTestId}>
      <FieldLabel label={label} icon={icon} />
      <div className="grid grid-cols-2 gap-2">
        <select
          data-testid={`${testIdPrefix}birth-time-hour`}
          value={hour}
          onChange={(event) => {
            const nextHour = event.target.value
            setHour(nextHour)
            emitChange(nextHour, minute)
          }}
          className={selectClassName}
          aria-label={t("birthTime.hour")}
        >
          <option value="">{t("birthTime.placeholder.hour")}</option>
          {hourOptions.map((optionHour) => (
            <option key={optionHour} value={String(optionHour)}>
              {String(optionHour).padStart(2, "0")}
            </option>
          ))}
        </select>
        <select
          data-testid={`${testIdPrefix}birth-time-minute`}
          value={minute}
          onChange={(event) => {
            const nextMinute = event.target.value
            setMinute(nextMinute)
            emitChange(hour, nextMinute)
          }}
          className={selectClassName}
          aria-label={t("birthTime.minute")}
        >
          <option value="">{t("birthTime.placeholder.minute")}</option>
          {minuteOptions.map((optionMinute) => (
            <option key={optionMinute} value={String(optionMinute)}>
              {String(optionMinute).padStart(2, "0")}
            </option>
          ))}
        </select>
      </div>
      <p className="mt-1.5 text-xs text-muted-foreground">
        {t("birthTime.formatHint")}
      </p>
    </div>
  )
}
