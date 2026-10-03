import { useEffect, useState } from "react";
import { t } from "../i18n";
import {
  isHex,
  rgb,
  toHex,
  themeColors,
  type CustomColors,
} from "../utils/colors";
import type { ThemeId } from "../utils/appearance";
export function ColorInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (hex: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  return (
    <div className="color-control">
      <span className="caption">{label}</span>
      <div className="color-values">
        <input
          aria-label={label}
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <input
          aria-label={t("appearance.hexLabel", { color: label })}
          type="text"
          spellCheck={false}
          value={draft}
          maxLength={7}
          aria-invalid={!isHex(draft)}
          onChange={(e) => {
            const next = e.target.value;
            setDraft(next);
            if (isHex(next)) onChange(next.toLowerCase());
          }}
          onBlur={() => {
            if (!isHex(draft)) setDraft(value);
          }}
        />
      </div>
      <div className="rgb-values">
        {rgb(value).map((channel, i) => (
          <label key={i}>
            <span>{["R", "G", "B"][i]}</span>
            <input
              aria-label={t("appearance.channelLabel", {
                color: label,
                channel: ["R", "G", "B"][i],
              })}
              type="number"
              min="0"
              max="255"
              step="1"
              value={channel}
              onChange={(e) => {
                if (e.target.value === "") return;
                const next = Number(e.target.value);
                if (!Number.isInteger(next) || next < 0 || next > 255) return;
                const channels = rgb(value);
                channels[i] = next;
                onChange(toHex(channels));
              }}
            />
          </label>
        ))}
      </div>
    </div>
  );
}
export function ColorFields({
  theme,
  colors,
  onChange,
}: {
  theme: ThemeId;
  colors?: CustomColors;
  onChange: (colors: CustomColors) => void;
}) {
  return (
    <div className="custom-colors">
      <ColorInput
        label={t("appearance.backgroundColor")}
        value={colors?.background ?? themeColors[theme].background}
        onChange={(background) => onChange({ ...colors, background })}
      />
      <ColorInput
        label={t("appearance.accentColor")}
        value={colors?.accent ?? themeColors[theme].accent}
        onChange={(accent) => onChange({ ...colors, accent })}
      />
      <small>{t("appearance.colorHint")}</small>
      <button
        disabled={!colors?.background && !colors?.accent}
        onClick={() => onChange({})}
      >
        {t("appearance.resetColors")}
      </button>
    </div>
  );
}
