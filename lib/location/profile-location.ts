import "server-only"

import { FieldValue } from "firebase-admin/firestore"

import { getCosmicProfileRef } from "@/lib/firebase/firestore"
import { resolveBirthLocation } from "@/lib/location/resolver"
import type { ResolvedBirthLocation } from "@/lib/location/types"
import type { Locale } from "@/lib/i18n/locale"
import type { CosmicProfileDocument, PartnerDocument } from "@/types/user"

type SourceWithLocationFields = {
  birthPlace?: unknown
  birthPlacePlaceId?: unknown
  latitude?: unknown
  longitude?: unknown
  timezoneIana?: unknown
  timezoneOffsetAtBirth?: unknown
  timezoneOffsetNow?: unknown
}

function getTrimmedString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null
}

function getFiniteNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

export function getResolvedBirthLocationFromSource(
  source: SourceWithLocationFields
): ResolvedBirthLocation | null {
  const placeId = getTrimmedString(source.birthPlacePlaceId)
  const birthPlace = getTrimmedString(source.birthPlace)
  const latitude = getFiniteNumber(source.latitude)
  const longitude = getFiniteNumber(source.longitude)
  const timezoneIana = getTrimmedString(source.timezoneIana)
  const timezoneOffsetAtBirth = getFiniteNumber(source.timezoneOffsetAtBirth)
  const timezoneOffsetNow = getFiniteNumber(source.timezoneOffsetNow)

  if (
    !placeId ||
    !birthPlace ||
    latitude === null ||
    longitude === null ||
    !timezoneIana ||
    timezoneOffsetAtBirth === null ||
    timezoneOffsetNow === null
  ) {
    return null
  }

  return {
    placeId,
    birthPlace,
    latitude,
    longitude,
    timezoneIana,
    timezoneOffsetAtBirth,
    timezoneOffsetNow,
  }
}

export function buildBirthLocationPatch(location: ResolvedBirthLocation) {
  return {
    birthPlace: location.birthPlace,
    birthPlacePlaceId: location.placeId,
    latitude: location.latitude,
    longitude: location.longitude,
    timezoneIana: location.timezoneIana,
    timezoneOffsetAtBirth: location.timezoneOffsetAtBirth,
    timezoneOffsetNow: location.timezoneOffsetNow,
  }
}

export function isBirthLocationResolved(source: SourceWithLocationFields) {
  return getResolvedBirthLocationFromSource(source) !== null
}

export function mergeBirthLocationIntoProfile(
  profile: CosmicProfileDocument,
  location: ResolvedBirthLocation
): CosmicProfileDocument {
  return {
    ...profile,
    birthPlace: location.birthPlace,
    birthPlacePlaceId: location.placeId,
    latitude: location.latitude,
    longitude: location.longitude,
    timezoneIana: location.timezoneIana,
    timezoneOffsetAtBirth: location.timezoneOffsetAtBirth,
    timezoneOffsetNow: location.timezoneOffsetNow,
  }
}

export function mergeBirthLocationIntoPartner(
  partner: PartnerDocument,
  location: ResolvedBirthLocation
): PartnerDocument {
  return {
    ...partner,
    birthPlace: location.birthPlace,
    birthPlacePlaceId: location.placeId,
    latitude: location.latitude,
    longitude: location.longitude,
    timezoneIana: location.timezoneIana,
    timezoneOffsetAtBirth: location.timezoneOffsetAtBirth,
    timezoneOffsetNow: location.timezoneOffsetNow,
  }
}

export async function ensureProfileBirthLocationForDivine({
  uid,
  profile,
  locale,
  source,
}: {
  uid: string
  profile: CosmicProfileDocument
  locale: Locale
  source: string
}): Promise<CosmicProfileDocument> {
  const existing = getResolvedBirthLocationFromSource(profile)
  if (existing) return profile

  const resolved = await resolveBirthLocation({
    placeId: getTrimmedString((profile as SourceWithLocationFields).birthPlacePlaceId) ?? undefined,
    birthPlace: profile.birthPlace,
    birthDate: profile.birthDate,
    birthTime: profile.birthTime,
    locale,
    uid,
    source,
  })

  await getCosmicProfileRef(uid).set(
    {
      ...buildBirthLocationPatch(resolved),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  )

  return mergeBirthLocationIntoProfile(profile, resolved)
}

