import { test, expect } from "@playwright/test";
import JSZip from "jszip";
test.use({ serviceWorkers: "block" });
for (const desktop of [false, true])
  test(`custom scene appearance plays correctly on ${desktop ? "desktop" : "mobile"}`, async ({
    page,
  }) => {
    await page.setViewportSize(
      desktop ? { width: 1280, height: 720 } : { width: 390, height: 844 },
    );
    const box = {
      x: 10,
      y: 30,
      width: 70,
      fontSize: 24,
      color: "#ffffff",
      align: "center",
    };
    const answer = {
      ...box,
      y: 70,
      height: 10,
      background: "#ff0000",
      opacity: 0.5,
      radius: 30,
      borderColor: "#00ff00",
      borderWidth: 2,
    };
    const layout = { text: box, choices: { next: answer } };
    const story = {
      schemaVersion: 1,
      id: "visual-test",
      title: "Vzhľad",
      contentLanguage: "sk",
      updatedAt: 1,
      startSceneId: "a",
      variables: [],
      presentation: {
        font: "manrope",
        theme: "forest",
        showSceneNames: false,
        colors: {
          menuBackground: "#123456",
          text: "#ffcc00",
          title: "#abcdef",
          buttonBackground: "#112233",
          buttonText: "#aabbcc",
          buttonBorder: "#abcdef",
          timer: "#ffee00",
          controls: "#00ffaa",
          buttonOpacity: 0.6,
        },
      },
      scenes: [
        {
          id: "a",
          shade: false,
          name: "a",
          text: "Text v upravenej karte",
          position: { x: 0, y: 0 },
          ending: false,
          actions: [],
          choices: [
            { id: "next", text: "Odpoveď", targetSceneId: "b", actions: [] },
          ],
          visual: {
            mobile: layout,
            desktop: {
              text: { ...box, x: 20, width: 60 },
              choices: { next: { ...answer, x: 20, width: 60, radius: 5 } },
            },
          },
        },
        {
          id: "b",
          name: "b",
          text: "Ďalšia karta",
          position: { x: 400, y: 0 },
          ending: true,
          choices: [],
          actions: [],
        },
      ],
    };
    const zip = new JSZip();
    zip.file("story.json", JSON.stringify({ story, assets: [] }));
    const body = await zip.generateAsync({ type: "nodebuffer" });
    await page.route("**/game.story", (r) => r.fulfill({ status: 200, body }));
    await page.goto("/");
    await expect(page.locator(".player-shell")).toHaveCSS(
      "background-color",
      "rgb(18, 52, 86)",
    );
    await expect(page.locator(".player-menu h1")).toHaveCSS(
      "color",
      "rgb(171, 205, 239)",
    );
    await expect(page.locator(".menu-buttons button").first()).toHaveCSS(
      "color",
      "rgb(170, 187, 204)",
    );
    await page
      .getByRole("button", { name: "Začať odznova", exact: true })
      .click();
    const button = page.getByRole("button", { name: "Odpoveď", exact: true });
    await expect(page.locator(".player-shade")).toHaveCount(0);
    await expect(button).toHaveCSS("border-radius", desktop ? "5px" : "30px");
    await expect(button).toHaveCSS("background-color", "rgba(255, 0, 0, 0.5)");
    await expect(button).toHaveCSS("font-size", "24px");
    const viewport = page.viewportSize()!,
      bounds = await button.boundingBox();
    expect(
      Math.abs(bounds!.x - viewport.width * (desktop ? 0.2 : 0.1)),
    ).toBeLessThan(2);
    await expect
      .poll(async () =>
        Math.abs((await button.boundingBox())!.y - viewport.height * 0.7),
      )
      .toBeLessThan(2);
    await page.screenshot({
      path: `.verification/visual-player-${desktop ? "desktop" : "mobile"}.png`,
    });
    await button.click();
    await expect(page.locator(".story-prose")).toHaveText("Ďalšia karta");
    await expect(page.locator(".player-shade")).toHaveCount(1);
    await expect(page.locator(".story-prose")).toHaveCSS(
      "color",
      "rgb(255, 204, 0)",
    );
  });
