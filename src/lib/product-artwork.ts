import type { ProductVariant } from "@/lib/product-catalog";

const CONFIGURATOR_ROOT = "/images/illustrations/configurator-v3";
const CONFIGURATOR_V4_ROOT = "/images/illustrations/configurator-v4";
const CONFIGURATOR_V5_ROOT = "/images/illustrations/configurator-v5";
const CONFIGURATOR_V6_ROOT = "/images/illustrations/configurator-v6";
const CONFIGURATOR_V7_ROOT = "/images/illustrations/configurator-v7";
const GOLDEN_MASTERS_ROOT = "/images/illustrations/golden-masters";
const HOMEPAGE_ROOT = "/images/illustrations";

export type ProductArtworkKey = "one" | "two" | "three" | "five" | "bundle" | "dense";

type ArtworkSet = Record<ProductArtworkKey, string>;

const TIMBER_ARTWORK: Record<"fosny" | "late" | "prkna-sorted" | "prkna-unsorted", ArtworkSet> = {
  fosny: {
    one: `${CONFIGURATOR_ROOT}/fosna-single-v3.webp`,
    two: `${CONFIGURATOR_ROOT}/fosna-2-v3.webp`,
    three: `${CONFIGURATOR_V6_ROOT}/fosna-3-complete-v7.webp`,
    five: `${CONFIGURATOR_ROOT}/fosna-5-v3.webp`,
    bundle: `${CONFIGURATOR_V5_ROOT}/fosna-bundle-clean-v5.webp`,
    dense: `${CONFIGURATOR_V5_ROOT}/fosna-dense-clean-v5.webp`,
  },
  late: {
    one: `${CONFIGURATOR_ROOT}/lat-1-v3.webp`,
    two: `${CONFIGURATOR_ROOT}/lat-2-v3.webp`,
    three: `${CONFIGURATOR_ROOT}/lat-3-v3.webp`,
    five: `${CONFIGURATOR_ROOT}/lat-5-v3.webp`,
    bundle: `${CONFIGURATOR_V4_ROOT}/lat-10-v4.webp`,
    dense: `${CONFIGURATOR_V5_ROOT}/lat-dense-rectangular-v5.webp`,
  },
  "prkna-sorted": {
    one: `${CONFIGURATOR_ROOT}/prkno-sorted-1-v3.webp`,
    two: `${CONFIGURATOR_ROOT}/prkno-sorted-2-v3.webp`,
    three: `${CONFIGURATOR_V4_ROOT}/prkno-sorted-3-v4.webp`,
    five: `${CONFIGURATOR_V4_ROOT}/prkno-sorted-5-v4.webp`,
    bundle: `${CONFIGURATOR_V4_ROOT}/prkno-sorted-10-v4.webp`,
    dense: `${CONFIGURATOR_V5_ROOT}/prkno-sorted-dense-v5.webp`,
  },
  "prkna-unsorted": {
    one: `${CONFIGURATOR_ROOT}/prkno-unsorted-1-v3.webp`,
    two: `${CONFIGURATOR_ROOT}/prkno-unsorted-2-v3.webp`,
    three: `${CONFIGURATOR_ROOT}/prkno-unsorted-3-v3.webp`,
    five: `${CONFIGURATOR_ROOT}/prkno-unsorted-5-v3.webp`,
    bundle: `${CONFIGURATOR_ROOT}/prkno-unsorted-bundle-v3.webp`,
    dense: `${CONFIGURATOR_V7_ROOT}/prkno-unsorted-dense-v7.webp`,
  },
};

const SELLING_UNIT_ARTWORK: Record<string, string> = {
  "pellets-bag": `${CONFIGURATOR_ROOT}/pelety-pytel-v3.webp`,
  "pellets-set": `${CONFIGURATOR_V4_ROOT}/pelety-set-8-v4.webp`,
  "pellets-pallet": `${CONFIGURATOR_ROOT}/pelety-paleta-v3.webp`,
  "firewood-loose": `${HOMEPAGE_ROOT}/stipane-v2.webp`,
  "firewood-bag": `${CONFIGURATOR_ROOT}/drevo-bigbag-v3.webp`,
  "firewood-pallet": `${CONFIGURATOR_V4_ROOT}/drevo-paleta-v4.webp`,
  "slabs-2m": `${HOMEPAGE_ROOT}/krajinky-v2.webp`,
  "slabs-3m": `${HOMEPAGE_ROOT}/krajinky-v2.webp`,
  "slabs-4m": `${HOMEPAGE_ROOT}/krajinky-v2.webp`,
  "pallet-25": `${CONFIGURATOR_V4_ROOT}/paleta-drevo-25-v4.webp`,
  "pallet-33": `${CONFIGURATOR_V4_ROOT}/paleta-drevo-33-v4.webp`,
  "pallet-16": `${CONFIGURATOR_V4_ROOT}/paleta-drevo-16-v4.webp`,
};

