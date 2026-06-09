import { test, expect } from "../fixtures/test"

test.describe("Pagini protejate si rutare", () => {
  for (const route of ["/chat", "/account", "/report"]) {
    test(`PROT acces neautentificat la ${route} redirectioneaza la login`, async ({
      page,
      localized,
    }) => {
      await page.goto(localized(route))
      await expect(page).toHaveURL(/\/en\/login\?next=/)
    })
  }

  test("EDGE-05 locale necunoscut intoarce 404", async ({ page }) => {
    const response = await page.goto("/xx/chat")
    expect(response?.status()).toBe(404)
  })
})
