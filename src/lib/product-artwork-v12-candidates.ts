import type { ArtworkSceneCandidate } from "@/lib/product-artwork-v9-candidates";
import { V12_ARTWORK_METADATA } from "@/lib/product-artwork-v12-metadata";

const V12_ROOT = "/images/illustrations/configurator-v12";

const BANDS = [
  {
    id: "firewood-loose-1-2-master-v12",
    min: 1,
    max: 2,
    key: "one",
    count: 1,
    targetAlphaWidth: 0.62,
  },
  {
    id: "firewood-loose-3-4-master-v12",
    min: 3,
    max: 4,
    key: "three",
    count: 3,
    targetAlphaWidth: 0.66,
  },
  {
    id: "firewood-loose-5-8-master-v12",
    min: 5,
    max: 8,
    key: "five",
    count: 6,
    targetAlphaWidth: 0.79,
  },
  {
    id: "firewood-loose-9-15-master-v12",
    min: 9,
    max: 15,
    key: "bundle",
    count: 12,
    targetAlphaWidth: 0.82,
  },
  {
    id: "firewood-loose-16plus-master-v12",
    min: 16,
    key: "dense",
    count: 16,
    targetAlphaWidth: 0.86,
  },
] as const;

export const V12_ARTWORK_CANDIDATES: readonly ArtworkSceneCandidate[] = BANDS.map((band, index) => {
  const generated = V12_ARTWORK_METADATA[band.id];
  if (!generated) throw new Error(`Missing v12 artwork metadata: ${band.id}`);
  return {
    id: band.id,
    categoryId: "stipane-drevo",
    illustrationVariant: "firewood-loose",
    artworkKey: band.key,
    quantityBand: band.max === undefined ? { min: band.min } : { min: band.min, max: band.max },
    visualMassRank: index + 1,
    source: `${V12_ROOT}/${band.id}.webp`,
    canvas: generated.canvas,
    alphaBounds: generated.alphaBounds,
    opticalCenter: generated.opticalCenter,
    safeInset: 0.07,
    transformPolicy: "none",
    preloadNeighbors: [],
    renderMode: "master",
    approvalStatus: "approved",
    representativeCount: band.count,
    alphaCoverage: generated.alphaCoverage,
    styleVersion: "v12",
    fitPolicy: "alpha-safe",
    targetAlphaWidth: band.targetAlphaWidth,
  };
});

export const V12_APPROVED_CANDIDATES = V12_ARTWORK_CANDIDATES;
