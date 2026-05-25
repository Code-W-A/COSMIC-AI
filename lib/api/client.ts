"use client"

import { onAuthStateChanged } from "firebase/auth"
import type { User } from "firebase/auth"

import { getFirebaseAuth, hasFirebaseClientConfig } from "@/lib/firebase/client"
import { localizeApiErrorMessage } from "@/lib/i18n/api-errors"
import { resolveClientLocale } from "@/lib/i18n/client"
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/locale"

export class ApiClientError extends Error {
  code: string
  status: number
  payload: unknown

  constructor(code: string, message: string, status: number, payload?: unknown) {
    super(message)
    this.name = "ApiClientError"
    this.code = code
    this.status = status
    this.payload = payload
  }
}

export async function getFirebaseIdToken() {
  if (!hasFirebaseClientConfig()) return null

  const auth = getFirebaseAuth()
  const user = auth.currentUser ?? (await waitForFirebaseUser())

  if (!user) return null

  return user.getIdToken()
}

function waitForFirebaseUser(timeoutMs = 2500): Promise<User | null> {
  const auth = getFirebaseAuth()
  if (auth.currentUser) return Promise.resolve(auth.currentUser)

  return new Promise<User | null>((resolve) => {
    let settled = false
    let unsubscribe = () => {}
    const timeout = window.setTimeout(() => {
      if (settled) return
      settled = true
      unsubscribe()
      resolve(auth.currentUser)
    }, timeoutMs)

    unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      if (settled) return
      settled = true
      window.clearTimeout(timeout)
      unsubscribe()
      resolve(nextUser)
    })
  })
}

type ApiFetchOptions = Omit<RequestInit, "body"> & {
  body?: BodyInit | Record<string, unknown>
}

function isJsonBody(body: ApiFetchOptions["body"]) {
  return (
    body &&
    typeof body === "object" &&
    !(body instanceof FormData) &&
    !(body instanceof Blob) &&
    !(body instanceof ArrayBuffer) &&
    !(body instanceof URLSearchParams)
  )
}

export async function apiFetch<TResponse = unknown>(
  path: string,
  options: ApiFetchOptions = {}
) {
  const locale: Locale =
    typeof window !== "undefined" ? resolveClientLocale(window.location.pathname) : DEFAULT_LOCALE
  const headers = new Headers(options.headers)
  const token = await getFirebaseIdToken()
  const body = options.body
  const requestBody: BodyInit | undefined = isJsonBody(body)
    ? JSON.stringify(body)
    : (body as BodyInit | undefined)

  if (token) {
    headers.set("Authorization", `Bearer ${token}`)
  }

  headers.set("x-locale", locale)

  if (isJsonBody(body)) {
    headers.set("Content-Type", "application/json")
  }

  const response = await fetch(path, {
    ...options,
    headers,
    body: requestBody,
  })

  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    const fallbackCode =
      typeof payload?.code === "string" ? payload.code : "request_failed"
    const fallbackMessage =
      typeof payload?.message === "string"
        ? payload.message
        : "Request failed."
    const code = payload?.error?.code ?? fallbackCode

    throw new ApiClientError(
      code,
      localizeApiErrorMessage(code, locale, payload?.error?.message ?? fallbackMessage),
      response.status,
      payload
    )
  }

  return payload as TResponse
}
