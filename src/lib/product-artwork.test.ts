import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { APPROVED_ARTWORK_SHA256 } from "@/lib/approved-artwork-hashes";
import { FIREWOOD_ARTWORK } from "@/lib/firewood-artwork";
import { SLAB_BUNDLE_ARTWORK } from "@/lib/slab-bundle-artwork";
import { PALLET_SOURCE_PROFILES } from "@/lib/pallet-composition";
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
import {
  V12_APPROVED_CANDIDATES,
  V12_ARTWORK_CANDIDATES,
} from "@/lib/product-artwork-v12-candidates";
import { V12_ARTWORK_METADATA } from "@/lib/product-artwork-v12-metadata";
import {
  V13_APPROVED_CANDIDATES,
  V13_ARTWORK_CANDIDATES,
} from "@/lib/product-artwork-v13-candidates";
import { V13_ARTWORK_METADATA } from "@/lib/product-artwork-v13-metadata";
import {
  V15_APPROVED_CANDIDATES,
  V15_ARTWORK_CANDIDATES,
} from "@/lib/product-artwork-v15-candidates";
import { V15_ARTWORK_METADATA } from "@/lib/product-artwork-v15-metadata";
import {
  V16_APPROVED_CANDIDATES,
  V16_ARTWORK_CANDIDATES,
} from "@/lib/product-artwork-v16-candidates";
import { V16_ARTWORK_METADATA } from "@/lib/product-artwork-v16-metadata";
import { V19_ARTWORK_CANDIDATES } from "@/lib/product-artwork-v19-candidates";
import { V20_ARTWORK_CANDIDATES } from "@/lib/product-artwork-v20-candidates";
import { getTimberDisplayCount, getTimberDynamicFamily } from "@/lib/timber-dynamic-artwork";
import {
  V21_APPROVED_CANDIDATES,
  V21_ARTWORK_CANDIDATES,
} from "@/lib/product-artwork-v21-candidates";
import {
  V33_APPROVED_CANDIDATES,
  V33_ARTWORK_CANDIDATES,
} from "@/lib/product-artwork-v33-candidates";
import { PRODUCT_CATEGORIES } from "@/lib/product-catalog";

