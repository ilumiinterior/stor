import { t } from "../i18n";
import { Field } from "./Fields";
import { ColorFields } from "./ColorFields";
import { GameColorFields } from "./GameColorFields";
import type { CustomColors } from "../utils/colors";
import {
  fontIds,
  themeIds,
  type FontId,
  type ThemeId,
} from "../utils/appearance";
export function AppearanceFields({
  font,
  theme,
  onChange,
  colors,
  onColorsChange,
  gameColors = false,
}: {
  font: FontId;
  theme: ThemeId;
  onChange: (font: FontId, theme: ThemeId) => void;
  colors?: CustomColors;
  onColorsChange: (colors: CustomColors) => void;
  gameColors?: boolean;
}) {
  return (
    <>
      <Field label={t("appearance.font")}>
        <select
          aria-label={t("appearance.font")}
          value={font}
          onChange={(e) => onChange(e.target.value as FontId, theme)}
        >
          {fontIds.map((id) => (
            <option key={id} value={id}>
              {t(`appearance.fonts.${id}`)}
            </option>
          ))}
        </select>
      </Field>
      <Field label={t("appearance.theme")}>
        <select
          aria-label={t("appearance.theme")}
          value={theme}
          onChange={(e) => {
            onChange(font, e.target.value as ThemeId);
            onColorsChange({});
          }}
        >
          {themeIds.map((id) => (
            <option key={id} value={id}>
              {t(`appearance.themes.${id}`)}
            </option>
          ))}
        </select>
      </Field>
      <ColorFields theme={theme} colors={colors} onChange={onColorsChange} />
      {gameColors && (
        <GameColorFields
          theme={theme}
          colors={colors}
          onChange={onColorsChange}
        />
      )}
      <p className="font-sample" data-font={font}>
        {t("appearance.sample")}
      </p>
    </>
  );
}
