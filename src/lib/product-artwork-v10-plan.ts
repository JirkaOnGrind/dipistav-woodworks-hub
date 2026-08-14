import type { QuantityBand } from "@/lib/product-artwork";

export const CONFIGURATOR_V10_ROOT = "/images/illustrations/configurator-v10";

export type V10ArtworkBandPlan = {
  id: string;
  quantityBand: QuantityBand;
  representativeCount: number;
  physicalUnit: string;
  plannedFileName: string;
  composition: string;
  relativeAlphaCoverage?: {
    referenceBandId: string;
    minimumRatio: number;
    preserveIndividualScale: boolean;
  };
};

export type V10ArtworkFamilyPlan = {
  id: string;
  categoryId: string;
  illustrationVariants: readonly string[];
  approvalStatus: "planned";
  sharedRequirements: readonly string[];
  bands: readonly V10ArtworkBandPlan[];
};

type BandDraft = [
  suffix: string,
  min: number,
  max: number | undefined,
  representativeCount: number,
  composition: string,
  plannedFileName?: string,
];

function plannedBand(
  familyId: string,
  physicalUnit: string,
  [suffix, min, max, representativeCount, composition, plannedFileName]: BandDraft,
): V10ArtworkBandPlan {
  return {
    id: `${familyId}-${suffix}`,
    quantityBand: { min, ...(max === undefined ? {} : { max }) },
    representativeCount,
    physicalUnit,
    plannedFileName: plannedFileName ?? `${familyId}-${suffix}-master-v10.webp`,
    composition,
  };
}

function family(config: {
  id: string;
  categoryId: string;
  illustrationVariants: readonly string[];
  physicalUnit: string;
  sharedRequirements: readonly string[];
  bands: readonly BandDraft[];
}): V10ArtworkFamilyPlan {
  return {
    id: config.id,
    categoryId: config.categoryId,
    illustrationVariants: config.illustrationVariants,
    approvalStatus: "planned",
    sharedRequirements: config.sharedRequirements,
    bands: config.bands.map((band) => plannedBand(config.id, config.physicalUnit, band)),
  };
}

const TIMBER_BANDS: readonly BandDraft[] = [
  ["1", 1, 1, 1, "jeden kompletní kus"],
  ["2", 2, 2, 2, "dva kompletní kusy s čitelnou spárou"],
  ["3-4", 3, 4, 3, "tři kompletní kusy ve stabilním stohu"],
  ["5-9", 5, 9, 6, "šest kompletních kusů v geometrickém stohu 3×2"],
  ["10-14", 10, 14, 10, "deset kompletních kusů v nízkém stabilním stohu"],
  ["15plus", 15, undefined, 15, "patnáct kompletních kusů s jasnými dělicími hranami"],
];

const PALLET_ROW_BANDS: readonly BandDraft[] = [
  ["1", 1, 1, 1, "jedna kompletní paleta"],
  ["2", 2, 2, 2, "dvě stejně velké palety"],
  ["3-4", 3, 4, 4, "čtyři palety ve dvou prostorových řadách"],
  ["5-8", 5, 8, 6, "šest palet v prostorové sestavě 3×2"],
  ["9plus", 9, undefined, 9, "devět palet v přirozené izometrické sestavě 3×3 do hloubky"],
];

