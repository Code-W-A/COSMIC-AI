"use client"

import { Suspense, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { LogOut, Sparkles } from "lucide-react"

import { DeleteAccountSection } from "@/components/account/delete-account-section"
import { ContactSection } from "@/components/account/contact-section"
import {
  PartnerCompatibilitySection,
  type SynastryRunRequest,
} from "@/components/account/partner-compatibility-section"
import {
  AccountBillingSkeleton,
  AccountDailySkeleton,
  AccountHeroFocusSkeleton,
  AccountHeroNameSkeleton,
  AccountHeroPlanSkeleton,
  AccountInsightsSkeleton,
  AccountLastReadingSkeleton,
  AccountProfileFormSkeleton,
} from "@/components/account/account-skeletons"
import { AuthGuard } from "@/components/auth/auth-guard"
import { SubscriptionUsageMeter } from "@/components/subscription/subscription-usage-meter"
import { BirthPlaceAutocomplete } from "@/components/location/birth-place-autocomplete"
import { BirthDateFields, BirthTimeFields } from "@/components/profile/birth-datetime-fields"
import { apiFetch } from "@/lib/api/client"
import { getNatalChartImageSrc } from "@/lib/onboarding/natal-chart-image"
import { logout } from "@/lib/firebase/auth"
import { useLocalizedPath, useTranslations } from "@/lib/i18n/client"
import { getSafeReturnToPath } from "@/lib/navigation/safe-return-to"
import { formatZodiacSign } from "@/lib/i18n/zodiac"
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
  return getNatalChartImageSrc(summary)
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
// TEMP: Compatibility tab hidden on /account — set to true to restore the tab + section below.
const ACCOUNT_COMPATIBILITY_TAB_ENABLED = false
type AccountSectionTab =
  | "overview"
  | "cosmic_profile"
  | "daily_guidance"
  | "compatibility"
  | "billing"
  | "contact"
  | "account_settings"
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
  return (
    <Suspense fallback={<AccountPageFallback />}>
      <AccountPageContent />
    </Suspense>
  )
}

function AccountPageFallback() {
  return (
    <AuthGuard>
      <div className="min-h-dvh bg-background px-4 py-10 sm:px-6">
        <AccountHeroNameSkeleton />
      </div>
    </AuthGuard>
  )
}

