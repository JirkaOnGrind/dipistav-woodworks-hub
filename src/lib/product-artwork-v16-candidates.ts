import type { ProductArtworkKey, QuantityBand } from "@/lib/product-artwork";
import type { ArtworkSceneCandidate } from "@/lib/product-artwork-v9-candidates";
import { V16_ARTWORK_METADATA } from "@/lib/product-artwork-v16-metadata";

const V16_ROOT = "/images/illustrations/configurator-v16";

type Band = readonly [
  id: string,
  quantityBand: QuantityBand,
  artworkKey: ProductArtworkKey,
  representativeCount: number,
  targetAlphaWidth: number,
];

const BAG_BANDS: readonly Band[] = [
  ["pellets-bag-1-master-v16", { min: 1, max: 1 }, "one", 1, 0.4],
  ["pellets-bag-2-master-v16", { min: 2, max: 2 }, "two", 2, 0.52],
  ["pellets-bag-3-master-v16", { min: 3, max: 4 }, "three", 3, 0.6],
  ["pellets-bag-5-master-v16", { min: 5, max: 9 }, "five", 5, 0.68],
  ["pellets-bag-10-master-v16-r5", { min: 10, max: 19 }, "bundle", 10, 0.76],
  ["pellets-bag-20-master-v16", { min: 20 }, "dense", 20, 0.8],
];

const SET_BANDS: readonly Band[] = [
  ["pellets-set-1-master-v16", { min: 1, max: 1 }, "one", 10, 0.76],
  ["pellets-set-2-master-v16", { min: 2, max: 2 }, "two", 20, 0.8],
  ["pellets-set-3-4-master-v16", { min: 3, max: 4 }, "three", 30, 0.83],
  ["pellets-set-5plus-master-v16", { min: 5 }, "five", 50, 0.85],
];

const SET_SOURCE_IDS = [
  "pellets-bag-10-master-v16-r5",
  "pellets-bag-20-master-v16",
  "pellets-bag-30-master-v16",
  "pellets-bag-50-master-v16",
] as const;

function scene(
  categoryId: "pelety",
  illustrationVariant: "pellets-bag" | "pellets-set",
  band: Band,
  index: number,
  sourceId = band[0],
): ArtworkSceneCandidate {
  const [id, quantityBand, artworkKey, representativeCount, targetAlphaWidth] = band;
  const metadata = V16_ARTWORK_METADATA[sourceId];
  if (!metadata) throw new Error(`Missing v16 artwork metadata: ${sourceId}`);
  return {
    id,
    categoryId,
    illustrationVariant,
    artworkKey,
    quantityBand,
    visualMassRank: index + 1,
    source: `${V16_ROOT}/${sourceId}.webp`,
    canvas: metadata.canvas,
    alphaBounds: metadata.alphaBounds,
    opticalCenter: metadata.opticalCenter,
    safeInset: 0.07,
    transformPolicy: "none",
    preloadNeighbors: [],
    renderMode: "master",
    approvalStatus: "approved",
    representativeCount,
    alphaCoverage: metadata.alphaCoverage,
    styleVersion: "v16",
    fitPolicy: "alpha-safe",
    targetAlphaWidth,
  };
}

export const V16_ARTWORK_CANDIDATES: readonly ArtworkSceneCandidate[] = [
  ...BAG_BANDS.map((band, index) => scene("pelety", "pellets-bag", band, index)),
  ...SET_BANDS.map((band, index) =>
    scene("pelety", "pellets-set", band, index, SET_SOURCE_IDS[index]),
  ),
];

export const V16_APPROVED_CANDIDATES = V16_ARTWORK_CANDIDATES;
