import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "tests/e2e",
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:4173",
    launchOptions: {
      executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
    },
    headless: true,
  },
  webServer: {
    command: "npm.cmd run preview",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: true,
  },
  timeout: 30000,
});
