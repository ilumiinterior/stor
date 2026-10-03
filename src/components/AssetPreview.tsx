import { useEffect, useState, useRef } from "react";
import type { Asset } from "../types/story";
import { t } from "../i18n";
export function useAssetUrl(asset: Asset | undefined) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    if (!asset) {
      setUrl("");
      return;
    }
    const url = URL.createObjectURL(asset.blob);
    setUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [asset]);
  return url;
}
export function AssetPreview({ asset }: { asset: Asset }) {
  const url = useAssetUrl(asset);
  const audio = useRef<HTMLMediaElement>(null);
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    setPlaying(false);
    setPosition(0);
    setDuration(0);
    setFailed(false);
  }, [url]);
  const mediaProps = {
    preload: "metadata",
    src: url || undefined,
    onPlay: () => setPlaying(true),
    onPause: () => setPlaying(false),
    onEnded: () => setPlaying(false),
    onTimeUpdate: () => setPosition(audio.current?.currentTime ?? 0),
    onLoadedMetadata: () =>
      setDuration(
        Number.isFinite(audio.current?.duration) ? audio.current!.duration : 0,
      ),
    onError: () => {
      if (url) setFailed(true);
    },
  };
  return asset.kind === "image" ? (
    <img className="asset-preview" src={url} alt={asset.name} />
  ) : (
    <div className="audio-preview">
      {asset.kind === "video" ? (
        <video
          className="asset-preview"
          playsInline
          ref={(element) => {
            audio.current = element;
          }}
          {...mediaProps}
        />
      ) : (
        <audio
          ref={(element) => {
            audio.current = element;
          }}
          {...mediaProps}
        />
      )}
      <button
        onClick={async () => {
          if (!audio.current) return;
          if (playing) audio.current.pause();
          else
            try {
              await audio.current.play();
              setFailed(false);
            } catch {
              setFailed(true);
            }
        }}
      >
        {t(
          asset.kind === "video"
            ? playing
              ? "player.pauseVideo"
              : "player.playVideo"
            : playing
              ? "player.pauseAudio"
              : "player.previewAudio",
        )}
      </button>
      <input
        aria-label={t(
          asset.kind === "video"
            ? "player.videoPosition"
            : "player.audioPosition",
        )}
        type="range"
        min={0}
        max={duration || 1}
        step={0.1}
        value={position}
        disabled={!duration}
        onChange={(e) => {
          if (audio.current) {
            audio.current.currentTime = Number(e.target.value);
            setPosition(Number(e.target.value));
          }
        }}
      />
      {failed && (
        <small role="alert">
          {t(
            asset.kind === "video"
              ? "player.videoUnsupported"
              : "player.audioBlocked",
          )}
        </small>
      )}
    </div>
  );
}
