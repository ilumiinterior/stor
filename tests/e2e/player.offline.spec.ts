import { test, expect } from "@playwright/test";
import { readFile, writeFile, unlink } from "node:fs/promises";
import JSZip from "jszip";

test("the published game loads offline with saved progress", async ({
  page,
  context,
}) => {
  const path = "dist/game.story";
  const previous = await readFile(path).catch(() => null);
  const zip = new JSZip();
  zip.file(
    "story.json",
    JSON.stringify({
      story: {
        schemaVersion: 1,
        id: "offline-published",
        title: "Offline hra",
        contentLanguage: "sk",
        startSceneId: "one",
        variables: [],
        updatedAt: 1,
        scenes: [
          {
            id: "one",
            name: "one",
            text: "Offline príbeh.",
            position: { x: 0, y: 0 },
            ending: true,
            actions: [],
            choices: [],
          },
        ],
      },
      assets: [],
    }),
  );
  await writeFile(path, await zip.generateAsync({ type: "nodebuffer" }));
  try {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "Offline hra" }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Začať odznova", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Ponuka", exact: true })
      .first()
      .click();
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
    });
    await page.reload();
    await expect
      .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller))
      .toBe(true);
    await expect(
      page.getByRole("heading", { name: "Offline hra" }),
    ).toBeVisible();
    await expect
      .poll(() =>
        page.evaluate(async () => !!(await caches.match("/game.story"))),
      )
      .toBe(true);
    await context.setOffline(true);
    await page.reload();
    await page.getByRole("button", { name: /^Pokračovať/ }).click();
    await expect(
      page.getByText("Offline príbeh.", { exact: true }),
    ).toBeVisible();
  } finally {
    await context.setOffline(false);
    if (previous) await writeFile(path, previous);
    else await unlink(path);
  }
});
