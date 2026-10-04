import { z } from "zod";
import { fontIds, themeIds } from "./appearance";
const value = z.union([z.string(), z.number().finite(), z.boolean()]);
export const saveGameSchema = z.object({
  id: z.string(),
  storyId: z.string(),
  slot: z.number().int().min(0).max(3),
  currentSceneId: z.string(),
  variables: z.record(z.string(), value),
  inventory: z.array(z.string()),
  visitedScenes: z.array(z.string()),
  history: z.array(
    z.object({
      sceneId: z.string(),
      choiceId: z.string(),
      timestamp: z.number().finite(),
    }),
  ),
  playTime: z.number().finite().nonnegative(),
  timerElapsedMs: z.number().finite().nonnegative().optional(),
  timestamp: z.number().finite(),
});
const action = z.object({
  variableId: z.string(),
  operation: z.enum(["set", "add", "subtract"]),
  value,
});
const condition = z.object({
  variableId: z.string(),
  operator: z.enum(["eq", "ne", "gt", "gte", "lt", "lte"]),
  value,
});
const menuPosition = z
  .object({
    column: z.number().int().min(1).max(12),
    row: z.number().int().min(1).max(12),
    width: z.number().int().min(1).max(12),
    height: z.number().int().min(1).max(12),
  })
  .refine((p) => p.column + p.width <= 13 && p.row + p.height <= 13);
export const storySchema = z.object({
  mainMenu: z
    .object({
      backgroundId: z.string().optional(),
      customLayout: z.boolean(),
      buttons: z.object({
        continue: menuPosition.optional(),
        newStory: menuPosition.optional(),
        loadGame: menuPosition.optional(),
        settings: menuPosition.optional(),
      }),
    })
    .optional(),
  schemaVersion: z.literal(1),
  id: z.string().min(1),
  title: z.string(),
  contentLanguage: z.string(),
  soundtrack: z
    .object({ assetId: z.string(), volume: z.number().finite().min(0).max(1) })
    .optional(),
  timer: z
    .object({
      enabled: z.boolean(),
      durationSeconds: z.number().int().min(1).max(86400),
      targetSceneId: z.string().optional(),
    })
    .optional(),
  presentation: z
    .object({
      showSceneNames: z.boolean(),
      font: z.enum(fontIds),
      theme: z.enum(themeIds),
      colors: z
        .object({
          background: z
            .string()
            .regex(/^#[\da-f]{6}$/i)
            .optional(),
          accent: z
            .string()
            .regex(/^#[\da-f]{6}$/i)
            .optional(),
        })
        .optional(),
    })
    .optional(),
  translations: z
    .record(
      z.string(),
      z.object({
        title: z.string(),
        scenes: z.record(
          z.string(),
          z.object({
            name: z.string().optional(),
            text: z.string().optional(),
            choices: z.record(z.string(), z.string()).optional(),
          }),
        ),
      }),
    )
    .optional(),
  startSceneId: z.string(),
  updatedAt: z.number(),
  variables: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        type: z.enum(["boolean", "number", "string"]),
        initial: value,
      }),
    )
    .refine((v) => v.every((x) => typeof x.initial === x.type)),
  scenes: z.array(
    z.object({
      id: z.string().min(1),
      name: z.string(),
      text: z.string(),
      editor: z
        .object({
          color: z
            .string()
            .regex(/^#[\da-f]{6}$/i)
            .optional(),
          group: z.string().max(100).optional(),
          importance: z.enum(["minor", "normal", "major"]).optional(),
        })
        .optional(),
      position: z.object({ x: z.number().finite(), y: z.number().finite() }),
      imageId: z.string().optional(),
      videoId: z.string().optional(),
      videoLoop: z.boolean().optional(),
      videoSound: z.boolean().optional(),
      autoAdvance: z
        .object({
          targetSceneId: z.string(),
          delaySeconds: z.number().finite().min(1).max(3600),
        })
        .optional(),
      backgroundColor: z
        .string()
        .regex(/^#[\da-f]{6}$/i)
        .optional(),
      voiceId: z.string().optional(),
      musicId: z.string().optional(),
      ambientId: z.string().optional(),
      ending: z.boolean(),
      showTimer: z.boolean().optional(),
      timerOnly: z.boolean().optional(),
      timerOverlay: z
        .object({
          enabled: z.boolean(),
          startSeconds: z.number().finite().min(0).max(3600),
          durationSeconds: z.number().finite().min(0.1).max(3600),
        })
        .optional(),
      textSequence: z
        .object({
          enabled: z.boolean(),
          secondText: z.string(),
          durationSeconds: z.number().finite().min(1).max(3600),
          firstDurationSeconds: z
            .number()
            .finite()
            .min(0.1)
            .max(3600)
            .optional(),
          secondDurationSeconds: z
            .number()
            .finite()
            .min(0.1)
            .max(3600)
            .optional(),
        })
        .optional(),
      actions: z.array(action),
      choices: z.array(
        z.object({
          id: z.string().min(1),
          text: z.string(),
          targetSceneId: z.string(),
          condition: condition.optional(),
          actions: z.array(action),
        }),
      ),
    }),
  ),
});
