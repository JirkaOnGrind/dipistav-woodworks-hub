# Performance a bezpečný cleanup – výsledný report

Datum měření: 8. září 2026

Větev: `main`

Testovaný výstup: produkční `dist/client` přes lokální Vite preview

## Shrnutí výsledku

- Opravené a ověřené obrázky kategorií na homepage: všech 8 obrázků se načítá eager,
  má nenulové rozměry a jejich souhrnná produkční velikost je 369 434 B. Statické stránky používají
  stabilní produkční URL, aby chybějící odvozený `srcset` soubor nezneplatnil fallback.
- Průměrné Lighthouse performance skóre (6 tras × desktop/mobil) vzrostlo z **74,2 na
  92,2**.
- Průměrné LCP kleslo z **11 724 ms na 2 300 ms** a přenos z **3 175 KiB na 787 KiB**.
- Produkční `dist/client` klesl z **405 832 642 B / 890 souborů** na **17 782 739 B /
  224 souborů** (−95,6 % dat).
- Slidery produktu a konfigurátoru při měřeném drag scénáři nevytvářejí dlouhé úlohy
  nad 50 ms; produktový slider na 6× zpomaleném mobilním CPU dosáhl 53,1 FPS.
- Testy, build, lint, desktopové viewporty, ovládání klávesnicí a síťové chyby prošly.

## Metodika

Měření před a po používá stejné trasy a scénáře. Lighthouse 13.4.1 běžel v lokálním
Chrome nad produkčním buildem. Runtime scénáře používají Playwright/CDP, viewport
1366×768 a 4× CPU throttling pro desktop, 390×844 a 6× CPU throttling pro slabší mobil.
Sledují snímky, p95 frame time, Long Tasks, Event Timing, DOM mutace, layouty, style
recalculation, síťové požadavky a chyby konzole/HTTP.

Automatizovaná matice používá Chrome přes Playwright, Performance API a CDP; finální oprava
byla navíc ručně ověřena v Browser pluginu. React rendery byly měřeny vývojovým `React.Profiler`; profiler je
aktivní pouze v development režimu s `?react-profile=1` a není součástí produkční režie.

## Lighthouse před/po

| Trasa / profil        | Skóre před | Skóre po |  LCP před |   LCP po | TBT před | TBT po | Přenos před | Přenos po |
| --------------------- | ---------: | -------: | --------: | -------: | -------: | -----: | ----------: | --------: |
| Homepage desktop      |         71 |       98 | 13 757 ms | 1 083 ms |   124 ms |   2 ms |   5 477 KiB | 1 650 KiB |
| Homepage mobil        |         70 |       77 | 13 778 ms | 5 063 ms |   140 ms | 129 ms |   5 477 KiB | 1 653 KiB |
| Trámy desktop         |         71 |       99 | 11 731 ms |   870 ms |    26 ms |  12 ms |   2 882 KiB |   828 KiB |
| Trámy mobil           |         68 |       84 | 12 425 ms | 3 554 ms |   115 ms | 213 ms |   2 882 KiB |   422 KiB |
| Pelety desktop        |         71 |       99 |  9 326 ms |   874 ms |    25 ms |  16 ms |   1 568 KiB |   732 KiB |
| Pelety mobil          |         71 |       86 |  9 328 ms | 3 552 ms |    67 ms | 149 ms |   1 568 KiB |   421 KiB |
| Štípané dřevo desktop |         71 |       99 | 18 778 ms |   956 ms |    20 ms |   9 ms |   4 205 KiB | 1 185 KiB |
| Štípané dřevo mobil   |         67 |       85 | 18 823 ms | 3 556 ms |   119 ms | 161 ms |   4 205 KiB |   421 KiB |
| Doprava desktop       |         95 |      100 |  2 667 ms |   719 ms |    20 ms |   0 ms |   1 666 KiB |   423 KiB |
| Doprava mobil         |         90 |       87 |  3 307 ms | 3 633 ms |    95 ms |  72 ms |   1 666 KiB |   437 KiB |
| O nás desktop         |         73 |       99 | 13 378 ms |   962 ms |    17 ms |   0 ms |   3 250 KiB |   627 KiB |
| O nás mobil           |         72 |       94 | 13 391 ms | 2 776 ms |    98 ms |  26 ms |   3 250 KiB |   642 KiB |

