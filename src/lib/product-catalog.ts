import type { Availability, PriceDefinition, VariantDimensions } from "@/lib/pricing";

export type SelectOption = {
  value: string;
  label: string;
  availability: Availability;
};

export type ProductSelector = {
  key: string;
  label: string;
};

export type ProductMode = {
  id: string;
  label: string;
};

export type ProductVariant = {
  id: string;
  modeId?: string;
  selection: Record<string, string>;
  dimensions?: VariantDimensions;
  availability: Availability;
  pricing: PriceDefinition | null;
  illustrationVariant: string;
};

export type ProductCategory = {
  id: string;
  sectionId: string;
  sectionTitle: string;
  sectionAnchorId: string;
  title: string;
  name: string;
  shortName: string;
  subtitle: string;
  description: string;
  imageSrc: string;
  thumbnailAlt: string;
  illustrationPrompt: string;
  ctaLabel: string;
  quantityLabel: string;
  quantityUnitLabel: string;
  selectors: ProductSelector[];
  selectionLabels: Record<string, Record<string, string>>;
  modes?: ProductMode[];
  variants: ProductVariant[];
};

export type ProductCategorySection = {
  id: string;
  anchorId: string;
  title: string;
  description: string;
  categories: ProductCategory[];
};

const TIMBER_SECTION = {
  id: "rezivo",
  anchorId: "kategorie",
  title: "Řezivo",
  description:
    "Vyberte si přesně takové řezivo, jaké vaše stavba potřebuje, a přehledně porovnejte vhodné varianty.",
} as const;

const FUEL_SECTION = {
  id: "paliva",
  anchorId: "paliva",
  title: "Paliva",
  description:
    "Praktická paliva pro domů, na chalupu i do provozu. Vyberte si balení, které se vám bude dobře skladovat i používat.",
} as const;

const piecePrice = (
  rate: number,
  displayUnit: Extract<PriceDefinition, { basis: "piece" }>["displayUnit"] = "ks",
): PriceDefinition => ({ basis: "piece", rate, displayUnit });

const linearMeterPrice = (rate: number): PriceDefinition => ({
  basis: "linear-meter",
  rate,
  displayUnit: "bm",
});

const cubicMeterPrice = (rate: number): PriceDefinition => ({
  basis: "cubic-meter",
  rate,
  displayUnit: "m³",
});

function pricedVariant(
  id: string,
  selection: Record<string, string>,
  pricing: PriceDefinition,
  dimensions: VariantDimensions | undefined,
  illustrationVariant: string,
  modeId?: string,
): ProductVariant {
  return {
    id,
    modeId,
    selection,
    dimensions,
    availability: "in-stock",
    pricing,
    illustrationVariant,
  };
}

function unavailableVariant(
  id: string,
  selection: Record<string, string>,
  dimensions: VariantDimensions,
  illustrationVariant: string,
  modeId?: string,
): ProductVariant {
  return {
    id,
    modeId,
    selection,
    dimensions,
    availability: "out-of-stock",
    pricing: null,
    illustrationVariant,
  };
}

const beamPriceMap: Record<string, Record<string, number>> = {
  "8x8": { "400": 302, "500": 322 },
  "8x10": { "400": 322, "500": 402 },
  "8x12": { "400": 453 },
  "8x14": { "400": 511, "500": 661 },
  "8x16": { "400": 604, "500": 755, "600": 960, "700": 1048 },
  "8x20": { "400": 819, "500": 840 },
  "10x10": { "400": 500, "500": 525, "600": 678 },
  "10x12": { "400": 566, "500": 708 },
  "10x14": { "400": 661, "500": 826, "600": 1025 },
  "10x16": { "400": 755, "500": 944, "600": 1200, "700": 1568 },
  "10x18": { "400": 850, "500": 1062, "600": 1177, "700": 1714 },
  "10x20": { "400": 912, "500": 1050, "600": 1680 },
  "12x12": { "400": 680, "500": 821 },
  "12x14": { "400": 598, "500": 806, "600": 1189 },
  "12x16": { "400": 906, "500": 1133, "600": 1544 },
  "12x18": { "400": 769, "500": 1318, "600": 1529 },
  "14x14": { "400": 823, "500": 1029, "600": 1352 },
  "14x16": { "400": 1093, "500": 1389, "600": 1693 },
  "16x16": { "400": 1208, "500": 1459, "600": 2058 },
  "16x18": { "400": 1025, "500": 1637 },
  "16x20": { "400": 1600, "500": 1888, "600": 2419 },
  "20x20": { "400": 1680, "500": 2100 },
};

