import type { Availability, PriceDefinition, VariantDimensions } from "@/lib/pricing";
import { VISUALIZATION_LIMITS } from "@/lib/visualization-limits";

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

export type QuantityPolicy = {
  min: number;
  max: number;
  step: number;
  sliderMax: number;
};

export type VolumeCalculation = {
  basis: "group-average-width";
  averageWidthMm: number;
  memberWidthsCm: readonly number[];
};

export type ProductVariant = {
  id: string;
  modeId?: string;
  selection: Record<string, string>;
  dimensions?: VariantDimensions;
  availability: Availability;
  pricing: PriceDefinition | null;
  illustrationVariant: string;
  volumeCalculation?: VolumeCalculation;
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
  quantityPolicy: QuantityPolicy;
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
    "Trámy, fošny, prkna a latě pro stavbu i další zpracování. Vyberte profil, délku a množství.",
} as const;

const FUEL_SECTION = {
  id: "paliva",
  anchorId: "paliva",
  title: "Paliva",
  description:
    "Palivové dřevo, pelety a krajinky pro dům, chalupu i provoz. Zvolte balení podle spotřeby a prostoru pro skladování.",
} as const;

const DEFAULT_QUANTITY_POLICY: QuantityPolicy = {
  min: 1,
  max: 500,
  step: 1,
  sliderMax: 20,
};

const PALLET_QUANTITY_POLICY: QuantityPolicy = {
  min: 1,
  max: 500,
  step: 1,
  sliderMax: 12,
};

const UNSORTED_VOLUME_QUANTITY_POLICY: QuantityPolicy = {
  min: 1,
  max: 20,
  step: 1,
  sliderMax: 10,
};

const PALLET_ILLUSTRATION_VARIANTS = new Set([
  "firewood-pallet",
  "pallet-16",
  "pallet-25",
  "pallet-33",
  "pallet-25-16",
  "pallet-33-16",
  "pellets-pallet",
]);

const piecePrice = (
  rate: number,
  displayUnit: Extract<PriceDefinition, { basis: "piece" }>["displayUnit"] = "ks",
): PriceDefinition => ({ basis: "piece", rate, displayUnit });

const linearMeterPrice = (rate: number): PriceDefinition => ({
  basis: "linear-meter",
  rate,
  displayUnit: "bm",
});

