import type {
  Story,
  Choice,
  Condition,
  VariableAction,
  Value,
  SaveGame,
} from "../types/story";
import { saveGameSchema } from "../utils/schema";
export function meets(
  condition: Condition | undefined,
  variables: Record<string, Value>,
) {
  if (!condition) return true;
  const a = variables[condition.variableId],
    b = condition.value;
  switch (condition.operator) {
    case "eq":
      return a === b;
    case "ne":
      return a !== b;
    case "gt":
      return typeof a === "number" && typeof b === "number" && a > b;
    case "gte":
      return typeof a === "number" && typeof b === "number" && a >= b;
    case "lt":
      return typeof a === "number" && typeof b === "number" && a < b;
    case "lte":
      return typeof a === "number" && typeof b === "number" && a <= b;
  }
}
export function act(
  variables: Record<string, Value>,
  actions: VariableAction[],
) {
  const next = { ...variables };
  for (const action of actions) {
    const previous = next[action.variableId];
    if (previous === undefined) continue;
    if (action.operation === "set" && typeof previous === typeof action.value)
      next[action.variableId] = action.value;
    else if (typeof previous === "number" && typeof action.value === "number")
      next[action.variableId] =
        previous + (action.operation === "add" ? action.value : -action.value);
  }
  return next;
}
export function begin(story: Story, sceneId = story.startSceneId): SaveGame {
  const initial = Object.fromEntries(
    story.variables.map((v) => [v.id, v.initial]),
  );
  const scene = story.scenes.find((s) => s.id === sceneId);
  return {
    id: `${story.id}:0`,
    storyId: story.id,
    slot: 0,
    currentSceneId: sceneId,
    variables: act(initial, scene?.actions ?? []),
    inventory: [],
    visitedScenes: [sceneId],
    history: [],
    playTime: 0,
    timerElapsedMs: 0,
    timestamp: Date.now(),
  };
}
export function choose(story: Story, save: SaveGame, choice: Choice): SaveGame {
  const scene = story.scenes.find((s) => s.id === save.currentSceneId);
  const target = story.scenes.find((s) => s.id === choice.targetSceneId);
  if (
    !target ||
    !scene?.choices.some((c) => c.id === choice.id) ||
    !meets(choice.condition, save.variables)
  )
    throw Error("invalid-choice");
  return {
    ...save,
    currentSceneId: target.id,
    variables: act(act(save.variables, choice.actions), target.actions),
    visitedScenes: [...new Set([...save.visitedScenes, target.id])],
    history: [
      ...save.history,
      {
        sceneId: save.currentSceneId,
        choiceId: choice.id,
        timestamp: Date.now(),
      },
    ],
    timestamp: Date.now(),
  };
}
export function validSave(story: Story, save: SaveGame) {
  return (
    saveGameSchema.safeParse(save).success &&
    save.storyId === story.id &&
    story.scenes.some((s) => s.id === save.currentSceneId) &&
    story.variables.every((v) => typeof save.variables[v.id] === v.type)
  );
}
export function advance(story: Story, save: SaveGame): SaveGame {
  const scene = story.scenes.find((s) => s.id === save.currentSceneId);
  const target = story.scenes.find(
    (s) => s.id === scene?.autoAdvance?.targetSceneId,
  );
  if (!target || target.id === scene?.id || scene?.ending)
    throw Error("invalid-transition");
  return {
    ...save,
    currentSceneId: target.id,
    variables: act(save.variables, target.actions),
    visitedScenes: [...new Set([...save.visitedScenes, target.id])],
    history: [
      ...save.history,
      {
        sceneId: save.currentSceneId,
        choiceId: "@auto",
        timestamp: Date.now(),
      },
    ],
    timestamp: Date.now(),
  };
}
export function expireTimer(story: Story, save: SaveGame): SaveGame {
  const target = story.scenes.find(
    (s) => s.id === story.timer?.targetSceneId && s.ending,
  );
  if (!story.timer?.enabled || !target || target.id === save.currentSceneId)
    throw Error("invalid-timer-target");
  return {
    ...save,
    currentSceneId: target.id,
    variables: act(save.variables, target.actions),
    visitedScenes: [...new Set([...save.visitedScenes, target.id])],
    history: [
      ...save.history,
      {
        sceneId: save.currentSceneId,
        choiceId: "@timer",
        timestamp: Date.now(),
      },
    ],
    timestamp: Date.now(),
  };
}
