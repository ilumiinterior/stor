import type { Story, Asset } from "../types/story";
import type { TranslationKey } from "../i18n";
export interface Warning {
  sceneId?: string;
  key: TranslationKey;
}
export function validate(story: Story, assets: Asset[]): Warning[] {
  const warnings: Warning[] = [];
  if (
    story.mainMenu?.backgroundId &&
    !assets.some(
      (a) =>
        a.id === story.mainMenu?.backgroundId &&
        (a.kind === "image" || a.kind === "video"),
    )
  )
    warnings.push({ key: "debug.missingAsset" });
  if (
    story.soundtrack &&
    !assets.some(
      (a) =>
        a.id === story.soundtrack?.assetId &&
        (a.kind === "audio" || a.kind === "music"),
    )
  )
    warnings.push({ key: "debug.missingAsset" });
  if (
    story.timer?.enabled &&
    !story.scenes.some((s) => s.id === story.timer?.targetSceneId && s.ending)
  )
    warnings.push({ key: "timer.missingTarget" });
  const ids = new Set(story.scenes.map((s) => s.id));
  const seen = new Set<string>();
  const reachable = new Set<string>();
  const visit = (id: string) => {
    if (reachable.has(id)) return;
    reachable.add(id);
    const scene = story.scenes.find((s) => s.id === id);
    if (scene?.autoAdvance && !scene.ending)
      visit(scene.autoAdvance.targetSceneId);
    else scene?.choices.forEach((c) => visit(c.targetSceneId));
  };
  visit(story.startSceneId);
  if (story.timer?.enabled && story.timer.targetSceneId)
    visit(story.timer.targetSceneId);
  if (!ids.has(story.startSceneId)) warnings.push({ key: "debug.start" });
  if (!story.scenes.some((s) => s.ending))
    warnings.push({ key: "debug.noEnding" });
  const checkId = (id: string, sceneId: string) => {
    if (seen.has(id)) warnings.push({ sceneId, key: "debug.duplicate" });
    seen.add(id);
  };
  for (const variable of story.variables)
    checkId(variable.id, story.startSceneId);
  for (const s of story.scenes) {
    if (s.timerOnly && !story.timer?.enabled)
      warnings.push({ sceneId: s.id, key: "timer.needsEnabled" });
    checkId(s.id, s.id);
    if (!reachable.has(s.id))
      warnings.push({
        sceneId: s.id,
        key: s.ending ? "debug.ending" : "debug.unreachable",
      });
    if (!s.ending && !s.autoAdvance && !s.choices.length)
      warnings.push({ sceneId: s.id, key: "debug.noChoices" });
    if (
      s.autoAdvance &&
      (!ids.has(s.autoAdvance.targetSceneId) ||
        s.autoAdvance.targetSceneId === s.id)
    )
      warnings.push({ sceneId: s.id, key: "debug.automaticTarget" });
    for (const id of [s.imageId, s.videoId, s.voiceId, s.musicId, s.ambientId])
      if (id && !assets.some((a) => a.id === id))
        warnings.push({ sceneId: s.id, key: "debug.missingAsset" });
    for (const c of s.choices) {
      checkId(c.id, s.id);
      if (!ids.has(c.targetSceneId))
        warnings.push({ sceneId: s.id, key: "debug.noTarget" });
      if (
        c.condition &&
        !story.variables.some((v) => v.id === c.condition!.variableId)
      )
        warnings.push({ sceneId: s.id, key: "debug.variable" });
    }
    for (const a of [...s.actions, ...s.choices.flatMap((c) => c.actions)])
      if (!story.variables.some((v) => v.id === a.variableId))
        warnings.push({ sceneId: s.id, key: "debug.variable" });
  }
  return warnings;
}
