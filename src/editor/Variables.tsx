import { useEditor } from "../stores/editor";
import { t } from "../i18n";
import { id } from "../utils/demo";
import { Field, ValueInput } from "../components/Fields";
import type { StoryVariable } from "../types/story";
export function Variables() {
  const { story, update } = useEditor();
  if (!story) return null;
  return (
    <section>
      <h2>{t("editor.variables")}</h2>
      {story.variables.map((v) => (
        <div key={v.id} className="variable">
          <Field label={t("editor.variableName")}>
            <input
              value={v.name}
              onChange={(e) =>
                update((s) => {
                  s.variables.find((x) => x.id === v.id)!.name = e.target.value;
                })
              }
            />
          </Field>
          <Field label={t("editor.type")}>
            <select
              value={v.type}
              onChange={(e) =>
                update((s) => {
                  const variable = s.variables.find((x) => x.id === v.id)!;
                  variable.type = e.target.value as StoryVariable["type"];
                  variable.initial =
                    variable.type === "number"
                      ? 0
                      : variable.type === "boolean"
                        ? false
                        : "";
                  s.scenes.forEach((scene) => {
                    scene.actions = scene.actions.filter(
                      (a) => a.variableId !== v.id,
                    );
                    scene.choices.forEach((c) => {
                      if (c.condition?.variableId === v.id)
                        c.condition = undefined;
                      c.actions = c.actions.filter(
                        (a) => a.variableId !== v.id,
                      );
                    });
                  });
                })
              }
            >
              {(["boolean", "number", "string"] as const).map((type) => (
                <option key={type} value={type}>
                  {t(`editor.${type}`)}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t("editor.initial")}>
            <ValueInput
              type={v.type}
              value={v.initial}
              onChange={(value) =>
                update((s) => {
                  s.variables.find((x) => x.id === v.id)!.initial = value;
                })
              }
            />
          </Field>
          <button
            className="danger"
            onClick={() => {
              if (confirm(t("editor.variableUsed")))
                update((s) => {
                  s.variables = s.variables.filter((x) => x.id !== v.id);
                  s.scenes.forEach((scene) => {
                    scene.actions = scene.actions.filter(
                      (a) => a.variableId !== v.id,
                    );
                    scene.choices.forEach((c) => {
                      if (c.condition?.variableId === v.id)
                        c.condition = undefined;
                      c.actions = c.actions.filter(
                        (a) => a.variableId !== v.id,
                      );
                    });
                  });
                });
            }}
          >
            {t("common.delete")}
          </button>
        </div>
      ))}
      <button
        onClick={() =>
          update((s) =>
            s.variables.push({
              id: id(),
              name: t("editor.variableName"),
              type: "boolean",
              initial: false,
            }),
          )
        }
      >
        {t("editor.addVariable")}
      </button>
    </section>
  );
}
