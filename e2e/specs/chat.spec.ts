import type { Page } from "@playwright/test"

import { test, expect } from "../fixtures/test"

type MockChatErrorCode =
  | "AUTH_REQUIRED"
  | "ONBOARDING_REQUIRED"
  | "USAGE_LIMIT_REACHED"
  | "PREMIUM_REQUIRED"
  | "OPENAI_TIMEOUT"
  | "OPENAI_UNAVAILABLE"

const mockErrorMeta = {
  AUTH_REQUIRED: { retryable: false, action: "login", status: 401 },
  ONBOARDING_REQUIRED: { retryable: false, action: "onboarding", status: 400 },
  USAGE_LIMIT_REACHED: { retryable: false, action: "upgrade", status: 403 },
  PREMIUM_REQUIRED: { retryable: false, action: "upgrade", status: 403 },
  OPENAI_TIMEOUT: { retryable: true, action: "retry", status: 503 },
  OPENAI_UNAVAILABLE: { retryable: true, action: "retry", status: 503 },
} as const

async function mockChatError(page: Page, code: MockChatErrorCode) {
  const meta = mockErrorMeta[code]
  await page.route("**/api/agents/chat", async (route) => {
    await route.fulfill({
      status: meta.status,
      contentType: "application/json",
      body: JSON.stringify({
        ok: false,
        error: {
          code,
          message: "Provider details must never be rendered.",
          retryable: meta.retryable,
          action: meta.action,
        },
      }),
    })
  })
}

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
    await expect(page.getByTestId("chat-message-user").last()).toHaveAttribute("data-message-status", "sent")
    await expect(page.getByTestId("chat-message-assistant").last()).toContainText("Mocked")
    await expect(page.getByTestId("chat-message-assistant").last()).toHaveAttribute("data-message-status", "completed")
    await expect(page.getByTestId("chat-state-indicator")).toHaveAttribute(
      "data-chat-state",
      "active"
    )
    await expect(page).toHaveURL(/\/en\/chat\/?$/)
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

  test("CHAT-04 copiere mesaj assistant + toast", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"])

    await page.getByTestId("chat-input").fill("Copy this cosmic reply please.")
    await page.getByTestId("chat-send-button").click()

    const assistantMessage = page.getByTestId("chat-message-assistant").last()
    await expect(assistantMessage).toContainText("Mocked")

    await assistantMessage.getByTestId("chat-message-copy").click()

    await expect(page.locator("[data-sonner-toast]")).toContainText("Message copied")

    const clipboardText = await page.evaluate(() => navigator.clipboard.readText())
    expect(clipboardText).toContain("Mocked")
  })

  test("CHAT-05 validare composer mesaj gol", async ({ page }) => {
    await page.getByTestId("chat-input").fill("   ")
    await page.getByTestId("chat-input").press("Enter")

    await expect(page.getByTestId("chat-composer-error")).toBeVisible()
    await expect(page.getByTestId("chat-message-user")).toHaveCount(0)
  })

  test("CHAT-06 mesaj prea lung ramane in composer", async ({ page }) => {
    const longMessage = "a".repeat(4001)
    await page.getByTestId("chat-input").fill(longMessage)
    await page.getByTestId("chat-send-button").click()

    await expect(page.getByTestId("chat-composer-error")).toContainText("too long")
    await expect(page.getByTestId("chat-input")).toHaveValue(longMessage)
    await expect(page.getByTestId("chat-message-user")).toHaveCount(0)
  })

  test("CHAT-07 auth required afiseaza login fara eroare bruta", async ({ page }) => {
    await mockChatError(page, "AUTH_REQUIRED")
    await page.getByTestId("chat-input").fill("Keep my message")
    await page.getByTestId("chat-send-button").click()

    await expect(page.getByTestId("chat-message-user").last()).toContainText("Keep my message")
    await expect(page.getByTestId("chat-error-message")).toContainText("Sign in to continue")
    await expect(page.getByTestId("chat-error-message")).not.toContainText("Provider details")
    await expect(page.getByTestId("chat-error-action-login")).toBeVisible()
  })

  test("CHAT-07B endpointul returneaza contractul standard pentru auth", async ({ page }) => {
    const response = await page.evaluate(async () => {
      const result = await fetch("/api/agents/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-locale": "en" },
        body: JSON.stringify({ agentType: "love", message: "Hello" }),
      })
      return { status: result.status, body: await result.json() }
    })

    expect(response.status).toBe(401)
    expect(response.body).toEqual({
      ok: false,
      error: {
        code: "AUTH_REQUIRED",
        message: "Sign in to continue the conversation.",
        retryable: false,
        action: "login",
      },
    })
  })

  test("CHAT-08 onboarding required afiseaza CTA contextual", async ({ page }) => {
    await mockChatError(page, "ONBOARDING_REQUIRED")
    await page.getByTestId("chat-input").fill("Personalize this")
    await page.getByTestId("chat-send-button").click()

    await expect(page.getByTestId("chat-error-message")).toContainText("Complete your astrology profile")
    await expect(page.getByTestId("chat-error-action-onboarding")).toBeVisible()
  })

  test("CHAT-09 usage limit si premium required afiseaza upgrade", async ({ page }) => {
    await mockChatError(page, "USAGE_LIMIT_REACHED")
    await page.getByTestId("chat-input").fill("One more question")
    await page.getByTestId("chat-send-button").click()

    await expect(page.getByTestId("chat-error-message")).toContainText("used your free questions")
    await expect(page.getByTestId("chat-error-action-upgrade")).toBeVisible()
  })

  test("CHAT-09B premium required afiseaza activarea Premium", async ({ page }) => {
    await mockChatError(page, "PREMIUM_REQUIRED")
    await page.getByTestId("chat-input").fill("Premium conversation")
    await page.getByTestId("chat-send-button").click()

    await expect(page.getByTestId("chat-error-message")).toContainText("available to Premium users")
    await expect(page.getByTestId("chat-error-action-upgrade")).toContainText("Activate Premium")
  })

  test("CHAT-10 timeout retry inlocuieste eroarea fara mesaj user duplicat", async ({ page }) => {
    let attempts = 0
    await page.route("**/api/agents/chat", async (route) => {
      attempts += 1
      if (attempts === 1) {
        await route.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({
            ok: false,
            error: {
              code: "OPENAI_TIMEOUT",
              message: "Raw OpenAI timeout",
              retryable: true,
              action: "retry",
            },
          }),
        })
        return
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          response: "Recovered response",
          conversationId: "e2e-retry-conversation",
          persisted: true,
          data: { answer: "Recovered response" },
        }),
      })
    })

    await page.getByTestId("chat-input").fill("Retry this exact message")
    await page.getByTestId("chat-send-button").click()
    await expect(page.getByTestId("chat-error-message")).toContainText("took too long")
    await expect(page.getByTestId("chat-message-user")).toHaveCount(1)

    await page.getByTestId("chat-retry-button").click()
    await expect(page.getByTestId("chat-message-assistant").last()).toContainText("Recovered response")
    await expect(page.getByTestId("chat-message-user")).toHaveCount(1)
    await expect(page.getByTestId("chat-error-message")).toHaveCount(0)
  })

  test("CHAT-11 network error pastreaza mesajul si permite retry", async ({ page }) => {
    await page.route("**/api/agents/chat", (route) => route.abort("failed"))
    await page.getByTestId("chat-input").fill("Do not lose this")
    await page.getByTestId("chat-send-button").click()

    await expect(page.getByTestId("chat-message-user").last()).toContainText("Do not lose this")
    await expect(page.getByTestId("chat-error-message")).toContainText("connection seems unstable")
    await expect(page.getByTestId("chat-retry-button")).toBeVisible()
  })

  test("CHAT-12 save warning pastreaza raspunsul AI complet", async ({ page }) => {
    await page.route("**/api/agents/chat", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          response: "Generated even though persistence failed",
          conversationId: "e2e-save-warning",
          persisted: false,
          warning: {
            code: "FIREBASE_SAVE_ERROR",
            message: "Raw Firestore error",
            retryable: false,
            action: "none",
          },
          data: { answer: "Generated even though persistence failed" },
        }),
      })
    })

    await page.getByTestId("chat-input").fill("Generate and save")
    await page.getByTestId("chat-send-button").click()

    await expect(page.getByTestId("chat-message-assistant").last()).toContainText("Generated even though")
    await expect(page.getByTestId("chat-message-assistant").last()).toHaveAttribute("data-message-status", "completed")
    await expect(page.getByTestId("chat-save-warning")).toContainText("may not have been saved correctly")
    await expect(page.getByTestId("chat-save-warning")).not.toContainText("Raw Firestore")
  })

  test("CHAT-13 erorile sunt localizate in romana", async ({ page, localized }) => {
    await page.goto(localized("/chat", "ro"))
    await expect(page.getByTestId("chat-page")).toBeVisible()
    await mockChatError(page, "OPENAI_UNAVAILABLE")
    await page.getByTestId("chat-input").fill("Mesaj în română")
    await page.getByTestId("chat-send-button").click()

    await expect(page.getByTestId("chat-error-message")).toContainText("AstroAI nu poate răspunde momentan")
    await expect(page.getByTestId("chat-retry-button")).toContainText("Încearcă din nou")
  })

  test("HANDOFF-01 agentul recomanda comutare + prefill input", async ({ page }) => {
    await page.getByTestId("chat-input").fill("What career path fits my chart at work?")
    await page.getByTestId("chat-send-button").click()

    await expect(page.getByTestId("chat-message-assistant").last()).toContainText("Mocked")
    await expect(page.getByTestId("chat-handoff-guidance")).toBeVisible()
    await expect(page.getByTestId("chat-handoff-reason")).toContainText("Nova")
    const handoffCta = page.getByTestId("chat-switch-agent-cta")
    await expect(handoffCta).toBeVisible()
    await expect(handoffCta).toContainText("Nova")

    await handoffCta.click()
    const transitionBanner = page.getByTestId("chat-handoff-transition-banner")
    await expect(transitionBanner).toBeVisible()
    await expect(transitionBanner).toContainText("Nova")
    await expect(transitionBanner).toContainText("Career")
    await expect(page.getByTestId("chat-input")).toHaveValue("What career path fits my natal chart?")
    await expect(page.getByTestId("chat-input")).toBeFocused()
  })

  test("USAGE-UI-01 contor utilizare free in composer", async ({ page }) => {
    await page.route("**/api/subscription/status", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          subscriptionStatus: "free",
          subscriptionPlan: "free",
          billingInterval: null,
          currentPeriodEnd: null,
          cancelAtPeriodEnd: false,
          isInGrace: false,
          graceUntil: null,
          graceReason: null,
          monthlyQuestionCount: 3,
          monthlyQuestionLimit: 5,
          isPremium: false,
        }),
      })
    })

    await page.reload()
    await expect(page.getByTestId("chat-page")).toBeVisible()
    const usageMeter = page.getByTestId("subscription-usage-meter")
    await expect(usageMeter).toBeVisible()
    await expect(usageMeter).toContainText("3")
    await expect(usageMeter).toContainText("5")
    await expect(page.getByTestId("subscription-usage-upgrade-cta")).toBeVisible()
  })

  test("USAGE-UI-02 banner progresiv la 4 din 5", async ({ page }) => {
    await page.route("**/api/subscription/status", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          subscriptionStatus: "free",
          subscriptionPlan: "free",
          billingInterval: null,
          currentPeriodEnd: null,
          cancelAtPeriodEnd: false,
          isInGrace: false,
          graceUntil: null,
          graceReason: null,
          monthlyQuestionCount: 4,
          monthlyQuestionLimit: 5,
          isPremium: false,
        }),
      })
    })

    await page.reload()
    await expect(page.getByTestId("chat-page")).toBeVisible()
    await expect(page.getByTestId("chat-usage-limit-banner")).toBeVisible()
    await expect(page.getByTestId("chat-usage-limit-banner")).toContainText(/1 free question|1 întrebare gratuită/)
  })
})
