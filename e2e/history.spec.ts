import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { expect, test } from "./test-fixtures";
import {
  createAudioSession,
  createAudiovisualSession,
  createReadingSession,
} from "./session-helpers";

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
test.describe.configure({ mode: "serial" });

test.describe("history journeys", () => {
  test("updates a session", async ({ page, trackSessionId }) => {
    const title = `E2E update ${randomUUID()}`;
    const { sessionId } = await createReadingSession(page, title);
    trackSessionId(sessionId);
    await page.goto("/history");
    await page.getByLabel("Search titles").fill(title);
    const row = page.getByRole("row").filter({ hasText: title });
    await expect(row).toBeVisible();
    await row.getByRole("button", { name: `Edit ${title}` }).click();
    const dialog = page.getByRole("dialog", { name: "Edit session" });
    await expect(dialog).toBeVisible();
    await dialog.getByLabel("Minutes", { exact: true }).fill("17");
    const save = dialog.getByRole("button", { name: "Save changes" });
    await save.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByText("Session updated")).toBeVisible();
    await expect(row).toContainText("17:00");
  });

  test("deletes a session after confirmation", async ({ page, trackSessionId }) => {
    const title = `E2E delete ${randomUUID()}`;
    const { sessionId } = await createReadingSession(page, title);
    trackSessionId(sessionId);
    await page.goto("/history");
    await page.getByLabel("Search titles").fill(title);
    const row = page.getByRole("row").filter({ hasText: title });
    await expect(row).toBeVisible();
    await row.getByRole("button", { name: `Delete ${title}` }).click();
    const dialog = page.getByRole("dialog", { name: "Delete this session?" });
    await expect(dialog).toBeVisible();
    const confirm = dialog.getByRole("button", { name: "Delete session" });
    await confirm.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByText("Session deleted")).toBeVisible();
    await expect(row).toHaveCount(0);
  });

  test("searches for a session by title", async ({ page, trackSessionId }) => {
    const title = `E2E search ${randomUUID()}`;
    const { sessionId } = await createReadingSession(page, title);
    trackSessionId(sessionId);
    await page.goto("/history");
    await page.getByLabel("Search titles").fill(title);
    await expect(page.getByRole("row").filter({ hasText: title })).toBeVisible();
    await expect(
      page.getByText("No immersion sessions match your filters."),
    ).toHaveCount(0);
  });

  test("filters sessions by media type", async ({ page, trackSessionId }) => {
    const prefix = `E2E filter ${randomUUID()}`;
    const readingTitle = `${prefix} reading`;
    const audiovisualTitle = `${prefix} anime`;
    const audioTitle = `${prefix} podcast`;
    trackSessionId((await createReadingSession(page, readingTitle)).sessionId);
    trackSessionId((await createAudiovisualSession(page, audiovisualTitle)).sessionId);
    trackSessionId((await createAudioSession(page, audioTitle)).sessionId);
    await page.goto("/history");
    await page.getByLabel("Search titles").fill(prefix);
    const readingRow = page.getByRole("row").filter({ hasText: readingTitle });
    const audiovisualRow = page.getByRole("row").filter({ hasText: audiovisualTitle });
    const audioRow = page.getByRole("row").filter({ hasText: audioTitle });
    await expect(readingRow).toBeVisible();
    await expect(audiovisualRow).toBeVisible();
    await expect(audioRow).toBeVisible();

    await page.getByRole("tab", { name: "Reading", exact: true }).click();
    await expect(readingRow).toBeVisible();
    await expect(audiovisualRow).toHaveCount(0);
    await expect(audioRow).toHaveCount(0);

    await page.getByRole("tab", { name: "Audiovisual", exact: true }).click();
    await expect(audiovisualRow).toBeVisible();
    await expect(readingRow).toHaveCount(0);
    await expect(audioRow).toHaveCount(0);

    await page.getByRole("tab", { name: "Audio", exact: true }).click();
    await expect(audioRow).toBeVisible();
    await expect(readingRow).toHaveCount(0);
    await expect(audiovisualRow).toHaveCount(0);
  });

  test("filters sessions by date range", async ({ page, trackSessionId }) => {
    const search = `E2E date ${randomUUID()}`;
    const includedTitle = `${search} in range`;
    const excludedTitle = `${search} outside range`;
    const { createdAt, sessionId: includedId } = await createReadingSession(page, includedTitle);
    trackSessionId(includedId);
    const outsideRange = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
    trackSessionId((await createReadingSession(page, excludedTitle, outsideRange.toISOString())).sessionId);
    await page.goto("/history");
    await page.getByLabel("Search titles").fill(search);
    const includedRow = page.getByRole("row").filter({ hasText: includedTitle });
    const excludedRow = page.getByRole("row").filter({ hasText: excludedTitle });
    await expect(includedRow).toBeVisible();
    await expect(excludedRow).toBeVisible();
    await page.getByRole("button", { name: "Date range" }).click();
    const sessionDate = new Date(createdAt);

    function calendarDayButton(date: Date) {
      const dateWeekday = new Intl.DateTimeFormat("en-US", {
        weekday: "long",
        timeZone: "UTC",
      }).format(date);
      const dateMonth = new Intl.DateTimeFormat("en-US", {
        month: "long",
        timeZone: "UTC",
      }).format(date);
      const dateDay = date.getUTCDate();
      const dateOrdinal =
        dateDay % 10 === 1 && dateDay !== 11
          ? "st"
          : dateDay % 10 === 2 && dateDay !== 12
            ? "nd"
            : dateDay % 10 === 3 && dateDay !== 13
              ? "rd"
              : "th";
      return page.getByRole("grid").getByRole("button", {
        name: new RegExp(
          `${dateWeekday}, ${dateMonth} ${dateDay}${dateOrdinal}, ${date.getUTCFullYear()}`,
        ),
      });
    }
    const startDate = new Date(sessionDate);
    startDate.setUTCDate(startDate.getUTCDate() - 1);
    const startDateButton = calendarDayButton(startDate);
    const sessionDateButton = calendarDayButton(sessionDate);
    await startDateButton.click();
    await sessionDateButton.click();
    await page.getByRole("button", { name: "Apply", exact: true }).click();
    await expect(includedRow).toBeVisible();
    await expect(excludedRow).toHaveCount(0);
  });
});
