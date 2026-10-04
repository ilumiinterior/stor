import { useEffect, useRef, useState } from "react";

export function useTextPart(
  sceneId: string | undefined,
  enabled: boolean,
  durationSeconds: number,
  paused: boolean,
) {
  const clock = useRef({ sceneId, elapsed: 0 });
  const [part, setPart] = useState({ sceneId, index: 0 });
  useEffect(() => {
    if (clock.current.sceneId !== sceneId)
      clock.current = { sceneId, elapsed: 0 };
    if (!enabled || paused) return;
    const started = performance.now();
    const tick = () => {
      const index =
        clock.current.elapsed + performance.now() - started >=
        durationSeconds * 500
          ? 1
          : 0;
      setPart((previous) =>
        previous.sceneId === sceneId && previous.index === index
          ? previous
          : { sceneId, index },
      );
    };
    tick();
    const interval = window.setInterval(tick, 100);
    return () => {
      window.clearInterval(interval);
      clock.current.elapsed += performance.now() - started;
    };
  }, [sceneId, enabled, durationSeconds, paused]);
  return part.sceneId === sceneId ? part.index : 0;
}