function filePath(source: string) {
  return join(process.cwd(), "public", source.replace(/^\//, ""));
}

function readArtworkCanvas(path: string) {
  const data = readFileSync(path);
  if (path.endsWith(".svg")) {
    const root = data.toString("utf8").match(/<svg\b[^>]*>/)![0];
    return {
      width: Number(root.match(/\bwidth="(\d+)"/)![1]),
      height: Number(root.match(/\bheight="(\d+)"/)![1]),
    };
  }
  if (data.subarray(1, 4).toString("ascii") === "PNG") {
    return { width: data.readUInt32BE(16), height: data.readUInt32BE(20) };
  }
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

function matchesIllustrationVariant(candidate: string, catalogVariant: string) {
  return (
    candidate === catalogVariant ||
    (candidate === "pallet-16" &&
      (catalogVariant === "pallet-25-16" || catalogVariant === "pallet-33-16")) ||
    (candidate === "slabs-*" && catalogVariant.startsWith("slabs-"))
  );
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
      matchesIllustrationVariant(scene.illustrationVariant, illustrationVariant) &&
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
            /\.(?:webp|png|svg)$/,
          );
        }
      }
    }
  });

  it("switches beams at every exact quantity and caps the visual stack at thirty", () => {
    const category = PRODUCT_CATEGORIES.find((item) => item.id === "tramy")!;
    const variant = category.variants[0];
    for (let quantity = 1; quantity <= 30; quantity += 1) {
      const scene = resolveArtworkScene(category.id, variant, quantity).scene;
      expect(scene.source).toContain(
        `/beam-${quantity}-master-${quantity > 20 ? "v40" : "v35"}.webp`,
      );
      expect(scene.quantityBand).toEqual({ min: quantity, max: quantity });
      expect(scene.representativeCount).toBe(quantity);
    }
    expect(resolveArtworkScene(category.id, variant, 100).scene.source).toContain(
      "/beam-30-master-v40.webp",
    );

    for (const quantity of [1, 2]) {
      const dynamic = filePath(resolveArtworkScene(category.id, variant, quantity).scene.source);
      const approved = `public/images/illustrations/configurator-v11/beam-occlusion-v3-${quantity}-master-v11.webp`;
      expect(readFileSync(dynamic).equals(readFileSync(approved))).toBe(true);
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
          expect(readArtworkCanvas(path), scene.source).toEqual(scene.canvas);
          assertSafeFit(scene);
        }
      }
    }
  });

  it("keeps dynamic timber masters free from runtime dimensional distortion", () => {
    const category = PRODUCT_CATEGORIES.find((item) => item.id === "tramy")!;
    const variant = category.variants.find((item) => item.id === "beam-20x20-500")!;
    const { scene } = resolveArtworkScene(category.id, variant, 20);
    const requested = getArtworkRequestedScale(scene, variant);
    const transform = calculateSafeArtworkTransform(scene, requested);
    expect(scene.source).toContain("timber-dynamic-v35/beam-20-master-v35.webp");
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
      expect(readArtworkCanvas(path), scene.source).toEqual(scene.canvas);
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
      const variants = category.variants.filter((variant) =>
        matchesIllustrationVariant(candidate.illustrationVariant, variant.illustrationVariant),
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
          const v12Override = matchingOverride(
            V12_ARTWORK_CANDIDATES,
            category.id,
            variant.illustrationVariant,
            quantity,
          );
          const v13Override = matchingOverride(
            V13_ARTWORK_CANDIDATES,
            category.id,
            variant.illustrationVariant,
            quantity,
          );
          const v15Override = matchingOverride(
            V15_ARTWORK_CANDIDATES,
            category.id,
            variant.illustrationVariant,
            quantity,
          );
          const v16Override = matchingOverride(
            V16_ARTWORK_CANDIDATES,
            category.id,
            variant.illustrationVariant,
            quantity,
          );
          const v19Override = matchingOverride(
            V19_ARTWORK_CANDIDATES,
            category.id,
            variant.illustrationVariant,
            quantity,
          );
          const v20Override = matchingOverride(
            V20_ARTWORK_CANDIDATES,
            category.id,
            variant.illustrationVariant,
            quantity,
          );
          const v21Override = matchingOverride(
            V21_ARTWORK_CANDIDATES,
            category.id,
            variant.illustrationVariant,
            quantity,
          );
          const v33Override = matchingOverride(
            V33_ARTWORK_CANDIDATES,
            category.id,
            variant.illustrationVariant,
            quantity,
          );
          const resolved = resolveArtworkScene(category.id, variant, quantity).scene;
          if (getTimberDynamicFamily(category.id, variant)) {
            expect(resolved.styleVersion).toBe(
              getTimberDisplayCount(variant, quantity) > 20
                ? "v40"
                : variant.illustrationVariant === "plank"
                  ? "v39"
                  : "v35",
            );
            expect(resolved.representativeCount).toBe(getTimberDisplayCount(variant, quantity));
          } else if (resolved.renderMode === "modular-pallet") {
            expect(resolved.palletProfile).toBeDefined();
            expect(resolved.source).toBe(PALLET_SOURCE_PROFILES[resolved.palletProfile!].source);
          } else {
            expect(resolved.source).toBe(
              matchingOverride(
                SLAB_BUNDLE_ARTWORK,
                category.id,
                variant.illustrationVariant,
                quantity,
              )?.source ??
                matchingOverride(
                  FIREWOOD_ARTWORK,
                  category.id,
                  variant.illustrationVariant,
                  quantity,
                )?.source ??
                v33Override?.source ??
                v21Override?.source ??
                v20Override?.source ??
                v19Override?.source ??
                v16Override?.source ??
                v15Override?.source ??
                v13Override?.source ??
                v12Override?.source ??
                v11Override?.source ??
                v10Override?.source ??
                candidate.source,
            );
          }
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
      expect(readArtworkCanvas(path), scene.source).toEqual(scene.canvas);
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
      const variants = category.variants.filter((variant) =>
        matchesIllustrationVariant(candidate.illustrationVariant, variant.illustrationVariant),
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
          const v12Override = matchingOverride(
            V12_ARTWORK_CANDIDATES,
            category.id,
            variant.illustrationVariant,
            quantity,
          );
          const v13Override = matchingOverride(
            V13_ARTWORK_CANDIDATES,
            category.id,
            variant.illustrationVariant,
            quantity,
          );
          const v15Override = matchingOverride(
            V15_ARTWORK_CANDIDATES,
            category.id,
            variant.illustrationVariant,
            quantity,
          );
          const v16Override = matchingOverride(
            V16_ARTWORK_CANDIDATES,
            category.id,
            variant.illustrationVariant,
            quantity,
          );
          const v19Override = matchingOverride(
            V19_ARTWORK_CANDIDATES,
            category.id,
            variant.illustrationVariant,
            quantity,
          );
          const v20Override = matchingOverride(
            V20_ARTWORK_CANDIDATES,
            category.id,
            variant.illustrationVariant,
            quantity,
          );
          const v21Override = matchingOverride(
            V21_ARTWORK_CANDIDATES,
            category.id,
            variant.illustrationVariant,
            quantity,
          );
          const v33Override = matchingOverride(
            V33_ARTWORK_CANDIDATES,
            category.id,
            variant.illustrationVariant,
            quantity,
          );
          const resolved = resolveArtworkScene(category.id, variant, quantity).scene;
          if (getTimberDynamicFamily(category.id, variant)) {
            expect(resolved.styleVersion).toBe(
              getTimberDisplayCount(variant, quantity) > 20
                ? "v40"
                : variant.illustrationVariant === "plank"
                  ? "v39"
                  : "v35",
            );
            expect(resolved.representativeCount).toBe(getTimberDisplayCount(variant, quantity));
          } else if (resolved.renderMode === "modular-pallet") {
            expect(resolved.palletProfile).toBeDefined();
            expect(resolved.source).toBe(PALLET_SOURCE_PROFILES[resolved.palletProfile!].source);
          } else {
            expect(resolved.source).toBe(
              matchingOverride(
                SLAB_BUNDLE_ARTWORK,
                category.id,
                variant.illustrationVariant,
                quantity,
              )?.source ??
                matchingOverride(
                  FIREWOOD_ARTWORK,
                  category.id,
                  variant.illustrationVariant,
                  quantity,
                )?.source ??
                v33Override?.source ??
                v21Override?.source ??
                v20Override?.source ??
                v19Override?.source ??
                v16Override?.source ??
                v15Override?.source ??
                v13Override?.source ??
                v12Override?.source ??
                v11Override?.source ??
                candidate.source,
            );
          }
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

  it("resolves every plank quantity to the refined v39 texture set", () => {
    const category = PRODUCT_CATEGORIES.find((item) => item.id === "fosny")!;
    const variant = category.variants[0];
    for (const quantity of [1, 2, 3, 6, 9, 12, 16]) {
      expect(resolveArtworkScene(category.id, variant, quantity).scene.source).toContain(
        `plank-v39/plank-${quantity}-master-v39.webp`,
      );
    }
  });

  it("maps sorted and unsorted board variants to their distinct approved source families", () => {
    const boards = PRODUCT_CATEGORIES.find((item) => item.id === "prkna")!;
    const expectedPrefix = {
      "board-sorted": "board-sorted",
      "board-unsorted-narrow": "board-unsorted-narrow",
      "board-unsorted-wide": "board-unsorted-wide",
    } as const;
    for (const variantName of Object.keys(expectedPrefix) as Array<keyof typeof expectedPrefix>) {
      const variant = boards.variants.find((item) => item.illustrationVariant === variantName)!;
      const requestedQuantity = variant.modeId === "unsorted" ? 1 : 9;
      const expectedCount = variant.modeId === "unsorted" ? 5 : 9;
      expect(resolveArtworkScene(boards.id, variant, requestedQuantity).scene.source).toContain(
        `timber-dynamic-v35/${expectedPrefix[variantName]}-${expectedCount}-master-v35.webp`,
      );
    }
  });
});

describe("v12 loose-firewood production registry", () => {
  it("activates the five approved contiguous quantity bands as whole-pile masters", () => {
    expect(V12_ARTWORK_CANDIDATES).toHaveLength(5);
    expect(V12_APPROVED_CANDIDATES).toHaveLength(5);
    expect(V12_ARTWORK_CANDIDATES.map((scene) => scene.quantityBand)).toEqual([
      { min: 1, max: 2 },
      { min: 3, max: 4 },
      { min: 5, max: 8 },
      { min: 9, max: 15 },
      { min: 16 },
    ]);

    const category = PRODUCT_CATEGORIES.find((item) => item.id === "stipane-drevo")!;
    const variant = category.variants.find(
      (item) => item.illustrationVariant === "firewood-loose",
    )!;
    for (const quantity of [1, 2, 3, 4, 5, 8, 9, 15, 16, 500]) {
      const scene = resolveArtworkScene(category.id, variant, quantity).scene;
      expect(scene.renderMode).toBe("master");
      expect(scene.styleVersion).toBe("v36");
      const imageQuantity = Math.min(quantity, 10);
      expect(scene.source).toBe(
        `/images/illustrations/firewood-v36/firewood-${imageQuantity}.webp`,
      );
    }
  });

  it("stores truthful metadata and byte locks for every approved master", () => {
    for (const scene of V12_ARTWORK_CANDIDATES) {
      const path = filePath(scene.source);
      const metadata = V12_ARTWORK_METADATA[scene.id];
      expect(existsSync(path), scene.source).toBe(true);
      expect(readArtworkCanvas(path), scene.source).toEqual(metadata.canvas);
      expect(scene.alphaBounds).toEqual(metadata.alphaBounds);
      expect(scene.opticalCenter).toEqual(metadata.opticalCenter);
      expect(scene.alphaCoverage).toBe(metadata.alphaCoverage);
      expect(createHash("sha256").update(readFileSync(path)).digest("hex")).toBe(
        metadata.outputSha256,
      );
      assertSafeFit(scene);
    }
  });

  it("keeps distinct loose-firewood masters on stable production URLs", () => {
    const category = PRODUCT_CATEGORIES.find((item) => item.id === "stipane-drevo")!;
    const variant = category.variants.find(
      (item) => item.illustrationVariant === "firewood-loose",
    )!;
    const runtimeScenes = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(
      (quantity) => resolveArtworkScene(category.id, variant, quantity).scene,
    );
    const hashes = new Set<string>();
    for (const scene of runtimeScenes) {
      const path = filePath(scene.source);
      expect(readArtworkCanvas(path)).toEqual({ width: 1536, height: 1024 });
      expect(scene.responsiveSources).toBeUndefined();
      hashes.add(createHash("sha256").update(readFileSync(path)).digest("hex"));
    }
    expect(hashes.size).toBe(runtimeScenes.length);
    for (const quantity of [2, 4, 6, 7, 10]) {
      const digest = (path: string) =>
        createHash("sha256").update(readFileSync(path)).digest("hex");
      expect(digest(filePath(`/images/illustrations/firewood-v36/firewood-${quantity}.png`))).toBe(
        digest(`artifacts/firewood-steps-2026-09-06/firewood-${quantity}-packages.png`),
      );
    }
  });
});

describe("v13 loose-firewood production override", () => {
  it("locks the approved 9–15 master and truthful metadata", () => {
    expect(V13_ARTWORK_CANDIDATES).toHaveLength(1);
    expect(V13_APPROVED_CANDIDATES).toHaveLength(1);
    const scene = V13_ARTWORK_CANDIDATES[0];
    const metadata = V13_ARTWORK_METADATA[scene.id];
    const path = filePath(scene.source);
    expect(existsSync(path)).toBe(true);
    expect(readArtworkCanvas(path)).toEqual(metadata.canvas);
    expect(scene.alphaBounds).toEqual(metadata.alphaBounds);
    expect(scene.opticalCenter).toEqual(metadata.opticalCenter);
    expect(scene.alphaCoverage).toBe(metadata.alphaCoverage);
    expect(createHash("sha256").update(readFileSync(path)).digest("hex")).toBe(
      metadata.outputSha256,
    );
    assertSafeFit(scene);
  });
});

describe("v15 loose-firewood production override", () => {
  it("activates five contiguous approved bands above the historical overrides", () => {
    expect(V15_ARTWORK_CANDIDATES).toHaveLength(5);
    expect(V15_APPROVED_CANDIDATES).toHaveLength(5);
    expect(V15_ARTWORK_CANDIDATES.map((scene) => scene.quantityBand)).toEqual([
      { min: 1, max: 2 },
      { min: 3, max: 4 },
      { min: 5, max: 8 },
      { min: 9, max: 15 },
      { min: 16 },
    ]);
    expect(V15_ARTWORK_CANDIDATES.map((scene) => scene.targetAlphaWidth)).toEqual([
      0.62, 0.7, 0.76, 0.82, 0.86,
    ]);
    expect(V15_ARTWORK_CANDIDATES.every((scene) => scene.styleVersion === "v15")).toBe(true);
  });

  it("locks truthful v15 metadata while reusing the byte-identical v12 Golden Master", () => {
    for (const scene of V15_ARTWORK_CANDIDATES) {
      const path = filePath(scene.source);
      const metadata = V15_ARTWORK_METADATA[scene.id] ?? V12_ARTWORK_METADATA[scene.id];
      expect(existsSync(path), scene.source).toBe(true);
      expect(readArtworkCanvas(path), scene.source).toEqual(metadata.canvas);
      expect(scene.alphaBounds).toEqual(metadata.alphaBounds);
      expect(scene.opticalCenter).toEqual(metadata.opticalCenter);
      expect(scene.alphaCoverage).toBe(metadata.alphaCoverage);
      expect(createHash("sha256").update(readFileSync(path)).digest("hex")).toBe(
        metadata.outputSha256,
      );
      assertSafeFit(scene);
    }
  });

  it("preloads only distinct adjacent loose-firewood images", () => {
    for (const [index, scene] of FIREWOOD_ARTWORK.entries()) {
      const expected = [
        ...new Set([FIREWOOD_ARTWORK[index - 1]?.source, FIREWOOD_ARTWORK[index + 1]?.source]),
      ].filter((source) => Boolean(source) && source !== scene.source);
      const category = PRODUCT_CATEGORIES.find((item) => item.id === "stipane-drevo")!;
      const variant = category.variants.find(
        (item) => item.illustrationVariant === "firewood-loose",
      )!;
      expect(getArtworkSceneFamily(category.id, variant)[index].preloadNeighbors).toEqual(expected);
      expect(scene.preloadNeighbors).toEqual(expected);
    }
  });
});

describe("v33 illustration tuning", () => {
  it("registers the generated assets and exposes contiguous dynamic bands", () => {
    expect(V33_APPROVED_CANDIDATES).toHaveLength(V33_ARTWORK_CANDIDATES.length);
    for (const scene of V33_ARTWORK_CANDIDATES) {
      expect(existsSync(filePath(scene.source)), scene.source).toBe(true);
      expect(readArtworkCanvas(filePath(scene.source)), scene.source).toEqual(scene.canvas);
    }

    const looseBands = V33_ARTWORK_CANDIDATES.filter(
      (scene) => scene.illustrationVariant === "firewood-loose",
    ).map((scene) => scene.quantityBand);
    expect(looseBands).toEqual([
      { min: 1, max: 1 },
      { min: 2, max: 2 },
      { min: 3, max: 3 },
      { min: 4, max: 4 },
      { min: 5, max: 8 },
      { min: 9, max: 15 },
      { min: 16 },
    ]);

    const regenerated = V33_ARTWORK_CANDIDATES.filter(
      (scene) =>
        scene.illustrationVariant === "firewood-loose" &&
        scene.quantityBand.min >= 2 &&
        scene.quantityBand.min <= 4,
    );
    expect(regenerated.every((scene) => scene.styleVersion === "v34")).toBe(true);
    expect(regenerated.map((scene) => scene.source)).toEqual([
      "/images/illustrations/configurator-v34/firewood-loose-2-v34.webp",
      "/images/illustrations/configurator-v34/firewood-loose-3-v34.webp",
      "/images/illustrations/configurator-v34/firewood-loose-4-v34.webp",
    ]);
  });
});

describe("v21 pellet production registry", () => {
  const pelletCategory = PRODUCT_CATEGORIES.find((item) => item.id === "pelety")!;

  it("activates contiguous approved bag and set bands with calibrated optical widths", () => {
    expect(V21_ARTWORK_CANDIDATES).toHaveLength(12);
    expect(V21_APPROVED_CANDIDATES).toHaveLength(12);

    const bagVariant = pelletCategory.variants.find(
      (item) => item.illustrationVariant === "pellets-bag",
    )!;
    const setVariant = pelletCategory.variants.find(
      (item) => item.illustrationVariant === "pellets-set",
    )!;
    const bagFamily = getArtworkSceneFamily(pelletCategory.id, bagVariant);
    const setFamily = getArtworkSceneFamily(pelletCategory.id, setVariant);

    expect(bagFamily.map((scene) => scene.quantityBand)).toEqual([
      { min: 1, max: 1 },
      { min: 2, max: 2 },
      { min: 3, max: 5 },
      { min: 6, max: 8 },
      { min: 9, max: 11 },
      { min: 12, max: 14 },
      { min: 15, max: 20 },
      { min: 21, max: 23 },
      { min: 24 },
    ]);
    expect(bagFamily.map((scene) => scene.previewScale)).toEqual([
      0.94, 0.9475, 0.955, 0.9625, 0.97, 0.9775, 0.985, 0.9925, 1,
    ]);
    expect(setFamily.map((scene) => scene.quantityBand)).toEqual([
      { min: 1, max: 1 },
      { min: 2, max: 2 },
      { min: 3 },
    ]);
    expect(setFamily.map((scene) => scene.previewScale)).toEqual([0.94, 0.97, 1]);
    expect(bagFamily.every((scene) => scene.styleVersion === "v21")).toBe(true);
    expect(setFamily.every((scene) => scene.styleVersion === "v21")).toBe(true);
  });

  it("shares the requested 12/21 sources and locks set quantities 3+ to FINAL28", () => {
    const bagVariant = pelletCategory.variants.find(
      (item) => item.illustrationVariant === "pellets-bag",
    )!;
    const setVariant = pelletCategory.variants.find(
      (item) => item.illustrationVariant === "pellets-set",
    )!;
    expect(resolveArtworkScene(pelletCategory.id, setVariant, 1).scene.source).toBe(
      resolveArtworkScene(pelletCategory.id, bagVariant, 12).scene.source,
    );
    expect(resolveArtworkScene(pelletCategory.id, setVariant, 2).scene.source).toBe(
      resolveArtworkScene(pelletCategory.id, bagVariant, 21).scene.source,
    );
    expect(resolveArtworkScene(pelletCategory.id, setVariant, 3).scene.source).toContain(
      "pellets-28-v21-1536.webp",
    );
    expect(resolveArtworkScene(pelletCategory.id, setVariant, 500).scene.source).toBe(
      resolveArtworkScene(pelletCategory.id, setVariant, 3).scene.source,
    );
  });

  it("publishes valid responsive sources and eagerly targets only the active state", () => {
    for (const scene of V21_ARTWORK_CANDIDATES) {
      expect(scene.responsiveSources?.map((source) => source.width)).toEqual([768, 1536]);
      for (const responsive of scene.responsiveSources ?? []) {
        const path = filePath(responsive.source);
        expect(existsSync(path), responsive.source).toBe(true);
        expect(readArtworkCanvas(path).width, responsive.source).toBe(responsive.width);
      }
      expect(scene.bottomAnchor?.x).toBe(0.5);
      expect(scene.bottomAnchor?.y).toBeGreaterThan(0.99);
      expect(scene.preloadPolicy).toBe("active-only");
    }

    for (const variantName of ["pellets-bag", "pellets-set"] as const) {
      const variant = pelletCategory.variants.find(
        (item) => item.illustrationVariant === variantName,
      )!;
      const family = getArtworkSceneFamily(pelletCategory.id, variant);
      for (const scene of family) {
        expect(
          getArtworkPreloadSources(pelletCategory.id, variant, scene.quantityBand.min),
        ).toEqual([scene.source]);
      }
    }
  });

  it("keeps commercial quantities exact while capping only the representative artwork", () => {
    const bagVariant = pelletCategory.variants.find(
      (item) => item.illustrationVariant === "pellets-bag",
    )!;
    const setVariant = pelletCategory.variants.find(
      (item) => item.illustrationVariant === "pellets-set",
    )!;
    expect(resolveArtworkScene(pelletCategory.id, bagVariant, 500).scene.representativeCount).toBe(
      24,
    );
    expect(resolveArtworkScene(pelletCategory.id, setVariant, 500).scene.representativeCount).toBe(
      30,
    );
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
