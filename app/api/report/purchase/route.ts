import { FieldValue } from "firebase-admin/firestore"

import { errorResponse, getErrorMessage, successResponse } from "@/lib/api/responses"
import { isAuthResponse, requireUser } from "@/lib/auth/requireUser"
import { getReportPurchasesCollection } from "@/lib/firebase/firestore"
import { logError, logInfo } from "@/lib/logging/logger"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const user = await requireUser(request)

  if (isAuthResponse(user)) return user

  try {
    const collection = getReportPurchasesCollection(user.uid)
    const paidSnapshot = await collection.where("status", "==", "paid").limit(1).get()

    const consumedSnapshot = await collection.where("status", "==", "consumed").limit(1).get()

    const paidDoc = paidSnapshot.docs[0]
    const consumedDoc = consumedSnapshot.docs[0]

    return successResponse({
      data: {
        hasPaidPurchase: Boolean(paidDoc),
        canGenerate: Boolean(paidDoc),
        nextPurchaseId: paidDoc?.id ?? null,
        latestConsumedPurchaseId: consumedDoc?.id ?? null,
      },
    })
  } catch (error) {
    await logError("report.purchase", "report_purchase_status_failed", {
      uid: user.uid,
      error,
    })

    return errorResponse(
      "report_purchase_status_failed",
      process.env.NODE_ENV === "production"
        ? "Unable to check report purchase status."
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

  if (body.action !== "consume") {
    return errorResponse("invalid_action", "Only consume action is supported.", 400)
  }

  try {
    const collection = getReportPurchasesCollection(user.uid)
    const paidSnapshot = await collection.where("status", "==", "paid").limit(1).get()

    const paidDoc = paidSnapshot.docs[0]

    if (!paidDoc) {
      return errorResponse(
        "report_purchase_required",
        "You need to purchase a report before generating one.",
        403
      )
    }

    await paidDoc.ref.set(
      {
        status: "consumed",
        consumedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    )

    await logInfo("report.purchase", "report_purchase_consumed", {
      uid: user.uid,
      purchaseId: paidDoc.id,
    })

    return successResponse({
      data: {
        consumed: true,
        purchaseId: paidDoc.id,
      },
    })
  } catch (error) {
    await logError("report.purchase", "report_purchase_consume_failed", {
      uid: user.uid,
      error,
    })

    return errorResponse(
      "report_purchase_consume_failed",
      process.env.NODE_ENV === "production"
        ? "Unable to consume report purchase."
        : getErrorMessage(error),
      500
    )
  }
}
