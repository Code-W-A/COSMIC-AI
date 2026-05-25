import "server-only"

import { getDivineApiConfig } from "@/lib/divineapi/config"
import { logError, logInfo } from "@/lib/logging/logger"

export type DivineProduct = "horoscope" | "western"

export class DivineApiHttpError extends Error {
  status: number
  product: DivineProduct
  path: string
  divineSuccess?: unknown
  divineMessage?: unknown

  constructor(
    message: string,
    status: number,
    product: DivineProduct,
    path: string,
    options?: {
      divineSuccess?: unknown
      divineMessage?: unknown
    }
  ) {
    super(message)
    this.name = "DivineApiHttpError"
    this.status = status
    this.product = product
    this.path = path
    this.divineSuccess = options?.divineSuccess
    this.divineMessage = options?.divineMessage
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value))
}

function buildUrl(baseUrl: string, path: string) {
  return `${baseUrl.replace(/\/$/, "")}/${path.replace(/^\//, "")}`
}

function shouldTreatAsFailure(payload: unknown) {
  if (!isRecord(payload)) return false
  const success = payload.success
  if (success === 1 || success === true) return false
  if (typeof success === "number") return success !== 1
  if (typeof success === "boolean") return success !== true
  return false
}

function summarizeBody(body: Record<string, unknown>) {
  const keys = Object.keys(body).slice(0, 30)
  return {
    keys,
    hasCoordinates:
      (typeof body.lat === "number" && typeof body.lon === "number") ||
      keys.some((key) => key.includes("_lat") || key.includes("_lon")),
    hasTimezone: "tzone" in body || keys.some((key) => key.endsWith("_tzone")),
    hasLanguage: "lan" in body || keys.some((key) => key.endsWith("_lan")),
  }
}

export async function divinePost<T>({
  product,
  path,
  body,
  includeApiKeyInBody = true,
  baseUrlOverride,
}: {
  product: DivineProduct
  path: string
  body: Record<string, unknown>
  includeApiKeyInBody?: boolean
  baseUrlOverride?: string
}): Promise<T> {
  const config = getDivineApiConfig()
  const baseUrl =
    baseUrlOverride ??
    (product === "horoscope" ? config.HOROSCOPE_BASE_URL : config.WESTERN_BASE_URL)
  const url = buildUrl(baseUrl, path)
  const requestBody = {
    ...body,
    ...((config.DIVINE_API_AUTH_MODE === "body_api_key" || includeApiKeyInBody)
      ? { api_key: config.DIVINE_API_KEY }
      : {}),
  }
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  }

  if (config.DIVINE_API_AUTH_MODE === "bearer") {
    const token = config.DIVINE_API_AUTH_TOKEN || config.DIVINE_API_KEY
    headers.Authorization = `Bearer ${token}`
  }

  await logInfo("divineapi", "divineapi_request_started", {
    product,
    path,
    baseUrl,
    authMode: config.DIVINE_API_AUTH_MODE,
    hasAuthToken: Boolean(config.DIVINE_API_AUTH_TOKEN || config.DIVINE_API_KEY),
    bodySummary: summarizeBody(body),
  })

  try {
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(requestBody),
    })
    const responseText = await response.text()
    const contentType = response.headers.get("content-type") ?? ""
    let payload: unknown = null

    if (responseText) {
      try {
        payload = JSON.parse(responseText)
      } catch (parseError) {
        await logError("divineapi", "divineapi_response_parse_failed", {
          product,
          path,
          status: response.status,
          contentType,
          responsePreview: responseText.slice(0, 240),
          error: parseError,
        })
        throw new DivineApiHttpError(
          process.env.NODE_ENV === "production"
            ? "DivineAPI returned invalid response format."
            : `DivineAPI returned non-JSON response (status ${response.status}, content-type: ${contentType || "unknown"}).`,
          response.status,
          product,
          path
        )
      }
    }

    if (!response.ok || shouldTreatAsFailure(payload)) {
      const divineSuccess = isRecord(payload) ? payload.success : undefined
      const divineMessage = isRecord(payload) ? payload.msg : undefined
      await logError("divineapi", "divineapi_request_failed", {
        product,
        path,
        baseUrl,
        authMode: config.DIVINE_API_AUTH_MODE,
        status: response.status,
        contentType,
        divineSuccess,
        divineMessage,
        ...(isRecord(payload) && "success" in payload
          ? { divineSuccess: payload.success }
          : {}),
      })
      throw new DivineApiHttpError(
        "DivineAPI request failed.",
        response.status,
        product,
        path,
        { divineSuccess, divineMessage }
      )
    }

    await logInfo("divineapi", "divineapi_request_success", {
      product,
      path,
      baseUrl,
      status: response.status,
    })

    return payload as T
  } catch (error) {
    if (error instanceof DivineApiHttpError) {
      throw error
    }
    await logError("divineapi", "divineapi_request_failed", {
      product,
      path,
      baseUrl,
      authMode: config.DIVINE_API_AUTH_MODE,
      error,
    })
    throw new Error("Unable to fetch astrology data right now.")
  }
}