export const BEAM_PRICE_MAP = beamPriceMap;

const beamVariants = Object.entries(beamPriceMap).flatMap(([profile, prices]) => {
  const [widthCm, heightCm] = profile.split("x").map(Number);
  return Object.entries(prices).map(([lengthCm, price]) =>
    pricedVariant(
      `beam-${profile}-${lengthCm}`,
      { profile, length: lengthCm },
      piecePrice(price),
      { widthMm: widthCm * 10, heightMm: heightCm * 10, lengthMm: Number(lengthCm) * 10 },
      "beam",
    ),
  );
});

const tramy: ProductCategory = {
  id: "tramy",
  sectionId: TIMBER_SECTION.id,
  sectionTitle: TIMBER_SECTION.title,
  sectionAnchorId: TIMBER_SECTION.anchorId,
  title: "Stavební trámy",
  name: "Stavební trámy",
  shortName: "Trámy",
  subtitle: "Masivní nosné trámy pro krovy, stropy, pergoly i další konstrukce.",
  description:
    "Poctivé stavební trámy v osvědčených profilech a délkách. Snadno si vyberete variantu, která bude sedět vašemu projektu i způsobu montáže.",
  imageSrc: "/images/illustrations/golden-masters/beam-bundle-6-seams-master-v2.webp",
  thumbnailAlt: "Ilustrace stavebních trámů DIPISTAV",
  illustrationPrompt:
    "DIPISTAV comic-engraving product illustration of square structural timber beams in a neat isometric stack.",
  ctaLabel: "Přidat trámy do košíku",
  quantityLabel: "Počet kusů",
  quantityUnitLabel: "ks",
  selectors: [
    { key: "profile", label: "Profil (cm)" },
    { key: "length", label: "Délka (cm)" },
  ],
  selectionLabels: {
    profile: Object.fromEntries(
      Object.keys(beamPriceMap).map((value) => [value, value.replace("x", " × ") + " cm"]),
    ),
    length: { "400": "400 cm", "500": "500 cm", "600": "600 cm", "700": "700 cm" },
  },
  variants: beamVariants,
};

const fosny: ProductCategory = {
  id: "fosny",
  sectionId: TIMBER_SECTION.id,
  sectionTitle: TIMBER_SECTION.title,
  sectionAnchorId: TIMBER_SECTION.anchorId,
  title: "Stavební fošny",
  name: "Stavební fošny",
  shortName: "Fošny",
  subtitle: "Široké stavební fošny pro bednění, podlahy i konstrukční detaily.",
  description:
    "Masivní fošny pro stavbu i truhlářské využití. Skladová varianta má poctivý profil 4 × 14 cm a délku 4 metry.",
  imageSrc: "/images/illustrations/fosny-v2.webp",
  thumbnailAlt: "Ilustrace stavebních fošen DIPISTAV",
  illustrationPrompt: "DIPISTAV comic-engraving illustration of thick broad construction boards.",
  ctaLabel: "Přidat fošny do košíku",
  quantityLabel: "Počet kusů",
  quantityUnitLabel: "ks",
  selectors: [
    { key: "profile", label: "Profil (cm)" },
    { key: "length", label: "Délka (cm)" },
  ],
  selectionLabels: { profile: { "4x14": "4 × 14 cm" }, length: { "400": "400 cm" } },
  variants: [
    pricedVariant(
      "plank-4x14-400",
      { profile: "4x14", length: "400" },
      piecePrice(255),
      { thicknessMm: 40, widthMm: 140, lengthMm: 4000 },
      "plank",
    ),
  ],
};

