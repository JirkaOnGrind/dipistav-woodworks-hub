import type {
  ProductArtworkKey,
  QuantityBand,
  ResponsiveArtworkSource,
} from "@/lib/product-artwork";
import type { ArtworkSceneCandidate } from "@/lib/product-artwork-v9-candidates";
import { V21_ARTWORK_METADATA } from "@/lib/product-artwork-v21-metadata";

const RESPONSIVE_SIZES =
  "(max-width: 639px) calc(100vw - 5.5rem), (max-width: 1279px) calc(100vw - 8rem), 44rem";

type Band = readonly [
  sourceQuantity: number,
  quantityBand: QuantityBand,
  artworkKey: ProductArtworkKey,
  representativeCount: number,
  previewScale: number,
];

const BAG_BANDS: readonly Band[] = [
  [1, { min: 1, max: 1 }, "one", 1, 0.94],
  [2, { min: 2, max: 2 }, "two", 2, 0.9475],
  [3, { min: 3, max: 5 }, "three", 3, 0.955],
  [6, { min: 6, max: 8 }, "five", 6, 0.9625],
  [9, { min: 9, max: 11 }, "bundle", 9, 0.97],
  [12, { min: 12, max: 14 }, "bundle", 12, 0.9775],
  [15, { min: 15, max: 20 }, "dense", 15, 0.985],
  [21, { min: 21, max: 23 }, "dense", 21, 0.9925],
  [24, { min: 24 }, "dense", 24, 1],
];

const SET_BANDS: readonly Band[] = [
  [12, { min: 1, max: 1 }, "one", 10, 0.94],
  [21, { min: 2, max: 2 }, "two", 20, 0.97],
  [28, { min: 3 }, "dense", 30, 1],
];

function scene(
  illustrationVariant: "pellets-bag" | "pellets-set",
  band: Band,
  rank: number,
): ArtworkSceneCandidate {
  const [sourceQuantity, quantityBand, artworkKey, representativeCount, previewScale] = band;
  const metadata = V21_ARTWORK_METADATA[sourceQuantity];
  const id = `${illustrationVariant}-${quantityBand.min}-master-v21`;
  return {
    id,
    categoryId: "pelety",
    illustrationVariant,
    artworkKey,
    quantityBand,
    visualMassRank: rank + 1,
    source: metadata.responsiveSources.at(-1)!.source,
    responsiveSources: metadata.responsiveSources as readonly ResponsiveArtworkSource[],
    responsiveSizes: RESPONSIVE_SIZES,
    canvas: metadata.canvas,
    alphaBounds: metadata.alphaBounds,
    opticalCenter: metadata.opticalCenter,
    bottomAnchor: metadata.bottomAnchor,
    previewScale,
    safeInset: 0,
    transformPolicy: "none",
    preloadPolicy: "active-only",
    preloadNeighbors: [],
    renderMode: "master",
    approvalStatus: "approved",
    representativeCount,
    alphaCoverage: metadata.alphaCoverage,
    styleVersion: "v21",
  };
}

export const V21_ARTWORK_CANDIDATES: readonly ArtworkSceneCandidate[] = [
  ...BAG_BANDS.map((band, rank) => scene("pellets-bag", band, rank)),
  ...SET_BANDS.map((band, rank) => scene("pellets-set", band, rank)),
];

export const V21_APPROVED_CANDIDATES = V21_ARTWORK_CANDIDATES;
