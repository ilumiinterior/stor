# Vetvy

Lokálna PWA na tvorbu a hranie vetvených príbehov. React, Vite, TypeScript, Tailwind CSS, Zustand, Dexie a XYFlow. Aplikácia nemá účet, server ani externú databázu.

## Spustenie

```sh
npm ci
npm run dev
```

Editor: `/editor`. Knižnica prehrávača: `/play`. Ukážka „Svetlo za hmlou“ obsahuje šesť scén, dva konce a podmienenú možnosť.

```sh
npm run typecheck
npm run lint
npm test
npm run build
npm run preview
npm exec playwright test
```

Konfigurácia Playwright používa lokálny Chrome na Windows. Pre inú platformu odstráňte `launchOptions.executablePath` a nainštalujte Chromium cez `npx playwright install chromium`.

## Video v scénach

Vo vlastnostiach scény použite **Video → Nahrať** alebo vyberte video zo správcu **Médiá → Videá**. Podporované sú MP4 a WebM; konkrétny kodek musí podporovať prehliadač. Pre Premiere Pro odporúčame H.264 v MP4, portrét 1080 × 1920, 25 alebo 30 fps, SDR Rec.709 a VBR približne 6–10 Mb/s. Ako východisko použite Match Source – Adaptive High Bitrate a upravte bitrate podľa záberu. Pri vlastnom rozmere použite párne rozmery (napríklad 942 × 1672 namiesto 941 × 1672 pre bežný H.264 s 4:2:0). Zvuk, ak ho potrebujete, exportujte ako AAC.

Video má prednosť pred obrázkom. Obrázok môže zostať ako poster a záložné pozadie pri chybe videa. Predvolene sa video opakuje bez zvuku; obe voľby možno zmeniť v scéne. Zvuk videa rešpektuje hlasitosť a prepínač zvuku hráča. Ak prehliadač blokuje spustenie, použite **Prehrať video**. Video sa pozastaví v ponuke a pri skrytí aplikácie. Pri preferencii obmedzeného pohybu sa spúšťa až tlačidlom.

Na mobile zostáva pôvodné vyplnenie obrazovky; na širokom PC alebo tablete naležato sa zobrazí celý záber. Videá sú uložené v IndexedDB, fungujú offline a exportujú sa do `assets/videos/` v `.story`. Testovací klip `tests/fixtures/portrait.mp4` je syntetický H.264/AAC súbor vytvorený FFmpegom.

Pri opakovaní video po dohraní podrží posledný záber aspoň 4 sekundy. V tejto pauze sa zvýraznia možnosti voľby a potom sa video spustí od začiatku. Voľby sú dostupné aj počas prehrávania. Ponuka a skrytie aplikácie prerušia časovač; po návrate začne celá štvorsekundová pauza znova. Pri vypnutom opakovaní zostane posledný záber a zvýraznené voľby až do ďalšej akcie hráča.

Pri opakovaní video po dohraní podrží posledný záber aspoň 4 sekundy. V tejto pauze sa zvýraznia možnosti voľby a potom sa video spustí od začiatku. Voľby sú dostupné aj počas prehrávania. Ponuka a skrytie aplikácie prerušia časovač; po návrate začne celá štvorsekundová pauza znova. Pri vypnutom opakovaní zostane posledný záber a zvýraznené voľby až do ďalšej akcie hráča.

## Vzhľad

V editore scény zvoľte **Typ scény**: interaktívna zobrazuje voľby hráča, automatická prejde bez kliknutia do vybranej **Nasledujúcej scény**, koncová ukončí príbeh. Automatické video sa prehrá iba raz a prechod nastane hneď po dohraní; pri obrázku alebo bez videa určite **Trvanie obrázka / záložný čas** (1–3600 sekúnd). Pri chybe videa sa použije tento čas. Ponuka a skrytie aplikácie pozastavia časovanie. Napríklad scénu s videom smrti nastavte ako automatickú a nasledujúcu scénu s grafikou „Zomrel si“ ako koncovú.

**Farba pozadia scény** má vlastný výber RGB/HEX a uloží sa s príbehom. Obrázok alebo video zostáva nad týmto pozadím; farba je viditeľná v nezakrytých častiach. V hornej lište editora je priamy výber **Pozadie editora**. Podrobné farby a návrat k pôvodným hodnotám zostávajú v nastavení vzhľadu editora.

V editore otvorte **Príbeh**. V časti **Vzhľad hry** môžete zapnúť názvy scén (predvolene skryté), zvoliť písmo a farebný motív. Tieto nastavenia sú súčasťou projektu aj `.story` exportu; náhľad ich používa presne podľa autora. Staršie projekty fungujú bez migrácie.

