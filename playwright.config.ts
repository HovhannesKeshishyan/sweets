import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3100);
const baseURL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
    // Optional: point at a locally installed Chromium instead of `npx playwright install`.
    launchOptions: {
      executablePath: process.env.E2E_CHROMIUM_PATH || undefined,
    },
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  // Runs against the production build. Build first with `npm run build`.
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: "node .output/server/index.mjs",
        url: baseURL,
        env: { PORT: String(PORT) },
        reuseExistingServer: !process.env.CI,
        timeout: 60_000,
      },
});
