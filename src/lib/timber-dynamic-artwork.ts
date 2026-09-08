import type { ArtworkSceneDefinition, ProductArtworkKey } from "@/lib/product-artwork";
import type { ProductVariant } from "@/lib/product-catalog";
import { VISUALIZATION_LIMITS } from "@/lib/visualization-limits";

const ROOT = "/images/illustrations/timber-dynamic-v35";
export const TIMBER_PIECES_PER_LAYER = 5;
export const MAX_TIMBER_DISPLAY_COUNT = VISUALIZATION_LIMITS.timber;

const FAMILY_BY_VARIANT = {
  beam: { categoryId: "tramy", prefix: "beam" },
  plank: { categoryId: "fosny", prefix: "plank" },
  "board-sorted": { categoryId: "prkna", prefix: "board-sorted" },
  "board-unsorted-narrow": { categoryId: "prkna", prefix: "board-unsorted-narrow" },
  "board-unsorted-wide": { categoryId: "prkna", prefix: "board-unsorted-wide" },
  lath: { categoryId: "late", prefix: "lath" },
} as const;

function artworkKey(count: number): ProductArtworkKey {
  if (count === 1) return "one";
  if (count === 2) return "two";
  if (count <= 4) return "three";
  if (count <= 9) return "five";
  if (count <= 14) return "bundle";
  return "dense";
}

export function isDirectVolumeVariant(variant: ProductVariant) {
  return variant.pricing?.basis === "cubic-meter" && variant.pricing.quantityMode === "volume";
}

export function getTimberDisplayCount(variant: ProductVariant, quantity: number) {
  const requested = Number.isFinite(quantity) ? quantity : 1;
  const pieces = isDirectVolumeVariant(variant)
    ? Math.round(requested) * TIMBER_PIECES_PER_LAYER
    : Math.trunc(requested);
  return Math.min(MAX_TIMBER_DISPLAY_COUNT, Math.max(1, pieces));
}

function createFamily(
  categoryId: string,
  illustrationVariant: string,
  prefix: string,
): readonly ArtworkSceneDefinition[] {
  const sourceForCount = (count: number) => {
    const version = count > 20 ? "v40" : illustrationVariant === "plank" ? "v39" : "v35";
    const root =
      count > 20
        ? "/images/illustrations/timber-v40"
        : illustrationVariant === "plank"
          ? "/images/illustrations/plank-v39"
          : ROOT;
    return { source: `${root}/${prefix}-${count}-master-${version}.webp`, version };
  };
  return Array.from({ length: MAX_TIMBER_DISPLAY_COUNT }, (_, index) => {
    const count = index + 1;
    const { source, version } = sourceForCount(count);
    return {
      id: `${illustrationVariant}-dynamic-${count}-${version}`,
      categoryId,
      illustrationVariant,
      artworkKey: artworkKey(count),
      quantityBand: { min: count, max: count },
      visualMassRank: count,
      source,
      canvas: { width: 1536, height: 1024 },
      alphaBounds: { x: 0.07, y: 0.07, width: 0.86, height: 0.86 },
      opticalCenter: { x: 0.5, y: 0.5 },
      safeInset: 0.07,
      transformPolicy: "none",
      preloadNeighbors: [
        index > 0 ? sourceForCount(count - 1).source : undefined,
        count < MAX_TIMBER_DISPLAY_COUNT ? sourceForCount(count + 1).source : undefined,
      ].filter((candidate): candidate is string => Boolean(candidate)),
      renderMode: "master",
      representativeCount: count,
      styleVersion: version,
      fitPolicy: "adaptive-bounds",
    } satisfies ArtworkSceneDefinition;
  });
}

const FAMILIES = Object.fromEntries(
  Object.entries(FAMILY_BY_VARIANT).map(([illustrationVariant, definition]) => [
    illustrationVariant,
    createFamily(definition.categoryId, illustrationVariant, definition.prefix),
  ]),
) as Record<keyof typeof FAMILY_BY_VARIANT, readonly ArtworkSceneDefinition[]>;

export function getTimberDynamicFamily(categoryId: string, variant: ProductVariant) {
  const definition =
    FAMILY_BY_VARIANT[variant.illustrationVariant as keyof typeof FAMILY_BY_VARIANT];
  if (!definition || definition.categoryId !== categoryId) return null;
  return FAMILIES[variant.illustrationVariant as keyof typeof FAMILY_BY_VARIANT];
}
