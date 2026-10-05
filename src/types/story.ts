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
  visual?: { mobile: SceneLayout; desktop?: SceneLayout };
  editor?: {
    color?: string;
    group?: string;
    importance?: "minor" | "normal" | "major";
  };
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
  showTimer?: boolean;
  timerOnly?: boolean;
  timerOverlay?: {
    enabled: boolean;
    startSeconds: number;
    durationSeconds: number;
  };
  textSequence?: {
    enabled: boolean;
    secondText: string;
    durationSeconds: number;
    firstDurationSeconds?: number;
    secondDurationSeconds?: number;
  };
}
export interface VisualBox {
  x: number;
  y: number;
  width: number;
  fontSize: number;
  color: string;
  align: "left" | "center" | "right";
}
export interface VisualChoice extends VisualBox {
  height: number;
  background: string;
  opacity: number;
  radius: number;
  borderColor: string;
  borderWidth: number;
}
export interface SceneLayout {
  text: VisualBox;
  choices: Record<string, VisualChoice>;
}
export interface StoryContent {
  title: string;
  scenes: Record<
    string,
    { name?: string; text?: string; choices?: Record<string, string> }
  >;
}
export interface Story {
  mainMenu?: {
    backgroundId?: string;
    customLayout: boolean;
    buttons: Partial<Record<MenuButtonId, MenuButtonPosition>>;
  };
  schemaVersion: 1;
  id: string;
  title: string;
  contentLanguage: string;
  presentation?: Presentation;
  soundtrack?: { assetId: string; volume: number };
  timer?: { enabled: boolean; durationSeconds: number; targetSceneId?: string };
  translations?: Record<string, StoryContent>;
  startSceneId: string;
  scenes: Scene[];
  variables: StoryVariable[];
  updatedAt: number;
}
export type MenuButtonId = "continue" | "newStory" | "loadGame" | "settings";
export interface MenuButtonPosition {
  column: number;
  row: number;
  width: number;
  height: number;
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
  timerElapsedMs?: number;
  timestamp: number;
}
