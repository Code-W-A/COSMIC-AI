import { test, expect } from "../fixtures/test"

test.describe("Account - regenerare profil astro", () => {
  test.beforeEach(async ({ loginAs, page, localized }) => {
    await loginAs("existing")
    await page.goto(localized("/account"))
    await page.getByRole("button", { name: "Cosmic Profile" }).click()
    await expect(page.getByTestId("account-profile-save")).toBeVisible()
  })

  test("PROF-REGEN-01 schimbare ora nașterii declanșează flow divine", async ({
    page,
    localized,
  }) => {
    await page.getByTestId("account-profile-birth-time-minute").selectOption("46")
    await page.getByTestId("account-profile-save").click()

    await expect(page).toHaveURL(/\/onboarding/)
    await expect(page.getByTestId("onboarding-divine-loading")).toBeVisible({ timeout: 30_000 })
    await expect(page.getByTestId("onboarding-chart-reveal")).toBeVisible({ timeout: 30_000 })
    await page.getByTestId("onboarding-reveal-continue").click()

    await expect(page).toHaveURL(new RegExp(`${localized("/account").replace("/", "\\/")}$`))
  })

  test("PROF-REGEN-02 schimbare doar nume rămâne pe cont", async ({ page, localized }) => {
    await page.getByLabel("Name").fill("Existing E2E User Updated")
    await page.getByTestId("account-profile-save").click()

    await expect(page).toHaveURL(new RegExp(`${localized("/account").replace("/", "\\/")}`))
    await expect(page.getByTestId("onboarding-divine-loading")).toHaveCount(0)
    await expect(page.getByText("Cosmic profile saved.")).toBeVisible()
  })
})
