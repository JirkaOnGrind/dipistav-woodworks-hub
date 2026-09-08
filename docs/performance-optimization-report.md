# Performance a bezpečný cleanup – výsledný report

Datum měření: 8. září 2026

Větev: `main`

Testovaný výstup: produkční `dist/client` přes lokální Vite preview

## Shrnutí výsledku

- Opravené a ověřené obrázky kategorií na homepage: všech 8 lazy-load obrázků se po
  skutečném mobilním scrollu načte, má nenulové rozměry a používá úsporný 384px WebP zdroj.
- Průměrné Lighthouse performance skóre (6 tras × desktop/mobil) vzrostlo z **74,2 na
  92,8**.
- Průměrné LCP kleslo z **11 724 ms na 2 285 ms** a přenos z **3 175 KiB na 580 KiB**.
- Produkční `dist/client` klesl z **405 832 642 B / 890 souborů** na **35 219 603 B /
  391 souborů** (−91,3 % dat).
- Slidery produktu a konfigurátoru při měřeném drag scénáři nevytvářejí dlouhé úlohy
  nad 50 ms; produktový slider na 6× zpomaleném mobilním CPU zrychlil z 46,0 na 55,3 FPS.
- Testy, build, lint, desktopové viewporty, ovládání klávesnicí a síťové chyby prošly.

## Metodika

Měření před a po používá stejné trasy a scénáře. Lighthouse 13.4.1 běžel v lokálním
Chrome nad produkčním buildem. Runtime scénáře používají Playwright/CDP, viewport
1366×768 a 4× CPU throttling pro desktop, 390×844 a 6× CPU throttling pro slabší mobil.
Sledují snímky, p95 frame time, Long Tasks, Event Timing, DOM mutace, layouty, style
recalculation, síťové požadavky a chyby konzole/HTTP.

Browser plugin nebyl v prostředí dostupný, proto byl použit přímo Chrome přes Playwright,
Performance API a CDP. React rendery byly měřeny vývojovým `React.Profiler`; profiler je
aktivní pouze v development režimu s `?react-profile=1` a není součástí produkční režie.

## Lighthouse před/po

| Trasa / profil | Skóre před | Skóre po | LCP před | LCP po | TBT před | TBT po | Přenos před | Přenos po |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Homepage desktop | 71 | 99 | 13 757 ms | 892 ms | 124 ms | 0 ms | 5 477 KiB | 631 KiB |
| Homepage mobil | 70 | 78 | 13 778 ms | 5 058 ms | 140 ms | 76 ms | 5 477 KiB | 1 656 KiB |
| Trámy desktop | 71 | 99 | 11 731 ms | 831 ms | 26 ms | 0 ms | 2 882 KiB | 480 KiB |
| Trámy mobil | 68 | 87 | 12 425 ms | 3 555 ms | 115 ms | 112 ms | 2 882 KiB | 422 KiB |
| Pelety desktop | 71 | 99 | 9 326 ms | 875 ms | 25 ms | 2 ms | 1 568 KiB | 566 KiB |
| Pelety mobil | 71 | 87 | 9 328 ms | 3 552 ms | 67 ms | 119 ms | 1 568 KiB | 420 KiB |
| Štípané dřevo desktop | 71 | 99 | 18 778 ms | 830 ms | 20 ms | 0 ms | 4 205 KiB | 515 KiB |
| Štípané dřevo mobil | 67 | 86 | 18 823 ms | 3 550 ms | 119 ms | 146 ms | 4 205 KiB | 421 KiB |
| Doprava desktop | 95 | 100 | 2 667 ms | 716 ms | 20 ms | 0 ms | 1 666 KiB | 423 KiB |
| Doprava mobil | 90 | 90 | 3 307 ms | 3 400 ms | 95 ms | 19 ms | 1 666 KiB | 438 KiB |
| O nás desktop | 73 | 100 | 13 378 ms | 681 ms | 17 ms | 0 ms | 3 250 KiB | 350 KiB |
| O nás mobil | 72 | 90 | 13 391 ms | 3 479 ms | 98 ms | 6 ms | 3 250 KiB | 642 KiB |

