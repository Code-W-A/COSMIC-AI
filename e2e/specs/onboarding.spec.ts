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
  test("ONB-01 wizard complet pentru user fara profil -> chat", async ({ page, loginAs }) => {
    await stubLocationApis(page)

    await loginAs("fresh")
    await expect(page).toHaveURL(/\/en\/onboarding/)

    // Pas 1: nume
    await expect(page.getByTestId("onboarding-card")).toHaveAttribute("data-step", "1")
    await page.getByTestId("onboarding-name-input").fill("Fresh E2E User")
    await page.getByTestId("onboarding-continue").click()

    // Pas 2: detalii nastere + locatie rezolvata din sugestii
    await expect(page.getByTestId("onboarding-card")).toHaveAttribute("data-step", "2")
    await page.getByTestId("onboarding-birthdate-input").fill("1994-06-14")
    await page.getByTestId("onboarding-birthtime-input").fill("08:45")
    await page.getByTestId("location-autocomplete-input").fill("Bucha")
    await page.getByTestId("location-autocomplete-suggestion").first().click()
    await page.getByTestId("onboarding-sex-select").selectOption("female")
    await expect(page.getByTestId("onboarding-continue")).toBeEnabled()
    await page.getByTestId("onboarding-continue").click()

    // Pas 3: focus principal + submit final
    await expect(page.getByTestId("onboarding-card")).toHaveAttribute("data-step", "3")
    await page.getByTestId("onboarding-focus-love").click()
    await page.getByTestId("onboarding-continue").click()

    await expect(page).toHaveURL(/\/en\/chat/)
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
})
