import { test, expect, type Page } from "@playwright/test";
import JSZip from "jszip";
import { readFile } from "node:fs/promises";
test.use({
  serviceWorkers: "block",
  hasTouch: true,
  viewport: { width: 390, height: 844 },
  userAgent:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0.0.0 Mobile/15E148 Safari/604.1",
});
function installProbe(hasSession: boolean) {
  const outputs: HTMLAudioElement[] = [];
  const session = { type: "auto" };
  Object.defineProperty(navigator, "audioSession", {
    configurable: true,
    value: hasSession ? session : undefined,
  });
  AudioContext.prototype.createMediaStreamDestination = () => {
    throw Error("Live stream output is broken on this device");
  };
  let gesture = false;
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
  const play = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function () {
    if (this instanceof HTMLAudioElement && !outputs.includes(this)) {
      if (!gesture)
        return Promise.reject(
          new DOMException("Tap required", "NotAllowedError"),
        );
      outputs.push(this);
      if (!hasSession)
        this.addEventListener(
          "ended",
          (event) => event.stopImmediatePropagation(),
          true,
        );
    }
    return play.call(this);
  };
  Object.assign(window, {
    mobileProbe: () => ({
      session: session.type,
      outputs: outputs.map((audio) => ({
        src: audio.src,
        paused: audio.paused,
        muted: audio.muted,
        time: audio.currentTime,
        duration: audio.duration,
        loop: audio.loop,
        live: audio.srcObject !== null,
      })),
    }),
  });
}
type Probe = {
  session: string;
  outputs: {
    src: string;
    paused: boolean;
    muted: boolean;
    time: number;
    duration: number;
    loop: boolean;
    live: boolean;
  }[];
};
async function pcmPeak(page: Page, index: number) {
  return page.evaluate(async (index) => {
    const probe = (
      window as unknown as { mobileProbe: () => Probe }
    ).mobileProbe();
    const bytes = await (await fetch(probe.outputs[index].src)).arrayBuffer();
    const view = new DataView(bytes);
    if (view.getUint32(0) !== 0x52494646)
      throw Error("Expected finite RIFF audio");
    let peak = 0;
    for (let offset = 44; offset + 1 < bytes.byteLength; offset += 2)
      peak = Math.max(peak, Math.abs(view.getInt16(offset, true)) / 32768);
    return peak;
  }, index);
}
for (const hasSession of [true, false]) {
  test(`iPhone finite video and ending audio stop with ${hasSession ? "session API" : "no session API or end callback"}`, async ({
    page,
  }) => {
    const zip = await JSZip.loadAsync(await readFile("public/game.story"));
    const raw = JSON.parse(await zip.file("story.json")!.async("string"));
    const scene = raw.story.scenes.find(
      (s: { name: string }) => s.name === "Neber si to osobne",
    );
    raw.story.startSceneId = scene.id;
    zip.file("story.json", JSON.stringify(raw));
    const body = await zip.generateAsync({ type: "nodebuffer" });
    await page.route("**/game.story", (route) =>
      route.fulfill({ status: 200, body }),
    );
    await page.addInitScript(installProbe, hasSession);
    await page.goto("/");
    await page
      .getByRole("button", { name: "Začať odznova", exact: true })
      .tap();
    const probe = () =>
      page.evaluate(() =>
        (window as unknown as { mobileProbe: () => Probe }).mobileProbe(),
      );
    expect((await probe()).outputs).toHaveLength(4);
    if (hasSession) expect((await probe()).session).toBe("playback");
    await expect
      .poll(async () => (await probe()).outputs[3].time)
      .toBeGreaterThan(0.2);
    expect(await pcmPeak(page, 3)).toBeGreaterThan(0.001);
    await expect(page.locator(".player-video")).toHaveCount(0, {
      timeout: 7000,
    });
    await expect
      .poll(async () => (await probe()).outputs[0].time)
      .toBeGreaterThan(0.2);
    expect(await pcmPeak(page, 0)).toBeGreaterThan(0.001);
    const voice = (await probe()).outputs[0];
    expect(Number.isFinite(voice.duration)).toBe(true);
    expect(voice.loop).toBe(false);
    await expect
      .poll(
        async () =>
          (await probe()).outputs.every((audio) => audio.paused && audio.muted),
        { timeout: 8000 },
      )
      .toBe(true);
    const ended = (await probe()).outputs[0].time;
    await page.waitForTimeout(1000);
    expect((await probe()).outputs[0].time).toBe(ended);
    expect(
      (await probe()).outputs.every(
        (audio) => !audio.live && audio.paused && audio.muted,
      ),
    ).toBe(true);
  });
}
test("silent choice scene stops all iPhone players and next voice resumes", async ({
  page,
}) => {
  await page.addInitScript(installProbe, true);
  await page.goto("/");
  await page.getByRole("button", { name: "Začať odznova", exact: true }).tap();
  await expect(page.locator(".player-video")).toHaveCount(1);
  await expect(page.getByRole("button", { name: /Mars/ })).toBeVisible({
    timeout: 30000,
  });
  const paused = () =>
    page.evaluate(() =>
      (window as unknown as { mobileProbe: () => Probe })
        .mobileProbe()
        .outputs.every((audio) => audio.paused && audio.muted),
    );
  await expect.poll(paused).toBe(true);
  await page.waitForTimeout(500);
  expect(await paused()).toBe(true);
  await page.getByRole("button", { name: /Mars/ }).tap();
  await expect.poll(paused).toBe(false);
  expect(await pcmPeak(page, 0)).toBeGreaterThan(0.001);
});
