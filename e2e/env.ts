import fs from "node:fs"
import path from "node:path"

/**
 * Default environment for the E2E run. Values are intentionally non-secret and
 * point the app at local Firebase emulators with all external providers mocked
 * (`E2E_MOCK_EXTERNALS=1`). The Firebase project id must stay `demo-*` because
 * both `lib/firebase/admin.ts` and `scripts/e2e/data.mjs` refuse to run the
 * emulator path otherwise.
 */
export const E2E_DEFAULTS: Record<string, string> = {
  NEXT_PUBLIC_APP_URL: "http://localhost:3000",

  FIREBASE_PROJECT_ID: "demo-astroai-e2e",
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: "demo-astroai-e2e",
  NEXT_PUBLIC_FIREBASE_API_KEY: "demo-api-key",
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "demo-astroai-e2e.firebaseapp.com",
  NEXT_PUBLIC_FIREBASE_APP_ID: "demo-app-id",
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: "demo-astroai-e2e.appspot.com",
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: "000000000000",

  E2E_MOCK_EXTERNALS: "1",
  E2E_USE_FIREBASE_EMULATORS: "1",
  NEXT_PUBLIC_E2E_USE_FIREBASE_EMULATORS: "1",

  FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:9099",
  FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080",
  NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:9099",
  NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080",
}

function parseDotEnv(contents: string): Record<string, string> {
  const result: Record<string, string> = {}
  for (const rawLine of contents.split("\n")) {
    const line = rawLine.trim()
    if (!line || line.startsWith("#")) continue
    const eq = line.indexOf("=")
    if (eq === -1) continue
    const key = line.slice(0, eq).trim()
    let value = line.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (key) result[key] = value
  }
  return result
}

/**
 * Builds the resolved E2E environment: hardcoded defaults, optionally overridden
 * by a local `.env.e2e` file (gitignored, never required).
 */
export function buildE2EEnv(): Record<string, string> {
  const env: Record<string, string> = { ...E2E_DEFAULTS }
  const filePath = path.resolve(process.cwd(), ".env.e2e")
  if (fs.existsSync(filePath)) {
    Object.assign(env, parseDotEnv(fs.readFileSync(filePath, "utf8")))
  }
  return env
}

/** Resolved environment passed to the Playwright web server. */
export const E2E_ENV = buildE2EEnv()

/**
 * Applies the E2E environment onto `process.env` without clobbering values that
 * are already set (so explicit overrides on the command line still win). Used by
 * the Playwright config and the global setup that seeds the emulator.
 */
export function loadE2EEnv(): Record<string, string> {
  for (const [key, value] of Object.entries(E2E_ENV)) {
    if (process.env[key] === undefined || process.env[key] === "") {
      process.env[key] = value
    }
  }
  return E2E_ENV
}
