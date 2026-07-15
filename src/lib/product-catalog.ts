export type SelectOption = {
  value: string;
  label: string;
};

export type ProductCategorySection = {
  id: string;
  anchorId: string;
  title: string;
  description: string;
  categories: ProductCategory[];
};

type BaseCategory = {
  id: string;
  sectionId: string;
  sectionTitle: string;
  sectionAnchorId: string;
  name: string;
  shortName: string;
  subtitle: string;
  description: string;
  imageSrc: string;
  thumbnailAlt: string;
  illustrationPrompt: string;
  priceUnitLabel: string;
  ctaLabel: string;
};

export type DimensionedCategory = BaseCategory & {
  kind: "dimensioned";
  dimensionLabel: string;
  lengthLabel: string;
  priceMap: Record<string, Record<string, number>>;
  getDimensionOptions: () => SelectOption[];
  getLengthOptions: (dimension: string) => SelectOption[];
  getCartTitle: (dimension: string, length: string) => string;
  getCartDetails: (dimension: string, length: string) => string[];
};

export type LengthOnlyCategory = BaseCategory & {
  kind: "length-only";
  fixedDimensionLabel: string;
  lengthLabel: string;
  priceByLength: Record<string, number>;
  getLengthOptions: () => SelectOption[];
  getCartTitle: (length: string) => string;
  getCartDetails: (length: string) => string[];
};

export type OptionOnlyCategory = BaseCategory & {
  kind: "option-only";
  optionLabel: string;
  priceByOption: Record<string, number>;
  getOptionOptions: () => SelectOption[];
  getCartTitle: (option: string) => string;
  getCartDetails: (option: string) => string[];
};

export type ProductCategory = DimensionedCategory | LengthOnlyCategory | OptionOnlyCategory;

const TIMBER_SECTION = {
  id: "rezivo",
  anchorId: "kategorie",
  title: "Vyberte si druh řeziva",
  description:
    "Otevřete detail produktu, nastavte rozměr i množství a během chvilky máte jasno v ceně.",
} as const;

const FUEL_SECTION = {
  id: "paliva",
  anchorId: "paliva",
  title: "Paliva",
  description:
    "Stejně přehledně si nakonfigurujete i palivové dřevo, pelety nebo krajinky pro topení a rychlý odvoz.",
} as const;

function cmDimensionLabel(value: string) {
  return value.replace("x", " × ") + " cm";
}

function lengthCmLabel(value: string) {
  return `${value} cm`;
}

function lengthMetersLabel(value: string) {
  return `${Number(value) / 1000} m`;
}

const tramy: DimensionedCategory = {
  id: "tramy",
  sectionId: TIMBER_SECTION.id,
  sectionTitle: TIMBER_SECTION.title,
  sectionAnchorId: TIMBER_SECTION.anchorId,
  kind: "dimensioned",
  name: "Stavební trámy",
  shortName: "Trámy",
  subtitle: "Masivní nosné profily pro krovy, stropy i pergoly.",
  description:
    "Klasické stavební trámy skladem v nejžádanějších profilech. Vyberte profil, délku a množství, orientační cena se přepočítá okamžitě.",
  imageSrc: "/images/tramy-dipi.webp",
  thumbnailAlt: "Ilustrace stavebních trámů DIPISTAV",
  illustrationPrompt:
    "Premium, clean, minimalist hand-drawn illustration of stacked structural timber beams, warm natural spruce tones, subtle pencil outlines, soft shadows, transparent background, product-card friendly composition.",
  priceUnitLabel: "Cena / ks",
  ctaLabel: "Přidat trámy do košíku",
  dimensionLabel: "Profil (cm)",
  lengthLabel: "Délka (cm)",
  priceMap: {
    "8x8": { "400": 272, "500": 290 },
    "10x10": { "400": 450, "500": 473 },
    "12x12": { "400": 612, "500": 739 },
    "14x14": { "400": 741, "500": 926 },
    "16x16": { "400": 1087, "500": 1313 },
    "20x20": { "400": 1512, "500": 1890 },
  },
  getDimensionOptions: () =>
    Object.keys(tramy.priceMap).map((value) => ({ value, label: cmDimensionLabel(value) })),
  getLengthOptions: (dimension) =>
    Object.keys(tramy.priceMap[dimension] ?? {}).map((value) => ({
      value,
      label: lengthCmLabel(value),
    })),
  getCartTitle: (dimension, length) => `Trám ${dimension.replace("x", "×")} × ${length} cm`,
  getCartDetails: (dimension, length) => [
    `Profil: ${cmDimensionLabel(dimension)}`,
    `Délka: ${lengthCmLabel(length)}`,
  ],
};

