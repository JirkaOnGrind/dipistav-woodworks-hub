import type { ProductVariant } from "@/lib/product-catalog";
import { V9_ARTWORK_CANDIDATES } from "@/lib/product-artwork-v9-candidates";

const CONFIGURATOR_ROOT = "/images/illustrations/configurator-v3";
const CONFIGURATOR_V4_ROOT = "/images/illustrations/configurator-v4";
const CONFIGURATOR_V5_ROOT = "/images/illustrations/configurator-v5";
const CONFIGURATOR_V6_ROOT = "/images/illustrations/configurator-v6";
const CONFIGURATOR_V7_ROOT = "/images/illustrations/configurator-v7";
const GOLDEN_MASTERS_ROOT = "/images/illustrations/golden-masters";
const HOMEPAGE_ROOT = "/images/illustrations";

export type ProductArtworkKey = "one" | "two" | "three" | "five" | "bundle" | "dense";
export type SellingUnitCount = 1 | 2 | 3 | 4 | 5 | 8 | 12 | 16 | 20 | 30;

export type NormalizedPoint = { x: number; y: number };
export type NormalizedBounds = NormalizedPoint & { width: number; height: number };
export type QuantityBand = { min: number; max?: number };

export type ArtworkSceneDefinition = {
  id: string;
  categoryId: string;
  illustrationVariant: string;
  artworkKey: ProductArtworkKey;
  quantityBand: QuantityBand;
  visualMassRank: number;
  source: string;
  canvas: { width: number; height: number };
  alphaBounds: NormalizedBounds;
  opticalCenter: NormalizedPoint;
  safeInset: number;
  transformPolicy: "beam" | "timber" | "none";
  transformStrength?: number;
  minScaleX?: number;
  minScaleY?: number;
  maxScaleX?: number;
  maxScaleY?: number;
  preloadNeighbors: readonly string[];
  renderMode: "master" | "legacy-units";
  legacyUnitCount?: SellingUnitCount;
  filter?: string;
};

export type ResolvedArtworkScene = {
  scene: ArtworkSceneDefinition;
  family: readonly ArtworkSceneDefinition[];
};

export type SafeArtworkTransform = {
  transform: string;
  translateXPercent: number;
  translateYPercent: number;
  scaleX: number;
  scaleY: number;
  maxSafeScaleX: number;
  maxSafeScaleY: number;
};

type SceneDraft = Omit<ArtworkSceneDefinition, "preloadNeighbors">;
type ArtworkSet = Record<ProductArtworkKey, string>;

const DEFAULT_BOUNDS: NormalizedBounds = { x: 0.07, y: 0.07, width: 0.86, height: 0.86 };
const DEFAULT_CENTER: NormalizedPoint = { x: 0.5, y: 0.5 };
const DEFAULT_SAFE_INSET = 0.06;

