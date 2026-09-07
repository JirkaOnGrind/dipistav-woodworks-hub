import type { ArtworkSceneCandidate } from "@/lib/product-artwork-v9-candidates";
import { V13_ARTWORK_METADATA } from "@/lib/product-artwork-v13-metadata";

const id = "firewood-loose-9-15-master-v13";
const metadata = V13_ARTWORK_METADATA[id];

export const V13_ARTWORK_CANDIDATES: readonly ArtworkSceneCandidate[] = [
  {
    id,
    categoryId: "stipane-drevo",
    illustrationVariant: "firewood-loose",
    artworkKey: "bundle",
    quantityBand: { min: 9, max: 15 },
    visualMassRank: 4,
    source: `/images/illustrations/configurator-v13/${id}.webp`,
    canvas: metadata.canvas,
    alphaBounds: metadata.alphaBounds,
    opticalCenter: metadata.opticalCenter,
    safeInset: 0.07,
    transformPolicy: "none",
    preloadNeighbors: [],
    renderMode: "master",
    approvalStatus: "approved",
    representativeCount: 12,
    alphaCoverage: metadata.alphaCoverage,
    styleVersion: "v13",
    fitPolicy: "alpha-safe",
    targetAlphaWidth: 0.82,
  },
];

export const V13_APPROVED_CANDIDATES = V13_ARTWORK_CANDIDATES;
