import { errorResponse, successResponse } from "@/lib/api/responses"
import { logInfo } from "@/lib/logging/logger"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return errorResponse("not_found", "Not found.", 404)
  }

  try {
    const body = (await request.json()) as {
      scope?: unknown
      message?: unknown
      metadata?: unknown
    }

    const scope = typeof body.scope === "string" ? body.scope : "client"
    const message = typeof body.message === "string" ? body.message : "client_event"
    const metadata =
      body.metadata && typeof body.metadata === "object" && !Array.isArray(body.metadata)
        ? (body.metadata as Record<string, unknown>)
        : {}

    const uid = typeof metadata.uid === "string" ? metadata.uid : undefined

    await logInfo(scope, message, {
      ...(uid ? { uid } : {}),
      source: "client",
      ...metadata,
    })

    return successResponse()
  } catch {
    return errorResponse("invalid_json", "Request body must be valid JSON.", 400)
  }
}