Lighthouse a runtime network audit se liší způsobem emulace a tím, jak daleko stránku
prohlížeč vykreslí. Samostatný runtime cold-load audit naměřil homepage **5 477 → 574
KiB na desktopu** a **1 536 → 300 KiB na mobilu**. Opakované návštěvy přenášely díky
cache jednotky až desítky KiB.

## Runtime UI performance před/po

| Profil / interakce | FPS před → po | p95 frame před → po | Long Tasks před → po | DOM mutace před → po |
| --- | ---: | ---: | ---: | ---: |
| Desktop konfigurátor – slider | 55,0 → 55,6 | 16,8 → 16,8 ms | 1 → 0 | 2 813 → 705 |
| Desktop produkt – množství | 56,1 → 58,8 | 33,3 → 16,8 ms | 0 → 0 | 892 → 423 |
| Mobil produkt – množství (6× CPU) | 46,0 → 55,3 | 50,0 → 16,8 ms | 11 → 0 | 892 → 416 |
| Desktop dropdown | 58,2 → 56,5 | 16,8 → 33,3 ms | 0 → 0 | 25 → 24 |
| Mobil dropdown (6× CPU) | 58,3 → 56,5 | 16,8 → 33,3 ms | 0 → 0 | 25 → 17 |
| Desktop lightbox | 43,8 → 46,5 | 50,1 → 33,3 ms | 2 → 2 | 109 → 78 |
| Desktop první otevření košíku | 46,4 → 44,4 | 83,3 → 99,9 ms | 1 → 1 | 41 → 35 |
| Mobilní scroll (6× CPU) | 36,7 → 38,3 | 16,8 → 33,3 ms | 2 → 1 | 61 → 27 |
| Mobilní první otevření košíku (6× CPU) | 35,8 → 34,7 | 66,6 → 50,0 ms | 1 → 1 | 42 → 36 |

Zásadní interakce sliderů splňují cíl bez úloh nad 50 ms. U produktového slideru klesl
počet layoutů na desktopu **70 → 35** a na mobilu **57 → 33**. React Profiler při 30
commitech ovladače zaznamenal pouze 3 commity mediální části produktu; slider tedy při
každém kroku nerenderuje galerii ani celou stránku.

Zbývající dlouhé úlohy jsou první inicializace Radix dialogu/košíku a dekódování obrázků
při velmi rychlém scrollu na synteticky 6× zpomaleném CPU. Lightbox se zlepšil (maximum
189 → 166 ms), ale tento okrajový scénář zatím nesplňuje absolutní hranici 50 ms. Další
zásah by znamenal výměnu přístupného dialogového základu nebo předčasné eager načítání,
což by zvýšilo běžný startup a nebylo přiměřené bez dat z reálných zařízení.

## Provedené optimalizace

- Build nyní sestavuje izolovaný produkční asset strom pouze z dosažitelných obrázků.
  184 primárních assetů se zmenšilo z **72,5 MiB na 25,8 MiB** bez přepsání originálů.
- Obrázky mají 384/640/1280px varianty, správné `srcset`/`sizes`, rozměry, asynchronní
  dekódování a lazy loading mimo první viewport. Konfigurátor načítá pouze aktuální obraz.
- Slider drží okamžitou lokální odezvu, změny dražšího rodiče slučuje přes
  `requestAnimationFrame` a finální hodnotu commitne při ukončení pointeru. Klávesnice
  zůstává funkční a commit je plánovaný jako React transition.
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

| Metrika | Před | Po | Změna |
| --- | ---: | ---: | ---: |
| `dist/client` | 405 832 642 B | 35 219 603 B | −91,3 % |
| Počet souborů | 890 | 391 | −56,1 % |
| CSS chunk | 128,17 kB | 89,64 kB | −30,1 % |
| Hlavní JS chunk | 428,29 kB | 343,17 kB | −19,9 % |
| Category JS chunk | 254,36 kB | 129,95 kB | −48,9 % |

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
- Finální vizuální QA: 18 screenshotů, 0 console/page/HTTP chyb. Homepage byla navíc
  ověřena skutečným postupným scrollováním; všech 8 obrázků se načetlo.

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
