import { useEditor } from "../stores/editor";
import { t } from "../i18n";
import { newChoice, id } from "../utils/demo";
import { Field } from "../components/Fields";
import { AssetPreview } from "../components/AssetPreview";
import { ActionsEditor, ConditionEditor } from "./LogicEditor";
import { uploadAsset } from "./Assets";
import type { Scene } from "../types/story";
import { ColorInput } from "../components/ColorFields";
import { themeColors } from "../utils/colors";
export function SceneEditor({
  preview,
}: {
  preview: (sceneId: string) => void;
}) {
  const { story, selected, assets, update, refreshAssets, report } =
    useEditor();
  const scene = story?.scenes.find((s) => s.id === selected);
  if (!scene || !story)
    return <p className="muted">{t("editor.selectScene")}</p>;
  const edit = (change: (s: Scene) => void) =>
    update((story) => {
      const s = story.scenes.find((s) => s.id === scene.id);
      if (s) change(s);
    });
  return (
    <section>
      <div className="row spread">
        <span className="eyebrow">{t("editor.properties")}</span>
        <button
          aria-label={t("common.close")}
          onClick={() => useEditor.getState().select("")}
        >
          ×
        </button>
      </div>
      <Field label={t("editor.sceneName")}>
        <input
          value={scene.name}
          onChange={(e) => edit((s) => (s.name = e.target.value))}
        />
      </Field>
      <div className="row">
        <button
          onClick={() => {
            const copy = {
              ...structuredClone(scene),
              id: id(),
              name: t("common.copy", { name: scene.name }),
              position: { x: scene.position.x + 60, y: scene.position.y + 80 },
              choices: scene.choices.map((c) => ({ ...c, id: id() })),
            };
            update((s) => s.scenes.push(copy));
            useEditor.getState().select(copy.id);
          }}
        >
          {t("common.duplicate")}
        </button>
        <button
          className="danger"
          onClick={() => {
            if (!confirm(t("editor.deleteScene"))) return;
            update((s) => {
              s.scenes = s.scenes.filter((x) => x.id !== scene.id);
              s.scenes.forEach((x) => {
                if (x.autoAdvance?.targetSceneId === scene.id)
                  x.autoAdvance.targetSceneId = "";
              });
              s.scenes.forEach((x) =>
                x.choices.forEach((c) => {
                  if (c.targetSceneId === scene.id) c.targetSceneId = "";
                }),
              );
              if (s.startSceneId === scene.id)
                s.startSceneId = s.scenes[0]?.id ?? "";
            });
            useEditor.getState().select("");
          }}
        >
          {t("common.delete")}
        </button>
      </div>
      <button className="wide" onClick={() => preview(scene.id)}>
        {t("editor.playFromScene")}
      </button>
      <Field label={t("editor.text")}>
        <textarea
          rows={7}
          value={scene.text}
          placeholder={t("editor.textHint")}
          onChange={(e) => edit((s) => (s.text = e.target.value))}
        />
      </Field>
      <Field label={t("editor.sceneStyle")}>
        <select
          aria-label={t("editor.sceneStyle")}
          value={
            scene.ending
              ? "ending"
              : scene.autoAdvance
                ? "automatic"
                : "interactive"
          }
          onChange={(e) =>
            edit((s) => {
              s.ending = e.target.value === "ending";
              s.autoAdvance =
                e.target.value === "automatic"
                  ? (s.autoAdvance ?? { targetSceneId: "", delaySeconds: 5 })
                  : undefined;
            })
          }
        >
          <option value="interactive">{t("editor.interactiveScene")}</option>
          <option value="automatic">{t("editor.automaticScene")}</option>
          <option value="ending">{t("editor.finalScene")}</option>
        </select>
      </Field>
      {scene.autoAdvance && (
        <>
          <Field label={t("editor.automaticTarget")}>
            <select
              aria-label={t("editor.automaticTarget")}
              value={scene.autoAdvance.targetSceneId}
              onChange={(e) =>
                edit((s) => {
                  if (s.autoAdvance)
                    s.autoAdvance.targetSceneId = e.target.value;
                })
              }
            >
              <option value="">{t("common.none")}</option>
              {story.scenes
                .filter((s) => s.id !== scene.id)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
            </select>
          </Field>
          <Field label={t("editor.automaticDelay")}>
            <input
              aria-label={t("editor.automaticDelay")}
              type="number"
              min={1}
              max={3600}
              step={1}
              value={scene.autoAdvance.delaySeconds}
              onChange={(e) => {
                const n = Number(e.target.value);
                if (Number.isFinite(n))
                  edit((s) => {
                    if (s.autoAdvance)
                      s.autoAdvance.delaySeconds = Math.max(
                        1,
                        Math.min(3600, n),
                      );
                  });
              }}
            />
          </Field>
          <small>{t("editor.automaticHint")}</small>
        </>
      )}
      <Field label={t("editor.sceneBackground")}>
        <ColorInput
          label={t("editor.sceneBackground")}
          value={
            scene.backgroundColor ??
            story.presentation?.colors?.background ??
            themeColors[story.presentation?.theme ?? "forest"].background
          }
          onChange={(color) =>
            edit((s) => {
              s.backgroundColor = color;
            })
          }
        />
        {scene.backgroundColor && (
          <button
            onClick={() =>
              edit((s) => {
                s.backgroundColor = undefined;
              })
            }
          >
            {t("editor.resetBackground")}
          </button>
        )}
      </Field>
      {(["imageId", "videoId", "voiceId", "musicId", "ambientId"] as const).map(
        (key, i) => {
          const label = t(
            (
              [
                "editor.image",
                "editor.video",
                "editor.voice",
                "editor.music",
                "editor.ambient",
              ] as const
            )[i],
          );
          const asset = assets.find((a) => a.id === scene[key]);
          return (
            <div className="media-field" key={key}>
              <Field label={label}>
                <select
                  aria-label={label}
                  value={scene[key] ?? ""}
                  onChange={(e) =>
                    edit((s) => (s[key] = e.target.value || undefined))
                  }
                >
                  <option value="">{t("common.none")}</option>
                  {assets
                    .filter((a) =>
                      key === "imageId"
                        ? a.kind === "image"
                        : key === "videoId"
                          ? a.kind === "video"
                          : a.kind === "audio" || a.kind === "music",
                    )
                    .map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                </select>
              </Field>
              {asset && (
                <>
                  <AssetPreview asset={asset} />
                  <button onClick={() => edit((s) => (s[key] = undefined))}>
                    {t("common.remove")}
                  </button>
                </>
              )}
              <label className="button upload">
                {t("common.upload")}
                <input
                  aria-label={label}
                  type="file"
                  accept={
                    key === "imageId"
                      ? "image/*"
                      : key === "videoId"
                        ? ".mp4,.webm,video/mp4,video/webm"
                        : "audio/*"
                  }
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    try {
                      const a = await uploadAsset(
                        file,
                        key === "imageId"
                          ? "image"
                          : key === "videoId"
                            ? "video"
                            : key === "musicId"
                              ? "music"
                              : "audio",
                        story.id,
                      );
                      await refreshAssets();
                      edit((s) => (s[key] = a.id));
                    } catch (error) {
                      report(
                        error instanceof Error &&
                          error.message === t("editor.videoFormat")
                          ? error.message
                          : t("common.error"),
                      );
                    }
                    e.target.value = "";
                  }}
                />
              </label>
              {key === "videoId" && (
                <>
                  <small>{t("editor.videoHint")}</small>
                  {scene.videoId && (
                    <>
                      <label className="check">
                        <input
                          type="checkbox"
                          checked={
                            !scene.autoAdvance && (scene.videoLoop ?? true)
                          }
                          disabled={!!scene.autoAdvance}
                          onChange={(e) =>
                            edit((s) => (s.videoLoop = e.target.checked))
                          }
                        />
                        {t("editor.videoLoop")}
                      </label>
                      <label className="check">
                        <input
                          type="checkbox"
                          checked={scene.videoSound ?? false}
                          onChange={(e) =>
                            edit((s) => (s.videoSound = e.target.checked))
                          }
                        />
                        {t("editor.videoSound")}
                      </label>
                    </>
                  )}
                </>
              )}
            </div>
          );
        },
      )}
      <label className="check">
        <input
          type="checkbox"
          checked={scene.ending}
          onChange={(e) =>
            edit((s) => {
              s.ending = e.target.checked;
              if (s.ending) s.autoAdvance = undefined;
            })
          }
        />
        {t("editor.ending")}
      </label>
      <small>{t("editor.endingHint")}</small>
      <ActionsEditor
        variables={story.variables}
        actions={scene.actions}
        onChange={(actions) => edit((s) => (s.actions = actions))}
      />
      <h3>{t("editor.choices")}</h3>
      {scene.choices.map((choice, i) => (
        <div className="choice-edit" key={choice.id}>
          <div className="row spread">
            <span className="ordinal">{String(i + 1).padStart(2, "0")}</span>
            <div className="row">
              <button
                aria-label={t("common.up")}
                disabled={!i}
                onClick={() =>
                  edit((s) => {
                    [s.choices[i - 1], s.choices[i]] = [
                      s.choices[i],
                      s.choices[i - 1],
                    ];
                  })
                }
              >
                ↑
              </button>
              <button
                aria-label={t("common.down")}
                disabled={i === scene.choices.length - 1}
                onClick={() =>
                  edit((s) => {
                    [s.choices[i + 1], s.choices[i]] = [
                      s.choices[i],
                      s.choices[i + 1],
                    ];
                  })
                }
              >
                ↓
              </button>
              <button
                aria-label={t("common.delete")}
                onClick={() =>
                  edit(
                    (s) =>
                      (s.choices = s.choices.filter((c) => c.id !== choice.id)),
                  )
                }
              >
                ×
              </button>
            </div>
          </div>
          <Field label={t("editor.choiceText")}>
            <input
              value={choice.text}
              onChange={(e) =>
                edit((s) => (s.choices[i].text = e.target.value))
              }
            />
          </Field>
          <Field label={t("editor.target")}>
            <select
              value={choice.targetSceneId}
              onChange={(e) =>
                edit((s) => (s.choices[i].targetSceneId = e.target.value))
              }
            >
              <option value="">{t("common.none")}</option>
              {story.scenes.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </Field>
          <ConditionEditor
            variables={story.variables}
            condition={choice.condition}
            onChange={(condition) =>
              edit((s) => (s.choices[i].condition = condition))
            }
          />
          <ActionsEditor
            variables={story.variables}
            actions={choice.actions}
            onChange={(actions) =>
              edit((s) => (s.choices[i].actions = actions))
            }
          />
        </div>
      ))}
      <button
        className="wide"
        onClick={() => edit((s) => s.choices.push(newChoice()))}
      >
        + {t("editor.addChoice")}
      </button>
    </section>
  );
}