export const V10_ARTWORK_PLAN: readonly V10ArtworkFamilyPlan[] = [
  family({
    id: "beam",
    categoryId: "tramy",
    illustrationVariants: ["beam"],
    physicalUnit: "trám",
    sharedRequirements: [
      "beam-9-v10.webp je neměnný etalon palety, kresby dřeva, síly linek a izometrické kamery",
      "spodní vrstva končí rovnou izometrickou základnou bez klínů, podpěr nebo přečnívajících fragmentů",
      "čtyřsloupcová čelní mřížka pokračuje nahoře jako přesně čtyři trámy oddělené třemi souvislými podélnými švy",
    ],
    bands: [
      ["1", 1, 1, 1, "jeden kompletní trám", "beam-1-composed-master-v10.webp"],
      ["2", 2, 2, 2, "dva kompletní trámy v mřížce 2×1", "beam-2-composed-master-v10.webp"],
      ["3-4", 3, 4, 3, "tři kompletní trámy v rozložení 2+1", "beam-3-4-composed-master-v11.webp"],
      ["5-8", 5, 8, 6, "šest kompletních trámů v mřížce 3×2", "beam-5-8-composed-master-v10.webp"],
      ["9-11", 9, 11, 9, "devět kompletních trámů v matici 3×3", "beam-9-11-composed-master-v10.webp"],
      [
        "12-15",
        12,
        15,
        12,
        "dvanáct kompletních trámů v matici 4×3; čtyři horní trámy a rovná základna",
        "beam-12-15-composed-master-v10.webp",
      ],
      [
        "16plus",
        16,
        undefined,
        16,
        "šestnáct trámů v matici 4×4; čtyři horní trámy, tři souvislé švy a rovná základna",
        "beam-16plus-composed-master-v10.webp",
      ],
    ],
  }),
  family({
    id: "plank",
    categoryId: "fosny",
    illustrationVariants: ["plank"],
    physicalUnit: "fošna",
    sharedRequirements: [
      "sjednotit všechny odstíny na paletu neměnného etalonu beam-9-v10.webp",
      "pásmo 5–9 musí fyzicky zobrazit šest fošen v uspořádání 3×2",
    ],
    bands: TIMBER_BANDS,
  }),
  family({
    id: "board-sorted",
    categoryId: "prkna",
    illustrationVariants: ["board-sorted"],
    physicalUnit: "prkno",
    sharedRequirements: [
      "odstranit boční artefakt současného prkno-sorted-3",
      "rovné omítané hrany, bez slévání bočních ploch",
    ],
    bands: TIMBER_BANDS,
  }),
  family({
    id: "board-unsorted-narrow",
    categoryId: "prkna",
    illustrationVariants: ["board-unsorted-narrow"],
    physicalUnit: "prkno",
    sharedRequirements: [
      "výhradně čistě omítaná prkna bez kůry a bez oblin",
      "od dvou kusů střídat šířky 8, 10, 12 a 14 cm; tloušťka zůstává 25 mm",
    ],
    bands: TIMBER_BANDS,
  }),
  family({
    id: "board-unsorted-wide",
    categoryId: "prkna",
    illustrationVariants: ["board-unsorted-wide"],
    physicalUnit: "prkno",
    sharedRequirements: [
      "výhradně čistě omítaná prkna bez kůry a bez oblin",
      "od dvou kusů střídat šířky 16, 18 a 20 cm; tloušťka zůstává 25 mm",
      "silueta musí být zřetelně širší než u skupiny 8–14 cm",
    ],
    bands: TIMBER_BANDS,
  }),
  family({
    id: "lath",
    categoryId: "late",
    illustrationVariants: ["lath"],
    physicalUnit: "lať",
    sharedRequirements: [
      "jedna paleta řeziva napříč všemi pásmy",
      "pásmo 10–14 zobrazuje přesně dvanáct, nikoli osmnáct latí; 15+ přesně patnáct",
    ],
    bands: [
      ...TIMBER_BANDS.slice(0, 4),
      ["10-14", 10, 14, 12, "dvanáct kompletních latí v kompaktním stohu 3×4"],
      TIMBER_BANDS[5],
    ],
  }),
  family({
    id: "firewood-loose",
    categoryId: "stipane-drevo",
    illustrationVariants: ["firewood-loose"],
    physicalUnit: "souvislá hromada",
    sharedRequirements: [
      "stejné měřítko jednotlivých štípaných polen ve všech pásmech",
      "kůra jen na vnější zakulacené hraně štípaného klínu",
    ],
    bands: [
      ["1", 1, 1, 1, "jedna kompaktní hromada"],
      ["2", 2, 2, 1, "jedna větší kompaktní hromada"],
      ["3-4", 3, 4, 1, "jedna větší kompaktní hromada"],
      ["5-8", 5, 8, 1, "jedna referenční hromada pro srovnání alpha coverage"],
      ["9plus", 9, undefined, 1, "jedna prostorově širší a hlubší hromada"],
    ],
  }),
  family({
    id: "firewood-bigbag",
    categoryId: "stipane-drevo",
    illustrationVariants: ["firewood-bag"],
    physicalUnit: "big bag",
    sharedRequirements: [
      "všechny vaky mají stejnou projektovanou velikost",
      "ověřit beze změny mapování současných schválených v9 masterů před přegenerováním",
    ],
    bands: [
      ["1", 1, 1, 1, "jeden big bag"],
      ["2", 2, 2, 2, "dva big bagy"],
      ["3-4", 3, 4, 4, "čtyři big bagy"],
      ["5-8", 5, 8, 5, "pět big bagů: tři vpředu, dva vzadu"],
      ["9plus", 9, undefined, 9, "devět stejně velkých big bagů"],
    ],
  }),
  family({
    id: "firewood-pallet",
    categoryId: "stipane-drevo",
    illustrationVariants: ["firewood-pallet"],
    physicalUnit: "paleta",
    sharedRequirements: [
      "jednotné štípané klíny; žádná kulatina ani hranoly",
      "sjednotit kůru, řezná čela a teplotu barev napříč pásmy",
    ],
    bands: PALLET_ROW_BANDS,
  }),
  family({
    id: "pellets-bag",
    categoryId: "pelety",
    illustrationVariants: ["pellets-bag"],
    physicalUnit: "pytel",
    sharedRequirements: [
      "čistý překryvný potisk stromu a 15 kg je povolená brandingová výjimka",
      "pytle se prokládají ve vazbě a značková strana zůstává čitelná nahoře",
    ],
    bands: [
      ["1", 1, 1, 1, "jeden pytel podle kanonické reference"],
      ["2", 2, 2, 2, "dva proložené pytle"],
      ["3-4", 3, 4, 4, "čtyři proložené pytle"],
      ["5-9", 5, 9, 7, "sedm pytlů v nízkém vazebném stohu"],
      ["10-19", 10, 19, 15, "patnáct pytlů v čistém vazebném stohu"],
      ["20plus", 20, undefined, 20, "dvacet čistě srovnaných proložených pytlů"],
    ],
  }),
  family({
    id: "pellets-set",
    categoryId: "pelety",
    illustrationVariants: ["pellets-set"],
    physicalUnit: "pytel",
    sharedRequirements: [
      "jeden prodávaný set vždy znamená deset pytlů",
      "od pěti setů se vizuální hustota zastropuje jedním masterem s padesáti pytli",
    ],
    bands: [
      ["1", 1, 1, 10, "deset pytlů v asymetrickém vazebném stohu"],
      ["2", 2, 2, 20, "dvacet pytlů v uspořádaném bulk stohu"],
      ["3-4", 3, 4, 30, "třicet pytlů v uspořádaném bulk stohu"],
      ["5plus", 5, undefined, 50, "finální zastropovaná hromada padesáti pytlů"],
    ],
  }),
  family({
    id: "pellets-pallet",
    categoryId: "pelety",
    illustrationVariants: ["pellets-pallet"],
    physicalUnit: "paleta",
    sharedRequirements: [
      "stejná kamera a projektovaná velikost každé palety",
      "čtyři až pět palet skládat prostorově, nikoli jako plochou stěnu",
    ],
    bands: [
      ["1", 1, 1, 1, "jedna paleta"],
      ["2", 2, 2, 2, "dvě palety"],
      ["3", 3, 3, 3, "tři palety"],
      ["4-5", 4, 5, 4, "čtyři palety ve dvou prostorových řadách"],
      ["6plus", 6, undefined, 6, "šest palet v prostorové kompozici"],
    ],
  }),
  family({
    id: "slabs",
    categoryId: "krajinky",
    illustrationVariants: ["slabs-2m", "slabs-3m", "slabs-4m"],
    physicalUnit: "balík",
    sharedRequirements: [
      "množství čtyři zůstává objednatelné, ale nemá samostatný asset",
      "balíky jsou fyzicky podepřené a krajinky logicky vyskládané",
    ],
    bands: [
      ["1", 1, 1, 1, "jeden balík"],
      ["2", 2, 2, 2, "dva balíky"],
      ["3-4", 3, 4, 4, "čtyři balíky: tři dole a jeden uprostřed nahoře"],
      ["5plus", 5, undefined, 5, "pět stabilně vyskládaných balíků"],
    ],
  }),
  ...(["pallet-25", "pallet-33", "pallet-16"] as const).map((illustrationVariant) =>
    family({
      id: illustrationVariant,
      categoryId: "drivi-na-paletach",
      illustrationVariants: [illustrationVariant],
      physicalUnit: "paleta",
      sharedRequirements: [
        "všechna polena jsou štípané klíny s kůrou jen na vnější zakulacené hraně",
        "pásmo 9+ tvoří plastickou izometrickou sestavu 3×3 do hloubky, ne plochou stěnu",
      ],
      bands: PALLET_ROW_BANDS,
    }),
  ),
].map((artworkFamily) => {
  if (artworkFamily.id !== "firewood-loose") return artworkFamily;
  return {
    ...artworkFamily,
    bands: artworkFamily.bands.map((band) =>
      band.id.endsWith("9plus")
        ? {
            ...band,
            relativeAlphaCoverage: {
              referenceBandId: "firewood-loose-5-8",
              minimumRatio: 1.3,
              preserveIndividualScale: true,
            },
          }
        : band,
    ),
  };
});

export function getV10ArtworkFamilyPlan(categoryId: string, illustrationVariant: string) {
  return V10_ARTWORK_PLAN.find(
    (artworkFamily) =>
      artworkFamily.categoryId === categoryId &&
      artworkFamily.illustrationVariants.includes(illustrationVariant),
  );
}
