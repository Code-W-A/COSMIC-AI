import type { FullConfig } from "@playwright/test"

import { loadE2EEnv } from "./env"

async function assertEmulatorReachable(host: string, label: string) {
  const url = `http://${host}/`
  try {
    await fetch(url)
  } catch (error) {
    throw new Error(
      `Could not reach the Firebase ${label} emulator at ${host}.\n` +
        `Start the emulators in a separate terminal first:\n\n  npm run emulators\n\n` +
        `Original error: ${(error as Error).message}`
    )
  }
}

async function globalSetup(_config: FullConfig) {
  loadE2EEnv()

  await assertEmulatorReachable(
    process.env.FIRESTORE_EMULATOR_HOST ?? "127.0.0.1:8080",
    "Firestore"
  )
  await assertEmulatorReachable(
    process.env.FIREBASE_AUTH_EMULATOR_HOST ?? "127.0.0.1:9099",
    "Auth"
  )

  // Imported lazily so env vars are in place before firebase-admin initializes.
  const { resetAndSeed } = await import("../scripts/e2e/data.mjs")
  await resetAndSeed()

  // eslint-disable-next-line no-console
  console.log("[e2e] Emulator reset + seed complete.")
}

export default globalSetup