const ASSET_CANVAS: Record<string, { width: number; height: number }> = {
  [`${CONFIGURATOR_ROOT}/fosna-single-v3.webp`]: { width: 1536, height: 1024 },
  [`${CONFIGURATOR_ROOT}/fosna-2-v3.webp`]: { width: 1536, height: 1024 },
  [`${CONFIGURATOR_V6_ROOT}/fosna-3-complete-v7.webp`]: { width: 1536, height: 1024 },
  [`${CONFIGURATOR_ROOT}/fosna-5-v3.webp`]: { width: 1536, height: 1024 },
  [`${CONFIGURATOR_V5_ROOT}/fosna-bundle-clean-v5.webp`]: { width: 1536, height: 1024 },
  [`${CONFIGURATOR_V5_ROOT}/fosna-dense-clean-v5.webp`]: { width: 1536, height: 1024 },
  [`${CONFIGURATOR_ROOT}/lat-1-v3.webp`]: { width: 1536, height: 1024 },
  [`${CONFIGURATOR_ROOT}/lat-2-v3.webp`]: { width: 1275, height: 1234 },
  [`${CONFIGURATOR_ROOT}/lat-3-v3.webp`]: { width: 1274, height: 1235 },
  [`${CONFIGURATOR_ROOT}/lat-5-v3.webp`]: { width: 1402, height: 1122 },
  [`${CONFIGURATOR_V4_ROOT}/lat-10-v4.webp`]: { width: 1402, height: 1122 },
  [`${CONFIGURATOR_V5_ROOT}/lat-dense-rectangular-v5.webp`]: { width: 1402, height: 1122 },
  [`${CONFIGURATOR_ROOT}/prkno-sorted-1-v3.webp`]: { width: 1536, height: 1024 },
  [`${CONFIGURATOR_ROOT}/prkno-sorted-2-v3.webp`]: { width: 1536, height: 1024 },
  [`${CONFIGURATOR_V4_ROOT}/prkno-sorted-3-v4.webp`]: { width: 1536, height: 1024 },
  [`${CONFIGURATOR_V4_ROOT}/prkno-sorted-5-v4.webp`]: { width: 1536, height: 1024 },
  [`${CONFIGURATOR_V4_ROOT}/prkno-sorted-10-v4.webp`]: { width: 1536, height: 1024 },
  [`${CONFIGURATOR_V5_ROOT}/prkno-sorted-dense-v5.webp`]: { width: 1536, height: 1024 },
  [`${CONFIGURATOR_ROOT}/prkno-unsorted-1-v3.webp`]: { width: 1536, height: 1024 },
  [`${CONFIGURATOR_ROOT}/prkno-unsorted-2-v3.webp`]: { width: 1536, height: 1024 },
  [`${CONFIGURATOR_ROOT}/prkno-unsorted-3-v3.webp`]: { width: 1402, height: 1122 },
  [`${CONFIGURATOR_ROOT}/prkno-unsorted-5-v3.webp`]: { width: 1536, height: 1024 },
  [`${CONFIGURATOR_ROOT}/prkno-unsorted-bundle-v3.webp`]: { width: 1254, height: 1254 },
  [`${CONFIGURATOR_V7_ROOT}/prkno-unsorted-dense-v7.webp`]: { width: 1536, height: 1024 },
  [`${CONFIGURATOR_V4_ROOT}/beam-1-v4.webp`]: { width: 1536, height: 1024 },
  [`${CONFIGURATOR_V4_ROOT}/beam-2-v4.webp`]: { width: 1536, height: 1024 },
  [`${CONFIGURATOR_V4_ROOT}/beam-3-v4.webp`]: { width: 1536, height: 1024 },
  [`${GOLDEN_MASTERS_ROOT}/beam-bundle-6-seams-master-v2.webp`]: { width: 1672, height: 941 },
  [`${CONFIGURATOR_V4_ROOT}/beam-12-v4.webp`]: { width: 1536, height: 1024 },
  [`${CONFIGURATOR_V4_ROOT}/beam-16-v4.webp`]: { width: 1536, height: 1024 },
  [`${HOMEPAGE_ROOT}/stipane-v2.webp`]: { width: 1254, height: 1254 },
  [`${CONFIGURATOR_V7_ROOT}/firewood-loose-pile-v7.webp`]: { width: 1510, height: 1042 },
  [`${CONFIGURATOR_ROOT}/drevo-bigbag-v3.webp`]: { width: 1254, height: 1254 },
  [`${GOLDEN_MASTERS_ROOT}/bigbag-pile-9-master-v1.webp`]: { width: 1254, height: 1254 },
  [`${CONFIGURATOR_V4_ROOT}/drevo-paleta-v4.webp`]: { width: 1254, height: 1254 },
  [`${CONFIGURATOR_V4_ROOT}/paleta-drevo-16-v4.webp`]: { width: 1254, height: 1254 },
  [`${CONFIGURATOR_V4_ROOT}/paleta-drevo-25-v4.webp`]: { width: 1254, height: 1254 },
  [`${CONFIGURATOR_V4_ROOT}/paleta-drevo-33-v4.webp`]: { width: 1254, height: 1254 },
  [`${CONFIGURATOR_ROOT}/pelety-pytel-v3.webp`]: { width: 1254, height: 1254 },
  [`${CONFIGURATOR_V4_ROOT}/pelety-set-8-v4.webp`]: { width: 1254, height: 1254 },
  [`${CONFIGURATOR_ROOT}/pelety-paleta-v3.webp`]: { width: 1254, height: 1254 },
  [`${HOMEPAGE_ROOT}/krajinky-v2.webp`]: { width: 1254, height: 1254 },
  [`${CONFIGURATOR_V5_ROOT}/krajinky-pile-high-v5.webp`]: { width: 1254, height: 1254 },
};

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

const BAND_BY_KEY: Record<ProductArtworkKey, QuantityBand> = {
  one: { min: 1, max: 1 },
  two: { min: 2, max: 2 },
  three: { min: 3, max: 4 },
  five: { min: 5, max: 9 },
  bundle: { min: 10, max: 14 },
  dense: { min: 15 },
};

