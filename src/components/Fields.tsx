import type { ReactNode } from "react";
import { t } from "../i18n";
import type { Value, StoryVariable } from "../types/story";
export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}
export function ValueInput({
  type,
  value,
  onChange,
}: {
  type: StoryVariable["type"];
  value: Value;
  onChange: (v: Value) => void;
}) {
  return type === "boolean" ? (
    <select
      aria-label={t("editor.value")}
      value={String(value)}
      onChange={(e) => onChange(e.target.value === "true")}
    >
      <option value="true">{t("common.yes")}</option>
      <option value="false">{t("common.no")}</option>
    </select>
  ) : (
    <input
      aria-label={t("editor.value")}
      type={type === "number" ? "number" : "text"}
      value={String(value)}
      onChange={(e) =>
        onChange(type === "number" ? Number(e.target.value) : e.target.value)
      }
    />
  );
}
