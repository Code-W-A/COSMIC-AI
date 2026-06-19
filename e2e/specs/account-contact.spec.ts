import { test, expect } from "../fixtures/test"

test.describe("Account - contact support", () => {
  test("CONTACT-01 trimite mesaj de suport din tab Contact", async ({ loginAs, page, localized }) => {
    await loginAs("existing")
    await page.goto(localized("/account?tab=contact"))

    await expect(page.getByTestId("account-contact-section")).toBeVisible()
    await page.getByTestId("account-contact-topic-technical").click()
    await page.getByTestId("account-contact-message").fill(
      "E2E support message with enough detail for validation."
    )
    await page.getByTestId("account-contact-submit").click()

    await expect(page.getByTestId("account-contact-success")).toBeVisible({ timeout: 15_000 })
    await expect(page.getByTestId("account-contact-success")).toContainText("Message sent")
  })
})
