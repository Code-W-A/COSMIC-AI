import { test, expect } from "../fixtures/test"

test.describe("i18n / rutare locale", () => {
  test("incarca landing-ul pe /ro si /en", async ({ page }) => {
    await page.goto("/ro")
    await expect(page).toHaveURL(/\/ro$/)

    await page.goto("/en")
    await expect(page).toHaveURL(/\/en$/)
  })

  test("persistenta locale prin cookie la accesarea radacinii", async ({ page }) => {
    // Vizitarea /ro seteaza cookie-ul de locale.
    await page.goto("/ro")
    await expect(page).toHaveURL(/\/ro$/)

    // Accesarea radacinii foloseste cookie-ul si redirectioneaza la /ro.
    await page.goto("/")
    await expect(page).toHaveURL(/\/ro$/)
  })

  test("pagini legale se incarca in ambele limbi", async ({ page }) => {
    await page.goto("/ro/privacy")
    await expect(page.getByTestId("legal-privacy-page")).toBeVisible()
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Politica de confidențialitate")

    await page.goto("/en/terms")
    await expect(page.getByTestId("legal-terms-page")).toBeVisible()
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Terms and Conditions")

    await page.goto("/ro/cookies")
    await expect(page.getByTestId("legal-cookies-page")).toBeVisible()
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Politica de cookies")
  })
})
