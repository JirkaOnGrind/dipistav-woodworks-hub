import type { ArtworkSceneDefinition } from "@/lib/product-artwork";
import { VISUALIZATION_LIMITS } from "@/lib/visualization-limits";

const ROOT = "/images/illustrations/firewood-v36";

// Background colors sampled from the approved opaque source canvases.
const BACKGROUNDS = [
  "#f8eddf",
  "#f9efe2",
  "#f9ecdd",
  "#f8efe0",
  "#f8ebda",
  "#fbf0de",
  "#f8efe0",
  "#f8ecdb",
  "#f8ecdc",
  "#fbf3e5",
];

export function getFirewoodBackground(quantity: number) {
  return BACKGROUNDS[
    Math.min(VISUALIZATION_LIMITS.firewood, Math.max(1, Math.floor(quantity))) - 1
  ];
}

// Lossless WebP copies preserve the full-resolution approved pixels; no thumbnail srcset.
// Scale the complete canvas uniformly so each quantity has a larger visible footprint.
const CANVAS_WIDTHS = [0.8, 0.86, 0.76, 0.9, 0.9, 1.01, 0.97, 0.97, 1.01, 1.05];

export const FIREWOOD_ARTWORK: readonly ArtworkSceneDefinition[] = Array.from(
  { length: VISUALIZATION_LIMITS.firewood },
  (_, index) => {
    const quantity = index + 1;
    const scale = CANVAS_WIDTHS[index];
    return {
      id: `firewood-loose-${quantity}-v36`,
      categoryId: "stipane-drevo",
      illustrationVariant: "firewood-loose",
      artworkKey:
        quantity === 1
          ? "one"
          : quantity === 2
            ? "two"
            : quantity <= 4
              ? "three"
              : quantity <= 8
                ? "five"
                : "bundle",
      quantityBand:
        quantity === VISUALIZATION_LIMITS.firewood
          ? { min: quantity }
          : { min: quantity, max: quantity },
      visualMassRank: quantity,
      source: `${ROOT}/firewood-${quantity}.webp`,
      canvas: { width: 1536, height: 1024 },
      alphaBounds: { x: 0, y: 0, width: 1, height: 1 },
      opticalCenter: { x: 0.5, y: 0.5 },
      safeInset: 0,
      transformPolicy: "none",
      previewScale: scale,
      preloadNeighbors: [quantity - 1, quantity + 1]
        .filter((neighbor) => neighbor >= 1 && neighbor <= VISUALIZATION_LIMITS.firewood)
        .map((neighbor) => `${ROOT}/firewood-${neighbor}.webp`),
      renderMode: "master",
      representativeCount: quantity,
      styleVersion: "v36",
    };
  },
);
