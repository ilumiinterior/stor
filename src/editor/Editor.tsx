import { useState } from "react";
import { useEditor } from "../stores/editor";
import { t } from "../i18n";
import { newScene } from "../utils/demo";
import { db } from "../database";
import { exportProject, download } from "../utils/project";
import { validate } from "../engine/validate";
import { Graph } from "./Graph";
import { SceneEditor } from "./SceneEditor";
import { Assets } from "./Assets";
import { Variables } from "./Variables";
import { Field } from "../components/Fields";
import { AppearanceFields } from "../components/AppearanceFields";
import { useAppearance } from "../stores/appearance";
import { defaultPresentation } from "../utils/appearance";
import { colorStyle, themeColors } from "../utils/colors";
export function Editor({
  back,
  preview,
  importFile,
}: {
  back: () => void;
  preview: (sceneId?: string) => void;
  importFile: (file: File) => Promise<void>;
}) {
  const {
    story,
    assets,
    selected,
    select,
    update,
    status,
    error,
    report,
    flush,
    load,
  } = useEditor();
  const [tab, setTab] = useState<
    "story" | "scenes" | "assets" | "variables" | "debug"
  >("scenes");
  const [panel, setPanel] = useState(true);
  const preferences = useAppearance();
  if (!story) return null;
  const warnings = validate(story, assets);
  const create = () => {
    const scene = newScene(
      t("editor.newScene"),
      story.scenes.length * 80,
      story.scenes.length * 60,
    );
    update((s) => s.scenes.push(scene));
    select(scene.id);
  };
  return (
    <div
      className="editor-shell"
      data-theme={preferences.editorTheme}
      data-font={preferences.editorFont}
      style={colorStyle(preferences.editorColors, preferences.editorTheme)}
    >
      <header className="toolbar">
        <button className="brand" onClick={back}>
          {t("app.name")}
          <span>↗</span>
        </button>
        <input
          className="story-title"
          aria-label={t("common.name")}
          value={story.title}
          onChange={(e) => update((s) => (s.title = e.target.value))}
        />
        <span className="save-status" role="status">
          {status}
        </span>
        <div className="toolbar-actions">
          <label className="button">
            {t("editor.editorBackground")}
            <input
              type="color"
              aria-label={t("editor.editorBackground")}
              value={
                preferences.editorColors.background ??
                themeColors[preferences.editorTheme].background
              }
              onChange={(e) =>
                preferences.setEditorColors({
                  ...preferences.editorColors,
                  background: e.target.value,
                })
              }
            />
          </label>
          <button
            onClick={() => void flush().catch(() => report(t("common.error")))}
          >
            {t("common.save")}
          </button>
          <label className="button upload">
            {t("editor.import")}
            <input
              type="file"
              accept=".story"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void importFile(f);
                e.target.value = "";
              }}
            />
          </label>
          <button
            onClick={async () => {
              try {
                await flush();
                download(
                  await exportProject(story),
                  `${story.title.replace(/[^\p{L}\p{N}_-]/gu, "-") || "story"}.story`,
                );
              } catch {
                report(t("common.error"));
              }
            }}
          >
            {t("editor.export")}
          </button>
          <button className="primary" onClick={() => preview()}>
            {t("editor.preview")} <span>▷</span>
          </button>
        </div>
      </header>
      {error && (
        <div className="error" role="alert">
          {error}
          <button
            onClick={() => void flush().catch(() => report(t("common.error")))}
          >
            {t("common.retry")}
          </button>
        </div>
      )}
      <div className="editor-body">
        <nav className="editor-nav">
          {(["story", "scenes", "assets", "variables", "debug"] as const).map(
            (item, i) => (
              <button
                key={item}
                className={tab === item ? "active" : ""}
                onClick={() => {
                  setTab(item);
                  setPanel(true);
                  if (window.matchMedia("(max-width:600px)").matches)
                    select("");
                }}
              >
                <span className="nav-symbol">
                  {["◈", "⤳", "▧", "ƒ", "◎"][i]}
                </span>
                <span>{t(`editor.${item}`)}</span>
                {item === "debug" && warnings.length > 0 && (
                  <small>{warnings.length}</small>
                )}
              </button>
            ),
          )}
          <small className="local-note">{t("app.local")}</small>
        </nav>
        <aside className={`left-panel ${panel ? "open" : ""}`}>
          <button
            className="mobile-close"
            aria-label={t("common.close")}
            onClick={() => setPanel(false)}
          >
            ×
          </button>
          {tab === "scenes" && (
            <section>
              <div className="row spread">
                <h2>{t("editor.scenes")}</h2>
                <span className="muted">{story.scenes.length}</span>
              </div>
              <button className="wide primary" onClick={create}>
                + {t("editor.newScene")}
              </button>
              <div className="scene-list">
                {story.scenes.map((s, i) => (
                  <button
                    className={selected === s.id ? "active" : ""}
                    key={s.id}
                    onClick={() => {
                      select(s.id);
                      setPanel(false);
                    }}
                  >
                    <span className="ordinal">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span>{s.name}</span>
                    {s.ending && <span>◉</span>}
                  </button>
                ))}
              </div>
              <p className="muted">{t("editor.mapHint")}</p>
            </section>
          )}
          {tab === "assets" && <Assets />}
          {tab === "variables" && <Variables />}
          {tab === "debug" && (
            <section>
              <h2>{t("editor.debug")}</h2>
              <p className="muted">
                {warnings.length
                  ? t("debug.count", { count: warnings.length })
                  : t("debug.ok")}
              </p>
              {warnings.map((w, i) => (
                <button
                  className="warning"
                  key={i}
                  onClick={() => {
                    if (w.sceneId) select(w.sceneId);
                    setPanel(false);
                  }}
                >
                  <strong>
                    {story.scenes.find((s) => s.id === w.sceneId)?.name ??
                      story.title}
                  </strong>
                  <span>{t(w.key)}</span>
                </button>
              ))}
            </section>
          )}
          {tab === "story" && (
            <section>
              <h2>{t("editor.story")}</h2>
              <Field label={t("common.name")}>
                <input
                  value={story.title}
                  onChange={(e) => update((s) => (s.title = e.target.value))}
                />
              </Field>
              <Field label={t("editor.language")}>
                <input
                  value={story.contentLanguage}
                  onChange={(e) =>
                    update((s) => (s.contentLanguage = e.target.value))
                  }
                />
              </Field>
              <small>{t("editor.languageHint")}</small>
              <h3>{t("appearance.player")}</h3>
              <label className="check">
                <input
                  type="checkbox"
                  checked={story.presentation?.showSceneNames ?? false}
                  onChange={(e) =>
                    update((s) => {
                      s.presentation = {
                        ...defaultPresentation,
                        ...s.presentation,
                        showSceneNames: e.target.checked,
                      };
                    })
                  }
                />
                {t("appearance.showSceneNames")}
              </label>
              <AppearanceFields
                colors={story.presentation?.colors}
                onColorsChange={(colors) =>
                  update((s) => {
                    s.presentation = {
                      ...defaultPresentation,
                      ...s.presentation,
                      colors,
                    };
                  })
                }
                font={story.presentation?.font ?? defaultPresentation.font}
                theme={story.presentation?.theme ?? defaultPresentation.theme}
                onChange={(font, theme) =>
                  update((s) => {
                    s.presentation = {
                      ...defaultPresentation,
                      ...s.presentation,
                      font,
                      theme,
                    };
                  })
                }
              />
              <h3>{t("appearance.editor")}</h3>
              <AppearanceFields
                colors={preferences.editorColors}
                onColorsChange={preferences.setEditorColors}
                font={preferences.editorFont}
                theme={preferences.editorTheme}
                onChange={preferences.setEditor}
              />
              <Field label={t("editor.start")}>
                <select
                  value={story.startSceneId}
                  onChange={(e) =>
                    update((s) => (s.startSceneId = e.target.value))
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
              <button
                onClick={async () => {
                  if (!confirm(t("editor.restoreConfirm"))) return;
                  try {
                    await flush();
                    const snapshot = await db.snapshots.get(story.id);
                    if (snapshot) {
                      await load(snapshot);
                      update(() => {});
                    }
                  } catch {
                    report(t("common.error"));
                  }
                }}
              >
                {t("editor.restore")}
              </button>
            </section>
          )}
        </aside>
        <main className="graph">
          <div className="graph-heading">
            <span className="eyebrow">{t("editor.scenes")}</span>
            <span>
              {t("editor.sceneCount", { count: story.scenes.length })}
            </span>
          </div>
          <Graph />
          <button
            className="floating-add"
            aria-label={t("editor.newScene")}
            onClick={create}
          >
            +
          </button>
        </main>
        {selected && (
          <aside className="right-panel">
            <SceneEditor preview={preview} />
          </aside>
        )}
      </div>
    </div>
  );
}