const sortedBoardPrices: Record<string, Record<string, number>> = {
  "8": { "400": 72, "500": 92 },
  "10": { "400": 95, "500": 119 },
  "12": { "400": 114, "500": 138 },
  "14": { "400": 133, "500": 154 },
  "16": { "400": 152, "500": 194 },
  "20": { "400": 190, "500": 243 },
};

const sortedBoardVariants = Object.entries(sortedBoardPrices).flatMap(([widthCm, prices]) =>
  Object.entries(prices).map(([lengthCm, price]) =>
    pricedVariant(
      `board-sorted-${widthCm}-${lengthCm}`,
      { width: widthCm, length: lengthCm },
      piecePrice(price),
      { thicknessMm: 25, widthMm: Number(widthCm) * 10, lengthMm: Number(lengthCm) * 10 },
      "board-sorted",
      "sorted",
    ),
  ),
);

sortedBoardVariants.splice(
  10,
  0,
  unavailableVariant(
    "board-sorted-18-400",
    { width: "18", length: "400" },
    { thicknessMm: 25, widthMm: 180, lengthMm: 4000 },
    "board-sorted",
    "sorted",
  ),
);

const unsortedBoardVariants = ["8", "10", "12", "14", "16", "18", "20"].flatMap((widthCm) =>
  ["400", "500"].map((lengthCm) =>
    pricedVariant(
      `board-unsorted-${widthCm}-${lengthCm}`,
      { width: widthCm, length: lengthCm },
      cubicMeterPrice(Number(widthCm) >= 16 ? 8900 : 7200),
      { thicknessMm: 25, widthMm: Number(widthCm) * 10, lengthMm: Number(lengthCm) * 10 },
      Number(widthCm) >= 16 ? "board-unsorted-wide" : "board-unsorted",
      "unsorted",
    ),
  ),
);

const prkna: ProductCategory = {
  id: "prkna",
  sectionId: TIMBER_SECTION.id,
  sectionTitle: TIMBER_SECTION.title,
  sectionAnchorId: TIMBER_SECTION.anchorId,
  title: "Stavební prkna",
  name: "Stavební prkna",
  shortName: "Prkna",
  subtitle: "Tříděná i netříděná coulová prkna pro střechy, obklady a běžnou stavbu.",
  description:
    "Vyberte si přesná tříděná prkna s cenou za kus nebo surovější netříděná prkna účtovaná podle skutečného objemu.",
  imageSrc: "/images/illustrations/prkna-v2.webp",
  thumbnailAlt: "Ilustrace stavebních prken DIPISTAV",
  illustrationPrompt: "DIPISTAV comic-engraving illustration of thin construction boards.",
  ctaLabel: "Přidat prkna do košíku",
  quantityLabel: "Počet kusů",
  quantityUnitLabel: "ks",
  modes: [
    { id: "sorted", label: "Tříděná prkna" },
    { id: "unsorted", label: "Netříděná prkna" },
  ],
  selectors: [
    { key: "width", label: "Šířka (cm)" },
    { key: "length", label: "Délka (cm)" },
  ],
  selectionLabels: {
    width: Object.fromEntries(
      ["8", "10", "12", "14", "16", "18", "20"].map((value) => [value, `${value} cm`]),
    ),
    length: { "400": "400 cm", "500": "500 cm" },
  },
  variants: [...sortedBoardVariants, ...unsortedBoardVariants],
};

const lathProfiles: Record<string, number> = { "60x40": 22, "50x30": 16, "50x40": 19 };
const lathVariants = Object.entries(lathProfiles).flatMap(([profile, rate]) => {
  const [widthMm, heightMm] = profile.split("x").map(Number);
  return ["4000", "5000"].map((lengthMm) =>
    pricedVariant(
      `lath-${profile}-${lengthMm}`,
      { profile, length: lengthMm },
      linearMeterPrice(rate),
      { widthMm, heightMm, lengthMm: Number(lengthMm) },
      "lath",
    ),
  );
});

