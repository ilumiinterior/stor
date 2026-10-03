import { useEffect, useState } from "react";
import type { Asset } from "../types/story";
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
