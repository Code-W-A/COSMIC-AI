import { errorResponse, getErrorMessage, successResponse } from "@/lib/api/responses"
import { isAuthResponse } from "@/lib/auth/requireUser"
import { requireAdmin } from "@/lib/auth/requireAdmin"
import { logError } from "@/lib/logging/logger"
import { listAdminUsers, listPartners } from "@/lib/partners/store"
import { normalizeEmail } from "@/lib/partners/codes"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const admin = await requireAdmin(request)
  if (isAuthResponse(admin)) return admin

  try {
    const url = new URL(request.url)
    const query = url.searchParams.get("q") ?? ""
    const users = await listAdminUsers(query)
    const partners = await listPartners()
    const partnerByEmail = new Map(
      partners.map((partner) => [normalizeEmail(partner.email) ?? "", partner.code])
    )
    const partnerByUid = new Map(
      partners
        .filter((partner) => partner.uid)
        .map((partner) => [partner.uid as string, partner.code])
    )

    return successResponse({
      users: users.map((user) => {
        const partnerCode =
          partnerByUid.get(user.uid) ?? partnerByEmail.get(normalizeEmail(user.email) ?? "") ?? null
        return {
          ...user,
          alreadyPartner: Boolean(partnerCode),
          partnerCode,
        }
      }),
    })
  } catch (error) {
    await logError("partners", "admin_users_list_failed", {
      uid: admin.uid,
      error,
    })
    return errorResponse(
      "admin_users_list_failed",
      process.env.NODE_ENV === "production"
        ? "Unable to load accounts."
        : getErrorMessage(error),
      500
    )
  }
}
