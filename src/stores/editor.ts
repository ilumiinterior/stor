import { create } from "zustand";
import { db, persistStory } from "../database";
import { storySchema } from "../utils/schema";
import type { Story, Asset } from "../types/story";
import { t } from "../i18n";
let queue = Promise.resolve();
export const useEditor = create<{
  story: Story | null;
  assets: Asset[];
  selected: string;
  status: string;
  error: string;
  dirty: boolean;
  load: (story: Story) => Promise<void>;
  update: (change: (story: Story) => void) => void;
  select: (id: string) => void;
  flush: () => Promise<void>;
  refreshAssets: () => Promise<void>;
  report: (error: string) => void;
}>((set, get) => ({
  story: null,
  assets: [],
  selected: "",
  status: t("common.saved"),
  error: "",
  dirty: false,
  async load(raw) {
    await get().flush();
    const parsed = storySchema.safeParse(raw);
    if (!parsed.success) {
      set({ error: t("common.corrupt") });
      throw Error("corrupt-project");
    }
    const story = parsed.data;
    const assets = await db.assets.where("storyId").equals(story.id).toArray();
    set({
      story,
      assets,
      selected: story.startSceneId,
      error: "",
      dirty: false,
    });
  },
  update(change) {
    const story = structuredClone(get().story);
    if (!story) return;
    change(story);
    story.updatedAt = Date.now();
    set({ story, dirty: true, status: t("common.saving") });
    const snapshot = story;
    queue = queue
      .catch(() => {})
      .then(async () => {
        await persistStory(snapshot);
        if (get().story === snapshot)
          set({ status: t("common.saved"), dirty: false, error: "" });
      })
      .catch(() => {
        set({
          error: t("common.error"),
          status: t("common.error"),
          dirty: true,
        });
      });
  },
  select(selected) {
    set({ selected });
  },
  async flush() {
    await queue;
    if (get().dirty && get().story) {
      try {
        const snapshot = get().story!;
        await persistStory(snapshot);
        if (get().story === snapshot)
          set({ dirty: false, status: t("common.saved"), error: "" });
      } catch {
        set({ error: t("common.error") });
        throw Error("save-failed");
      }
    }
  },
  async refreshAssets() {
    const story = get().story;
    if (story)
      set({
        assets: await db.assets.where("storyId").equals(story.id).toArray(),
      });
  },
  report(error) {
    set({ error });
  },
}));
