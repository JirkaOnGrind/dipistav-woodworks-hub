# Krajinky: přesné sestavy 1–12

Stejný postup jako u řeziva: jeden zdroj, ručně laditelný JSON, deterministický export pro každé množství. JSON se nezobrazuje zákazníkům ani neimportuje do klientského balíku.

- Konfigurace: `scripts/bundle_configs.json`, objekt `bundle_configs`, klíče `1` až `12`.
- Zdroj: `public/images/illustrations/krajinky-v2.webp`, původní ilustrace bez překreslení.
- Exporty: `public/images/illustrations/slab-bundles-v37/slabs-{1..12}.svg`.
- Napojení: `src/lib/slab-bundle-artwork.ts` a registr `product-artwork.ts`.

SVG obsahuje původní WebP vložený jednou do `<defs>` a přesně N instancí `<use>`. Je samostatně přenositelný, ale kresba uvnitř je rastrová. UI, ceny, nabídka délek i nákupní maximum zůstávají stejné. Slider končí na 12, přesný vstup přijímá až dosavadních 500. Nad 12 zůstává dvanáctibalíková sestava; cena a košík stále používají skutečné množství.

## Ladění pozic

`positioning_grid[].grid` znamená `[row, column, layer]`; vrstva 0 je základ. Neúplná horní vrstva je vystředěná pomocí půlsloupců. Sestavy: 1; 2 diagonálně; 2+1; 2+2; 4+1; 4+2; 4+3; 4+4; 4+4+1; 4+4+2; 4+4+3; 4+4+4.

`css_metadata.offset` obsahuje promítací vektory v souřadnicích původního obrázku. Souřadnice rostou doprava a dolů, horní vrstva proto používá záporné `top`.

```text
left = origin.left + row * offset.row.left + column * offset.column.left
       + layer * offset.layer.left + positioning_grid[i].offset.left
top  = origin.top + row * offset.row.top + column * offset.column.top
       + layer * offset.layer.top + positioning_grid[i].offset.top
```

Upravujte společné vektory pro celou sestavu, nebo `positioning_grid[i].offset` pro jediný balík. `css_metadata.z_index[id]` určuje pořadí okluze: vyšší číslo se vykreslí později, tedy vpředu. SVG nepoužívá CSS z-index; generátor podle něj řadí elementy. V exportu lze dočasně ladit i `--bundle-left` a `--bundle-top` každého `<use>`.

Generátor celek rovnoměrně zmenší a vycentruje do plátna s rezervou `safe_inset`. Při převodu do absolutně pozicovaných HTML obrázků aplikujte stejný společný translate/scale na rodiče. Pozice se tak nedeformují při změně poměru stran viewportu.

```sh
node scripts/compose_slab_bundles.mjs
node scripts/compose_slab_bundles.mjs --check
```

Po úpravě ověřte náhledy všech dvanácti sestav, zejména viditelnost provazů a čel spodních balíků. Připojení dalších množství nebo změna plátna/bezpečných okrajů vyžaduje také aktualizaci metadat v `slab-bundle-artwork.ts`.