const fosny: DimensionedCategory = {
  id: "fosny",
  sectionId: TIMBER_SECTION.id,
  sectionTitle: TIMBER_SECTION.title,
  sectionAnchorId: TIMBER_SECTION.anchorId,
  kind: "dimensioned",
  name: "Stavební fošny",
  shortName: "Fošny",
  subtitle: "Široké stavební fošny pro bednění i konstrukční detaily.",
  description:
    "Fošny držíme v několika profilech a délkách pro rychlé objednání. Na stránce si rovnou nastavíte konfiguraci a počet kusů.",
  imageSrc: "/images/fosny-dipi.webp",
  thumbnailAlt: "Ilustrace stavebních fošen DIPISTAV",
  illustrationPrompt:
    "Premium, clean, minimalist hand-drawn illustration of broad timber planks for construction, natural pine color palette, precise ink contour, transparent background, airy premium composition.",
  priceUnitLabel: "Cena / ks",
  ctaLabel: "Přidat fošny do košíku",
  dimensionLabel: "Profil (cm)",
  lengthLabel: "Délka (cm)",
  priceMap: {
    "4x14": { "400": 230 },
    "4x16": { "400": 263, "500": 329 },
    "4x20": { "400": 329, "500": 410 },
    "5x10": { "400": 212, "500": 201 },
    "5x12": { "400": 247, "500": 240 },
    "5x16": { "400": 290, "500": 362 },
    "5x20": { "400": 378, "500": 453 },
  },
  getDimensionOptions: () =>
    Object.keys(fosny.priceMap).map((value) => ({ value, label: cmDimensionLabel(value) })),
  getLengthOptions: (dimension) =>
    Object.keys(fosny.priceMap[dimension] ?? {}).map((value) => ({
      value,
      label: lengthCmLabel(value),
    })),
  getCartTitle: (dimension, length) => `Fošna ${dimension.replace("x", "×")} × ${length} cm`,
  getCartDetails: (dimension, length) => [
    `Profil: ${cmDimensionLabel(dimension)}`,
    `Délka: ${lengthCmLabel(length)}`,
  ],
};

const prkna: DimensionedCategory = {
  id: "prkna",
  sectionId: TIMBER_SECTION.id,
  sectionTitle: TIMBER_SECTION.title,
  sectionAnchorId: TIMBER_SECTION.anchorId,
  kind: "dimensioned",
  name: "Stavební prkna",
  shortName: "Prkna",
  subtitle: "Coulová prkna v oblíbených šířkách pro střechy i obklady.",
  description:
    "Stavební prkna objednáte podle šířky, délky a počtu kusů. Přehledný kalkulátor na stránce hned ukáže cenu celé sestavy.",
  imageSrc: "/images/prkna-dipi.webp",
  thumbnailAlt: "Ilustrace stavebních prken DIPISTAV",
  illustrationPrompt:
    "Premium, clean, minimalist hand-drawn illustration of construction boards arranged in a neat stack, light spruce color, gentle sketch texture, transparent background, refined custom illustration style.",
  priceUnitLabel: "Cena / ks",
  ctaLabel: "Přidat prkna do košíku",
  dimensionLabel: "Šířka (cm)",
  lengthLabel: "Délka (cm)",
  priceMap: {
    "8": { "300": 49.5, "400": 64.8, "500": 82.8 },
    "10": { "300": 63.9, "400": 85.5, "500": 107.1 },
    "12": { "300": 74.7, "400": 102.6, "500": 124.2 },
    "14": { "300": 90.0, "400": 119.7, "500": 138.6 },
  },
  getDimensionOptions: () =>
    Object.keys(prkna.priceMap).map((value) => ({ value, label: `${value} cm` })),
  getLengthOptions: (dimension) =>
    Object.keys(prkna.priceMap[dimension] ?? {}).map((value) => ({
      value,
      label: lengthCmLabel(value),
    })),
  getCartTitle: (dimension, length) => `Prkno ${dimension} × ${length} cm`,
  getCartDetails: (dimension, length) => [
    `Šířka: ${dimension} cm`,
    `Délka: ${lengthCmLabel(length)}`,
  ],
};

