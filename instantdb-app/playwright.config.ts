import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 90_000,
  expect: { timeout: 20_000 },
  fullyParallel: false, // tests share InstantDB state — run sequentially
  retries: 1,
  use: {
    baseURL: "http://localhost:3000",
    headless: true,
  },
  webServer: [
    {
      command: "NEXT_PUBLIC_DEV_USER_EMAIL=mailsiraj@gmail.com npm run dev -- --port 3000",
      port: 3000,
      reuseExistingServer: true,
      timeout: 60_000,
    },
    {
      command: "NEXT_PUBLIC_DEV_USER_EMAIL=noone@example.com NEXT_DIST_DIR=.next-unauth npm run dev -- --port 3001",
      port: 3001,
      reuseExistingServer: true,
      timeout: 60_000,
    },
  ],
  projects: [
    {
      name: "chromium",
      testIgnore: /unauthorized\.spec\.ts/,
      use: { browserName: "chromium" },
    },
    {
      name: "chromium-unauthorized",
      testMatch: /unauthorized\.spec\.ts/,
      use: { browserName: "chromium" },
    },
  ],
});
