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
type AccountSectionTab =
  | "overview"
  | "cosmic_profile"
  | "daily_guidance"
  | "compatibility"
  | "billing"
type SubscriptionStatusPayload = {
  subscriptionStatus: string
  subscriptionPlan: "free" | "premium" | string
  billingInterval: "monthly" | "annual" | null
  currentPeriodEnd: string | null
  cancelAtPeriodEnd: boolean
  isPremium: boolean
}
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
  const [activeSectionTab, setActiveSectionTab] = useState<AccountSectionTab>("overview")
  const [showRawDivine, setShowRawDivine] = useState(false)
  const [partners, setPartners] = useState<PartnerListPayload["partners"]>([])
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatusPayload | null>(
    null
  )

  const [actionLoading, setActionLoading] = useState({
    generateAll: false,
    natal: false,
    daily: false,
    synastry: false,
  })

  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; text: string } | null>(
    null
  )

  const [selectedPartnerId, setSelectedPartnerId] = useState("")
  const [isAddingNewPartner, setIsAddingNewPartner] = useState(false)
  const [newPartnerForm, setNewPartnerForm] = useState({
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
    () => partners.find((partner) => partner.id === selectedPartnerId) ?? null,
    [partners, selectedPartnerId]
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
        setSelectedPartnerId((prev) => {
          if (prev && partnerPayload.partners.some((partner) => partner.id === prev)) return prev
          return partnerPayload.partners[0].id
        })
      } else {
        setSelectedPartnerId("")
      }
    } catch (overviewError) {
      setDivineError(
        overviewError instanceof Error
          ? overviewError.message
          : t("account.insights.loadError")
      )
    } finally {
      setDivineLoading(false)
    }
  }

  useEffect(() => {
    void loadDivineOverview()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    let mounted = true

    apiFetch<{ success: true } & SubscriptionStatusPayload>("/api/subscription/status")
      .then((payload) => {
        if (!mounted) return
        setSubscriptionStatus(payload)
      })
      .catch(() => {
        if (!mounted) return
        setSubscriptionStatus(null)
      })

    return () => {
      mounted = false
    }
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

  function planLabel() {
    if (!subscriptionStatus) return t("account.hero.planUnknown")
    if (subscriptionStatus.subscriptionPlan !== "premium") return t("account.hero.planFree")

    if (subscriptionStatus.billingInterval === "monthly") {
      return t("account.hero.planPremiumMonthly")
    }
    if (subscriptionStatus.billingInterval === "annual") {
      return t("account.hero.planPremiumAnnual")
    }
    return t("account.hero.planPremium")
  }

  function focusLabel(value: MainFocus | "") {
    switch (value) {
      case "love":
        return t("account.focus.love")
      case "compatibility":
        return t("account.focus.compatibility")
      case "self_discovery":
        return t("account.focus.selfDiscovery")
      case "career":
        return t("account.focus.career")
      case "daily_guidance":
        return t("account.focus.dailyGuidance")
      default:
        return "—"
    }
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
        t("account.insights.generateAll.success")
      )
    } catch (generateError) {
      if (IS_DEV) console.error("[DivineAction] generate-all failed", generateError)
      setActionFeedback(
        "error",
        generateError instanceof Error
          ? generateError.message
          : t("account.insights.generateAll.error")
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

  async function runSynastry(mode: "saved" | "new") {
    setActionBusy("synastry", true)
    try {
      if (mode === "saved" && !selectedPartnerId) {
        throw new Error(
          isRo
            ? "Selectează un partener pentru a genera citirea relațională."
            : "Select a partner to generate the relationship reading."
        )
      }

      if (mode === "new" && !synastryResolvedLocation) {
        throw new Error(
          isRo
            ? "Selectează o locație validă din sugestii pentru partener."
            : "Select a valid location from suggestions for the partner."
        )
      }

      const payload =
        mode === "saved" && selectedPartnerId
          ? {
              partnerId: selectedPartnerId,
              savePartner: true,
              source: "account",
            }
          : {
              partner: {
                name: newPartnerForm.name || undefined,
                birthDate: newPartnerForm.birthDate,
                birthTime: newPartnerForm.birthTime,
                birthPlace: synastryResolvedLocation?.birthPlace ?? newPartnerForm.birthPlace,
                birthPlacePlaceId: synastryResolvedLocation?.placeId,
                latitude: synastryResolvedLocation?.latitude,
                longitude: synastryResolvedLocation?.longitude,
                timezoneIana: synastryResolvedLocation?.timezoneIana,
                timezoneOffsetNow: synastryResolvedLocation?.timezoneOffsetNow,
                timezoneOffsetAtBirth: synastryResolvedLocation?.timezoneOffsetAtBirth,
                sexAtBirth: newPartnerForm.sexAtBirth,
              },
              savePartner: newPartnerForm.savePartner,
              source: "account",
            }

      await apiFetch("/api/astrology/compatibility", {
        method: "POST",
        body: payload,
      })
      if (IS_DEV) {
        console.info("[DivineAction] synastry success", {
          mode,
          partnerId: mode === "saved" ? selectedPartnerId || null : null,
        })
      }
      if (mode === "new") {
        setIsAddingNewPartner(false)
      }
      await loadDivineOverview()
      setActionFeedback(
        "success",
        t("account.divine.synastry.generateSuccess")
      )
    } catch (synastryError) {
      if (IS_DEV) {
        console.error("[DivineAction] synastry failed", {
          mode,
          partnerId: mode === "saved" ? selectedPartnerId || null : null,
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
  const hasSavedPartners = partners.length > 0
  const hasCompatibilityReading = Boolean(divineOverview?.synastry.generated)
  const compatibilityPartnerName =
    divineOverview?.synastry.partner?.name ??
    divineOverview?.synastry.partner?.birthPlace ??
    "—"
  const isSavedPartnerGenerateDisabled =
    actionLoading.synastry || !divineOverview?.profileComplete || !selectedPartnerId
  const isNewPartnerGenerateDisabled =
    actionLoading.synastry ||
    !divineOverview?.profileComplete ||
    !newPartnerForm.birthDate ||
    !newPartnerForm.birthTime ||
    !newPartnerForm.birthPlace ||
    !newPartnerForm.sexAtBirth ||
    !synastryResolvedLocation

  function resetNewPartnerForm() {
    setSynastryResolvedLocation(null)
    setNewPartnerForm({
      name: "",
      birthDate: "",
      birthTime: "",
      birthPlace: "",
      sexAtBirth: "",
      savePartner: true,
    })
  }

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
              ["overview", t("account.tabs.overview")],
              ["cosmic_profile", t("account.tabs.cosmicProfile")],
              ["daily_guidance", t("account.tabs.dailyGuidance")],
              ["compatibility", t("account.tabs.compatibility")],
              ["billing", t("account.tabs.billing")],
            ] as Array<[AccountSectionTab, string]>).map(([tab, label]) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveSectionTab(tab)}
                className={`rounded-full px-4 py-2 text-sm transition ${
                  activeSectionTab === tab
                    ? "bg-[rgba(109,75,255,0.30)] text-foreground ring-1 ring-[rgba(139,92,255,0.72)]"
                    : "border border-white/10 bg-[rgba(255,255,255,0.03)] text-muted-foreground hover:text-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {activeSectionTab === "overview" && (
            <section className="space-y-5 rounded-3xl border border-white/10 bg-[radial-gradient(140%_130%_at_10%_0%,rgba(109,75,255,0.28),rgba(10,10,20,0.92)_55%)] p-6 shadow-[0_0_80px_rgba(109,75,255,0.16)]">
              <div className="grid gap-4 md:grid-cols-4">
                <article className="rounded-2xl border border-white/10 bg-black/25 p-4 md:col-span-2">
                  <p className="text-xs uppercase tracking-[0.18em] text-cosmic-lavender">{t("account.hero.welcomeEyebrow")}</p>
                  <h2 className="mt-2 text-2xl font-semibold text-foreground">
                    {t("account.hero.welcomeTitle")} {profile?.name || t("account.hero.traveler")}
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground">{t("account.hero.welcomeSubtitle")}</p>
                </article>
                <article className="rounded-2xl border border-white/10 bg-black/30 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{t("account.hero.currentPlan")}</p>
                  <p className="mt-2 text-lg font-medium text-foreground">{planLabel()}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {subscriptionStatus?.currentPeriodEnd
                      ? `${t("account.hero.nextRenewal")} ${formatDate(subscriptionStatus.currentPeriodEnd)}`
                      : "—"}
                  </p>
                </article>
                <article className="rounded-2xl border border-white/10 bg-black/30 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{t("account.hero.currentFocus")}</p>
                  <p className="mt-2 text-lg font-medium text-foreground">{focusLabel(form.mainFocus)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{t("account.hero.focusHint")}</p>
                </article>
              </div>

              <article className="rounded-2xl border border-white/10 bg-black/25 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{t("account.hero.lastReading")}</p>
                {readingsLoading ? (
                  <p className="mt-2 text-sm text-muted-foreground">{t("common.loading")}</p>
                ) : readings.length === 0 ? (
                  <p className="mt-2 text-sm text-muted-foreground">{t("account.readings.empty")}</p>
                ) : (
                  <>
                    <p className="mt-2 text-sm font-medium text-foreground">{readings[0]?.question || "—"}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{readings[0]?.answerPreview || "—"}</p>
                    <p className="mt-2 text-xs text-muted-foreground">{formatDate(readings[0]?.createdAt ?? null)}</p>
                  </>
                )}
              </article>

              <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">{t("account.insights.title")}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">{t("account.insights.subtitle")}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void runGenerateAll()}
                      disabled={actionLoading.generateAll}
                      className="rounded-lg border border-white/20 px-4 py-2 text-sm text-foreground disabled:opacity-60"
                    >
                      {actionLoading.generateAll ? t("account.insights.generating") : t("account.insights.generateAll")}
                    </button>
                    <button
                      type="button"
                      disabled={actionLoading.natal || !divineOverview?.profileComplete}
                      onClick={() => void runNatal(!divineOverview?.natal.generated)}
                      className="rounded-lg border border-white/20 px-4 py-2 text-sm text-foreground disabled:opacity-60"
                    >
                      {actionLoading.natal
                        ? t("account.insights.processing")
                        : divineOverview?.natal.generated
                          ? t("account.insights.refreshNatal")
                          : t("account.insights.generateNatal")}
                    </button>
                  </div>
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
                    {t("account.insights.loading")}
                  </div>
                ) : (
                  <div className="mt-4 space-y-4">
                    <div className="rounded-xl border border-white/10 bg-black/30 p-4">
                      <h4 className="text-base font-semibold text-foreground">{t("account.insights.coreSignature")}</h4>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {t("account.insights.sun")}: {natalSummary?.sunSign ?? "—"} · {t("account.insights.moon")}:{" "}
                        {natalSummary?.moonSign ?? "—"} · {t("account.insights.rising")}: {natalSummary?.risingSign ?? "—"}
                      </p>
                    </div>

                    {natalChartSrc && (
                      <div className="rounded-xl border border-white/10 bg-black/30 p-4">
                        <h4 className="mb-3 text-sm font-semibold text-foreground">{t("account.insights.birthChart")}</h4>
                        <img
                          src={natalChartSrc}
                          alt={t("account.insights.birthChart")}
                          className="max-h-[520px] w-full rounded-xl border border-white/10 bg-white/95 object-contain p-3"
                        />
                      </div>
                    )}

                    <details className="rounded-xl border border-white/10 bg-black/25 p-4">
                      <summary className="cursor-pointer text-sm font-semibold text-foreground">{t("account.insights.planets")}</summary>
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        {natalPlanets.length === 0 ? (
                          <p className="text-sm text-muted-foreground">{t("account.insights.noData")}</p>
                        ) : (
                          natalPlanets.map((planet, index) => (
                            <div key={`${displayString(planet.name)}-${index}`} className="rounded-lg border border-white/10 bg-black/25 p-3 text-sm">
                              <p className="font-medium text-foreground">{displayString(planet.name)} · {displayString(planet.sign)}</p>
                              <p className="text-xs text-muted-foreground">{t("account.insights.house")} {displayString(planet.house)} · {t("account.insights.degree")} {displayString(planet.fullDegree ?? planet.degree ?? planet.longitude)}</p>
                            </div>
                          ))
                        )}
                      </div>
                    </details>

                    <details className="rounded-xl border border-white/10 bg-black/25 p-4">
                      <summary className="cursor-pointer text-sm font-semibold text-foreground">{t("account.insights.houses")}</summary>
                      <div className="mt-3 grid gap-2 sm:grid-cols-3">
                        {natalHouses.length === 0 ? (
                          <p className="text-sm text-muted-foreground">{t("account.insights.noData")}</p>
                        ) : (
                          natalHouses.map((house, index) => (
                            <div key={`${displayString(house.house)}-${index}`} className="rounded-lg border border-white/10 bg-black/25 p-3 text-xs text-foreground">
                              {t("account.insights.house")} {displayString(house.house)} · {displayString(house.sign)} · {displayString(house.fullDegree ?? house.degree)}
                            </div>
                          ))
                        )}
                      </div>
                    </details>

                    <details className="rounded-xl border border-white/10 bg-black/25 p-4">
                      <summary className="cursor-pointer text-sm font-semibold text-foreground">{t("account.insights.aspects")}</summary>
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        {natalAspects.length === 0 ? (
                          <p className="text-sm text-muted-foreground">{t("account.insights.noData")}</p>
                        ) : (
                          natalAspects.slice(0, 24).map((aspect, index) => (
                            <div key={`${displayString(aspect.planet1)}-${displayString(aspect.planet2)}-${index}`} className="rounded-lg border border-white/10 bg-black/25 p-3 text-xs text-foreground">
                              {displayString(aspect.planet1)} · {displayString(aspect.aspect)} · {displayString(aspect.planet2)} · {t("account.insights.orb")} {displayString(aspect.orb)}
                            </div>
                          ))
                        )}
                      </div>
                    </details>

                    {IS_DEV && (
                      <details className="rounded-xl border border-white/10 bg-black/25 p-4">
                        <summary className="cursor-pointer text-sm font-semibold text-foreground">{t("account.insights.developerMode")}</summary>
                        <label className="mt-3 inline-flex items-center text-xs text-muted-foreground">
                          <input
                            type="checkbox"
                            className="mr-2"
                            checked={showRawDivine}
                            onChange={(event) => setShowRawDivine(event.target.checked)}
                          />
                          {t("account.insights.showRaw")}
                        </label>
                        {showRawDivine && (
                          <pre className="mt-3 max-h-80 overflow-auto rounded-lg border border-white/10 bg-black/35 p-3 text-xs text-foreground">
                            {JSON.stringify(divineTabData, null, 2)}
                          </pre>
                        )}
                      </details>
                    )}
                  </div>
                )}

                {divineError && <p className="mt-4 text-sm text-red-300">{divineError}</p>}
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                <h3 className="text-base font-semibold text-foreground">{t("account.readings.title")}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{t("account.readings.subtitle")}</p>
                {readingsLoading ? (
                  <div className="mt-4 inline-flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t("account.readings.loading")}
                  </div>
                ) : readings.length === 0 ? (
                  <p className="mt-4 text-sm text-muted-foreground">{t("account.readings.empty")}</p>
                ) : (
                  <div className="mt-4 grid gap-3">
                    {readings.slice(0, 4).map((reading) => (
                      <button
                        key={reading.id}
                        type="button"
                        onClick={() => void openReading(reading.id)}
                        className="w-full rounded-xl border border-white/10 bg-black/25 p-4 text-left hover:bg-black/35"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-sm font-medium text-foreground">{reading.question}</p>
                          <p className="text-xs text-muted-foreground">{formatDate(reading.createdAt)}</p>
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground">{reading.answerPreview}</p>
                      </button>
                    ))}
                    {nextReadingsCursor && (
                      <button
                        type="button"
                        onClick={() => void loadMoreReadings()}
                        disabled={readingsLoadingMore}
                        className="rounded-lg border border-white/20 px-4 py-2 text-sm text-foreground disabled:opacity-60"
                      >
                        {readingsLoadingMore ? t("common.loading") : t("account.readings.loadMore")}
                      </button>
                    )}
                  </div>
                )}
                {selectedReading && (
                  <div className="mt-4 rounded-xl border border-white/10 bg-black/30 p-4">
                    <p className="text-sm font-semibold text-foreground">{selectedReading.question}</p>
                    <p className="mt-2 text-sm text-muted-foreground">{selectedReading.answer}</p>
                  </div>
                )}
                {readingsError && <p className="mt-3 text-sm text-red-300">{readingsError}</p>}
              </div>
            </section>
          )}

          {activeSectionTab === "cosmic_profile" && (
            <section className="rounded-3xl border border-white/10 bg-[radial-gradient(120%_120%_at_0%_0%,rgba(139,92,246,0.22),rgba(10,10,20,0.94)_62%)] p-6 shadow-[0_0_70px_rgba(109,75,255,0.14)]">
              <h2 className="text-lg font-semibold text-foreground">{t("account.profile.title")}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{t("account.profile.subtitle")}</p>
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

          {activeSectionTab === "daily_guidance" && (
            <section className="space-y-4 rounded-3xl border border-white/10 bg-[radial-gradient(120%_120%_at_100%_0%,rgba(109,75,255,0.22),rgba(10,10,20,0.94)_62%)] p-6 shadow-[0_0_70px_rgba(109,75,255,0.14)]">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">{t("account.daily.title")}</h2>
                  <p className="mt-2 text-sm text-muted-foreground">{t("account.daily.subtitle")}</p>
                </div>
                <button
                  type="button"
                  disabled={actionLoading.daily || !divineOverview?.profileComplete}
                  onClick={() => void runDaily(!divineOverview?.daily.generated)}
                  className="rounded-lg border border-white/20 px-4 py-2 text-sm text-foreground disabled:opacity-60"
                >
                  {actionLoading.daily
                    ? t("account.insights.processing")
                    : divineOverview?.daily.generated
                      ? t("account.daily.refresh")
                      : t("account.daily.generate")}
                </button>
              </div>

              <article className="rounded-2xl border border-white/10 bg-black/30 p-5">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{t("account.daily.mainReading")}</p>
                <p className="mt-3 text-sm leading-7 text-foreground">{divineOverview?.daily.horoscopeData ?? "—"}</p>
                <p className="mt-3 text-xs text-muted-foreground">
                  {t("account.daily.localDate")} {divineOverview?.daily.date ?? "—"} · {t("account.daily.sign")} {divineOverview?.daily.sign ?? "—"}
                </p>
              </article>

              <div className="grid gap-3 md:grid-cols-2">
                {[
                  ["travel", t("account.daily.categories.travel")],
                  ["emotions", t("account.daily.categories.emotions")],
                  ["health", t("account.daily.categories.health")],
                  ["career", t("account.daily.categories.career")],
                ].map(([key, label]) => (
                  <article key={key} className="rounded-2xl border border-white/10 bg-black/25 p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
                    <p className="mt-2 text-sm text-foreground">{displayString(dailyCategories[key])}</p>
                  </article>
                ))}
              </div>
            </section>
          )}

          {activeSectionTab === "compatibility" && (
            <section className="space-y-4 rounded-3xl border border-white/10 bg-[radial-gradient(120%_120%_at_40%_0%,rgba(139,92,246,0.20),rgba(10,10,20,0.94)_62%)] p-6 shadow-[0_0_70px_rgba(109,75,255,0.14)]">
              <div>
                <h2 className="text-lg font-semibold text-foreground">{t("account.compatibility.title")}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{t("account.compatibility.subtitle")}</p>
              </div>

              <article className="rounded-2xl border border-violet-300/20 bg-black/30 p-5 shadow-[0_0_36px_rgba(139,92,246,0.16)]">
                <h3 className="text-base font-semibold text-foreground">
                  {t("account.compatibility.withPartner")} {compatibilityPartnerName}
                </h3>
                <p className="mt-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                  {t("account.compatibility.summaryLabel")}
                </p>
                <p className="mt-3 text-sm leading-7 text-foreground">
                  {divineOverview?.synastry.summary?.emotional
                    ? String(divineOverview.synastry.summary.emotional)
                    : divineOverview?.synastry.summary?.communication
                      ? String(divineOverview.synastry.summary.communication)
                      : t("account.compatibility.emptySummary")}
                </p>
                {!hasCompatibilityReading && (
                  <p className="mt-3 text-xs text-muted-foreground">
                    {t("account.compatibility.emptySummaryHint")}
                  </p>
                )}
              </article>

              <div className="rounded-2xl border border-violet-300/20 bg-black/25 p-5 shadow-[0_0_28px_rgba(139,92,246,0.12)]">
                <h3 className="text-sm font-semibold text-foreground">
                  {hasSavedPartners
                    ? t("account.compatibility.choosePartner")
                    : t("account.compatibility.addPartner")}
                </h3>

                {hasSavedPartners ? (
                  <div className="mt-4 space-y-4">
                    <label className="text-sm text-muted-foreground">
                      {t("account.compatibility.choosePartner")}
                      <select
                        value={selectedPartnerId}
                        onChange={(event) => setSelectedPartnerId(event.target.value)}
                        className="mt-2 w-full rounded-xl border border-violet-300/20 bg-black/40 px-3 py-2 text-foreground"
                      >
                        {partners.map((partner) => (
                          <option key={partner.id} value={partner.id}>
                            {partner.name || `${partner.birthDate} · ${partner.birthPlace}`}
                          </option>
                        ))}
                      </select>
                    </label>

                    {selectedSavedPartner && (
                      <div className="rounded-xl border border-violet-300/15 bg-black/30 p-4 text-xs text-muted-foreground">
                        <p className="text-sm font-medium text-foreground">
                          {t("account.compatibility.previewName")} {selectedSavedPartner.name || "—"}
                        </p>
                        <p className="mt-2">
                          {t("account.compatibility.previewBirthDate")} {selectedSavedPartner.birthDate || "—"}
                        </p>
                        <p>
                          {t("account.compatibility.previewBirthTime")} {selectedSavedPartner.birthTime || "—"}
                        </p>
                        <p>
                          {t("account.compatibility.previewBirthPlace")} {selectedSavedPartner.birthPlace || "—"}
                        </p>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => void runSynastry("saved")}
                      disabled={isSavedPartnerGenerateDisabled}
                      className="w-full rounded-xl bg-gradient-to-r from-[#6D4BFF] to-[#8B5CFF] px-4 py-2.5 text-sm font-semibold text-foreground disabled:opacity-60"
                    >
                      {actionLoading.synastry
                        ? t("account.insights.processing")
                        : t("account.compatibility.generate")}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        resetNewPartnerForm()
                        setIsAddingNewPartner(true)
                      }}
                      className="text-sm font-medium text-violet-200 hover:text-violet-100"
                    >
                      {t("account.compatibility.addNewPartner")}
                    </button>
                  </div>
                ) : (
                  <div className="mt-4 rounded-xl border border-violet-300/15 bg-black/30 p-4">
                    <p className="text-sm text-foreground">{t("account.compatibility.noSavedPartnersTitle")}</p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {t("account.compatibility.noSavedPartnersSubtitle")}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        resetNewPartnerForm()
                        setIsAddingNewPartner(true)
                      }}
                      className="mt-4 w-full rounded-xl bg-gradient-to-r from-[#6D4BFF] to-[#8B5CFF] px-4 py-2.5 text-sm font-semibold text-foreground"
                    >
                      {t("account.compatibility.addPartner")}
                    </button>
                  </div>
                )}

                {isAddingNewPartner && (
                  <div className="mt-4 rounded-xl border border-violet-300/20 bg-black/35 p-4">
                    <div className="grid gap-3 md:grid-cols-2">
                      <label className="text-sm text-muted-foreground md:col-span-2">
                        {t("account.compatibility.partnerName")}
                        <input
                          value={newPartnerForm.name}
                          onChange={(event) =>
                            setNewPartnerForm((prev) => ({ ...prev, name: event.target.value }))
                          }
                          className="mt-1 w-full rounded-lg border border-violet-300/15 bg-black/30 px-3 py-2 text-foreground"
                        />
                      </label>
                      <label className="text-sm text-muted-foreground">
                        {t("account.field.birthDate")}
                        <input
                          type="date"
                          value={newPartnerForm.birthDate}
                          onChange={(event) =>
                            setNewPartnerForm((prev) => ({ ...prev, birthDate: event.target.value }))
                          }
                          className="mt-1 w-full rounded-lg border border-violet-300/15 bg-black/30 px-3 py-2 text-foreground"
                        />
                      </label>
                      <label className="text-sm text-muted-foreground">
                        {t("account.field.birthTime")}
                        <input
                          type="time"
                          value={newPartnerForm.birthTime}
                          onChange={(event) =>
                            setNewPartnerForm((prev) => ({ ...prev, birthTime: event.target.value }))
                          }
                          className="mt-1 w-full rounded-lg border border-violet-300/15 bg-black/30 px-3 py-2 text-foreground"
                        />
                      </label>
                      <BirthPlaceAutocomplete
                        label={t("account.field.birthPlace")}
                        placeholder={isRo ? "Oraș, județ sau țară" : "City, State or Country"}
                        value={newPartnerForm.birthPlace}
                        birthDate={newPartnerForm.birthDate}
                        birthTime={newPartnerForm.birthTime}
                        required
                        onValueChange={(nextValue) =>
                          setNewPartnerForm((prev) => ({ ...prev, birthPlace: nextValue }))
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
                      <label className="text-sm text-muted-foreground md:col-span-2">
                        {t("account.field.sexAtBirth")}
                        <select
                          value={newPartnerForm.sexAtBirth}
                          onChange={(event) =>
                            setNewPartnerForm((prev) => ({
                              ...prev,
                              sexAtBirth:
                                event.target.value === "male" || event.target.value === "female"
                                  ? event.target.value
                                  : "",
                            }))
                          }
                          className="mt-1 w-full rounded-lg border border-violet-300/15 bg-black/30 px-3 py-2 text-foreground"
                        >
                          <option value="">{t("account.field.sexPlaceholder")}</option>
                          <option value="male">{t("account.field.male")}</option>
                          <option value="female">{t("account.field.female")}</option>
                        </select>
                      </label>
                      <label className="md:col-span-2 text-xs text-muted-foreground">
                        <input
                          type="checkbox"
                          className="mr-1"
                          checked={newPartnerForm.savePartner}
                          onChange={(event) =>
                            setNewPartnerForm((prev) => ({ ...prev, savePartner: event.target.checked }))
                          }
                        />
                        {t("account.compatibility.saveForFuture")}
                      </label>
                    </div>
                    <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                      <button
                        type="button"
                        onClick={() => void runSynastry("new")}
                        disabled={isNewPartnerGenerateDisabled}
                        className="rounded-xl bg-gradient-to-r from-[#6D4BFF] to-[#8B5CFF] px-4 py-2.5 text-sm font-semibold text-foreground disabled:opacity-60"
                      >
                        {actionLoading.synastry
                          ? t("account.insights.processing")
                          : t("account.compatibility.saveAndGenerate")}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsAddingNewPartner(false)
                          resetNewPartnerForm()
                        }}
                        className="rounded-xl border border-white/15 px-4 py-2.5 text-sm text-foreground"
                      >
                        {t("account.compatibility.cancel")}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {hasCompatibilityReading && (
                <details className="rounded-2xl border border-white/10 bg-black/25 p-5">
                  <summary className="cursor-pointer text-sm font-semibold text-foreground">{t("account.compatibility.technicalDetails")}</summary>
                  <div className="mt-3 space-y-3">
                    {(synastryP1.length > 0 || synastryP2.length > 0) && (
                      <div className="grid gap-3 sm:grid-cols-2">
                        {[
                          ["P1", synastryP1],
                          ["P2", synastryP2],
                        ].map(([label, placements]) => (
                          <div key={String(label)} className="rounded-lg border border-white/10 bg-black/30 p-3">
                            <p className="mb-2 text-xs font-medium text-muted-foreground">{String(label)}</p>
                            <div className="space-y-1 text-xs">
                              {(placements as DisplayRecord[]).slice(0, 16).map((placement, index) => (
                                <p key={`${String(label)}-${index}`}>
                                  {displayString(placement.planet ?? placement.name)} · {displayString(placement.sign)} · {t("account.insights.house")} {displayString(placement.house)}
                                </p>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {synastryPartnerPlanets.length > 0 && (
                      <div className="grid gap-2 sm:grid-cols-2">
                        {synastryPartnerPlanets.map((planet, index) => (
                          <div key={`${displayString(planet.name)}-${index}`} className="rounded-lg border border-white/10 bg-black/30 p-3 text-xs">
                            {displayString(planet.name)} · {displayString(planet.sign)} · {t("account.insights.house")} {displayString(planet.house)}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </details>
              )}
            </section>
          )}

          {activeSectionTab === "billing" && (
            <section className="space-y-4 rounded-3xl border border-white/10 bg-[radial-gradient(120%_120%_at_30%_0%,rgba(109,75,255,0.22),rgba(10,10,20,0.94)_62%)] p-6 shadow-[0_0_70px_rgba(109,75,255,0.14)]">
              <h2 className="text-lg font-semibold text-foreground">{t("account.billing.title")}</h2>
              <p className="text-sm text-muted-foreground">{t("account.billing.subtitle")}</p>
              <div className="grid gap-3 md:grid-cols-2">
                <article className="rounded-2xl border border-white/10 bg-black/25 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{t("account.billing.currentPlan")}</p>
                  <p className="mt-2 text-base font-medium text-foreground">{planLabel()}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {subscriptionStatus?.currentPeriodEnd
                      ? `${t("account.hero.nextRenewal")} ${formatDate(subscriptionStatus.currentPeriodEnd)}`
                      : "—"}
                  </p>
                </article>
                <article className="rounded-2xl border border-white/10 bg-black/25 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{t("account.billing.actionsTitle")}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link
                      href={localizedPath("/account/subscription")}
                      className="rounded-lg border border-white/20 px-4 py-2 text-sm text-foreground hover:bg-white/5"
                    >
                      {t("account.billing.manageSubscription")}
                    </Link>
                    <Link
                      href={localizedPath("/billing/setup")}
                      className="rounded-lg border border-white/20 px-4 py-2 text-sm text-foreground hover:bg-white/5"
                    >
                      {t("account.billing.manageBillingDetails")}
                    </Link>
                  </div>
                </article>
              </div>
            </section>
          )}
        </div>
      </main>
    </AuthGuard>
  )
}
