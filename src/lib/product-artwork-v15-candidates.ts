import type { ArtworkSceneCandidate } from "@/lib/product-artwork-v9-candidates";
import { V12_ARTWORK_METADATA } from "@/lib/product-artwork-v12-metadata";
import { V15_ARTWORK_METADATA } from "@/lib/product-artwork-v15-metadata";

const V15_ROOT = "/images/illustrations/configurator-v15";
const GOLDEN_MASTER_ID = "firewood-loose-16plus-master-v12";

const BANDS = [
  ["firewood-loose-1-2-master-v15", { min: 1, max: 2 }, "one", 1, 0.62],
  ["firewood-loose-3-4-master-v15", { min: 3, max: 4 }, "three", 3, 0.7],
  ["firewood-loose-5-8-master-v15", { min: 5, max: 8 }, "five", 6, 0.76],
  ["firewood-loose-9-15-master-v15", { min: 9, max: 15 }, "bundle", 12, 0.82],
] as const;

export const V15_ARTWORK_CANDIDATES: readonly ArtworkSceneCandidate[] = [
  ...BANDS.map(([id, quantityBand, artworkKey, representativeCount, targetAlphaWidth], index) => {
    const metadata = V15_ARTWORK_METADATA[id];
    if (!metadata) throw new Error(`Missing v15 artwork metadata: ${id}`);
    return {
      id,
      categoryId: "stipane-drevo",
      illustrationVariant: "firewood-loose",
      artworkKey,
      quantityBand,
      visualMassRank: index + 1,
      source: `${V15_ROOT}/${id}.webp`,
      canvas: metadata.canvas,
      alphaBounds: metadata.alphaBounds,
      opticalCenter: metadata.opticalCenter,
      safeInset: 0.07,
      transformPolicy: "none" as const,
      preloadNeighbors: [],
      renderMode: "master" as const,
      approvalStatus: "approved" as const,
      representativeCount,
      alphaCoverage: metadata.alphaCoverage,
      styleVersion: "v15" as const,
      fitPolicy: "alpha-safe" as const,
      targetAlphaWidth,
    };
  }),
  {
    id: GOLDEN_MASTER_ID,
    categoryId: "stipane-drevo",
    illustrationVariant: "firewood-loose",
    artworkKey: "dense",
    quantityBand: { min: 16 },
    visualMassRank: 5,
    source: `/images/illustrations/configurator-v12/${GOLDEN_MASTER_ID}.webp`,
    canvas: V12_ARTWORK_METADATA[GOLDEN_MASTER_ID].canvas,
    alphaBounds: V12_ARTWORK_METADATA[GOLDEN_MASTER_ID].alphaBounds,
    opticalCenter: V12_ARTWORK_METADATA[GOLDEN_MASTER_ID].opticalCenter,
    safeInset: 0.07,
    transformPolicy: "none",
    preloadNeighbors: [],
    renderMode: "master",
    approvalStatus: "approved",
    representativeCount: 16,
    alphaCoverage: V12_ARTWORK_METADATA[GOLDEN_MASTER_ID].alphaCoverage,
    styleVersion: "v15",
    fitPolicy: "alpha-safe",
    targetAlphaWidth: 0.86,
  },
];

export const V15_APPROVED_CANDIDATES = V15_ARTWORK_CANDIDATES;
