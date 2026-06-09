/**
 * Seeded E2E accounts. These mirror `scripts/e2e/data.mjs` (the single source of
 * truth for what `npm run e2e:seed` writes into the emulator). Keep them in sync.
 *
 * - `fresh`: authenticated but has no cosmic profile yet -> lands on onboarding.
 * - `existing`: full profile + one seeded conversation/reading -> lands on chat.
 */
export interface E2EUser {
  uid: string
  email: string
  password: string
  displayName: string
}

const TEST_PASSWORD = "AstroE2E!234"

export const E2E_USERS = {
  fresh: {
    uid: "e2e-fresh-user",
    email: "fresh.e2e@astroai.local",
    password: TEST_PASSWORD,
    displayName: "Fresh E2E User",
  },
  existing: {
    uid: "e2e-existing-user",
    email: "existing.e2e@astroai.local",
    password: TEST_PASSWORD,
    displayName: "Existing E2E User",
  },
} satisfies Record<string, E2EUser>

export type E2EUserKey = keyof typeof E2E_USERS
