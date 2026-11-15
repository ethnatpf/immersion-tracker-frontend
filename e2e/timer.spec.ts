import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { expect, test } from "./test-fixtures";
import { chooseFirstLanguage } from "./session-helpers";

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

test("starts a timer and finishes it into an immersion session", async ({
  page,
  trackTimerTitle,
  trackSessionId,
}) => {
  const title = `E2E timer ${randomUUID()}`;
  trackTimerTitle(title);
  await page.goto("/");
  await page
    .getByRole("complementary")
    .getByRole("button", { name: "Start timer" })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Start an immersion timer" }),
  ).toBeVisible();
  await chooseFirstLanguage(page);
  const picker = page.getByRole("combobox", { name: "Title / search" });
  await picker.fill(title);
  await page
    .getByRole("option", { name: `Create new content: ${title}`, exact: true })
    .click();
  await page.getByRole("button", { name: "Start timer", exact: true }).last().click();
  const timer = page.getByRole("region", { name: "Active immersion timer" });
  await expect(timer).toContainText(title);
  const sessionResponse = page.waitForResponse((response) =>
    response.url().includes("/api/backend/timer/stop") &&
    response.request().method() === "POST",
  );
  await timer.getByRole("button", { name: "Finish & log" }).click();
  trackSessionId(((await (await sessionResponse).json()) as { _id: string })._id);
  await expect(page.getByText("Session logged.")).toBeVisible();
  await page.goto("/history");
  await page.getByLabel("Search titles").fill(title);
  await expect(page.getByRole("link", { name: title, exact: true })).toBeVisible();
});