function AccountPageContent() {
  const localizedPath = useLocalizedPath()
  const router = useRouter()
  const searchParams = useSearchParams()
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
  const [subscriptionLoading, setSubscriptionLoading] = useState(true)

  const [actionLoading, setActionLoading] = useState({
    generateAll: false,
    natal: false,
    daily: false,
    synastry: false,
  })

  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; text: string } | null>(
    null
  )

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

  const returnTo = getSafeReturnToPath(searchParams.get("returnTo"))

  useEffect(() => {
    const tab = searchParams.get("tab")
    if (
      tab === "overview" ||
      tab === "cosmic_profile" ||
      tab === "daily_guidance" ||
      (ACCOUNT_COMPATIBILITY_TAB_ENABLED && tab === "compatibility") ||
      tab === "billing" ||
      tab === "contact" ||
      tab === "account_settings"
    ) {
      setActiveSectionTab(tab)
    }
  }, [searchParams])

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

      if (!overview.profileComplete) {
        router.replace(localizedPath("/onboarding"))
        return
      }

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
      .finally(() => {
        if (mounted) setSubscriptionLoading(false)
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

  async function reloadPartners() {
    const partnerPayload = await apiFetch<{ success: true } & PartnerListPayload>("/api/partners")
    setPartners(partnerPayload.partners ?? [])
  }

  async function runSynastry(request: SynastryRunRequest) {
    setActionBusy("synastry", true)
    try {
      const payload =
        request.mode === "saved"
          ? {
              partnerId: request.partnerId,
              savePartner: true,
              source: "account",
            }
          : {
              partner: {
                name: request.name || undefined,
                birthDate: request.birthDate,
                birthTime: request.birthTime,
                birthPlace: request.resolvedLocation.birthPlace,
                birthPlacePlaceId: request.resolvedLocation.placeId,
                latitude: request.resolvedLocation.latitude,
                longitude: request.resolvedLocation.longitude,
                timezoneIana: request.resolvedLocation.timezoneIana,
                timezoneOffsetNow: request.resolvedLocation.timezoneOffsetNow,
                timezoneOffsetAtBirth: request.resolvedLocation.timezoneOffsetAtBirth,
                sexAtBirth: request.sexAtBirth,
              },
              savePartner: request.savePartner ?? true,
              source: "account",
            }

      await apiFetch("/api/astrology/compatibility", {
        method: "POST",
        body: payload,
      })
      if (IS_DEV) {
        console.info("[DivineAction] synastry success", {
          mode: request.mode,
          partnerId: request.mode === "saved" ? request.partnerId : null,
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
          mode: request.mode,
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

      const response = await apiFetch<{ success: true; astroInputsChanged?: boolean }>(
        "/api/user/profile",
        {
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
        }
      )

      if (response.astroInputsChanged) {
        router.push(localizedPath("/onboarding?phase=divine&source=account"))
        return
      }

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
              ["overview", t("account.tabs.overview")],
              ["cosmic_profile", t("account.tabs.cosmicProfile")],
              ["daily_guidance", t("account.tabs.dailyGuidance")],
              // TEMP: uncomment next line when ACCOUNT_COMPATIBILITY_TAB_ENABLED is true
              ...(ACCOUNT_COMPATIBILITY_TAB_ENABLED
                ? ([["compatibility", t("account.compatibility.title")]] as Array<
                    [AccountSectionTab, string]
                  >)
                : []),
              ["billing", t("account.tabs.billing")],
              ["contact", t("account.tabs.contact")],
              ["account_settings", t("account.tabs.accountSettings")],
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
                    {t("account.hero.welcomeTitle")}{" "}
                    {loading ? (
                      <AccountHeroNameSkeleton />
                    ) : (
                      profile?.name || t("account.hero.traveler")
                    )}
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground">{t("account.hero.welcomeSubtitle")}</p>
                </article>
                <article className="rounded-2xl border border-white/10 bg-black/30 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{t("account.hero.currentPlan")}</p>
                  {subscriptionLoading ? (
                    <AccountHeroPlanSkeleton />
                  ) : (
                    <>
                      <p className="mt-2 text-lg font-medium text-foreground">{planLabel()}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {subscriptionStatus?.currentPeriodEnd
                          ? `${t("account.hero.nextRenewal")} ${formatDate(subscriptionStatus.currentPeriodEnd)}`
                          : "—"}
                      </p>
                    </>
                  )}
                </article>
                <article className="rounded-2xl border border-white/10 bg-black/30 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{t("account.hero.currentFocus")}</p>
                  {loading ? (
                    <AccountHeroFocusSkeleton />
                  ) : (
                    <>
                      <p className="mt-2 text-lg font-medium text-foreground">{focusLabel(form.mainFocus)}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{t("account.hero.focusHint")}</p>
                    </>
                  )}
                </article>
              </div>

              {subscriptionStatus && !subscriptionStatus.isPremium ? (
                <SubscriptionUsageMeter
                  used={subscriptionStatus.monthlyQuestionCount}
                  limit={subscriptionStatus.monthlyQuestionLimit}
                  variant="card"
                />
              ) : null}

              <article className="rounded-2xl border border-white/10 bg-black/25 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{t("account.hero.lastReading")}</p>
                {readingsLoading ? (
                  <AccountLastReadingSkeleton />
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
                      data-testid="account-generate-all-button"
                      onClick={() => void runGenerateAll()}
                      disabled={actionLoading.generateAll}
                      className="rounded-lg border border-white/20 px-4 py-2 text-sm text-foreground disabled:opacity-60"
                    >
                      {actionLoading.generateAll ? t("account.insights.generating") : t("account.insights.generateAll")}
                    </button>
                    <button
                      type="button"
                      data-testid="account-generate-natal-button"
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
                    data-testid={`account-feedback-${feedback.tone}`}
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
                  <AccountInsightsSkeleton />
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
            </section>
          )}

          {activeSectionTab === "cosmic_profile" && (
            <section className="rounded-3xl border border-white/10 bg-[radial-gradient(120%_120%_at_0%_0%,rgba(139,92,246,0.22),rgba(10,10,20,0.94)_62%)] p-6 shadow-[0_0_70px_rgba(109,75,255,0.14)]">
              <h2 className="text-lg font-semibold text-foreground">{t("account.profile.title")}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{t("account.profile.subtitle")}</p>
            {loading ? (
              <AccountProfileFormSkeleton />
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
                <BirthDateFields
                  label={t("account.field.birthDate")}
                  value={form.birthDate}
                  onChange={(birthDate) => setForm((prev) => ({ ...prev, birthDate }))}
                  testIdPrefix="account-profile-"
                  wrapperTestId="account-profile-birthdate"
                />
                <BirthTimeFields
                  label={t("account.field.birthTime")}
                  value={form.birthTime}
                  onChange={(birthTime) => setForm((prev) => ({ ...prev, birthTime }))}
                  testIdPrefix="account-profile-"
                  wrapperTestId="account-profile-birthtime"
                />
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
                    data-testid="account-profile-save"
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
                  data-testid="account-daily-generate-button"
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

              {divineLoading ? (
                <AccountDailySkeleton />
              ) : (
                <>
              <article className="rounded-2xl border border-white/10 bg-black/30 p-5">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{t("account.daily.mainReading")}</p>
                <p className="mt-3 text-sm leading-7 text-foreground">{divineOverview?.daily.horoscopeData ?? "—"}</p>
                <p className="mt-3 text-xs text-muted-foreground">
                  {t("account.daily.localDate")} {divineOverview?.daily.date ?? "—"} · {t("account.daily.sign")}{" "}
                  {formatZodiacSign(divineOverview?.daily.sign, locale)}
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
                </>
              )}
            </section>
          )}

          {/* TEMP: restore when ACCOUNT_COMPATIBILITY_TAB_ENABLED is true */}
          {ACCOUNT_COMPATIBILITY_TAB_ENABLED && activeSectionTab === "compatibility" && (
            <PartnerCompatibilitySection
              partners={partners}
              divineOverview={divineOverview}
              returnTo={returnTo}
              isSynastryLoading={actionLoading.synastry}
              onRunSynastry={runSynastry}
              onPartnersChanged={reloadPartners}
            />
          )}

          {activeSectionTab === "contact" && (
            <ContactSection userName={form.name || profile?.name} />
          )}

          {activeSectionTab === "account_settings" && (
            <DeleteAccountSection
              isPremiumBlocked={Boolean(
                subscriptionStatus?.isPremium && !subscriptionStatus.cancelAtPeriodEnd
              )}
              onDeleted={() => {
                window.location.assign(localizedPath("/login"))
              }}
            />
          )}

          {activeSectionTab === "billing" && (
            <section className="space-y-4 rounded-3xl border border-white/10 bg-[radial-gradient(120%_120%_at_30%_0%,rgba(109,75,255,0.22),rgba(10,10,20,0.94)_62%)] p-6 shadow-[0_0_70px_rgba(109,75,255,0.14)]">
              <h2 className="text-lg font-semibold text-foreground">{t("account.billing.title")}</h2>
              <p className="text-sm text-muted-foreground">{t("account.billing.subtitle")}</p>
              {subscriptionLoading ? (
                <AccountBillingSkeleton />
              ) : (
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
              )}
            </section>
          )}
        </div>
      </main>
    </AuthGuard>
  )
}
