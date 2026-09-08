import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ProductIllustration } from "@/components/product-illustrations";
import { getPalletDisplayCount, PALLET_SOURCE_PROFILES } from "@/lib/pallet-composition";
import { resolveArtworkScene } from "@/lib/product-artwork";
import { V9_ARTWORK_CANDIDATES } from "@/lib/product-artwork-v9-candidates";
import { PRODUCT_CATEGORIES } from "@/lib/product-catalog";
import { getTimberDisplayCount, getTimberDynamicFamily } from "@/lib/timber-dynamic-artwork";

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
            expect(markup).toContain("data-pallet-composition");
            expect(markup).toContain("data-pallet-unit");
          } else {
            expect(markup).toContain("<img");
            expect(markup).not.toContain("data-pallet-composition");
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

  it("renders every v9 production band or its latest override in the intended mode", () => {
    for (const candidate of V9_ARTWORK_CANDIDATES) {
      const category = PRODUCT_CATEGORIES.find((item) => item.id === candidate.categoryId)!;
      const variant = category.variants.find(
        (item) =>
          item.illustrationVariant === candidate.illustrationVariant ||
          (candidate.illustrationVariant === "pallet-16" &&
            item.illustrationVariant === "pallet-33-16") ||
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
      if (getTimberDynamicFamily(category.id, variant)) {
        expect(markup, candidate.id).toContain(resolved.source);
        expect(markup, candidate.id).toContain('data-artwork-render-mode="master"');
        expect(markup.match(/<img/g), candidate.id).toHaveLength(1);
      } else if (resolved.renderMode === "modular-pallet") {
        expect(markup, candidate.id).toContain(resolved.source);
        expect(markup, candidate.id).toContain('data-artwork-render-mode="modular-pallet"');
        expect(markup.match(/data-pallet-unit=/g), candidate.id).toHaveLength(
          getPalletDisplayCount(candidate.quantityBand.min),
        );
      } else if (resolved.illustrationVariant === "firewood-bag") {
        expect(markup, candidate.id).toContain(resolved.source);
        expect(markup, candidate.id).toContain('data-artwork-render-mode="bigbag-composition"');
        expect(markup.match(/data-bigbag-unit=/g), candidate.id).toHaveLength(
          Math.min(10, candidate.quantityBand.min),
        );
      } else if (resolved.renderMode === "legacy-units") {
        expect(markup, candidate.id).toContain(resolved.source);
        expect(markup, candidate.id).toContain('data-artwork-render-mode="legacy-units"');
        expect(markup, candidate.id).toContain("data-selling-unit=");
      } else {
        expect(markup, candidate.id).toContain(resolved.source);
        expect(markup, candidate.id).toContain('data-artwork-render-mode="master"');
        expect(markup, candidate.id).not.toContain("data-selling-unit=");
        expect(markup.match(/<img/g), candidate.id).toHaveLength(1);
      }
    }
  });

  it("renders all twelve exact slab counts from separate composed masters", () => {
    const category = PRODUCT_CATEGORIES.find((item) => item.id === "krajinky")!;
    const variant = category.variants[0];
    for (const quantity of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]) {
      const markup = renderToStaticMarkup(
        <ProductIllustration
          categoryId={category.id}
          quantity={quantity}
          variant={variant}
          title={`${quantity} balíky`}
        />,
      );
      expect(markup).toContain('data-artwork-render-mode="master"');
      expect(markup.match(/<img/g)).toHaveLength(1);
      expect(markup).toContain(`/slabs-${quantity}.svg`);
      expect(markup).not.toContain("bundle_configs");
    }
  });

  it("renders every selected timber count as one exact five-wide master", () => {
    const category = PRODUCT_CATEGORIES.find((item) => item.id === "tramy")!;
    const variant = category.variants[0];
    for (const quantity of [1, 2, 3, 4, 5, 6, 10, 11, 16, 20]) {
      const markup = renderToStaticMarkup(
        <ProductIllustration
          categoryId={category.id}
          quantity={quantity}
          variant={variant}
          title="Trámy"
        />,
      );
      const scene = resolveArtworkScene(category.id, variant, quantity).scene;
      expect(scene.representativeCount).toBe(quantity);
      expect(scene.source).toContain(`/beam-${quantity}-master-v35.webp`);
      expect(markup).toContain('data-artwork-render-mode="master"');
      expect(markup).toContain(scene.source);
      expect(markup.match(/<img/g)).toHaveLength(1);
      expect(markup).not.toContain("data-selling-unit=");
    }
  });

  it("renders each selected m³ of unsorted boards as one complete layer", () => {
    const category = PRODUCT_CATEGORIES.find((item) => item.id === "prkna")!;
    const variant = category.variants.find((item) => item.modeId === "unsorted")!;
    const markup = renderToStaticMarkup(
      <ProductIllustration
        categoryId={category.id}
        quantity={3}
        variant={variant}
        title="Netříděná prkna, 3 m³"
      />,
    );

    const scene = resolveArtworkScene(category.id, variant, 3).scene;
    expect(getTimberDisplayCount(variant, 3)).toBe(15);
    expect(scene.representativeCount).toBe(15);
    expect(scene.source).toContain("board-unsorted-narrow-15-master-v35.webp");
    expect(markup).toContain('data-artwork-render-mode="master"');
    expect(markup.match(/<img/g)).toHaveLength(1);
  });

  it("composes every pallet variant with the shared matrices and its approved source profile", () => {
    const cases = [
      ["stipane-drevo", "firewood-pallet", "firewood-drevo1"],
      ["drivi-na-paletach", "pallet-25", "firewood-25"],
      ["drivi-na-paletach", "pallet-33", "firewood-33-1prm"],
      ["drivi-na-paletach", "pallet-25-16", "firewood-25-16"],
      ["drivi-na-paletach", "pallet-33-16", "firewood-33-16prm"],
      ["pelety", "pellets-pallet", "pellets-975"],
    ] as const;

    for (const [categoryId, illustrationVariant, profileId] of cases) {
      const category = PRODUCT_CATEGORIES.find((item) => item.id === categoryId)!;
      const variant = category.variants.find(
        (item) => item.illustrationVariant === illustrationVariant,
      )!;
      for (const [quantity, count] of [
        [1, 1],
        [2, 2],
        [3, 3],
        [5, 5],
        [6, 6],
        [7, 7],
        [9, 9],
        [10, 10],
        [12, 12],
        [13, 12],
        [14, 12],
        [16, 12],
        [20, 12],
        [21, 12],
        [500, 12],
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
        expect(markup).toContain(`data-pallet-profile="${profileId}"`);
        expect(markup).toContain(`data-pallet-requested-count="${quantity}"`);
        expect(markup).toContain(`data-pallet-display-count="${count}"`);
        expect(markup).toContain("--pallet-scale:");
        expect(markup).toContain("data-pallet-raster-grid");
        expect(markup.match(/data-pallet-unit=/g)).toHaveLength(count);
        const filename = PALLET_SOURCE_PROFILES[profileId].source.split("/").at(-1)!;
        expect(markup.match(new RegExp(filename.replaceAll(".", "\\."), "g"))).toHaveLength(count);
      }
    }
  });

  it("exposes inherited pallet projection steps for live DevTools calibration", () => {
    const category = PRODUCT_CATEGORIES.find((item) => item.id === "pelety")!;
    const variant = category.variants.find(
      (item) => item.illustrationVariant === "pellets-pallet",
    )!;
    const markup = renderToStaticMarkup(
      <ProductIllustration
        categoryId={category.id}
        quantity={7}
        variant={variant}
        title="Paleta 975 kg, 7 balení"
      />,
    );
    const stage = markup.match(/<div[^>]*data-pallet-composition="true"[^>]*>/)?.[0];

    expect(stage).toBeDefined();
    for (const variable of [
      "--pallet-column-x",
      "--pallet-column-y",
      "--pallet-depth-x",
      "--pallet-depth-y",
      "--pallet-stack-height",
      "--pallet-second-level-x",
    ]) {
      expect(stage).toContain(`${variable}:`);
      expect(markup).toContain(`var(${variable})`);
    }
    expect(markup).toContain("pellets-pallet-975-crisp-v33.webp");
  });

  it("keeps source-space pallet offsets invariant while auto-fit scale changes", () => {
    const category = PRODUCT_CATEGORIES.find((item) => item.id === "pelety")!;
    const variant = category.variants.find(
      (item) => item.illustrationVariant === "pellets-pallet",
    )!;
    const variableNames = [
      "--pallet-column-x",
      "--pallet-column-y",
      "--pallet-depth-x",
      "--pallet-depth-y",
      "--pallet-stack-height",
      "--pallet-second-level-x",
    ] as const;
    const stageStyles = [3, 7, 12].map((quantity) => {
      const markup = renderToStaticMarkup(
        <ProductIllustration
          categoryId={category.id}
          quantity={quantity}
          variant={variant}
          title={`Paleta 975 kg, ${quantity} balení`}
        />,
      );
      expect(markup).toContain("data-pallet-cluster");
      return markup.match(/<div[^>]*data-pallet-composition="true"[^>]*style="([^"]+)"/)?.[1];
    });

    expect(stageStyles.every(Boolean)).toBe(true);
    for (const variableName of variableNames) {
      const values = stageStyles.map(
        (style) => style!.match(new RegExp(`${variableName}:([^;]+)`))?.[1],
      );
      expect(new Set(values).size, variableName).toBe(1);
    }
    const scales = stageStyles.map((style) => style!.match(/--pallet-scale:([^;]+)/)?.[1]);
    expect(new Set(scales).size).toBeGreaterThanOrEqual(2);
  });

  it("keeps the calibrated firewood projection invariant while auto-fit recenters each count", () => {
    const category = PRODUCT_CATEGORIES.find((item) => item.id === "stipane-drevo")!;
    const variant = category.variants.find(
      (item) => item.illustrationVariant === "firewood-pallet",
    )!;
    const expectedVariables = {
      "--pallet-column-x": "45.9129%",
      "--pallet-column-y": "18.807%",
      "--pallet-depth-x": "-45.1713%",
      "--pallet-depth-y": "25.5357%",
      "--pallet-stack-height": "50.8%",
    } as const;
    const stageStyles = [1, 5, 6, 7, 12].map((quantity) => {
      const markup = renderToStaticMarkup(
        <ProductIllustration
          categoryId={category.id}
          quantity={quantity}
          variant={variant}
          title={`Štípané dřevo, ${quantity} palet`}
        />,
      );
      expect(markup).toContain('data-pallet-profile="firewood-drevo1"');
      expect(markup).toContain("data-pallet-cluster");
      return markup.match(/<div[^>]*data-pallet-composition="true"[^>]*style="([^"]+)"/)?.[1];
    });

    expect(stageStyles.every(Boolean)).toBe(true);
    for (const [variableName, expectedValue] of Object.entries(expectedVariables)) {
      const values = stageStyles.map(
        (style) => style!.match(new RegExp(`${variableName}:([^;]+)`))?.[1],
      );
      expect(new Set(values).size, variableName).toBe(1);
      expect(Number.parseFloat(values[0]!), variableName).toBeCloseTo(
        Number.parseFloat(expectedValue),
        4,
      );
    }
    expect(
      new Set(stageStyles.map((style) => style!.match(/--pallet-origin-x:([^;]+)/)?.[1])).size,
    ).toBeGreaterThan(1);
    expect(
      new Set(stageStyles.map((style) => style!.match(/--pallet-origin-y:([^;]+)/)?.[1])).size,
    ).toBeGreaterThan(1);
    expect(
      new Set(stageStyles.map((style) => style!.match(/--pallet-scale:([^;]+)/)?.[1])).size,
    ).toBeGreaterThan(1);
  });

  it("exposes independent calibration variables for every Dříví pallet variant", () => {
    const category = PRODUCT_CATEGORIES.find((item) => item.id === "drivi-na-paletach")!;
    const cases = [
      {
        illustrationVariant: "pallet-25",
        profileId: "firewood-25",
        prefix: "pallet-25cm-1prm",
        source: "configurator-v31/firewood-pallet-25cm-final-v31.webp",
        presentationScale: "1",
      },
      {
        illustrationVariant: "pallet-25-16",
        profileId: "firewood-25-16",
        prefix: "pallet-25cm-16prm",
        source: "configurator-v31/firewood-pallet-25cm-final-v31.webp",
        presentationScale: "1.07",
      },
      {
        illustrationVariant: "pallet-33",
        profileId: "firewood-33-1prm",
        prefix: "pallet-33cm-1prm",
        source: "configurator-v31/firewood-pallet-33cm-final-v31.webp",
        presentationScale: "1",
      },
      {
        illustrationVariant: "pallet-33-16",
        profileId: "firewood-33-16prm",
        prefix: "pallet-33cm-16prm",
        source: "configurator-v31/firewood-pallet-33cm-final-v31.webp",
        presentationScale: "1.07",
      },
    ] as const;
    const suffixes = [
      "column-x",
      "column-y",
      "depth-x",
      "depth-y",
      "stack-height",
      "second-level-x",
    ];
    const values = ["47.9%", "19.8%", "-40.2%", "21.1%", "58.5%", "4.2%"];
    const prefixes = cases.map((testCase) => testCase.prefix);

    for (const testCase of cases) {
      const variant = category.variants.find(
        (item) => item.illustrationVariant === testCase.illustrationVariant,
      )!;
      for (const [quantity, expectedCount] of [
        [1, 1],
        [6, 6],
        [12, 12],
        [13, 12],
        [500, 12],
      ] as const) {
        const markup = renderToStaticMarkup(
          <ProductIllustration
            categoryId={category.id}
            quantity={quantity}
            variant={variant}
            title={`${testCase.illustrationVariant}, ${quantity} palet`}
          />,
        );
        const stage = markup.match(/<div[^>]*data-pallet-composition="true"[^>]*>/)?.[0];

        expect(stage).toBeDefined();
        expect(markup).toContain(`data-pallet-profile="${testCase.profileId}"`);
        expect(markup).toContain(`data-pallet-display-count="${expectedCount}"`);
        expect(markup.match(/data-pallet-unit=/g)).toHaveLength(expectedCount);
        expect(markup).toContain(testCase.source);
        expect(markup).toContain(`data-pallet-presentation-scale="${testCase.presentationScale}"`);
        expect(stage).toContain(`data-pallet-calibration-scope="${testCase.prefix}"`);
        for (const prefix of prefixes) {
          if (prefix !== testCase.prefix) expect(stage).not.toContain(`--${prefix}-column-x:`);
        }
        for (const [index, suffix] of suffixes.entries()) {
          expect(stage).toContain(`--${testCase.prefix}-${suffix}:${values[index]}`);
          expect(stage).toContain(`--pallet-${suffix}:var(--${testCase.prefix}-${suffix})`);
          if (quantity === 12) expect(markup).toContain(`var(--pallet-${suffix})`);
        }
      }
    }
  });

  it("applies the second-level X calibration only to upper pallet units", () => {
    const category = PRODUCT_CATEGORIES.find((item) => item.id === "drivi-na-paletach")!;
    const variant = category.variants.find((item) => item.illustrationVariant === "pallet-25")!;
    const markup = renderToStaticMarkup(
      <ProductIllustration
        categoryId={category.id}
        quantity={12}
        variant={variant}
        title="Dvanáct palet"
      />,
    );
    const units = markup.match(/<img[^>]*data-pallet-unit="true"[^>]*>/g) ?? [];
    const groundUnits = units.filter((unit) => unit.includes('data-pallet-level="0"'));
    const upperUnits = units.filter((unit) => unit.includes('data-pallet-level="1"'));

    expect(groundUnits).toHaveLength(6);
    expect(upperUnits).toHaveLength(6);
    expect(groundUnits.every((unit) => !unit.includes("var(--pallet-second-level-x)"))).toBe(true);
    expect(upperUnits.every((unit) => unit.includes("var(--pallet-second-level-x)"))).toBe(true);
  });

  it("lays out modular pallet images at their final raster size", () => {
    const styles = readFileSync("src/styles.css", "utf8");
    expect(styles).toContain("[data-pallet-raster-grid]");
    expect(styles).not.toContain("scale(var(--pallet-scale))");
  });

  it("composes Big bag from the exact requested unit count up to ten", () => {
    const category = PRODUCT_CATEGORIES.find((item) => item.id === "stipane-drevo")!;
    const variant = category.variants.find((item) => item.illustrationVariant === "firewood-bag")!;
    for (const quantity of [1, 2, 5, 9, 20, 500]) {
      const scene = resolveArtworkScene(category.id, variant, quantity).scene;
      const markup = renderToStaticMarkup(
        <ProductIllustration
          categoryId={category.id}
          quantity={quantity}
          variant={variant}
          title={`${quantity} big bagů`}
        />,
      );
      expect(scene.source).toContain("drevo-bigbag-v3.webp");
      expect(markup).toContain('data-artwork-render-mode="bigbag-composition"');
      expect(markup.match(/data-bigbag-unit="true"/g)).toHaveLength(Math.min(10, quantity));
      for (const variable of [
        "--bigbag-column-x",
        "--bigbag-depth-x",
        "--bigbag-depth-y",
        "--bigbag-stack-height",
        "--bigbag-second-level-x",
      ]) {
        expect(markup).toContain(variable);
      }
    }
  });

  it("uses the calibrated Big bag projection profiles and interpolates missing counts", () => {
    const category = PRODUCT_CATEGORIES.find((item) => item.id === "stipane-drevo")!;
    const variant = category.variants.find((item) => item.illustrationVariant === "firewood-bag")!;
    const render = (quantity: number) =>
      renderToStaticMarkup(
        <ProductIllustration
          categoryId={category.id}
          quantity={quantity}
          variant={variant}
          title={`${quantity} big bagů`}
        />,
      );

    const expectedProfiles = [
      [3, "25.8%", "11.8%", "-8%", "18%", "13%", "-23.2%", "-9.9%", "0.53"],
      [5, "17.6%", "8.5%", "-8%", "18%", "25%", "-36%", "-13%", "0.38"],
      [6, "18.2%", "8.6%", "-15.6%", "8.4%", "13%", "-23.7%", "-12.417%", "0.4"],
      [8, "19.2%", "9%", "-15.2%", "8.7%", "13%", "-21.7%", "-16.6%", "0.39"],
      [10, "14.6%", "6.8%", "-11.2%", "6.8%", "23%", "-23%", "-11%", "0.31"],
    ] as const;

    for (const [
      quantity,
      columnX,
      columnY,
      depthX,
      depthY,
      stackHeight,
      originX,
      originY,
      scale,
    ] of expectedProfiles) {
      const markup = render(quantity);
      expect(markup).toContain(`--bigbag-column-x:${columnX}`);
      expect(markup).toContain(`--bigbag-column-y:${columnY}`);
      expect(markup).toContain(`--bigbag-depth-x:${depthX}`);
      expect(markup).toContain(`--bigbag-depth-y:${depthY}`);
      expect(markup).toContain(`--bigbag-stack-height:${stackHeight}`);
      expect(markup).toContain("--bigbag-second-level-x:4%");
      expect(markup).toContain(`--bigbag-origin-x:${originX}`);
      expect(markup).toContain(`--bigbag-origin-y:${originY}`);
      expect(markup).toContain(`--bigbag-unit-scale:${scale}`);
    }

    const seven = render(7);
    expect(seven).toContain("--bigbag-column-x:18.7%");
    expect(seven).toContain("--bigbag-depth-x:-15.4%");
    expect(seven).toContain("--bigbag-origin-x:-22.7%");
    expect(seven).toContain("--bigbag-unit-scale:0.395");
    const two = render(2);
    expect(two).toContain("--bigbag-column-x:32.8%");
    expect(two).toContain("--bigbag-column-y:13.1%");
    expect(two).toContain("--bigbag-origin-x:-15.1%");
    for (const count of [7, 9]) {
      expect(render(count)).toContain('data-bigbag-responsive="true"');
      expect(render(count)).toContain("--bigbag-fit-scale:");
    }
    for (const count of [1, 2, 3, 4, 5, 6, 8, 10]) {
      expect(render(count)).not.toContain("data-bigbag-responsive=");
    }
  });

  it("renders every approved v21 pellet state as one responsive whole-scene master", () => {
    const category = PRODUCT_CATEGORIES.find((item) => item.id === "pelety")!;
    const cases = [
      ["pellets-bag", [1, 2, 3, 5, 10, 20, 500]],
      ["pellets-set", [1, 2, 3, 5, 20, 500]],
    ] as const;

    for (const [illustrationVariant, quantities] of cases) {
      const variant = category.variants.find(
        (item) => item.illustrationVariant === illustrationVariant,
      )!;
      for (const quantity of quantities) {
        const scene = resolveArtworkScene(category.id, variant, quantity).scene;
        const markup = renderToStaticMarkup(
          <ProductIllustration
            categoryId={category.id}
            quantity={quantity}
            variant={variant}
            title={`${illustrationVariant}-${quantity}`}
          />,
        );
        expect(scene.styleVersion).toBe("v21");
        expect(scene.renderMode).toBe("master");
        expect(markup).toContain(scene.source);
        expect(markup).toContain("srcSet=");
        expect(markup).toContain("640w");
        expect(markup).toContain("1280w");
        expect(markup).toContain(`data-preview-scale="${scene.previewScale}"`);
        expect(markup).toContain('data-bottom-anchor="0.5,');
        expect(markup.match(/<img/g)).toHaveLength(1);
        expect(markup).not.toContain("data-selling-unit=");
      }
    }
  });

  it("disables illustration transitions for reduced motion", () => {
    const styles = readFileSync("src/styles.css", "utf8");
    expect(styles).toContain("@media (prefers-reduced-motion: reduce)");
    expect(styles).toContain("[data-artwork-visual-layer]");
    expect(styles).toContain("transition: none !important");
  });
});
