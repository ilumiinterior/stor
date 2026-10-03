import { useState } from "react";
import { db } from "../database";
import { useEditor } from "../stores/editor";
import { t } from "../i18n";
import { id } from "../utils/demo";
import { AssetPreview } from "../components/AssetPreview";
import type { Asset } from "../types/story";
export async function uploadAsset(
  file: File,
  kind: Asset["kind"],
  storyId: string,
) {
  const mime =
    file.type ||
    (kind === "video"
      ? /\.mp4$/i.test(file.name)
        ? "video/mp4"
        : /\.webm$/i.test(file.name)
          ? "video/webm"
          : ""
      : "");
  if (kind === "video" && !["video/mp4", "video/webm"].includes(mime))
    throw Error(t("editor.videoFormat"));
  if (
    (kind === "image" && !file.type.startsWith("image/")) ||
    ((kind === "audio" || kind === "music") && !file.type.startsWith("audio/"))
  )
    throw Error("invalid-file");
  const asset: Asset = {
    id: id(),
    storyId,
    name: file.name,
    kind,
    mime,
    blob: mime === file.type ? file : new Blob([file], { type: mime }),
  };
  await db.assets.add(asset);
  return asset;
}
export function Assets() {
  const { assets, story, refreshAssets, report, update } = useEditor();
  const [kind, setKind] = useState<Asset["kind"]>("image");
  if (!story) return null;
  return (
    <section>
      <h2>{t("editor.assets")}</h2>
      <select
        aria-label={t("editor.assetType")}
        value={kind}
        onChange={(e) => setKind(e.target.value as Asset["kind"])}
      >
        <option value="image">{t("editor.images")}</option>
        <option value="video">{t("editor.videos")}</option>
        <option value="audio">{t("editor.audio")}</option>
        <option value="music">{t("editor.music")}</option>
      </select>
      <label className="button upload">
        {t("common.upload")}
        <input
          type="file"
          accept={
            kind === "image"
              ? "image/*"
              : kind === "video"
                ? ".mp4,.webm,video/mp4,video/webm"
                : "audio/*"
          }
          multiple
          onChange={async (e) => {
            try {
              for (const file of Array.from(e.target.files ?? []))
                await uploadAsset(file, kind, story.id);
              await refreshAssets();
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
      {!assets.length && <p className="muted">{t("editor.assetEmpty")}</p>}
      {assets
        .filter((a) => a.kind === kind)
        .map((asset) => (
          <div className="asset-item" key={asset.id}>
            <AssetPreview asset={asset} />
            <input
              aria-label={t("common.name")}
              defaultValue={asset.name}
              onBlur={async (e) => {
                try {
                  await db.assets.update(asset.id, { name: e.target.value });
                  await refreshAssets();
                } catch {
                  report(t("common.error"));
                }
              }}
            />
            <button
              className="danger"
              onClick={async () => {
                const used = story.scenes.some((s) =>
                  [
                    s.imageId,
                    s.videoId,
                    s.voiceId,
                    s.musicId,
                    s.ambientId,
                  ].includes(asset.id),
                );
                if (
                  !confirm(
                    used
                      ? t("editor.assetUsed")
                      : t("common.confirmDelete", { name: asset.name }),
                  )
                )
                  return;
                try {
                  update((story) =>
                    story.scenes.forEach((s) => {
                      for (const key of [
                        "imageId",
                        "videoId",
                        "voiceId",
                        "musicId",
                        "ambientId",
                      ] as const)
                        if (s[key] === asset.id) s[key] = undefined;
                    }),
                  );
                  await useEditor.getState().flush();
                  await db.assets.delete(asset.id);
                  await refreshAssets();
                } catch {
                  report(t("common.error"));
                }
              }}
            >
              {t("common.delete")}
            </button>
          </div>
        ))}
    </section>
  );
}
