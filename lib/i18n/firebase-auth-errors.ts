import type { Locale } from "@/lib/i18n/locale"

const firebaseAuthErrorMessages: Record<string, Record<Locale, string>> = {
  "auth/invalid-email": {
    en: "Invalid email address.",
    ro: "Adresa de email este invalidă.",
  },
  "auth/too-many-requests": {
    en: "Too many attempts. Please try again later.",
    ro: "Prea multe încercări. Te rugăm încearcă din nou mai târziu.",
  },
  "auth/network-request-failed": {
    en: "Network error. Check your connection and try again.",
    ro: "Eroare de rețea. Verifică conexiunea și încearcă din nou.",
  },
  "auth/wrong-password": {
    en: "Incorrect password.",
    ro: "Parolă incorectă.",
  },
  "auth/invalid-credential": {
    en: "Invalid sign-in credentials.",
    ro: "Date de autentificare invalide.",
  },
  "auth/email-already-in-use": {
    en: "This email is already in use.",
    ro: "Acest email este deja folosit.",
  },
  "auth/weak-password": {
    en: "Password is too weak. Use at least 6 characters.",
    ro: "Parola este prea slabă. Folosește minimum 6 caractere.",
  },
  "auth/google-account-exists": {
    en: "This email is linked to another sign-in method. Sign in with that method first, then retry Google.",
    ro: "Acest email este legat de altă metodă de conectare. Conectează-te mai întâi cu acea metodă, apoi încearcă din nou Google.",
  },
  "auth/google-other-provider": {
    en: "This email is linked to another sign-in method. Sign in with that provider first, then retry Google.",
    ro: "Acest email este legat de altă metodă de conectare. Conectează-te mai întâi cu acel provider, apoi încearcă din nou Google.",
  },
  "auth/google-password-required": {
    en: "This email already has a password account. Sign in with password once, then click Continue with Google again.",
    ro: "Acest email are deja cont cu parolă. Conectează-te o dată cu parola, apoi apasă din nou Continuă cu Google.",
  },
}

function getErrorCode(error: unknown): string | null {
  if (!error || typeof error !== "object") return null
  const code = (error as { code?: unknown }).code
  return typeof code === "string" ? code : null
}

export function localizeFirebaseAuthError(error: unknown, locale: Locale): string {
  const code = getErrorCode(error)
  if (code) {
    const mapped = firebaseAuthErrorMessages[code]
    if (mapped?.[locale]) return mapped[locale]
    if (mapped?.en) return mapped.en
  }

  if (error instanceof Error && error.message && !code?.startsWith("auth/")) {
    return error.message
  }

  return locale === "ro" ? "Autentificarea a eșuat." : "Authentication failed."
}

export function isFirebaseUserNotFoundError(error: unknown): boolean {
  return getErrorCode(error) === "auth/user-not-found"
}