const MASS_BY_KEY: Record<ProductArtworkKey, number> = {
  one: 1,
  two: 2,
  three: 3,
  five: 4,
  bundle: 5,
  dense: 6,
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function inBand(quantity: number, band: QuantityBand) {
  return quantity >= band.min && (band.max === undefined || quantity <= band.max);
}

function addPreloadNeighbors(drafts: readonly SceneDraft[]): readonly ArtworkSceneDefinition[] {
  return drafts.map((draft, index) => ({
    ...draft,
    canvas: ASSET_CANVAS[draft.source] ?? draft.canvas,
    preloadNeighbors: [drafts[index - 1]?.source, drafts[index + 1]?.source].filter(
      (source): source is string => Boolean(source),
    ),
  }));
}

function artworkKeyForQuantity(quantity: number): ProductArtworkKey {
  if (quantity <= 1) return "one";
  if (quantity === 2) return "two";
  if (quantity <= 4) return "three";
  if (quantity <= 9) return "five";
  if (quantity <= 14) return "bundle";
  return "dense";
}

function withV9Overrides(
  baseFamily: readonly ArtworkSceneDefinition[],
  categoryId: string,
  illustrationVariant: string,
): readonly ArtworkSceneDefinition[] {
  const v9Scenes = V9_ARTWORK_CANDIDATES.filter(
    (scene) =>
      scene.categoryId === categoryId &&
      (scene.illustrationVariant === illustrationVariant ||
        (scene.illustrationVariant === "slabs-*" && illustrationVariant.startsWith("slabs-"))),
  );
  if (v9Scenes.length === 0) return baseFamily;

  const starts = new Set<number>();
  for (const scene of [...baseFamily, ...v9Scenes]) {
    starts.add(scene.quantityBand.min);
    if (scene.quantityBand.max !== undefined) starts.add(scene.quantityBand.max + 1);
  }
  const sortedStarts = [...starts].sort((a, b) => a - b);
  const slices: Array<{ sourceScene: ArtworkSceneDefinition; min: number; max?: number }> = [];

  sortedStarts.forEach((min, index) => {
    const sourceScene =
      v9Scenes.find((scene) => inBand(min, scene.quantityBand)) ??
      baseFamily.find((scene) => inBand(min, scene.quantityBand));
    if (!sourceScene) return;
    slices.push({
      sourceScene,
      min,
      max: sortedStarts[index + 1] === undefined ? undefined : sortedStarts[index + 1] - 1,
    });
  });

  const coalesced: typeof slices = [];
  for (const slice of slices) {
    const previous = coalesced.at(-1);
    if (previous?.sourceScene.id === slice.sourceScene.id) {
      previous.max = slice.max;
    } else {
      coalesced.push({ ...slice });
    }
  }

  return addPreloadNeighbors(
    coalesced.map(({ sourceScene, min, max }, index) => ({
      ...sourceScene,
      id:
        sourceScene.illustrationVariant === "slabs-*"
          ? `${illustrationVariant}-${sourceScene.id}`
          : sourceScene.id,
      illustrationVariant,
      artworkKey: artworkKeyForQuantity(min),
      quantityBand: max === undefined ? { min } : { min, max },
      visualMassRank: index + 1,
      preloadNeighbors: undefined as never,
    })),
  );
}

function timberFamily(
  categoryId: string,
  illustrationVariant: string,
  artwork: ArtworkSet,
): readonly ArtworkSceneDefinition[] {
  return addPreloadNeighbors(
    (Object.keys(BAND_BY_KEY) as ProductArtworkKey[]).map((key) => {
      const isLathGoldenMaster = categoryId === "late" && key === "dense";
      return {
        id: `${illustrationVariant}-${key}`,
        categoryId,
        illustrationVariant,
        artworkKey: key,
        quantityBand: BAND_BY_KEY[key],
        visualMassRank: MASS_BY_KEY[key],
        source: artwork[key],
        canvas: isLathGoldenMaster ? { width: 1402, height: 1122 } : { width: 1536, height: 1024 },
        alphaBounds: isLathGoldenMaster
          ? { x: 0.02734, y: 0.20318, width: 0.93957, height: 0.59629 }
          : DEFAULT_BOUNDS,
        opticalCenter: isLathGoldenMaster ? { x: 0.49713, y: 0.50133 } : DEFAULT_CENTER,
        safeInset: DEFAULT_SAFE_INSET,
        transformPolicy: "timber",
        transformStrength: 1,
        renderMode: "master" as const,
        filter:
          categoryId === "late" && key === "one"
            ? "saturate(0.94) brightness(1.015) contrast(1.01)"
            : categoryId === "late" && key === "dense"
              ? "saturate(0.94) brightness(1.015) contrast(1.01)"
              : categoryId === "fosny" && key === "dense"
                ? "saturate(0.94) brightness(1.02) contrast(1.01)"
                : undefined,
      };
    }),
  );
}

const BEAM_FAMILY = addPreloadNeighbors([
  {
    id: "beam-1",
    categoryId: "tramy",
    illustrationVariant: "beam",
    artworkKey: "one",
    quantityBand: { min: 1, max: 1 },
    visualMassRank: 1,
    source: `${CONFIGURATOR_V4_ROOT}/beam-1-v4.webp`,
    canvas: { width: 1536, height: 1024 },
    alphaBounds: { x: 0.08659, y: 0.10449, width: 0.82227, height: 0.75977 },
    opticalCenter: { x: 0.49773, y: 0.48438 },
    safeInset: DEFAULT_SAFE_INSET,
    transformPolicy: "beam",
    transformStrength: 0.95,
    renderMode: "master",
  },
  {
    id: "beam-2",
    categoryId: "tramy",
    illustrationVariant: "beam",
    artworkKey: "two",
    quantityBand: { min: 2, max: 2 },
    visualMassRank: 2,
    source: `${CONFIGURATOR_V4_ROOT}/beam-2-v4.webp`,
    canvas: { width: 1536, height: 1024 },
    alphaBounds: { x: 0.08398, y: 0.09082, width: 0.84115, height: 0.79004 },
    opticalCenter: { x: 0.50456, y: 0.48584 },
    safeInset: DEFAULT_SAFE_INSET,
    transformPolicy: "beam",
    transformStrength: 0.95,
    renderMode: "master",
  },
  {
    id: "beam-3-4",
    categoryId: "tramy",
    illustrationVariant: "beam",
    artworkKey: "three",
    quantityBand: { min: 3, max: 4 },
    visualMassRank: 3,
    source: `${CONFIGURATOR_V4_ROOT}/beam-3-v4.webp`,
    canvas: { width: 1536, height: 1024 },
    alphaBounds: { x: 0.08659, y: 0.08691, width: 0.8112, height: 0.83691 },
    opticalCenter: { x: 0.49219, y: 0.50537 },
    safeInset: DEFAULT_SAFE_INSET,
    transformPolicy: "beam",
    transformStrength: 0.95,
    renderMode: "master",
  },
  {
    id: "beam-5-10",
    categoryId: "tramy",
    illustrationVariant: "beam",
    artworkKey: "five",
    quantityBand: { min: 5, max: 10 },
    visualMassRank: 4,
    source: `${GOLDEN_MASTERS_ROOT}/beam-bundle-6-seams-master-v2.webp`,
    canvas: { width: 1672, height: 941 },
    alphaBounds: { x: 0.11902, y: 0.04145, width: 0.76256, height: 0.91073 },
    opticalCenter: { x: 0.5003, y: 0.49682 },
    safeInset: DEFAULT_SAFE_INSET,
    transformPolicy: "beam",
    transformStrength: 0.95,
    renderMode: "master",
  },
  {
    id: "beam-11-15",
    categoryId: "tramy",
    illustrationVariant: "beam",
    artworkKey: "bundle",
    quantityBand: { min: 11, max: 15 },
    visualMassRank: 5,
    source: `${CONFIGURATOR_V4_ROOT}/beam-12-v4.webp`,
    canvas: { width: 1536, height: 1024 },
    alphaBounds: { x: 0.08203, y: 0.08887, width: 0.77669, height: 0.87207 },
    opticalCenter: { x: 0.47038, y: 0.5249 },
    safeInset: DEFAULT_SAFE_INSET,
    transformPolicy: "beam",
    transformStrength: 0.95,
    renderMode: "master",
    filter: "saturate(0.93) brightness(1.02) contrast(1.01)",
  },
  {
    id: "beam-16-plus",
    categoryId: "tramy",
    illustrationVariant: "beam",
    artworkKey: "dense",
    quantityBand: { min: 16 },
    visualMassRank: 6,
    source: `${CONFIGURATOR_V4_ROOT}/beam-16-v4.webp`,
    canvas: { width: 1536, height: 1024 },
    alphaBounds: { x: 0.07227, y: 0.08594, width: 0.83984, height: 0.85742 },
    opticalCenter: { x: 0.49219, y: 0.51465 },
    safeInset: DEFAULT_SAFE_INSET,
    transformPolicy: "beam",
    transformStrength: 0.95,
    renderMode: "master",
    filter: "saturate(0.93) brightness(1.02) contrast(1.01)",
  },
]);

const TIMBER_FAMILIES = {
  fosny: timberFamily("fosny", "plank", TIMBER_ARTWORK.fosny),
  late: timberFamily("late", "lath", TIMBER_ARTWORK.late),
  "prkna-sorted": timberFamily("prkna", "board-sorted", TIMBER_ARTWORK["prkna-sorted"]),
  "prkna-unsorted": timberFamily("prkna", "board-unsorted", TIMBER_ARTWORK["prkna-unsorted"]),
} as const;

const FIREWOOD_LOOSE_FAMILY = addPreloadNeighbors([
  ...([1, 2, 3] as const).map((unitCount, index) => ({
    id: `firewood-loose-${unitCount === 3 ? "3-4" : unitCount}`,
    categoryId: "stipane-drevo",
    illustrationVariant: "firewood-loose",
    artworkKey: (["one", "two", "three"] as const)[index],
    quantityBand: (
      [
        { min: 1, max: 1 },
        { min: 2, max: 2 },
        { min: 3, max: 4 },
      ] as const
    )[index],
    visualMassRank: index + 1,
    source: SELLING_UNIT_ARTWORK["firewood-loose"],
    canvas: { width: 1024, height: 1024 },
    alphaBounds: DEFAULT_BOUNDS,
    opticalCenter: DEFAULT_CENTER,
    safeInset: DEFAULT_SAFE_INSET,
    transformPolicy: "none" as const,
    renderMode: "legacy-units" as const,
    legacyUnitCount: unitCount,
  })),
  {
    id: "firewood-loose-5-8",
    categoryId: "stipane-drevo",
    illustrationVariant: "firewood-loose",
    artworkKey: "five",
    quantityBand: { min: 5, max: 8 },
    visualMassRank: 4,
    source: SELLING_UNIT_ARTWORK["firewood-loose"],
    canvas: { width: 1254, height: 1254 },
    alphaBounds: DEFAULT_BOUNDS,
    opticalCenter: DEFAULT_CENTER,
    safeInset: DEFAULT_SAFE_INSET,
    transformPolicy: "none",
    renderMode: "legacy-units",
    legacyUnitCount: 5,
  },
  {
    id: "firewood-loose-9-plus",
    categoryId: "stipane-drevo",
    illustrationVariant: "firewood-loose",
    artworkKey: "dense",
    quantityBand: { min: 9 },
    visualMassRank: 5,
    source: `${CONFIGURATOR_V7_ROOT}/firewood-loose-pile-v7.webp`,
    canvas: { width: 1536, height: 1024 },
    alphaBounds: DEFAULT_BOUNDS,
    opticalCenter: DEFAULT_CENTER,
    safeInset: DEFAULT_SAFE_INSET,
    transformPolicy: "none",
    renderMode: "master",
  },
]);

const PALLET_25_FAMILY = addPreloadNeighbors([
  ...([1, 2, 3] as const).map((unitCount, index) => ({
    id: `pallet-25-${unitCount === 3 ? "3-4" : unitCount}`,
    categoryId: "drivi-na-paletach",
    illustrationVariant: "pallet-25",
    artworkKey: (["one", "two", "three"] as const)[index],
    quantityBand: (
      [
        { min: 1, max: 1 },
        { min: 2, max: 2 },
        { min: 3, max: 4 },
      ] as const
    )[index],
    visualMassRank: index + 1,
    source: SELLING_UNIT_ARTWORK["pallet-25"],
    canvas: { width: 1024, height: 1024 },
    alphaBounds: DEFAULT_BOUNDS,
    opticalCenter: DEFAULT_CENTER,
    safeInset: DEFAULT_SAFE_INSET,
    transformPolicy: "none" as const,
    renderMode: "legacy-units" as const,
    legacyUnitCount: unitCount,
  })),
  {
    id: "pallet-25-5-8",
    categoryId: "drivi-na-paletach",
    illustrationVariant: "pallet-25",
    artworkKey: "five",
    quantityBand: { min: 5, max: 8 },
    visualMassRank: 4,
    source: SELLING_UNIT_ARTWORK["pallet-25"],
    canvas: { width: 1254, height: 1254 },
    alphaBounds: DEFAULT_BOUNDS,
    opticalCenter: DEFAULT_CENTER,
    safeInset: DEFAULT_SAFE_INSET,
    transformPolicy: "none",
    renderMode: "legacy-units",
    legacyUnitCount: 5,
  },
  {
    id: "pallet-25-9-plus-legacy",
    categoryId: "drivi-na-paletach",
    illustrationVariant: "pallet-25",
    artworkKey: "dense",
    quantityBand: { min: 9 },
    visualMassRank: 5,
    source: SELLING_UNIT_ARTWORK["pallet-25"],
    canvas: { width: 1024, height: 1024 },
    alphaBounds: DEFAULT_BOUNDS,
    opticalCenter: DEFAULT_CENTER,
    safeInset: DEFAULT_SAFE_INSET,
    transformPolicy: "none",
    renderMode: "legacy-units",
    legacyUnitCount: 8,
  },
]);

const FIREWOOD_BAG_FAMILY = addPreloadNeighbors([
  {
    id: "firewood-bag-1-7-legacy",
    categoryId: "stipane-drevo",
    illustrationVariant: "firewood-bag",
    artworkKey: "one",
    quantityBand: { min: 1, max: 7 },
    visualMassRank: 1,
    source: SELLING_UNIT_ARTWORK["firewood-bag"],
    canvas: { width: 1024, height: 1024 },
    alphaBounds: DEFAULT_BOUNDS,
    opticalCenter: DEFAULT_CENTER,
    safeInset: DEFAULT_SAFE_INSET,
    transformPolicy: "none",
    renderMode: "legacy-units",
  },
  {
    id: "firewood-bag-8-plus",
    categoryId: "stipane-drevo",
    illustrationVariant: "firewood-bag",
    artworkKey: "dense",
    quantityBand: { min: 8 },
    visualMassRank: 2,
    source: `${GOLDEN_MASTERS_ROOT}/bigbag-pile-9-master-v1.webp`,
    canvas: { width: 1536, height: 1024 },
    alphaBounds: DEFAULT_BOUNDS,
    opticalCenter: DEFAULT_CENTER,
    safeInset: DEFAULT_SAFE_INSET,
    transformPolicy: "none",
    renderMode: "master",
  },
]);

function slabFamily(illustrationVariant: string) {
  return addPreloadNeighbors([
    {
      id: `${illustrationVariant}-1-4-legacy`,
      categoryId: "krajinky",
      illustrationVariant,
      artworkKey: "one",
      quantityBand: { min: 1, max: 4 },
      visualMassRank: 1,
      source: SELLING_UNIT_ARTWORK[illustrationVariant],
      canvas: { width: 1024, height: 1024 },
      alphaBounds: DEFAULT_BOUNDS,
      opticalCenter: DEFAULT_CENTER,
      safeInset: DEFAULT_SAFE_INSET,
      transformPolicy: "none",
      renderMode: "legacy-units",
    },
    {
      id: `${illustrationVariant}-5-8`,
      categoryId: "krajinky",
      illustrationVariant,
      artworkKey: "five",
      quantityBand: { min: 5, max: 8 },
      visualMassRank: 2,
      source: `${CONFIGURATOR_V5_ROOT}/krajinky-pile-high-v5.webp`,
      canvas: { width: 1536, height: 1024 },
      alphaBounds: DEFAULT_BOUNDS,
      opticalCenter: DEFAULT_CENTER,
      safeInset: DEFAULT_SAFE_INSET,
      transformPolicy: "none",
      renderMode: "master",
    },
    {
      id: `${illustrationVariant}-9-plus-legacy`,
      categoryId: "krajinky",
      illustrationVariant,
      artworkKey: "dense",
      quantityBand: { min: 9 },
      visualMassRank: 3,
      source: `${CONFIGURATOR_V5_ROOT}/krajinky-pile-high-v5.webp`,
      canvas: { width: 1536, height: 1024 },
      alphaBounds: DEFAULT_BOUNDS,
      opticalCenter: DEFAULT_CENTER,
      safeInset: DEFAULT_SAFE_INSET,
      transformPolicy: "none",
      renderMode: "legacy-units",
      legacyUnitCount: 2,
    },
  ]);
}

const SLAB_FAMILIES = {
  "slabs-2m": slabFamily("slabs-2m"),
  "slabs-3m": slabFamily("slabs-3m"),
  "slabs-4m": slabFamily("slabs-4m"),
} as const;

function getArtworkKey(quantity: number): ProductArtworkKey {
  if (quantity <= 1) return "one";
  if (quantity === 2) return "two";
  if (quantity <= 4) return "three";
  if (quantity <= 9) return "five";
  if (quantity <= 14) return "bundle";
  return "dense";
}

export function getProductArtworkKey(quantity: number) {
  return getArtworkKey(quantity);
}

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

function getLegacyArtworkSceneFamily(
  categoryId: string,
  variant: ProductVariant,
): readonly ArtworkSceneDefinition[] {
  if (categoryId === "tramy") return BEAM_FAMILY;
  if (categoryId === "fosny") return TIMBER_FAMILIES.fosny;
  if (categoryId === "late") return TIMBER_FAMILIES.late;
  if (categoryId === "prkna") {
    return variant.illustrationVariant.startsWith("board-unsorted")
      ? TIMBER_FAMILIES["prkna-unsorted"]
      : TIMBER_FAMILIES["prkna-sorted"];
  }
  if (variant.illustrationVariant === "firewood-loose") return FIREWOOD_LOOSE_FAMILY;
  if (variant.illustrationVariant === "firewood-bag") return FIREWOOD_BAG_FAMILY;
  if (variant.illustrationVariant === "pallet-25") return PALLET_25_FAMILY;
  if (variant.illustrationVariant.startsWith("slabs-")) {
    return SLAB_FAMILIES[variant.illustrationVariant as keyof typeof SLAB_FAMILIES];
  }

  const source =
    variant.illustrationVariant === "pellets-set"
      ? SELLING_UNIT_ARTWORK[quantityIndependentPelletSource(variant)]
      : SELLING_UNIT_ARTWORK[variant.illustrationVariant];
  return addPreloadNeighbors([
    {
      id: `${variant.illustrationVariant}-legacy`,
      categoryId,
      illustrationVariant: variant.illustrationVariant,
      artworkKey: "one",
      quantityBand: { min: 1 },
      visualMassRank: 1,
      source,
      canvas: { width: 1024, height: 1024 },
      alphaBounds: DEFAULT_BOUNDS,
      opticalCenter: DEFAULT_CENTER,
      safeInset: DEFAULT_SAFE_INSET,
      transformPolicy: "none",
      renderMode: "legacy-units",
    },
  ]);
}

export function getArtworkSceneFamily(
  categoryId: string,
  variant: ProductVariant,
): readonly ArtworkSceneDefinition[] {
  return withV9Overrides(
    getLegacyArtworkSceneFamily(categoryId, variant),
    categoryId,
    variant.illustrationVariant,
  );
}

function quantityIndependentPelletSource(variant: ProductVariant) {
  return variant.illustrationVariant === "pellets-set"
    ? "pellets-set"
    : variant.illustrationVariant;
}

export function resolveArtworkScene(
  categoryId: string,
  variant: ProductVariant,
  quantity: number,
): ResolvedArtworkScene {
  const family = getArtworkSceneFamily(categoryId, variant);
  const scene =
    family.find((candidate) => inBand(quantity, candidate.quantityBand)) ?? family.at(-1)!;

  if (scene.renderMode === "legacy-units" && scene.legacyUnitCount === undefined) {
    const source =
      variant.illustrationVariant === "pellets-set" && quantity >= 2
        ? SELLING_UNIT_ARTWORK["pellets-bag"]
        : scene.source;
    return {
      family,
      scene: {
        ...scene,
        source,
        artworkKey: getArtworkKey(quantity),
        legacyUnitCount: getSellingUnitCount(quantity, variant.illustrationVariant),
      },
    };
  }

  return { scene, family };
}

export function getArtworkPreloadSources(
  categoryId: string,
  variant: ProductVariant,
  quantity: number,
) {
  const { scene } = resolveArtworkScene(categoryId, variant, quantity);
  return [...new Set([scene.source, ...scene.preloadNeighbors])];
}

function timberRequestedScale(
  categoryId: string,
  variant: ProductVariant,
  artworkKey: ProductArtworkKey,
) {
  const lengthMm = variant.dimensions?.lengthMm ?? 4000;
  const lengthScale = clamp(lengthMm / 4500, 0.85, 1.15);
  const widthMm = variant.dimensions?.widthMm ?? 100;
  const heightMm = variant.dimensions?.heightMm ?? variant.dimensions?.thicknessMm ?? 40;
  const referenceArea =
    categoryId === "late" ? 60 * 40 : categoryId === "fosny" ? 140 * 40 : 100 * 25;
  let scaleY = clamp(Math.sqrt((widthMm * heightMm) / referenceArea), 0.86, 1.16);
  let scaleX = lengthScale;

  if (categoryId === "prkna") scaleY = clamp(widthMm / 150, 0.8, 1.24);
  if (categoryId === "fosny" && artworkKey === "three") {
    scaleX = clamp(lengthScale * 1.45, 1.24, 1.32);
    scaleY = clamp(scaleY * 1.18, 1.12, 1.2);
  }
  if (categoryId === "fosny" && artworkKey === "bundle") {
    scaleX = clamp(lengthScale * 1.14, 0.92, 1.2);
    scaleY = clamp(scaleY * 0.9, 0.82, 1.03);
  }
  if (categoryId === "fosny" && artworkKey === "dense") {
    scaleX = clamp(lengthScale * 1.5, 1.28, 1.38);
    scaleY = clamp(scaleY * 1.14, 1.08, 1.18);
  }
  return { x: scaleX, y: scaleY };
}

function beamRequestedScale(variant: ProductVariant) {
  const width = variant.dimensions?.widthMm ?? 140;
  const height = variant.dimensions?.heightMm ?? width;
  const lengthMm = variant.dimensions?.lengthMm ?? 5000;
  const areaScale = clamp(Math.sqrt((width * height) / (140 * 140)), 0.88, 1.12);
  const ratio = width / height;
  const profileX = clamp(Math.sqrt(ratio), 0.9, 1.1);
  const profileY = clamp(1 / Math.sqrt(ratio), 0.9, 1.1);
  const lengthScale =
    ({ 4000: 0.82, 5000: 1, 6000: 1.1, 7000: 1.18 } as Record<number, number>)[lengthMm] ?? 1;
  return {
    x: clamp(areaScale * lengthScale * profileX, 0.78, 1.18),
    y: clamp(areaScale * profileY, 0.82, 1.16),
  };
}

export function getArtworkRequestedScale(scene: ArtworkSceneDefinition, variant: ProductVariant) {
  if (scene.transformPolicy === "beam") return beamRequestedScale(variant);
  if (scene.transformPolicy === "timber") {
    return timberRequestedScale(scene.categoryId, variant, scene.artworkKey);
  }
  if (variant.illustrationVariant === "slabs-2m") return { x: 0.9, y: 1 };
  if (variant.illustrationVariant === "slabs-4m") return { x: 1.1, y: 1 };
  return { x: 1, y: 1 };
}

export function calculateSafeArtworkTransform(
  scene: ArtworkSceneDefinition,
  requestedScale: NormalizedPoint,
): SafeArtworkTransform {
  const { alphaBounds, opticalCenter, safeInset } = scene;
  const halfSafeWidth = 0.5 - safeInset;
  const halfSafeHeight = 0.5 - safeInset;
  const horizontalSpan = Math.max(
    opticalCenter.x - alphaBounds.x,
    alphaBounds.x + alphaBounds.width - opticalCenter.x,
  );
  const verticalSpan = Math.max(
    opticalCenter.y - alphaBounds.y,
    alphaBounds.y + alphaBounds.height - opticalCenter.y,
  );
  const maxSafeScaleX = halfSafeWidth / horizontalSpan;
  const maxSafeScaleY = halfSafeHeight / verticalSpan;
  const strength = scene.transformStrength ?? 1;
  const dynamicScaleX = 1 + (requestedScale.x - 1) * strength;
  const dynamicScaleY = 1 + (requestedScale.y - 1) * strength;
  const requestedX = clamp(
    dynamicScaleX,
    scene.minScaleX ?? 0,
    scene.maxScaleX ?? Number.POSITIVE_INFINITY,
  );
  const requestedY = clamp(
    dynamicScaleY,
    scene.minScaleY ?? 0,
    scene.maxScaleY ?? Number.POSITIVE_INFINITY,
  );
  const scaleX = Math.min(requestedX, maxSafeScaleX);
  const scaleY = Math.min(requestedY, maxSafeScaleY);
  const translateXPercent = (0.5 - opticalCenter.x) * scaleX * 100;
  const translateYPercent = (0.5 - opticalCenter.y) * scaleY * 100;

  return {
    transform: `translate(${translateXPercent}%, ${translateYPercent}%) scaleX(${scaleX}) scaleY(${scaleY})`,
    translateXPercent,
    translateYPercent,
    scaleX,
    scaleY,
    maxSafeScaleX,
    maxSafeScaleY,
  };
}

export const ARTWORK_SCENE_FAMILIES = {
  beams: BEAM_FAMILY,
  laths: TIMBER_FAMILIES.late,
  firewoodLoose: FIREWOOD_LOOSE_FAMILY,
  pallet25: PALLET_25_FAMILY,
} as const;