Lighthouse a runtime network audit se liší způsobem emulace a tím, jak daleko stránku
prohlížeč vykreslí. Samostatný runtime cold-load audit po finální opravě naměřil homepage
**5 477 → 719 KiB na desktopu** a **1 536 → 705 KiB na mobilu**. Mobil nyní záměrně
načítá všechny malé homepage náhledy předem namísto lazy načítání. Opakované návštěvy
přenášely díky cache jednotky až desítky KiB.

## Runtime UI performance před/po

| Profil / interakce                     | FPS před → po | p95 frame před → po | Long Tasks před → po | DOM mutace před → po |
| -------------------------------------- | ------------: | ------------------: | -------------------: | -------------------: |
| Desktop konfigurátor – slider          |   55,0 → 55,6 |      16,8 → 16,8 ms |                1 → 0 |          2 813 → 705 |
| Desktop produkt – množství             |   56,1 → 57,7 |      33,3 → 16,7 ms |                0 → 0 |            892 → 639 |
| Mobil produkt – množství (6× CPU)      |   46,0 → 53,1 |      50,0 → 33,3 ms |               11 → 0 |            892 → 435 |
| Desktop dropdown                       |   58,2 → 56,5 |      16,8 → 33,3 ms |                0 → 0 |              25 → 24 |
| Mobil dropdown (6× CPU)                |   58,3 → 56,5 |      16,8 → 33,3 ms |                0 → 0 |              25 → 17 |
| Desktop lightbox                       |   43,8 → 46,5 |      50,1 → 33,3 ms |                2 → 2 |             109 → 78 |
| Desktop první otevření košíku          |   46,4 → 44,4 |      83,3 → 99,9 ms |                1 → 1 |              41 → 35 |
| Mobilní scroll (6× CPU)                |   36,7 → 38,3 |      16,8 → 33,3 ms |                2 → 1 |              61 → 27 |
| Mobilní první otevření košíku (6× CPU) |   35,8 → 34,7 |      66,6 → 50,0 ms |                1 → 1 |              42 → 36 |

Zásadní interakce sliderů splňují cíl bez úloh nad 50 ms. U produktového slideru klesl
počet layoutů na mobilu klesl **57 → 33**. Desktop nyní záměrně vykresluje každý obrazový
mezistav, ale rychlé preview je izolované ve vizualizaci a cenu, košík ani zbytek detailu
necommitne do puštění ovladače. Mezistavy jsou doplněné po jednom přes
`requestAnimationFrame`, takže ani rychlý pohyb nepřeskočí rovnou ze 2 na 12. Kritický
scénář 5→12 byl ve finálním produkčním buildu ověřen: výsledkem je načtený
`beam-12-master-v35.webp` o rozměru 640×427.

Vývojový React Profiler při celém tahu zaznamenal lokální commity pouze v ovladači
množství a médiu. Cena, košík a ostatní části produktové stránky dostanou finální hodnotu
až po puštění ovladače; produkční runtime test slideru měl na desktopu i 6× zpomaleném
mobilním CPU **0 Long Tasks**.

Zbývající dlouhé úlohy jsou první inicializace Radix dialogu/košíku a dekódování obrázků
při velmi rychlém scrollu na synteticky 6× zpomaleném CPU. Lightbox se zlepšil (maximum
189 → 166 ms), ale tento okrajový scénář zatím nesplňuje absolutní hranici 50 ms. Další
zásah by znamenal výměnu přístupného dialogového základu nebo předčasné eager načítání,
což by zvýšilo běžný startup a nebylo přiměřené bez dat z reálných zařízení.

## Provedené optimalizace

- Build nyní sestavuje izolovaný produkční asset strom pouze z dosažitelných obrázků.
  194 primárních assetů se zmenšilo z **73,5 MiB na 15,9 MiB** bez přepsání originálů.
