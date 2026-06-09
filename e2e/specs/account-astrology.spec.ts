import { test, expect } from "../fixtures/test"

test.describe("Account - generare astrologie (mock)", () => {
  test.beforeEach(async ({ loginAs, page, localized }) => {
    await loginAs("existing")
    await page.goto(localized("/account"))
    await expect(page.getByTestId("account-generate-all-button")).toBeVisible()
  })

  test("ASTRO-04 generate all (natal + daily)", async ({ page }) => {
    await page.getByTestId("account-generate-all-button").click()
    await expect(page.getByTestId("account-feedback-success")).toBeVisible()
  })

  test("ASTRO-01 generare/regenerare natal", async ({ page }) => {
    await expect(page.getByTestId("account-generate-natal-button")).toBeEnabled()
    await page.getByTestId("account-generate-natal-button").click()
    await expect(page.getByTestId("account-feedback-success")).toBeVisible()
  })

  test("DAILY-RO-01 ghidaj zilnic localizat pe ro", async ({ page, localized }) => {
    await page.goto(localized("/account?tab=daily_guidance", "ro"))
    await expect(page.getByTestId("account-daily-generate-button")).toBeEnabled()
    await page.getByTestId("account-daily-generate-button").click()
    await expect(page.getByTestId("account-feedback-success")).toBeVisible({ timeout: 30_000 })
    await expect(page.getByText(/Ghidaj zilnic mock|\[RO\]/)).toBeVisible()
  })
})
