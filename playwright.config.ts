import { defineConfig, devices } from "@playwright/test";
import { existsSync } from "node:fs";

const credentialsFile = "playwright/credentials.local.json";
const hasCredentials = existsSync(credentialsFile);
const authState =
  process.env.E2E_AUTH_STATE ??
  (hasCredentials ? "playwright/.auth/user.json" : undefined);

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: hasCredentials
    ? [
        { name: "setup", testMatch: /auth\.setup\.ts/ },
        {
          name: "chromium",
          use: {
            ...devices["Desktop Chrome"],
            storageState: authState,
          },
          dependencies: ["setup"],
        },
      ]
    : [
        {
          name: "chromium",
          use: { ...devices["Desktop Chrome"], storageState: authState },
        },
      ],
  webServer: {
    command: process.env.CI ? "bun run build && bun run start" : "bun run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
