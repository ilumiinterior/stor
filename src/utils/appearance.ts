export const fontIds = [
  "bodoni",
  "manrope",
  "literata",
  "nunito",
  "sourceSerif",
] as const;
export const themeIds = ["forest", "slate", "sepia", "wine", "light"] as const;
export type FontId = (typeof fontIds)[number];
export type ThemeId = (typeof themeIds)[number];
import type { CustomColors } from "./colors";
export interface Presentation {
  showSceneNames: boolean;
  font: FontId;
  theme: ThemeId;
  colors?: CustomColors;
}
export const defaultPresentation: Presentation = {
  showSceneNames: false,
  font: "bodoni",
  theme: "forest",
};
