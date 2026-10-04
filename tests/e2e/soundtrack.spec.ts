import { test, expect } from "@playwright/test";
import JSZip from "jszip";
const samples = 8000 * 8;
const wave = Buffer.alloc(44 + samples * 2);
wave.write("RIFF");
wave.writeUInt32LE(wave.length - 8, 4);
wave.write("WAVEfmt ", 8);
wave.writeUInt32LE(16, 16);
wave.writeUInt16LE(1, 20);
wave.writeUInt16LE(1, 22);
wave.writeUInt32LE(8000, 24);
wave.writeUInt32LE(16000, 28);
wave.writeUInt16LE(2, 32);
wave.writeUInt16LE(16, 34);
wave.write("data", 36);
wave.writeUInt32LE(samples * 2, 40);
for (let i = 0; i < samples; i++)
  wave.writeInt16LE(
    Math.round(Math.sin((i * 2 * Math.PI * 220) / 8000) * 16383),
    44 + i * 2,
  );

for (const ios of [false, true])
  test.describe(ios ? "iPhone soundtrack" : "desktop soundtrack", () => {
    test.use({
      serviceWorkers: "block",
      ...(ios
        ? {
            userAgent:
              "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148",
          }
        : {}),
    });
    for (const key of ["voiceId", "musicId", "ambientId"])
      test(`timer card plays ${key} and stops it in the following silent scene`, async ({
        page,
      }) => {
        const base = {
          position: { x: 0, y: 0 },
          actions: [],
          choices: [],
          ending: false,
          text: "",
          name: "",
        };
        const story = {
          schemaVersion: 1,
          id: "timer-audio",
          title: "Hodiny",
          contentLanguage: "sk",
          updatedAt: 1,
          startSceneId: "timer",
          variables: [],
          timer: { enabled: true, durationSeconds: 600 },
          scenes: [
            {
              ...base,
              id: "timer",
              timerOnly: true,
              [key]: "tick",
              autoAdvance: { delaySeconds: 2, targetSceneId: "silent" },
            },
            { ...base, id: "silent", text: "Tichá scéna" },
          ],
        };
        const zip = new JSZip();
        zip.file("assets/audio/tick", wave);
        zip.file(
          "story.json",
          JSON.stringify({
            story,
            assets: [
              {
                id: "tick",
                name: "tick.wav",
                kind: "audio",
                mime: "audio/wav",
                path: "assets/audio/tick",
              },
            ],
          }),
        );
        const body = await zip.generateAsync({ type: "nodebuffer" });
        await page.route("**/game.story", (route) =>
          route.fulfill({ status: 200, body }),
        );
        await page.addInitScript(() => {
          const outputs = new Set<HTMLAudioElement>();
          const gains: AnalyserNode[] = [];
          const play = HTMLMediaElement.prototype.play;
          HTMLMediaElement.prototype.play = function () {
            if (this instanceof HTMLAudioElement) outputs.add(this);
            return play.call(this);
          };
          const create = AudioContext.prototype.createGain;
          AudioContext.prototype.createGain = function () {
            const node = create.call(this),
              analyser = this.createAnalyser();
            node.connect(analyser);
            gains.push(analyser);
            return node;
          };
          Object.assign(window, {
            timerAudioProbe: () => {
              if (outputs.size)
                return [...outputs].some(
                  (a) => !a.paused && !a.muted && a.currentTime > 0.15,
                );
              return gains.some((analyser) => {
                const samples = new Float32Array(analyser.fftSize);
                analyser.getFloatTimeDomainData(samples);
                return samples.some((value) => Math.abs(value) > 0.05);
              });
            },
          });
        });
        const audible = () =>
          page.evaluate(() =>
            (
              window as unknown as { timerAudioProbe: () => boolean }
            ).timerAudioProbe(),
          );
        await page.goto("/");
        await page
          .getByRole("button", { name: "Začať odznova", exact: true })
          .click();
        await expect(page.getByRole("timer")).toBeVisible();
        await expect.poll(audible).toBe(true);
        await expect(page.locator(".story-prose")).toHaveText("Tichá scéna");
        await expect.poll(audible).toBe(false);
      });
    test("global music keeps playing across cards at its configured volume", async ({
      page,
    }) => {
      const base = {
        position: { x: 0, y: 0 },
        text: "",
        ending: false,
        actions: [],
      };
      const story = {
        schemaVersion: 1,
        id: "music-test",
        title: "Hudba",
        contentLanguage: "sk",
        updatedAt: 1,
        startSceneId: "a",
        variables: [],
        soundtrack: { assetId: "music", volume: 0.25 },
        scenes: [
          {
            ...base,
            id: "a",
            name: "a",
            choices: [
              { id: "next", text: "Ďalšia", targetSceneId: "b", actions: [] },
            ],
          },
          { ...base, id: "b", name: "b", choices: [] },
        ],
      };
      const zip = new JSZip();
      zip.file("assets/music/music", wave);
      zip.file(
        "story.json",
        JSON.stringify({
          story,
          assets: [
            {
              id: "music",
              name: "tone.wav",
              kind: "music",
              mime: "audio/wav",
              path: "assets/music/music",
            },
          ],
        }),
      );
      const body = await zip.generateAsync({ type: "nodebuffer" });
      await page.route("**/game.story", (route) =>
        route.fulfill({ status: 200, body }),
      );
      await page.addInitScript(() => {
        let loops = 0;
        const outputs: HTMLAudioElement[] = [],
          gains: AnalyserNode[] = [];
        const play = HTMLMediaElement.prototype.play;
        HTMLMediaElement.prototype.play = function () {
          if (this instanceof HTMLAudioElement && this.loop) {
            loops++;
            outputs.push(this);
          }
          return play.call(this);
        };
        const create = AudioContext.prototype.createBufferSource;
        AudioContext.prototype.createBufferSource = function () {
          const source = create.call(this),
            start = source.start;
          source.start = function (
            ...args: Parameters<AudioBufferSourceNode["start"]>
          ) {
            if (this.loop) loops++;
            return start.apply(this, args);
          };
          return source;
        };
        const gain = AudioContext.prototype.createGain;
        AudioContext.prototype.createGain = function () {
          const node = gain.call(this),
            analyser = this.createAnalyser();
          node.connect(analyser);
          gains.push(analyser);
          return node;
        };
        Object.assign(window, {
          musicProbe: async () => {
            let peak = 0;
            if (outputs.length) {
              const bytes = await (await fetch(outputs[0].src)).arrayBuffer();
              const view = new DataView(bytes);
              for (let i = 44; i < bytes.byteLength; i += 2)
                peak = Math.max(peak, Math.abs(view.getInt16(i, true)) / 32768);
            } else
              for (const analyser of gains) {
                const data = new Float32Array(analyser.fftSize);
                analyser.getFloatTimeDomainData(data);
                peak = Math.max(peak, ...data.map(Math.abs));
              }
            return { loops, peak };
          },
        });
      });
      const probe = () =>
        page.evaluate(() =>
          (
            window as unknown as {
              musicProbe: () => Promise<{ loops: number; peak: number }>;
            }
          ).musicProbe(),
        );
      await page.goto("/");
      await page
        .getByRole("button", { name: "Nastavenia", exact: true })
        .click();
      const soundtrackVolume = page.getByRole("slider", {
        name: /Hlasitosť soundtracku/,
      });
      await expect(soundtrackVolume).toHaveValue("1");
      await soundtrackVolume.fill("0.5");
      await page.getByRole("button", { name: "Zavrieť", exact: true }).click();
      await page
        .getByRole("button", { name: "Začať odznova", exact: true })
        .click();
      await expect.poll(async () => (await probe()).peak).toBeGreaterThan(0.03);
      expect((await probe()).peak).toBeLessThan(0.05);
      expect((await probe()).loops).toBe(1);
      await page.getByRole("button", { name: /Ďalšia/ }).click();
      await page.waitForTimeout(400);
      expect((await probe()).loops).toBe(1);
      expect((await probe()).peak).toBeGreaterThan(0.03);
      await page.reload();
      await page
        .getByRole("button", { name: "Nastavenia", exact: true })
        .click();
      await expect(
        page.getByRole("slider", { name: /Hlasitosť soundtracku/ }),
      ).toHaveValue("0.5");
    });
  });
