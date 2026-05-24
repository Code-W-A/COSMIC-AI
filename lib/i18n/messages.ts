import type { Locale } from "@/lib/i18n/locale"

type MessageMap = Record<string, string>

export const messages: Record<Locale, MessageMap> = {
  en: {
    "common.loading": "Loading...",
    "common.logout": "Log out",
    "common.backToChat": "Back to chat",
    "language.switch": "Language",
    "language.ro": "RO",
    "language.en": "EN",

    "nav.agents": "Agents",
    "nav.how": "How It Works",
    "nav.experience": "Experience",
    "nav.pricing": "Pricing",
    "nav.faq": "FAQ",
    "nav.login": "Log in",
    "nav.start": "Start Free Reading",
    "nav.openMenu": "Open menu",
    "nav.closeMenu": "Close menu",

    "auth.register.title": "Create your account",
    "auth.login.title": "Welcome back",
    "auth.register.subtitle":
      "Start with a free profile, then unlock premium agents anytime.",
    "auth.login.subtitle": "Sign in to continue your astrology AI sessions.",
    "auth.field.name": "Name",
    "auth.field.email": "Email",
    "auth.field.password": "Password",
    "auth.placeholder.name": "Your name",
    "auth.placeholder.email": "you@example.com",
    "auth.placeholder.password": "At least 6 characters",
    "auth.submit.register": "Create account",
    "auth.submit.login": "Sign in",
    "auth.google": "Continue with Google",
    "auth.switch.toLogin": "Sign in",
    "auth.switch.toRegister": "Create an account",
    "auth.switch.hasAccount": "Already have an account?",
    "auth.switch.newUser": "New to Cosmic AI?",
    "auth.pleaseWait": "Please wait...",
    "auth.loading.title": "Preparing your cosmic space...",
    "auth.loading.subtitle": "Checking your session and aligning your profile.",

    "subscription.success.title": "Subscription started",
    "subscription.success.body":
      "Stripe is confirming your subscription. Your account will update as soon as the webhook sync completes.",
    "subscription.success.openChat": "Open chat",
    "subscription.success.viewPlan": "View plan",

    "report.title": "Relationship Deep Report",
    "report.subtitle": "One-off unlock: 29 RON. Purchase once and generate one full report.",
    "report.loading": "Loading report access...",
    "report.generate": "Generate report now",
    "report.unlocked": "Report unlocked",
    "report.buy": "Buy report for 29 RON",
    "report.generatedNotice":
      "Report generation token consumed. Report rendering pipeline is coming next.",
  },
  ro: {
    "common.loading": "Se încarcă...",
    "common.logout": "Deconectare",
    "common.backToChat": "Înapoi la chat",
    "language.switch": "Limbă",
    "language.ro": "RO",
    "language.en": "EN",

    "nav.agents": "Agenți",
    "nav.how": "Cum funcționează",
    "nav.experience": "Experiență",
    "nav.pricing": "Prețuri",
    "nav.faq": "Întrebări",
    "nav.login": "Conectare",
    "nav.start": "Începe gratuit",
    "nav.openMenu": "Deschide meniul",
    "nav.closeMenu": "Închide meniul",

    "auth.register.title": "Creează-ți contul",
    "auth.login.title": "Bine ai revenit",
    "auth.register.subtitle":
      "Începi cu profil gratuit, apoi poți debloca agenții premium oricând.",
    "auth.login.subtitle": "Conectează-te ca să continui sesiunile tale astrologice AI.",
    "auth.field.name": "Nume",
    "auth.field.email": "Email",
    "auth.field.password": "Parolă",
    "auth.placeholder.name": "Numele tău",
    "auth.placeholder.email": "tu@exemplu.com",
    "auth.placeholder.password": "Minimum 6 caractere",
    "auth.submit.register": "Creează cont",
    "auth.submit.login": "Conectare",
    "auth.google": "Continuă cu Google",
    "auth.switch.toLogin": "Conectează-te",
    "auth.switch.toRegister": "Creează un cont",
    "auth.switch.hasAccount": "Ai deja cont?",
    "auth.switch.newUser": "Ești nou pe Cosmic AI?",
    "auth.pleaseWait": "Te rugăm așteaptă...",
    "auth.loading.title": "Pregătim spațiul tău cosmic...",
    "auth.loading.subtitle": "Verificăm sesiunea și aliniem profilul tău.",

    "subscription.success.title": "Abonament activat",
    "subscription.success.body":
      "Stripe confirmă abonamentul tău. Contul se actualizează imediat ce webhook-ul finalizează sincronizarea.",
    "subscription.success.openChat": "Deschide chatul",
    "subscription.success.viewPlan": "Vezi planul",

    "report.title": "Raport Deep Relationship",
    "report.subtitle": "Deblocare unică: 29 RON. Cumpără o dată și generezi un raport complet.",
    "report.loading": "Se verifică accesul la raport...",
    "report.generate": "Generează raportul acum",
    "report.unlocked": "Raport deblocat",
    "report.buy": "Cumpără raportul cu 29 RON",
    "report.generatedNotice":
      "Tokenul de generare raport a fost consumat. Pipeline-ul de randare urmează.",
  },
}

export function translate(locale: Locale, key: string): string {
  const direct = messages[locale][key]
  if (direct) return direct
  const fallback = messages.en[key]
  if (fallback) return fallback

  if (process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.warn(`[i18n] Missing key: ${key}`)
  }

  return key
}