const late: ProductCategory = {
  id: "late",
  sectionId: TIMBER_SECTION.id,
  sectionTitle: TIMBER_SECTION.title,
  sectionAnchorId: TIMBER_SECTION.anchorId,
  title: "Střešní latě",
  name: "Střešní latě",
  shortName: "Latě",
  subtitle: "Tři skladové profily v délkách 4 a 5 metrů, účtované za běžný metr.",
  description:
    "Střešní latě pro spolehlivou montáž střech, podbití i lehkých konstrukcí. Cena se automaticky počítá z délky a počtu kusů.",
  imageSrc: "/images/illustrations/late-v2.webp",
  thumbnailAlt: "Ilustrace střešních latí DIPISTAV",
  illustrationPrompt: "DIPISTAV comic-engraving illustration of rectangular roofing battens.",
  ctaLabel: "Přidat latě do košíku",
  quantityLabel: "Počet kusů",
  quantityUnitLabel: "ks",
  selectors: [
    { key: "profile", label: "Profil (mm)" },
    { key: "length", label: "Délka" },
  ],
  selectionLabels: {
    profile: { "60x40": "60 × 40 mm", "50x30": "50 × 30 mm", "50x40": "50 × 40 mm" },
    length: { "4000": "4 m", "5000": "5 m" },
  },
  variants: lathVariants,
};

function optionCategory(config: {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  imageSrc: string;
  thumbnailAlt: string;
  ctaLabel: string;
  quantityLabel: string;
  quantityUnitLabel: string;
  optionLabel: string;
  displayUnit: Extract<PriceDefinition, { basis: "piece" }>["displayUnit"];
  options: Array<{ value: string; label: string; price: number; illustrationVariant: string }>;
}): ProductCategory {
  return {
    ...config,
    sectionId: FUEL_SECTION.id,
    sectionTitle: FUEL_SECTION.title,
    sectionAnchorId: FUEL_SECTION.anchorId,
    title: config.name,
    shortName: config.name,
    illustrationPrompt: `DIPISTAV comic-engraving illustration of ${config.name}.`,
    selectors: [{ key: "option", label: config.optionLabel }],
    selectionLabels: {
      option: Object.fromEntries(config.options.map((option) => [option.value, option.label])),
    },
    variants: config.options.map((option) =>
      pricedVariant(
        `${config.id}-${option.value}`,
        { option: option.value },
        piecePrice(option.price, config.displayUnit),
        undefined,
        option.illustrationVariant,
      ),
    ),
  };
}

const stipaneDrevo = optionCategory({
  id: "stipane-drevo",
  name: "Štípané dřevo",
  subtitle: "Poctivě štípané palivové dřevo v balení podle vašich skladovacích možností.",
  description: "Vyberte si volně ložené dřevo, praktický big bag nebo úhledně složenou paletu.",
  imageSrc: "/images/illustrations/stipane-v2.webp",
  thumbnailAlt: "Ilustrace štípaného dřeva",
  ctaLabel: "Přidat dřevo do košíku",
  quantityLabel: "Počet balení",
  quantityUnitLabel: "balení",
  optionLabel: "Balení",
  displayUnit: "balení",
  options: [
    {
      value: "volne-1prm",
      label: "Volně ložené 1 prm",
      price: 1490,
      illustrationVariant: "firewood-loose",
    },
    {
      value: "big-bag-1prm",
      label: "Big bag 1 prm",
      price: 1690,
      illustrationVariant: "firewood-bag",
    },
    {
      value: "paleta-16prm",
      label: "Paleta 1,6 prm",
      price: 2490,
      illustrationVariant: "firewood-pallet",
    },
  ],
});

