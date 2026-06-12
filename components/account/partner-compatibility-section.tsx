"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"

import { BirthPlaceAutocomplete } from "@/components/location/birth-place-autocomplete"
import { BirthDateFields, BirthTimeFields } from "@/components/profile/birth-datetime-fields"
import { apiFetch } from "@/lib/api/client"
import { getSafeReturnToPath } from "@/lib/navigation/safe-return-to"
import { useTranslations } from "@/lib/i18n/client"
import type { ResolvedBirthLocation } from "@/lib/location/types"
import type { SexAtBirth } from "@/types/user"

type PartnerSummary = {
  id: string
  name: string
  birthDate: string
  birthTime: string
  birthPlace: string
  sexAtBirth: SexAtBirth
  updatedAt: string | null
  natalSummary: Record<string, unknown> | null
}

type SynastryOverview = {
  generated: boolean
  partner?: {
    name?: string | null
    birthPlace?: string | null
    natalSummary?: Record<string, unknown> | null
  } | null
  raw?: Record<string, unknown> | null
}

export type SynastryRunRequest =
  | { mode: "saved"; partnerId: string }
  | {
      mode: "new"
      name: string
      birthDate: string
      birthTime: string
      birthPlace: string
      sexAtBirth: SexAtBirth
      resolvedLocation: ResolvedBirthLocation
      savePartner?: boolean
    }

interface PartnerCompatibilitySectionProps {
  partners: PartnerSummary[]
  divineOverview: {
    profileComplete: boolean
    synastry: SynastryOverview
  } | null
  returnTo?: string | null
  isSynastryLoading: boolean
  onRunSynastry: (request: SynastryRunRequest) => Promise<void>
  onPartnersChanged: () => Promise<void>
}

