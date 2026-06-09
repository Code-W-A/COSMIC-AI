import { test, expect } from "../fixtures/test"

test.describe("Istoric conversatii si chat nou", () => {
  test.beforeEach(async ({ loginAs, page }) => {
    await loginAs("existing")
    await expect(page.getByTestId("chat-page")).toBeVisible()
  })

  test("HIST-01 listeaza conversatiile existente", async ({ page }) => {
    // User-ul existing are cel putin conversatia seed-uita.
    await expect(page.getByTestId("chat-history-item").first()).toBeVisible()
  })

  test("HIST-02 deschiderea unei conversatii incarca mesajele", async ({ page, localized }) => {
    await page.getByTestId("chat-history-item").first().click()

    await expect(page).toHaveURL(/\/chat\/c\/e2e-seeded-conversation/)
    await expect(page.getByTestId("chat-messages-container")).toBeVisible()
    // Asteptam ca mesajele sa fie efectiv incarcate (nu doar skeleton-ul).
    await expect(page.getByTestId("chat-message-assistant").first()).toBeVisible()
    await expect(page.getByTestId("chat-state-indicator")).toHaveAttribute(
      "data-chat-state",
      "active"
    )
  })

  test("HIST-03 URL direct catre conversatie seed-uita", async ({ page, localized }) => {
    await page.goto(localized("/chat/c/e2e-seeded-conversation"))

    await expect(page.getByTestId("chat-page")).toBeVisible()
    await expect(page.getByTestId("chat-message-assistant").first()).toBeVisible()
    await expect(page.getByTestId("chat-state-indicator")).toHaveAttribute(
      "data-chat-state",
      "active"
    )
  })

  test("NEWCHAT-01 butonul New reseteaza contextul", async ({ page }) => {
    await page.getByTestId("chat-history-item").first().click()
    // Asteptam finalizarea incarcarii inainte de a apasa New (altfel fetch-ul in
    // curs ar repopula mesajele dupa reset).
    await expect(page.getByTestId("chat-message-assistant").first()).toBeVisible()
    await expect(page.getByTestId("chat-state-indicator")).toHaveAttribute(
      "data-chat-state",
      "active"
    )

    await page.getByTestId("chat-new-button").click()
    await expect(page).toHaveURL(/\/en\/chat$/)
    await expect(page.getByTestId("chat-state-indicator")).toHaveAttribute("data-chat-state", "new")
    await expect(page.getByTestId("chat-empty-state")).toBeVisible()
  })

  test("NEWCHAT-03 New nu redeschide automat conversatia veche", async ({ page }) => {
    await page.getByTestId("chat-new-button").click()
    await expect(page.getByTestId("chat-state-indicator")).toHaveAttribute("data-chat-state", "new")

    // Asteptam putin pentru a confirma ca nu se face auto-open la conversatia anterioara.
    await page.waitForTimeout(2000)
    await expect(page.getByTestId("chat-state-indicator")).toHaveAttribute("data-chat-state", "new")
  })
})
