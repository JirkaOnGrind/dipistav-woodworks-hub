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
import {
  V10_APPROVED_CANDIDATES,
  V10_ARTWORK_CANDIDATES,
} from "@/lib/product-artwork-v10-candidates";
import {
  V11_APPROVED_CANDIDATES,
  V11_ARTWORK_CANDIDATES,
} from "@/lib/product-artwork-v11-candidates";
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

function matchingOverride(
  candidates: readonly ArtworkSceneDefinition[],
  categoryId: string,
  illustrationVariant: string,
  quantity: number,
) {
  return candidates.find(
    (scene) =>
      scene.categoryId === categoryId &&
      (scene.illustrationVariant === illustrationVariant ||
        (scene.illustrationVariant === "slabs-*" && illustrationVariant.startsWith("slabs-"))) &&
      quantity >= scene.quantityBand.min &&
      (scene.quantityBand.max === undefined || quantity <= scene.quantityBand.max),
  );
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

  it("switches beams at truthful 3, 6, 9, 12 and 16-piece representative thresholds", () => {
    const category = PRODUCT_CATEGORIES.find((item) => item.id === "tramy")!;
    const variant = category.variants[0];
    const cases = [
      [1, "beam-occlusion-v3-1-master-v11.webp"],
      [2, "beam-occlusion-v3-2-master-v11.webp"],
      [3, "beam-occlusion-v3-3-4-master-v11.webp"],
      [4, "beam-occlusion-v3-3-4-master-v11.webp"],
      [5, "beam-occlusion-v3-5-8-master-v11.webp"],
      [8, "beam-occlusion-v3-5-8-master-v11.webp"],
      [9, "beam-occlusion-v3-9-11-master-v11.webp"],
      [11, "beam-occlusion-v3-9-11-master-v11.webp"],
      [12, "beam-occlusion-v3-12-15-master-v11.webp"],
      [15, "beam-occlusion-v3-12-15-master-v11.webp"],
      [16, "beam-occlusion-v3-16plus-master-v11.webp"],
      [20, "beam-occlusion-v3-16plus-master-v11.webp"],
    ] as const;
    for (const [quantity, filename] of cases) {
      expect(resolveArtworkScene(category.id, variant, quantity).scene.source).toContain(filename);
    }

    expect(resolveArtworkScene(category.id, variant, 9).scene.quantityBand).toEqual({
      min: 9,
      max: 11,
    });
    expect(resolveArtworkScene(category.id, variant, 12).scene.quantityBand).toEqual({
      min: 12,
      max: 15,
    });
    expect(resolveArtworkScene(category.id, variant, 16).scene.filter).toBeUndefined();

    const lockedBeamHashes = [
      [1, "3975b4fddbc00a8361466cb02075319291a04fc1d276bbb4c5b1e0799fa54aa6"],
      [2, "4340cd78802e2c6b96f80541a0931d1965df8cae358ec0ac7d5cc578214c8956"],
      [3, "8086603bdef7e6b3f3e1a9b3d62e11084fad0425377d017b536005cb993bda10"],
      [5, "70b81e86d861d739b6ef99dfd3c8f5d2a2cc53448fbe3af1ea7de710bf2af8f9"],
      [9, "8ed6f95b6fc9226543d82a1d132af83add2fa87828686edb3067c5ec94d10e4d"],
      [12, "3a92f20f8362c891209e63f67a298bc9a12450d20c8a18a4bd73334d24f008b7"],
      [16, "c25926059e552d4d4da621026ea81c6561cef1927b7b833c136173812a1a37e1"],
    ] as const;
    for (const [quantity, expectedHash] of lockedBeamHashes) {
      const path = filePath(resolveArtworkScene(category.id, variant, quantity).scene.source);
      expect(createHash("sha256").update(readFileSync(path)).digest("hex")).toBe(expectedHash);
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

  it("keeps approved v11 masters free from runtime dimensional distortion", () => {
    const category = PRODUCT_CATEGORIES.find((item) => item.id === "tramy")!;
    const variant = category.variants.find((item) => item.id === "beam-20x20-500")!;
    const { scene } = resolveArtworkScene(category.id, variant, 20);
    const requested = getArtworkRequestedScale(scene, variant);
    const transform = calculateSafeArtworkTransform(scene, requested);
    expect(scene.source).toContain("configurator-v11/beam-occlusion-v3-16plus-master-v11.webp");
    expect(scene.transformPolicy).toBe("none");
    expect(requested).toEqual({ x: 1, y: 1 });
    expect(transform.scaleX).toBe(1);
    expect(transform.scaleY).toBe(1);
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

  it("activates every v9 quantity band unless an approved v10 scene supersedes it", () => {
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
          const v10Override = matchingOverride(
            V10_ARTWORK_CANDIDATES,
            category.id,
            variant.illustrationVariant,
            quantity,
          );
          const v11Override = matchingOverride(
            V11_ARTWORK_CANDIDATES,
            category.id,
            variant.illustrationVariant,
            quantity,
          );
          expect(resolveArtworkScene(category.id, variant, quantity).scene.source).toBe(
            v11Override?.source ?? v10Override?.source ?? candidate.source,
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

describe("v10 production registry", () => {
  it("registers all 47 approved assets with existing files and truthful canvases", () => {
    expect(V10_ARTWORK_CANDIDATES).toHaveLength(47);
    expect(V10_APPROVED_CANDIDATES).toHaveLength(47);
    expect(new Set(V10_ARTWORK_CANDIDATES.map((scene) => scene.source)).size).toBe(47);

    for (const scene of V10_ARTWORK_CANDIDATES) {
      const path = filePath(scene.source);
      expect(scene.approvalStatus, scene.id).toBe("approved");
      expect(existsSync(path), scene.source).toBe(true);
      expect(readWebpCanvas(path), scene.source).toEqual(scene.canvas);
      expect(scene.alphaCoverage, scene.id).toBeGreaterThan(0);
      expect(scene.alphaBounds.x, scene.id).toBeGreaterThanOrEqual(scene.safeInset - 0.001);
      expect(scene.alphaBounds.y, scene.id).toBeGreaterThanOrEqual(scene.safeInset - 0.001);
      expect(scene.alphaBounds.x + scene.alphaBounds.width, scene.id).toBeLessThanOrEqual(
        1 - scene.safeInset + 0.001,
      );
      expect(scene.alphaBounds.y + scene.alphaBounds.height, scene.id).toBeLessThanOrEqual(
        1 - scene.safeInset + 0.001,
      );
      assertSafeFit(scene);
    }
  });

  it("activates every approved v10 quantity band unless v11 supersedes it", () => {
    for (const candidate of V10_ARTWORK_CANDIDATES) {
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
          const v11Override = matchingOverride(
            V11_ARTWORK_CANDIDATES,
            category.id,
            variant.illustrationVariant,
            quantity,
          );
          expect(resolveArtworkScene(category.id, variant, quantity).scene.source).toBe(
            v11Override?.source ?? candidate.source,
          );
        }
      }
    }
  });

  it("stores the approved representative counts and loose-firewood coverage ratio", () => {
    const representativeCount = (id: string) =>
      V10_ARTWORK_CANDIDATES.find((scene) => scene.id === id)?.representativeCount;

    expect(representativeCount("beam-1-composed-master-v10")).toBe(1);
    expect(representativeCount("beam-2-composed-master-v10")).toBe(2);
    expect(representativeCount("beam-3-4-composed-master-v11")).toBe(3);
    expect(representativeCount("beam-5-8-composed-master-v10")).toBe(6);
    expect(representativeCount("beam-9-11-composed-master-v10")).toBe(9);
    expect(representativeCount("beam-12-15-composed-master-v10")).toBe(12);
    expect(representativeCount("beam-16plus-composed-master-v10")).toBe(16);
    expect(representativeCount("plank-5-9-master-v10")).toBe(6);
    expect(representativeCount("lath-10-14-master-v10")).toBe(12);
    expect(representativeCount("pellets-set-5plus-master-v10")).toBe(50);
    expect(representativeCount("pellets-pallet-6plus-master-v10")).toBe(6);
    expect(representativeCount("slabs-3-4-master-v10")).toBe(4);

    const looseNinePlus = V10_ARTWORK_CANDIDATES.find(
      (scene) => scene.id === "firewood-loose-9plus-master-v10",
    )!;
    const looseFiveToEight = V9_ARTWORK_CANDIDATES.find(
      (scene) => scene.id === "firewood-loose-5-8-master-v9",
    )!;
    expect(looseNinePlus.alphaCoverage / looseFiveToEight.alphaCoverage).toBeGreaterThanOrEqual(
      1.3,
    );
  });
});

describe("v11 production registry", () => {
  it("registers four approved timber families and seven physical assets per family", () => {
    expect(V11_ARTWORK_CANDIDATES).toHaveLength(42);
    expect(V11_APPROVED_CANDIDATES).toHaveLength(42);
    expect(new Set(V11_ARTWORK_CANDIDATES.map((scene) => scene.source)).size).toBe(42);
    for (const scene of V11_ARTWORK_CANDIDATES) {
      expect(scene.approvalStatus).toBe("approved");
      expect(scene.styleVersion).toBe("v11");
      expect(scene.fitPolicy).toBe("adaptive-bounds");
      expect(scene.safeInset).toBe(0.07);
      expect(scene.transformPolicy).toBe("none");
      expect(scene.filter).toBeUndefined();
      expect(existsSync(filePath(scene.source)), scene.source).toBe(true);
      assertSafeFit(scene);
    }
  });

  it("resolves every plank quantity band to the approved family-matched v6 set", () => {
    const category = PRODUCT_CATEGORIES.find((item) => item.id === "fosny")!;
    const variant = category.variants[0];
    for (const quantity of [1, 2, 3, 6, 9, 12, 16]) {
      expect(resolveArtworkScene(category.id, variant, quantity).scene.source).toContain(
        "configurator-v11/plank-family-match-v6-",
      );
    }
  });

  it("maps sorted and unsorted board variants to their distinct approved source families", () => {
    const boards = PRODUCT_CATEGORIES.find((item) => item.id === "prkna")!;
    const expectedPrefix = {
      "board-sorted": "board-occlusion-v3",
      "board-unsorted-narrow": "board-unsorted-narrow-occlusion-v3",
      "board-unsorted-wide": "board-unsorted-wide-occlusion-v3",
    } as const;
    for (const variantName of Object.keys(expectedPrefix) as Array<keyof typeof expectedPrefix>) {
      const variant = boards.variants.find((item) => item.illustrationVariant === variantName)!;
      expect(resolveArtworkScene(boards.id, variant, 9).scene.source).toContain(
        `configurator-v11/${expectedPrefix[variantName]}-9-11-master-v11.webp`,
      );
    }
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
