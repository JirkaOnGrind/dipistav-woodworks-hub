import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PRODUCT_CATEGORIES } from "@/lib/product-catalog";
import { resolveArtworkScene } from "@/lib/product-artwork";
import { V19_ARTWORK_CANDIDATES } from "@/lib/product-artwork-v19-candidates";
import { V19_ARTWORK_METADATA } from "@/lib/product-artwork-v19-metadata";

describe("approved v19 pellet artwork", () => {
  const category = PRODUCT_CATEGORIES.find((item) => item.id === "pelety")!;
  const variant = category.variants.find((item) => item.illustrationVariant === "pellets-bag")!;

  it.each([1, 2])("maps quantity %i to its approved centered master", (quantity) => {
    const scene = V19_ARTWORK_CANDIDATES.find(
      (candidate) => candidate.quantityBand.min === quantity,
    )!;
    const metadata = V19_ARTWORK_METADATA[scene.id];

    expect(scene.id).toBe(`pellets-bag-${quantity}-master-v19`);
    expect(scene.styleVersion).toBe("v19");
    expect(scene.renderMode).toBe("master");
    expect(scene.representativeCount).toBe(quantity);
    expect(scene.opticalCenter.x).toBeCloseTo(0.5, 2);
    expect(scene.opticalCenter.y).toBeCloseTo(0.5, 2);
    expect(scene.alphaBounds).toEqual(metadata.alphaBounds);

    const path = join(process.cwd(), "public", scene.source);
    const hash = createHash("sha256").update(readFileSync(path)).digest("hex");
    expect(hash).toBe(metadata.outputSha256);
  });

  it("is superseded by the active v21 registry without mutating the legacy candidate", () => {
    expect(resolveArtworkScene(category.id, variant, 1).scene.styleVersion).toBe("v21");
    expect(V19_ARTWORK_CANDIDATES[0].styleVersion).toBe("v19");
  });
});
