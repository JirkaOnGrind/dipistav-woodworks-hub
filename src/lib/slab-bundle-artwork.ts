import type { ArtworkSceneDefinition } from "@/lib/product-artwork";
import { VISUALIZATION_LIMITS } from "@/lib/visualization-limits";

// Generated from scripts/bundle_configs.json, matching the timber master workflow.
export const SLAB_BUNDLE_ARTWORK: readonly ArtworkSceneDefinition[] = Array.from(
  { length: VISUALIZATION_LIMITS.slabs },
  (_, index) => {
    const count = index + 1;
    return {
      id: `slabs-${count}-v37`,
      categoryId: "krajinky",
      illustrationVariant: "slabs-*",
      artworkKey: count === 1 ? "one" : count === 2 ? "two" : count <= 4 ? "three" : "five",
      quantityBand:
        count === VISUALIZATION_LIMITS.slabs ? { min: count } : { min: count, max: count },
      visualMassRank: count,
      source: `/images/illustrations/slab-bundles-v37/slabs-${count}.svg`,
      canvas: { width: 1254, height: 1254 },
      alphaBounds: { x: 0.08, y: 0.08, width: 0.84, height: 0.84 },
      opticalCenter: { x: 0.5, y: 0.5 },
      safeInset: 0.06,
      transformPolicy: "none",
      renderMode: "master",
      representativeCount: count,
      styleVersion: "v37",
      preloadNeighbors: [count - 1, count + 1]
        .filter((neighbor) => neighbor >= 1 && neighbor <= VISUALIZATION_LIMITS.slabs)
        .map((neighbor) => `/images/illustrations/slab-bundles-v37/slabs-${neighbor}.svg`),
    };
  },
);
