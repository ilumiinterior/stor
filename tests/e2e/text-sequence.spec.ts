import { test, expect } from "@playwright/test";
import JSZip from "jszip";
import { readFile } from "node:fs/promises";
test.use({ serviceWorkers: "block" });
test("six-second scene shows text for three seconds each and pauses in the background", async ({
  page,
}) => {
  const base = {
    position: { x: 0, y: 0 },
    actions: [],
    choices: [],
    ending: false,
  };
  const story = {
    schemaVersion: 1,
    id: "text-parts",
    title: "Dve časti",
    contentLanguage: "sk",
    startSceneId: "split",
    updatedAt: 1,
    variables: [],
    scenes: [
      {
        ...base,
        id: "split",
        name: "split",
        text: "Prvá časť",
        textSequence: {
          enabled: true,
          secondText: "Druhá časť",
          durationSeconds: 99,
        },
        autoAdvance: { delaySeconds: 6, targetSceneId: "next" },
      },
      {
        ...base,
        id: "next",
        name: "next",
        text: "Ďalšia karta",
        choices: [
          {
            id: "again",
            text: "Zopakovať",
            targetSceneId: "split",
            actions: [],
          },
        ],
      },
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
  await expect(page.locator(".story-prose")).toHaveText("Prvá časť");
  await page.clock.fastForward(2700);
  await expect(page.locator(".story-prose")).toHaveText("Prvá časť");
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.clock.fastForward(60000);
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: false,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(page.locator(".story-prose")).toHaveText("Prvá časť");
  await page.clock.fastForward(400);
  await expect(page.locator(".story-prose")).toHaveText("Druhá časť");
  await page.clock.fastForward(2800);
  await expect(page.locator(".story-prose")).toHaveText("Druhá časť");
  await page.clock.fastForward(200);
  await expect(page.locator(".story-prose")).toHaveText("Ďalšia karta");
  await page.getByRole("button", { name: /Zopakovať/ }).click();
  await expect(page.locator(".story-prose")).toHaveText("Prvá časť");
});
test("manual text durations do not cut a video short after autoplay recovery", async ({
  page,
}) => {
  const zip = await JSZip.loadAsync(await readFile("public/game.story"));
  const raw = JSON.parse(await zip.file("story.json")!.async("string"));
  const scene = raw.story.scenes.find(
    (s: { name: string }) => s.name === "Neber si to osobne",
  );
  test.skip(!scene?.videoId, "No video fixture.");
  raw.story.startSceneId = scene.id;
  scene.autoAdvance.delaySeconds = 1;
  scene.text = "Krátka prvá";
  scene.textSequence = {
    enabled: true,
    secondText: "Krátka druhá",
    durationSeconds: 6,
    firstDurationSeconds: 0.5,
    secondDurationSeconds: 0.5,
  };
  zip.file("story.json", JSON.stringify(raw));
  const body = await zip.generateAsync({ type: "nodebuffer" });
  await page.route("**/game.story", (route) =>
    route.fulfill({ status: 200, body }),
  );
  await page.addInitScript(() => {
    let rejected = false;
    const play = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () {
      if (this instanceof HTMLVideoElement && !rejected) {
        rejected = true;
        setTimeout(() => {
          Object.defineProperty(document, "hidden", {
            configurable: true,
            value: true,
          });
          document.dispatchEvent(new Event("visibilitychange"));
        }, 100);
        setTimeout(() => {
          Object.defineProperty(document, "hidden", {
            configurable: true,
            value: false,
          });
          document.dispatchEvent(new Event("visibilitychange"));
        }, 300);
        return Promise.reject(
          new DOMException("Initial autoplay denied", "NotAllowedError"),
        );
      }
      return play.call(this);
    };
  });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Začať odznova", exact: true })
    .click();
  await expect(page.locator(".story-prose")).toHaveText("Krátka druhá", {
    timeout: 2500,
  });
  await expect(page.locator(".story-prose")).toHaveCount(0);
  const video = page.locator(".player-video");
  await expect
    .poll(() => video.evaluate((el) => (el as HTMLVideoElement).currentTime))
    .toBeGreaterThan(2);
  await expect(video).toHaveCount(0, { timeout: 4000 });
});
test("video text changes at the video's midpoint rather than the fallback scene duration", async ({
  page,
}) => {
  const zip = await JSZip.loadAsync(await readFile("public/game.story"));
  const raw = JSON.parse(await zip.file("story.json")!.async("string"));
  const scene = raw.story.scenes.find(
    (s: { name: string }) => s.name === "Neber si to osobne",
  );
  test.skip(!scene?.videoId, "No video fixture in this story.");
  raw.story.startSceneId = scene.id;
  scene.text = "Prvá polovica videa";
  scene.textSequence = {
    enabled: true,
    secondText: "Druhá polovica videa",
    durationSeconds: 99,
  };
  zip.file("story.json", JSON.stringify(raw));
  const body = await zip.generateAsync({ type: "nodebuffer" });
  await page.route("**/game.story", (route) =>
    route.fulfill({ status: 200, body }),
  );
  await page.goto("/");
  await page
    .getByRole("button", { name: "Začať odznova", exact: true })
    .click();
  await expect(page.locator(".story-prose")).toHaveText("Prvá polovica videa");
  await expect(page.locator(".story-prose")).toHaveText(
    "Druhá polovica videa",
    { timeout: 3500 },
  );
  await expect(page.locator(".player-video")).toHaveCount(0, { timeout: 4000 });
});
