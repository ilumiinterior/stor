import Dexie, { type Table } from "dexie";
import type { Story, Asset, SaveGame } from "../types/story";
import { storySchema } from "../utils/schema";
class Database extends Dexie {
  stories!: Table<Story, string>;
  snapshots!: Table<Story, string>;
  assets!: Table<Asset, string>;
  saves!: Table<SaveGame, string>;
  constructor() {
    super("vetvy");
    this.version(1).stores({
      stories: "id,updatedAt",
      snapshots: "id",
      assets: "id,storyId",
      saves: "id,storyId,[storyId+slot]",
    });
  }
}
export const db = new Database();
export async function persistStory(story: Story) {
  storySchema.parse(story);
  await db.transaction("rw", db.stories, db.snapshots, async () => {
    const previous = await db.stories.get(story.id);
    if (previous) {
      storySchema.parse(previous);
      await db.snapshots.put(previous);
    }
    await db.stories.put(story);
  });
}
export async function deleteStory(id: string) {
  await db.transaction(
    "rw",
    db.stories,
    db.snapshots,
    db.assets,
    db.saves,
    async () => {
      await db.stories.delete(id);
      await db.snapshots.delete(id);
      await db.assets.where("storyId").equals(id).delete();
      await db.saves.where("storyId").equals(id).delete();
    },
  );
}
