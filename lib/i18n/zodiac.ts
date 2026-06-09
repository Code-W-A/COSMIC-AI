import type { Locale } from "@/lib/i18n/locale"

const ZODIAC_SIGNS_RO: Record<string, string> = {
  aries: "Berbec",
  taurus: "Taur",
  gemini: "Gemeni",
  cancer: "Rac",
  leo: "Leu",
  virgo: "Fecioară",
  libra: "Balanță",
  scorpio: "Scorpion",
  sagittarius: "Săgetător",
  capricorn: "Capricorn",
  aquarius: "Vărsător",
  pisces: "Pești",
}

export function formatZodiacSign(sign: string | null | undefined, locale: Locale) {
  if (!sign || !sign.trim()) return "—"
  if (locale === "en") return sign.trim()

  const normalized = sign.trim().toLowerCase()
  return ZODIAC_SIGNS_RO[normalized] ?? sign.trim()
}
