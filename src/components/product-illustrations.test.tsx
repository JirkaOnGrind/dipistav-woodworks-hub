import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ProductIllustration } from "@/components/product-illustrations";
import { resolveArtworkScene } from "@/lib/product-artwork";
import { V9_ARTWORK_CANDIDATES } from "@/lib/product-artwork-v9-candidates";
import { PRODUCT_CATEGORIES } from "@/lib/product-catalog";

describe("ProductIllustration", () => {
  it("renders every category, including tramy, as raster artwork", () => {
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
          expect(markup).toContain("<img");
          expect(markup).not.toContain("<svg");
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
      expect(markup, candidate.id).toContain('data-artwork-render-mode="master"');
      expect(markup, candidate.id).not.toContain("data-selling-unit=");
      expect(markup.match(/<img/g), candidate.id).toHaveLength(1);
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

  it("disables illustration transitions for reduced motion", () => {
    const styles = readFileSync("src/styles.css", "utf8");
    expect(styles).toContain("@media (prefers-reduced-motion: reduce)");
    expect(styles).toContain("[data-artwork-visual-layer]");
    expect(styles).toContain("transition: none !important");
  });
});
