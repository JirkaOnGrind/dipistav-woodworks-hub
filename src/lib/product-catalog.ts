export type SelectOption = {
  value: string;
  label: string;
};

type BaseCategory = {
  id: string;
  name: string;
  shortName: string;
  subtitle: string;
  description: string;
  imageSrc: string;
  thumbnailAlt: string;
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

export type ProductCategory = DimensionedCategory | LengthOnlyCategory;

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
  kind: "dimensioned",
  name: "Stavební trámy",
  shortName: "Trámy",
  subtitle: "Masivní nosné profily pro krovy, stropy i pergoly.",
  description:
    "Klasické stavební trámy skladem v nejžádanějších profilech. Vyberte profil, délku a množství, orientační cena se přepočítá okamžitě.",
  imageSrc: "/images/tramy-dipi.png",
  thumbnailAlt: "Stavební trámy DIPISTAV",
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
  kind: "dimensioned",
  name: "Stavební fošny",
  shortName: "Fošny",
  subtitle: "Široké stavební fošny pro bednění i konstrukční detaily.",
  description:
    "Fošny držíme v několika profilech a délkách pro rychlé objednání. Na stránce si rovnou nastavíte konfiguraci a počet kusů.",
  imageSrc: "/images/fosny-dipi.png",
  thumbnailAlt: "Stavební fošny DIPISTAV",
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
  kind: "dimensioned",
  name: "Stavební prkna",
  shortName: "Prkna",
  subtitle: "Coulová prkna v oblíbených šířkách pro střechy i obklady.",
  description:
    "Stavební prkna objednáte podle šířky, délky a počtu kusů. Přehledný kalkulátor na stránce hned ukáže cenu celé sestavy.",
  imageSrc: "/images/prkna-dipi.png",
  thumbnailAlt: "Stavební prkna DIPISTAV",
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
  kind: "length-only",
  name: "Střešní latě",
  shortName: "Latě",
  subtitle: "Profil 60 × 40 mm pro střechy, podbití i lehké konstrukce.",
  description:
    "Střešní latě držíme v pevném profilu 60 × 40 mm. Zvolte délku, nastavte množství a vizualizace vám ukáže výslednou sestavu.",
  imageSrc: "/images/late-dipi.png",
  thumbnailAlt: "Střešní latě DIPISTAV",
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

export const PRODUCT_CATEGORIES: ProductCategory[] = [tramy, fosny, prkna, late];

export function getProductCategory(categoryId: string) {
  return PRODUCT_CATEGORIES.find((category) => category.id === categoryId);
}
