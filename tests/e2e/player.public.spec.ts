import { test, expect } from "@playwright/test";
import JSZip from "jszip";
test.use({ serviceWorkers: "block" });

test("public routes never expose authoring when no game is published", async ({
  page,
}) => {
  await page.route("**/game.story", (route) => route.fulfill({ status: 404 }));
  for (const path of ["/", "/editor", "/play"]) {
    await page.goto(path);
    await expect(page.getByText("Hra ešte nie je dostupná.")).toBeVisible();
    await expect(
      page.locator(".editor-shell, .story-library, input[type=file]"),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: /Vytvoriť|Upraviť|ukážkový/ }),
    ).toHaveCount(0);
  }
});

test("published story plays directly and saved progress survives reload", async ({
  page,
}) => {
  const scene = (id: string, ending: boolean) => ({
    id,
    name: id,
    text: id === "start" ? "Vitaj v hre." : "Zomrel si.",
    position: { x: 0, y: 0 },
    ending,
    actions: [],
    choices: [] as {
      id: string;
      text: string;
      targetSceneId: string;
      actions: never[];
    }[],
  });
  const start = scene("start", false),
    end = scene("end", true);
  start.choices.push({
    id: "choice",
    text: "Pokračovať v príbehu",
    targetSceneId: "end",
    actions: [],
  });
  const zip = new JSZip();
  zip.file(
    "story.json",
    JSON.stringify({
      story: {
        schemaVersion: 1,
        id: "published-game",
        title: "Moja hra",
        contentLanguage: "sk",
        startSceneId: "start",
        scenes: [start, end],
        variables: [],
        updatedAt: 1,
      },
      assets: [],
    }),
  );
  const body = await zip.generateAsync({ type: "nodebuffer" });
  await page.route("**/game.story", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/octet-stream",
      body,
    }),
  );
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Moja hra" })).toBeVisible();
  await page
    .getByRole("button", { name: "Začať odznova", exact: true })
    .click();
  await page.getByRole("button", { name: /Pokračovať v príbehu/ }).click();
  await expect(page.getByText("Zomrel si.", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "Ponuka", exact: true })
    .first()
    .click();
  await page.reload();
  await page.getByRole("button", { name: /^Pokračovať/ }).click();
  await expect(page.getByText("Zomrel si.", { exact: true })).toBeVisible();
  await expect(page.locator(".editor-shell, input[type=file]")).toHaveCount(0);
});
