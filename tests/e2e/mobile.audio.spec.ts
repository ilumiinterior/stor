import { test, expect } from "@playwright/test";
import JSZip from "jszip";
import { readFile } from "node:fs/promises";
test.use({
  serviceWorkers: "block",
  hasTouch: true,
  viewport: { width: 390, height: 844 },
  userAgent:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0.0.0 Mobile/15E148 Safari/604.1",
});

for (const hasSession of [true, false]) {
  test(`tap unlocks video and ending voice with ${hasSession ? "playback session" : "native media output without session API"}`, async ({
    page,
  }) => {
    const bytes = await readFile("public/game.story").catch(() => null);
    test.skip(!bytes, "No published story.");
    const zip = await JSZip.loadAsync(bytes!);
    const raw = JSON.parse(await zip.file("story.json")!.async("string"));
    const scene = raw.story.scenes.find(
      (s: { name: string }) => s.name === "Neber si to osobne",
    );
    test.skip(!scene?.videoId, "No regression scene in this story.");
    raw.story.startSceneId = scene.id;
    zip.file("story.json", JSON.stringify(raw));
    const body = await zip.generateAsync({ type: "nodebuffer" });
    await page.route("**/game.story", (route) =>
      route.fulfill({ status: 200, body }),
    );
    await page.addInitScript(
      ({ hasSession }) => {
        const outputs: HTMLMediaElement[] = [];
        let gesture = false,
          primed = false,
          legacyStarted = false;
        const session = { type: "auto" };
        Object.defineProperty(navigator, "audioSession", {
          configurable: true,
          value: hasSession ? session : undefined,
        });
        window.addEventListener(
          "click",
          () => {
            gesture = true;
            setTimeout(() => {
              gesture = false;
            });
          },
          true,
        );
        const createSource = AudioContext.prototype.createBufferSource;
        AudioContext.prototype.createBufferSource = function () {
          const source = createSource.call(this);
          const start = source.start;
          source.start = function (
            ...args: Parameters<AudioBufferSourceNode["start"]>
          ) {
            if (gesture && this.buffer?.length === 1) primed = true;
            if (!primed)
              throw new DOMException(
                "Audio output must be primed inside a tap",
                "NotAllowedError",
              );
            return start.apply(this, args);
          };
          return source;
        };
        const nativePlay = HTMLMediaElement.prototype.play;
        HTMLMediaElement.prototype.play = function () {
          if (!this.muted) {
            if (!gesture && !outputs.includes(this))
              return Promise.reject(
                new DOMException("Tap required", "NotAllowedError"),
              );
            if (this.srcObject instanceof MediaStream) {
              legacyStarted = true;
              outputs.push(this);
            }
          }
          return nativePlay.call(this);
        };
        const analysers: AnalyserNode[] = [];
        const createGain = AudioContext.prototype.createGain;
        AudioContext.prototype.createGain = function () {
          const gain = createGain.call(this),
            analyser = this.createAnalyser();
          gain.connect(analyser);
          analysers.push(analyser);
          return gain;
        };
        Object.assign(window, {
          mobileProbe: () => ({
            primed,
            legacyStarted,
            outputPlaying:
              outputs.length > 0 &&
              !outputs[0].paused &&
              outputs[0].currentTime > 0,
            session: session.type,
            peaks: analysers.map((analyser) => {
              const samples = new Float32Array(analyser.fftSize);
              analyser.getFloatTimeDomainData(samples);
              return Math.max(...samples.map(Math.abs));
            }),
          }),
        });
      },
      { hasSession },
    );
    await page.goto("/");
    await page
      .getByRole("button", { name: "Začať odznova", exact: true })
      .tap();
    const probe = () =>
      page.evaluate(() =>
        (
          window as unknown as {
            mobileProbe: () => {
              primed: boolean;
              legacyStarted: boolean;
              outputPlaying: boolean;
              session: string;
              peaks: number[];
            };
          }
        ).mobileProbe(),
      );
    expect((await probe()).primed).toBe(true);
    if (hasSession) expect((await probe()).session).toBe("playback");
    expect((await probe()).legacyStarted).toBe(true);
    await expect.poll(async () => (await probe()).outputPlaying).toBe(true);
    await expect
      .poll(async () => Math.max(0, ...(await probe()).peaks))
      .toBeGreaterThan(0.001);
    await expect(page.locator(".player-video")).toHaveCount(0, {
      timeout: 7000,
    });
    await expect
      .poll(async () => {
        const peaks = (await probe()).peaks;
        return peaks.length >= 2 ? peaks[peaks.length - 1] : 0;
      })
      .toBeGreaterThan(0.001);
  });
}

test("silent choice scene pauses the iPhone output and the next voice resumes it", async ({ page }) => {
  await page.addInitScript(() => {
    const outputs: HTMLMediaElement[] = [];
    const play = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () {
      if (this.srcObject instanceof MediaStream && !outputs.includes(this))
        outputs.push(this);
      return play.call(this);
    };
    Object.assign(window, {
      outputPaused: () => outputs.length === 1 && outputs[0].paused,
    });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Začať odznova", exact: true }).tap();
  await expect(page.locator(".player-video")).toHaveCount(1);
  await expect(page.getByRole("button", { name: /Mars/ })).toBeVisible({ timeout: 30000 });
  const paused = () => page.evaluate(() =>
    (window as unknown as { outputPaused: () => boolean }).outputPaused(),
  );
  await expect.poll(paused).toBe(true);
  await page.waitForTimeout(500);
  expect(await paused()).toBe(true);
  await page.getByRole("button", { name: /Mars/ }).tap();
  await expect.poll(paused).toBe(false);
});
