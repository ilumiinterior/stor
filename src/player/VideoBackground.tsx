import { useEffect, useRef, useState } from "react";
import type { Asset } from "../types/story";
import { useAssetUrl } from "./useAssetUrl";
import { t } from "../i18n";
import { sound as soundEngine } from "./audio";
export function VideoBackground({
  asset,
  poster,
  active,
  loop,
  sound,
  volume,
  onReady,
  onChoicePause,
  onComplete,
  onFailure,
  controls = true,
}: {
  asset: Asset;
  poster: string;
  active: boolean;
  loop: boolean;
  sound: boolean;
  volume: number;
  onReady: (ready: boolean) => void;
  onChoicePause: (paused: boolean) => void;
  onComplete?: () => void;
  onFailure?: () => void;
  controls?: boolean;
}) {
  const url = useAssetUrl(asset);
  const video = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [failed, setFailed] = useState(false);
  const [audioFailed, setAudioFailed] = useState(false);
  const [hidden, setHidden] = useState(document.hidden);
  const [choicePause, setChoicePause] = useState(false);
  const [manualPause, setManualPause] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    onChoicePause(choicePause);
  }, [choicePause, onChoicePause]);
  useEffect(() => {
    if (!choicePause || !loop || !active || hidden || manualPause) return;
    const timer = window.setTimeout(() => {
      if (video.current) video.current.currentTime = 0;
      setChoicePause(false);
    }, 4000);
    return () => window.clearTimeout(timer);
  }, [choicePause, loop, active, hidden, manualPause]);
  useEffect(() => {
    const visibility = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", visibility);
    return () => document.removeEventListener("visibilitychange", visibility);
  }, []);
  useEffect(() => {
    if (video.current) {
      video.current.volume = Math.max(0, Math.min(1, volume));
      video.current.muted = true;
    }
  }, [sound, volume, url]);
  useEffect(() => {
    const element = video.current;
    if (!element || !url || !active || !sound || hidden) return;
    setAudioFailed(false);
    return soundEngine.bindVideo(element, asset, volume, () =>
      setAudioFailed(true),
    );
  }, [asset, url, active, sound, hidden, volume]);
  useEffect(() => {
    const element = video.current;
    if (!element || !url) return;
    let cancelled = false;
    if (!active || hidden || manualPause || choicePause) {
      element.pause();
      if (active && manualPause && !controls) onFailure?.();
    } else
      void element
        .play()
        .then(() => {
          if (!cancelled) setBlocked(false);
        })
        .catch((error) => {
          if (!cancelled && error.name !== "AbortError") {
            setBlocked(true);
            if (!controls) onFailure?.();
          }
        });
    return () => {
      cancelled = true;
      element.pause();
    };
  }, [url, active, hidden, manualPause, choicePause, controls, onFailure]);
  async function toggle() {
    const element = video.current;
    if (!element) return;
    if (playing) {
      setManualPause(true);
      element.pause();
    } else {
      setChoicePause(false);
      setManualPause(false);
      try {
        await element.play();
        setBlocked(false);
      } catch {
        setBlocked(true);
      }
    }
  }
  return (
    <>
      <video
        ref={video}
        className="player-video"
        src={url || undefined}
        poster={poster || undefined}
        playsInline
        muted
        preload="auto"
        aria-label={asset.name}
        style={failed ? { visibility: "hidden" } : undefined}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false);
          if (onComplete) onComplete();
          else setChoicePause(true);
        }}
        onError={() => {
          if (url) {
            setFailed(true);
            onReady(false);
            onFailure?.();
          }
        }}
        onLoadedData={() => {
          setFailed(false);
          onReady(true);
        }}
      />
      {active && controls && (
        <div className="player-video-controls">
          {failed ? (
            <span role="alert">{t("player.videoUnsupported")}</span>
          ) : (
            <>
              <button
                disabled={choicePause && loop}
                onClick={() => void toggle()}
              >
                {t(
                  choicePause && loop
                    ? "player.videoChoicePause"
                    : playing
                      ? "player.pauseVideo"
                      : "player.playVideo",
                )}
              </button>
              {blocked && (
                <small role="status">{t("player.videoAutoplay")}</small>
              )}
            </>
          )}
        </div>
      )}
      {active && audioFailed && (
        <small role="alert" className="player-video-controls">
          {t("player.audioBlocked")}
        </small>
      )}
    </>
  );
}
