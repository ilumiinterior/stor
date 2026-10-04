import { test, expect } from "@playwright/test";
import JSZip from "jszip";
import { readFile } from "node:fs/promises";
test.use({ serviceWorkers: "block" });
for (const mobile of [false, true])
  test(`custom menu image and grid work on ${mobile ? "mobile" : "desktop"}`, async ({
    page,
  }) => {
    await page.setViewportSize(
      mobile ? { width: 390, height: 844 } : { width: 1280, height: 800 },
    );
    const zip = await JSZip.loadAsync(await readFile("public/game.story"));
    const raw = JSON.parse(await zip.file("story.json")!.async("string"));
    const asset = raw.assets.find((a: { kind: string }) => a.kind === "image");
    expect(asset).toBeTruthy();
    raw.story.mainMenu = {
      backgroundId: asset.id,
      customLayout: true,
      buttons: {
        newStory: { column: 1, row: 4, width: 5, height: 2 },
        settings: { column: 7, row: 10, width: 6, height: 2 },
      },
    };
    zip.file("story.json", JSON.stringify(raw));
    const body = await zip.generateAsync({ type: "nodebuffer" });
    await page.route("**/game.story", (r) => r.fulfill({ status: 200, body }));
    await page.goto("/");
    await expect(page.locator(".menu-background")).toBeVisible();
    const start = page.getByRole("button", {
      name: "Začať odznova",
      exact: true,
    });
    await expect(start).toHaveCSS("grid-column-start", "1");
    await expect(start).toHaveCSS("grid-row-start", "4");
    const settings = page.getByRole("button", {
      name: "Nastavenia",
      exact: true,
    });
    await expect(settings).toHaveCSS("grid-column-start", "7");
    await settings.click();
    await expect(page.locator(".menu-background")).toBeVisible();
    await page.getByRole("button", { name: "Zavrieť", exact: true }).click();
    await page.screenshot({
      path: `.verification/main-menu-${mobile ? "mobile" : "desktop"}.png`,
    });
    await start.click();
    await expect(page.locator(".menu-background")).toHaveCount(0);
  });
test("menu video loops silently and stops when the game starts", async ({
  page,
}) => {
  const zip = await JSZip.loadAsync(await readFile("public/game.story"));
  const raw = JSON.parse(await zip.file("story.json")!.async("string"));
  const asset = raw.assets.find((a: { kind: string }) => a.kind === "video");
  expect(asset).toBeTruthy();
  raw.story.mainMenu = {
    backgroundId: asset.id,
    customLayout: false,
    buttons: {},
  };
  zip.file("story.json", JSON.stringify(raw));
  const body = await zip.generateAsync({ type: "nodebuffer" });
  await page.route("**/game.story", (r) => r.fulfill({ status: 200, body }));
  await page.goto("/");
  const video = page.locator("video.menu-background");
  await expect
    .poll(() => video.evaluate((el) => (el as HTMLVideoElement).currentTime))
    .toBeGreaterThan(0.3);
  expect(
    await video.evaluate((el) => ({
      muted: (el as HTMLVideoElement).muted,
      loop: (el as HTMLVideoElement).loop,
    })),
  ).toEqual({ muted: true, loop: true });
  await page
    .getByRole("button", { name: "Začať odznova", exact: true })
    .click();
  await expect(video).toHaveCount(0);
});
