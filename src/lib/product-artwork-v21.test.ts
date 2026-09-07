import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { getArtworkPreloadSources, resolveArtworkScene } from "@/lib/product-artwork";
import { PRODUCT_CATEGORIES } from "@/lib/product-catalog";

const category = PRODUCT_CATEGORIES.find((item) => item.id === "pelety")!;
const bag = category.variants.find((item) => item.illustrationVariant === "pellets-bag")!;
const set = category.variants.find((item) => item.illustrationVariant === "pellets-set")!;
const pallet = category.variants.find((item) => item.illustrationVariant === "pellets-pallet")!;

function sourceQuantity(quantity: number, variant = bag) {
  const source = resolveArtworkScene(category.id, variant, quantity).scene.source;
  return Number(source.match(/pellets-(\d+)-v21/)?.[1]);
}

describe("v21 pellet resolver boundaries", () => {
  it.each([
    [1, 1, 0.94],
    [2, 2, 0.9475],
    [3, 3, 0.955],
    [5, 3, 0.955],
    [6, 6, 0.9625],
    [8, 6, 0.9625],
    [9, 9, 0.97],
    [11, 9, 0.97],
    [12, 12, 0.9775],
    [14, 12, 0.9775],
    [15, 15, 0.985],
    [20, 15, 0.985],
    [21, 21, 0.9925],
    [23, 21, 0.9925],
    [24, 24, 1],
    [500, 24, 1],
  ])("maps %i bags to FINAL%i at scale %f", (quantity, expectedSource, expectedScale) => {
    const scene = resolveArtworkScene(category.id, bag, quantity).scene;
    expect(sourceQuantity(quantity)).toBe(expectedSource);
    expect(scene.previewScale).toBe(expectedScale);
  });

  it.each([
    [1, 12, 0.94],
    [2, 21, 0.97],
    [3, 28, 1],
    [4, 28, 1],
    [500, 28, 1],
  ])("maps %i ten-bag sets to FINAL%i at scale %f", (quantity, expectedSource, expectedScale) => {
    const scene = resolveArtworkScene(category.id, set, quantity).scene;
    expect(sourceQuantity(quantity, set)).toBe(expectedSource);
    expect(scene.previewScale).toBe(expectedScale);
    expect(getArtworkPreloadSources(category.id, set, quantity)).toEqual([scene.source]);
  });

  it("keeps the approved 975 kg pallet source in the modular compositor", () => {
    const scene = resolveArtworkScene(category.id, pallet, 1).scene;
    expect(scene.renderMode).toBe("modular-pallet");
    expect(scene.palletProfile).toBe("pellets-975");
    expect(scene.source).toBe(
      "/images/illustrations/configurator-v33/pellets-pallet-975-crisp-v33.webp",
    );
  });

  it("keeps the existing commercial quantity and price policy", () => {
    expect(category.quantityPolicy).toEqual({ min: 1, max: 500, step: 1, sliderMax: 20 });
    expect(bag.pricing).toMatchObject({ basis: "piece", rate: 129 });
    expect(set.pricing).toMatchObject({ basis: "piece", rate: 1190 });
    expect(pallet.pricing).toMatchObject({ basis: "piece", rate: 7490 });
  });
});

describe("v21 generated asset manifest", () => {
  it("contains ten inputs and twenty responsive transparent WebP derivatives", () => {
    const root = join(process.cwd(), "public", "images", "illustrations", "configurator-v21");
    const manifest = JSON.parse(readFileSync(join(root, "manifest.json"), "utf8")) as {
      version: number;
      entries: Array<{
        derivatives: Array<{
          source: string;
          width: number;
          budget: number;
          budgetPass: boolean;
          quality: number;
        }>;
      }>;
    };

    expect(manifest.version).toBe(21);
    expect(manifest.entries).toHaveLength(10);
    expect(manifest.entries.flatMap((entry) => entry.derivatives)).toHaveLength(20);
    for (const derivative of manifest.entries.flatMap((entry) => entry.derivatives)) {
      const path = join(process.cwd(), "public", derivative.source.replace(/^\//, ""));
      expect(existsSync(path), derivative.source).toBe(true);
      expect(derivative.width === 768 || derivative.width === 1536).toBe(true);
      expect(statSync(path).size, derivative.source).toBeLessThan(derivative.budget * 1.06);
      if (!derivative.budgetPass) expect(derivative.quality).toBe(86);
    }
  });
});