const pelety = optionCategory({
  id: "pelety",
  name: "Pelety",
  subtitle: "Čisté dřevní pelety od jednoho pytle až po celou paletu.",
  description:
    "Vyberte si samostatný pytel, výhodný set deseti pytlů nebo paletu pro celou topnou sezónu.",
  imageSrc: "/images/illustrations/pelety-v2.webp",
  thumbnailAlt: "Ilustrace dřevních pelet",
  ctaLabel: "Přidat pelety do košíku",
  quantityLabel: "Počet balení",
  quantityUnitLabel: "balení",
  optionLabel: "Balení",
  displayUnit: "balení",
  options: [
    { value: "pytel-15kg", label: "Pytel 15 kg", price: 129, illustrationVariant: "pellets-bag" },
    {
      value: "set-10-pytlu",
      label: "Set 10 pytlů",
      price: 1190,
      illustrationVariant: "pellets-set",
    },
    {
      value: "paleta-975kg",
      label: "Paleta 975 kg",
      price: 7490,
      illustrationVariant: "pellets-pallet",
    },
  ],
});

const krajinky = optionCategory({
  id: "krajinky",
  name: "Krajinky",
  subtitle: "Svázané balíky nepravidelných krajinek v délkách 2, 3 a 4 metry.",
  description: "Úsporné palivo z omítaných boků kulatiny pro topení, zátop i hospodářské provozy.",
  imageSrc: "/images/illustrations/krajinky-v2.webp",
  thumbnailAlt: "Ilustrace svázaného balíku krajinek",
  ctaLabel: "Přidat krajinky do košíku",
  quantityLabel: "Počet balíků",
  quantityUnitLabel: "balíků",
  optionLabel: "Velikost balíku",
  displayUnit: "balík",
  options: [
    { value: "balik-2m", label: "Balík 2 m", price: 890, illustrationVariant: "slabs-2m" },
    { value: "balik-3m", label: "Balík 3 m", price: 1190, illustrationVariant: "slabs-3m" },
    { value: "balik-4m", label: "Balík 4 m", price: 1490, illustrationVariant: "slabs-4m" },
  ],
});

const driviNaPaletach = optionCategory({
  id: "drivi-na-paletach",
  name: "Dříví na paletách",
  subtitle: "Přehledně složené palety palivového dřeva pro čisté skladování.",
  description: "Vyberte délku polen nebo větší paletu 1,6 prm podle prostoru a očekávané spotřeby.",
  imageSrc: "/images/illustrations/palety-v2.webp",
  thumbnailAlt: "Ilustrace paletovaného dříví",
  ctaLabel: "Přidat paletu do košíku",
  quantityLabel: "Počet palet",
  quantityUnitLabel: "palet",
  optionLabel: "Typ palety",
  displayUnit: "paleta",
  options: [
    {
      value: "paleta-33cm",
      label: "Paleta 33 cm / 1 prm",
      price: 2190,
      illustrationVariant: "pallet-33",
    },
    {
      value: "paleta-25cm",
      label: "Paleta 25 cm / 1 prm",
      price: 2290,
      illustrationVariant: "pallet-25",
    },
    {
      value: "paleta-16prm",
      label: "Paleta 1,6 prm",
      price: 3190,
      illustrationVariant: "pallet-16",
    },
  ],
});

export const PRODUCT_CATEGORY_SECTIONS: ProductCategorySection[] = [
  { ...TIMBER_SECTION, categories: [tramy, fosny, prkna, late] },
  { ...FUEL_SECTION, categories: [stipaneDrevo, pelety, krajinky, driviNaPaletach] },
];

export const PRODUCT_CATEGORIES = PRODUCT_CATEGORY_SECTIONS.flatMap(
  (section) => section.categories,
);

export function getProductCategory(categoryId: string) {
  return PRODUCT_CATEGORIES.find((category) => category.id === categoryId);
}

export function getDefaultModeId(category: ProductCategory) {
  return category.modes?.[0]?.id;
}

export function getVariantsForMode(category: ProductCategory, modeId?: string) {
  return category.variants.filter((variant) => !category.modes || variant.modeId === modeId);
}

