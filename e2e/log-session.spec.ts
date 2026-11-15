import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { expect, test } from "./test-fixtures";
import { createReadingSession } from "./session-helpers";

const hasCredentials =
  existsSync("playwright/credentials.local.json") ||
  Boolean(process.env.E2E_AUTH_EMAIL && process.env.E2E_AUTH_PASSWORD);
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
      trackSessionId,
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
      await page.getByRole("button", { name: /Reading/ }).click();
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
      await page.getByRole("spinbutton", { name: "From" }).fill("156");
      await page.getByRole("spinbutton", { name: "To" }).fill("188");
      await expect(page.getByText("33 pages logged")).toBeVisible();
      const bookSessionResponse = page.waitForResponse((response) =>
        response.url().includes("/api/backend/immersion-session") &&
        response.request().method() === "POST",
      );
      await page
        .getByRole("button", { name: "Save session", exact: true })
        .click();
      trackSessionId(((await (await bookSessionResponse).json()) as { _id: string })._id);
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
      await page.getByRole("button", { name: /Reading/ }).click();
      await page.getByText("Book", { exact: true }).click();
      await title.fill(bookTitle);
      await expect(
        page.getByRole("option", { name: bookTitle, exact: true }),
      ).toBeVisible();
      await page.getByRole("option", { name: bookTitle, exact: true }).click();
      await expect(
        page.getByLabel("Reference link (optional)"),
      ).not.toBeVisible();

      await page.getByRole("button", { name: /Audiovisual/ }).click();
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
      const animeSessionResponse = page.waitForResponse((response) =>
        response.url().includes("/api/backend/immersion-session") &&
        response.request().method() === "POST",
      );
      await page
        .getByRole("button", { name: "Save session", exact: true })
        .click();
      trackSessionId(((await (await animeSessionResponse).json()) as { _id: string })._id);
      await expect(page).toHaveURL("/");
      await expect(
        page.getByRole("region", { name: "Total immersion", exact: true }),
      ).toContainText(/(?:\d+h(?:\d+m)?|\d+m)/);
      await page.goto("/history");
      await page.getByLabel("Search titles").fill(animeTitle);
      await expect(
        page.getByRole("link", { name: animeTitle, exact: true }),
      ).toBeVisible();
    });
  });
}

test.describe("session logging from content detail", () => {
  test.use({ storageState: authState });
  test.skip(
    !authState,
    "Set E2E_AUTH_STATE to a signed-in test account's Playwright storage-state file; a real backend with languages is required.",
  );

  test("logs a session from the content detail dialog", async ({
    page,
    trackSessionId,
  }) => {
    const title = `E2E detail ${randomUUID()}`;
    const { contentId, sessionId } = await createReadingSession(page, title);
    trackSessionId(sessionId);
    await page.goto(`/content/${contentId}`);
    await expect(page.getByRole("heading", { name: title })).toBeVisible();
    await page.getByRole("button", { name: "Log new session" }).click();
    const dialog = page.getByRole("dialog", { name: "Log new session" });
    await expect(dialog).toBeVisible();
    await dialog.getByLabel("Minutes", { exact: true }).fill("9");
    const addedSessionResponse = page.waitForResponse((response) =>
      response.url().includes("/api/backend/immersion-session") &&
      response.request().method() === "POST",
    );
    await dialog.getByRole("button", { name: "Log session", exact: true }).click();
    trackSessionId(((await (await addedSessionResponse).json()) as { _id: string })._id);
    await expect(page.getByText("Session saved")).toBeVisible();
    await expect(page.getByText("2 total recorded sessions")).toBeVisible();
  });
});
