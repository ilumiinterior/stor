import { useEffect, useState, lazy, Suspense } from "react";
import { db, deleteStory, persistStory } from "./database";
import type { Story, Asset } from "./types/story";
import { useEditor } from "./stores/editor";
import { t } from "./i18n";
import { newStory, demoStory } from "./utils/demo";
import { importProject } from "./utils/project";
import { storySchema } from "./utils/schema";
import { Pwa } from "./components/Pwa";
import { sound } from "./player/audio";
const Editor = lazy(() =>
  import("./editor/Editor").then((m) => ({ default: m.Editor })),
);
const Player = lazy(() =>
  import("./player/Player").then((m) => ({ default: m.Player })),
);
type Screen =
  | { mode: "library" }
  | { mode: "editor" }
  | { mode: "player"; story: Story; assets: Asset[]; previewScene?: string };
export default function App() {
  const [screen, setScreen] = useState<Screen>({ mode: "library" });
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const playerRoute = location.pathname === "/play";
  const refresh = async () => {
    const records = await db.stories.orderBy("updatedAt").reverse().toArray();
    setStories(records);
  };
  useEffect(() => {
    void refresh()
      .catch(() => setError(t("common.error")))
      .finally(() => setLoading(false));
    const pop = () => {
      void useEditor
        .getState()
        .flush()
        .then(async () => {
          setScreen({ mode: "library" });
          await refresh();
        })
        .catch(() => setError(t("common.error")));
    };
    window.addEventListener("popstate", pop);
    const prevent = (e: BeforeUnloadEvent) => {
      if (useEditor.getState().dirty) {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", prevent);
    return () => {
      window.removeEventListener("popstate", pop);
      window.removeEventListener("beforeunload", prevent);
    };
  }, []);
  async function open(raw: Story, mode: "editor" | "player") {
    const result = storySchema.safeParse(raw);
    if (!result.success) {
      setError(t("common.corrupt"));
      return;
    }
    if (mode === "editor") {
      await useEditor.getState().load(result.data);
      setScreen({ mode: "editor" });
    } else {
      setScreen({
        mode: "player",
        story: result.data,
        assets: await db.assets.where("storyId").equals(raw.id).toArray(),
      });
    }
    history.pushState({}, "", mode === "editor" ? "/editor" : "/play");
  }
  async function run(task: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await task();
    } catch {
      setError(t("common.error"));
    } finally {
      setBusy(false);
    }
  }
  async function importFile(file: File) {
    await run(async () => {
      const story = await importProject(file);
      await refresh();
      await open(story, "editor");
    });
  }
  async function back() {
    await run(async () => {
      await useEditor.getState().flush();
      await refresh();
      setScreen({ mode: "library" });
      history.pushState({}, "", playerRoute ? "/play" : "/editor");
    });
  }
  if (screen.mode === "editor")
    return (
      <Suspense fallback={<p className="player-loading">{t("app.loading")}</p>}>
        <Editor
          back={() => void back()}
          importFile={importFile}
          preview={(sceneId) => {
            const { story, assets } = useEditor.getState();
            if (story) {
              sound.unlock();
              setScreen({
                mode: "player",
                story: structuredClone(story),
                assets,
                previewScene: sceneId ?? story.startSceneId,
              });
            }
          }}
        />
        <Pwa />
        {error && (
          <div className="global-error" role="alert">
            {error}
          </div>
        )}
      </Suspense>
    );
  if (screen.mode === "player")
    return (
      <Suspense fallback={<p className="player-loading">{t("app.loading")}</p>}>
        <Player
          key={`${screen.story.id}:${screen.previewScene ?? "real"}`}
          {...screen}
          back={() => {
            if (screen.previewScene !== undefined)
              setScreen({ mode: "editor" });
            else void back();
          }}
        />
      </Suspense>
    );
  return (
    <main className="library">
      <header className="library-header">
        <a className="brand" href="/editor">
          {t("app.name")}
          <span>↗</span>
        </a>
        <span className="local-label">
          <span className="status-dot" />
          {t("app.local")}
        </span>
        <a href={playerRoute ? "/editor" : "/play"}>
          {playerRoute ? t("app.editor") : t("app.player")}
        </a>
      </header>
      <div className="library-intro">
        <span className="eyebrow">{t("app.library")}</span>
        <h1>{t("app.intro")}</h1>
        <div className="row wrap">
          <button
            className="primary"
            disabled={busy}
            onClick={() =>
              void run(async () => {
                const story = newStory();
                await persistStory(story);
                await open(story, "editor");
              })
            }
          >
            + {t("app.newStory")}
          </button>
          <label className="button upload">
            {t("editor.import")}
            <input
              disabled={busy}
              type="file"
              accept=".story"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void importFile(file);
                e.target.value = "";
              }}
            />
          </label>
        </div>
      </div>
      {error && (
        <div role="alert" className="error">
          {error}
          <button onClick={() => void run(refresh)}>{t("common.retry")}</button>
        </div>
      )}
      {loading ? (
        <p>{t("app.loading")}</p>
      ) : !stories.length ? (
        <section className="empty-state">
          <div className="branch-mark" aria-hidden="true">
            ⤳
          </div>
          <h2>{t("app.empty")}</h2>
          <p>{t("app.emptyHint")}</p>
          <button
            disabled={busy}
            onClick={() =>
              void run(async () => {
                const story = await demoStory();
                await refresh();
                await open(story, playerRoute ? "player" : "editor");
              })
            }
          >
            {t("app.demo")} →
          </button>
        </section>
      ) : (
        <div className="story-library">
          {stories.map((story, i) => (
            <article key={story.id} className="library-story">
              <span className="ordinal">{String(i + 1).padStart(2, "0")}</span>
              <div>
                <h2>{story.title}</h2>
                <p className="muted">
                  {t("editor.sceneCount", { count: story.scenes?.length ?? 0 })}{" "}
                  ·{" "}
                  {new Intl.DateTimeFormat("sk", {
                    dateStyle: "medium",
                  }).format(story.updatedAt)}
                </p>
              </div>
              <div className="row wrap">
                <button
                  disabled={busy}
                  onClick={() => void run(() => open(story, "editor"))}
                >
                  {t("common.edit")}
                </button>
                <button
                  className="primary"
                  disabled={busy}
                  onClick={() => void run(() => open(story, "player"))}
                >
                  {t("player.play")} →
                </button>
                <button
                  className="danger"
                  disabled={busy}
                  onClick={() => {
                    if (
                      confirm(t("common.confirmDelete", { name: story.title }))
                    )
                      void run(async () => {
                        await deleteStory(story.id);
                        await refresh();
                      });
                  }}
                >
                  {t("common.delete")}
                </button>
              </div>
            </article>
          ))}
          <button
            disabled={busy}
            onClick={() =>
              void run(async () => {
                const story = await demoStory();
                await refresh();
                await open(story, "editor");
              })
            }
          >
            {t("app.demo")}
          </button>
        </div>
      )}
      <Pwa />
    </main>
  );
}
