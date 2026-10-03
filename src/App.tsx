import { useEffect, useState } from "react";
import { Player } from "./player/Player";
import { Pwa } from "./components/Pwa";
import { readProject } from "./utils/readProject";
import { t } from "./i18n";
import type { Story, Asset } from "./types/story";

export default function App() {
  const [game, setGame] = useState<{ story: Story; assets: Asset[] } | null>(
    null,
  );
  const [status, setStatus] = useState<
    "loading" | "missing" | "error" | "ready"
  >("loading");
  const [attempt, setAttempt] = useState(0);
  const [session, setSession] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch("/game.story", {
          signal: controller.signal,
          cache: "no-cache",
        });
        if (response.status === 404) {
          if (!controller.signal.aborted) setStatus("missing");
          return;
        }
        if (!response.ok) throw Error("game-load-failed");
        const published = await readProject(await response.blob());
        if (!controller.signal.aborted) {
          setGame(published);
          setStatus("ready");
          document.title = published.story.title;
        }
      } catch {
        if (!controller.signal.aborted) setStatus("error");
      }
    }
    void load();
    return () => controller.abort();
  }, [attempt]);
  if (game && status === "ready")
    return (
      <>
        <Player
          standalone
          key={`${game.story.id}:${session}`}
          story={game.story}
          assets={game.assets}
          back={() => setSession((value) => value + 1)}
        />
        <Pwa />
      </>
    );
  return (
    <main className="library">
      <div className="library-intro">
        <span className="eyebrow">{t("app.name")}</span>
        {status === "loading" ? (
          <p role="status">{t("app.loading")}</p>
        ) : status === "missing" ? (
          <>
            <h1>{t("player.unpublished")}</h1>
            <p>{t("player.unpublishedHint")}</p>
          </>
        ) : (
          <>
            <p role="alert">{t("player.gameLoadError")}</p>
            <button
              onClick={() => {
                setStatus("loading");
                setAttempt((value) => value + 1);
              }}
            >
              {t("common.retry")}
            </button>
          </>
        )}
      </div>
      <Pwa />
    </main>
  );
}
