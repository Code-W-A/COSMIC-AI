import { errorResponse, getErrorMessage, successResponse } from "@/lib/api/responses"
import { isAuthResponse } from "@/lib/auth/requireUser"
import { requireAdmin } from "@/lib/auth/requireAdmin"
import { logError, logInfo } from "@/lib/logging/logger"
import { getAdminAuth } from "@/lib/firebase/admin"
import { normalizeReferralCode } from "@/lib/partners/codes"
import {
  getConversionCountsByPartner,
  listConversionsForPartner,
  listPartners,
  upsertPartner,
} from "@/lib/partners/store"
import { grantComplimentaryPremiumForUid } from "@/lib/partners/attribution"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const admin = await requireAdmin(request)
  if (isAuthResponse(admin)) return admin

  try {
    const url = new URL(request.url)
    const code = normalizeReferralCode(url.searchParams.get("code"))
    const partners = await listPartners()
    const counts = await getConversionCountsByPartner()

    const appUrl = (process.env.NEXT_PUBLIC_APP_URL?.trim() || "https://www.astro-ai.ro").replace(/\/$/, "")
    const summaries = partners.map((partner) => ({
      code: partner.code,
      name: partner.name,
      email: partner.email,
      uid: partner.uid ?? null,
      status: partner.status,
      grantPremium: partner.grantPremium,
      commissionPercent: partner.commissionPercent,
      discountPercent: partner.discountPercent,
      sharePath: `/r/${partner.code}`,
      shareUrl: `${appUrl}/r/${partner.code}`,
      signupCount: counts[partner.code]?.signupCount ?? 0,
      paidCount: counts[partner.code]?.paidCount ?? 0,
      paidAmountTotal: counts[partner.code]?.paidAmountTotal ?? 0,
    }))

    const conversions = code ? await listConversionsForPartner(code) : []

    return successResponse({
      partners: summaries,
      conversions,
    })
  } catch (error) {
    await logError("partners", "admin_partners_list_failed", {
      uid: admin.uid,
      error,
    })
    return errorResponse(
      "admin_partners_list_failed",
      process.env.NODE_ENV === "production"
        ? "Unable to load partners."
        : getErrorMessage(error),
      500
    )
  }
}

export async function POST(request: Request) {
  const admin = await requireAdmin(request)
  if (isAuthResponse(admin)) return admin

  try {
    const body = (await request.json()) as Record<string, unknown>
    let uid = typeof body.uid === "string" ? body.uid.trim() : ""
    const email = typeof body.email === "string" ? body.email : ""

    if (!uid && email) {
      try {
        uid = (await getAdminAuth().getUserByEmail(email)).uid
      } catch {
        uid = ""
      }
    }

    const partner = await upsertPartner({
      code: typeof body.code === "string" ? body.code : "",
      name: typeof body.name === "string" ? body.name : "",
      email,
      uid: uid || null,
      grantPremium: body.grantPremium !== false,
      commissionPercent:
        typeof body.commissionPercent === "number" ? body.commissionPercent : 20,
      discountPercent: typeof body.discountPercent === "number" ? body.discountPercent : 20,
      status: body.status === "paused" ? "paused" : "active",
    })

    if (partner.grantPremium && uid) {
      await grantComplimentaryPremiumForUid({
        uid,
        partnerCode: partner.code,
      })
    }

    await logInfo("partners", "admin_partner_upserted", {
      uid: admin.uid,
      partnerCode: partner.code,
    })

    return successResponse({ partner }, 201)
  } catch (error) {
    await logError("partners", "admin_partner_upsert_failed", {
      uid: admin.uid,
      error,
    })
    return errorResponse(
      "admin_partner_upsert_failed",
      process.env.NODE_ENV === "production"
        ? "Unable to save partner."
        : getErrorMessage(error),
      400
    )
  }
}
