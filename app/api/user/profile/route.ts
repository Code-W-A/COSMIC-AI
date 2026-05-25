import { FieldValue } from "firebase-admin/firestore"

import { errorResponse, getErrorMessage, successResponse } from "@/lib/api/responses"
import { isAuthResponse, requireUser } from "@/lib/auth/requireUser"
import { getCosmicProfile, getCosmicProfileRef, getUserRef } from "@/lib/firebase/firestore"
import { logError, logInfo } from "@/lib/logging/logger"
import { getResolvedBirthLocationFromSource } from "@/lib/location/profile-location"
import { isAstrologyProfileComplete } from "@/lib/profile/input-policy"
import { isMainFocus, isSexAtBirth } from "@/types/user"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function getTrimmedString(value: unknown) {
  return typeof value === "string" ? value.trim() : null
}

function getOptionalNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

function isValidIanaTimeZone(value: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value })
    return true
  } catch {
    return false
  }
}

function validateProfileBody(body: Record<string, unknown>) {
  const name = getTrimmedString(body.name)
  const birthDate = getTrimmedString(body.birthDate)
  const birthTime = getTrimmedString(body.birthTime)
  const birthPlace = getTrimmedString(body.birthPlace)
  const birthPlacePlaceId = getTrimmedString(body.birthPlacePlaceId)
  const sexAtBirth = getTrimmedString(body.sexAtBirth)
  const timezoneIanaRaw = getTrimmedString(body.timezoneIana)
  const latitude = getOptionalNumber(body.latitude)
  const longitude = getOptionalNumber(body.longitude)
  const timezoneOffsetNow = getOptionalNumber(body.timezoneOffsetNow)
  const timezoneOffsetAtBirth = getOptionalNumber(body.timezoneOffsetAtBirth)
  const mainFocus = body.mainFocus

  if (
    !name ||
    !birthDate ||
    !birthTime ||
    !birthPlace ||
    !sexAtBirth ||
    !isSexAtBirth(sexAtBirth) ||
    !isMainFocus(mainFocus)
  ) {
    return null
  }

  const timezoneIana =
    timezoneIanaRaw && isValidIanaTimeZone(timezoneIanaRaw) ? timezoneIanaRaw : null

  return {
    name,
    birthDate,
    birthTime,
    birthPlace,
    birthPlacePlaceId,
    sexAtBirth,
    latitude,
    longitude,
    timezoneIana,
    timezoneOffsetNow,
    timezoneOffsetAtBirth,
    mainFocus,
  }
}

export async function GET(request: Request) {
  const user = await requireUser(request)

  if (isAuthResponse(user)) return user

  try {
    const profile = await getCosmicProfile(user.uid)
    return successResponse({
      profile,
      profileComplete: isAstrologyProfileComplete(profile),
    })
  } catch (error) {
    await logError("profile", "profile_fetch_failed", { uid: user.uid, error })

    return errorResponse(
      "profile_fetch_failed",
      process.env.NODE_ENV === "production"
        ? "Unable to load your cosmic profile."
        : getErrorMessage(error),
      500
    )
  }
}

export async function POST(request: Request) {
  const user = await requireUser(request)

  if (isAuthResponse(user)) return user

  let body: Record<string, unknown>

  try {
    body = await request.json()
  } catch {
    return errorResponse("invalid_json", "Request body must be valid JSON.", 400)
  }

  const profile = validateProfileBody(body)

  if (!profile) {
    return errorResponse(
      "invalid_profile",
      "Name, birth date, birth time, birth place, sex at birth, and a valid main focus are required.",
      400
    )
  }

  if (!getResolvedBirthLocationFromSource(profile)) {
    return errorResponse(
      "birth_location_unresolved",
      "Birth location must be selected from suggestions and resolved before saving.",
      400
    )
  }

  try {
    const profileRef = getCosmicProfileRef(user.uid)
    const userRef = getUserRef(user.uid)
    const profileSnapshot = await profileRef.get()
    const batch = profileRef.firestore.batch()

    batch.set(
      profileRef,
      {
        ...profile,
        ...(profileSnapshot.exists ? {} : { createdAt: FieldValue.serverTimestamp() }),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    )

    batch.set(
      userRef,
      {
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    )

    await batch.commit()
    await logInfo("profile", "profile_saved", { uid: user.uid, mainFocus: profile.mainFocus })

    return successResponse()
  } catch (error) {
    await logError("profile", "profile_save_failed", { uid: user.uid, error })

    return errorResponse(
      "profile_save_failed",
      process.env.NODE_ENV === "production"
        ? "Unable to save your cosmic profile."
        : getErrorMessage(error),
      500
    )
  }
}
