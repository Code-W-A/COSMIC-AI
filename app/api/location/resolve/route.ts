import { errorResponse, getErrorMessage, successResponse } from "@/lib/api/responses"
import { isAuthResponse, requireUser } from "@/lib/auth/requireUser"
import { getRequestLocale } from "@/lib/i18n/request-locale"
import { LocationResolverError, resolveBirthLocation } from "@/lib/location/resolver"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function getTrimmedString(value: unknown) {
  return typeof value === "string" ? value.trim() : null
}

export async function POST(request: Request) {
  const user = await requireUser(request)
  if (isAuthResponse(user)) return user

  const locale = getRequestLocale(request)
  let body: Record<string, unknown>

  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return errorResponse("invalid_json", "Request body must be valid JSON.", 400)
  }

  const placeId = getTrimmedString(body.placeId)
  const birthPlace = getTrimmedString(body.birthPlace)
  const birthDate = getTrimmedString(body.birthDate)
  const birthTime = getTrimmedString(body.birthTime)

  if ((!placeId && !birthPlace) || !birthDate || !birthTime) {
    return errorResponse(
      "birth_location_unresolved",
      "Place, birth date, and birth time are required to resolve location.",
      400
    )
  }

  try {
    const resolved = await resolveBirthLocation({
      placeId: placeId ?? undefined,
      birthPlace: birthPlace ?? undefined,
      birthDate,
      birthTime,
      locale,
      uid: user.uid,
      source: "api.location.resolve",
    })

    return successResponse({
      location: resolved,
    })
  } catch (error) {
    if (error instanceof LocationResolverError) {
      const status =
        error.code === "birth_location_unresolved"
          ? 400
          : error.code === "location_resolve_failed"
            ? 502
            : 500
      return errorResponse(error.code, error.message, status)
    }

    return errorResponse(
      "location_resolve_failed",
      process.env.NODE_ENV === "production"
        ? "Unable to resolve birth location."
        : getErrorMessage(error),
      500
    )
  }
}

