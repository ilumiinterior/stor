import { useEffect, useRef, useState } from "react";
import type { Asset } from "../types/story";
import { useAssetUrl } from "./useAssetUrl";
export function MenuBackground({ asset }: { asset?: Asset }) {
  const url = useAssetUrl(asset);
  const video = useRef<HTMLVideoElement>(null);
  const [hidden, setHidden] = useState(document.hidden);
  useEffect(() => {
    const change = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", change);
    return () => document.removeEventListener("visibilitychange", change);
  }, []);
  useEffect(() => {
    const element = video.current;
    if (!element) return;
    if (hidden) element.pause();
    else void element.play().catch(() => {});
    return () => element.pause();
  }, [hidden, url]);
  if (!url) return null;
  return asset?.kind === "video" ? (
    <video
      ref={video}
      className="player-video menu-background"
      src={url}
      muted
      loop
      playsInline
      aria-hidden="true"
    />
  ) : (
    <div
      className="player-background menu-background"
      style={{ backgroundImage: `url("${url}")` }}
      aria-hidden="true"
    />
  );
}
