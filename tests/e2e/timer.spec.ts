import { test, expect } from "@playwright/test";
import JSZip from "jszip";
import { readFile } from "node:fs/promises";
test.use({ serviceWorkers: "block" });
test("timed centered timer appears over an image, pauses in menu and resets on reentry", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const base = {
    position: { x: 0, y: 0 },
    actions: [],
    ending: false,
    name: "Karta",
    text: "Obrázok",
  };
  const overlay = { enabled: true, startSeconds: 1, durationSeconds: 2 };
  const story = {
    schemaVersion: 1,
    id: "overlay",
    title: "Timer",
    contentLanguage: "sk",
    updatedAt: 1,
    startSceneId: "image",
    variables: [],
    timer: { enabled: true, durationSeconds: 600 },
    scenes: [
      {
        ...base,
        id: "image",
        imageId: "image",
        showTimer: false,
        timerOverlay: overlay,
        choices: [
          { id: "next", text: "Ďalej", targetSceneId: "disabled", actions: [] },
        ],
      },
      {
        ...base,
        id: "disabled",
        showTimer: true,
        timerOverlay: { ...overlay, enabled: false },
        choices: [
          { id: "back", text: "Znovu", targetSceneId: "image", actions: [] },
        ],
      },
    ],
  };
  const zip = new JSZip();
  zip.file(
    "assets/images/image",
    '<svg xmlns="http://www.w3.org/2000/svg" width="941" height="1672"><rect width="100%" height="100%" fill="#333"/></svg>',
  );
  zip.file(
    "story.json",
    JSON.stringify({
      story,
      assets: [
        {
          id: "image",
          name: "image.svg",
          kind: "image",
          mime: "image/svg+xml",
          path: "assets/images/image",
        },
      ],
    }),
  );
  const body = await zip.generateAsync({ type: "nodebuffer" });
  await page.route("**/game.story", (r) => r.fulfill({ status: 200, body }));
  await page.clock.install();
  await page.goto("/");
  await page
    .getByRole("button", { name: "Začať odznova", exact: true })
    .click();
  await expect(page.getByRole("timer")).toHaveCount(0);
  await page.clock.fastForward(1100);
  await expect(page.getByRole("timer")).toHaveText("09:59");
  const box = await page.locator(".player-countdown strong").boundingBox();
  expect(Math.abs(box!.x + box!.width / 2 - 195)).toBeLessThan(2);
  expect(Math.abs(box!.y + box!.height / 2 - 422)).toBeLessThan(2);
  await expect(page.locator(".player-background")).toBeVisible();
  await page.getByRole("button", { name: "Ponuka", exact: true }).click();
  await page.clock.fastForward(5000);
  await page.getByRole("button", { name: /Pokračovať/ }).click();
  await expect(page.getByRole("timer")).toHaveText("09:59");
  await page.clock.fastForward(2100);
  await expect(page.getByRole("timer")).toHaveCount(0);
  await page.getByRole("button", { name: /Ďalej/ }).click();
  await page.clock.fastForward(1500);
  await expect(page.getByRole("timer")).toHaveText(/^\d{2}:\d{2}$/);
  await expect(page.getByRole("timer")).toHaveCSS(
    "background-color",
    "rgba(0, 0, 0, 0)",
  );
  await expect(page.getByRole("timer")).toHaveCSS("border-top-width", "0px");
  await expect(page.getByRole("timer")).toHaveCSS(
    "color",
    "rgb(255, 255, 255)",
  );
  await expect(
    page.getByRole("button", { name: "Ponuka", exact: true }),
  ).toHaveText("I");
  await expect(
    page.getByRole("button", { name: "Ponuka", exact: true }),
  ).toHaveCSS("border-top-width", "0px");
  await page.getByRole("button", { name: /Znovu/ }).click();
  await expect(page.getByRole("timer")).toHaveCount(0);
  await page.clock.fastForward(1100);
  await expect(page.getByRole("timer")).toBeVisible();
});

test("timer overlays a playing video for two seconds without interrupting it", async ({
  page,
}) => {
  const zip = await JSZip.loadAsync(await readFile("public/game.story"));
  const raw = JSON.parse(await zip.file("story.json")!.async("string"));
  const scene = raw.story.scenes.find((s: { videoId?: string }) => !!s.videoId);
  expect(scene?.videoId).toBeTruthy();
  raw.story.startSceneId = scene.id;
  delete scene.autoAdvance;
  scene.ending = false;
  scene.timerOnly = false;
  raw.story.timer = { enabled: true, durationSeconds: 600 };
  scene.showTimer = false;
  scene.timerOverlay = { enabled: true, startSeconds: 0, durationSeconds: 2 };
  zip.file("story.json", JSON.stringify(raw));
  const body = await zip.generateAsync({ type: "nodebuffer" });
  await page.route("**/game.story", (r) => r.fulfill({ status: 200, body }));
  await page.goto("/");
  await page
    .getByRole("button", { name: "Začať odznova", exact: true })
    .click();
  await expect(page.locator(".player-countdown.is-centered")).toBeVisible();
  const video = page.locator(".player-video");
  await expect
    .poll(() => video.evaluate((el) => (el as HTMLVideoElement).currentTime))
    .toBeGreaterThan(2.2);
  await expect(page.getByRole("timer")).toHaveCount(0);
  expect(await video.evaluate((el) => (el as HTMLVideoElement).paused)).toBe(
    false,
  );
  await expect(
    page.getByRole("button", { name: "Pozastaviť video", exact: true }),
  ).toHaveCount(0);
  await page.screenshot({ path: ".verification/player-clean-controls.png" });
});
test("timer-only interlude shows only the global countdown and advances after its duration", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const base = {
    position: { x: 0, y: 0 },
    actions: [],
    choices: [],
    ending: false,
  };
  const story = {
    schemaVersion: 1,
    id: "timer-only-test",
    title: "Napätie",
    contentLanguage: "sk",
    startSceneId: "pause",
    updatedAt: 1,
    variables: [],
    timer: { enabled: true, durationSeconds: 600, targetSceneId: "end" },
    scenes: [
      {
        ...base,
        id: "pause",
        name: "Nemá byť viditeľné",
        text: "Skrytý text",
        timerOnly: true,
        showTimer: false,
        imageId: "unused-image",
        videoId: "unused-video",
        autoAdvance: { delaySeconds: 3, targetSceneId: "next" },
      },
      {
        ...base,
        id: "next",
        name: "next",
        text: "Príbeh pokračuje",
        showTimer: true,
      },
      { ...base, id: "end", name: "end", text: "Koniec", ending: true },
    ],
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
  await expect(page.getByRole("timer")).toHaveText("10:00");
  await expect(
    page.locator(
      ".player-shell button, .player-top, .scene-content, .player-video, .player-background",
    ),
  ).toHaveCount(0);
  const position = await page.locator(".player-countdown strong").boundingBox();
  expect(Math.abs(position!.x + position!.width / 2 - 195)).toBeLessThan(2);
  expect(Math.abs(position!.y + position!.height / 2 - 422)).toBeLessThan(2);
  await page.clock.fastForward(1000);
  await expect(page.getByRole("timer")).toHaveText("09:59");
  await page.clock.fastForward(2001);
  await expect(page.locator(".story-prose")).toHaveText("Príbeh pokračuje");
  await expect(page.locator(".player-countdown.is-centered")).toHaveCount(0);
  await expect(page.getByRole("timer")).toContainText("09:57");
});
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
