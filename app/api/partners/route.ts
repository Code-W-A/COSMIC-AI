import { FieldValue, Timestamp } from "firebase-admin/firestore"

import { parsePartnerBirthDetails } from "@/lib/agents/context"
import { errorResponse, getErrorMessage, successResponse } from "@/lib/api/responses"
import { isAuthResponse, requireUser } from "@/lib/auth/requireUser"
import { getPartnersCollection, getPartnerRef } from "@/lib/firebase/firestore"
import { toFirestoreData } from "@/lib/firebase/sanitize"
import { logError, logInfo } from "@/lib/logging/logger"
import {
  buildBirthLocationPatch,
  getResolvedBirthLocationFromSource,
} from "@/lib/location/profile-location"
import { LocationResolverError, resolveBirthLocation } from "@/lib/location/resolver"
import { getPartnerInputCompleteness } from "@/lib/profile/input-policy"
import { getRequestLocale } from "@/lib/i18n/request-locale"
import type { PartnerDocument } from "@/types/user"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function getTrimmedString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null
}

function toDateIso(value: unknown) {
  if (value instanceof Timestamp) return value.toDate().toISOString()
  return null
}

export async function GET(request: Request) {
  const user = await requireUser(request)
  if (isAuthResponse(user)) return user

  try {
    const snapshot = await getPartnersCollection(user.uid)
      .orderBy("updatedAt", "desc")
      .limit(50)
      .get()

    const partners = snapshot.docs.map((doc) => {
      const data = doc.data() as Partial<PartnerDocument>
      return {
        id: doc.id,
        name: typeof data.name === "string" ? data.name : "",
        birthDate: data.birthDate ?? "",
        birthTime: data.birthTime ?? "",
        birthPlace: data.birthPlace ?? "",
        sexAtBirth: data.sexAtBirth ?? "male",
        natalSummary: data.natalSummary ?? null,
        updatedAt: toDateIso(data.updatedAt),
      }
    })

    return successResponse({ partners })
  } catch (error) {
    await logError("partners", "partners_list_failed", { uid: user.uid, error })
    return errorResponse(
      "partners_list_failed",
      process.env.NODE_ENV === "production"
        ? "Unable to load partners."
        : getErrorMessage(error),
      500
    )
  }
}

export async function POST(request: Request) {
  const locale = getRequestLocale(request)
  const user = await requireUser(request)
  if (isAuthResponse(user)) return user

  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return errorResponse("invalid_json", "Request body must be valid JSON.", 400)
  }

  const partnerId =
    typeof body.partnerId === "string" && body.partnerId.trim() ? body.partnerId.trim() : null
  const name = getTrimmedString(body.name)
  const partnerInput = {
    birthDate: getTrimmedString(body.birthDate) ?? undefined,
    birthTime: getTrimmedString(body.birthTime) ?? undefined,
    birthPlace: getTrimmedString(body.birthPlace) ?? undefined,
    sexAtBirth: getTrimmedString(body.sexAtBirth) ?? undefined,
    name: name ?? undefined,
  }

  const completeness = getPartnerInputCompleteness(partnerInput, "astrology_compatibility")
  if (!completeness.isComplete) {
    return errorResponse(
      "compatibility_partner_incomplete",
      "Partner birth date, birth time, birth place, and sex at birth are required.",
      400
    )
  }

  const partner = parsePartnerBirthDetails(partnerInput)
  if (!partner) {
    return errorResponse(
      "compatibility_partner_incomplete",
      "Partner birth date, birth time, birth place, and sex at birth are required.",
      400
    )
  }

  try {
    const resolvedLocation =
      getResolvedBirthLocationFromSource(body) ??
      (await resolveBirthLocation({
        placeId:
          typeof body.birthPlacePlaceId === "string" ? body.birthPlacePlaceId : undefined,
        birthPlace: partner.birthPlace,
        birthDate: partner.birthDate,
        birthTime: partner.birthTime,
        locale,
        uid: user.uid,
        source: "api.partners.save",
      }))

    const partnerRef = getPartnerRef(user.uid, partnerId ?? undefined)
    await partnerRef.set(
      toFirestoreData({
        ...partner,
        ...buildBirthLocationPatch(resolvedLocation),
        name: name || null,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      }),
      { merge: true }
    )

    await logInfo("partners", "partner_saved", {
      uid: user.uid,
      partnerId: partnerRef.id,
      hasName: Boolean(name),
    })

    return successResponse({
      partnerId: partnerRef.id,
    })
  } catch (error) {
    await logError("partners", "partner_save_failed", { uid: user.uid, error })

    if (error instanceof LocationResolverError) {
      return errorResponse(
        error.code,
        error.message,
        error.code === "birth_location_unresolved" ? 400 : 502
      )
    }

    return errorResponse(
      "partner_save_failed",
      process.env.NODE_ENV === "production"
        ? "Unable to save partner."
        : getErrorMessage(error),
      500
    )
  }
}
