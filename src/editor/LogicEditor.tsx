import { t } from "../i18n";
import type { StoryVariable, Condition, VariableAction } from "../types/story";
import { ValueInput } from "../components/Fields";
export function ActionsEditor({
  variables,
  actions,
  onChange,
}: {
  variables: StoryVariable[];
  actions: VariableAction[];
  onChange: (a: VariableAction[]) => void;
}) {
  return (
    <div className="logic">
      <span className="caption">{t("editor.actions")}</span>
      {actions.map((a, i) => {
        const variable = variables.find((v) => v.id === a.variableId);
        return (
          <div className="action-row" key={i}>
            <select
              aria-label={t("editor.variableName")}
              value={a.variableId}
              onChange={(e) => {
                const v = variables.find((v) => v.id === e.target.value)!;
                onChange(
                  actions.map((x, j) =>
                    j === i
                      ? { variableId: v.id, operation: "set", value: v.initial }
                      : x,
                  ),
                );
              }}
            >
              {variables.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
            <select
              aria-label={t("editor.actions")}
              value={a.operation}
              onChange={(e) =>
                onChange(
                  actions.map((x, j) =>
                    j === i
                      ? {
                          ...x,
                          operation: e.target
                            .value as VariableAction["operation"],
                        }
                      : x,
                  ),
                )
              }
            >
              <option value="set">{t("editor.set")}</option>
              {variable?.type === "number" && (
                <>
                  <option value="add">{t("editor.add")}</option>
                  <option value="subtract">{t("editor.subtract")}</option>
                </>
              )}
            </select>
            <ValueInput
              type={variable?.type ?? "string"}
              value={a.value}
              onChange={(value) =>
                onChange(actions.map((x, j) => (j === i ? { ...x, value } : x)))
              }
            />
            <button
              aria-label={t("common.delete")}
              onClick={() => onChange(actions.filter((_, j) => i !== j))}
            >
              ×
            </button>
          </div>
        );
      })}
      <button
        disabled={!variables.length}
        onClick={() =>
          onChange([
            ...actions,
            {
              variableId: variables[0].id,
              operation: "set",
              value: variables[0].initial,
            },
          ])
        }
      >
        {t("editor.addAction")}
      </button>
      {!variables.length && <small>{t("editor.noVariables")}</small>}
    </div>
  );
}
export function ConditionEditor({
  variables,
  condition,
  onChange,
}: {
  variables: StoryVariable[];
  condition?: Condition;
  onChange: (c?: Condition) => void;
}) {
  const v = variables.find((v) => v.id === condition?.variableId);
  return (
    <div className="logic">
      <span className="caption">{t("editor.conditions")}</span>
      <select
        aria-label={t("editor.conditions")}
        value={condition?.variableId ?? ""}
        onChange={(e) => {
          const variable = variables.find((v) => v.id === e.target.value);
          onChange(
            variable
              ? {
                  variableId: variable.id,
                  operator: "eq",
                  value: variable.initial,
                }
              : undefined,
          );
        }}
      >
        <option value="">{t("editor.always")}</option>
        {variables.map((v) => (
          <option key={v.id} value={v.id}>
            {v.name}
          </option>
        ))}
      </select>
      {condition && (
        <div className="row">
          <select
            aria-label={t("editor.operator")}
            value={condition.operator}
            onChange={(e) =>
              onChange({
                ...condition,
                operator: e.target.value as Condition["operator"],
              })
            }
          >
            {(v?.type === "number"
              ? ["eq", "ne", "gt", "gte", "lt", "lte"]
              : ["eq", "ne"]
            ).map((op, i) => (
              <option key={op} value={op}>
                {
                  (v?.type === "number"
                    ? ["=", "≠", ">", "≥", "<", "≤"]
                    : ["=", "≠"])[i]
                }
              </option>
            ))}
          </select>
          <ValueInput
            type={v?.type ?? "string"}
            value={condition.value}
            onChange={(value) => onChange({ ...condition, value })}
          />
        </div>
      )}
    </div>
  );
}
