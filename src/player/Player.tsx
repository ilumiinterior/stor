import { useEffect, useRef, useState, useCallback } from "react";
import type { Story, Asset, SaveGame, Choice } from "../types/story";
import { t } from "../i18n";
import {
  advance,
  begin,
  choose,
  expireTimer,
  meets,
  validSave,
} from "../engine";
import { db } from "../database";
import { useAssetUrl } from "./useAssetUrl";
import { sound } from "./audio";
import { saveGameSchema } from "../utils/schema";
import { useAppearance } from "../stores/appearance";
import { defaultPresentation } from "../utils/appearance";
import { AppearanceFields } from "../components/AppearanceFields";
import { VideoBackground } from "./VideoBackground";
import { colorStyle } from "../utils/colors";
import { version } from "../../package.json";
import { useTextPart } from "./useTextPart";
function readSettings() {
  try {
    const raw = JSON.parse(localStorage.getItem("vetvy.settings") ?? "{}");
    return {
      sound: typeof raw.sound === "boolean" ? raw.sound : true,
      volume:
        typeof raw.volume === "number"
          ? Math.max(0, Math.min(1, raw.volume))
          : 0.7,
      large: raw.large === true,
      soundtrackVolume:
        typeof raw.soundtrackVolume === "number" &&
        Number.isFinite(raw.soundtrackVolume)
          ? Math.max(0, Math.min(1, raw.soundtrackVolume))
          : 1,
    };
  } catch {
    return { sound: true, volume: 0.7, soundtrackVolume: 1, large: false };
  }
}
export function Player({
  story,
  assets,
  previewScene,
  back,
  standalone = false,
  onSceneChange,
}: {
  story: Story;
  assets: Asset[];
  previewScene?: string;
  back: () => void;
  standalone?: boolean;
  onSceneChange?: (sceneId: string) => void;
}) {
  const preview = previewScene !== undefined;
  const preferences = useAppearance();
  const presentation = { ...defaultPresentation, ...story.presentation };
  const font = preview
    ? presentation.font
    : (preferences.playerFont ?? presentation.font);
  const theme = preview
    ? presentation.theme
    : (preferences.playerTheme ?? presentation.theme);
  const colors = preview
    ? presentation.colors
    : (preferences.playerColors ?? presentation.colors);
  const [game, setGame] = useState<SaveGame | null>(
    preview ? begin(story, previewScene) : null,
  );
  const [menu, setMenu] = useState(!preview);
  const [page, setPage] = useState<"main" | "saves" | "settings">("main");
  const [slots, setSlots] = useState<SaveGame[]>([]);
  const [settings, setSettings] = useState(readSettings);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(preview);
  const gameRef = useRef(game);
  const clock = useRef(performance.now());
  const active = useRef(false);
  const [timerTick, setTimerTick] = useState(performance.now());
  const queue = useRef(Promise.resolve(true));
  const locked = useRef(false);
  const scene = story.scenes.find((s) => s.id === game?.currentSceneId);
  useEffect(() => {
    if (scene) onSceneChange?.(scene.id);
  }, [scene, onSceneChange]);
  const timerOnly = !!scene?.timerOnly;
  const image = useAssetUrl(
    assets.find((a) => !timerOnly && a.id === scene?.imageId),
  );
  const videoAsset = assets.find(
    (a) => !timerOnly && a.id === scene?.videoId && a.kind === "video",
  );
  const [videoReady, setVideoReady] = useState(false);
  const [choicesHighlighted, setChoicesHighlighted] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const [pageHidden, setPageHidden] = useState(document.hidden);
  const [videoProgress, setVideoProgress] = useState({
    assetId: "",
    fraction: 0,
    seconds: 0,
  });
  const textSceneKey = `${scene?.id}:${game?.history.length}`;
  const reportVideoProgress = useCallback(
    (assetId: string, fraction: number, seconds: number) =>
      setVideoProgress({
        assetId: `${textSceneKey}:${assetId}`,
        fraction,
        seconds,
      }),
    [textSceneKey],
  );
  const staticTextPart = useTextPart(
    textSceneKey,
    !!scene?.textSequence?.enabled,
    scene?.autoAdvance?.delaySeconds ??
      scene?.textSequence?.durationSeconds ??
      6,
    menu || pageHidden,
    scene?.textSequence?.firstDurationSeconds,
    scene?.textSequence?.secondDurationSeconds,
  );
  const textPart =
    videoAsset && !videoFailed
      ? videoProgress.assetId !== `${textSceneKey}:${videoAsset.id}`
        ? 0
        : scene?.textSequence?.firstDurationSeconds !== undefined
          ? scene.textSequence.secondDurationSeconds !== undefined &&
            videoProgress.seconds >=
              scene.textSequence.firstDurationSeconds +
                scene.textSequence.secondDurationSeconds
            ? 2
            : videoProgress.seconds >= scene.textSequence.firstDurationSeconds
              ? 1
              : 0
          : videoProgress.fraction >= 0.5
            ? 1
            : 0
      : staticTextPart;
  const overlay = scene?.timerOverlay;
  const timedTimer = !timerOnly && !!overlay?.enabled;
  const overlayPart = useTextPart(
    textSceneKey,
    timedTimer && !!story.timer?.enabled,
    0,
    menu || pageHidden,
    overlay?.startSeconds ?? 0,
    overlay?.durationSeconds ?? 2,
  );
  const overlayVideoSeconds =
    videoProgress.assetId === `${textSceneKey}:${videoAsset?.id}`
      ? videoProgress.seconds
      : 0;
  const overlayVisible =
    videoAsset && !videoFailed
      ? overlayVideoSeconds >= (overlay?.startSeconds ?? 0) &&
        overlayVideoSeconds <
          (overlay?.startSeconds ?? 0) + (overlay?.durationSeconds ?? 2)
      : overlayPart === 1;
  const centeredTimer = timerOnly || timedTimer;
  const hasGame = !!game;
  useEffect(() => {
    if (!story.timer?.enabled || !hasGame || menu || pageHidden) return;
    const interval = window.setInterval(
      () => setTimerTick(performance.now()),
      250,
    );
    return () => window.clearInterval(interval);
  }, [story.timer?.enabled, hasGame, menu, pageHidden]);
  const automaticClock = useRef({ sceneId: "", remaining: 0 });
  useEffect(() => {
    const listener = () => setPageHidden(document.hidden);
    document.addEventListener("visibilitychange", listener);
    return () => document.removeEventListener("visibilitychange", listener);
  }, []);
  useEffect(() => {
    setVideoReady(false);
    setChoicesHighlighted(false);
    setVideoFailed(false);
    automaticClock.current = {
      sceneId: scene?.id ?? "",
      remaining: (scene?.autoAdvance?.delaySeconds ?? 5) * 1000,
    };
  }, [scene?.id, videoAsset?.id]);
  const [backgrounds, setBackgrounds] = useState<string[]>([]);
  useEffect(() => {
    if (image) {
      setBackgrounds((previous) => [...previous.slice(-1), image]);
      const timer = setTimeout(() => setBackgrounds([image]), 500);
      return () => clearTimeout(timer);
    }
    setBackgrounds([]);
  }, [image]);
  const save = useCallback(
    (slot = 0, source = gameRef.current) => {
      if (preview || !source) return Promise.resolve(true);
      const now = performance.now();
      const elapsed = active.current ? now - clock.current : 0;
      clock.current = now;
      const current = {
        ...source,
        playTime: source.playTime + elapsed,
        timerElapsedMs:
          (source.timerElapsedMs ?? source.playTime) +
          (story.scenes.find((s) => s.id === source.currentSceneId)?.ending
            ? 0
            : elapsed),
        timestamp: Date.now(),
      };
      gameRef.current = current;
      const snapshot = { ...current, slot, id: `${story.id}:${slot}` };
      queue.current = queue.current
        .catch(() => false)
        .then(async () => {
          await db.saves.put(snapshot);
          setSlots(
            (await db.saves.where("storyId").equals(story.id).toArray()).filter(
              (s) => saveGameSchema.safeParse(s).success,
            ),
          );
          setError("");
          return true;
        })
        .catch(() => {
          setError(t("common.error"));
          return false;
        });
      return queue.current;
    },
    [preview, story],
  );
  useEffect(() => {
    let mounted = true;
    if (!preview)
      void db.saves
        .where("storyId")
        .equals(story.id)
        .toArray()
        .then((data) => {
          if (mounted) {
            setSlots(data.filter((s) => saveGameSchema.safeParse(s).success));
            if (data.some((s) => !saveGameSchema.safeParse(s).success))
              setError(t("player.invalidSave"));
            setReady(true);
          }
        })
        .catch(() => {
          if (mounted) {
            setError(t("common.error"));
            setReady(true);
          }
        });
    return () => {
      mounted = false;
    };
  }, [preview, story.id]);
  useEffect(() => {
    gameRef.current = game;
    clock.current = performance.now();
  }, [game]);
  useEffect(() => {
    active.current = !menu && !document.hidden;
    clock.current = performance.now();
  }, [menu]);
  useEffect(() => {
    const visibility = () => {
      void save();
      active.current = !document.hidden && !menu;
      clock.current = performance.now();
    };
    const hide = () => {
      void save();
    };
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("pagehide", hide);
    const timer = setInterval(() => {
      if (active.current) void save();
    }, 15000);
    return () => {
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("pagehide", hide);
      clearInterval(timer);
    };
  }, [save, menu]);
  useEffect(() => {
    try {
      localStorage.setItem("vetvy.settings", JSON.stringify(settings));
    } catch {
      /* Settings are optional; story persistence is handled separately. */
    }
    sound.setVolume(settings.volume);
    sound.setMusicVolume(
      scene?.musicId
        ? 0.45
        : (story.soundtrack?.volume ?? 0.45) * settings.soundtrackVolume,
    );
    if (!settings.sound || menu || pageHidden) {
      sound.stop();
      return;
    }
    let current = true;
    for (const [kind, key] of [
      ["voice", "voiceId"],
      ["music", "musicId"],
      ["ambient", "ambientId"],
    ] as const)
      void sound
        .play(
          kind,
          assets.find(
            (a) =>
              a.id ===
              (scene?.[key] ??
                (key === "musicId" ? story.soundtrack?.assetId : undefined)),
          ),
          scene?.id,
        )
        .catch(() => {
          if (current) setError(t("player.audioBlocked"));
        });
    return () => {
      current = false;
    };
  }, [scene, settings, assets, menu, pageHidden, timerOnly, story.soundtrack]);
  useEffect(() => () => sound.stop(), []);
  useEffect(() => {
    if (!scene) return;
    const urls: string[] = [];
    for (const choice of scene.choices) {
      const next = story.scenes.find((s) => s.id === choice.targetSceneId);
      const asset = assets.find((a) => a.id === next?.imageId);
      if (asset) {
        const url = URL.createObjectURL(asset.blob);
        urls.push(url);
        const img = new Image();
        img.src = url;
      }
    }
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [scene, story, assets]);
  function start() {
    if (
      (gameRef.current || slots.some((s) => s.slot === 0)) &&
      !preview &&
      !confirm(t("player.restartConfirm"))
    )
      return;
    sound.unlock();
    const next = begin(story, previewScene ?? story.startSceneId);
    gameRef.current = next;
    setGame(next);
    setMenu(false);
    clock.current = performance.now();
    void save(0, next);
  }
  function restore(saved: SaveGame) {
    if (!validSave(story, saved)) {
      setError(t("player.invalidSave"));
      return;
    }
    sound.unlock();
    const next = { ...saved, slot: 0, id: `${story.id}:0` };
    gameRef.current = next;
    setGame(next);
    setMenu(false);
    setPage("main");
    clock.current = performance.now();
    void save(0, next);
  }
  const decision = useCallback(
    async (choice?: Choice, timedOut = false) => {
      if (locked.current || !gameRef.current) return;
      if (choice) sound.unlock();
      locked.current = true;
      try {
        const now = performance.now();
        const previous = {
          ...gameRef.current,
          playTime:
            gameRef.current.playTime +
            (active.current ? now - clock.current : 0),
          timerElapsedMs:
            (gameRef.current.timerElapsedMs ?? gameRef.current.playTime) +
            (active.current &&
            !story.scenes.find((s) => s.id === gameRef.current?.currentSceneId)
              ?.ending
              ? now - clock.current
              : 0),
        };
        clock.current = now;
        const next = timedOut
          ? expireTimer(story, previous)
          : choice
            ? choose(story, previous, choice)
            : advance(story, previous);
        gameRef.current = next;
        setGame(next);
        await save(0, next);
      } catch {
        setError(t("common.error"));
      } finally {
        locked.current = false;
      }
    },
    [story, save],
  );
  const automatic = (!!scene?.autoAdvance || timerOnly) && !scene?.ending;
  const automaticValid =
    automatic &&
    story.scenes.some(
      (s) => s.id === scene.autoAdvance?.targetSceneId && s.id !== scene.id,
    );
  const completeVideo = useCallback(() => {
    void decision();
  }, [decision]);
  const failVideo = useCallback(() => setVideoFailed(true), []);
  const recoverVideo = useCallback(() => setVideoFailed(false), []);
  useEffect(() => {
    if (!scene || !automaticValid) return;
    if (automaticClock.current.sceneId !== scene.id)
      automaticClock.current = {
        sceneId: scene.id,
        remaining: (scene.autoAdvance?.delaySeconds ?? 5) * 1000,
      };
    if (menu || pageHidden || (videoAsset && !videoFailed)) return;
    const started = performance.now();
    const timer = window.setTimeout(() => {
      void decision();
    }, automaticClock.current.remaining);
    return () => {
      window.clearTimeout(timer);
      automaticClock.current.remaining = Math.max(
        0,
        automaticClock.current.remaining - (performance.now() - started),
      );
    };
  }, [
    scene,
    automaticValid,
    menu,
    pageHidden,
    videoAsset,
    videoFailed,
    decision,
  ]);
  const auto = slots.find((s) => s.slot === 0);
  const timerSource = gameRef.current ?? game;
  const remainingSeconds = Math.max(
    0,
    Math.ceil(
      ((story.timer?.durationSeconds ?? 0) * 1000 -
        (timerSource?.timerElapsedMs ?? timerSource?.playTime ?? 0) -
        (active.current && !menu && !pageHidden && !scene?.ending
          ? Math.max(0, timerTick - clock.current)
          : 0)) /
        1000,
    ),
  );
  const timerTargetValid = story.scenes.some(
    (s) => s.id === story.timer?.targetSceneId && s.ending,
  );
  useEffect(() => {
    if (
      story.timer?.enabled &&
      game &&
      !menu &&
      !pageHidden &&
      !scene?.ending &&
      remainingSeconds === 0 &&
      timerTargetValid
    )
      void decision(undefined, true);
  }, [
    story.timer?.enabled,
    game,
    menu,
    pageHidden,
    scene?.ending,
    remainingSeconds,
    timerTargetValid,
    decision,
    timerTick,
  ]);
  const timerDisplay = `${String(Math.floor(remainingSeconds / 60)).padStart(2, "0")}:${String(remainingSeconds % 60).padStart(2, "0")}`;
  const exit = async () => {
    if (await save()) back();
  };
  return (
    <main
      className={`player-shell ${settings.large ? "large-text" : ""}`}
      data-theme={theme}
      style={colorStyle(
        scene?.backgroundColor
          ? { ...colors, background: scene.backgroundColor }
          : colors,
        theme,
      )}
      data-font={font}
    >
      {!timerOnly &&
        backgrounds.map((url, i) => (
          <div
            key={url}
            aria-hidden="true"
            className={`player-background ${i === backgrounds.length - 1 ? "incoming" : ""}`}
            style={{
              backgroundImage: `url("${url}")`,
              visibility: videoReady ? "hidden" : undefined,
            }}
          />
        ))}
      {videoAsset && (
        <VideoBackground
          key={`${scene?.id}:${videoAsset.id}`}
          asset={videoAsset}
          poster={image}
          active={!menu}
          loop={automatic ? false : (scene?.videoLoop ?? true)}
          sound={(scene?.videoSound ?? false) && settings.sound}
          volume={settings.volume}
          onReady={setVideoReady}
          onChoicePause={setChoicesHighlighted}
          onComplete={automaticValid ? completeVideo : undefined}
          onFailure={failVideo}
          controls={!automatic}
          onProgress={reportVideoProgress}
          onRecovery={recoverVideo}
        />
      )}
      <div className="player-shade" />
      {story.timer?.enabled &&
        game &&
        !menu &&
        scene &&
        (timerOnly ||
          (timedTimer
            ? overlayVisible
            : (scene.showTimer ?? !scene.ending))) && (
          <div
            className={`player-countdown${centeredTimer ? " is-centered" : ""}${remainingSeconds <= 60 ? " is-low" : ""}`}
            role="timer"
            aria-label={t("timer.remaining")}
          >
            <strong>{timerDisplay}</strong>
          </div>
        )}
      {(!automatic || menu) && (
        <header className="player-top">
          {(!standalone || !menu) && (
            <button
              className={!menu ? "player-menu-symbol" : undefined}
              aria-label={!menu ? t("player.menu") : undefined}
              onClick={() => {
                if (menu) void exit();
                else {
                  void save();
                  setMenu(true);
                  setPage("main");
                }
              }}
            >
              {menu
                ? preview
                  ? t("player.returnEditor")
                  : t("app.back")
                : t("player.menuSymbol")}
            </button>
          )}
          <span>{preview ? t("player.preview") : story.title}</span>
        </header>
      )}
      {error && (
        <div className="player-error" role="alert">
          {error}
          {!automatic && (
            <button onClick={() => void save()}>{t("common.retry")}</button>
          )}
        </div>
      )}
      {!ready ? (
        <p className="player-loading">{t("app.loading")}</p>
      ) : menu ? (
        <div className="player-menu">
          <span className="eyebrow">
            {preview ? t("player.preview") : t("app.name")}
          </span>
          <h1>{story.title}</h1>
          {page === "main" && (
            <div className="menu-buttons">
              <button
                className="primary"
                disabled={!game && !auto}
                onClick={() =>
                  game
                    ? (sound.unlock(), setMenu(false))
                    : auto && restore(auto)
                }
              >
                {t("player.continue")} <span>→</span>
              </button>
              <button
                disabled={
                  !story.scenes.some((s) => s.id === story.startSceneId)
                }
                onClick={start}
              >
                {t("player.newStory")}
              </button>
              {!preview && (
                <button onClick={() => setPage("saves")}>
                  {t("player.loadGame")}
                </button>
              )}
              <button onClick={() => setPage("settings")}>
                {t("player.settings")}
              </button>
              <small>
                {preview ? t("player.preview") : t("player.saveHint")}
              </small>
            </div>
          )}
          {page === "saves" && (
            <div className="menu-buttons">
              {[0, 1, 2, 3].map((slot) => {
                const saved = slots.find((s) => s.slot === slot);
                return (
                  <div className="save-slot" key={slot}>
                    <div>
                      <strong>
                        {slot === 0
                          ? t("player.auto")
                          : t("player.slot", { number: slot })}
                      </strong>
                      <small>
                        {saved
                          ? `${new Intl.DateTimeFormat("sk", { dateStyle: "short", timeStyle: "short" }).format(saved.timestamp)} · ${t("player.minutes", { count: Math.floor(saved.playTime / 60000) })}`
                          : t("player.emptySlot")}
                      </small>
                    </div>
                    <div className="row">
                      <button
                        disabled={!saved}
                        onClick={() => saved && restore(saved)}
                      >
                        {t("player.loadGame")}
                      </button>
                      {slot > 0 && (
                        <button
                          disabled={!game}
                          onClick={() => {
                            if (!saved || confirm(t("player.overwrite")))
                              void save(slot);
                          }}
                        >
                          {t("common.save")}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
              <button onClick={() => setPage("main")}>
                {t("common.close")}
              </button>
            </div>
          )}
          {page === "settings" && (
            <div className="menu-buttons">
              <small>{t("player.appVersion", { version })}</small>
              {!preview && (
                <>
                  <AppearanceFields
                    colors={colors}
                    onColorsChange={preferences.setPlayerColors}
                    font={font}
                    theme={theme}
                    onChange={preferences.setPlayer}
                  />
                  <button
                    onClick={() => {
                      preferences.setPlayer(null, null);
                      preferences.setPlayerColors(null);
                    }}
                  >
                    {t("appearance.reset")}
                  </button>
                </>
              )}
              <label className="check">
                <input
                  type="checkbox"
                  checked={settings.sound}
                  onChange={(e) => {
                    sound.unlock();
                    setSettings({ ...settings, sound: e.target.checked });
                  }}
                />
                {t("player.sound")}
              </label>
              <label className="field">
                <span>{t("player.volume")}</span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={settings.volume}
                  onChange={(e) =>
                    setSettings({ ...settings, volume: Number(e.target.value) })
                  }
                />
              </label>
              {story.soundtrack && (
                <label className="field">
                  <span>
                    {t("soundtrack.volume")} ·{" "}
                    {Math.round(settings.soundtrackVolume * 100)} %
                  </span>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={settings.soundtrackVolume}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        soundtrackVolume: Number(e.target.value),
                      })
                    }
                  />
                </label>
              )}
              <label className="field">
                <span>{t("player.textSize")}</span>
                <select
                  value={settings.large ? "large" : "normal"}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      large: e.target.value === "large",
                    })
                  }
                >
                  <option value="normal">{t("player.normal")}</option>
                  <option value="large">{t("player.large")}</option>
                </select>
              </label>
              <button onClick={() => setPage("main")}>
                {t("common.close")}
              </button>
            </div>
          )}
        </div>
      ) : scene && timerOnly ? (
        <>
          {!story.timer?.enabled && (
            <p className="player-loading" role="alert">
              {t("timer.needsEnabled")}
            </p>
          )}
          {!automaticValid && (
            <p className="player-loading" role="alert">
              {t("debug.automaticTarget")}
            </p>
          )}
        </>
      ) : scene ? (
        <article
          className="scene-content"
          key={`${scene.id}-${game?.history.length}`}
        >
          {presentation.showSceneNames && (
            <span className="eyebrow">{scene.name}</span>
          )}
          {!(scene.textSequence?.enabled && textPart === 2) && (
            <p className="story-prose">
              {scene.textSequence?.enabled && textPart === 1
                ? scene.textSequence.secondText
                : scene.text}
            </p>
          )}
          <div
            className={`player-choices${choicesHighlighted ? " is-highlighted" : ""}`}
          >
            {(automatic ? [] : scene.choices)
              .filter((c) => meets(c.condition, game!.variables))
              .map((c, i) => (
                <button
                  key={c.id}
                  disabled={!story.scenes.some((s) => s.id === c.targetSceneId)}
                  onClick={() => void decision(c)}
                >
                  <span className="ordinal">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span>{c.text || t("editor.choiceText")}</span>
                  <span>→</span>
                </button>
              ))}
            {scene.ending && (
              <>
                <span className="ending-label">{t("player.ending")}</span>
                <button
                  onClick={() => {
                    void save();
                    setMenu(true);
                  }}
                >
                  {t("player.menu")}
                </button>
              </>
            )}
            {!scene.ending &&
              !automatic &&
              !scene.choices.some((c) =>
                meets(c.condition, game!.variables),
              ) && <p>{t("player.noChoices")}</p>}
            {automatic && !automaticValid && (
              <p role="alert">{t("debug.automaticTarget")}</p>
            )}
          </div>
        </article>
      ) : (
        <div className="player-menu">
          <p>{t("player.sceneMissing")}</p>
          <button onClick={() => setMenu(true)}>{t("player.menu")}</button>
        </div>
      )}
    </main>
  );
}
