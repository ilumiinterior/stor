import type { CSSProperties } from "react";
import type { ThemeId } from "./appearance";
export interface CustomColors {
  background?: string;
  accent?: string;
  menuBackground?: string;
  text?: string;
  title?: string;
  buttonBackground?: string;
  buttonText?: string;
  buttonBorder?: string;
  buttonHover?: string;
  timer?: string;
  controls?: string;
  buttonOpacity?: number;
}
export const gameColorKeys = [
  "menuBackground",
  "text",
  "title",
  "buttonBackground",
  "buttonText",
  "buttonBorder",
  "buttonHover",
  "timer",
  "controls",
] as const;
export const isHex = (value: unknown): value is string =>
  typeof value === "string" && /^#[\da-f]{6}$/i.test(value);
export function cleanColors(value: unknown): CustomColors {
  const raw = (value ?? {}) as CustomColors;
  return {
    ...(isHex(raw.background) ? { background: raw.background } : {}),
    ...(isHex(raw.accent) ? { accent: raw.accent } : {}),
    ...Object.fromEntries(
      gameColorKeys
        .filter((key) => isHex(raw[key]))
        .map((key) => [key, raw[key]]),
    ),
    ...(typeof raw.buttonOpacity === "number" &&
    Number.isFinite(raw.buttonOpacity)
      ? { buttonOpacity: Math.max(0, Math.min(1, raw.buttonOpacity)) }
      : {}),
  };
}
export const themeColors: Record<
  ThemeId,
  { background: string; accent: string; surface: string }
> = {
  forest: { background: "#171b19", accent: "#c4d3a3", surface: "#202622" },
  slate: { background: "#181d25", accent: "#cad5e6", surface: "#242b35" },
  sepia: { background: "#231d18", accent: "#e3c692", surface: "#302820" },
  wine: { background: "#241b20", accent: "#e4b7cc", surface: "#31242c" },
  light: { background: "#f0ede5", accent: "#40572e", surface: "#f9f6ef" },
};
export function rgb(hex: string) {
  return [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16));
}
export function toHex(channels: number[]) {
  return (
    "#" +
    channels
      .map((v) =>
        Math.round(Math.max(0, Math.min(255, v)))
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")
  );
}
function luminance(hex: string) {
  const [r, g, b] = rgb(hex).map((c) => {
    const v = c / 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
export function contrast(a: string, b: string) {
  const x = luminance(a),
    y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
function mix(a: string, b: string, amount: number) {
  const other = rgb(b);
  return toHex(rgb(a).map((v, i) => v + (other[i] - v) * amount));
}
function readable(background: string) {
  return contrast("#010201", background) > contrast("#fdfefc", background)
    ? "#010201"
    : "#fdfefc";
}
function foreground(accent: string, backgrounds: string[]) {
  if (backgrounds.every((bg) => contrast(accent, bg) >= 4.5)) return accent;
  const target = readable(backgrounds[0]);
  for (let i = 1; i <= 20; i++) {
    const color = mix(accent, target, i / 20);
    if (backgrounds.every((bg) => contrast(color, bg) >= 4.5)) return color;
  }
  return target;
}
export function colorStyle(
  colors: CustomColors | undefined,
  theme: ThemeId,
): CSSProperties | undefined {
  const custom = cleanColors(colors);
  if (!Object.keys(custom).length) return;
  const bg = custom.background ?? themeColors[theme].background;
  const accent = custom.accent ?? themeColors[theme].accent;
  const vars: Record<string, string> = {};
  let surface = themeColors[theme].surface;
  if (custom.background) {
    const text = readable(bg);
    const dark = text === "#fdfefc";
    const neutral = dark ? "#010201" : "#fdfefc";
    surface = mix(bg, neutral, 0.06);
    Object.assign(vars, {
      "--bg": bg,
      "--surface": surface,
      "--input-bg": mix(bg, dark ? "#010201" : "#fdfefc", 0.2),
      "--button-bg": mix(bg, neutral, 0.1),
      "--hover": mix(bg, neutral, 0.16),
      "--selected": mix(bg, neutral, 0.12),
      "--line": mix(bg, text, 0.45),
      "--muted": foreground(mix(bg, text, 0.7), [bg, surface]),
      "--text": text,
      "--player-bg": bg,
      "--shade": bg,
      "--danger": foreground(dark ? "#edb3a7" : "#9c3528", [bg, surface]),
      colorScheme: dark ? "dark" : "light",
    });
  }
  Object.assign(vars, {
    "--accent": accent,
    "--accent-hover": mix(accent, readable(accent), 0.1),
    "--button-text": readable(accent),
    "--accent-text": foreground(accent, [bg, surface]),
  });
  const mapping = {
    menuBackground: "--menu-bg",
    text: "--text",
    title: "--game-title",
    buttonBackground: "--choice-bg",
    buttonText: "--choice-text",
    buttonBorder: "--choice-border",
    buttonHover: "--choice-hover",
    timer: "--timer-color",
    controls: "--controls-color",
  };
  for (const key of gameColorKeys)
    if (custom[key]) vars[mapping[key]] = custom[key]!;
  if (custom.buttonOpacity !== undefined)
    vars["--choice-opacity"] = `${custom.buttonOpacity * 100}%`;
  return vars as CSSProperties;
}
