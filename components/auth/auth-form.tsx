"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowRight, Sparkles } from "lucide-react"

import { resolvePostAuthRoute } from "@/lib/auth/resolvePostAuthRoute"
import { LanguageSwitcher } from "@/components/i18n/language-switcher"
import { loginWithEmail, loginWithGoogle, registerOrLoginWithGoogle, registerWithEmail } from "@/lib/firebase/auth"
import { useLocalizedPath, useTranslations } from "@/lib/i18n/client"

interface AuthFormProps {
  mode: "login" | "register"
}

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter()
  const localizedPath = useLocalizedPath()
  const { t, locale } = useTranslations()
  const isRo = locale === "ro"
  const [explicitNextPath, setExplicitNextPath] = useState<string | null>(null)
  const [displayName, setDisplayName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [googleSubmitting, setGoogleSubmitting] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setExplicitNextPath(params.get("next"))
  }, [localizedPath])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    setSubmitting(true)

    try {
      if (mode === "register") {
        await registerWithEmail(email, password, displayName)
      } else {
        await loginWithEmail(email, password)
      }

      const nextPath = await resolvePostAuthRoute({
        explicitNextPath,
        localizedPath,
      })
      router.push(nextPath)
    } catch (authError) {
      setError(
        authError instanceof Error
          ? authError.message
          : isRo
            ? "Autentificarea a eșuat."
            : "Authentication failed."
      )
    } finally {
      setSubmitting(false)
    }
  }

  async function handleGoogleAuth() {
    setError("")
    setGoogleSubmitting(true)

    try {
      if (mode === "register") {
        await registerOrLoginWithGoogle(email.trim() || undefined, password || undefined)
      } else {
        await loginWithGoogle(email.trim() || undefined, password || undefined)
      }

      const nextPath = await resolvePostAuthRoute({
        explicitNextPath,
        localizedPath,
      })
      router.push(nextPath)
    } catch (authError) {
      setError(
        authError instanceof Error
          ? authError.message
          : isRo
            ? "Autentificarea a eșuat."
            : "Authentication failed."
      )
    } finally {
      setGoogleSubmitting(false)
    }
  }

  const isRegister = mode === "register"

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
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#6D4BFF]/15">
            <Sparkles className="h-7 w-7 text-[#8B5CFF]" />
          </div>
          <span className="text-2xl font-bold text-foreground">Cosmic AI</span>
        </Link>

        <form
          onSubmit={handleSubmit}
          className="rounded-3xl border border-border bg-[#0D0820]/70 px-6 py-8 shadow-xl shadow-[#6D4BFF]/10 backdrop-blur-xl sm:px-8"
        >
          <div className="mb-7">
            <h1 className="text-2xl font-bold text-foreground">
              {isRegister ? t("auth.register.title") : t("auth.login.title")}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {isRegister
                ? t("auth.register.subtitle")
                : t("auth.login.subtitle")}
            </p>
          </div>

          <div className="space-y-4">
            {isRegister && (
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-foreground">
                  {t("auth.field.name")}
                </span>
                <input
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  className="w-full rounded-xl border border-border bg-[rgba(255,255,255,0.04)] px-4 py-3 text-sm text-foreground outline-none transition focus:border-[#6D4BFF]/60"
                  placeholder={t("auth.placeholder.name")}
                />
              </label>
            )}

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-foreground">
                {t("auth.field.email")}
              </span>
              <input
                required
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-xl border border-border bg-[rgba(255,255,255,0.04)] px-4 py-3 text-sm text-foreground outline-none transition focus:border-[#6D4BFF]/60"
                placeholder={t("auth.placeholder.email")}
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-foreground">
                {t("auth.field.password")}
              </span>
              <input
                required
                minLength={6}
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-xl border border-border bg-[rgba(255,255,255,0.04)] px-4 py-3 text-sm text-foreground outline-none transition focus:border-[#6D4BFF]/60"
                placeholder={t("auth.placeholder.password")}
              />
            </label>
          </div>

          {error && (
            <p className="mt-4 rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-100">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#6D4BFF] to-[#8B5CFF] px-5 py-3 text-sm font-semibold text-foreground transition disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting
              ? t("auth.pleaseWait")
              : isRegister
                ? t("auth.submit.register")
                : t("auth.submit.login")}
            {!submitting && <ArrowRight className="h-4 w-4" />}
          </button>

          <div className="my-4 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs uppercase tracking-wide text-muted-foreground">
              {isRo ? "sau" : "or"}
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <button
            type="button"
            onClick={handleGoogleAuth}
            disabled={googleSubmitting}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-[rgba(255,255,255,0.04)] px-5 py-3 text-sm font-semibold text-foreground transition hover:bg-[rgba(255,255,255,0.08)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white text-xs font-bold text-black">
              G
            </span>
            {googleSubmitting ? t("auth.pleaseWait") : t("auth.google")}
          </button>

          <p className="mt-5 text-center text-sm text-muted-foreground">
            {isRegister ? t("auth.switch.hasAccount") : t("auth.switch.newUser")}{" "}
            <Link
              href={isRegister ? localizedPath("/login") : localizedPath("/register")}
              className="font-medium text-cosmic-lavender hover:text-foreground"
            >
              {isRegister ? t("auth.switch.toLogin") : t("auth.switch.toRegister")}
            </Link>
          </p>
        </form>
      </div>
    </main>
  )
}
