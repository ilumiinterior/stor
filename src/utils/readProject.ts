import { z } from "zod";
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
export async function readProject(
  file: Blob,
): Promise<{ story: Story; assets: Asset[] }> {
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
    const id = meta.id;
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
  return { story, assets: assets.map((a) => ({ ...a, storyId: story.id })) };
}
