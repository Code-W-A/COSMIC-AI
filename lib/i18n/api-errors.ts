import type { Locale } from "@/lib/i18n/locale"

const apiErrorMessages: Record<string, Record<Locale, string>> = {
  request_failed: {
    en: "Request failed.",
    ro: "Cererea a eșuat.",
  },
  unauthenticated: {
    en: "You must be signed in to continue.",
    ro: "Trebuie să fii autentificat pentru a continua.",
  },
  invalid_json: {
    en: "Request body must be valid JSON.",
    ro: "Body-ul requestului trebuie să fie JSON valid.",
  },
  invalid_checkout_request: {
    en: "Provide a valid checkout payload.",
    ro: "Trimite un payload valid pentru checkout.",
  },
  billing_profile_required: {
    en: "Complete billing details before checkout.",
    ro: "Completează datele de facturare înainte de checkout.",
  },
  user_not_found: {
    en: "User profile was not found.",
    ro: "Profilul utilizatorului nu a fost găsit.",
  },
  usage_limit_reached: {
    en: "You reached your monthly free limit.",
    ro: "Ai atins limita gratuită lunară.",
  },
  upgrade_required: {
    en: "Upgrade to continue.",
    ro: "Fă upgrade pentru a continua.",
  },
  cosmic_profile_missing: {
    en: "Please complete your cosmic profile first.",
    ro: "Te rugăm completează mai întâi profilul cosmic.",
  },
  profile_incomplete: {
    en: "Your profile is incomplete for this analysis.",
    ro: "Profilul tău este incomplet pentru această analiză.",
  },
  compatibility_partner_incomplete: {
    en: "Partner birth details are incomplete.",
    ro: "Datele de naștere ale partenerului sunt incomplete.",
  },
  analysis_input_missing: {
    en: "Required analysis input data is missing.",
    ro: "Lipsesc date necesare pentru analiză.",
  },
  invalid_profile: {
    en: "Profile data is invalid.",
    ro: "Datele profilului sunt invalide.",
  },
  profile_save_failed: {
    en: "Unable to save your cosmic profile.",
    ro: "Nu am putut salva profilul tău cosmic.",
  },
  profile_fetch_failed: {
    en: "Unable to load your cosmic profile.",
    ro: "Nu am putut încărca profilul tău cosmic.",
  },
  invalid_agent_request: {
    en: "A valid agent type and message are required.",
    ro: "Sunt necesare un tip de agent valid și un mesaj.",
  },
  agent_chat_failed: {
    en: "Unable to process your message.",
    ro: "Nu am putut procesa mesajul tău.",
  },
  natal_chart_required: {
    en: "Please generate your natal chart first.",
    ro: "Te rugăm generează mai întâi harta natală.",
  },
  natal_chart_missing_sun_sign: {
    en: "Please generate your natal chart first.",
    ro: "Te rugăm generează mai întâi harta natală.",
  },
  natal_generation_failed: {
    en: "Unable to generate your natal chart.",
    ro: "Nu am putut genera harta ta natală.",
  },
  daily_horoscope_failed: {
    en: "Unable to generate daily guidance.",
    ro: "Nu am putut genera ghidajul zilnic.",
  },
  compatibility_generation_failed: {
    en: "Unable to generate compatibility data.",
    ro: "Nu am putut genera datele de compatibilitate.",
  },
  partner_birth_details_required: {
    en: "Partner birth date, birth time, birth place, and sex at birth are required.",
    ro: "Sunt necesare data, ora, locul nașterii și sexul biologic al partenerului.",
  },
  invalid_action: {
    en: "Only consume action is supported.",
    ro: "Este suportată doar acțiunea consume.",
  },
  method_not_allowed: {
    en: "Method not allowed.",
    ro: "Metodă nepermisă.",
  },
  divineapi_unauthorized: {
    en: "Astrology provider authentication failed. Check the DivineAPI key and auth mode.",
    ro: "Autentificarea la providerul de astrologie a eșuat. Verifică cheia DivineAPI și auth mode.",
  },
  divineapi_forbidden: {
    en: "Astrology provider access was forbidden. Your DivineAPI key may not have access to this endpoint.",
    ro: "Acces interzis la providerul de astrologie. Cheia DivineAPI poate să nu aibă acces la acest endpoint.",
  },
  divineapi_unavailable: {
    en: "Astrology provider is unavailable right now. Try again later.",
    ro: "Providerul de astrologie nu este disponibil acum. Încearcă din nou mai târziu.",
  },
}

export function localizeApiErrorMessage(code: string, locale: Locale, fallback?: string) {
  const mapped = apiErrorMessages[code]
  if (mapped?.[locale]) return mapped[locale]
  if (mapped?.en) return mapped.en
  return fallback ?? (locale === "ro" ? "A apărut o eroare." : "An error occurred.")
}
