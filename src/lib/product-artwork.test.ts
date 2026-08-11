import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { APPROVED_ARTWORK_SHA256 } from "@/lib/approved-artwork-hashes";
import {
  calculateSafeArtworkTransform,
  getArtworkPreloadSources,
  getArtworkRequestedScale,
  getArtworkSceneFamily,
  resolveArtworkScene,
  type ArtworkSceneDefinition,
} from "@/lib/product-artwork";
import {
  V9_APPROVAL_CANDIDATES,
  V9_APPROVED_CANDIDATES,
  V9_ARTWORK_CANDIDATES,
} from "@/lib/product-artwork-v9-candidates";
import { PRODUCT_CATEGORIES } from "@/lib/product-catalog";

function filePath(source: string) {
  return join(process.cwd(), "public", source.replace(/^\//, ""));
}

function readWebpCanvas(path: string) {
  const data = readFileSync(path);
  const chunk = data.toString("ascii", 12, 16);
  if (chunk === "VP8X") {
    return {
      width: data.readUIntLE(24, 3) + 1,
      height: data.readUIntLE(27, 3) + 1,
    };
  }
  if (chunk === "VP8L") {
    const bits = data.readUInt32LE(21);
    return {
      width: (bits & 0x3fff) + 1,
      height: ((bits >> 14) & 0x3fff) + 1,
    };
  }
  if (chunk === "VP8 ") {
    return {
      width: data.readUInt16LE(26) & 0x3fff,
      height: data.readUInt16LE(28) & 0x3fff,
    };
  }
  throw new Error(`Unsupported WebP chunk ${chunk} in ${path}`);
}

function assertSafeFit(scene: ArtworkSceneDefinition) {
  const transform = calculateSafeArtworkTransform(scene, { x: 1.4, y: 1.4 });
  const left =
    0.5 + (scene.alphaBounds.x - 0.5) * transform.scaleX + transform.translateXPercent / 100;
  const right = left + scene.alphaBounds.width * transform.scaleX;
  const top =
    0.5 + (scene.alphaBounds.y - 0.5) * transform.scaleY + transform.translateYPercent / 100;
  const bottom = top + scene.alphaBounds.height * transform.scaleY;
  expect(left).toBeGreaterThanOrEqual(scene.safeInset - 0.0001);
  expect(top).toBeGreaterThanOrEqual(scene.safeInset - 0.0001);
  expect(right).toBeLessThanOrEqual(1 - scene.safeInset + 0.0001);
  expect(bottom).toBeLessThanOrEqual(1 - scene.safeInset + 0.0001);
}

describe("ArtworkSceneDefinition production registry", () => {
  it("resolves every catalog variant without band gaps and with non-decreasing mass", () => {
    for (const category of PRODUCT_CATEGORIES) {
      for (const variant of category.variants) {
        const family = getArtworkSceneFamily(category.id, variant);
        for (let index = 1; index < family.length; index += 1) {
          const previous = family[index - 1];
          const current = family[index];
          expect(current.quantityBand.min).toBe(
            (previous.quantityBand.max ?? current.quantityBand.min - 1) + 1,
          );
          expect(current.visualMassRank).toBeGreaterThanOrEqual(previous.visualMassRank);
        }
        for (const quantity of [1, 2, 3, 4, 5, 8, 9, 10, 14, 15, 16, 20, 100]) {
          expect(resolveArtworkScene(category.id, variant, quantity).scene.source).toMatch(
            /\.webp$/,
          );
        }
      }
    }
  });

  it("uses the exact existing widget bands and assets for category/tramy", () => {
    const category = PRODUCT_CATEGORIES.find((item) => item.id === "tramy")!;
    const variant = category.variants[0];
    const cases = [
      [1, "beam-1-v4.webp"],
      [2, "beam-2-v4.webp"],
      [3, "beam-3-v4.webp"],
      [5, "beam-bundle-6-seams-master-v2.webp"],
      [11, "beam-12-v4.webp"],
      [16, "beam-16-v4.webp"],
    ] as const;
    for (const [quantity, filename] of cases) {
      expect(resolveArtworkScene(category.id, variant, quantity).scene.source).toContain(filename);
    }
  });

  it("preloads only current and adjacent quantity bands", () => {
    for (const category of PRODUCT_CATEGORIES) {
      const variant = category.variants[0];
      const sources = getArtworkPreloadSources(category.id, variant, 5);
      expect(sources.length).toBeLessThanOrEqual(3);
      expect(sources[0]).toBe(resolveArtworkScene(category.id, variant, 5).scene.source);
    }
  });

  it("references existing production files with truthful canvas metadata", () => {
    const visited = new Set<string>();
    for (const category of PRODUCT_CATEGORIES) {
      for (const variant of category.variants) {
        for (const scene of getArtworkSceneFamily(category.id, variant)) {
          if (visited.has(scene.source)) continue;
          visited.add(scene.source);
          const path = filePath(scene.source);
          expect(existsSync(path), scene.source).toBe(true);
          expect(readWebpCanvas(path), scene.source).toEqual(scene.canvas);
          assertSafeFit(scene);
        }
      }
    }
  });

  it("keeps beam dimension transforms inside the six-percent safe inset", () => {
    const category = PRODUCT_CATEGORIES.find((item) => item.id === "tramy")!;
    const variant = category.variants.find((item) => item.id === "beam-20x20-500")!;
    const { scene } = resolveArtworkScene(category.id, variant, 20);
    const requested = getArtworkRequestedScale(scene, variant);
    const transform = calculateSafeArtworkTransform(scene, requested);
    expect(scene.id).toBe("beam-16-plus");
    expect(scene.transformPolicy).toBe("beam");
    expect(transform.scaleX).toBeLessThanOrEqual(transform.maxSafeScaleX);
    expect(transform.scaleY).toBeLessThanOrEqual(transform.maxSafeScaleY);
  });
});

describe("v9 production registry", () => {
  it("defines all 47 masters and preserves the seven explicitly locked files", () => {
    expect(V9_ARTWORK_CANDIDATES).toHaveLength(47);
    expect(V9_APPROVED_CANDIDATES).toHaveLength(7);
    expect(V9_APPROVAL_CANDIDATES).toHaveLength(40);
    for (const scene of V9_ARTWORK_CANDIDATES) {
      const path = filePath(scene.source);
      expect(existsSync(path), scene.source).toBe(true);
      expect(readWebpCanvas(path), scene.source).toEqual(scene.canvas);
      expect(scene.alphaCoverage, scene.id).toBeGreaterThan(0);
      expect(scene.alphaBounds.x, scene.id).toBeGreaterThanOrEqual(0.059);
      expect(scene.alphaBounds.y, scene.id).toBeGreaterThanOrEqual(0.059);
      expect(scene.alphaBounds.x + scene.alphaBounds.width, scene.id).toBeLessThanOrEqual(0.941);
      expect(scene.alphaBounds.y + scene.alphaBounds.height, scene.id).toBeLessThanOrEqual(0.941);
    }
  });

  it("activates every v9 quantity band in the production resolver", () => {
    for (const candidate of V9_ARTWORK_CANDIDATES) {
      const category = PRODUCT_CATEGORIES.find((item) => item.id === candidate.categoryId)!;
      const variants = category.variants.filter(
        (variant) =>
          variant.illustrationVariant === candidate.illustrationVariant ||
          (candidate.illustrationVariant === "slabs-*" &&
            variant.illustrationVariant.startsWith("slabs-")),
      );
      expect(variants.length, candidate.id).toBeGreaterThan(0);
      for (const variant of variants) {
        const quantities = [candidate.quantityBand.min, candidate.quantityBand.max].filter(
          (quantity): quantity is number => quantity !== undefined,
        );
        for (const quantity of quantities) {
          expect(resolveArtworkScene(category.id, variant, quantity).scene.source).toBe(
            candidate.source,
          );
        }
      }
    }
  });

  it("keeps represented visual mass strictly increasing inside every v9 family", () => {
    const families = new Map<string, typeof V9_ARTWORK_CANDIDATES>();
    for (const scene of V9_ARTWORK_CANDIDATES) {
      const key = `${scene.categoryId}:${scene.illustrationVariant}`;
      families.set(key, [...(families.get(key) ?? []), scene]);
    }
    for (const [key, scenes] of families) {
      const sorted = [...scenes].sort((a, b) => a.quantityBand.min - b.quantityBand.min);
      for (let index = 1; index < sorted.length; index += 1) {
        const previousMass =
          sorted[index - 1].alphaCoverage * sorted[index - 1].representativeCount;
        const currentMass = sorted[index].alphaCoverage * sorted[index].representativeCount;
        expect(currentMass, `${key}:${sorted[index].id}`).toBeGreaterThan(previousMass);
      }
    }
  });

  it("encodes the critical counts and physical constraints in candidate metadata", () => {
    expect(
      V9_ARTWORK_CANDIDATES.find((scene) => scene.id === "pellets-set-1-master-v9")
        ?.representativeCount,
    ).toBe(10);
    expect(
      V9_ARTWORK_CANDIDATES.find((scene) => scene.id === "slabs-4-master-v9")?.representativeCount,
    ).toBe(4);
    expect(
      V9_ARTWORK_CANDIDATES.find((scene) => scene.id === "firewood-loose-9plus-master-v9")
        ?.visualMassRank,
    ).toBe(4);

    const bigBagFiveToEight = V9_ARTWORK_CANDIDATES.find(
      (scene) => scene.id === "firewood-bigbag-5-8-master-v9",
    );
    const bigBagNinePlus = V9_ARTWORK_CANDIDATES.find(
      (scene) => scene.id === "firewood-bigbag-9plus-master-v9",
    );
    const alphaFootprint = (scene: (typeof V9_ARTWORK_CANDIDATES)[number] | undefined) =>
      (scene?.alphaBounds.width ?? 0) * (scene?.alphaBounds.height ?? 0);

    expect(alphaFootprint(bigBagNinePlus)).toBeGreaterThan(alphaFootprint(bigBagFiveToEight));
  });
});

describe("approved asset hashes", () => {
  it("protects approved legacy assets and locked v9 masters from accidental changes", () => {
    for (const [relativePath, expected] of Object.entries(APPROVED_ARTWORK_SHA256)) {
      const actual = createHash("sha256")
        .update(readFileSync(join(process.cwd(), relativePath)))
        .digest("hex");
      expect(actual, relativePath).toBe(expected);
    }
  });
});