const late: LengthOnlyCategory = {
  id: "late",
  sectionId: TIMBER_SECTION.id,
  sectionTitle: TIMBER_SECTION.title,
  sectionAnchorId: TIMBER_SECTION.anchorId,
  kind: "length-only",
  name: "Střešní latě",
  shortName: "Latě",
  subtitle: "Profil 60 × 40 mm pro střechy, podbití i lehké konstrukce.",
  description:
    "Střešní latě držíme v pevném profilu 60 × 40 mm. Zvolte délku, nastavte množství a vizualizace vám ukáže výslednou sestavu.",
  imageSrc: "/images/late-dipi.webp",
  thumbnailAlt: "Ilustrace střešních latí DIPISTAV",
  illustrationPrompt:
    "Premium, clean, minimalist hand-drawn illustration of roofing battens, tidy linear arrangement, warm wood palette, transparent background, subtle handcrafted premium finish.",
  priceUnitLabel: "Cena / ks",
  ctaLabel: "Přidat latě do košíku",
  fixedDimensionLabel: "60 × 40 mm",
  lengthLabel: "Délka",
  priceByLength: { "3000": 57, "4000": 76, "5000": 95 },
  getLengthOptions: () =>
    Object.keys(late.priceByLength).map((value) => ({ value, label: lengthMetersLabel(value) })),
  getCartTitle: (length) => `Lať 60 × 40 mm / ${lengthMetersLabel(length)}`,
  getCartDetails: (length) => [`Profil: 60 × 40 mm`, `Délka: ${lengthMetersLabel(length)}`],
};

const stipaneDrevo: OptionOnlyCategory = {
  id: "stipane-drevo",
  sectionId: FUEL_SECTION.id,
  sectionTitle: FUEL_SECTION.title,
  sectionAnchorId: FUEL_SECTION.anchorId,
  kind: "option-only",
  name: "Štípané dřevo",
  shortName: "Štípané dřevo",
  subtitle: "Suché palivové dřevo připravené k okamžitému topení doma i na chatě.",
  description:
    "Vyberte si balení štípaného dřeva podle způsobu skladování a frekvence topení. Přehledný konfigurátor ukáže orientační cenu a položku rovnou přidáte do košíku nebo poptávky.",
  imageSrc: "/images/paliva/stipane-drevo.svg",
  thumbnailAlt: "Minimalistická ilustrace štípaného dřeva",
  illustrationPrompt:
    "Premium, clean, minimalist hand-drawn illustration of split firewood logs tied in a neat bundle, natural oak and spruce tones, transparent background, subtle pencil linework, refined handcrafted feel.",
  priceUnitLabel: "Cena / balení",
  ctaLabel: "Přidat dřevo do košíku",
  optionLabel: "Balení",
  priceByOption: {
    "volne-1prm": 1490,
    "big-bag-1prm": 1690,
    "paleta-16prm": 2490,
  },
  getOptionOptions: () => [
    { value: "volne-1prm", label: "Volně ložené 1 prm" },
    { value: "big-bag-1prm", label: "Big bag 1 prm" },
    { value: "paleta-16prm", label: "Paleta 1,6 prm" },
  ],
  getCartTitle: (option) => {
    const label =
      stipaneDrevo.getOptionOptions().find((item) => item.value === option)?.label ?? option;
    return `Štípané dřevo / ${label}`;
  },
  getCartDetails: (option) => {
    const label =
      stipaneDrevo.getOptionOptions().find((item) => item.value === option)?.label ?? option;
    return [`Balení: ${label}`, "Dřevina: směs tvrdého dřeva"];
  },
};

const pelety: OptionOnlyCategory = {
  id: "pelety",
  sectionId: FUEL_SECTION.id,
  sectionTitle: FUEL_SECTION.title,
  sectionAnchorId: FUEL_SECTION.anchorId,
  kind: "option-only",
  name: "Pelety",
  shortName: "Pelety",
  subtitle: "Čisté dřevní pelety s pohodlným dávkováním pro kamna i kotle.",
  description:
    "Pelety nabízíme v několika praktických baleních od testovacího množství až po celou paletu. Vyberte variantu, počet balení a hned vidíte orientační cenu nákupu.",
  imageSrc: "/images/paliva/pelety.svg",
  thumbnailAlt: "Minimalistická ilustrace pelet",
  illustrationPrompt:
    "Premium, clean, minimalist hand-drawn illustration of a pellet bag with scattered wood pellets, warm beige and timber palette, transparent background, elegant sketched premium packaging style.",
  priceUnitLabel: "Cena / balení",
  ctaLabel: "Přidat pelety do košíku",
  optionLabel: "Balení",
  priceByOption: {
    "pytel-15kg": 129,
    "set-10-pytlu": 1190,
    "paleta-975kg": 7490,
  },
  getOptionOptions: () => [
    { value: "pytel-15kg", label: "Pytel 15 kg" },
    { value: "set-10-pytlu", label: "Set 10 pytlů" },
    { value: "paleta-975kg", label: "Paleta 975 kg" },
  ],
  getCartTitle: (option) => {
    const label = pelety.getOptionOptions().find((item) => item.value === option)?.label ?? option;
    return `Pelety / ${label}`;
  },
  getCartDetails: (option) => {
    const label = pelety.getOptionOptions().find((item) => item.value === option)?.label ?? option;
    return [`Balení: ${label}`, "Kvalita: čisté smrkové pelety"];
  },
};

