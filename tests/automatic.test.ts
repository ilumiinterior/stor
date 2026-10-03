import { it, expect } from "vitest";
import { advance, begin } from "../src/engine";
import { validate } from "../src/engine/validate";
import { newStory, newScene } from "../src/utils/demo";
import { storySchema } from "../src/utils/schema";

it("automatic transitions apply destination actions and preserve settings through schema", () => {
  const story = newStory();
  const end = newScene("Zomrel si");
  end.ending = true;
  end.actions = [{ variableId: "lives", operation: "subtract", value: 1 }];
  story.variables = [
    { id: "lives", name: "Životy", type: "number", initial: 1 },
  ];
  story.scenes.push(end);
  story.scenes[0].autoAdvance = { targetSceneId: end.id, delaySeconds: 3 };
  story.scenes[0].backgroundColor = "#123456";
  const next = advance(story, begin(story));
  expect(next.currentSceneId).toBe(end.id);
  expect(next.variables.lives).toBe(0);
  expect(next.history[0].choiceId).toBe("@auto");
  expect(validate(story, [])).toEqual([]);
  expect(storySchema.parse(story).scenes[0].autoAdvance).toEqual(
    story.scenes[0].autoAdvance,
  );
  expect(storySchema.parse(story).scenes[0].backgroundColor).toBe("#123456");
  expect(() => advance(story, next)).toThrow();
  story.scenes[0].autoAdvance.targetSceneId = story.scenes[0].id;
  expect(() => advance(story, begin(story))).toThrow();
  expect(
    validate(story, []).some((w) => w.key === "debug.automaticTarget"),
  ).toBe(true);
});
