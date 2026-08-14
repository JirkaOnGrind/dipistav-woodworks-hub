# DIPISTAV illustration system

Tento dokument je závazný výrobní a implementační standard pro produktové ilustrace. Klientské fotografie jsou pouze soukromé výrobní reference; nepublikují se a necommitují.

## Vizuální podpis

- Tříčtvrteční izometrický pohled, čela materiálu zpravidla míří k pravému dolnímu rohu.
- Tmavě čokoládová kontura a šrafování, medové až jantarové výplně dřeva.
- Šrafování je hustší ve stínu, na kůře a ve spárách. Široké plochy zůstávají klidné a čitelné i na mobilu.
- Letokruhy jsou viditelné na důležitých čelech, ale nesmí vytvářet vizuální šum.
- Jedna čitelná silueta, bez prostředí, lidí, nářadí, textu, loga, watermarku a zapečeného stínu.
- Všechny kusy jsou kompletní. Zakázané jsou slité plochy, chybějící dělicí čáry, useknuté kusy, měnící se perspektiva a mechanicky opakované mřížky.

## `ArtworkSceneDefinition`

Produkční mapování žije v `src/lib/product-artwork.ts`. Každý množstevní stav je typovaná scéna s těmito povinnými údaji:

- stabilní `id`, `categoryId` a `illustrationVariant`;
- `quantityBand` a neklesající `visualMassRank`;
- verzovaný `source` a skutečné rozměry `canvas`;
- normalizovaný `alphaBounds` změřený z hotového alpha kanálu;
- `opticalCenter`, minimálně šestiprocentní `safeInset` a `transformPolicy`;
- sousední assety pro preload;
- `renderMode: "master"` pro kurátorovanou scénu nebo dočasný `"legacy-units"` pouze pro dosud nemigrované stavy.

Cílová, dosud neaktivní v10 matice žije odděleně v
`src/lib/product-artwork-v10-plan.ts`. Pole `plannedFileName` je výrobní kontrakt, nikoli
runtime `source`. Dokud soubor neprojde kontrolou fyzického počtu, alpha metadat,
vizuálního reject gate a schválením, nesmí se přidat do produkčního resolveru.

Nové nebo upravené množstevní pásmo musí být vždy jeden `master`. Přidávání nových CSS klonů je zakázané. `legacy-units` je pouze přechodová kompatibilita během schvalovací brány a nesmí se rozšiřovat.

## Množstevní pásma

Po vizuálním schválení se používá tato cílová matice:

- Trámy: 1 / 2 / 3–4 / 5–10 / 11–15 / 16+.
- Fošny: 1 / 2 / 3–4 / 5–9 / 10–14 / 15+; master pro 5–9 fyzicky obsahuje šest fošen ve stohu 3×2.
- Netříděná prkna: dvě samostatné rodiny 8–14 cm a 16–20 cm; každá používá 1 / 2 / 3–4 / 5–9 / 10–14 / 15+.
- Latě: 1 / 2 / 3–4 / 5–9 / 10–14 / 15+.
- Štípané dřevo a dříví na paletách: 1 / 2 / 3–4 / 5–8 / 9+.
- Jednotlivé pytle pelet: 1 / 2 / 3–4 / 5–9 / 10–19 / 20+.
- Sety deseti pytlů pelet: 1 / 2 / 3–4 / 5+; poslední stav je zastropovaný master padesáti pytlů.
- Palety pelet: 1 / 2 / 3 / 4–5 / 6+.
- Krajinky: 1 / 2 / 3–4 / 5+; množství 4 se normálně objednává přes pásmo 3–4.

Přesný objednaný počet zůstává v badge a cenové rekapitulaci. Scéna je
reprezentativní pro pásmo, ale `representativeCount` vždy přesně odpovídá fyzicky
nakresleným jednotkám. U agregované hromady volného dřeva je fyzickou jednotkou jedna
souvislá hromada; její objem komunikuje alpha coverage, ne počet nakreslených klonů.

## Potvrzené výrobní podmínky v10

- Netříděná prkna jsou rovná, čistě omítaná a bez kůry. Užší rodina střídá šířky 8,
  10, 12 a 14 cm; široká rodina 16, 18 a 20 cm.
- Volné dřevo v pásmu 9+ má nejméně 1,30násobnou alpha coverage pásma 5–8 při
  zachování měřítka jednoho polena.
- Všechno palivové dřevo tvoří štípané klíny s kůrou pouze na vnější zakulacené
  hraně. Kulatina a oloupané hranoly jsou zakázané.
- Pytle pelet jsou jediná brandingová výjimka: potisk obsahuje strom a údaj `15 kg`.
- Dříví na paletách v pásmu 9+ používá prostorovou sestavu 3×3 do hloubky, nikoli
  plochou stěnu.

## Safe-fit matematika

`calculateSafeArtworkTransform()` nevychází z obdélníku souboru, ale ze skutečného `alphaBounds` a `opticalCenter`. Pro každou osu vypočte maximální scale z nejvzdálenějšího okraje od optického středu a z dostupné poloviny plochy po odečtení safe-zone.

- minimální vnitřní okraj je 6 % na všech stranách;
- výsledný scale je vždy omezen alpha bounds;
- optický střed je po transformaci zarovnán na střed preview;
- dynamická odchylka scale u trámů má sílu 0,95;
- regresní stav `20 × 20 cm / 500 cm / 20 ks` musí zůstat celý uvnitř safe-zone.

Alpha bounds se zapisují až z finálního PNG po odstranění pozadí, ne z chroma source.

## Plynulé přepínání

`wood-visualizer.tsx` drží stabilní rozměr preview a používá dva obrazové buffery:

