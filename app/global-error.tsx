"use client"

import { useEffect } from "react"
import * as Sentry from "@sentry/nextjs"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html lang="en">
      <body className="min-h-dvh bg-[#070311] text-white antialiased">
        <main className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center px-6 text-center">
          <p className="text-sm uppercase tracking-[0.2em] text-violet-300/80">AstroAI 24/7</p>
          <h1 className="mt-4 text-2xl font-semibold">Something went wrong</h1>
          <p className="mt-3 text-sm text-white/70">
            An unexpected error occurred. You can try again or return to the homepage.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => reset()}
              className="rounded-lg bg-[rgba(109,75,255,0.85)] px-5 py-2.5 text-sm font-medium text-white hover:bg-[rgba(109,75,255,1)]"
            >
              Try again
            </button>
            <a
              href="/"
              className="rounded-lg border border-white/10 px-5 py-2.5 text-sm text-white hover:bg-white/5"
            >
              Go home
            </a>
          </div>
        </main>
      </body>
    </html>
  )
}
