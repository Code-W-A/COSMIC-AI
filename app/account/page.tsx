"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Loader2, LogOut, Sparkles } from "lucide-react"

import { AuthGuard } from "@/components/auth/auth-guard"
import { BirthPlaceAutocomplete } from "@/components/location/birth-place-autocomplete"
import { apiFetch } from "@/lib/api/client"
import { logout } from "@/lib/firebase/auth"
import { useLocalizedPath, useTranslations } from "@/lib/i18n/client"
import type { ResolvedBirthLocation } from "@/lib/location/types"
import { isSexAtBirth, type MainFocus, type SexAtBirth } from "@/types/user"

type ProfilePayload = {
  profile: {
    name: string
    birthDate: string
    birthTime: string
    birthPlace: string
    birthPlacePlaceId?: string
    latitude?: number
    longitude?: number
    timezoneIana?: string
    timezoneOffsetAtBirth?: number
    timezoneOffsetNow?: number
    sexAtBirth: SexAtBirth
    mainFocus: MainFocus
  } | null
}

type ReadingsListItem = {
  id: string
  agentType: string
  createdAt: string | null
  question: string
  answerPreview: string
  locale: "ro" | "en"
  hasLocalizedAstrology: boolean
}

type ReadingsListPayload = {
  readings: ReadingsListItem[]
  nextCursor: string | null
}

type ReadingDetailPayload = {
  reading: {
    id: string
    agentType: string
    question: string
    answer: string
    locale: "ro" | "en"
    createdAt: string | null
    astrologySnapshotCanonical: Record<string, unknown> | null
    astrologySnapshotLocalized: {
      locale: "ro"
      segments: Record<string, string>
    } | null
  }
}

type DivineOverviewPayload = {
  profileExists: boolean
  profileComplete: boolean
  natal: {
    generated: boolean
    generatedAt: string | null
    summary: {
      sunSign?: string
      moonSign?: string
      risingSign?: string
      planets?: unknown[]
      houses?: unknown[]
      aspects?: unknown[]
      chartImageSvg?: string
      chartImageBase64?: string
      interpretations?: Record<string, unknown>
    } | null
    raw: Record<string, unknown> | null
  }
  daily: {
    generated: boolean
    generatedAt: string | null
    date: string | null
    sign: string | null
    horoscopeData: string | null
    categories: Record<string, unknown> | null
    raw: Record<string, unknown> | null
  }
  synastry: {
    generated: boolean
    generatedAt: string | null
    mode: string | null
    summary: Record<string, unknown> | null
    raw: Record<string, unknown> | null
    partner: {
      id: string
      name: string | null
      birthDate: string | null
      birthTime: string | null
      birthPlace: string | null
      sexAtBirth: SexAtBirth | null
      natalSummary: Record<string, unknown> | null
    } | null
  }
}

type DisplayRecord = Record<string, unknown>

function toDisplayRecord(value: unknown): DisplayRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as DisplayRecord)
    : null
}

function toDisplayList(value: unknown): DisplayRecord[] {
  return Array.isArray(value)
    ? value.map(toDisplayRecord).filter((item): item is DisplayRecord => Boolean(item))
    : []
}

function displayString(value: unknown) {
  if (typeof value === "string" && value.trim()) return value.trim()
  if (typeof value === "number") return String(value)
  return "—"
}

function chartImageSrc(summary: DivineOverviewPayload["natal"]["summary"]) {
  const svg = summary?.chartImageSvg
  if (typeof svg === "string" && svg.trim()) {
    return svg.trim().startsWith("<svg")
      ? `data:image/svg+xml;utf8,${encodeURIComponent(svg.trim())}`
      : svg.trim()
  }

  const base64 = summary?.chartImageBase64
  if (typeof base64 === "string" && base64.trim()) {
    return base64.trim().startsWith("data:")
      ? base64.trim()
      : `data:image/png;base64,${base64.trim()}`
  }

  return null
}

type PartnerListPayload = {
  partners: Array<{
    id: string
    name: string
    birthDate: string
    birthTime: string
    birthPlace: string
    sexAtBirth: SexAtBirth
    updatedAt: string | null
    natalSummary: Record<string, unknown> | null
  }>
}

type DivineDetailTab = "natal" | "daily" | "synastry"
type AccountSectionTab = "divine" | "profile" | "readings"
const IS_DEV = process.env.NODE_ENV !== "production"

