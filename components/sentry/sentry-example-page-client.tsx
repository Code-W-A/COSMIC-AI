"use client"

import { useState } from "react"
import * as Sentry from "@sentry/nextjs"

interface SentryExamplePageClientProps {
  apiExamplePath: string
}

export function SentryExamplePageClient({ apiExamplePath }: SentryExamplePageClientProps) {
  const [status, setStatus] = useState<string>("")

  function triggerClientError() {
    setStatus("Sending client error to Sentry...")
    Sentry.captureException(new Error("Sentry example client error"))
    setStatus("Client error sent. Check Sentry Issues in a few seconds.")
  }

  function triggerUndefinedFunctionError() {
    setStatus("Sending undefined function error to Sentry...")
    // @ts-expect-error intentional Sentry verification error
    myUndefinedFunction()
  }

  async function triggerServerError() {
    setStatus("Calling server example route...")
    try {
      const response = await fetch(apiExamplePath)
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        setStatus(
          payload && typeof payload === "object" && "message" in payload
            ? String(payload.message)
            : `Server route returned ${response.status}. Check Sentry Issues.`
        )
        return
      }
      setStatus("Unexpected success from server example route.")
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Server example request failed.")
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center gap-6 px-6 py-12">
      <div>
        <p className="text-sm uppercase tracking-[0.2em] text-violet-300/80">Internal only</p>
        <h1 className="mt-3 text-2xl font-semibold text-white">Sentry example page</h1>
        <p className="mt-3 text-sm text-white/70">
          Hidden verification page. Use the buttons below, then confirm the issue appears in
          Sentry.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <button
          type="button"
          data-testid="sentry-example-client-error"
          onClick={triggerClientError}
          className="rounded-lg bg-[rgba(109,75,255,0.85)] px-5 py-2.5 text-sm font-medium text-white hover:bg-[rgba(109,75,255,1)]"
        >
          Trigger client error
        </button>
        <button
          type="button"
          data-testid="sentry-example-undefined-function"
          onClick={triggerUndefinedFunctionError}
          className="rounded-lg border border-white/10 px-5 py-2.5 text-sm text-white hover:bg-white/5"
        >
          Call myUndefinedFunction()
        </button>
        <button
          type="button"
          data-testid="sentry-example-server-error"
          onClick={() => void triggerServerError()}
          className="rounded-lg border border-white/10 px-5 py-2.5 text-sm text-white hover:bg-white/5"
        >
          Trigger server error
        </button>
      </div>

      {status ? (
        <p data-testid="sentry-example-status" className="text-sm text-violet-200">
          {status}
        </p>
      ) : null}
    </main>
  )
}
