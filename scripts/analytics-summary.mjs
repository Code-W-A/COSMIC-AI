import { existsSync, readFileSync } from "node:fs"
import { initializeApp, cert, getApps } from "firebase-admin/app"
import { getFirestore, Timestamp } from "firebase-admin/firestore"

const ANALYTICS_EVENTS = [
  "landing_view",
  "register_started",
  "register_completed",
  "onboarding_started",
  "onboarding_completed",
  "chat_message_sent",
  "free_limit_reached",
  "paywall_viewed",
  "checkout_started",
  "subscription_completed",
  "subscription_cancelled",
]

const FUNNEL = [
  "landing_view",
  "register_started",
  "register_completed",
  "onboarding_started",
  "onboarding_completed",
  "chat_message_sent",
  "free_limit_reached",
  "paywall_viewed",
  "checkout_started",
  "subscription_completed",
]

const ENV_FILE = ".env"

function loadDotEnv(path = ENV_FILE) {
  if (!existsSync(path)) return

  const content = readFileSync(path, "utf8")
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue

    const index = trimmed.indexOf("=")
    const key = trimmed.slice(0, index).trim()
    let value = trimmed.slice(index + 1).trim()

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }

    if (!process.env[key]) {
      process.env[key] = value.replace(/\\n/g, "\n")
    }
  }
}

function requiredEnv(name) {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`Missing required env: ${name}`)
  return value
}

function getDaysArg() {
  const daysArg = process.argv.find((arg) => arg.startsWith("--days="))
  if (!daysArg) return 7
  const parsed = Number.parseInt(daysArg.slice("--days=".length), 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 7
}

function getAdminDb() {
  if (getApps().length) {
    return getFirestore()
  }

  if (process.env.FIRESTORE_EMULATOR_HOST) {
    const projectId =
      process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "demo-cosmic-ai"
    initializeApp({ projectId })
    return getFirestore()
  }

  const privateKey = requiredEnv("FIREBASE_PRIVATE_KEY").replace(/\\n/g, "\n")

  initializeApp({
    credential: cert({
      projectId: requiredEnv("FIREBASE_PROJECT_ID"),
      clientEmail: requiredEnv("FIREBASE_CLIENT_EMAIL"),
      privateKey,
    }),
  })

  return getFirestore()
}

async function main() {
  loadDotEnv()
  const days = getDaysArg()
  const since = Timestamp.fromMillis(Date.now() - days * 24 * 60 * 60 * 1000)
  const db = getAdminDb()

  const snapshot = await db
    .collection("logs")
    .where("scope", "==", "analytics")
    .where("createdAt", ">=", since)
    .get()

  const counts = Object.fromEntries(ANALYTICS_EVENTS.map((event) => [event, 0]))

  for (const doc of snapshot.docs) {
    const message = doc.get("message")
    if (typeof message === "string" && message in counts) {
      counts[message] += 1
    }
  }

  console.log(`Analytics summary (last ${days} days, scope=analytics)`)
  console.log("—".repeat(48))

  for (const event of ANALYTICS_EVENTS) {
    console.log(`${event.padEnd(24)} ${String(counts[event]).padStart(6)}`)
  }

  console.log("—".repeat(48))
  console.log("Funnel (sequential counts, same window):")
  for (const event of FUNNEL) {
    console.log(`  ${event.padEnd(22)} ${counts[event]}`)
  }

  console.log("")
  console.log("Firestore console filter: scope == analytics")
  console.log("Run: node scripts/analytics-summary.mjs --days=14")
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
