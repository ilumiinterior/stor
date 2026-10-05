import type { CSSProperties } from "react";
import type {
  Scene,
  SceneLayout,
  VisualBox,
  VisualChoice,
} from "../types/story";
export function defaultChoice(
  index: number,
  count: number,
  desktop = false,
): VisualChoice {
  return {
    x: desktop ? 25 : 5,
    y: Math.max(42, 88 - count * 9) + index * 9,
    width: desktop ? 50 : 90,
    height: 7,
    fontSize: 18,
    color: "#ffffff",
    align: "center",
    background: "#252b27",
    opacity: 0.8,
    radius: 10,
    borderColor: "#889477",
    borderWidth: 1,
  };
}
export function defaultSceneLayout(scene: Scene, desktop = false): SceneLayout {
  return {
    text: {
      x: desktop ? 25 : 5,
      y: Math.max(12, 65 - scene.choices.length * 9),
      width: desktop ? 50 : 90,
      fontSize: desktop ? 28 : 24,
      color: "#ffffff",
      align: "left",
    },
    choices: Object.fromEntries(
      scene.choices.map((c, i) => [
        c.id,
        defaultChoice(i, scene.choices.length, desktop),
      ]),
    ),
  };
}
export function visualStyle(
  mobile: VisualBox,
  desktop: VisualBox = mobile,
): CSSProperties {
  const variables: Record<string, string> = {};
  for (const [suffix, box] of [
    ["", mobile],
    ["-desktop", desktop],
  ] as const) {
    variables[`--visual-x${suffix}`] = `${box.x}%`;
    variables[`--visual-y${suffix}`] = `${box.y}%`;
    variables[`--visual-width${suffix}`] = `${box.width}%`;
    variables[`--visual-size${suffix}`] = `${box.fontSize}px`;
    variables[`--visual-color${suffix}`] = box.color;
    variables[`--visual-align${suffix}`] = box.align;
    if ("height" in box) {
      const choice = box as VisualChoice;
      variables[`--visual-height${suffix}`] = `${choice.height}%`;
      variables[`--visual-bg${suffix}`] = `${choice.background}${Math.round(
        choice.opacity * 255,
      )
        .toString(16)
        .padStart(2, "0")}`;
      variables[`--visual-radius${suffix}`] = `${choice.radius}px`;
      variables[`--visual-border${suffix}`] =
        `${choice.borderWidth}px solid ${choice.borderColor}`;
    }
  }
  return variables as CSSProperties;
}
