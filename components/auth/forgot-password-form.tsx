"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowRight, CheckCircle2 } from "lucide-react"

import { AppLogo } from "@/components/branding/app-logo"
import { LanguageSwitcher } from "@/components/i18n/language-switcher"
import { sendPasswordReset } from "@/lib/firebase/auth"
import {
  isFirebaseUserNotFoundError,
  localizeFirebaseAuthError,
} from "@/lib/i18n/firebase-auth-errors"
import { useLocalizedPath, useTranslations } from "@/lib/i18n/client"

export function ForgotPasswordForm() {
  const localizedPath = useLocalizedPath()
  const { t, locale } = useTranslations()
  const [email, setEmail] = useState("")
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    setSubmitting(true)

    try {
      await sendPasswordReset(email, locale)
      setSent(true)
    } catch (resetError) {
      if (isFirebaseUserNotFoundError(resetError)) {
        setSent(true)
        return
      }
      setError(localizeFirebaseAuthError(resetError, locale))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-background px-4 py-12">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/4 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-[#6D4BFF]/10 blur-[140px]" />
        <div className="absolute bottom-0 right-0 h-[360px] w-[360px] rounded-full bg-[#D66BFF]/8 blur-[120px]" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="mb-4 flex justify-center">
          <LanguageSwitcher />
        </div>
        <Link href={localizedPath("/")} className="mb-8 flex flex-col items-center">
          <AppLogo size={56} className="mb-4 ring-1 ring-white/20 shadow-[0_0_30px_rgba(109,75,255,0.25)]" />
          <span className="text-2xl font-bold text-foreground">AstroAI 24/7</span>
        </Link>

        <div
          data-testid="forgot-password-form"
          className="rounded-3xl border border-border bg-[#0D0820]/70 px-6 py-8 shadow-xl shadow-[#6D4BFF]/10 backdrop-blur-xl sm:px-8"
        >
          <div className="mb-7">
            <h1 className="text-2xl font-bold text-foreground">{t("auth.reset.title")}</h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {t("auth.reset.subtitle")}
            </p>
          </div>

          {sent ? (
            <div
              data-testid="forgot-password-success"
              className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-4"
            >
              <div className="flex gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" />
                <p className="text-sm leading-relaxed text-emerald-50">{t("auth.reset.success")}</p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-foreground">
                  {t("auth.field.email")}
                </span>
                <input
                  data-testid="forgot-password-email-input"
                  required
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full rounded-xl border border-border bg-[rgba(255,255,255,0.04)] px-4 py-3 text-sm text-foreground outline-none transition focus:border-[#6D4BFF]/60"
                  placeholder={t("auth.placeholder.email")}
                />
              </label>

              {error && (
                <p
                  data-testid="forgot-password-error-message"
                  className="mt-4 rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-100"
                >
                  {error}
                </p>
              )}

              <button
                type="submit"
                data-testid="forgot-password-submit"
                disabled={submitting}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#6D4BFF] to-[#8B5CFF] px-5 py-3 text-sm font-semibold text-foreground transition disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? t("auth.pleaseWait") : t("auth.reset.submit")}
                {!submitting && <ArrowRight className="h-4 w-4" />}
              </button>
            </form>
          )}

          <p className="mt-5 text-center text-sm text-muted-foreground">
            <Link
              href={localizedPath("/login")}
              className="font-medium text-cosmic-lavender hover:text-foreground"
            >
              {t("auth.reset.backToLogin")}
            </Link>
          </p>
        </div>
      </div>
    </main>
  )
}
