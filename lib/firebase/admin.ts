import "server-only"

import { cert, getApps, initializeApp, type App } from "firebase-admin/app"
import { getAuth } from "firebase-admin/auth"
import { getFirestore } from "firebase-admin/firestore"

function requiredEnv(name: string) {
  const value = process.env[name]

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }

  return value
}

let app: App | null = null

function useFirebaseEmulators() {
  return (
    process.env.E2E_USE_FIREBASE_EMULATORS === "1" ||
    Boolean(process.env.FIRESTORE_EMULATOR_HOST) ||
    Boolean(process.env.FIREBASE_AUTH_EMULATOR_HOST)
  )
}

function resolveProjectIdForEmulator() {
  const projectId =
    process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || ""

  if (!projectId) {
    throw new Error(
      "Missing FIREBASE_PROJECT_ID for emulator mode. Set a demo project id (for example demo-astroai-e2e)."
    )
  }

  if (!projectId.startsWith("demo-")) {
    throw new Error(
      `Unsafe emulator project id "${projectId}". Emulator mode requires a demo-* project id.`
    )
  }

  return projectId
}

export function getAdminApp() {
  if (app) return app

  if (getApps().length) {
    app = getApps()[0]
    return app
  }

  if (useFirebaseEmulators()) {
    app = initializeApp({
      projectId: resolveProjectIdForEmulator(),
    })
    return app
  }

  const privateKey = requiredEnv("FIREBASE_PRIVATE_KEY").replace(/\\n/g, "\n")

  app = initializeApp({
    credential: cert({
      projectId: requiredEnv("FIREBASE_PROJECT_ID"),
      clientEmail: requiredEnv("FIREBASE_CLIENT_EMAIL"),
      privateKey,
    }),
  })

  return app
}

export function getAdminAuth() {
  return getAuth(getAdminApp())
}

export function getAdminDb() {
  return getFirestore(getAdminApp())
}

export const adminAuth = getAdminAuth
export const adminDb = getAdminDb
