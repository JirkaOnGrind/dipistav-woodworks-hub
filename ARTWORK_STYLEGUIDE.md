# DIPISTAV Artwork Visual DNA (AI-Optimized)

Závazná vizuální specifikace pro generování a schvalování produktových ilustrací DIPISTAV.

## 1. Kamera a Geometrie
- **Projekce:** Ortografická 3/4 izometrie bez perspektivního sbíhání a zkreslení.
- **Kamera:** Azimut `40°`, Elevace `27°`.
- **Orientace:** Hlavní osa vede z levého horního rohu do pravého dolního. Čela materiálu směřují vpravo dole.
- **Měřítko:** Paralelní hrany zůstávají paralelní. Stejné jednotky mají ve všech hloubkách identickou projektovanou šířku a výšku (žádné zmenšování v dálce).
- **Canvas:** 1536×1024 (skupiny/dlouhé kousky) nebo 1254×1254 (samostatné vysoké kousky). Okraje mají 6–8% transparentní odsazení (inset).

## 2. Vizuální Styl a Paleta (Semantic DNA)
- **Kontury:** Tmavá čokoládově hnědá vnější silueta a středně tmavé konstrukční dělicí hrany.
- **Kresba:** Jemné ryté šrafování letokruhů a vláken (nejhustší v kontaktních spárách a stínech).
- **Materiál (Smrk):** Teplé medové, oranžovohnědé a jantarové tóny s jasným světlem shora zleva. Čerstvě řezaná čela jsou světlé krémově žlutá.
- **Doplňky:** Kraftový papír (teplá okrová), Big Bag plátno (béžová/režná textilie), kůra (tmavohnědá až černohnědá).
- **Pozadí:** Čistě izolovaný objekt na transparentním/bílém pozadí. Žádná podlaha, podklad, glow ani zapečený vržený stín.

## 3. Kompoziční Fyzika
- **Stohování:** Reálná konstrukce českého stavebního dvoru. Vyšší vrstvy musí mít stabilní podporu pod těžištěm (žádná levitace ani neviditelné nosné body).
- **Překrývání:** Přirozený fyzický kontakt, čitelná přední, střední a zadní vrstva.
- **Řezné čelo:** Uzavřené, kolmé k ose, se zřetelnými letokruhy a maximálně jednou radiální prasklinou.

## 4. Povinný Negativní Prompt (Negative Prompt)
```text
no perspective drift, no perspective convergence, no depth-based scaling, no fisheye,
no cube distortion, no miniature logs, no melted wood, no peeled texture,
no organic distortion, no blurry end grain, no malformed cut faces,
no detached bark, no fused boards, no missing separation seams,
no changing strap count, no floating items, no unsupported cantilever,
no repeated icon grid, no collage seams, no photorealism, no environment,
no floor, no baked shadow, no glow, no text, logo, people, tools or watermark