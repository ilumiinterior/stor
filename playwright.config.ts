import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "tests/e2e",
  testMatch: [
    "player.public.spec.ts",
    "player.offline.spec.ts",
    "media.playback.spec.ts",
    "mobile.audio.spec.ts",
    "timer.spec.ts",
  ],
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:4173",
    launchOptions: {
      executablePath:
        process.platform === "win32"
          ? "C:/Program Files/Google/Chrome/Application/chrome.exe"
          : undefined,
    },
    headless: true,
  },
  webServer: {
    command:
      process.platform === "win32" ? "npm.cmd run preview" : "npm run preview",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: true,
  },
  timeout: 30000,
});
