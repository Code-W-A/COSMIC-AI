"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Loader2, LogOut, Sparkles } from "lucide-react"

import { AuthGuard } from "@/components/auth/auth-guard"
import { apiFetch } from "@/lib/api/client"
import { logout } from "@/lib/firebase/auth"
import { useLocalizedPath, useTranslations } from "@/lib/i18n/client"
import { isSexAtBirth, type MainFocus, type SexAtBirth } from "@/types/user"

type ProfilePayload = {
  profile: {
    name: string
    birthDate: string
    birthTime: string
    birthPlace: string
    sexAtBirth: SexAtBirth
    mainFocus: MainFocus
  } | null
}

export default function AccountPage() {
  const localizedPath = useLocalizedPath()
  const router = useRouter()
  const { locale } = useTranslations()
  const isRo = locale === "ro"
  const [profile, setProfile] = useState<ProfilePayload["profile"]>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const [form, setForm] = useState({
    name: "",
    birthDate: "",
    birthTime: "",
    birthPlace: "",
    sexAtBirth: "" as SexAtBirth | "",
    mainFocus: "love" as MainFocus,
  })

  useEffect(() => {
    let mounted = true
    apiFetch<{ success: true } & ProfilePayload>("/api/user/profile")
      .then((payload) => {
        if (!mounted) return
        setProfile(payload.profile)
        if (payload.profile) {
          setForm({
            name: payload.profile.name ?? "",
            birthDate: payload.profile.birthDate ?? "",
            birthTime: payload.profile.birthTime ?? "",
            birthPlace: payload.profile.birthPlace ?? "",
            sexAtBirth: isSexAtBirth(payload.profile.sexAtBirth)
              ? payload.profile.sexAtBirth
              : "",
            mainFocus: payload.profile.mainFocus ?? "love",
          })
        }
      })
      .catch((profileError) => {
        if (!mounted) return
        setError(
          profileError instanceof Error
            ? profileError.message
            : isRo
              ? "Nu am putut încărca profilul."
              : "Unable to load profile."
        )
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [isRo])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError("")
    setMessage("")

    try {
      await apiFetch("/api/user/profile", {
        method: "POST",
        body: form,
      })
      setMessage(isRo ? "Profilul cosmic a fost salvat." : "Cosmic profile saved.")
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : isRo
            ? "Nu am putut salva profilul."
            : "Unable to save profile."
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <AuthGuard>
      <main className="relative min-h-dvh bg-background px-4 py-10">
        <div className="mx-auto w-full max-w-4xl space-y-6">
          <Link href={localizedPath("/chat")} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <Sparkles className="h-4 w-4 text-cosmic-lavender" />
            {isRo ? "Înapoi la chat" : "Back to chat"}
          </Link>

          <section className="rounded-2xl border border-border bg-[rgba(255,255,255,0.03)] p-6">
            <h1 className="text-2xl font-bold text-foreground">{isRo ? "Contul meu" : "My account"}</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {isRo
                ? "Gestionează abonamentul, profilul cosmic și datele folosite pentru analize."
                : "Manage subscription, cosmic profile, and analysis data."}
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link href={localizedPath("/account/subscription")} className="rounded-lg border border-border px-4 py-2 text-sm text-foreground hover:bg-[rgba(255,255,255,0.05)]">
                {isRo ? "Abonament" : "Subscription"}
              </Link>
              <Link href={localizedPath("/billing/setup")} className="rounded-lg border border-border px-4 py-2 text-sm text-foreground hover:bg-[rgba(255,255,255,0.05)]">
                {isRo ? "Date facturare" : "Billing details"}
              </Link>
              <button
                type="button"
                onClick={async () => {
                  await logout()
                  router.push(localizedPath("/"))
                }}
                className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm text-foreground hover:bg-[rgba(255,255,255,0.05)]"
              >
                <LogOut className="h-4 w-4" />
                {isRo ? "Deconectare" : "Log out"}
              </button>
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-[rgba(255,255,255,0.03)] p-6">
            <h2 className="text-lg font-semibold text-foreground">
              {isRo ? "Profil cosmic și editare date" : "Cosmic profile and data editing"}
            </h2>
            {loading ? (
              <div className="mt-4 inline-flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                {isRo ? "Se încarcă profilul..." : "Loading profile..."}
              </div>
            ) : (
              <form className="mt-4 grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit}>
                <label className="text-sm text-muted-foreground">
                  {isRo ? "Nume" : "Name"}
                  <input
                    required
                    value={form.name}
                    onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                    className="mt-1 w-full rounded-lg border border-border bg-[rgba(255,255,255,0.04)] px-3 py-2 text-foreground"
                  />
                </label>
                <label className="text-sm text-muted-foreground">
                  {isRo ? "Data nașterii" : "Birth date"}
                  <input
                    required
                    type="date"
                    value={form.birthDate}
                    onChange={(event) => setForm((prev) => ({ ...prev, birthDate: event.target.value }))}
                    className="mt-1 w-full rounded-lg border border-border bg-[rgba(255,255,255,0.04)] px-3 py-2 text-foreground"
                  />
                </label>
                <label className="text-sm text-muted-foreground">
                  {isRo ? "Ora nașterii" : "Birth time"}
                  <input
                    required
                    type="time"
                    value={form.birthTime}
                    onChange={(event) => setForm((prev) => ({ ...prev, birthTime: event.target.value }))}
                    className="mt-1 w-full rounded-lg border border-border bg-[rgba(255,255,255,0.04)] px-3 py-2 text-foreground"
                  />
                </label>
                <label className="text-sm text-muted-foreground">
                  {isRo ? "Locul nașterii" : "Birth place"}
                  <input
                    required
                    value={form.birthPlace}
                    onChange={(event) => setForm((prev) => ({ ...prev, birthPlace: event.target.value }))}
                    className="mt-1 w-full rounded-lg border border-border bg-[rgba(255,255,255,0.04)] px-3 py-2 text-foreground"
                  />
                </label>
                <label className="text-sm text-muted-foreground">
                  {isRo ? "Sex biologic" : "Sex at birth"}
                  <select
                    required
                    value={form.sexAtBirth}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        sexAtBirth:
                          event.target.value === "male" || event.target.value === "female"
                            ? event.target.value
                            : "",
                      }))
                    }
                    className="mt-1 w-full rounded-lg border border-border bg-[rgba(255,255,255,0.04)] px-3 py-2 text-foreground"
                  >
                    <option value="">{isRo ? "Selectează sexul biologic" : "Select sex at birth"}</option>
                    <option value="male">{isRo ? "Masculin" : "Male"}</option>
                    <option value="female">{isRo ? "Feminin" : "Female"}</option>
                  </select>
                </label>
                <label className="text-sm text-muted-foreground sm:col-span-2">
                  {isRo ? "Focus principal" : "Main focus"}
                  <select
                    value={form.mainFocus}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, mainFocus: event.target.value as MainFocus }))
                    }
                    className="mt-1 w-full rounded-lg border border-border bg-[rgba(255,255,255,0.04)] px-3 py-2 text-foreground"
                  >
                    <option value="love">{isRo ? "Iubire" : "Love"}</option>
                    <option value="compatibility">{isRo ? "Compatibilitate" : "Compatibility"}</option>
                    <option value="self_discovery">{isRo ? "Autocunoaștere" : "Self discovery"}</option>
                    <option value="career">{isRo ? "Carieră" : "Career"}</option>
                    <option value="daily_guidance">{isRo ? "Ghidaj zilnic" : "Daily guidance"}</option>
                  </select>
                </label>
                <div className="sm:col-span-2 flex items-center gap-3">
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-lg bg-gradient-to-r from-[#6D4BFF] to-[#8B5CFF] px-4 py-2 text-sm font-semibold text-foreground disabled:opacity-60"
                  >
                    {saving ? (isRo ? "Se salvează..." : "Saving...") : isRo ? "Salvează" : "Save"}
                  </button>
                  {profile && (
                    <span className="text-xs text-muted-foreground">
                      {isRo ? "Profil existent detectat." : "Existing profile detected."}
                    </span>
                  )}
                </div>
              </form>
            )}
            {message && <p className="mt-3 text-sm text-emerald-300">{message}</p>}
            {error && <p className="mt-3 text-sm text-red-300">{error}</p>}
          </section>
        </div>
      </main>
    </AuthGuard>
  )
}
