import { errorResponse, getErrorMessage, successResponse } from "@/lib/api/responses"
import { isAuthResponse, requireUser } from "@/lib/auth/requireUser"
import { getRequestLocale } from "@/lib/i18n/request-locale"
import { getLocationAutocompleteSuggestions, LocationResolverError } from "@/lib/location/resolver"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const user = await requireUser(request)
  if (isAuthResponse(user)) return user

  const locale = getRequestLocale(request)
  const { searchParams } = new URL(request.url)
  const query = searchParams.get("q") ?? ""

  if (query.trim().length < 2) {
    return successResponse({ suggestions: [] })
  }

  try {
    const suggestions = await getLocationAutocompleteSuggestions({
      query,
      locale,
      uid: user.uid,
      source: "api.location.autocomplete",
    })
    return successResponse({ suggestions })
  } catch (error) {
    if (error instanceof LocationResolverError) {
      return errorResponse(error.code, error.message, 502)
    }

    return errorResponse(
      "location_autocomplete_failed",
      process.env.NODE_ENV === "production"
        ? "Unable to fetch location suggestions."
        : getErrorMessage(error),
      500
    )
  }
}

