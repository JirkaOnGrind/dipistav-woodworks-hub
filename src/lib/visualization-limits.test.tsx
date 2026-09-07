import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { WoodVisualizer } from "@/components/wood-visualizer";
import { getEffectiveQuantityPolicy, PRODUCT_CATEGORIES } from "@/lib/product-catalog";
import { resolveArtworkScene } from "@/lib/product-artwork";
import { calculateVariantQuote } from "@/lib/pricing";
import { getVisualizationLimit, getVisualizationLimitMessage } from "@/lib/visualization-limits";

describe("visualization limits are independent of purchasing", () => {
  it("lets every piece-based lumber variant render every piece through 30 and warn only above 30", () => {
    for (const category of PRODUCT_CATEGORIES.filter((item) => item.sectionId === "rezivo")) {
      for (const variant of category.variants.filter((item) => item.modeId !== "unsorted")) {
        const policy = getEffectiveQuantityPolicy(category, variant);
        expect(policy.sliderMax).toBe(30);
        expect(policy.max).toBeGreaterThanOrEqual(30);
        expect(resolveArtworkScene(category.id, variant, 30).scene.representativeCount).toBe(30);
        for (const quantity of [30, 31]) {
          const markup = renderToStaticMarkup(
            <WoodVisualizer categoryId={category.id} imageSrc={category.imageSrc}
              imageAlt={category.name} quantity={quantity} variant={variant} />,
          );
          expect(markup.includes("data-visualization-limit")).toBe(quantity > 30);
          if (quantity === 31) {
            expect(markup).toContain("Vizualizace je do 30 kusů, vyšší počet se nezobrazuje.");
          }
        }
      }
    }
  });
  it("covers every catalog variant and shows the notice only above the visual threshold", () => {
    for (const category of PRODUCT_CATEGORIES) {
      for (const variant of category.variants) {
        const limit = getVisualizationLimit(category.id, variant)!;
        expect(limit, variant.id).not.toBeNull();
        const threshold = limit.max / limit.unitsPerQuantity;
        expect(getVisualizationLimitMessage(category.id, variant, threshold - 1)).toBeNull();
        const message = `Vizualizace je do ${limit.max} ${limit.genitive}, vyšší počet se nezobrazuje.`;
        expect(getVisualizationLimitMessage(category.id, variant, threshold)).toBeNull();
        expect(getVisualizationLimitMessage(category.id, variant, threshold + 1)).toBe(message);
      }
    }
  });

  it("keeps real quantities and prices above the slab and firewood slider limits", () => {
    for (const [categoryId, name, max] of [
      ["krajinky", "slabs-2m", 12],
      ["stipane-drevo", "firewood-loose", 10],
      ["stipane-drevo", "firewood-bag", 10],
    ] as const) {
      const category = PRODUCT_CATEGORIES.find((c) => c.id === categoryId)!;
      const variant = category.variants.find((v) => v.illustrationVariant === name)!;
      const policy = getEffectiveQuantityPolicy(category, variant);
      expect(policy.sliderMax).toBe(max);
      expect(policy.max).toBe(500);
      expect(calculateVariantQuote(variant, 15)?.totalPrice).toBe(variant.pricing!.rate * 15);
      if (name !== "firewood-bag") {
        expect(resolveArtworkScene(categoryId, variant, 500).scene.representativeCount).toBe(max);
      }
      const markup = renderToStaticMarkup(
        <WoodVisualizer
          categoryId={categoryId}
          imageSrc={category.imageSrc}
          imageAlt={category.name}
          quantity={15}
          variant={variant}
        />,
      );
      expect(markup).toContain("data-visualization-limit");
      expect(markup).toContain("Vizualizace je do");
      expect(markup).toContain("15");
    }
  });
});
