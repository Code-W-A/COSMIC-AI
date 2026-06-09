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
})
