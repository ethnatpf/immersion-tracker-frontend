import { existsSync } from "node:fs";
import { expect, test } from "@playwright/test";
import type { LanguageResponseDto } from "@/lib/api/generated/models";

const hasCredentials =
  existsSync("playwright/credentials.local.json") ||
  Boolean(process.env.E2E_AUTH_EMAIL && process.env.E2E_AUTH_PASSWORD);
const authState =
  process.env.E2E_AUTH_STATE ??
  (hasCredentials ? "playwright/.auth/user.json" : undefined);

test.use({ storageState: authState });
test.skip(
  !authState,
  "Set E2E_AUTH_STATE to a signed-in test account's Playwright storage-state file; a real backend with languages is required.",
);

test("checks statistics across date ranges", async ({ page }) => {
  const statisticsRequests: URL[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/dashboard/statistics")) {
      statisticsRequests.push(new URL(request.url()));
    }
  });
  await page.goto("/");
  await expect(page.getByRole("region", { name: "Total immersion" })).toBeVisible();
  for (const range of ["Monthly", "Yearly", "Total", "Weekly"]) {
    await page.getByRole("tab", { name: range }).click();
    await expect(page.getByRole("region", { name: "Total immersion" })).toBeVisible();
  }
  await expect.poll(() => {
    const ranges = new Set(statisticsRequests.map((url) => url.searchParams.get("range")));
    return ranges.size === 4;
  }).toBe(true);
  expect(new Set(statisticsRequests.map((url) => url.searchParams.get("range")))).toEqual(
    new Set(["week", "month", "year", "total"]),
  );
});

test("updates statistics when the dashboard language changes", async ({ page }) => {
  const statisticsRequests: URL[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/dashboard/statistics")) {
      statisticsRequests.push(new URL(request.url()));
    }
  });
  await page.goto("/");
  await expect(page.getByRole("region", { name: "Total immersion" })).toBeVisible();
  await expect.poll(() => statisticsRequests.length).toBeGreaterThan(0);
  const initialLanguage = statisticsRequests.at(-1)?.searchParams.get("language");
  const languagesResponse = await page.request.get("/api/backend/language");
  expect(languagesResponse).toBeOK();
  const availableLanguages = (await languagesResponse.json()) as LanguageResponseDto[];
  const nextLanguage = availableLanguages.find(
    (language) => language.id !== initialLanguage,
  );
  if (!nextLanguage) {
    test.skip(true, "The signed-in account needs at least two languages for language-switch coverage.");
    return;
  }

  const language = page.getByRole("combobox", { name: "Dashboard language" });
  await language.click();
  await page.getByRole("option", { name: nextLanguage.name, exact: true }).click();
  await expect(language).toContainText(nextLanguage.name);

  await expect
    .poll(() =>
      statisticsRequests.some(
        (url) => url.searchParams.get("language") === nextLanguage.id,
      ),
    )
    .toBe(true);
});
