import { create } from "zustand";
import { persist } from "zustand/middleware";
import { cleanColors, type CustomColors } from "../utils/colors";
import {
  fontIds,
  themeIds,
  type FontId,
  type ThemeId,
} from "../utils/appearance";
interface Preferences {
  editorFont: FontId;
  editorTheme: ThemeId;
  playerFont: FontId | null;
  playerTheme: ThemeId | null;
  editorColors: CustomColors;
  playerColors: CustomColors | null;
  setEditorColors: (colors: CustomColors) => void;
  setPlayerColors: (colors: CustomColors | null) => void;
  setEditor: (font: FontId, theme: ThemeId) => void;
  setPlayer: (font: FontId | null, theme: ThemeId | null) => void;
}
export const useAppearance = create<Preferences>()(
  persist(
    (set) => ({
      editorFont: "manrope",
      editorTheme: "forest",
      playerFont: null,
      playerTheme: null,
      editorColors: {},
      playerColors: null,
      setEditorColors: (editorColors) =>
        set({ editorColors: cleanColors(editorColors) }),
      setPlayerColors: (playerColors) =>
        set({
          playerColors:
            playerColors === null ? null : cleanColors(playerColors),
        }),
      setEditor: (editorFont, editorTheme) => set({ editorFont, editorTheme }),
      setPlayer: (playerFont, playerTheme) => set({ playerFont, playerTheme }),
    }),
    {
      name: "vetvy.appearance",
      merge: (persisted, current) => {
        const raw = (persisted ?? {}) as Partial<Preferences>;
        return {
          ...current,
          editorFont: fontIds.includes(raw.editorFont!)
            ? raw.editorFont!
            : current.editorFont,
          editorTheme: themeIds.includes(raw.editorTheme!)
            ? raw.editorTheme!
            : current.editorTheme,
          playerFont: fontIds.includes(raw.playerFont!)
            ? raw.playerFont!
            : null,
          playerTheme: themeIds.includes(raw.playerTheme!)
            ? raw.playerTheme!
            : null,
          editorColors: cleanColors(raw.editorColors),
          playerColors:
            raw.playerColors == null ? null : cleanColors(raw.playerColors),
        };
      },
    },
  ),
);