export default function AccountPage() {
  const localizedPath = useLocalizedPath()
  const router = useRouter()
  const { locale, t } = useTranslations()
  const isRo = locale === "ro"

  const [profile, setProfile] = useState<ProfilePayload["profile"]>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")

  const [readings, setReadings] = useState<ReadingsListItem[]>([])
  const [nextReadingsCursor, setNextReadingsCursor] = useState<string | null>(null)
  const [readingsLoading, setReadingsLoading] = useState(true)
  const [readingsLoadingMore, setReadingsLoadingMore] = useState(false)
  const [readingsError, setReadingsError] = useState("")
  const [selectedReading, setSelectedReading] = useState<ReadingDetailPayload["reading"] | null>(
    null
  )
  const [readingDetailLoading, setReadingDetailLoading] = useState(false)

  const [divineOverview, setDivineOverview] = useState<DivineOverviewPayload | null>(null)
  const [divineLoading, setDivineLoading] = useState(true)
  const [divineError, setDivineError] = useState("")
  const [divineTab, setDivineTab] = useState<DivineDetailTab>("natal")
  const [activeSectionTab, setActiveSectionTab] = useState<AccountSectionTab>("divine")
  const [showRawDivine, setShowRawDivine] = useState(false)
  const [partners, setPartners] = useState<PartnerListPayload["partners"]>([])

  const [actionLoading, setActionLoading] = useState({
    generateAll: false,
    natal: false,
    daily: false,
    synastry: false,
  })

  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; text: string } | null>(
    null
  )

  const [synastryForm, setSynastryForm] = useState({
    mode: "new" as "new" | "saved",
    partnerId: "",
    name: "",
    birthDate: "",
    birthTime: "",
    birthPlace: "",
    sexAtBirth: "" as SexAtBirth | "",
    savePartner: true,
  })
  const [synastryResolvedLocation, setSynastryResolvedLocation] =
    useState<ResolvedBirthLocation | null>(null)

  const [form, setForm] = useState({
    name: "",
    birthDate: "",
    birthTime: "",
    birthPlace: "",
    sexAtBirth: "" as SexAtBirth | "",
    mainFocus: "love" as MainFocus,
  })
  const [profileResolvedLocation, setProfileResolvedLocation] =
    useState<ResolvedBirthLocation | null>(null)

  const selectedSavedPartner = useMemo(
    () => partners.find((partner) => partner.id === synastryForm.partnerId) ?? null,
    [partners, synastryForm.partnerId]
  )

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

          if (
            typeof payload.profile.birthPlacePlaceId === "string" &&
            typeof payload.profile.latitude === "number" &&
            typeof payload.profile.longitude === "number" &&
            typeof payload.profile.timezoneIana === "string" &&
            typeof payload.profile.timezoneOffsetAtBirth === "number" &&
            typeof payload.profile.timezoneOffsetNow === "number"
          ) {
            setProfileResolvedLocation({
              placeId: payload.profile.birthPlacePlaceId,
              birthPlace: payload.profile.birthPlace,
              latitude: payload.profile.latitude,
              longitude: payload.profile.longitude,
              timezoneIana: payload.profile.timezoneIana,
              timezoneOffsetAtBirth: payload.profile.timezoneOffsetAtBirth,
              timezoneOffsetNow: payload.profile.timezoneOffsetNow,
            })
          } else {
            setProfileResolvedLocation(null)
          }
        }
      })
      .catch((profileError) => {
        if (!mounted) return
        setError(
          profileError instanceof Error
            ? profileError.message
            : t("account.profile.loadError")
        )
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [isRo])

  useEffect(() => {
    let mounted = true

    apiFetch<{ success: true } & ReadingsListPayload>("/api/readings?limit=10")
      .then((payload) => {
        if (!mounted) return
        setReadings(payload.readings ?? [])
        setNextReadingsCursor(payload.nextCursor ?? null)
      })
      .catch((readingsListError) => {
        if (!mounted) return
        setReadingsError(
          readingsListError instanceof Error
            ? readingsListError.message
            : t("account.readings.loadError")
        )
      })
      .finally(() => {
        if (mounted) setReadingsLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [isRo])

  async function loadDivineOverview() {
    setDivineLoading(true)
    setDivineError("")

    try {
      const [overview, partnerPayload] = await Promise.all([
        apiFetch<{ success: true } & DivineOverviewPayload>("/api/astrology/overview"),
        apiFetch<{ success: true } & PartnerListPayload>("/api/partners"),
      ])

      setDivineOverview(overview)
      setPartners(partnerPayload.partners ?? [])
      // Client-side diagnostics for Divine troubleshooting in dev.
      if (IS_DEV) {
        console.info("[DivineOverview]", {
          profileComplete: overview.profileComplete,
          natalGenerated: overview.natal.generated,
          dailyGenerated: overview.daily.generated,
          synastryGenerated: overview.synastry.generated,
          natalRaw: overview.natal.raw,
          dailyRaw: overview.daily.raw,
          synastryRaw: overview.synastry.raw,
        })
      }

      if ((partnerPayload.partners ?? []).length > 0) {
        setSynastryForm((prev) => ({
          ...prev,
          mode: prev.mode,
          partnerId: prev.partnerId || partnerPayload.partners[0].id,
        }))
      }
    } catch (overviewError) {
      setDivineError(
        overviewError instanceof Error
          ? overviewError.message
          : t("account.divine.loadError")
      )
    } finally {
      setDivineLoading(false)
    }
  }

  useEffect(() => {
    void loadDivineOverview()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function formatDate(value: string | null) {
    if (!value) return "—"
    const date = new Date(value)
    if (Number.isNaN(date.valueOf())) return "—"
    return new Intl.DateTimeFormat(isRo ? "ro-RO" : "en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date)
  }

  function setActionBusy(
    key: keyof typeof actionLoading,
    value: boolean
  ) {
    setActionLoading((prev) => ({ ...prev, [key]: value }))
  }

  function setActionFeedback(tone: "success" | "error", text: string) {
    setFeedback({ tone, text })
    window.setTimeout(() => {
      setFeedback((current) => (current?.text === text ? null : current))
    }, 4500)
  }

  async function runGenerateAll() {
    setActionBusy("generateAll", true)
    try {
      await apiFetch("/api/astrology/generate-all", {
        method: "POST",
        body: { source: "account" },
      })
      if (IS_DEV) console.info("[DivineAction] generate-all success")
      await loadDivineOverview()
      setActionFeedback(
        "success",
        t("account.divine.generateAll.success")
      )
    } catch (generateError) {
      if (IS_DEV) console.error("[DivineAction] generate-all failed", generateError)
      setActionFeedback(
        "error",
        generateError instanceof Error
          ? generateError.message
          : t("account.divine.generateAll.error")
      )
    } finally {
      setActionBusy("generateAll", false)
    }
  }

  async function runNatal(force: boolean) {
    setActionBusy("natal", true)
    try {
      await apiFetch("/api/astrology/natal", {
        method: "POST",
        body: { force, source: "account" },
      })
      if (IS_DEV) console.info("[DivineAction] natal success", { force })
      await loadDivineOverview()
      setActionFeedback(
        "success",
        force
          ? t("account.divine.natal.regenerateSuccess")
          : t("account.divine.natal.generateSuccess")
      )
    } catch (natalError) {
      if (IS_DEV) console.error("[DivineAction] natal failed", { force, error: natalError })
      setActionFeedback(
        "error",
        natalError instanceof Error
          ? natalError.message
          : t("account.divine.natal.error")
      )
    } finally {
      setActionBusy("natal", false)
    }
  }

  async function runDaily(force: boolean) {
    setActionBusy("daily", true)
    try {
      await apiFetch(`/api/astrology/daily?force=${force ? "1" : "0"}&source=account`)
      if (IS_DEV) console.info("[DivineAction] daily success", { force })
      await loadDivineOverview()
      setActionFeedback(
        "success",
        force
          ? t("account.divine.daily.regenerateSuccess")
          : t("account.divine.daily.generateSuccess")
      )
    } catch (dailyError) {
      if (IS_DEV) console.error("[DivineAction] daily failed", { force, error: dailyError })
      setActionFeedback(
        "error",
        dailyError instanceof Error
          ? dailyError.message
          : t("account.divine.daily.error")
      )
    } finally {
      setActionBusy("daily", false)
    }
  }

  async function runSynastry() {
    setActionBusy("synastry", true)
    try {
      if (synastryForm.mode === "new" && !synastryResolvedLocation) {
        throw new Error(
          isRo
            ? "Selectează o locație validă din sugestii pentru partener."
            : "Select a valid location from suggestions for the partner."
        )
      }

      const payload =
        synastryForm.mode === "saved" && synastryForm.partnerId
          ? {
              partnerId: synastryForm.partnerId,
              savePartner: true,
              source: "account",
            }
          : {
              partner: {
                name: synastryForm.name || undefined,
                birthDate: synastryForm.birthDate,
                birthTime: synastryForm.birthTime,
                birthPlace: synastryResolvedLocation?.birthPlace ?? synastryForm.birthPlace,
                birthPlacePlaceId: synastryResolvedLocation?.placeId,
                latitude: synastryResolvedLocation?.latitude,
                longitude: synastryResolvedLocation?.longitude,
                timezoneIana: synastryResolvedLocation?.timezoneIana,
                timezoneOffsetNow: synastryResolvedLocation?.timezoneOffsetNow,
                timezoneOffsetAtBirth: synastryResolvedLocation?.timezoneOffsetAtBirth,
                sexAtBirth: synastryForm.sexAtBirth,
              },
              savePartner: synastryForm.savePartner,
              source: "account",
            }

      await apiFetch("/api/astrology/compatibility", {
        method: "POST",
        body: payload,
      })
      if (IS_DEV) {
        console.info("[DivineAction] synastry success", {
          mode: synastryForm.mode,
          partnerId: synastryForm.partnerId || null,
        })
      }
      await loadDivineOverview()
      setActionFeedback(
        "success",
        t("account.divine.synastry.generateSuccess")
      )
    } catch (synastryError) {
      if (IS_DEV) {
        console.error("[DivineAction] synastry failed", {
          mode: synastryForm.mode,
          partnerId: synastryForm.partnerId || null,
          error: synastryError,
        })
      }
      setActionFeedback(
        "error",
        synastryError instanceof Error
          ? synastryError.message
          : t("account.divine.synastry.error")
      )
    } finally {
      setActionBusy("synastry", false)
    }
  }

  async function loadMoreReadings() {
    if (!nextReadingsCursor || readingsLoadingMore) return

    setReadingsLoadingMore(true)
    try {
      const payload = await apiFetch<{ success: true } & ReadingsListPayload>(
        `/api/readings?limit=10&cursor=${encodeURIComponent(nextReadingsCursor)}`
      )
      setReadings((prev) => [...prev, ...(payload.readings ?? [])])
      setNextReadingsCursor(payload.nextCursor ?? null)
    } catch (readingsListError) {
      setReadingsError(
        readingsListError instanceof Error
          ? readingsListError.message
          : t("account.readings.loadMoreError")
      )
    } finally {
      setReadingsLoadingMore(false)
    }
  }

  async function openReading(readingId: string) {
    setReadingDetailLoading(true)
    try {
      const payload = await apiFetch<{ success: true } & ReadingDetailPayload>(
        `/api/readings/${readingId}`
      )
      setSelectedReading(payload.reading)
    } catch (readingError) {
      setReadingsError(
        readingError instanceof Error
          ? readingError.message
          : t("account.readings.detailError")
      )
    } finally {
      setReadingDetailLoading(false)
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError("")
    setMessage("")

    try {
      if (!profileResolvedLocation) {
        throw new Error(
          isRo
            ? "Selectează un loc valid din sugestii pentru a salva profilul."
            : "Select a valid location from suggestions to save your profile."
        )
      }

      await apiFetch("/api/user/profile", {
        method: "POST",
        body: {
          ...form,
          birthPlace: profileResolvedLocation.birthPlace,
          birthPlacePlaceId: profileResolvedLocation.placeId,
          latitude: profileResolvedLocation.latitude,
          longitude: profileResolvedLocation.longitude,
          timezoneIana: profileResolvedLocation.timezoneIana,
          timezoneOffsetNow: profileResolvedLocation.timezoneOffsetNow,
          timezoneOffsetAtBirth: profileResolvedLocation.timezoneOffsetAtBirth,
        },
      })
      setMessage(t("account.profile.saved"))
      await loadDivineOverview()
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : t("account.profile.saveError")
      )
    } finally {
      setSaving(false)
    }
  }

  const divineTabData =
    divineTab === "natal"
      ? divineOverview?.natal
      : divineTab === "daily"
        ? divineOverview?.daily
        : divineOverview?.synastry
  const natalSummary = divineOverview?.natal.summary ?? null
  const natalPlanets = toDisplayList(natalSummary?.planets)
  const natalHouses = toDisplayList(natalSummary?.houses)
  const natalAspects = toDisplayList(natalSummary?.aspects)
  const natalChartSrc = chartImageSrc(natalSummary)
  const dailyCategories = divineOverview?.daily.categories ?? {}
  const synastryPartnerSummary = divineOverview?.synastry.partner?.natalSummary ?? null
  const synastryPartnerPlanets = toDisplayList(synastryPartnerSummary?.planets)
  const synastryRawData = toDisplayRecord(divineOverview?.synastry.raw?.data)
  const synastryPlacements = toDisplayRecord(synastryRawData?.synastry)
  const synastryP1 = toDisplayList(synastryPlacements?.p1)
  const synastryP2 = toDisplayList(synastryPlacements?.p2)

  return (
    <AuthGuard>
      <main className="relative min-h-dvh bg-background px-4 py-10">
        <div className="mx-auto w-full max-w-4xl space-y-6">
          <Link
            href={localizedPath("/chat")}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <Sparkles className="h-4 w-4 text-cosmic-lavender" />
            {t("common.backToChat")}
          </Link>

          <section className="rounded-2xl border border-border bg-[rgba(255,255,255,0.03)] p-6">
            <h1 className="text-2xl font-bold text-foreground">{t("account.title")}</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {t("account.subtitle")}
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                href={localizedPath("/account/subscription")}
                className="rounded-lg border border-border px-4 py-2 text-sm text-foreground hover:bg-[rgba(255,255,255,0.05)]"
              >
                {t("account.subscription")}
              </Link>
              <Link
                href={localizedPath("/billing/setup")}
                className="rounded-lg border border-border px-4 py-2 text-sm text-foreground hover:bg-[rgba(255,255,255,0.05)]"
              >
                {t("account.billingDetails")}
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
                {t("common.logout")}
              </button>
            </div>
          </section>

          <div className="flex flex-wrap gap-2">
            {([
              ["divine", t("account.tabs.divine")],
              ["profile", t("account.tabs.profile")],
              ["readings", t("account.tabs.readings")],
            ] as Array<[AccountSectionTab, string]>).map(([tab, label]) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveSectionTab(tab)}
                className={`rounded-full px-4 py-2 text-sm transition ${
                  activeSectionTab === tab
                    ? "bg-[rgba(109,75,255,0.22)] text-foreground ring-1 ring-[rgba(109,75,255,0.5)]"
                    : "border border-border bg-[rgba(255,255,255,0.03)] text-muted-foreground hover:text-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {activeSectionTab === "divine" && (
            <section className="rounded-2xl border border-border bg-[rgba(255,255,255,0.03)] p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  {t("account.divine.title")}
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  {t("account.divine.subtitle")}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void runGenerateAll()}
                disabled={actionLoading.generateAll}
                className="rounded-lg border border-border px-4 py-2 text-sm text-foreground hover:bg-[rgba(255,255,255,0.05)] disabled:opacity-60"
              >
                {actionLoading.generateAll
                  ? t("account.divine.generating")
                  : t("account.divine.generateAll")}
              </button>
            </div>

            {feedback && (
              <p
                className={`mt-4 rounded-lg border px-3 py-2 text-sm ${
                  feedback.tone === "success"
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                    : "border-red-500/40 bg-red-500/10 text-red-200"
                }`}
              >
                {feedback.text}
              </p>
            )}

            {divineLoading ? (
              <div className="mt-4 inline-flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("account.divine.loading")}
              </div>
            ) : (
              <>
                {!divineOverview?.profileComplete && (
                  <p className="mt-4 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
                    {t("account.divine.profileIncomplete")}
                  </p>
                )}

                <div className="mt-4 grid gap-4 md:grid-cols-3">
                  <article className="rounded-xl border border-border bg-[rgba(255,255,255,0.03)] p-4">
                    <h3 className="text-sm font-semibold text-foreground">{t("account.divine.card.natal")}</h3>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {divineOverview?.natal.generated
                        ? t("account.divine.status.generated")
                        : t("account.divine.status.notGenerated")}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t("account.divine.lastUpdated")} {formatDate(divineOverview?.natal.generatedAt ?? null)}
                    </p>
                    <p className="mt-2 text-sm text-foreground">
                      {divineOverview?.natal.summary?.sunSign ?? "—"} / {divineOverview?.natal.summary?.moonSign ?? "—"} / {divineOverview?.natal.summary?.risingSign ?? "—"}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={actionLoading.natal || !divineOverview?.profileComplete}
                        onClick={() => void runNatal(!divineOverview?.natal.generated)}
                        className="rounded-md border border-border px-3 py-1.5 text-xs text-foreground disabled:opacity-60"
                      >
                        {actionLoading.natal
                          ? t("account.divine.processing")
                          : divineOverview?.natal.generated
                            ? t("account.divine.regenerate")
                            : t("account.divine.generate")}
                      </button>
                      <button
                        type="button"
                        onClick={() => setDivineTab("natal")}
                        className="rounded-md border border-border px-3 py-1.5 text-xs text-foreground"
                      >
                        {t("account.divine.viewDetails")}
                      </button>
                    </div>
                  </article>

                  <article className="rounded-xl border border-border bg-[rgba(255,255,255,0.03)] p-4">
                    <h3 className="text-sm font-semibold text-foreground">{t("account.divine.card.daily")}</h3>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {divineOverview?.daily.generated
                        ? t("account.divine.status.generated")
                        : t("account.divine.status.notGenerated")}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t("account.divine.lastUpdated")} {formatDate(divineOverview?.daily.generatedAt ?? null)}
                    </p>
                    <p className="mt-2 text-sm text-foreground">
                      {(divineOverview?.daily.horoscopeData ?? "—").slice(0, 110)}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={actionLoading.daily || !divineOverview?.profileComplete}
                        onClick={() => void runDaily(!divineOverview?.daily.generated)}
                        className="rounded-md border border-border px-3 py-1.5 text-xs text-foreground disabled:opacity-60"
                      >
                        {actionLoading.daily
                          ? t("account.divine.processing")
                          : divineOverview?.daily.generated
                            ? t("account.divine.regenerate")
                            : t("account.divine.generate")}
                      </button>
                      <button
                        type="button"
                        onClick={() => setDivineTab("daily")}
                        className="rounded-md border border-border px-3 py-1.5 text-xs text-foreground"
                      >
                        {t("account.divine.viewDetails")}
                      </button>
                    </div>
                  </article>

                  <article className="rounded-xl border border-border bg-[rgba(255,255,255,0.03)] p-4">
                    <h3 className="text-sm font-semibold text-foreground">{t("account.divine.card.synastry")}</h3>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {divineOverview?.synastry.generated
                        ? t("account.divine.status.generated")
                        : t("account.divine.status.notGenerated")}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t("account.divine.lastUpdated")} {formatDate(divineOverview?.synastry.generatedAt ?? null)}
                    </p>
                    <p className="mt-2 text-sm text-foreground">
                      {divineOverview?.synastry.partner?.name ??
                        divineOverview?.synastry.partner?.birthPlace ??
                        "—"}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setDivineTab("synastry")}
                        className="rounded-md border border-border px-3 py-1.5 text-xs text-foreground"
                      >
                        {t("account.divine.viewDetails")}
                      </button>
                    </div>
                  </article>
                </div>

                <div className="mt-5 rounded-xl border border-border bg-[rgba(255,255,255,0.02)] p-4">
                  <h3 className="text-sm font-semibold text-foreground">
                    {t("account.divine.synastry.title")}
                  </h3>

                  {partners.length > 0 && (
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <label className="text-xs text-muted-foreground">
                        <input
                          type="radio"
                          name="synastry-mode"
                          checked={synastryForm.mode === "saved"}
                          onChange={() => {
                            setSynastryResolvedLocation(null)
                            setSynastryForm((prev) => ({
                              ...prev,
                              mode: "saved",
                              partnerId: prev.partnerId || partners[0]?.id || "",
                            }))
                          }}
                          className="mr-1"
                        />
                        {t("account.divine.synastry.savedPartner")}
                      </label>
                      <label className="text-xs text-muted-foreground">
                        <input
                          type="radio"
                          name="synastry-mode"
                          checked={synastryForm.mode === "new"}
                          onChange={() => {
                            setSynastryResolvedLocation(null)
                            setSynastryForm((prev) => ({
                              ...prev,
                              mode: "new",
                            }))
                          }}
                          className="mr-1"
                        />
                        {t("account.divine.synastry.newPartner")}
                      </label>
                    </div>
                  )}

                  {synastryForm.mode === "saved" && partners.length > 0 ? (
                    <div className="mt-3">
                      <label className="text-sm text-muted-foreground">
                        {t("account.divine.synastry.selectPartner")}
                        <select
                          value={synastryForm.partnerId}
                          onChange={(event) =>
                            setSynastryForm((prev) => ({ ...prev, partnerId: event.target.value }))
                          }
                          className="mt-1 w-full rounded-lg border border-border bg-[rgba(255,255,255,0.04)] px-3 py-2 text-foreground"
                        >
                          {partners.map((partner) => (
                            <option key={partner.id} value={partner.id}>
                              {partner.name || `${partner.birthDate} · ${partner.birthPlace}`}
                            </option>
                          ))}
                        </select>
                      </label>
                      {selectedSavedPartner && (
                        <p className="mt-2 text-xs text-muted-foreground">
                          {selectedSavedPartner.birthDate} • {selectedSavedPartner.birthTime} • {selectedSavedPartner.birthPlace}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <label className="text-sm text-muted-foreground">
                        {t("account.divine.synastry.name")}
                        <input
                          value={synastryForm.name}
                          onChange={(event) =>
                            setSynastryForm((prev) => ({ ...prev, name: event.target.value }))
                          }
                          className="mt-1 w-full rounded-lg border border-border bg-[rgba(255,255,255,0.04)] px-3 py-2 text-foreground"
                        />
                      </label>
                      <label className="text-sm text-muted-foreground">
                        {t("account.field.birthDate")}
                        <input
                          type="date"
                          value={synastryForm.birthDate}
                          onChange={(event) =>
                            setSynastryForm((prev) => ({ ...prev, birthDate: event.target.value }))
                          }
                          className="mt-1 w-full rounded-lg border border-border bg-[rgba(255,255,255,0.04)] px-3 py-2 text-foreground"
                        />
                      </label>
                      <label className="text-sm text-muted-foreground">
                        {t("account.field.birthTime")}
                        <input
                          type="time"
                          value={synastryForm.birthTime}
                          onChange={(event) =>
                            setSynastryForm((prev) => ({ ...prev, birthTime: event.target.value }))
                          }
                          className="mt-1 w-full rounded-lg border border-border bg-[rgba(255,255,255,0.04)] px-3 py-2 text-foreground"
                        />
                      </label>
                      <BirthPlaceAutocomplete
                        label={t("account.field.birthPlace")}
                        placeholder={
                          isRo ? "Oraș, județ sau țară" : "City, State or Country"
                        }
                        value={synastryForm.birthPlace}
                        birthDate={synastryForm.birthDate}
                        birthTime={synastryForm.birthTime}
                        required
                        onValueChange={(nextValue) =>
                          setSynastryForm((prev) => ({ ...prev, birthPlace: nextValue }))
                        }
                        onResolvedChange={setSynastryResolvedLocation}
                        initialResolvedLocation={synastryResolvedLocation}
                        messages={{
                          loadingSuggestions: isRo ? "Se caută locații..." : "Searching locations...",
                          loadingResolution: isRo ? "Se validează locația..." : "Resolving location...",
                          missingBirthDateTime:
                            isRo
                              ? "Completează data și ora nașterii pentru validarea locației."
                              : "Enter birth date and time to validate the location.",
                          noResults: isRo ? "Nicio sugestie." : "No suggestions found.",
                        }}
                      />
                      <label className="text-sm text-muted-foreground sm:col-span-2">
                        {t("account.field.sexAtBirth")}
                        <select
                          value={synastryForm.sexAtBirth}
                          onChange={(event) =>
                            setSynastryForm((prev) => ({
                              ...prev,
                              sexAtBirth:
                                event.target.value === "male" || event.target.value === "female"
                                  ? event.target.value
                                  : "",
                            }))
                          }
                          className="mt-1 w-full rounded-lg border border-border bg-[rgba(255,255,255,0.04)] px-3 py-2 text-foreground"
                        >
                          <option value="">{t("account.field.sexPlaceholder")}</option>
                          <option value="male">{t("account.field.male")}</option>
                          <option value="female">{t("account.field.female")}</option>
                        </select>
                      </label>
                      <label className="sm:col-span-2 text-xs text-muted-foreground">
                        <input
                          type="checkbox"
                          className="mr-1"
                          checked={synastryForm.savePartner}
                          onChange={(event) =>
                            setSynastryForm((prev) => ({ ...prev, savePartner: event.target.checked }))
                          }
                        />
                        {t("account.divine.synastry.savePartner")}
                      </label>
                    </div>
                  )}

                  <div className="mt-4">
                    <button
                      type="button"
                      onClick={() => void runSynastry()}
                      disabled={
                        actionLoading.synastry ||
                        !divineOverview?.profileComplete ||
                        (synastryForm.mode === "saved"
                          ? !synastryForm.partnerId
                          : !synastryForm.birthDate ||
                            !synastryForm.birthTime ||
                            !synastryForm.birthPlace ||
                            !synastryForm.sexAtBirth ||
                            !synastryResolvedLocation)
                      }
                      className="rounded-lg border border-border px-4 py-2 text-sm text-foreground disabled:opacity-60"
                    >
                      {actionLoading.synastry
                        ? t("account.divine.processing")
                        : t("account.divine.synastry.generate")}
                    </button>
                  </div>
                </div>

                <div className="mt-5 rounded-xl border border-border bg-[rgba(255,255,255,0.02)] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold text-foreground">
                      {t("account.divine.details.title")}
                    </h3>
                    <label className="text-xs text-muted-foreground">
                      <input
                        type="checkbox"
                        className="mr-1"
                        checked={showRawDivine}
                        onChange={(event) => setShowRawDivine(event.target.checked)}
                      />
                      {t("account.divine.details.showRaw")}
                    </label>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setDivineTab("natal")}
                      className={`rounded-md px-3 py-1.5 text-xs ${
                        divineTab === "natal"
                          ? "bg-[rgba(109,75,255,0.25)] text-foreground"
                          : "border border-border text-muted-foreground"
                      }`}
                    >
                      {t("account.divine.tab.natal")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setDivineTab("daily")}
                      className={`rounded-md px-3 py-1.5 text-xs ${
                        divineTab === "daily"
                          ? "bg-[rgba(109,75,255,0.25)] text-foreground"
                          : "border border-border text-muted-foreground"
                      }`}
                    >
                      {t("account.divine.tab.daily")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setDivineTab("synastry")}
                      className={`rounded-md px-3 py-1.5 text-xs ${
                        divineTab === "synastry"
                          ? "bg-[rgba(109,75,255,0.25)] text-foreground"
                          : "border border-border text-muted-foreground"
                      }`}
                    >
                      {t("account.divine.tab.synastry")}
                    </button>
                  </div>

                  <div className="mt-3 text-sm text-foreground">
                    {divineTab === "natal" && (
                      <div className="space-y-4">
                        <p>
                          {t("account.divine.details.sun")}: {natalSummary?.sunSign ?? "—"} ·{" "}
                          {t("account.divine.details.moon")}: {natalSummary?.moonSign ?? "—"} ·{" "}
                          {t("account.divine.details.rising")}: {natalSummary?.risingSign ?? "—"}
                        </p>
                        <p className="mt-2 text-xs text-muted-foreground">
                          {t("account.divine.details.planets")}: {natalPlanets.length} ·{" "}
                          {t("account.divine.details.houses")}: {natalHouses.length} ·{" "}
                          {t("account.divine.details.aspects")}: {natalAspects.length}
                        </p>
                        {natalChartSrc && (
                          <div>
                            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                              {t("account.divine.details.chart")}
                            </p>
                            <img
                              src={natalChartSrc}
                              alt={t("account.divine.card.natal")}
                              className="max-h-[520px] w-full rounded-xl border border-border bg-white/95 object-contain p-3"
                            />
                          </div>
                        )}
                        {natalPlanets.length > 0 ? (
                          <div>
                            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                              {t("account.divine.details.planets")}
                            </p>
                            <div className="grid gap-2 sm:grid-cols-2">
                              {natalPlanets.map((planet, index) => (
                                <div
                                  key={`${displayString(planet.name)}-${index}`}
                                  className="rounded-lg border border-border bg-[rgba(255,255,255,0.03)] p-3"
                                >
                                  <div className="flex items-center justify-between gap-3">
                                    <span className="font-medium">
                                      {displayString(planet.name)}
                                    </span>
                                    <span className="text-muted-foreground">
                                      {displayString(planet.sign)}
                                    </span>
                                  </div>
                                  <p className="mt-1 text-xs text-muted-foreground">
                                    {t("account.divine.details.house")} {displayString(planet.house)} ·{" "}
                                    {t("account.divine.details.degree")}{" "}
                                    {displayString(planet.fullDegree ?? planet.degree ?? planet.longitude)}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground">
                            {t("account.divine.details.noData")}
                          </p>
                        )}
                        {natalHouses.length > 0 && (
                          <div>
                            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                              {t("account.divine.details.houses")}
                            </p>
                            <div className="grid gap-2 sm:grid-cols-3">
                              {natalHouses.map((house, index) => (
                                <div
                                  key={`${displayString(house.house)}-${index}`}
                                  className="rounded-lg border border-border bg-[rgba(255,255,255,0.03)] p-3 text-xs"
                                >
                                  {t("account.divine.details.house")} {displayString(house.house)} ·{" "}
                                  {displayString(house.sign)} ·{" "}
                                  {displayString(house.fullDegree ?? house.degree)}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {natalAspects.length > 0 && (
                          <div>
                            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                              {t("account.divine.details.aspects")}
                            </p>
                            <div className="grid gap-2 sm:grid-cols-2">
                              {natalAspects.slice(0, 24).map((aspect, index) => (
                                <div
                                  key={`${displayString(aspect.planet1)}-${displayString(aspect.planet2)}-${index}`}
                                  className="rounded-lg border border-border bg-[rgba(255,255,255,0.03)] p-3 text-xs"
                                >
                                  <span className="text-foreground">
                                    {displayString(aspect.planet1)} · {displayString(aspect.aspect)} ·{" "}
                                    {displayString(aspect.planet2)}
                                  </span>
                                  <span className="ml-2 text-muted-foreground">
                                    {t("account.divine.details.orb")} {displayString(aspect.orb)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {divineTab === "daily" && (
                      <div className="space-y-3">
                        <p>{divineOverview?.daily.horoscopeData ?? "—"}</p>
                        <p className="mt-2 text-xs text-muted-foreground">
                          {t("account.divine.details.localDate")} {divineOverview?.daily.date ?? "—"} · {t("account.divine.details.sign")} {divineOverview?.daily.sign ?? "—"}
                        </p>
                        {Object.keys(dailyCategories).length > 0 && (
                          <div>
                            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                              {t("account.divine.details.categories")}
                            </p>
                            <div className="grid gap-2 sm:grid-cols-2">
                              {Object.entries(dailyCategories).map(([key, value]) => (
                                <div
                                  key={key}
                                  className="rounded-lg border border-border bg-[rgba(255,255,255,0.03)] p-3"
                                >
                                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                                    {key}
                                  </p>
                                  <p className="mt-1 text-sm">{displayString(value)}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {divineTab === "synastry" && (
                      <div className="space-y-4">
                        <p>
                          {divineOverview?.synastry.summary?.emotional
                            ? String(divineOverview.synastry.summary.emotional)
                            : divineOverview?.synastry.summary?.communication
                              ? String(divineOverview.synastry.summary.communication)
                              : "—"}
                        </p>
                        <p className="mt-2 text-xs text-muted-foreground">
                          {t("account.divine.details.score")}{" "}
                          {divineOverview?.synastry.summary?.score != null
                            ? String(divineOverview.synastry.summary.score)
                            : "—"}{" "}
                          · {t("account.divine.details.partner")}{" "}
                          {divineOverview?.synastry.partner?.name ??
                            divineOverview?.synastry.partner?.birthPlace ??
                            "—"}
                        </p>
                        {synastryPartnerPlanets.length > 0 && (
                          <div>
                            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                              {t("account.divine.details.partnerNatal")}
                            </p>
                            <div className="grid gap-2 sm:grid-cols-2">
                              {synastryPartnerPlanets.map((planet, index) => (
                                <div
                                  key={`${displayString(planet.name)}-${index}`}
                                  className="rounded-lg border border-border bg-[rgba(255,255,255,0.03)] p-3 text-xs"
                                >
                                  {displayString(planet.name)} · {displayString(planet.sign)} ·{" "}
                                  {t("account.divine.details.house")} {displayString(planet.house)}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {(synastryP1.length > 0 || synastryP2.length > 0) && (
                          <div>
                            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                              {t("account.divine.details.synastryPlacements")}
                            </p>
                            <div className="grid gap-3 sm:grid-cols-2">
                              {[
                                ["P1", synastryP1],
                                ["P2", synastryP2],
                              ].map(([label, placements]) => (
                                <div
                                  key={String(label)}
                                  className="rounded-lg border border-border bg-[rgba(255,255,255,0.03)] p-3"
                                >
                                  <p className="mb-2 text-xs font-medium text-muted-foreground">
                                    {String(label)}
                                  </p>
                                  <div className="space-y-1 text-xs">
                                    {(placements as DisplayRecord[]).slice(0, 16).map((placement, index) => (
                                      <p key={`${String(label)}-${index}`}>
                                        {displayString(placement.planet ?? placement.name)} ·{" "}
                                        {displayString(placement.sign)} ·{" "}
                                        {t("account.divine.details.house")}{" "}
                                        {displayString(placement.house)}
                                      </p>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {showRawDivine && (
                    <pre className="mt-3 max-h-80 overflow-auto rounded-lg border border-border bg-[rgba(255,255,255,0.03)] p-3 text-xs text-foreground">
                      {JSON.stringify(divineTabData, null, 2)}
                    </pre>
                  )}
                </div>
              </>
            )}

            {divineError && <p className="mt-3 text-sm text-red-300">{divineError}</p>}
            </section>
          )}

          {activeSectionTab === "profile" && (
            <section className="rounded-2xl border border-border bg-[rgba(255,255,255,0.03)] p-6">
            <h2 className="text-lg font-semibold text-foreground">
              {t("account.profile.title")}
            </h2>
            {loading ? (
              <div className="mt-4 inline-flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("account.profile.loading")}
              </div>
            ) : (
              <form className="mt-4 grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit}>
                <label className="text-sm text-muted-foreground">
                  {t("account.field.name")}
                  <input
                    required
                    value={form.name}
                    onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                    className="mt-1 w-full rounded-lg border border-border bg-[rgba(255,255,255,0.04)] px-3 py-2 text-foreground"
                  />
                </label>
                <label className="text-sm text-muted-foreground">
                  {t("account.field.birthDate")}
                  <input
                    required
                    type="date"
                    value={form.birthDate}
                    onChange={(event) => setForm((prev) => ({ ...prev, birthDate: event.target.value }))}
                    className="mt-1 w-full rounded-lg border border-border bg-[rgba(255,255,255,0.04)] px-3 py-2 text-foreground"
                  />
                </label>
                <label className="text-sm text-muted-foreground">
                  {t("account.field.birthTime")}
                  <input
                    required
                    type="time"
                    value={form.birthTime}
                    onChange={(event) => setForm((prev) => ({ ...prev, birthTime: event.target.value }))}
                    className="mt-1 w-full rounded-lg border border-border bg-[rgba(255,255,255,0.04)] px-3 py-2 text-foreground"
                  />
                </label>
                <BirthPlaceAutocomplete
                  label={t("account.field.birthPlace")}
                  placeholder={isRo ? "Oraș, județ sau țară" : "City, State or Country"}
                  value={form.birthPlace}
                  birthDate={form.birthDate}
                  birthTime={form.birthTime}
                  required
                  onValueChange={(nextValue) =>
                    setForm((prev) => ({ ...prev, birthPlace: nextValue }))
                  }
                  onResolvedChange={setProfileResolvedLocation}
                  initialResolvedLocation={profileResolvedLocation}
                  messages={{
                    loadingSuggestions: isRo ? "Se caută locații..." : "Searching locations...",
                    loadingResolution: isRo ? "Se validează locația..." : "Resolving location...",
                    missingBirthDateTime:
                      isRo
                        ? "Completează data și ora nașterii pentru validarea locației."
                        : "Enter birth date and time to validate the location.",
                    noResults: isRo ? "Nicio sugestie." : "No suggestions found.",
                  }}
                />
                <label className="text-sm text-muted-foreground">
                  {t("account.field.sexAtBirth")}
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
                    <option value="">{t("account.field.sexPlaceholder")}</option>
                    <option value="male">{t("account.field.male")}</option>
                    <option value="female">{t("account.field.female")}</option>
                  </select>
                </label>
                <label className="text-sm text-muted-foreground sm:col-span-2">
                  {t("account.field.mainFocus")}
                  <select
                    value={form.mainFocus}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, mainFocus: event.target.value as MainFocus }))
                    }
                    className="mt-1 w-full rounded-lg border border-border bg-[rgba(255,255,255,0.04)] px-3 py-2 text-foreground"
                  >
                    <option value="love">{t("account.focus.love")}</option>
                    <option value="compatibility">{t("account.focus.compatibility")}</option>
                    <option value="self_discovery">{t("account.focus.selfDiscovery")}</option>
                    <option value="career">{t("account.focus.career")}</option>
                    <option value="daily_guidance">{t("account.focus.dailyGuidance")}</option>
                  </select>
                </label>
                <div className="sm:col-span-2 flex items-center gap-3">
                  <button
                    type="submit"
                    disabled={saving || !profileResolvedLocation}
                    className="rounded-lg bg-gradient-to-r from-[#6D4BFF] to-[#8B5CFF] px-4 py-2 text-sm font-semibold text-foreground disabled:opacity-60"
                  >
                    {saving ? t("account.profile.saving") : t("account.profile.save")}
                  </button>
                  {profile && (
                    <span className="text-xs text-muted-foreground">
                      {t("account.profile.detected")}
                    </span>
                  )}
                </div>
              </form>
            )}
            {message && <p className="mt-3 text-sm text-emerald-300">{message}</p>}
            {error && <p className="mt-3 text-sm text-red-300">{error}</p>}
            </section>
          )}

          {activeSectionTab === "readings" && (
            <section className="rounded-2xl border border-border bg-[rgba(255,255,255,0.03)] p-6">
            <h2 className="text-lg font-semibold text-foreground">
              {t("account.readings.title")}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {t("account.readings.subtitle")}
            </p>

            {readingsLoading ? (
              <div className="mt-4 inline-flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("account.readings.loading")}
              </div>
            ) : readings.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">
                {t("account.readings.empty")}
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {readings.map((reading) => (
                  <button
                    key={reading.id}
                    type="button"
                    onClick={() => void openReading(reading.id)}
                    className="w-full rounded-xl border border-border bg-[rgba(255,255,255,0.04)] p-4 text-left hover:bg-[rgba(255,255,255,0.07)]"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-foreground">
                        {reading.agentType.replaceAll("_", " ")}
                      </p>
                      <p className="text-xs text-muted-foreground">{formatDate(reading.createdAt)}</p>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {t("account.readings.question")} {reading.question}
                    </p>
                    <p className="mt-1 text-sm text-foreground">{reading.answerPreview}</p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {reading.hasLocalizedAstrology
                        ? t("account.readings.withRoLocalization")
                        : t("account.readings.withoutRoLocalization")}
                    </p>
                  </button>
                ))}

                {nextReadingsCursor && (
                  <button
                    type="button"
                    onClick={() => void loadMoreReadings()}
                    disabled={readingsLoadingMore}
                    className="rounded-lg border border-border px-4 py-2 text-sm text-foreground disabled:opacity-60"
                  >
                    {readingsLoadingMore
                      ? t("common.loading")
                      : t("account.readings.loadMore")}
                  </button>
                )}
              </div>
            )}

            {readingDetailLoading && (
              <div className="mt-4 inline-flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("account.readings.detailLoading")}
              </div>
            )}

            {selectedReading && !readingDetailLoading && (
              <div className="mt-4 rounded-xl border border-border bg-[rgba(255,255,255,0.03)] p-4">
                <h3 className="text-sm font-semibold text-foreground">
                  {t("account.readings.detailTitle")}
                </h3>
                <p className="mt-2 text-xs text-muted-foreground">
                  {t("account.readings.question")} {selectedReading.question}
                </p>
                <p className="mt-2 text-sm text-foreground">{selectedReading.answer}</p>

                {selectedReading.astrologySnapshotLocalized?.segments && (
                  <div className="mt-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {t("account.readings.localizedRo")}
                    </p>
                    <pre className="mt-2 max-h-72 overflow-auto rounded-lg border border-border bg-[rgba(255,255,255,0.03)] p-3 text-xs text-foreground">
                      {JSON.stringify(selectedReading.astrologySnapshotLocalized.segments, null, 2)}
                    </pre>
                  </div>
                )}

                {selectedReading.astrologySnapshotCanonical && (
                  <div className="mt-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {t("account.readings.canonicalValues")}
                    </p>
                    <pre className="mt-2 max-h-72 overflow-auto rounded-lg border border-border bg-[rgba(255,255,255,0.03)] p-3 text-xs text-foreground">
                      {JSON.stringify(selectedReading.astrologySnapshotCanonical, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}

            {readingsError && <p className="mt-3 text-sm text-red-300">{readingsError}</p>}
            </section>
          )}
        </div>
      </main>
    </AuthGuard>
  )
}