Časť **Vzhľad editora** nastavuje iba toto zariadenie. Hráč môže v ponuke **Nastavenia** zvoliť vlastné písmo a motív alebo obnoviť vzhľad autora. Osobné voľby prežijú opätovné otvorenie aplikácie. Päť písiem (Bodoni Moda, Manrope, Literata, Nunito Sans, Source Serif 4) je uložených lokálne a podporuje slovenskú diakritiku aj offline používanie. Motívy: lesná zelená, bridlicová, teplá sépia, vínová a svetlý papier.

**Farba pozadia UI** a **Farba zvýraznenia UI** podporujú celý RGB rozsah cez paletu, HEX `#RRGGBB` alebo čísla R/G/B 0–255. Pôvodný vzhľad je predvolený, pokiaľ nezvolíte vlastnú farbu. Text a odvodené povrchy sa prispôsobia kvôli kontrastu. Vlastné farby hry sú súčasťou `.story`; farby editora a osobné voľby hráča sú lokálne. **Použiť pôvodné farby motívu** odstráni vlastné farby; výber iného motívu ich tiež resetuje. **Použiť vzhľad nastavený autorom** obnoví aj autorove RGB farby.

Automatická scéna nezobrazuje tlačidlá volieb, preskočenia, ponuky ani ovládania videa. Pri zablokovanom automatickom prehrávaní alebo preferencii obmedzeného pohybu pokračuje po záložnom čase, aby nevyžadovala kliknutie hráča.

## Lokalizácia

Slovenčina je predvolený aj záložný jazyk. Všetky texty rozhrania patria do `src/i18n/sk.ts`; komponenty používajú typované `t("editor.preview")`. Parametre: `t("player.slot", { number: 2 })`. Test lokalizácie kontroluje texty JSX a statické prístupné popisy.

Nový jazyk pridajte ako slovník do `src/i18n/en.ts` a zaregistrujte pomocou `registerLocale("en", en)`. `t(key, params, "en")` podporuje čiastočné slovníky a fallback do slovenčiny. V1 používa výhradne slovenčinu a nemá prepínač jazyka. Text PWA manifestu pochádza z rovnakého slovenského slovníka. Názvy externých knižníc a natívne ovládacie prvky prehliadača sa riadia ich vlastným rozhraním.

Obsah príbehu sa nikdy automaticky neprekladá. `Story.contentLanguage` označuje jazyk autora; `Story.translations` je voliteľný slovník budúcich ručne vytvorených variantov názvu príbehu, scén a možností. Pôvodné polia zostávajú hlavným obsahom. IndexedDB ukladá celé dokumenty, takže pridaním jazykových variantov netreba meniť databázové indexy ani migrovať existujúce záznamy.

## Dáta a bezpečnosť

Projekty, binárne médiá a uložené hry sú v IndexedDB. LocalStorage obsahuje iba malé nastavenia prehrávača. Každá zmena editora sa ukladá; transakcia uchová aj predchádzajúcu verziu projektu. Obnova je dostupná v časti Príbeh. Poškodené projekty sa neotvárajú na úpravu. Odstránenie projektu vyžaduje potvrdenie.

Prehrávač má automatickú pozíciu a tri manuálne pozície. Ukladá po každej voľbe, pri odchode do ponuky, pri zmene viditeľnosti a priebežne počas hrania. Náhľad má izolovaný priebeh a nezapisuje do herných pozícií. Uložená hra sa pred načítaním kontroluje voči aktuálnym scénam a typom premenných.

Export `.story` je ZIP so `story.json` a priečinkami `assets/images/`, `assets/audio/`, `assets/music/`. Import vytvorí samostatný projekt a nové identifikátory médií; existujúci projekt neprepíše. Súbory podliehajú validácii schémy. Exporty používajte aj ako zálohu — dáta sa stratia, ak používateľ vymaže úložisko aplikácie alebo prehliadača.

## PWA a nasadenie

Build vytvorí manifest, service worker a ikony 192/512 px. Rozhranie a lokálne fonty sa ukladajú do offline cache; médiá príbehov sú lokálne v IndexedDB. Po prvom načítaní produkčnej aplikácie a aktivácii service workera možno importované/vytvorené príbehy hrať offline. Inštalácia vyžaduje HTTPS alebo localhost. Android používa dostupnú inštalačnú výzvu; iOS zobrazuje návod na pridanie na plochu.

GitHub: nahrajte tento projekt vrátane `package-lock.json`. Vercel: framework Vite, príkaz `npm run build`, výstup `dist`. `vercel.json` zabezpečuje priame otvorenie `/editor` a `/play`. Žiadne premenné prostredia nie sú potrebné. Projekt sa zatiaľ nenahral do GitHubu ani nenasadil do Vercelu.
