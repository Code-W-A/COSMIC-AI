import { successResponse } from "@/lib/api/responses"
import { getReferralCodeFromCookieHeader } from "@/lib/partners/codes"
import { getActivePartnerByCode } from "@/lib/partners/store"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const code = getReferralCodeFromCookieHeader(request.headers.get("cookie"))
  const partner = await getActivePartnerByCode(code)

  if (!partner) {
    return successResponse({ referral: null })
  }

  return successResponse({
    referral: {
      code: partner.code,
      name: partner.name,
      discountPercent: partner.discountPercent,
    },
  })
}
