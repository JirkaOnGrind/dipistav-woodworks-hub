import type { ArtworkSceneCandidate } from "@/lib/product-artwork-v9-candidates";
import { V11_ARTWORK_METADATA } from "@/lib/product-artwork-v11-metadata";
import { V11_ARTWORK_PLAN } from "@/lib/product-artwork-v11-plan";

function artworkKey(minimum: number): ArtworkSceneCandidate["artworkKey"] {
  if (minimum === 1) return "one";
  if (minimum === 2) return "two";
  if (minimum <= 4) return "three";
  if (minimum <= 8) return "five";
  if (minimum <= 15) return "bundle";
  return "dense";
}

export const V11_ARTWORK_CANDIDATES: readonly ArtworkSceneCandidate[] = V11_ARTWORK_PLAN.flatMap(
  (family) =>
    family.illustrationVariants.flatMap((illustrationVariant) =>
      family.bands.map((band, index) => {
        const generated = V11_ARTWORK_METADATA[band.id];
        if (!generated) throw new Error(`Missing v11 artwork metadata: ${band.id}`);
        return {
          id: `${illustrationVariant}-${band.id}`,
          categoryId: family.categoryId,
          illustrationVariant,
          artworkKey: artworkKey(band.quantityBand.min),
          quantityBand: band.quantityBand,
          visualMassRank: index + 1,
          source: band.plannedSource,
          canvas: generated.canvas,
          alphaBounds: generated.alphaBounds,
          opticalCenter: generated.opticalCenter,
          safeInset: 0.07,
          transformPolicy: "none" as const,
          preloadNeighbors: [],
          renderMode: "master" as const,
          approvalStatus: "approved" as const,
          representativeCount: band.representativeCount,
          alphaCoverage: generated.alphaCoverage,
          styleVersion: "v11" as const,
          fitPolicy: "adaptive-bounds" as const,
        };
      }),
    ),
);

export const V11_APPROVED_CANDIDATES = V11_ARTWORK_CANDIDATES;
