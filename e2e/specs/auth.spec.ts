import { test, expect, E2E_USERS } from "../fixtures/test"

test.describe("Autentificare", () => {
  test("AUTH-02 login email/parola valid -> redirect chat", async ({ page, loginAs }) => {
    await loginAs("existing")
    await expect(page).toHaveURL(/\/en\/chat/)
    await expect(page.getByTestId("chat-page")).toBeVisible()
  })

  test("AUTH-03 login cu parola gresita afiseaza eroare", async ({ page, localized }) => {
    await page.goto(localized("/login"))
    await page.getByTestId("auth-email-input").fill(E2E_USERS.existing.email)
    await page.getByTestId("auth-password-input").fill("wrong-password-123")
    await page.getByTestId("auth-submit-login").click()

    await expect(page.getByTestId("auth-error-message")).toBeVisible()
    await expect(page).toHaveURL(/\/en\/login/)
  })

  test("AUTH-04 forgot password trimite link de resetare", async ({ page, localized }) => {
    await page.goto(localized("/login"))
    await page.getByTestId("auth-forgot-password-link").click()
    await expect(page).toHaveURL(/\/en\/forgot-password/)

    await page.getByTestId("forgot-password-email-input").fill(E2E_USERS.existing.email)
    await page.getByTestId("forgot-password-submit").click()

    await expect(page.getByTestId("forgot-password-success")).toBeVisible()
    await expect(page).toHaveURL(/\/en\/forgot-password/)
  })

  test("AUTH-01 register cont nou -> redirect onboarding", async ({ page, localized }) => {
    const uniqueEmail = `new.${Date.now()}@astroai.local`

    await page.goto(localized("/register"))
    await page.getByTestId("auth-name-input").fill("New E2E User")
    await page.getByTestId("auth-email-input").fill(uniqueEmail)
    await page.getByTestId("auth-password-input").fill("AstroE2E!234")
    await page.getByTestId("auth-confirm-password-input").fill("AstroE2E!234")
    await page.getByTestId("auth-terms-checkbox").click()
    await page.getByTestId("auth-submit-register").click()

    await expect(page).toHaveURL(/\/en\/onboarding/)
  })

  test("AUTH-01b register fara acceptare termeni -> buton dezactivat", async ({ page, localized }) => {
    await page.goto(localized("/register"))
    await page.getByTestId("auth-email-input").fill("test@example.com")
    await page.getByTestId("auth-password-input").fill("AstroE2E!234")
    await page.getByTestId("auth-confirm-password-input").fill("AstroE2E!234")

    await expect(page.getByTestId("auth-submit-register")).toBeDisabled()
    await expect(page.getByTestId("auth-google-button")).toBeDisabled()
  })

  test("AUTH-06 logout restrictioneaza accesul la chat", async ({ page, loginAs, localized }) => {
    await loginAs("existing")
    await expect(page.getByTestId("chat-page")).toBeVisible()

    await page.getByTestId("chat-logout-button").click()

    // Dupa logout, accesul la o pagina protejata redirectioneaza la login.
    await page.goto(localized("/chat"))
    await expect(page).toHaveURL(/\/en\/login/)
  })
})
