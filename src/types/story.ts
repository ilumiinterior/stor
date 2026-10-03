export type Value = boolean | number | string;
import type { Presentation } from "../utils/appearance";
export interface StoryVariable {
  id: string;
  name: string;
  type: "boolean" | "number" | "string";
  initial: Value;
}
export interface Condition {
  variableId: string;
  operator: "eq" | "ne" | "gt" | "gte" | "lt" | "lte";
  value: Value;
}
export interface VariableAction {
  variableId: string;
  operation: "set" | "add" | "subtract";
  value: Value;
}
export interface Choice {
  id: string;
  text: string;
  targetSceneId: string;
  condition?: Condition;
  actions: VariableAction[];
}
export interface Scene {
  id: string;
  name: string;
  text: string;
  position: { x: number; y: number };
  imageId?: string;
  videoId?: string;
  videoLoop?: boolean;
  videoSound?: boolean;
  autoAdvance?: { targetSceneId: string; delaySeconds: number };
  backgroundColor?: string;
  voiceId?: string;
  musicId?: string;
  ambientId?: string;
  choices: Choice[];
  actions: VariableAction[];
  ending: boolean;
}
export interface StoryContent {
  title: string;
  scenes: Record<
    string,
    { name?: string; text?: string; choices?: Record<string, string> }
  >;
}
export interface Story {
  schemaVersion: 1;
  id: string;
  title: string;
  contentLanguage: string;
  presentation?: Presentation;
  translations?: Record<string, StoryContent>;
  startSceneId: string;
  scenes: Scene[];
  variables: StoryVariable[];
  updatedAt: number;
}
export interface Asset {
  id: string;
  storyId: string;
  name: string;
  kind: "image" | "video" | "audio" | "music";
  mime: string;
  blob: Blob;
}
export interface SaveGame {
  id: string;
  storyId: string;
  slot: number;
  currentSceneId: string;
  variables: Record<string, Value>;
  inventory: string[];
  visitedScenes: string[];
  history: { sceneId: string; choiceId: string; timestamp: number }[];
  playTime: number;
  timestamp: number;
}
