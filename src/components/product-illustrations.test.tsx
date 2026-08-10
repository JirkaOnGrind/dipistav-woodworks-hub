import { existsSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ProductIllustration } from "@/components/product-illustrations";
import { getProductArtworkSources, resolveProductArtwork } from "@/lib/product-artwork";
import { PRODUCT_CATEGORIES } from "@/lib/product-catalog";

const quantities = [1, 2, 3, 4, 5, 8, 9, 10, 20];
const rasterCategories = PRODUCT_CATEGORIES.filter((category) => category.id !== "tramy");

describe("ProductIllustration", () => {
  it("vykreslí každou netrámovou variantu jako prémiový rastrový asset", () => {
    for (const category of rasterCategories) {
      for (const variant of category.variants) {
        for (const quantity of quantities) {
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

  it("odkazuje pouze na skutečně existující produkční soubory", () => {
    for (const category of rasterCategories) {
      for (const variant of category.variants) {
        for (const source of getProductArtworkSources(category.id, variant)) {
          expect(existsSync(join(process.cwd(), "public", source))).toBe(true);
        }
      }
    }
  });

  it("má pro pytel, set a paletu pelet tři odlišné master ilustrace", () => {
    const pellets = PRODUCT_CATEGORIES.find((category) => category.id === "pelety")!;
    const sources = pellets.variants.map(
      (variant) => resolveProductArtwork(pellets.id, variant, 1).source,
    );

    expect(new Set(sources).size).toBe(3);
  });

  it("mění dřevěný kus po prahu 1, 2, 3, 5, svazek a hustý svazek", () => {
    const boards = PRODUCT_CATEGORIES.find((category) => category.id === "prkna")!;
    const sorted = boards.variants.find((variant) => variant.modeId === "sorted")!;
    const sources = [1, 2, 3, 5, 10, 15].map(
      (quantity) => resolveProductArtwork(boards.id, sorted, quantity).source,
    );

    expect(new Set(sources).size).toBe(6);
  });

  it("u paliv opakuje celou zvolenou prodejní jednotku", () => {
    const pellets = PRODUCT_CATEGORIES.find((category) => category.id === "pelety")!;
    const bag = pellets.variants.find((variant) => variant.illustrationVariant === "pellets-bag")!;
    const markup = renderToStaticMarkup(
      <ProductIllustration
        categoryId={pellets.id}
        quantity={3}
        variant={bag}
        title="Osm pytlů pelet"
      />,
    );

    expect(markup).toContain('data-selling-unit-count="3"');
    expect(markup.match(/data-selling-unit="true"/g)).toHaveLength(3);
  });

  it("skládá vyšší počet palet z odlišitelného masteru zvolené varianty", () => {
    const firewood = PRODUCT_CATEGORIES.find((category) => category.id === "stipane-drevo")!;
    const pallet = firewood.variants.find(
      (variant) => variant.illustrationVariant === "firewood-pallet",
    )!;
    const markup = renderToStaticMarkup(
      <ProductIllustration
        categoryId={firewood.id}
        quantity={15}
        variant={pallet}
        title="Patnáct palet"
      />,
    );

    expect(markup).toContain('data-selling-unit-count="8"');
    expect(markup.match(/data-selling-unit="true"/g)).toHaveLength(8);
    expect(markup).toContain("drevo-paleta-v4.webp");
    expect(markup).not.toContain("firewood-pallet-group-high-v5.webp");
  });

  it("použije pro patnáct a více netříděných prken samostatný hustý master", () => {
    const boards = PRODUCT_CATEGORIES.find((category) => category.id === "prkna")!;
    const unsorted = boards.variants.find((variant) => variant.modeId === "unsorted")!;
    const sources = [1, 2, 3, 5, 10, 15].map(
      (quantity) => resolveProductArtwork(boards.id, unsorted, quantity).source,
    );

    expect(new Set(sources).size).toBe(6);
    expect(sources.at(-1)).toContain("prkno-unsorted-dense-v7.webp");
  });

  it("od devíti balení volného dřeva používá jednu souvislou hromadu", () => {
    const firewood = PRODUCT_CATEGORIES.find((category) => category.id === "stipane-drevo")!;
    const loose = firewood.variants.find(
      (variant) => variant.illustrationVariant === "firewood-loose",
    )!;
    const markup = renderToStaticMarkup(
      <ProductIllustration
        categoryId={firewood.id}
        quantity={9}
        variant={loose}
        title="Velká hromada volného dřeva"
      />,
    );

    expect(markup).toContain("data-product-composition");
    expect(markup).toContain("firewood-loose-pile-v7.webp");
    expect(markup.match(/<img/g)).toHaveLength(1);
  });

  it("ukáže u peletové palety až čtyři rozlišitelné jednotky", () => {
    const pellets = PRODUCT_CATEGORIES.find((category) => category.id === "pelety")!;
    const pallet = pellets.variants.find(
      (variant) => variant.illustrationVariant === "pellets-pallet",
    )!;
    const markup = renderToStaticMarkup(
      <ProductIllustration
        categoryId={pellets.id}
        quantity={4}
        variant={pallet}
        title="4 palety"
      />,
    );

    expect(markup).toContain('data-selling-unit-count="4"');
    expect(markup.match(/data-selling-unit="true"/g)).toHaveLength(4);
  });

  it("zobrazuje u samostatných pelet čitelné prahy 20 a 30 pytlů", () => {
    const pellets = PRODUCT_CATEGORIES.find((category) => category.id === "pelety")!;
    const bag = pellets.variants.find((variant) => variant.illustrationVariant === "pellets-bag")!;

    for (const [quantity, expected] of [
      [20, 20],
      [30, 30],
    ] as const) {
      const markup = renderToStaticMarkup(
        <ProductIllustration
          categoryId={pellets.id}
          quantity={quantity}
          variant={bag}
          title={`${quantity} pytlů pelet`}
        />,
      );

      expect(markup).toContain(`data-selling-unit-count="${expected}"`);
      expect(markup.match(/data-selling-unit="true"/g)).toHaveLength(expected);
    }
  });

  it("u velkých objednávek pelet nikdy nekreslí víc než třicet pytlů", () => {
    const pellets = PRODUCT_CATEGORIES.find((category) => category.id === "pelety")!;
    const bag = pellets.variants.find((variant) => variant.illustrationVariant === "pellets-bag")!;
    const set = pellets.variants.find((variant) => variant.illustrationVariant === "pellets-set")!;

    const bagMarkup = renderToStaticMarkup(
      <ProductIllustration
        categoryId={pellets.id}
        quantity={100}
        variant={bag}
        title="100 pytlů"
      />,
    );
    const setMarkup = renderToStaticMarkup(
      <ProductIllustration categoryId={pellets.id} quantity={100} variant={set} title="100 setů" />,
    );

    expect(bagMarkup).toContain('data-selling-unit-count="30"');
    expect(bagMarkup.match(/data-selling-unit="true"/g)).toHaveLength(30);
    expect(setMarkup).toContain('data-selling-unit-count="30"');
    expect(setMarkup.match(/data-selling-unit="true"/g)).toHaveLength(30);
    expect(setMarkup).toContain("pelety-pytel-v3.webp");
  });

  it("zobrazuje čtyři krajinky jako čtyři samostatné balíky", () => {
    const slabs = PRODUCT_CATEGORIES.find((category) => category.id === "krajinky")!;
    const variant = slabs.variants[0];
    const markup = renderToStaticMarkup(
      <ProductIllustration categoryId={slabs.id} quantity={4} variant={variant} title="4 balíky" />,
    );

    expect(markup).toContain('data-selling-unit-count="4"');
    expect(markup.match(/data-selling-unit="true"/g)).toHaveLength(4);
  });

  it("přidává krajinkám druhý prostorový stupeň od devíti balíků", () => {
    const slabs = PRODUCT_CATEGORIES.find((category) => category.id === "krajinky")!;
    const variant = slabs.variants[0];
    const markup = renderToStaticMarkup(
      <ProductIllustration categoryId={slabs.id} quantity={9} variant={variant} title="9 balíků" />,
    );

    expect(markup).toContain('data-composition-unit-count="2"');
    expect(markup.match(/<img/g)).toHaveLength(2);
  });
});
