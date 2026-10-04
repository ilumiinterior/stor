import { test, expect } from "@playwright/test";
import JSZip from "jszip";
test.use({ serviceWorkers: "block" });
test("countdown pauses in menu, persists on reload and expires even in a hidden scene", async ({
  page,
}) => {
  const scene = (id: string, ending = false, showTimer = true) => ({
    id,
    name: id,
    text: id,
    position: { x: 0, y: 0 },
    ending,
    showTimer,
    actions: [],
    choices: [],
  });
  const start = {
    ...scene("start"),
    choices: [
      { id: "hide", text: "Skryť čas", targetSceneId: "hidden", actions: [] },
    ],
  };
  const story = {
    schemaVersion: 1,
    id: "timer-test",
    title: "Odpočet",
    contentLanguage: "sk",
    startSceneId: "start",
    updatedAt: 1,
    variables: [],
    timer: { enabled: true, durationSeconds: 600, targetSceneId: "end" },
    scenes: [start, scene("hidden", false, false), scene("end", true, false)],
  };
  const zip = new JSZip();
  zip.file("story.json", JSON.stringify({ story, assets: [] }));
  const body = await zip.generateAsync({ type: "nodebuffer" });
  await page.route("**/game.story", (route) =>
    route.fulfill({ status: 200, body }),
  );
  await page.clock.install();
  await page.goto("/");
  await page
    .getByRole("button", { name: "Začať odznova", exact: true })
    .click();
  await expect(page.getByRole("timer")).toContainText("10:00");
  await page.clock.fastForward(120000);
  await expect(page.getByRole("timer")).toContainText("08:00");
  await page.getByRole("button", { name: "Ponuka", exact: true }).click();
  await page.clock.fastForward(900000);
  await page.getByRole("button", { name: /Pokračovať/ }).click();
  await expect(page.getByRole("timer")).toContainText("08:00");
  await page.getByRole("button", { name: /Skryť čas/ }).click();
  await expect(page.getByRole("timer")).toHaveCount(0);
  await page.getByRole("button", { name: "Ponuka", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Odpočet", exact: true }),
  ).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: /Pokračovať/ }).click();
  await expect(page.locator(".story-prose")).toHaveText("hidden");
  await page.clock.fastForward(480100);
  await expect(page.locator(".story-prose")).toHaveText("end");
  await expect(page.getByRole("timer")).toHaveCount(0);
  await page.clock.fastForward(600000);
  await expect(page.locator(".story-prose")).toHaveText("end");
});
