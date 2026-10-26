import { mkdir, readFile } from "node:fs/promises";
import { dirname } from "node:path";
import { expect, test as setup } from "@playwright/test";

const credentialsPath = "playwright/credentials.local.json";
const authStatePath =
  process.env.E2E_AUTH_STATE ?? "playwright/.auth/user.json";

setup("sign in with the local E2E account", async ({ page }) => {
  const credentials = JSON.parse(await readFile(credentialsPath, "utf8")) as {
    email: string;
    password: string;
  };

  if (!credentials.email || !credentials.password) {
    throw new Error(`Add an email and password to ${credentialsPath}.`);
  }

  await page.goto("/auth/login");
  await page.getByLabel(/email address/i).fill(credentials.email);
  await page.getByRole("textbox", { name: "Password" }).fill(credentials.password);
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page).toHaveURL(/localhost:3000\/(?!auth\/)/);
  await mkdir(dirname(authStatePath), { recursive: true });
  await page.context().storageState({ path: authStatePath });
});
