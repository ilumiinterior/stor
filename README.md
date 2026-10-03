# Vetvy — verejný prehrávač

Verejná verzia obsahuje iba hranie hotového príbehu. Nemá editor, knižnicu, tvorbu ani importovanie hier cez rozhranie. Aj adresa `/editor` zobrazí iba prehrávač.

## Publikovanie príbehu

Príbeh exportujte z lokálneho editora ako `.story` a pripravte na publikovanie:

```powershell
npm run publish:story -- "C:\cesta\Moj-pribeh.story"
npm run build
```

Export sa skopíruje do `public/game.story`. Tento súbor commitnite a pushnite. Hráč otvorí stránku a hrá tento príbeh. Bez súboru sa zobrazí „Hra ešte nie je dostupná.“ Identifikátor príbehu zostáva stabilný, aby fungovali uložené pozície.

## Vercel

- Build command: `npm run build`
- Output directory: `dist`
- Framework: Vite

Tieto hodnoty obsahuje `vercel.json`. Predvolený build vždy vytvára iba prehrávač. `dist` sa do GitHubu neukladá; Vercel ho vytvorí zo zdrojov.

## Lokálny editor

Na pôvodnom autorskom počítači zostáva editor v súboroch ignorovaných Gitom. Spustenie: `npm run dev`. Samostatný build: `npm run build:editor` do `dist-editor`. Autorské súbory nie sú súčasťou aktuálnej verejnej verzie repozitára. Pôvodný podrobný návod je lokálne v `local/EDITOR.md`.

Vývoj prehrávača: `npm run dev:player`. Overenie: `npm run lint`, `npm run test`, `npx playwright test`. Testy na Windows používajú Chrome; na ostatných platformách nainštalujte Chromium pre Playwright.
# Vetvy — verejný prehrávač

Verejná verzia obsahuje iba hranie hotového príbehu. Nemá editor, knižnicu, tvorbu ani importovanie hier cez rozhranie. Aj adresa `/editor` zobrazí iba prehrávač.

## Publikovanie príbehu

Príbeh exportujte z lokálneho editora ako `.story` a pripravte na publikovanie:

```powershell
npm run publish:story -- "C:\cesta\Moj-pribeh.story"
npm run build
```

Export sa skopíruje do `public/game.story`. Tento súbor commitnite a pushnite. Hráč otvorí stránku a hrá tento príbeh. Bez súboru sa zobrazí „Hra ešte nie je dostupná.“ Identifikátor príbehu zostáva stabilný, aby fungovali uložené pozície.

## Vercel

- Build command: `npm run build`
- Output directory: `dist`
- Framework: Vite

Tieto hodnoty obsahuje `vercel.json`. Predvolený build vždy vytvára iba prehrávač. `dist` sa do GitHubu neukladá; Vercel ho vytvorí zo zdrojov.

## Lokálny editor

Na pôvodnom autorskom počítači zostáva editor v súboroch ignorovaných Gitom. Spustenie: `npm run dev`. Samostatný build: `npm run build:editor` do `dist-editor`. Autorské súbory nie sú súčasťou aktuálnej verejnej verzie repozitára. Pôvodný podrobný návod je lokálne v `local/EDITOR.md`.

Vývoj prehrávača: `npm run dev:player`. Overenie: `npm run lint`, `npm run test`, `npx playwright test`. Testy na Windows používajú Chrome; na ostatných platformách nainštalujte Chromium pre Playwright.
