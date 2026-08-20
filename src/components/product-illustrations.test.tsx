import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ProductIllustration } from "@/components/product-illustrations";
import { resolveArtworkScene } from "@/lib/product-artwork";
import { V9_ARTWORK_CANDIDATES } from "@/lib/product-artwork-v9-candidates";
import { PRODUCT_CATEGORIES } from "@/lib/product-catalog";

describe("ProductIllustration", () => {
  it("renders every category from raster artwork, including modular raster layers", () => {
    for (const category of PRODUCT_CATEGORIES) {
      for (const variant of category.variants) {
        for (const quantity of [1, 2, 3, 4, 5, 8, 9, 15, 20]) {
          const markup = renderToStaticMarkup(
            <ProductIllustration
              categoryId={category.id}
              quantity={quantity}
              variant={variant}
              title={`${category.name}, ${quantity}`}
            />,
          );
          expect(markup).toContain("data-product-artwork");
          const scene = resolveArtworkScene(category.id, variant, quantity).scene;
          if (scene.renderMode === "modular-pallet") {
            expect(markup).toContain("<svg");
            expect(markup).toContain("<image");
          } else {
            expect(markup).toContain("<img");
            expect(markup).not.toContain("<svg");
          }
        }
      }
    }
  });

  it("renders every master as one img without selling-unit clones", () => {
    const cases = PRODUCT_CATEGORIES.flatMap((category) =>
      category.variants
        .slice(0, 1)
        .flatMap((variant) =>
          [1, 5, 9, 15, 20].map((quantity) => ({ category, variant, quantity })),
        ),
    );
    for (const { category, variant, quantity } of cases) {
      const scene = resolveArtworkScene(category.id, variant, quantity).scene;
      if (scene.renderMode !== "master") continue;
      const markup = renderToStaticMarkup(
        <ProductIllustration
          categoryId={category.id}
          quantity={quantity}
          variant={variant}
          title={scene.id}
        />,
      );
      expect(markup).toContain('data-artwork-render-mode="master"');
      expect(markup).not.toContain("data-selling-unit=");
      expect(markup.match(/<img/g)).toHaveLength(1);
    }
  });

  it("renders every v9 production band or its v10 override as exactly one img", () => {
    for (const candidate of V9_ARTWORK_CANDIDATES) {
      const category = PRODUCT_CATEGORIES.find((item) => item.id === candidate.categoryId)!;
      const variant = category.variants.find(
        (item) =>
          item.illustrationVariant === candidate.illustrationVariant ||
          (candidate.illustrationVariant === "slabs-*" &&
            item.illustrationVariant.startsWith("slabs-")),
      )!;
      const markup = renderToStaticMarkup(
        <ProductIllustration
          categoryId={category.id}
          quantity={candidate.quantityBand.min}
          variant={variant}
          title={candidate.id}
        />,
      );
      const resolved = resolveArtworkScene(category.id, variant, candidate.quantityBand.min).scene;
      expect(markup, candidate.id).toContain(resolved.source);
      if (resolved.renderMode === "modular-pallet") {
        expect(markup, candidate.id).toContain('data-artwork-render-mode="modular-pallet"');
        expect(markup.match(/<image/g), candidate.id).toHaveLength(resolved.representativeCount);
      } else {
        expect(markup, candidate.id).toContain('data-artwork-render-mode="master"');
        expect(markup, candidate.id).not.toContain("data-selling-unit=");
        expect(markup.match(/<img/g), candidate.id).toHaveLength(1);
      }
    }
  });

  it("keeps the approved slabs 1/2 legacy composition unchanged", () => {
    const category = PRODUCT_CATEGORIES.find((item) => item.id === "krajinky")!;
    const variant = category.variants[0];
    for (const quantity of [1, 2]) {
      const markup = renderToStaticMarkup(
        <ProductIllustration
          categoryId={category.id}
          quantity={quantity}
          variant={variant}
          title={`${quantity} balíky`}
        />,
      );
      expect(markup).toContain(`data-selling-unit-count="${quantity}"`);
      expect(markup.match(/data-selling-unit="true"/g)).toHaveLength(quantity);
      expect(markup).toContain("krajinky-v2.webp");
    }
  });

  it("uses the same beam sources as the standalone configurator", () => {
    const category = PRODUCT_CATEGORIES.find((item) => item.id === "tramy")!;
    const variant = category.variants[0];
    const markup = renderToStaticMarkup(
      <ProductIllustration
        categoryId={category.id}
        quantity={16}
        variant={variant}
        title="Trámy"
      />,
    );
    expect(markup).toContain("configurator-v11/beam-occlusion-v3-16plus-master-v11.webp");
    expect(markup.match(/<img/g)).toHaveLength(1);
  });

  it("composes both 1.6 prm variants from the same approved single-pallet source", () => {
    const cases = [
      ["stipane-drevo", "firewood-pallet"],
      ["drivi-na-paletach", "pallet-16"],
    ] as const;

    for (const [categoryId, illustrationVariant] of cases) {
      const category = PRODUCT_CATEGORIES.find((item) => item.id === categoryId)!;
      const variant = category.variants.find(
        (item) => item.illustrationVariant === illustrationVariant,
      )!;
      for (const [quantity, count] of [
        [1, 1],
        [2, 2],
        [3, 3],
        [5, 6],
        [9, 9],
        [12, 12],
        [16, 16],
        [500, 16],
      ] as const) {
        const markup = renderToStaticMarkup(
          <ProductIllustration
            categoryId={categoryId}
            quantity={quantity}
            variant={variant}
            title={`${illustrationVariant}-${quantity}`}
          />,
        );
        expect(markup).toContain('data-artwork-render-mode="modular-pallet"');
        expect(markup.match(/<image/g)).toHaveLength(count);
        expect(markup.match(/firewood-pallet-1-master-v10\.webp/g)).toHaveLength(count);
      }
    }
  });

  it("keeps Big bag on its existing master mapping", () => {
    const category = PRODUCT_CATEGORIES.find((item) => item.id === "stipane-drevo")!;
    const variant = category.variants.find((item) => item.illustrationVariant === "firewood-bag")!;
    const expected = [
      [1, "drevo-bigbag-v3.webp"],
      [2, "firewood-bigbag-2-master-v9.webp"],
      [5, "firewood-bigbag-5-8-master-v9.webp"],
      [9, "firewood-bigbag-9plus-master-v9.webp"],
      [20, "firewood-bigbag-9plus-master-v9.webp"],
    ] as const;
    for (const [quantity, filename] of expected) {
      const scene = resolveArtworkScene(category.id, variant, quantity).scene;
      expect(scene.source).toContain(filename);
      expect(scene.renderMode).not.toBe("modular-pallet");
    }
  });

  it("disables illustration transitions for reduced motion", () => {
    const styles = readFileSync("src/styles.css", "utf8");
    expect(styles).toContain("@media (prefers-reduced-motion: reduce)");
    expect(styles).toContain("[data-artwork-visual-layer]");
    expect(styles).toContain("transition: none !important");
  });
});