const cubicMeterPrice = (
  rate: number,
  quantityMode: Extract<PriceDefinition, { basis: "cubic-meter" }>["quantityMode"] = "pieces",
): PriceDefinition => ({
  basis: "cubic-meter",
  rate,
  displayUnit: "m³",
  quantityMode,
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
  subtitle: "Pro krovy, stropy a pergoly.",
  description: "Vyberte osvědčený profil a délku pro konstrukci, která dobře sedí a dlouho vydrží.",
  imageSrc: "/images/illustrations/homepage-v41/tramy-single.webp",
  thumbnailAlt: "Ilustrace stavebních trámů DIPISTAV",
  illustrationPrompt:
    "DIPISTAV comic-engraving product illustration of square structural timber beams in a neat isometric stack.",
  ctaLabel: "Přidat trámy do košíku",
  quantityLabel: "Počet kusů",
  quantityUnitLabel: "ks",
  quantityPolicy: DEFAULT_QUANTITY_POLICY,
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
  subtitle: "Pro bednění a pevné podlahy.",
  description:
    "Poctivý profil 4 × 14 cm a délka 4 metry jsou připravené pro stavbu i další zpracování.",
  imageSrc: "/images/illustrations/homepage-v41/fosny-single.webp",
  thumbnailAlt: "Ilustrace stavebních fošen DIPISTAV",
  illustrationPrompt: "DIPISTAV comic-engraving illustration of thick broad construction boards.",
  ctaLabel: "Přidat fošny do košíku",
  quantityLabel: "Počet kusů",
  quantityUnitLabel: "ks",
  quantityPolicy: DEFAULT_QUANTITY_POLICY,
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

export const UNSORTED_BOARD_GROUPS = [
  {
    id: "8-14",
    label: "8–14 cm (8, 10, 12, 14 cm)",
    memberWidthsCm: [8, 10, 12, 14],
    averageWidthMm: 110,
    ratePerM3: 7200,
    illustrationVariant: "board-unsorted-narrow",
  },
  {
    id: "16-20",
    label: "16–20 cm — ŠIROKÁ PRKNA (16, 18, 20 cm)",
    memberWidthsCm: [16, 18, 20],
    averageWidthMm: 180,
    ratePerM3: 8900,
    illustrationVariant: "board-unsorted-wide",
  },
] as const;

const unsortedBoardVariants = UNSORTED_BOARD_GROUPS.flatMap((group) =>
  ["400", "500"].map((lengthCm) => ({
    ...pricedVariant(
      `board-unsorted-${group.id}-${lengthCm}`,
      { width: group.id, length: lengthCm },
      cubicMeterPrice(group.ratePerM3, "volume"),
      { thicknessMm: 25, widthMm: group.averageWidthMm, lengthMm: Number(lengthCm) * 10 },
      group.illustrationVariant,
      "unsorted",
    ),
    volumeCalculation: {
      basis: "group-average-width" as const,
      averageWidthMm: group.averageWidthMm,
      memberWidthsCm: group.memberWidthsCm,
    },
  })),
);

const prkna: ProductCategory = {
  id: "prkna",
  sectionId: TIMBER_SECTION.id,
  sectionTitle: TIMBER_SECTION.title,
  sectionAnchorId: TIMBER_SECTION.anchorId,
  title: "Stavební prkna",
  name: "Stavební prkna",
  shortName: "Prkna",
  subtitle: "Pro střechy, obklady i stavbu.",
  description:
    "Zvolte tříděnou variantu pro přesnou práci nebo netříděná prkna pro univerzální využití.",
  imageSrc: "/images/illustrations/homepage-v41/prkna-single.webp",
  thumbnailAlt: "Ilustrace stavebních prken DIPISTAV",
  illustrationPrompt: "DIPISTAV comic-engraving illustration of thin construction boards.",
  ctaLabel: "Přidat prkna do košíku",
  quantityLabel: "Počet kusů",
  quantityUnitLabel: "ks",
  quantityPolicy: DEFAULT_QUANTITY_POLICY,
  modes: [
    { id: "sorted", label: "Tříděná prkna" },
    { id: "unsorted", label: "Netříděná prkna" },
  ],
  selectors: [
    { key: "width", label: "Šířka / skupina šířek" },
    { key: "length", label: "Délka (cm)" },
  ],
  selectionLabels: {
    width: Object.fromEntries([
      ...["8", "10", "12", "14", "16", "18", "20"].map((value) => [value, `${value} cm`] as const),
      ...UNSORTED_BOARD_GROUPS.map((group) => [group.id, group.label] as const),
    ]),
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
  subtitle: "Pro pevnou střechu a podbití.",
  description: "Skladové profily v délkách 4 a 5 metrů vám usnadní rychlou a jistou montáž.",
  imageSrc: "/images/illustrations/homepage-v41/late-single.webp",
  thumbnailAlt: "Ilustrace střešních latí DIPISTAV",
  illustrationPrompt: "DIPISTAV comic-engraving illustration of rectangular roofing battens.",
  ctaLabel: "Přidat latě do košíku",
  quantityLabel: "Počet kusů",
  quantityUnitLabel: "ks",
  quantityPolicy: DEFAULT_QUANTITY_POLICY,
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
    quantityPolicy: DEFAULT_QUANTITY_POLICY,
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
  subtitle: "Teplo pro domov i chalupu.",
  description:
    "Volně ložené, v big bagu nebo na paletě — zvolte balení, které vám nejlépe vyhovuje.",
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
  subtitle: "Čisté a spolehlivé vytápění.",
  description: "Pytel 15 kg, výhodný set nebo celá paleta pokryjí malou zásobu i topnou sezónu.",
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
  subtitle: "Výhodné dřevo na topení.",
  description:
    "Dřevěné odřezky z omítaných boků kulatiny jsou dostupnou zásobou paliva na topnou sezónu.",
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

const FIREWOOD_PALLET_PRICE_MATRIX = {
  "33-1": 2190,
  "33-1.6": 3190,
  "25-1": 2290,
  "25-1.6": 3290,
} as const;

export const FIREWOOD_PALLET_VARIANTS = [
  { logLength: "25", volume: "1", illustrationVariant: "pallet-25" },
  { logLength: "25", volume: "1.6", illustrationVariant: "pallet-25-16" },
  { logLength: "33", volume: "1", illustrationVariant: "pallet-33" },
  { logLength: "33", volume: "1.6", illustrationVariant: "pallet-33-16" },
] as const;

const driviNaPaletach: ProductCategory = {
  id: "drivi-na-paletach",
  sectionId: FUEL_SECTION.id,
  sectionTitle: FUEL_SECTION.title,
  sectionAnchorId: FUEL_SECTION.anchorId,
  title: "Dříví na paletách",
  name: "Dříví na paletách",
  shortName: "Dříví na paletách",
  subtitle: "Dřevo úhledně na paletě.",
  description: "Poctivě vyskládaná paleta usnadní manipulaci, uložení i průběžné doplňování dřeva.",
  imageSrc: "/images/illustrations/configurator-v30/firewood-pallet-33cm-1prm-final-v30.webp",
  thumbnailAlt: "Ilustrace paletovaného dříví",
  illustrationPrompt:
    "Isometric e-shop illustration of split hardwood stacked longitudinally in a wooden pallet crate.",
  ctaLabel: "Přidat paletu do košíku",
  quantityLabel: "Počet palet",
  quantityUnitLabel: "palet",
  quantityPolicy: PALLET_QUANTITY_POLICY,
  selectors: [
    { key: "logLength", label: "Délka polen" },
    { key: "volume", label: "Objem palety" },
  ],
  selectionLabels: {
    logLength: { "33": "33 cm", "25": "25 cm" },
    volume: { "1": "1 prm", "1.6": "1,6 prm" },
  },
  variants: FIREWOOD_PALLET_VARIANTS.map(({ logLength, volume, illustrationVariant }) =>
    pricedVariant(
      `pallet-${logLength}cm-${volume.replace(".", "-")}prm`,
      { logLength, volume },
      piecePrice(FIREWOOD_PALLET_PRICE_MATRIX[`${logLength}-${volume}`], "paleta"),
      undefined,
      illustrationVariant,
    ),
  ),
};

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

export function getEffectiveQuantityPolicy(category: ProductCategory, variant?: ProductVariant) {
  if (variant?.modeId === "unsorted") return UNSORTED_VOLUME_QUANTITY_POLICY;
  if (category.sectionId === TIMBER_SECTION.id) {
    return { ...category.quantityPolicy, sliderMax: 30 };
  }
  if (variant?.illustrationVariant.startsWith("slabs-")) {
    return { ...category.quantityPolicy, sliderMax: VISUALIZATION_LIMITS.slabs };
  }
  if (variant?.illustrationVariant === "firewood-bag" || variant?.illustrationVariant === "firewood-loose") {
    return { ...category.quantityPolicy, sliderMax: VISUALIZATION_LIMITS.firewood };
  }
  return variant && PALLET_ILLUSTRATION_VARIANTS.has(variant.illustrationVariant)
    ? PALLET_QUANTITY_POLICY
    : category.quantityPolicy;
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
    return `${modeLabel} ${getSelectionLabel(category, "width", variant.selection.width)} × ${getSelectionLabel(category, "length", variant.selection.length)}`;
  }
  if (category.id === "drivi-na-paletach") {
    return `${category.name} / ${getSelectionLabel(category, "logLength", variant.selection.logLength)} / ${getSelectionLabel(category, "volume", variant.selection.volume)}`;
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
    const details = [
      `Typ: ${category.modes?.find((mode) => mode.id === variant.modeId)?.label ?? "Prkna"}`,
      "Tloušťka: 25 mm",
      `Šířka: ${getSelectionLabel(category, "width", variant.selection.width)}`,
      `Délka: ${getSelectionLabel(category, "length", variant.selection.length)}`,
    ];
    if (variant.volumeCalculation?.basis === "group-average-width") {
      details.push(
        `Výpočtová šířka: ${variant.volumeCalculation.averageWidthMm / 10} cm (průměr skupiny)`,
      );
    }
    return details;
  }
  if (category.id === "drivi-na-paletach") {
    return [
      `Délka polen: ${getSelectionLabel(category, "logLength", variant.selection.logLength)}`,
      `Objem palety: ${getSelectionLabel(category, "volume", variant.selection.volume)}`,
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