const krajinky: OptionOnlyCategory = {
  id: "krajinky",
  sectionId: FUEL_SECTION.id,
  sectionTitle: FUEL_SECTION.title,
  sectionAnchorId: FUEL_SECTION.anchorId,
  kind: "option-only",
  name: "Krajinky",
  shortName: "Krajinky",
  subtitle: "Úsporné palivo z omítaných boků kulatiny vhodné na topení i rychlou zásobu.",
  description:
    "Krajinky jsou oblíbené tam, kde chcete výhodný zdroj dřeva na roztápění nebo průběžné vytápění. Zvolte velikost balíku a počet kusů podle prostoru i spotřeby.",
  imageSrc: "/images/paliva/krajinky.svg",
  thumbnailAlt: "Minimalistická ilustrace krajiniek",
  illustrationPrompt:
    "Premium, clean, minimalist hand-drawn illustration of rustic wood slabs and edgings stacked asymmetrically, warm wood colors, transparent background, tasteful artisanal linework.",
  priceUnitLabel: "Cena / balík",
  ctaLabel: "Přidat krajinky do košíku",
  optionLabel: "Velikost balíku",
  priceByOption: {
    "balik-2m": 890,
    "balik-3m": 1190,
    "balik-4m": 1490,
  },
  getOptionOptions: () => [
    { value: "balik-2m", label: "Balík 2 m" },
    { value: "balik-3m", label: "Balík 3 m" },
    { value: "balik-4m", label: "Balík 4 m" },
  ],
  getCartTitle: (option) => {
    const label =
      krajinky.getOptionOptions().find((item) => item.value === option)?.label ?? option;
    return `Krajinky / ${label}`;
  },
  getCartDetails: (option) => {
    const label =
      krajinky.getOptionOptions().find((item) => item.value === option)?.label ?? option;
    return [`Balík: ${label}`, "Využití: topení, zátop i hospodářské provozy"];
  },
};

const driviNaPaletach: OptionOnlyCategory = {
  id: "drivi-na-paletach",
  sectionId: FUEL_SECTION.id,
  sectionTitle: FUEL_SECTION.title,
  sectionAnchorId: FUEL_SECTION.anchorId,
  kind: "option-only",
  name: "Dříví na paletách",
  shortName: "Dříví na paletách",
  subtitle: "Přehledně složené palety palivového dřeva pro čisté skladování a snadný rozvoz.",
  description:
    "Paletované dříví je ideální pro domácnosti, které chtějí snadné uskladnění bez přehazování. Vyberte variantu podle délky polen nebo objemu a přidejte potřebný počet palet.",
  imageSrc: "/images/paliva/drivi-na-paletach.svg",
  thumbnailAlt: "Minimalistická ilustrace paletovaného dříví",
  illustrationPrompt:
    "Premium, clean, minimalist hand-drawn illustration of palletized firewood, tidy stacked logs on a wooden pallet, transparent background, subtle luxury sketch aesthetic with soft natural shadows.",
  priceUnitLabel: "Cena / paleta",
  ctaLabel: "Přidat paletu do košíku",
  optionLabel: "Typ palety",
  priceByOption: {
    "paleta-33cm": 2190,
    "paleta-25cm": 2290,
    "paleta-16prm": 3190,
  },
  getOptionOptions: () => [
    { value: "paleta-33cm", label: "Paleta 33 cm / 1 prm" },
    { value: "paleta-25cm", label: "Paleta 25 cm / 1 prm" },
    { value: "paleta-16prm", label: "Paleta 1,6 prm" },
  ],
  getCartTitle: (option) => {
    const label =
      driviNaPaletach.getOptionOptions().find((item) => item.value === option)?.label ?? option;
    return `Dříví na paletách / ${label}`;
  },
  getCartDetails: (option) => {
    const label =
      driviNaPaletach.getOptionOptions().find((item) => item.value === option)?.label ?? option;
    return [`Typ palety: ${label}`, "Doručení: vhodné pro rozvoz s hydraulickou rukou"];
  },
};

export const PRODUCT_CATEGORY_SECTIONS: ProductCategorySection[] = [
  {
    ...TIMBER_SECTION,
    categories: [tramy, fosny, prkna, late],
  },
  {
    ...FUEL_SECTION,
    categories: [stipaneDrevo, pelety, krajinky, driviNaPaletach],
  },
];

export const PRODUCT_CATEGORIES: ProductCategory[] = PRODUCT_CATEGORY_SECTIONS.flatMap(
  (section) => section.categories,
);

export function getProductCategory(categoryId: string) {
  return PRODUCT_CATEGORIES.find((category) => category.id === categoryId);
}
