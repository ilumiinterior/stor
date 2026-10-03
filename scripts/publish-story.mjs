import { copyFile, mkdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import JSZip from "jszip";
const source = process.argv[2];
if (!source)
  throw Error('Použitie: npm run publish:story -- "C:\\cesta\\pribeh.story"');
const bytes = await readFile(resolve(source));
const zip = await JSZip.loadAsync(bytes);
if (!zip.file("story.json")) throw Error("Súbor neobsahuje export príbehu.");
await mkdir("public", { recursive: true });
await copyFile(resolve(source), resolve("public/game.story"));
console.log(
  "Hotová hra je pripravená v public/game.story. Spustite npm run build.",
);