export function PartnerCompatibilitySection({
  partners,
  divineOverview,
  returnTo,
  isSynastryLoading,
  onRunSynastry,
  onPartnersChanged,
}: PartnerCompatibilitySectionProps) {
  const router = useRouter()
  const { locale, t } = useTranslations()
  const isRo = locale === "ro"
  const safeReturnTo = getSafeReturnToPath(returnTo)

  const [selectedPartnerId, setSelectedPartnerId] = useState("")
  const [isAddingNewPartner, setIsAddingNewPartner] = useState(partners.length === 0)
  const [isSavingPartner, setIsSavingPartner] = useState(false)
  const [error, setError] = useState("")
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

  const selectedSavedPartner = useMemo(
    () => partners.find((partner) => partner.id === selectedPartnerId) ?? null,
    [partners, selectedPartnerId]
  )

  const hasSavedPartners = partners.length > 0
  const hasCompatibilityReading = Boolean(divineOverview?.synastry.generated)
  const compatibilityPartnerName =
    divineOverview?.synastry.partner?.name ??
    divineOverview?.synastry.partner?.birthPlace ??
    "—"

  const isSavedPartnerGenerateDisabled =
    isSynastryLoading || !divineOverview?.profileComplete || !selectedPartnerId
  const isNewPartnerGenerateDisabled =
    isSynastryLoading ||
    !divineOverview?.profileComplete ||
    !newPartnerForm.birthDate ||
    !newPartnerForm.birthTime ||
    !newPartnerForm.birthPlace ||
    !newPartnerForm.sexAtBirth ||
    !synastryResolvedLocation

  async function saveNewPartner(andReturn = false) {
    if (!synastryResolvedLocation) {
      setError(
        isRo
          ? "Selectează o locație validă din sugestii pentru partener."
          : "Select a valid location from suggestions for the partner."
      )
      return
    }

    setIsSavingPartner(true)
    setError("")

    try {
      await apiFetch("/api/partners", {
        method: "POST",
        body: {
          name: newPartnerForm.name || undefined,
          birthDate: newPartnerForm.birthDate,
          birthTime: newPartnerForm.birthTime,
          birthPlace: synastryResolvedLocation.birthPlace,
          birthPlacePlaceId: synastryResolvedLocation.placeId,
          latitude: synastryResolvedLocation.latitude,
          longitude: synastryResolvedLocation.longitude,
          timezoneIana: synastryResolvedLocation.timezoneIana,
          timezoneOffsetNow: synastryResolvedLocation.timezoneOffsetNow,
          timezoneOffsetAtBirth: synastryResolvedLocation.timezoneOffsetAtBirth,
          sexAtBirth: newPartnerForm.sexAtBirth,
        },
      })

      await onPartnersChanged()
      setIsAddingNewPartner(false)

      if (andReturn && safeReturnTo) {
        router.push(safeReturnTo)
        return
      }
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : t("account.compatibility.saveFailed"))
    } finally {
      setIsSavingPartner(false)
    }
  }

  async function handleSaveAndReturn() {
    if (isAddingNewPartner || !hasSavedPartners) {
      await saveNewPartner(true)
      return
    }

    if (!selectedPartnerId) {
      setError(isRo ? "Selectează un partener." : "Select a partner.")
      return
    }

    if (safeReturnTo) {
      router.push(safeReturnTo)
    }
  }

  return (
    <section
      data-testid="account-compatibility-section"
      className="space-y-5 rounded-3xl border border-white/10 bg-[radial-gradient(120%_120%_at_100%_0%,rgba(214,107,255,0.18),rgba(10,10,20,0.94)_62%)] p-6 shadow-[0_0_70px_rgba(214,107,255,0.12)]"
    >
      <div>
        <h2 className="text-lg font-semibold text-foreground">{t("account.compatibility.title")}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{t("account.compatibility.subtitle")}</p>
      </div>

      <article className="rounded-2xl border border-white/10 bg-black/25 p-4">
        <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
          {t("account.compatibility.summaryLabel")}
        </p>
        {hasCompatibilityReading ? (
          <>
            <p className="mt-2 text-sm text-foreground">
              {t("account.compatibility.withPartner")} {compatibilityPartnerName}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {typeof divineOverview?.synastry.raw?.summary === "string"
                ? divineOverview.synastry.raw.summary
                : t("account.compatibility.readingReady")}
            </p>
          </>
        ) : (
          <>
            <p className="mt-2 text-sm text-foreground">{t("account.compatibility.emptySummary")}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("account.compatibility.emptySummaryHint")}
            </p>
          </>
        )}
      </article>

      <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
        <h3 className="text-base font-semibold text-foreground">
          {t("account.compatibility.generateTitle")}
        </h3>

        {hasSavedPartners && !isAddingNewPartner ? (
          <div className="mt-4 space-y-4">
            <label className="block text-sm text-muted-foreground">
              {t("account.compatibility.choosePartner")}
              <select
                data-testid="account-compatibility-partner-select"
                value={selectedPartnerId}
                onChange={(event) => setSelectedPartnerId(event.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-[rgba(255,255,255,0.04)] px-3 py-2 text-foreground"
              >
                <option value="">{t("account.compatibility.choosePartner")}</option>
                {partners.map((partner) => (
                  <option key={partner.id} value={partner.id}>
                    {partner.name || partner.birthPlace || partner.id}
                  </option>
                ))}
              </select>
            </label>

            {selectedSavedPartner && (
              <div className="rounded-xl border border-white/10 bg-black/25 p-4 text-sm text-muted-foreground">
                <p>
                  {t("account.compatibility.previewName")}{" "}
                  <span className="text-foreground">{selectedSavedPartner.name || "—"}</span>
                </p>
                <p className="mt-1">
                  {t("account.compatibility.previewBirthDate")}{" "}
                  <span className="text-foreground">{selectedSavedPartner.birthDate}</span>
                </p>
                <p className="mt-1">
                  {t("account.compatibility.previewBirthTime")}{" "}
                  <span className="text-foreground">{selectedSavedPartner.birthTime}</span>
                </p>
                <p className="mt-1">
                  {t("account.compatibility.previewBirthPlace")}{" "}
                  <span className="text-foreground">{selectedSavedPartner.birthPlace}</span>
                </p>
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                data-testid="account-compatibility-generate-saved"
                disabled={isSavedPartnerGenerateDisabled}
                onClick={() =>
                  void onRunSynastry({ mode: "saved", partnerId: selectedPartnerId })
                }
                className="rounded-lg bg-gradient-to-r from-[#6D4BFF] to-[#8B5CFF] px-4 py-2 text-sm font-semibold text-foreground disabled:opacity-60"
              >
                {isSynastryLoading
                  ? t("account.insights.processing")
                  : t("account.compatibility.generate")}
              </button>
              {safeReturnTo && (
                <button
                  type="button"
                  data-testid="account-compatibility-return-chat"
                  disabled={!selectedPartnerId || isSavingPartner}
                  onClick={() => void handleSaveAndReturn()}
                  className="rounded-lg border border-white/20 px-4 py-2 text-sm text-foreground disabled:opacity-60"
                >
                  {t("account.compatibility.continueInChat")}
                </button>
              )}
              <button
                type="button"
                data-testid="account-compatibility-add-new"
                onClick={() => {
                  setIsAddingNewPartner(true)
                  setError("")
                }}
                className="rounded-lg border border-white/20 px-4 py-2 text-sm text-foreground"
              >
                {t("account.compatibility.addNewPartner")}
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            {!hasSavedPartners && (
              <div className="rounded-xl border border-white/10 bg-black/25 p-4">
                <p className="text-sm font-medium text-foreground">
                  {t("account.compatibility.noSavedPartnersTitle")}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t("account.compatibility.noSavedPartnersSubtitle")}
                </p>
              </div>
            )}

            <label className="block text-sm text-muted-foreground">
              {t("account.compatibility.partnerName")}
              <input
                data-testid="account-compatibility-partner-name"
                value={newPartnerForm.name}
                onChange={(event) =>
                  setNewPartnerForm((prev) => ({ ...prev, name: event.target.value }))
                }
                className="mt-1 w-full rounded-lg border border-border bg-[rgba(255,255,255,0.04)] px-3 py-2 text-foreground"
              />
            </label>

            <BirthDateFields
              label={t("account.field.birthDate")}
              value={newPartnerForm.birthDate}
              onChange={(birthDate) => setNewPartnerForm((prev) => ({ ...prev, birthDate }))}
              testIdPrefix="account-compatibility-"
              wrapperTestId="account-compatibility-birthdate"
            />
            <BirthTimeFields
              label={t("account.field.birthTime")}
              value={newPartnerForm.birthTime}
              onChange={(birthTime) => setNewPartnerForm((prev) => ({ ...prev, birthTime }))}
              testIdPrefix="account-compatibility-"
              wrapperTestId="account-compatibility-birthtime"
            />
            <BirthPlaceAutocomplete
              label={t("account.field.birthPlace")}
              placeholder={isRo ? "Oraș, județ sau țară" : "City, State or Country"}
              value={newPartnerForm.birthPlace}
              birthDate={newPartnerForm.birthDate}
              birthTime={newPartnerForm.birthTime}
              required
              onValueChange={(birthPlace) =>
                setNewPartnerForm((prev) => ({ ...prev, birthPlace }))
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

            <label className="block text-sm text-muted-foreground">
              {t("account.field.sexAtBirth")}
              <select
                data-testid="account-compatibility-sex"
                value={newPartnerForm.sexAtBirth}
                onChange={(event) =>
                  setNewPartnerForm((prev) => ({
                    ...prev,
                    sexAtBirth: event.target.value as SexAtBirth | "",
                  }))
                }
                className="mt-1 w-full rounded-lg border border-border bg-[rgba(255,255,255,0.04)] px-3 py-2 text-foreground"
              >
                <option value="">{isRo ? "Selectează" : "Select"}</option>
                <option value="male">{t("account.field.male")}</option>
                <option value="female">{t("account.field.female")}</option>
              </select>
            </label>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                data-testid="account-compatibility-save-generate"
                disabled={isNewPartnerGenerateDisabled || isSavingPartner}
                onClick={() => {
                  if (!synastryResolvedLocation || !newPartnerForm.sexAtBirth) return
                  void onRunSynastry({
                    mode: "new",
                    name: newPartnerForm.name,
                    birthDate: newPartnerForm.birthDate,
                    birthTime: newPartnerForm.birthTime,
                    birthPlace: synastryResolvedLocation.birthPlace,
                    sexAtBirth: newPartnerForm.sexAtBirth,
                    resolvedLocation: synastryResolvedLocation,
                    savePartner: newPartnerForm.savePartner,
                  })
                }}
                className="rounded-lg bg-gradient-to-r from-[#6D4BFF] to-[#8B5CFF] px-4 py-2 text-sm font-semibold text-foreground disabled:opacity-60"
              >
                {isSynastryLoading || isSavingPartner
                  ? t("account.insights.processing")
                  : t("account.compatibility.saveAndGenerate")}
              </button>
              {safeReturnTo && (
                <button
                  type="button"
                  data-testid="account-compatibility-save-return"
                  disabled={isNewPartnerGenerateDisabled || isSavingPartner}
                  onClick={() => void saveNewPartner(true)}
                  className="rounded-lg border border-white/20 px-4 py-2 text-sm text-foreground disabled:opacity-60"
                >
                  {isSavingPartner
                    ? t("account.insights.processing")
                    : t("account.compatibility.saveAndContinue")}
                </button>
              )}
              {hasSavedPartners && (
                <button
                  type="button"
                  data-testid="account-compatibility-cancel-new"
                  onClick={() => {
                    setIsAddingNewPartner(false)
                    setError("")
                  }}
                  className="rounded-lg border border-white/20 px-4 py-2 text-sm text-foreground"
                >
                  {t("account.compatibility.cancel")}
                </button>
              )}
            </div>
          </div>
        )}

        {error && (
          <p data-testid="account-compatibility-error" className="mt-4 text-sm text-red-300">
            {error}
          </p>
        )}
      </div>
    </section>
  )
}
