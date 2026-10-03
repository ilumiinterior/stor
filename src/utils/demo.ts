import type { Story, Scene, Choice, Asset } from "../types/story";
import { db } from "../database";
import { t } from "../i18n";
export const id = () => crypto.randomUUID();
export const newScene = (name = t("editor.newScene"), x = 0, y = 0): Scene => ({
  id: id(),
  name,
  text: "",
  position: { x, y },
  choices: [],
  actions: [],
  ending: false,
});
export const newChoice = (targetSceneId = ""): Choice => ({
  id: id(),
  text: "",
  targetSceneId,
  actions: [],
});
export function newStory(): Story {
  const scene = newScene();
  return {
    schemaVersion: 1,
    id: id(),
    title: t("editor.newTitle"),
    contentLanguage: "sk",
    startSceneId: scene.id,
    scenes: [scene],
    variables: [],
    updatedAt: Date.now(),
  };
}
// Sample story content is authored here, separate from application localization.
export async function demoStory(): Promise<Story> {
  const story = newStory();
  story.title = "Svetlo za hmlou";
  const key = id();
  story.variables = [
    { id: key, name: "kľúč", type: "boolean", initial: false },
  ];
  const data = [
    [
      "Na okraji lesa",
      "Hmla stúpa z mokrej zeme. Medzi stromami sa mihne svetlo. V dlani držíš list: „Príď skôr, než zhasne maják.“",
    ],
    [
      "Stará cesta",
      "Kroky znejú na kamennej ceste. Pri opustenom vozíku leží mosadzný kľúč. V diaľke počuješ more.",
    ],
    [
      "Lesný chodník",
      "Stromy ustupujú a pred tebou sa otvorí tiché jazero. Na druhom brehu sa odráža maják.",
    ],
    [
      "Pred majákom",
      "Ťažké dvere sú zamknuté. Pod svetlom lampy je vyrytý odkaz: „Nie každý návrat vedie domov.“",
    ],
    [
      "Svetlo zostáva",
      "Kľúč zapadne. Vystúpiš po schodoch a rozsvietiš lampu. Loď v diaľke zmení smer. Dnes v noci nikto nezablúdi.",
    ],
    [
      "Začiatok návratu",
      "Rozhodneš sa vrátiť. Hmla sa rozostúpi a na obzore svitá. Niektoré tajomstvá môžu počkať.",
    ],
  ];
  story.scenes = data.map(([name, text], i) => ({
    ...newScene(
      name,
      i === 0 ? 0 : i < 3 ? 340 : 680,
      i === 0 ? 160 : (i % 3) * 260,
    ),
    text,
    ending: i >= 4,
  }));
  story.startSceneId = story.scenes[0].id;
  const link = (a: number, b: number, text: string) => ({
    ...newChoice(story.scenes[b].id),
    text,
  });
  story.scenes[0].choices = [
    link(0, 1, "Vydať sa po starej ceste"),
    link(0, 2, "Vstúpiť do lesa"),
  ];
  story.scenes[1].choices = [
    {
      ...link(1, 3, "Vziať kľúč a ísť k majáku"),
      actions: [{ variableId: key, operation: "set", value: true }],
    },
  ];
  story.scenes[2].choices = [link(2, 3, "Obísť jazero")];
  story.scenes[3].choices = [
    {
      ...link(3, 4, "Odomknúť dvere"),
      condition: { variableId: key, operator: "eq", value: true },
    },
    link(3, 5, "Vrátiť sa domov"),
  ];
  const assetId = id();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1600" viewBox="0 0 1200 1600"><defs><linearGradient id="s" x2="0" y2="1"><stop stop-color="#607467"/><stop offset=".6" stop-color="#283e35"/><stop offset="1" stop-color="#111d1b"/></linearGradient><radialGradient id="m"><stop stop-color="#eddfb4" stop-opacity=".6"/><stop offset="1" stop-color="#eddfb4" stop-opacity="0"/></radialGradient><filter id="f"><feGaussianBlur stdDeviation="35"/></filter></defs><path fill="url(#s)" d="M0 0h1200v1600H0z"/><circle cx="830" cy="400" r="290" fill="url(#m)"/><path fill="#233d32" d="M0 780l160-250 130 230 160-400 200 410 220-210 160 220 170-380v1200H0z"/><path fill="#162a24" d="M0 980l220-350 170 440 190-180 190 190 150-400 280 280v640H0z"/><path d="M850 880l35-390h60l40 390z" fill="#b2b4a0"/><path fill="#303e32" d="M876 465h80v60h-80z"/><path fill="#e9d59d" d="M888 478h55v32h-55z"/><path d="M910 500L250 700 500 370z" fill="#e9d59d" opacity=".16" filter="url(#f)"/><path fill="#101c19" d="M0 1290q400-380 820-340l380 160v490H0z"/><path fill="#7c8b72" opacity=".2" d="M450 1600q-10-400 420-650-260 320-160 650z"/></svg>`;
  const asset: Asset = {
    id: assetId,
    storyId: story.id,
    name: "Maják v hmle",
    kind: "image",
    mime: "image/svg+xml",
    blob: new Blob([svg], { type: "image/svg+xml" }),
  };
  story.scenes.forEach((s) => (s.imageId = assetId));
  await db.transaction("rw", db.stories, db.assets, async () => {
    await db.stories.add(story);
    await db.assets.add(asset);
  });
  return story;
}