- Obrázky jsou během buildu optimalizovány na cílové maximální rozměry, mají deklarované
  rozměry a asynchronní dekódování. Homepage náhledy jsou malé a eager; `srcset` zůstává jen
  u obrazových rodin, které mají obě varianty jako skutečné zdrojové assety.
- Slider drží okamžitou lokální odezvu, změny dražšího rodiče slučuje přes
  `requestAnimationFrame` a finální hodnotu commitne při ukončení pointeru. Klávesnice
  zůstává funkční a commit je plánovaný jako React transition. Vizualizace předem načte a
  dekóduje pouze všechny dosažitelné kroky aktuálního slideru a aktuální varianty; jiné
  varianty ani skrytá mobilní vizualizace se nenačítají.
- Cart state byl oddělen od stabilních akcí, takže změna košíku nerenderuje celý detail;
  UI košíku je samostatný lazy chunk s pointer/focus/idle preloadem.
- Scroll listener používá pasivní režim a `requestAnimationFrame`. Na mobilu se skrytá
  desktopová vizualizace vůbec nepřipravuje ani nedekóduje.
- Animace lightboxu byly převedeny na CSS `transform`/`opacity`; odstraněn byl
  `framer-motion`. Přidána pravidla pro `prefers-reduced-motion`.
- Odstraněno 40 prokazatelně nepoužívaných shadcn modulů/hooků a 33 nepoužívaných
  závislostí. Zachovány byly buildové peer závislosti Lovable/Vite a veškeré zdrojové
  originály pro další tvorbu.

## Bundle a výstup

| Metrika           |          Před |           Po |   Změna |
| ----------------- | ------------: | -----------: | ------: |
| `dist/client`     | 405 832 642 B | 17 782 739 B | −95,6 % |
| Počet souborů     |           890 |          224 | −74,8 % |
| CSS chunk         |     128,17 kB |     89,64 kB | −30,1 % |
| Hlavní JS chunk   |     428,29 kB |    343,17 kB | −19,9 % |
| Category JS chunk |     254,36 kB |    129,95 kB | −48,9 % |

Košík je oddělen do odložených chunků (loader přibližně 14,56 kB, UI přibližně
19,42 kB) a neblokuje první render.

## Funkční a vizuální ověření

- `npm test`: **149/149 testů prošlo**.
- `npm run build`: produkční client, SSR a 16 prerenderovaných tras prošlo.
- `npm run lint`: **0 chyb**, pouze 3 dříve existující Fast Refresh warnings.
- `npm audit --omit=dev`: **0 produkčních zranitelností**.
- Všech 8 kategorií bylo ověřeno na 1366×768 i 1024×600, včetně dodatečných režimů a
  nedostupné varianty prken. Detail má `scrollHeight === viewportHeight`, nadpis,
  konfigurátor, cena i akce jsou viditelné.
- Mobil zachovává běžný dokumentový scroll. Slider reaguje na touch/myš i klávesnici;
  kontrola `ArrowRight` změnila množství na 2 a cenu na 604 Kč.
- Lightbox je přístupný dialog, zavření vrací focus a poslední obrázek zůstává v galerii.
- Finální vizuální QA: 20 screenshotů, 0 console/page/HTTP chyb. Homepage byla navíc
  ověřena skutečným postupným scrollováním; všech 8 eager obrázků se načetlo.

## Nasazení na Český hosting / THINline

K nasazení je připraven obsah `dist/client`. Doporučené cache, komprese a SPA fallback
pro Český hosting jsou v [cesky-hosting-performance-config.md](./cesky-hosting-performance-config.md).
Preferovaná je konfigurace VirtualHostu přes podporu hostingu; `.htaccess` je ponechán
jen jako volitelná varianta, protože jej hosting standardně nemá zapnutý a sám upozorňuje
na jeho režii.

## Reprodukování

```powershell
npm ci
npm test
npm run lint
npm run build
npm run preview -- --host 127.0.0.1 --port 4173
npm run qa:visual -- --base-url=http://127.0.0.1:4173
npm run performance:runtime -- --base-url=http://127.0.0.1:4173
```

React profiling vyžaduje development server a parametr `?react-profile=1`; automatizace
je dostupná přes `npm run performance:react`.
