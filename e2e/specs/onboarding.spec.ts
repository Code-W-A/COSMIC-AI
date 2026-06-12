import { test, expect } from "../fixtures/test"

const MOCK_PLACE = {
  placeId: "e2e-bucharest",
  description: "Bucharest, Romania",
  mainText: "Bucharest",
  secondaryText: "Romania",
}

const MOCK_RESOLVED_LOCATION = {
  placeId: MOCK_PLACE.placeId,
  birthPlace: MOCK_PLACE.description,
  latitude: 44.4268,
  longitude: 26.1025,
  timezoneIana: "Europe/Bucharest",
  timezoneOffsetAtBirth: 3,
  timezoneOffsetNow: 3,
}

/**
 * The birth-place autocomplete/resolve endpoints hit Google Maps, which is not
 * covered by E2E_MOCK_EXTERNALS. We stub them at the network layer so the
 * onboarding flow can complete deterministically.
 */
async function stubLocationApis(page: import("@playwright/test").Page) {
  await page.route("**/api/location/autocomplete**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, suggestions: [MOCK_PLACE] }),
    })
  })

  await page.route("**/api/location/resolve", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, location: MOCK_RESOLVED_LOCATION }),
    })
  })
}

test.describe("Onboarding", () => {
  test("ONB-01 wizard complet pentru user fara profil -> divine reveal -> chat", async ({
    page,
    loginAs,
  }) => {
    await stubLocationApis(page)

    await loginAs("fresh")
    await expect(page).toHaveURL(/\/en\/onboarding/)

    // Pas 1: nume
    await expect(page.getByTestId("onboarding-card")).toHaveAttribute("data-step", "1")
    await page.getByTestId("onboarding-name-input").fill("Fresh E2E User")
    await page.getByTestId("onboarding-continue").click()

    // Pas 2: detalii nastere + locatie rezolvata din sugestii
    await expect(page.getByTestId("onboarding-card")).toHaveAttribute("data-step", "2")
    await page.getByTestId("birth-date-year").selectOption("1994")
    await page.getByTestId("birth-date-month").selectOption("6")
    await page.getByTestId("birth-date-day").selectOption("14")
    await page.getByTestId("birth-time-hour").selectOption("8")
    await page.getByTestId("birth-time-minute").selectOption("45")
    await page.getByTestId("location-autocomplete-input").fill("Bucha")
    await page.getByTestId("location-autocomplete-suggestion").first().click()
    await page.getByTestId("onboarding-sex-select").selectOption("female")
    await expect(page.getByTestId("onboarding-continue")).toBeEnabled()
    await page.getByTestId("onboarding-continue").click()

    // Pas 3: focus principal + submit profil
    await expect(page.getByTestId("onboarding-card")).toHaveAttribute("data-step", "3")
    await page.getByTestId("onboarding-focus-love").click()
    await page.getByTestId("onboarding-continue").click()

    // Pas 4: generare natal (mock)
    await expect(page.getByTestId("onboarding-divine-loading")).toBeVisible({ timeout: 30_000 })

    // Pas 5: reveal harta
    await expect(page.getByTestId("onboarding-chart-reveal")).toBeVisible({ timeout: 30_000 })
    await page.getByTestId("onboarding-reveal-continue").click()

    // Pas 6: ghizi stelari
    await expect(page.getByTestId("onboarding-stellar-guides")).toBeVisible()
    await page.getByTestId("onboarding-start-chat").click()

    await expect(page).toHaveURL(/\/en\/chat\?agent=love/)
    await expect(page.getByTestId("chat-page")).toBeVisible()
  })

  test("ONB-03 user cu profil complet este redirectionat din onboarding", async ({
    page,
    loginAs,
    localized,
  }) => {
    await loginAs("existing")
    await page.goto(localized("/onboarding"))
    await expect(page).toHaveURL(/\/en\/chat/)
  })

  test("ONB-05 retry dupa eroare generare natal", async ({ page, loginAs, localized }) => {
    await stubLocationApis(page)

    let natalAttempts = 0
    await page.route("**/api/astrology/natal", async (route) => {
      natalAttempts += 1
      if (natalAttempts === 1) {
        await route.fulfill({
          status: 502,
          contentType: "application/json",
          body: JSON.stringify({
            success: false,
            error: { code: "divineapi_unavailable", message: "Astrology provider is unavailable right now." },
          }),
        })
        return
      }

      await route.continue()
    })

    await loginAs("fresh")
    await page.goto(localized("/onboarding"))

    await page.getByTestId("onboarding-name-input").fill("Retry E2E User")
    await page.getByTestId("onboarding-continue").click()
    await page.getByTestId("birth-date-year").selectOption("1994")
    await page.getByTestId("birth-date-month").selectOption("6")
    await page.getByTestId("birth-date-day").selectOption("14")
    await page.getByTestId("birth-time-hour").selectOption("8")
    await page.getByTestId("birth-time-minute").selectOption("45")
    await page.getByTestId("location-autocomplete-input").fill("Bucha")
    await page.getByTestId("location-autocomplete-suggestion").first().click()
    await page.getByTestId("onboarding-sex-select").selectOption("female")
    await page.getByTestId("onboarding-continue").click()
    await page.getByTestId("onboarding-focus-love").click()
    await page.getByTestId("onboarding-continue").click()

    await expect(page.getByTestId("onboarding-divine-retry")).toBeVisible({ timeout: 30_000 })
    await page.getByTestId("onboarding-divine-retry").click()

    await expect(page.getByTestId("onboarding-chart-reveal")).toBeVisible({ timeout: 30_000 })
  })
})
