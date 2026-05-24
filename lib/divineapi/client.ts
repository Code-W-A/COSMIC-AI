import "server-only"

import { getDivineApiConfig } from "@/lib/divineapi/config"
import { logError, logInfo } from "@/lib/logging/logger"

export type DivineProduct = "horoscope" | "western"

export class DivineApiHttpError extends Error {
  status: number
  product: DivineProduct
  path: string

  constructor(message: string, status: number, product: DivineProduct, path: string) {
    super(message)
    this.name = "DivineApiHttpError"
    this.status = status
    this.product = product
    this.path = path
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value))
}

function buildUrl(baseUrl: string, path: string) {
  return `${baseUrl.replace(/\/$/, "")}/${path.replace(/^\//, "")}`
}

function shouldTreatAsFailure(payload: unknown) {
  return isRecord(payload) && (payload.success === 0 || payload.success === false)
}

export async function divinePost<T>({
  product,
  path,
  body,
  includeApiKeyInBody = true,
}: {
  product: DivineProduct
  path: string
  body: Record<string, unknown>
  includeApiKeyInBody?: boolean
}): Promise<T> {
  const config = getDivineApiConfig()
  const baseUrl = product === "horoscope" ? config.HOROSCOPE_BASE_URL : config.WESTERN_BASE_URL
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
    headers.Authorization = `Bearer ${config.DIVINE_API_KEY}`
  }

  await logInfo("divineapi", "divineapi_request_started", { product, path })

  try {
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(requestBody),
    })
    const responseText = await response.text()
    const payload = responseText ? JSON.parse(responseText) : null

    if (!response.ok || shouldTreatAsFailure(payload)) {
      await logError("divineapi", "divineapi_request_failed", {
        product,
        path,
        status: response.status,
        ...(isRecord(payload) && "success" in payload
          ? { divineSuccess: payload.success }
          : {}),
      })
      throw new DivineApiHttpError(
        "DivineAPI request failed.",
        response.status,
        product,
        path
      )
    }

    await logInfo("divineapi", "divineapi_request_success", { product, path })

    return payload as T
  } catch (error) {
    if (error instanceof DivineApiHttpError) {
      throw error
    }
    await logError("divineapi", "divineapi_request_failed", {
      product,
      path,
      error,
    })
    throw new Error("Unable to fetch astrology data right now.")
  }
}
