import { FieldValue } from "firebase-admin/firestore"

import { errorResponse, getErrorMessage, successResponse } from "@/lib/api/responses"
import { isAuthResponse, requireUser } from "@/lib/auth/requireUser"
import { getCosmicProfile, getCosmicProfileRef, getUserRef } from "@/lib/firebase/firestore"
import { logError, logInfo } from "@/lib/logging/logger"
import { isMainFocus } from "@/types/user"

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
  const birthTime = getTrimmedString(body.birthTime) ?? ""
  const birthPlace = getTrimmedString(body.birthPlace)
  const timezoneIanaRaw = getTrimmedString(body.timezoneIana)
  const timezoneOffsetNow = getOptionalNumber(body.timezoneOffsetNow)
  const timezoneOffsetAtBirth = getOptionalNumber(body.timezoneOffsetAtBirth)
  const mainFocus = body.mainFocus

  if (!name || !birthDate || !birthPlace || !isMainFocus(mainFocus)) {
    return null
  }

  const timezoneIana =
    timezoneIanaRaw && isValidIanaTimeZone(timezoneIanaRaw) ? timezoneIanaRaw : null

  return {
    name,
    birthDate,
    birthTime,
    birthPlace,
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
    return successResponse({ profile })
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
      "Name, birth date, birth place, and a valid main focus are required.",
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
