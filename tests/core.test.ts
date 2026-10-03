import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { db, persistStory, deleteStory } from "../src/database";
import { begin, choose, meets } from "../src/engine";
import { validate } from "../src/engine/validate";
import { t, registerLocale } from "../src/i18n";
import { newStory, newScene, newChoice } from "../src/utils/demo";
import { exportProject, importProject } from "../src/utils/project";
beforeEach(async () => {
  await Promise.all([
    db.stories.clear(),
    db.snapshots.clear(),
    db.assets.clear(),
    db.saves.clear(),
  ]);
});
describe("Slovak interface", () => {
  it("defaults and falls back to Slovak while allowing partial future dictionaries", () => {
    registerLocale("en", { common: { save: "Save" } });
    expect(t("common.save")).toBe("Uložiť");
    expect(t("common.save", {}, "en")).toBe("Save");
    expect(t("common.cancel", {}, "en")).toBe("Zrušiť");
    expect(t("player.slot", { number: 2 })).toBe("Pozícia 2");
    expect(t("common.save", {}, "de")).toBe("Uložiť");
  });
});
describe("branching engine", () => {
  it("applies choice and entry actions, tracks decisions and filters choices", () => {
    const story = newStory();
    story.variables = [
      { id: "key", name: "key", type: "boolean", initial: false },
      { id: "money", name: "money", type: "number", initial: 50 },
    ];
    const end = newScene("End");
    end.ending = true;
    end.actions = [{ variableId: "money", operation: "subtract", value: 20 }];
    story.scenes.push(end);
    const c = {
      ...newChoice(end.id),
      actions: [{ variableId: "key", operation: "set" as const, value: true }],
    };
    story.scenes[0].choices = [c];
    const game = begin(story);
    expect(
      meets({ variableId: "key", operator: "eq", value: true }, game.variables),
    ).toBe(false);
    const next = choose(story, game, c);
    expect(next.variables).toEqual({ key: true, money: 30 });
    expect(next.currentSceneId).toBe(end.id);
    expect(next.history).toHaveLength(1);
    expect(next.visitedScenes).toHaveLength(2);
    expect(game.variables.money).toBe(50);
    expect(validate(story, [])).toEqual([]);
  });
  it("rejects broken targets and unavailable decisions", () => {
    const story = newStory();
    const choice = newChoice("missing");
    story.scenes[0].choices = [choice];
    expect(() => choose(story, begin(story), choice)).toThrow();
    expect(validate(story, []).some((w) => w.key === "debug.noTarget")).toBe(
      true,
    );
  });
});
describe("local project safety", () => {
  it("persists after reopen and keeps the previous snapshot", async () => {
    const story = newStory();
    await persistStory(story);
    await persistStory({ ...story, title: "Changed" });
    db.close();
    await db.open();
    expect((await db.stories.get(story.id))?.title).toBe("Changed");
    expect((await db.snapshots.get(story.id))?.title).toBe(story.title);
  });
  it("roundtrips story text, language variants and binary assets without replacing originals", async () => {
    const story = newStory();
    story.title = "User English story";
    story.contentLanguage = "en";
    story.presentation = {
      showSceneNames: true,
      font: "literata",
      theme: "sepia",
      colors: { background: "#123456", accent: "#fedcba" },
    };
    story.translations = { cs: { title: "Ruční překlad", scenes: {} } };
    story.scenes[0].text = "This is user content.";
    story.scenes[0].imageId = "asset";
    story.scenes[0].videoId = "video";
    story.scenes[0].videoLoop = false;
    story.scenes[0].videoSound = true;
    const automaticEnd = newScene("Automatic end");
    automaticEnd.ending = true;
    story.scenes.push(automaticEnd);
    story.scenes[0].autoAdvance = {
      targetSceneId: automaticEnd.id,
      delaySeconds: 4,
    };
    story.scenes[0].backgroundColor = "#654321";
    await persistStory(story);
    await db.assets.add({
      id: "asset",
      storyId: story.id,
      name: "test.png",
      kind: "image",
      mime: "image/png",
      blob: new Blob([new Uint8Array([1, 2, 3])], { type: "image/png" }),
    });
    await db.assets.add({
      id: "video",
      storyId: story.id,
      name: "video.mp4",
      kind: "video",
      mime: "video/mp4",
      blob: new Blob([new Uint8Array([4, 5, 6])], { type: "video/mp4" }),
    });
    const exported = await exportProject(story);
    const bytes = await exported.arrayBuffer();
    const imported = await importProject(new File([bytes], "roundtrip.story"));
    expect(imported.id).not.toBe(story.id);
    expect(imported.contentLanguage).toBe("en");
    expect(imported.presentation).toEqual(story.presentation);
    expect(imported.translations).toEqual(story.translations);
    expect(imported.scenes[0].text).toBe("This is user content.");
    const assets = await db.assets
      .where("storyId")
      .equals(imported.id)
      .toArray();
    const image = assets.find((a) => a.kind === "image")!;
    const video = assets.find((a) => a.kind === "video")!;
    expect(new Uint8Array(await image.blob.arrayBuffer())).toEqual(
      new Uint8Array([1, 2, 3]),
    );
    expect(imported.scenes[0].imageId).toBe(image.id);
    expect(imported.scenes[0].videoId).toBe(video.id);
    expect(imported.scenes[0].videoLoop).toBe(false);
    expect(imported.scenes[0].videoSound).toBe(true);
    expect(imported.scenes[0].autoAdvance).toEqual(story.scenes[0].autoAdvance);
    expect(imported.scenes[0].backgroundColor).toBe("#654321");
    expect(new Uint8Array(await video.blob.arrayBuffer())).toEqual(
      new Uint8Array([4, 5, 6]),
    );
    expect(await db.stories.count()).toBe(2);
  });
  it("rejects damaged files without modifying existing projects", async () => {
    const story = newStory();
    await persistStory(story);
    await expect(
      importProject(new File(["broken"], "bad.story")),
    ).rejects.toThrow();
    expect(await db.stories.count()).toBe(1);
  });
  it("deletes related records atomically", async () => {
    const story = newStory();
    await persistStory(story);
    await db.saves.add(begin(story));
    await deleteStory(story.id);
    expect(await db.stories.count()).toBe(0);
    expect(await db.saves.count()).toBe(0);
  });
});