export function getSelectionOptions(
  category: ProductCategory,
  selectorKey: string,
  modeId: string | undefined,
  selection: Record<string, string>,
): SelectOption[] {
  const selectorIndex = category.selectors.findIndex((selector) => selector.key === selectorKey);
  const previousSelectors = category.selectors.slice(0, Math.max(selectorIndex, 0));
  const candidates = getVariantsForMode(category, modeId).filter((variant) =>
    previousSelectors.every(
      (selector) =>
        !selection[selector.key] || variant.selection[selector.key] === selection[selector.key],
    ),
  );
  const values = [...new Set(candidates.map((variant) => variant.selection[selectorKey]))];

  return values.map((value) => {
    const matchingVariants = candidates.filter(
      (variant) => variant.selection[selectorKey] === value,
    );
    const availability = matchingVariants.some((variant) => variant.availability === "in-stock")
      ? "in-stock"
      : "out-of-stock";
    const baseLabel = category.selectionLabels[selectorKey]?.[value] ?? value;
    return {
      value,
      availability,
      label: availability === "out-of-stock" ? `${baseLabel} — nedostupné` : baseLabel,
    };
  });
}

export function normalizeSelection(
  category: ProductCategory,
  modeId: string | undefined,
  requested: Record<string, string> = {},
) {
  const normalized: Record<string, string> = {};

  for (const selector of category.selectors) {
    const options = getSelectionOptions(category, selector.key, modeId, normalized);
    const requestedValue = requested[selector.key];
    const requestedOption = options.find((option) => option.value === requestedValue);
    normalized[selector.key] =
      requestedOption?.availability === "in-stock"
        ? requestedValue
        : (options.find((option) => option.availability === "in-stock")?.value ??
          options[0]?.value ??
          "");
  }

  return normalized;
}

export function resolveProductVariant(
  category: ProductCategory,
  modeId: string | undefined,
  selection: Record<string, string>,
) {
  return getVariantsForMode(category, modeId).find((variant) =>
    category.selectors.every(
      (selector) => variant.selection[selector.key] === selection[selector.key],
    ),
  );
}

export function getSelectionLabel(category: ProductCategory, key: string, value: string) {
  return category.selectionLabels[key]?.[value] ?? value;
}

export function getVariantTitle(category: ProductCategory, variant: ProductVariant) {
  if (category.id === "tramy") {
    return `Trám ${getSelectionLabel(category, "profile", variant.selection.profile)} × ${variant.selection.length} cm`;
  }
  if (category.id === "fosny") {
    return `Fošna ${getSelectionLabel(category, "profile", variant.selection.profile)} × ${variant.selection.length} cm`;
  }
  if (category.id === "late") {
    return `Lať ${getSelectionLabel(category, "profile", variant.selection.profile)} / ${getSelectionLabel(category, "length", variant.selection.length)}`;
  }
  if (category.id === "prkna") {
    const modeLabel = category.modes?.find((mode) => mode.id === variant.modeId)?.label ?? "Prkna";
    return `${modeLabel} ${variant.selection.width} × ${variant.selection.length} cm`;
  }
  return `${category.name} / ${getSelectionLabel(category, "option", variant.selection.option)}`;
}

export function getVariantDetails(category: ProductCategory, variant: ProductVariant) {
  if (category.id === "tramy" || category.id === "fosny") {
    return [
      `Profil: ${getSelectionLabel(category, "profile", variant.selection.profile)}`,
      `Délka: ${getSelectionLabel(category, "length", variant.selection.length)}`,
    ];
  }
  if (category.id === "late") {
    return [
      `Profil: ${getSelectionLabel(category, "profile", variant.selection.profile)}`,
      `Délka: ${getSelectionLabel(category, "length", variant.selection.length)}`,
    ];
  }
  if (category.id === "prkna") {
    return [
      `Typ: ${category.modes?.find((mode) => mode.id === variant.modeId)?.label ?? "Prkna"}`,
      "Tloušťka: 25 mm",
      `Šířka: ${variant.selection.width} cm`,
      `Délka: ${variant.selection.length} cm`,
    ];
  }
  return [`Varianta: ${getSelectionLabel(category, "option", variant.selection.option)}`];
}

export function getBeamWidgetCatalog() {
  return {
    profiles: Object.keys(beamPriceMap).map((value) => ({
      value,
      label: value.replace("x", " × ") + " cm",
    })),
    lengths: ["400", "500", "600", "700"].map((value) => ({ value, label: `${value} cm` })),
    prices: beamPriceMap,
  };
}
