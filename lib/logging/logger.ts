import "server-only"

import { FieldValue } from "firebase-admin/firestore"

import { getAdminDb } from "@/lib/firebase/admin"

type LogLevel = "info" | "warn" | "error"
type LogMetadata = Record<string, unknown> & { uid?: string }

const sensitiveKeyPattern = /(authorization|token|secret|private|password|card|payment|key)/i

function sanitizeValue(value: unknown): unknown {
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
    }
  }

  if (Array.isArray(value)) {
    return value
      .slice(0, 20)
      .map(sanitizeValue)
      .filter((entry) => entry !== undefined)
  }

  if (value && typeof value === "object") {
    return sanitizeMetadata(value as Record<string, unknown>)
  }

  return value
}

function sanitizeMetadata(metadata?: LogMetadata) {
  if (!metadata) return undefined

  const sanitized: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(metadata)) {
    if (key === "uid") continue
    if (sensitiveKeyPattern.test(key)) continue
    const sanitizedValue = sanitizeValue(value)

    if (sanitizedValue === undefined) continue

    sanitized[key] = sanitizedValue
  }

  return sanitized
}

async function writeLog(level: LogLevel, scope: string, message: string, metadata?: LogMetadata) {
  const uid = typeof metadata?.uid === "string" ? metadata.uid : undefined
  const sanitized = sanitizeMetadata(metadata)
  const consolePayload = {
    level,
    scope,
    message,
    uid,
    metadata: sanitized,
  }

  console[level === "error" ? "error" : level === "warn" ? "warn" : "log"](
    JSON.stringify(consolePayload)
  )

  try {
    const firestoreLog: Record<string, unknown> = {
      level,
      scope,
      message,
      metadata: sanitized ?? {},
      createdAt: FieldValue.serverTimestamp(),
    }

    if (uid) {
      firestoreLog.uid = uid
    }

    await getAdminDb().collection("logs").add(firestoreLog)
  } catch (error) {
    console.warn(
      JSON.stringify({
        level: "warn",
        scope: "logging",
        message: "firestore_log_failed",
        metadata: sanitizeValue(error),
      })
    )
  }
}

export function logInfo(scope: string, message: string, metadata?: LogMetadata) {
  return writeLog("info", scope, message, metadata)
}

export function logWarn(scope: string, message: string, metadata?: LogMetadata) {
  return writeLog("warn", scope, message, metadata)
}

export function logError(scope: string, message: string, metadata?: LogMetadata) {
  return writeLog("error", scope, message, metadata)
}
