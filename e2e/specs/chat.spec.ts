import { test, expect } from "../fixtures/test"

test.describe("Chat", () => {
  test.beforeEach(async ({ loginAs, page }) => {
    await loginAs("existing")
    await expect(page.getByTestId("chat-page")).toBeVisible()
  })

  test("CHAT-01 prima intrare = stare conversatie noua", async ({ page }) => {
    await expect(page.getByTestId("chat-state-indicator")).toHaveAttribute("data-chat-state", "new")
    await expect(page.getByTestId("chat-empty-state")).toBeVisible()
    await expect(page.getByTestId("chat-composer-bottom")).toBeVisible()
  })

  test("CHAT-02 trimitere mesaj text + raspuns agent (mock)", async ({ page }) => {
    await page.getByTestId("chat-input").fill("I need cosmic guidance today.")
    await page.getByTestId("chat-send-button").click()

    await expect(page.getByTestId("chat-message-user").last()).toContainText("cosmic guidance")
    await expect(page.getByTestId("chat-message-assistant").last()).toContainText("Mocked")
    await expect(page.getByTestId("chat-state-indicator")).toHaveAttribute(
      "data-chat-state",
      "active"
    )
    await expect(page).toHaveURL(/\/en\/chat\/c\//)
  })

  test("CHAT-03 suggested prompt trimite mesaj fara input manual", async ({ page }) => {
    const prompt = page.getByTestId("chat-suggested-prompt").first()
    await expect(prompt).toBeVisible()
    await prompt.click()

    await expect(page.getByTestId("chat-message-user").last()).toBeVisible()
    await expect(page.getByTestId("chat-message-assistant").last()).toContainText("Mocked")
  })

  test("AGENT-01 selectarea agentului se reflecta in raspuns", async ({ page }) => {
    await page.getByTestId("chat-agents-toggle").click()
    await page.getByTestId("chat-agent-option-career_purpose").click()

    await page.getByTestId("chat-input").fill("What should I focus on at work?")
    await page.getByTestId("chat-send-button").click()

    await expect(page.getByTestId("chat-message-assistant").last()).toContainText("career_purpose")
  })

  test("HANDOFF-01 agentul recomanda comutare + prefill input", async ({ page }) => {
    await page.getByTestId("chat-input").fill("What career path fits my chart at work?")
    await page.getByTestId("chat-send-button").click()

    await expect(page.getByTestId("chat-message-assistant").last()).toContainText("Mocked")
    const handoffCta = page.getByTestId("chat-switch-agent-cta")
    await expect(handoffCta).toBeVisible()
    await expect(handoffCta).toContainText("Nova")

    await handoffCta.click()
    await expect(page.getByTestId("chat-input")).toHaveValue("What career path fits my natal chart?")
    await expect(page.getByTestId("chat-input")).toBeFocused()
  })
})
