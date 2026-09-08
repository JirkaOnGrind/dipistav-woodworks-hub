import type { ProductVariant } from "@/lib/product-catalog";

// These limits affect artwork only. Purchase limits belong to the quantity policy.
export const VISUALIZATION_LIMITS = { timber: 30, pallets: 12, slabs: 12, firewood: 10 } as const;

const TIMBER_CATEGORIES = new Set(["tramy", "fosny", "prkna", "late"]);

export function getVisualizationLimit(categoryId: string, variant?: ProductVariant) {
  if (!variant) return null;
  const name = variant.illustrationVariant;
  if (TIMBER_CATEGORIES.has(categoryId)) {
    return {
      max: VISUALIZATION_LIMITS.timber,
      genitive: "kusů",
      unitsPerQuantity:
        variant.pricing?.basis === "cubic-meter" && variant.pricing.quantityMode === "volume"
          ? 5
          : 1,
    };
  }
  if (name.includes("pallet"))
    return { max: VISUALIZATION_LIMITS.pallets, genitive: "palet", unitsPerQuantity: 1 };
  if (name.startsWith("slabs-"))
    return { max: VISUALIZATION_LIMITS.slabs, genitive: "balíků krajinek", unitsPerQuantity: 1 };
  if (name === "firewood-bag")
    return { max: VISUALIZATION_LIMITS.firewood, genitive: "big bagů", unitsPerQuantity: 1 };
  if (name === "firewood-loose")
    return {
      max: VISUALIZATION_LIMITS.firewood,
      genitive: "prm volně loženého dřeva",
      unitsPerQuantity: 1,
    };
  if (name === "pellets-bag") return { max: 24, genitive: "pytlů pelet", unitsPerQuantity: 1 };
  if (name === "pellets-set") return { max: 3, genitive: "setů pelet", unitsPerQuantity: 1 };
  return null;
}

export function getVisualizationLimitMessage(
  categoryId: string,
  variant: ProductVariant | undefined,
  quantity: number,
) {
  const limit = getVisualizationLimit(categoryId, variant);
  return limit && quantity * limit.unitsPerQuantity > limit.max
    ? `Vizualizace je do ${limit.max} ${limit.genitive}, vyšší počet se nezobrazuje.`
    : null;
}
