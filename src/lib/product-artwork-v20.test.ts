import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PRODUCT_CATEGORIES } from "@/lib/product-catalog";
import { resolveArtworkScene } from "@/lib/product-artwork";
import { V20_ARTWORK_CANDIDATES } from "@/lib/product-artwork-v20-candidates";
import { V20_ARTWORK_METADATA } from "@/lib/product-artwork-v20-metadata";

describe("approved v20 pellet artwork", () => {
  const category = PRODUCT_CATEGORIES.find((item) => item.id === "pelety")!;
  const variant = category.variants.find((item) => item.illustrationVariant === "pellets-bag")!;

  it("keeps the approved three-bag master metadata readable", () => {
    const scene = V20_ARTWORK_CANDIDATES[0];
    const metadata = V20_ARTWORK_METADATA[scene.id];

    expect(scene.id).toBe("pellets-bag-3-master-v20");
    expect(scene.styleVersion).toBe("v20");
    expect(scene.renderMode).toBe("master");
    expect(scene.representativeCount).toBe(3);
    expect(scene.opticalCenter).toEqual({ x: 0.5, y: 0.5 });
    expect(scene.alphaBounds).toEqual(metadata.alphaBounds);

    const path = join(process.cwd(), "public", scene.source);
    const hash = createHash("sha256").update(readFileSync(path)).digest("hex");
    expect(hash).toBe(metadata.outputSha256);
  });

  it("is superseded by the active v21 family from quantity 3 onward", () => {
    expect(resolveArtworkScene(category.id, variant, 3).scene.styleVersion).toBe("v21");
    expect(resolveArtworkScene(category.id, variant, 5).scene.styleVersion).toBe("v21");
  });

  it("preserves the v20 candidate as immutable legacy metadata", () => {
    expect(V20_ARTWORK_CANDIDATES[0].styleVersion).toBe("v20");
    expect(V20_ARTWORK_CANDIDATES[0].targetAlphaWidth).toBe(0.78);
  });
});
