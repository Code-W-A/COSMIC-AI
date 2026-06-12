"use client"

type ClientLogMetadata = Record<string, unknown>

export function logClientEvent(
  scope: string,
  message: string,
  metadata?: ClientLogMetadata
) {
  if (process.env.NODE_ENV === "production") return

  const payload = {
    scope,
    message,
    metadata: metadata ?? {},
    at: new Date().toISOString(),
  }

  console.info("[client-log]", JSON.stringify(payload))

  void fetch("/api/debug/client-log", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => {
    // Best-effort debug logging only.
  })
}
