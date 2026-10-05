import { ColorInput } from "./ColorFields";
import { Field } from "./Fields";
import { t } from "../i18n";
import { gameColorKeys, themeColors, type CustomColors } from "../utils/colors";
import type { ThemeId } from "../utils/appearance";
export function GameColorFields({
  colors,
  theme,
  onChange,
}: {
  colors?: CustomColors;
  theme: ThemeId;
  onChange: (colors: CustomColors) => void;
}) {
  const base = themeColors[theme];
  const text = theme === "light" ? "#252c20" : "#ffffff";
  const defaults = {
    menuBackground: colors?.background ?? base.background,
    text,
    title: text,
    buttonBackground: base.surface,
    buttonText: text,
    buttonBorder: base.accent,
    buttonHover: base.accent,
    timer: "#ffffff",
    controls: "#ffffff",
  };
  return (
    <details className="game-color-fields">
      <summary>{t("gameColors.title")}</summary>
      <p className="muted">{t("gameColors.hint")}</p>
      {gameColorKeys.map((key) => (
        <ColorInput
          key={key}
          label={t(
            key === "title" ? "gameColors.titleColor" : `gameColors.${key}`,
          )}
          value={colors?.[key] ?? defaults[key]}
          onChange={(value) => onChange({ ...colors, [key]: value })}
        />
      ))}
      <Field label={t("gameColors.opacity")}>
        <input
          aria-label={t("gameColors.opacity")}
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={1 - (colors?.buttonOpacity ?? 1)}
          onChange={(e) =>
            onChange({ ...colors, buttonOpacity: 1 - Number(e.target.value) })
          }
        />
        <small>{Math.round((1 - (colors?.buttonOpacity ?? 1)) * 100)} %</small>
      </Field>
      <button
        onClick={() =>
          onChange({ background: colors?.background, accent: colors?.accent })
        }
      >
        {t("gameColors.reset")}
      </button>
    </details>
  );
}
