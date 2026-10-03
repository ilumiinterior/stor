import { test, expect } from "@playwright/test";

test("automatic video and timed scenes have no buttons and colors persist", async ({
  page,
}) => {
  await page.goto("/editor");
  await page.getByRole("button", { name: "Otvoriť ukážkový príbeh" }).click();
  await page.getByLabel("Pozadie editora", { exact: true }).fill("#123456");
  await expect(page.locator(".editor-shell")).toHaveCSS("--bg", "#123456");
  const sceneName = await page
    .getByLabel("Názov scény", { exact: true })
    .inputValue();
  await page.getByLabel("Typ scény", { exact: true }).selectOption("automatic");
  const targets = page.getByLabel("Nasledujúca scéna", { exact: true });
  const target = await targets.locator("option").nth(1).getAttribute("value");
  const targetName = await targets.locator("option").nth(1).textContent();
  await targets.selectOption(target!);
  await page
    .getByLabel("Trvanie obrázka / záložný čas (sekundy)", { exact: true })
    .fill("2");
  await page.getByLabel("Farba pozadia scény", { exact: true }).fill("#663322");
  await page
    .locator('.right-panel input[type=file][aria-label="Video"]')
    .setInputFiles("tests/fixtures/portrait.mp4");
  await expect(
    page.locator('.right-panel select[aria-label="Video"]'),
  ).not.toHaveValue("");
  await page.getByRole("button", { name: "Uložiť", exact: true }).click();
  await page.reload();
  await page.getByRole("button", { name: "Upraviť", exact: true }).click();
  await page
    .locator(".scene-list button")
    .filter({ hasText: sceneName })
    .click();
  await expect(page.getByLabel("Typ scény", { exact: true })).toHaveValue(
    "automatic",
  );
  await expect(targets).toHaveValue(target!);
  await expect(
    page.getByLabel("Farba pozadia scény", { exact: true }),
  ).toHaveValue("#663322");
  await page.locator(".toolbar .primary").click();
  await expect(page.locator(".player-shell")).toHaveCSS("--bg", "#663322");
  await expect(page.locator(".player-choices .ordinal")).toHaveCount(0);
  await expect(page.locator(".player-shell button")).toHaveCount(0);
  await expect(page.locator(".player-video")).toHaveCount(1);
  await expect(page.locator(".player-video")).toHaveCount(0, { timeout: 7000 });
  await expect(
    page.getByText("Príbeh bude pokračovať automaticky.", { exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Ponuka", exact: true }).click();
  await page
    .getByRole("button", { name: "Späť do editora", exact: true })
    .click();
  await page
    .locator(".scene-list button")
    .filter({ hasText: sceneName })
    .click();
  await page
    .locator('.right-panel select[aria-label="Video"]')
    .selectOption("");
  await page
    .getByRole("button", { name: "Spustiť od tejto scény", exact: true })
    .click();
  await expect(page.locator(".player-shell button")).toHaveCount(0);
  await expect(page.locator(".player-shell")).toHaveCSS("--bg", "#663322");
  await expect(page.locator(".player-shell")).not.toHaveCSS("--bg", "#663322", {
    timeout: 4000,
  });
  expect(targetName).toBeTruthy();
  await page.getByRole("button", { name: "Ponuka", exact: true }).click();
  await page
    .getByRole("button", { name: "Späť do editora", exact: true })
    .click();
  await page
    .locator(".scene-list button")
    .filter({ hasText: sceneName })
    .click();
  await page
    .locator('.right-panel select[aria-label="Video"]')
    .selectOption({ index: 1 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page
    .getByRole("button", { name: "Spustiť od tejto scény", exact: true })
    .click();
  await expect(page.locator(".player-shell button")).toHaveCount(0);
  await expect(page.locator(".player-video")).toHaveCount(1);
  await expect(page.locator(".player-video")).toHaveCount(0, { timeout: 4000 });
});
