import { test, expect } from "@playwright/test";

test("video gives choices at least four seconds before replay and cancels on scene change", async ({
  page,
}) => {
  await page.goto("/editor");
  await page.getByRole("button", { name: "Otvoriť ukážkový príbeh" }).click();
  await page
    .locator('.right-panel input[type=file][aria-label="Video"]')
    .setInputFiles("tests/fixtures/portrait.mp4");
  await page.locator(".toolbar .primary").click();
  const video = page.locator(".player-video");
  await expect
    .poll(() => video.evaluate((el) => (el as HTMLVideoElement).currentTime))
    .toBeGreaterThan(0);
  await video.evaluate((el) => {
    const media = el as HTMLVideoElement;
    media.addEventListener("ended", () => {
      media.dataset.endedAt = String(performance.now());
    });
    media.addEventListener("playing", () => {
      if (media.dataset.endedAt)
        media.dataset.gap = String(
          performance.now() - Number(media.dataset.endedAt),
        );
    });
    media.currentTime = media.duration - 0.15;
  });
  const choices = page.locator(".player-choices");
  await expect(choices).toHaveClass(/is-highlighted/);
  await page.getByRole("button", { name: "Ponuka", exact: true }).click();
  await page.waitForTimeout(4200);
  expect(await video.evaluate((el) => (el as HTMLVideoElement).paused)).toBe(
    true,
  );
  await expect(video).not.toHaveAttribute("data-gap", /.+/);
  await page.getByRole("button", { name: /^Pokračovať/ }).click();
  await expect(choices).toHaveClass(/is-highlighted/);
  await expect(choices.locator("button").first()).toBeEnabled();
  await expect(
    page.getByRole("button", { name: "Čas na rozhodnutie" }),
  ).toBeDisabled();
  await expect
    .poll(() => video.getAttribute("data-gap"), { timeout: 7000 })
    .not.toBeNull();
  expect(Number(await video.getAttribute("data-gap"))).toBeGreaterThanOrEqual(
    4000,
  );
  await expect(choices).not.toHaveClass(/is-highlighted/);
  await video.evaluate((el) => {
    const media = el as HTMLVideoElement;
    media.currentTime = media.duration - 0.15;
  });
  await expect(choices).toHaveClass(/is-highlighted/);
  await choices.locator("button").first().click();
  await expect(video).toHaveCount(0);
  await expect(page.locator(".player-choices.is-highlighted")).toHaveCount(0);
});
