import type { ArtworkSceneCandidate } from "@/lib/product-artwork-v9-candidates";
import { V20_ARTWORK_METADATA } from "@/lib/product-artwork-v20-metadata";

const V20_ROOT = "/images/illustrations/configurator-v20";
const ID = "pellets-bag-3-master-v20";

export const V20_ARTWORK_CANDIDATES: readonly ArtworkSceneCandidate[] = [
  {
    id: ID,
    categoryId: "pelety",
    illustrationVariant: "pellets-bag",
    artworkKey: "three",
    quantityBand: { min: 3, max: 4 },
    visualMassRank: 3,
    source: `${V20_ROOT}/${ID}.webp`,
    canvas: V20_ARTWORK_METADATA[ID].canvas,
    alphaBounds: V20_ARTWORK_METADATA[ID].alphaBounds,
    opticalCenter: V20_ARTWORK_METADATA[ID].opticalCenter,
    safeInset: 0.07,
    transformPolicy: "none",
    preloadNeighbors: [],
    renderMode: "master",
    approvalStatus: "approved",
    representativeCount: 3,
    alphaCoverage: V20_ARTWORK_METADATA[ID].alphaCoverage,
    styleVersion: "v20",
    fitPolicy: "alpha-safe",
    targetAlphaWidth: 0.78,
  },
];

export const V20_APPROVED_CANDIDATES = V20_ARTWORK_CANDIDATES;
