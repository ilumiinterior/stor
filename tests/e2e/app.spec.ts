import { test, expect } from "@playwright/test";
test("full RGB UI colors persist, travel with the story and reset to defaults", async ({
  page,
}) => {
  await page.goto("/editor");
  await page.getByRole("button", { name: "Otvoriť ukážkový príbeh" }).click();
  await page.locator(".editor-nav button").first().click();
  const panel = page.locator(".left-panel");
  await expect(
    panel.getByLabel("Farba pozadia UI", { exact: true }).first(),
  ).toHaveValue("#171b19");
  await panel
    .getByLabel("Farba pozadia UI — HEX", { exact: true })
    .first()
    .fill("#102030");
  await panel
    .getByLabel("Farba zvýraznenia UI — R", { exact: true })
    .first()
    .fill("255");
  await panel
    .getByLabel("Farba zvýraznenia UI — G", { exact: true })
    .first()
    .fill("0");
  await panel
    .getByLabel("Farba zvýraznenia UI — B", { exact: true })
    .first()
    .fill("128");
  await panel
    .getByLabel("Farba pozadia UI — HEX", { exact: true })
    .last()
    .fill("#fafafa");
  await panel
    .getByLabel("Farba zvýraznenia UI — HEX", { exact: true })
    .last()
    .fill("#008844");
  await expect(page.locator(".editor-shell")).toHaveCSS(
    "background-color",
    "rgb(250, 250, 250)",
  );
  await expect(page.getByText("Uložené", { exact: true })).toBeVisible();
  await page.locator(".toolbar .primary").click();
  await expect(page.locator(".player-shell")).toHaveCSS(
    "background-color",
    "rgb(16, 32, 48)",
  );
  await expect(page.locator(".player-shell")).toHaveCSS("--accent", "#ff0080");
  await page.locator(".player-top button").click();
  await page.getByRole("button", { name: "Späť do editora" }).click();
  await page.reload();
  await page.getByRole("button", { name: "Upraviť", exact: true }).click();
  await expect(page.locator(".editor-shell")).toHaveCSS(
    "background-color",
    "rgb(250, 250, 250)",
  );
  await page.locator(".editor-nav button").first().click();
  await expect(
    panel.getByLabel("Farba pozadia UI", { exact: true }).first(),
  ).toHaveValue("#102030");
  await panel
    .getByRole("button", { name: "Použiť pôvodné farby motívu" })
    .last()
    .click();
  await expect(page.locator(".editor-shell")).toHaveCSS(
    "background-color",
    "rgb(23, 27, 25)",
  );
  await page.locator(".toolbar .brand").click();
  await page.getByRole("button", { name: /Hrať/ }).click();
  await page.getByRole("button", { name: "Nastavenia", exact: true }).click();
  await page
    .getByLabel("Farba pozadia UI — HEX", { exact: true })
    .fill("#000000");
  await page
    .getByLabel("Farba zvýraznenia UI — HEX", { exact: true })
    .fill("#ffffff");
  await expect(page.locator(".player-shell")).toHaveCSS(
    "background-color",
    "rgb(0, 0, 0)",
  );
  await page.screenshot({
    path: "test-results/rgb-player.png",
    animations: "disabled",
  });
  await page
    .getByRole("button", { name: "Použiť vzhľad nastavený autorom" })
    .click();
  await expect(page.locator(".player-shell")).toHaveCSS(
    "background-color",
    "rgb(16, 32, 48)",
  );
});
test("video scenes play inline, pause, fit landscape and survive export and offline reload", async ({
  page,
  context,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/editor");
  await page.getByRole("button", { name: "Otvoriť ukážkový príbeh" }).click();
  await page
    .locator('.right-panel input[type=file][aria-label="Video"]')
    .setInputFiles("tests/fixtures/portrait.mp4");
  await expect(page.getByLabel("Opakovať video")).toBeChecked();
  await expect(page.getByLabel("Prehrávať zvuk videa")).not.toBeChecked();
  await page
    .getByRole("button", { name: "Prehrať video", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Pozastaviť video", exact: true }),
  ).toBeVisible();
  const originalVideoId = await page
    .locator('.right-panel select[aria-label="Video"]')
    .inputValue();
  const exported = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exportovať", exact: true }).click();
  const file = await exported;
  await page
    .locator(".toolbar input[type=file]")
    .setInputFiles((await file.path())!);
  await expect(
    page.locator('.right-panel select[aria-label="Video"]'),
  ).not.toHaveValue(originalVideoId);
  await expect(
    page.locator('.right-panel select[aria-label="Video"]'),
  ).not.toHaveValue("");
  await page.locator(".toolbar .primary").click();
  const video = page.locator(".player-video");
  await expect
    .poll(() =>
      video.evaluate(
        (el) =>
          !(el as HTMLVideoElement).paused &&
          (el as HTMLVideoElement).currentTime > 0,
      ),
    )
    .toBe(true);
  expect(await video.evaluate((el) => (el as HTMLVideoElement).muted)).toBe(
    true,
  );
  expect(
    await video.evaluate((el) => (el as HTMLVideoElement).playsInline),
  ).toBe(true);
  await page
    .getByRole("button", { name: "Pozastaviť video", exact: true })
    .click();
  expect(await video.evaluate((el) => (el as HTMLVideoElement).paused)).toBe(
    true,
  );
  await page
    .getByRole("button", { name: "Prehrať video", exact: true })
    .click();
  for (const [width, height, fit] of [
    [390, 844, "cover"],
    [1024, 768, "contain"],
    [1440, 900, "contain"],
  ] as const) {
    await page.setViewportSize({ width, height });
    await expect(video).toHaveCSS("object-fit", fit);
  }
  await page.screenshot({
    path: "test-results/video-landscape.png",
    animations: "disabled",
  });
  await page.locator(".player-top button").click();
  expect(await video.evaluate((el) => (el as HTMLVideoElement).paused)).toBe(
    true,
  );
  await page.getByRole("button", { name: "Späť do editora" }).click();
  await page.locator(".toolbar .brand").click();
  await expect(
    page.getByRole("heading", { name: "Svetlo za hmlou" }),
  ).toHaveCount(2);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await expect
    .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller))
    .toBe(true);
  await context.setOffline(true);
  await page.reload();
  await page.getByRole("button", { name: /Hrať/ }).first().click();
  await page.getByRole("button", { name: "Začať odznova" }).click();
  await expect
    .poll(() =>
      page
        .locator(".player-video")
        .evaluate((el) => (el as HTMLVideoElement).currentTime > 0),
    )
    .toBe(true);
  await page.getByRole("button", { name: /Vydať sa po starej ceste/ }).click();
  await expect(page.locator(".player-video")).toHaveCount(0);
  expect(errors).toEqual([]);
  await context.setOffline(false);
});
test("scene labels, author appearance and personal preferences persist", async ({
  page,
}) => {
  await page.goto("/editor");
  await page.getByRole("button", { name: "Otvoriť ukážkový príbeh" }).click();
  await page
    .getByRole("button", { name: /Príbeh/, exact: false })
    .filter({ has: page.locator(".nav-symbol") })
    .click();
  const panel = page.locator(".left-panel");
  await expect(
    panel.getByLabel("Zobrazovať názvy scén v hre"),
  ).not.toBeChecked();
  await panel
    .getByLabel("Písmo", { exact: true })
    .first()
    .selectOption("literata");
  await panel.getByLabel("Farebné prostredie").first().selectOption("sepia");
  await panel
    .getByLabel("Písmo", { exact: true })
    .last()
    .selectOption("nunito");
  await panel.getByLabel("Farebné prostredie").last().selectOption("light");
  await expect(page.locator(".editor-shell")).toHaveAttribute(
    "data-theme",
    "light",
  );
  await page.screenshot({
    path: "test-results/appearance-editor.png",
    animations: "disabled",
  });
  await page.locator(".toolbar .primary").click();
  await expect(page.locator(".scene-content>.eyebrow")).toHaveCount(0);
  await expect(page.locator(".player-shell")).toHaveAttribute(
    "data-theme",
    "sepia",
  );
  await expect(page.locator(".story-prose")).toHaveCSS(
    "font-family",
    /Literata/,
  );
  await page.locator(".player-top button").click();
  await page.getByRole("button", { name: "Späť do editora" }).click();
  await page.locator(".editor-nav button").first().click();
  await panel.getByLabel("Zobrazovať názvy scén v hre").check();
  await expect(page.getByText("Uložené", { exact: true })).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Upraviť", exact: true }).click();
  await expect(page.locator(".editor-shell")).toHaveAttribute(
    "data-font",
    "nunito",
  );
  await page.locator(".toolbar .primary").click();
  await expect(page.locator(".scene-content>.eyebrow")).toHaveText(
    "Na okraji lesa",
  );
  await page.locator(".player-top button").click();
  await page.getByRole("button", { name: "Späť do editora" }).click();
  await page.locator(".toolbar .brand").click();
  await page.getByRole("button", { name: /Hrať/ }).click();
  await page.getByRole("button", { name: "Nastavenia", exact: true }).click();
  for (const font of [
    "bodoni",
    "manrope",
    "literata",
    "nunito",
    "sourceSerif",
  ]) {
    await page.getByLabel("Písmo", { exact: true }).selectOption(font);
    await expect(page.locator(".player-shell")).toHaveAttribute(
      "data-font",
      font,
    );
  }
  for (const theme of ["forest", "slate", "sepia", "wine", "light"]) {
    await page.getByLabel("Farebné prostredie").selectOption(theme);
    await expect(page.locator(".player-shell")).toHaveAttribute(
      "data-theme",
      theme,
    );
  }
  await page.getByLabel("Farebné prostredie").selectOption("wine");
  await page.getByRole("button", { name: "Zavrieť", exact: true }).click();
  await page.getByRole("button", { name: "Začať odznova" }).click();
  await expect(page.locator(".story-prose")).toHaveCSS(
    "font-family",
    /Source Serif 4/,
  );
  await expect(page.locator(".player-background")).toHaveCount(1);
  await page.screenshot({
    path: "test-results/appearance-player.png",
    animations: "disabled",
  });
  await page.reload();
  await page.getByRole("button", { name: /Hrať/ }).click();
  await expect(page.locator(".player-shell")).toHaveAttribute(
    "data-theme",
    "wine",
  );
});
test("uploaded audio has localized working preview controls", async ({
  page,
}) => {
  const wav = Buffer.alloc(44 + 16000);
  wav.write("RIFF");
  wav.writeUInt32LE(wav.length - 8, 4);
  wav.write("WAVEfmt ", 8);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(8000, 24);
  wav.writeUInt32LE(16000, 28);
  wav.writeUInt16LE(2, 32);
  wav.writeUInt16LE(16, 34);
  wav.write("data", 36);
  wav.writeUInt32LE(16000, 40);
  await page.goto("/editor");
  await page.getByRole("button", { name: "Otvoriť ukážkový príbeh" }).click();
  await page.getByRole("button", { name: /Médiá/ }).click();
  await page.getByLabel("Druh média").selectOption("audio");
  await page
    .locator(".left-panel input[type=file]")
    .setInputFiles({ name: "zvuk.wav", mimeType: "audio/wav", buffer: wav });
  await page.getByRole("button", { name: "Prehrať ukážku zvuku" }).click();
  await expect(
    page.getByRole("button", { name: "Pozastaviť zvuk" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Pozastaviť zvuk" }).click();
  await expect(
    page.getByRole("button", { name: "Prehrať ukážku zvuku" }),
  ).toBeVisible();
});
test("editor changes persist and panels work on phone and tablet", async ({
  page,
}) => {
  await page.goto("/editor");
  await page.getByRole("button", { name: "Otvoriť ukážkový príbeh" }).click();
  await page.getByLabel("Názov", { exact: true }).fill("Môj príbeh");
  await page.getByLabel("Názov scény").fill("Vstup");
  await page.getByLabel("Text príbehu").fill("My authored English text.");
  await expect(page.getByText("Uložené", { exact: true })).toBeVisible();
  await page.screenshot({
    path: "test-results/editor-desktop.png",
    fullPage: true,
    animations: "disabled",
  });
  await page.reload();
  await page.getByRole("button", { name: "Upraviť", exact: true }).click();
  await expect(page.getByLabel("Názov scény")).toHaveValue("Vstup");
  await expect(page.getByLabel("Text príbehu")).toHaveValue(
    "My authored English text.",
  );
  await page.getByRole("button", { name: "Duplikovať", exact: true }).click();
  await expect(page.getByLabel("Názov scény")).toHaveValue("Vstup — kópia");
  await page.getByRole("button", { name: "Zavrieť", exact: true }).click();
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.getByRole("button", { name: /Premenné/ }).click();
  await page.getByRole("button", { name: "Pridať premennú" }).click();
  await expect(page.locator(".variable")).toHaveCount(2);
  await page.screenshot({
    path: "test-results/editor-tablet.png",
    fullPage: true,
    animations: "disabled",
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: /Scény/ }).click();
  await page.getByRole("button", { name: /01 Vstup/ }).click();
  await expect(page.getByLabel("Názov scény")).toBeVisible();
  await page.getByRole("button", { name: /Médiá/ }).click();
  await expect(
    page.getByRole("heading", { name: "Médiá", exact: true }),
  ).toBeVisible();
  for (const [width, height] of [
    [375, 812],
    [390, 844],
    [393, 852],
    [430, 932],
  ]) {
    await page.setViewportSize({ width, height });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect(
      await page
        .locator(".editor-nav button")
        .first()
        .evaluate((el) => el.getBoundingClientRect().height),
    ).toBeGreaterThanOrEqual(44);
  }
  await page.screenshot({
    path: "test-results/editor-mobile.png",
    fullPage: true,
    animations: "disabled",
  });
});
test("editor, isolated preview, portable project, mobile saves and offline PWA", async ({
  page,
  context,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/editor");
  await expect(page.getByText("Váš prvý príbeh sa začína tu.")).toBeVisible();
  await page.getByRole("button", { name: "Otvoriť ukážkový príbeh" }).click();
  await expect(page.getByLabel("Názov", { exact: true })).toHaveValue(
    "Svetlo za hmlou",
  );
  await expect(page.getByText("Uložené", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: /^Náhľad/ }).click();
  await expect(page.getByText("Náhľad — postup sa neukladá")).toBeVisible();
  await page.getByRole("button", { name: /Vydať sa po starej ceste/ }).click();
  await page.getByRole("button", { name: /Vziať kľúč/ }).click();
  await expect(
    page.getByRole("button", { name: /Odomknúť dvere/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Odomknúť dvere/ }).click();
  await expect(page.getByText("Koniec príbehu", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "Ponuka", exact: true })
    .first()
    .click();
  await page.getByRole("button", { name: "Späť do editora" }).click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exportovať", exact: true }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.story$/);
  const exportPath = await download.path();
  await page.locator(".toolbar input[type=file]").setInputFiles(exportPath!);
  await expect(page.getByLabel("Názov", { exact: true })).toHaveValue(
    "Svetlo za hmlou",
  );
  await page.getByRole("button", { name: "Vetvy" }).click();
  await expect(
    page.getByRole("heading", { name: "Svetlo za hmlou" }),
  ).toHaveCount(2);
  await page.getByRole("button", { name: "Hrať" }).first().click();
  await expect(page.getByRole("button", { name: "Pokračovať" })).toBeDisabled();
  await page.getByRole("button", { name: "Začať odznova" }).click();
  await page.getByRole("button", { name: /Vstúpiť do lesa/ }).click();
  await page.getByRole("button", { name: /Obísť jazero/ }).click();
  await expect(
    page.getByRole("button", { name: /Odomknúť dvere/ }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Ponuka", exact: true }).click();
  await page.getByRole("button", { name: "Načítať hru", exact: true }).click();
  await page
    .getByRole("button", { name: "Uložiť", exact: true })
    .first()
    .click();
  await expect(page.locator(".save-slot").nth(1)).not.toContainText(
    "Prázdna pozícia",
  );
  await page.getByRole("button", { name: "Zavrieť" }).click();
  await page.getByRole("button", { name: "Späť do knižnice" }).click();
  await page.reload();
  await page.getByRole("button", { name: "Hrať" }).first().click();
  await expect(page.getByRole("button", { name: "Pokračovať" })).toBeEnabled();
  await page.getByRole("button", { name: "Pokračovať" }).click();
  await expect(page.locator(".story-prose")).toContainText(
    "Ťažké dvere sú zamknuté.",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "test-results/player-mobile.png",
    fullPage: true,
    animations: "disabled",
  });
  for (const [width, height] of [
    [375, 812],
    [390, 844],
    [393, 852],
    [430, 932],
  ]) {
    await page.setViewportSize({ width, height });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect(
      await page
        .locator(".player-choices button")
        .first()
        .evaluate((el) => el.getBoundingClientRect().height),
    ).toBeGreaterThanOrEqual(44);
  }
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await expect
    .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller))
    .toBe(true);
  await context.setOffline(true);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Svetlo za hmlou" }).first(),
  ).toBeVisible();
  await page.getByRole("button", { name: "Hrať" }).first().click();
  await page.getByRole("button", { name: "Pokračovať" }).click();
  await expect(page.locator(".story-prose")).toContainText(
    "Ťažké dvere sú zamknuté.",
  );
  expect(errors).toEqual([]);
  await context.setOffline(false);
});
