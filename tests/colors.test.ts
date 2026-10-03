import { expect, it } from "vitest";
import {
  colorStyle,
  contrast,
  cleanColors,
  type CustomColors,
} from "../src/utils/colors";
it("preserves presets when no custom colors are supplied", () => {
  expect(colorStyle(undefined, "forest")).toBeUndefined();
  expect(colorStyle({}, "light")).toBeUndefined();
  expect(cleanColors({ background: "bad", accent: "#12ab34" })).toEqual({
    accent: "#12ab34",
  });
});
it("keeps full RGB selections and readable foregrounds at color extremes", () => {
  for (const background of [
    "#000000",
    "#ffffff",
    "#808080",
    "#00ff00",
    "#ff0000",
    "#0000ff",
    "#abcdef",
  ])
    for (const accent of [
      "#000000",
      "#ffffff",
      "#808080",
      "#00ff00",
      "#ff0000",
    ]) {
      const vars = colorStyle(
        { background, accent } satisfies CustomColors,
        "forest",
      ) as Record<string, string>;
      expect(vars["--bg"]).toBe(background);
      expect(vars["--accent"]).toBe(accent);
      for (const surface of [
        "--bg",
        "--surface",
        "--button-bg",
        "--hover",
        "--input-bg",
        "--selected",
      ])
        expect(contrast(vars["--text"], vars[surface])).toBeGreaterThanOrEqual(
          4.5,
        );
      expect(contrast(vars["--button-text"], accent)).toBeGreaterThanOrEqual(
        4.5,
      );
      expect(
        contrast(vars["--accent-text"], background),
      ).toBeGreaterThanOrEqual(4.5);
    }
});
