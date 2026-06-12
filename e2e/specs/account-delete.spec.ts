import { test, expect } from "../fixtures/test"
import { E2E_USERS } from "../fixtures/users"

test.describe("Account delete", () => {
  test("ACC-DEL-01 free user poate sterge contul", async ({ page, loginAs, localized }) => {
    await loginAs("deletable")
    await page.goto(localized("/account?tab=account_settings"))

    await expect(page.getByTestId("account-delete-section")).toBeVisible()
    await page.getByTestId("account-delete-open").click()
    await page.getByTestId("account-delete-acknowledge").check()
    await page.getByTestId("account-delete-continue").click()
    await page.getByTestId("account-delete-password").fill(E2E_USERS.deletable.password)
    await page.getByTestId("account-delete-submit").click()

    await expect(page).toHaveURL(/\/en\/?$/)

    await page.goto(localized("/login"))
    await page.getByTestId("auth-email-input").fill(E2E_USERS.deletable.email)
    await page.getByTestId("auth-password-input").fill(E2E_USERS.deletable.password)
    await page.getByTestId("auth-submit-login").click()

    await expect(page.getByTestId("auth-form-login")).toBeVisible()
  })

  test("ACC-DEL-02 premium activ blocheaza stergerea", async ({ page, loginAs, localized }) => {
    await loginAs("existing")
    await page.goto(localized("/account?tab=account_settings"))

    await expect(page.getByTestId("account-delete-blocked")).toBeVisible()
    await expect(page.getByTestId("account-delete-open")).toHaveCount(0)
    await expect(page.getByTestId("account-delete-go-billing")).toBeVisible()
  })
})
