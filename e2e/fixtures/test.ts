import { test as base, expect } from "@playwright/test"

import { E2E_USERS, type E2EUser, type E2EUserKey } from "./users"

export type Locale = "ro" | "en"

/** Builds a locale-prefixed app path, e.g. localizedPath("/chat", "ro") -> "/ro/chat". */
export function localizedPath(path: string, locale: Locale = "en"): string {
  const normalized = path.startsWith("/") ? path : `/${path}`
  if (normalized === "/") return `/${locale}`
  return `/${locale}${normalized}`
}

interface LoginOptions {
  locale?: Locale
}

interface Fixtures {
  /** Returns a locale-prefixed path (defaults to the `en` locale). */
  localized: (path: string, locale?: Locale) => string
  /**
   * Signs in through the real login form using a seeded account, then waits for
   * the post-auth redirect to leave the login page. Auth state lives in Firebase
   * (IndexedDB), so we log in per test rather than reusing storageState.
   */
  loginAs: (user: E2EUser | E2EUserKey, options?: LoginOptions) => Promise<void>
}

export const test = base.extend<Fixtures>({
  localized: async ({}, use) => {
    await use((path, locale: Locale = "en") => localizedPath(path, locale))
  },
  loginAs: async ({ page }, use) => {
    await use(async (user, options: LoginOptions = {}) => {
      const account = typeof user === "string" ? E2E_USERS[user] : user
      const locale = options.locale ?? "en"

      await page.goto(localizedPath("/login", locale))
      await page.getByTestId("auth-email-input").fill(account.email)
      await page.getByTestId("auth-password-input").fill(account.password)
      await page.getByTestId("auth-submit-login").click()

      await page.waitForURL((url) => !url.pathname.includes("/login"), {
        timeout: 30_000,
      })
    })
  },
})

export { expect, E2E_USERS }