1. přednačte aktuální scénu a její přímé sousedy;
2. nový obraz zobrazí až po úspěšném `decode()`;
3. pořadové ID požadavku zahodí zastaralý výsledek při rychlém posouvání slideru;
4. předchozí vrstva zůstane pod novou po dobu 220ms crossfadu;
5. nová vrstva má jemnou 320ms scale animaci;
6. `prefers-reduced-motion` vypne crossfade, scale i rearrange animace.

Chyba načtení nikdy nesmí odstranit poslední úspěšně zobrazenou scénu.

## Alpha-edge výrobní postup

Výchozí cesta je ImageGen na dokonale plochém `#00ff00`. Pozadí nesmí obsahovat stín, gradient, podlahu, odlesk, texturu ani změnu osvětlení.

Základní průchod:

```powershell
python C:\Users\Utrh\.codex\skills\.system\imagegen\scripts\remove_chroma_key.py `
  --input <source.png> `
  --out <cutout.png> `
  --auto-key border `
  --soft-matte `
  --transparent-threshold 12 `
  --opaque-threshold 220 `
  --despill
```

Povolený je jediný opravný průchod s `--edge-contract 1`. Asset se zamítne, pokud i potom:

- nejsou všechny rohy zcela průhledné;
- existují izolované zelené pixely nebo zelená dominance v poloprůhledné hraně;
- je při 100 % nebo 200 % viditelná zubatost, světlý či zelený lem;
- soft matte vyžral tmavou konturu, kresbu dřeva, oka pytle nebo provaz.

Při poškození detailu se použije uživatelem schválený fallback: nativně průhledné PNG přes CLI `gpt-image-1.5`, následně produkční WebP. Vadný chroma výsledek se nesmí „zachraňovat“ dalším agresivním contractingem.

## Ukládání a naming

- Nové v10 kandidáty patří do `public/images/illustrations/configurator-v10/`.
- Zdrojové chroma PNG a alfa mezivýstupy se archivují mimo repozitář.
- Produkce: `<family>-<band>-master-v10.webp`.
- Existující assety se nepřepisují ani nemažou.

## Golden Master gate

První výrobní fáze obsahuje pouze osm reprezentativních kandidátů:

1. `fosna-15plus-master-v9.webp`;
2. `lat-3-4-master-v9.webp`;
3. `firewood-loose-9plus-master-v9.webp`;
4. `firewood-bigbag-5-8-master-v9.webp`;
5. `pallet-25-1-master-v9.webp`;
6. `pellets-set-1-master-v9.webp`;
7. `pellets-pallet-1-master-v9.webp`;
8. `slabs-4-master-v9.webp`.

Po čtvrtém schvalovacím kole je zamknuto a chráněno SHA-256 hashem sedm v9 masterů: `fosna-15plus-master-v9.webp`, `lat-3-4-master-v9.webp`, `firewood-loose-9plus-master-v9.webp`, `pellets-pallet-1-master-v9.webp`, `pellets-set-1-master-v9.webp`, `firewood-bigbag-5-8-master-v9.webp` a `firewood-bigbag-9plus-master-v9.webp`.

Korekční prompty vždy zachovávají DIPISTAV styl a přidávají společný zákaz: `no reverse perspective, no oversized background objects, no flat grid wall, no floating items, no unnatural wood peeling`.

Korekční kola používají tyto zpřesněné generativní podmínky:

- Big bag: přesně pět jednotek, tři vpředu a dvě vzadu; každý pytel vychází ze stejné geometrické šablony a má shodnou projektovanou šířku i výšku. Hloubka mění pouze pozici a překrytí, nikdy scale. Zakázané jsou `larger rear bags`, `taller rear bags` a `perspective scaling`.
- Set pelet: přesně deset pytlů; osm horizontálních v asymetrickém vazebném stohu a dva opřené z boků. Povinné jsou různé malé úhly natočení, široký fyzický kontakt a jednotlivě čitelné siluety. Zakázaná je matematická pyramida, pravidelná stěna a sterilní symetrie.
- Paleta 25 cm: obsah tvoří hranaté štípané klíny, ne hladké válce. Všechna čitelná řezná čela směřují doprava dolů; na druhé viditelné straně jsou pouze podélná těla s kůrou. Negativní prompt obsahuje `melted wood, peeled texture, organic distortion, blurry end grain`.
- Krajinky: čtyři rozměrově identické balíky tvoří stabilní pyramidu se třemi balíky v dolní nosné řadě a jedním vycentrovaným balíkem nahoře. Zakázané jsou izolované bloky, skryté mezery, levitace a opora mimo těžiště.

Na základě pokynu k celkové exekuci je všech 47 v9 assetů vyrobeno a produkčně aktivováno v jednotném registru scén. Aktivace a Golden Master lock jsou oddělené stavy: sedm výslovně schválených v9 assetů je hashově zamknutých; ostatní jsou produkční kandidáti se stavem `awaiting-approval` a nesmějí se přidat do hashového zámku bez dalšího výslovného schválení. Každý budoucí kandidát se kontroluje na světlém a tmavém pozadí, v desktopovém i mobilním konfigurátoru a s detailem alfa hran.

## Povinné kontroly před předáním

- testy hranic množstevních pásem a neklesajícího `visualMassRank`;
- existence všech registrovaných assetů;
- safe-fit včetně regresního stavu trámů;
- jeden `<img>` a žádné `data-selling-unit` u každého nového masteru;
- build, komponentové testy a cílený lint změněných souborů;
- Browser QA na 1440 × 900 a 390 × 844: první načtení, rychlý slider, ruční vstup, změna varianty, reduced motion a čistá konzole.
