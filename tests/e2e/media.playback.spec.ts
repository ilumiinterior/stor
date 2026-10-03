import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import JSZip from "jszip";
test.use({ serviceWorkers: "block" });

test("automatic death video and following voice play audibly even when native audible autoplay is rejected", async ({
  page,
}) => {
  test.setTimeout(60000);
  const bytes = await readFile("public/game.story").catch(() => null);
  test.skip(!bytes, "No published story.");
  const zip = await JSZip.loadAsync(bytes!);
  const raw = JSON.parse(await zip.file("story.json")!.async("string"));
  const scene = raw.story.scenes.find(
    (s: { name: string }) => s.name === "Neber si to osobne",
  );
  test.skip(
    !scene?.videoId,
    "This export does not contain the regression scene.",
  );
  raw.story.startSceneId = scene.id;
  zip.file("story.json", JSON.stringify(raw));
  const body = await zip.generateAsync({ type: "nodebuffer" });
  await page.route("**/game.story", (route) =>
    route.fulfill({ status: 200, body }),
  );
  await page.addInitScript(() => {
    const nativePlay = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () {
      if (!this.muted)
        return Promise.reject(
          new DOMException("Audible autoplay rejected", "NotAllowedError"),
        );
      return nativePlay.call(this);
    };
    const gains: AnalyserNode[] = [];
    const createGain = AudioContext.prototype.createGain;
    AudioContext.prototype.createGain = function () {
      const gain = createGain.call(this);
      const analyser = this.createAnalyser();
      analyser.fftSize = 256;
      gain.connect(analyser);
      gains.push(analyser);
      return gain;
    };
    Object.assign(window, {
      audioProbe: () =>
        gains.map((analyser) => {
          const samples = new Float32Array(analyser.fftSize);
          analyser.getFloatTimeDomainData(samples);
          return Math.max(...samples.map(Math.abs));
        }),
    });
  });
  page.on("dialog", (dialog) => void dialog.accept());
  for (let attempt = 0; attempt < 3; attempt++) {
    await page.goto("/");
    await page
      .getByRole("button", { name: "Začať odznova", exact: true })
      .click();
    const video = page.locator(".player-video");
    await expect
      .poll(() => video.evaluate((el) => (el as HTMLVideoElement).currentTime))
      .toBeGreaterThan(0);
    await expect(page.locator(".player-shell button")).toHaveCount(0);
    await expect
      .poll(() =>
        page.evaluate(() => {
          const probe = (window as unknown as { audioProbe: () => number[] })
            .audioProbe;
          return Math.max(0, ...probe());
        }),
      )
      .toBeGreaterThan(0.001);
    await expect(video).toHaveCount(0, { timeout: 7000 });
    await expect(
      page.getByText("Koniec príbehu", { exact: true }),
    ).toBeVisible();
    await expect
      .poll(() =>
        page.evaluate(() => {
          const values = (
            window as unknown as { audioProbe: () => number[] }
          ).audioProbe();
          return values.length >= 2 ? values[values.length - 1] : 0;
        }),
      )
      .toBeGreaterThan(0.001);
    await expect(
      page.getByText(
        "Zvuk sa nepodarilo spustiť. Skontrolujte nastavenia zvuku.",
      ),
    ).toHaveCount(0);
  }
});
