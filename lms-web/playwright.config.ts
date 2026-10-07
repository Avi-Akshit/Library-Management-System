import { defineConfig, devices } from "@playwright/test";
import path from "node:path";

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  fullyParallel: false,
  retries: 0,
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], channel: "chrome" } }],
  webServer: [
    {
      command: "npm run build && node dist/src/e2eServer.js",
      cwd: "../lms-backend",
      url: "http://localhost:4000/health",
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
      env: {
        MONGOMS_DOWNLOAD_DIR: path.resolve("../lms-backend/node_modules/.cache/mongodb-memory-server"),
      },
    },
    {
      command: "npm run dev",
      cwd: ".",
      url: "http://localhost:3000",
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: { NEXT_PUBLIC_API_URL: "http://localhost:4000" },
    },
  ],
});
