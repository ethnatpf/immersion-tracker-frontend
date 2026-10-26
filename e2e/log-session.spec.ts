import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { expect, test } from "@playwright/test";

const hasCredentials = existsSync("playwright/credentials.local.json");
const authState =
  process.env.E2E_AUTH_STATE ??
  (hasCredentials ? "playwright/.auth/user.json" : undefined);

for (const viewport of [
  { name: "desktop", width: 1440, height: 1000 },
  { name: "mobile", width: 390, height: 844 },
]) {
  test.describe(`session logging on ${viewport.name}`, () => {
    test.use({ viewport, storageState: authState });
    test.skip(
      !authState,
      "Set E2E_AUTH_STATE to a signed-in test account's Playwright storage-state file; a real backend with languages is required.",
    );

    test("navigates, creates a reading session, finds its content, and saves an audiovisual session", async ({
      page,
    }) => {
      const suffix = randomUUID();
      const bookTitle = `E2E reading ${suffix}`;
      const animeTitle = `E2E anime ${suffix}`;
      await page.goto("/");
      await page
        .getByRole("main")
        .getByRole("link", { name: "Log new session" })
        .click();
      await expect(page).toHaveURL("/log-session");
      await page.getByText("Book", { exact: true }).click();
      const language = page.getByRole("combobox", {
        name: "Language",
        exact: true,
      });
      await expect(language).toBeEnabled();
      if ((await language.textContent())?.includes("Choose a language")) {
        await language.click();
        await page.getByRole("option").first().click();
      }
      const title = page.getByRole("combobox", { name: "Title / search" });
      await title.fill(bookTitle);
      await page
        .getByRole("option", {
          name: `Create new content: ${bookTitle}`,
          exact: true,
        })
        .click();
      await page.getByLabel("Minutes", { exact: true }).fill("15");
      await page.getByLabel("From page").fill("156");
      await page.getByLabel("To page").fill("188");
      await expect(page.getByText("32 pages logged")).toBeVisible();
      await page
        .getByRole("button", { name: "Save session", exact: true })
        .click();
      await expect(page).toHaveURL("/");
      await expect(
        page.getByText(bookTitle, { exact: true }).filter({ visible: true }),
      ).toBeVisible();

      if (viewport.name === "mobile") {
        await page.getByRole("button", { name: "Open navigation" }).click();
        await page
          .getByRole("dialog", { name: "Navigation" })
          .getByRole("link", { name: "Log new session" })
          .click();
        await expect(
          page.getByRole("dialog", { name: "Navigation" }),
        ).not.toBeVisible();
      } else {
        await page
          .getByRole("complementary")
          .getByRole("link", { name: "Log new session" })
          .click();
      }
      await expect(page).toHaveURL("/log-session");
      await page.getByText("Book", { exact: true }).click();
      await title.fill(bookTitle);
      await expect(
        page.getByRole("option", { name: bookTitle, exact: true }),
      ).toBeVisible();
      await page.getByRole("option", { name: bookTitle, exact: true }).click();
      await expect(
        page.getByLabel("Reference link (optional)"),
      ).not.toBeVisible();

      await page.getByText("Anime", { exact: true }).click();
      await title.fill(animeTitle);
      await page
        .getByRole("option", {
          name: `Create new content: ${animeTitle}`,
          exact: true,
        })
        .click();
      await page.getByLabel("Episodes watched").fill("4");
      await expect(page.getByText("00:24:00", { exact: true })).toBeVisible();
      await page
        .getByRole("button", { name: "Save session", exact: true })
        .click();
      await expect(page).toHaveURL("/");
      await expect(
        page.getByText(animeTitle, { exact: true }).filter({ visible: true }),
      ).toBeVisible();
      await expect(
        page.getByRole("region", { name: "Total immersion", exact: true }),
      ).toContainText(/\d+:\d{2}:\d{2}/);
    });
  });
}
