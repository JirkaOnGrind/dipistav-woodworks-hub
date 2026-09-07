import type { ProductArtworkKey, QuantityBand } from "@/lib/product-artwork";
import type { ArtworkSceneCandidate } from "@/lib/product-artwork-v9-candidates";
import { V19_ARTWORK_METADATA } from "@/lib/product-artwork-v19-metadata";

const V19_ROOT = "/images/illustrations/configurator-v19";

type Band = readonly [
  id: string,
  quantityBand: QuantityBand,
  artworkKey: ProductArtworkKey,
  representativeCount: number,
  targetAlphaWidth: number,
];

const BANDS: readonly Band[] = [
  ["pellets-bag-1-master-v19", { min: 1, max: 1 }, "one", 1, 0.4],
  ["pellets-bag-2-master-v19", { min: 2, max: 2 }, "two", 2, 0.52],
];

export const V19_ARTWORK_CANDIDATES: readonly ArtworkSceneCandidate[] = BANDS.map(
  ([id, quantityBand, artworkKey, representativeCount, targetAlphaWidth], index) => {
    const metadata = V19_ARTWORK_METADATA[id];
    if (!metadata) throw new Error(`Missing v19 artwork metadata: ${id}`);
    return {
      id,
      categoryId: "pelety",
      illustrationVariant: "pellets-bag",
      artworkKey,
      quantityBand,
      visualMassRank: index + 1,
      source: `${V19_ROOT}/${id}.webp`,
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
      styleVersion: "v19",
      fitPolicy: "alpha-safe",
      targetAlphaWidth,
    };
  },
);

export const V19_APPROVED_CANDIDATES = V19_ARTWORK_CANDIDATES;
