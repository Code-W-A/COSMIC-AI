import { test, expect } from "../fixtures/test"

test.describe("Landing autentificat", () => {
  test("LAND-01 user complet pe /ro ramane pe landing cu CTA chat", async ({
    page,
    loginAs,
    localized,
  }) => {
    await loginAs("existing", { locale: "ro" })
    await page.goto(localized("/", "ro"))

    await expect(page).toHaveURL(/\/ro$/)
    await expect(page.getByTestId("landing-cta-primary")).toHaveText(/Continuă în chat/)
    await expect(page.getByTestId("nav-chat")).toBeVisible()
    await expect(page.getByTestId("nav-account")).toBeVisible()
    await expect(page.getByRole("link", { name: "Conectare" })).toHaveCount(0)
    await expect(page.getByRole("link", { name: "Începe gratuit" })).toHaveCount(0)
  })

  test("LAND-02 user complet pe /en afiseaza Continue in chat", async ({
    page,
    loginAs,
    localized,
  }) => {
    await loginAs("existing", { locale: "en" })
    await page.goto(localized("/", "en"))

    await expect(page).toHaveURL(/\/en$/)
    await expect(page.getByTestId("landing-cta-primary")).toHaveText(/Continue in chat/)
    await expect(page.getByTestId("nav-chat")).toBeVisible()
  })

  test("LAND-03 user fresh pe landing este redirectionat la onboarding", async ({
    page,
    loginAs,
    localized,
  }) => {
    await loginAs("fresh", { locale: "ro" })
    await page.goto(localized("/", "ro"))

    await expect(page).toHaveURL(/\/ro\/onboarding/)
  })

  test("LAND-04 user free pe landing vede CTA planuri", async ({
    page,
    loginAs,
    localized,
  }) => {
    await loginAs("deletable", { locale: "ro" })
    await page.goto(localized("/", "ro"))

    await expect(page).toHaveURL(/\/ro$/)
    await expect(page.getByTestId("landing-cta-view-plans")).toHaveText(/Vezi planurile/)
  })
})