const HIGH_QUANTITY_COMPOSITIONS: Record<string, { minQuantity: number; source: string }> = {
  "firewood-loose": {
    minQuantity: 9,
    source: `${CONFIGURATOR_V7_ROOT}/firewood-loose-pile-v7.webp`,
  },
  "firewood-bag": {
    minQuantity: 8,
    source: `${GOLDEN_MASTERS_ROOT}/bigbag-pile-9-master-v1.webp`,
  },
  "slabs-2m": {
    minQuantity: 5,
    source: `${CONFIGURATOR_V5_ROOT}/krajinky-pile-high-v5.webp`,
  },
  "slabs-3m": {
    minQuantity: 5,
    source: `${CONFIGURATOR_V5_ROOT}/krajinky-pile-high-v5.webp`,
  },
  "slabs-4m": {
    minQuantity: 5,
    source: `${CONFIGURATOR_V5_ROOT}/krajinky-pile-high-v5.webp`,
  },
};

function getTimberArtworkSet(categoryId: string, variant: ProductVariant) {
  if (categoryId === "fosny") return TIMBER_ARTWORK.fosny;
  if (categoryId === "late") return TIMBER_ARTWORK.late;
  if (categoryId === "prkna") {
    return variant.illustrationVariant.startsWith("board-unsorted")
      ? TIMBER_ARTWORK["prkna-unsorted"]
      : TIMBER_ARTWORK["prkna-sorted"];
  }
  return undefined;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function getProductArtworkKey(quantity: number): ProductArtworkKey {
  if (quantity <= 1) return "one";
  if (quantity === 2) return "two";
  if (quantity <= 4) return "three";
  if (quantity <= 9) return "five";
  if (quantity <= 14) return "bundle";
  return "dense";
}

export type SellingUnitCount = 1 | 2 | 3 | 4 | 5 | 8 | 12 | 16 | 20 | 30;

export function getSellingUnitCount(
  quantity: number,
  illustrationVariant?: string,
): SellingUnitCount {
  if (illustrationVariant === "firewood-loose") {
    if (quantity <= 1) return 1;
    if (quantity === 2) return 2;
    if (quantity <= 4) return 3;
    if (quantity <= 8) return 5;
    return 8;
  }

  if (illustrationVariant?.startsWith("slabs-")) {
    if (quantity <= 1) return 1;
    if (quantity === 2) return 2;
    if (quantity === 3) return 3;
    return 4;
  }

  if (illustrationVariant === "pellets-bag") {
    if (quantity <= 1) return 1;
    if (quantity === 2) return 2;
    if (quantity <= 4) return 3;
    if (quantity <= 7) return 5;
    if (quantity <= 10) return 8;
    if (quantity <= 14) return 12;
    if (quantity <= 18) return 16;
    if (quantity <= 24) return 20;
    return 30;
  }

  if (illustrationVariant === "pellets-set") {
    if (quantity <= 1) return 1;
    if (quantity === 2) return 20;
    return 30;
  }

  if (illustrationVariant === "pellets-pallet") {
    if (quantity <= 1) return 1;
    if (quantity === 2) return 2;
    if (quantity === 3) return 3;
    return 4;
  }

  if (
    illustrationVariant === "firewood-pallet" ||
    illustrationVariant === "pallet-16" ||
    illustrationVariant === "pallet-25" ||
    illustrationVariant === "pallet-33"
  ) {
    if (quantity <= 1) return 1;
    if (quantity === 2) return 2;
    if (quantity === 3) return 3;
    if (quantity === 4) return 4;
    if (quantity <= 7) return 5;
    return 8;
  }

  if (quantity <= 1) return 1;
  if (quantity === 2) return 2;
  if (quantity <= 4) return 3;
  if (quantity <= 7) return 5;
  if (quantity <= 10) return 8;
  if (quantity <= 14) return 12;
  return 16;
}

export function getTimberArtworkTransform(
  categoryId: string,
  variant: ProductVariant,
  artworkKey?: ProductArtworkKey,
) {
  const lengthMm = variant.dimensions?.lengthMm ?? 4000;
  const lengthScale = clamp(lengthMm / 4500, 0.85, 1.15);
  const widthMm = variant.dimensions?.widthMm ?? 100;
  const heightMm = variant.dimensions?.heightMm ?? variant.dimensions?.thicknessMm ?? 40;
  const referenceArea =
    categoryId === "late" ? 60 * 40 : categoryId === "fosny" ? 140 * 40 : 100 * 25;
  let profileScale = clamp(Math.sqrt((widthMm * heightMm) / referenceArea), 0.86, 1.16);
  let categoryLengthScale = lengthScale;

  if (categoryId === "prkna") {
    profileScale = clamp(widthMm / 150, 0.8, 1.24);
  }

  if (categoryId === "fosny" && artworkKey === "three") {
    categoryLengthScale = clamp(lengthScale * 1.45, 1.24, 1.32);
    profileScale = clamp(profileScale * 1.18, 1.12, 1.2);
  }

  if (categoryId === "fosny" && artworkKey === "bundle") {
    categoryLengthScale = clamp(lengthScale * 1.14, 0.92, 1.2);
    profileScale = clamp(profileScale * 0.9, 0.82, 1.03);
  }

  if (categoryId === "fosny" && artworkKey === "dense") {
    categoryLengthScale = clamp(lengthScale * 1.5, 1.28, 1.38);
    profileScale = clamp(profileScale * 1.14, 1.08, 1.18);
  }

  return `scaleX(${categoryLengthScale}) scaleY(${profileScale})`;
}

export function getTimberArtworkFilter(categoryId: string, artworkKey: ProductArtworkKey) {
  if (categoryId === "late" && artworkKey === "one") {
    return "saturate(0.94) brightness(1.015) contrast(1.01)";
  }

  if (categoryId === "late" && artworkKey === "dense") {
    return "saturate(0.88) brightness(1.035) contrast(1.015)";
  }

  if (categoryId === "fosny" && artworkKey === "dense") {
    return "saturate(0.94) brightness(1.02) contrast(1.01)";
  }

  return undefined;
}

export function getSellingUnitTransform(variant: ProductVariant) {
  if (variant.illustrationVariant === "slabs-2m") return "scaleX(0.9)";
  if (variant.illustrationVariant === "slabs-4m") return "scaleX(1.1)";
  return undefined;
}

export function getProductArtworkSources(categoryId: string, variant: ProductVariant) {
  const timberSet = getTimberArtworkSet(categoryId, variant);
  if (timberSet) return Object.values(timberSet);
  const source = SELLING_UNIT_ARTWORK[variant.illustrationVariant];
  const composition = HIGH_QUANTITY_COMPOSITIONS[variant.illustrationVariant]?.source;
  const expandedPelletSource =
    variant.illustrationVariant === "pellets-set" ? SELLING_UNIT_ARTWORK["pellets-bag"] : undefined;
  return [
    ...new Set(
      [source, composition, expandedPelletSource].filter((item): item is string => Boolean(item)),
    ),
  ];
}

export function resolveProductArtwork(
  categoryId: string,
  variant: ProductVariant,
  quantity: number,
) {
  const timberSet = getTimberArtworkSet(categoryId, variant);
  if (timberSet) {
    const key = getProductArtworkKey(quantity);
    return { kind: "timber" as const, key, source: timberSet[key] };
  }

  const composition = HIGH_QUANTITY_COMPOSITIONS[variant.illustrationVariant];
  if (composition && quantity >= composition.minQuantity) {
    return {
      kind: "composition" as const,
      key: getProductArtworkKey(quantity),
      source: composition.source,
    };
  }

  if (variant.illustrationVariant === "pellets-set" && quantity >= 2) {
    return {
      kind: "selling-unit" as const,
      key: getProductArtworkKey(quantity),
      source: SELLING_UNIT_ARTWORK["pellets-bag"],
    };
  }

  return {
    kind: "selling-unit" as const,
    key: getProductArtworkKey(quantity),
    source: SELLING_UNIT_ARTWORK[variant.illustrationVariant],
  };
}
