import { z } from "zod";
import { db } from "../database";
import { storySchema } from "./schema";
import type { Story, Asset } from "../types/story";
import { t } from "../i18n";
const manifestSchema = z.array(
  z.object({
    id: z.string(),
    name: z.string(),
    kind: z.enum(["image", "video", "audio", "music"]),
    mime: z.string(),
    path: z.string(),
  }),
);
export async function exportProject(story: Story) {
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();
  const assets = await db.assets.where("storyId").equals(story.id).toArray();
  const manifest = [];
  for (const asset of assets) {
    const directory =
      asset.kind === "image"
        ? "images"
        : asset.kind === "video"
          ? "videos"
          : asset.kind === "music"
            ? "music"
            : "audio";
    const path = `assets/${directory}/${asset.id}`;
    zip.file(path, await asset.blob.arrayBuffer(), {
      compression: asset.kind === "video" ? "STORE" : "DEFLATE",
    });
    manifest.push({
      id: asset.id,
      name: asset.name,
      kind: asset.kind,
      mime: asset.mime,
      path,
    });
  }
  zip.file("story.json", JSON.stringify({ story, assets: manifest }, null, 2));
  return zip.generateAsync({ type: "blob", compression: "DEFLATE" });
}
export function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export async function importProject(file: File): Promise<Story> {
  const { default: JSZip } = await import("jszip");
  if (file.size > 250 * 1024 * 1024) throw Error(t("common.corrupt"));
  const zip = await JSZip.loadAsync(file);
  const entry = zip.file("story.json");
  if (!entry) throw Error(t("common.corrupt"));
  const raw = JSON.parse(await entry.async("string"));
  const story = storySchema.parse(raw.story);
  const manifest = manifestSchema.parse(raw.assets);
  const assets: Asset[] = [];
  const map = new Map<string, string>();
  for (const meta of manifest) {
    if (
      map.has(meta.id) ||
      !/^assets\/(images|videos|audio|music)\//.test(meta.path)
    )
      throw Error(t("common.corrupt"));
    const item = zip.file(meta.path);
    if (!item) throw Error(t("common.corrupt"));
    const bytes = await item.async("uint8array");
    const id = crypto.randomUUID();
    map.set(meta.id, id);
    assets.push({
      id,
      storyId: "",
      name: meta.name,
      kind: meta.kind,
      mime: meta.mime,
      blob: new Blob([bytes as BlobPart], { type: meta.mime }),
    });
  }
  const allIds = [
    ...story.scenes.map((s) => s.id),
    ...story.scenes.flatMap((s) => s.choices.map((c) => c.id)),
    ...story.variables.map((v) => v.id),
  ];
  if (new Set(allIds).size !== allIds.length) throw Error(t("common.corrupt"));
  story.id = crypto.randomUUID();
  story.updatedAt = Date.now();
  for (const scene of story.scenes)
    for (const key of [
      "imageId",
      "videoId",
      "voiceId",
      "musicId",
      "ambientId",
    ] as const)
      if (scene[key]) scene[key] = map.get(scene[key]!) ?? scene[key];
  await db.transaction("rw", db.stories, db.assets, async () => {
    await db.stories.add(story);
    await db.assets.bulkAdd(assets.map((a) => ({ ...a, storyId: story.id })));
  });
  return story;
}
