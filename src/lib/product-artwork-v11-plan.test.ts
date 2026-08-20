import { describe, expect, it } from "vitest";
import { PRODUCT_CATEGORIES } from "@/lib/product-catalog";
import { getArtworkSceneFamily } from "@/lib/product-artwork";
import {
  V11_ARTWORK_CONSTANTS,
  V11_ARTWORK_PLAN,
  V11_FRONT_PROFILE_RANGES,
  V11_HOMEPAGE_ICON_PLAN,
  V11_PLANK_VECTORS,
} from "@/lib/product-artwork-v11-plan";

describe("artwork-system v11 production contract", () => {
  it("locks the approved camera, line hierarchy, and adaptive fit", () => {
    expect(V11_ARTWORK_CONSTANTS.camera).toEqual({
      projection: "orthographic",
      azimuthDegrees: 40,
      elevationDegrees: 27,
    });
    expect(V11_ARTWORK_CONSTANTS.lineWeights).toEqual({
      outer: 4,
      edge: 3,
      seam: 4,
      rings: 1.5,
      grain: 1.25,
    });
    expect(V11_ARTWORK_CONSTANTS.safeInset).toBe(0.07);
  });

  it("keeps the canonical plank ratios inside their narrow tolerance", () => {
    const length = ([x, y]: readonly [number, number]) => Math.hypot(x, y);
    const crossSectionRatio = length(V11_PLANK_VECTORS.column) / length(V11_PLANK_VECTORS.rowDown);
    const compactDepthRatio = length(V11_PLANK_VECTORS.back) / length(V11_PLANK_VECTORS.column);

    expect(crossSectionRatio).toBeGreaterThanOrEqual(2.3);
    expect(crossSectionRatio).toBeLessThanOrEqual(2.5);
    expect(crossSectionRatio).toBeCloseTo(2.402891, 5);
    expect(compactDepthRatio).toBeCloseTo(1.449849, 5);
  });

  it("locks distinct physical front profiles for all rigid timber families", () => {
    expect(V11_FRONT_PROFILE_RANGES).toEqual({
      beam: { height: 1, widthMin: 1, widthMax: 1 },
      plank: { height: 1, widthMin: 2.3, widthMax: 2.5 },
      board: { height: 1, widthMin: 4.5, widthMax: 5 },
      lath: { height: 1, widthMin: 1.25, widthMax: 1.5 },
    });
  });

  it("defines seven approved quantity scenes for all rigid timber families", () => {
    expect(V11_ARTWORK_PLAN.map((family) => family.id)).toEqual([
      "beam",
      "plank",
      "board",
      "board-unsorted-narrow",
      "board-unsorted-wide",
      "lath",
    ]);
    for (const family of V11_ARTWORK_PLAN) {
      expect(family.bands.map((band) => band.representativeCount)).toEqual([1, 2, 3, 6, 9, 12, 16]);
      expect(family.bands.map((band) => band.layout)).toEqual([
        "1x1",
        "2x1",
        "2+1-centered",
        "3x2",
        "3x3",
        "4x3",
        "4x4",
      ]);
      expect(family.bands.every((band) => band.approvalStatus === "approved")).toBe(true);
    }
  });

  it("promotes the approved smoothed-top-grain plank masters", () => {
    const planks = V11_ARTWORK_PLAN.find((family) => family.id === "plank")!;
    expect(planks.bands.map((band) => band.plannedSource)).toEqual(
      expect.arrayContaining([
        "/images/illustrations/configurator-v11/plank-topgrain-smooth-v7-1-master-v11.webp",
        "/images/illustrations/configurator-v11/plank-topgrain-smooth-v7-16plus-master-v11.webp",
      ]),
    );
    expect(planks.bands.every((band) => !band.plannedSource.includes("family-match-v6"))).toBe(
      true,
    );
  });

  it("approves only the four timber homepage icons", () => {
    expect(V11_HOMEPAGE_ICON_PLAN).toHaveLength(8);
    expect(new Set(V11_HOMEPAGE_ICON_PLAN.map((icon) => icon.categoryId)).size).toBe(8);
    expect(
      V11_HOMEPAGE_ICON_PLAN.filter((icon) => icon.approvalStatus === "approved"),
    ).toHaveLength(4);
  });

  it("activates v11 for timber and keeps fuels on earlier versions", () => {
    for (const category of PRODUCT_CATEGORIES) {
      for (const variant of category.variants) {
        const isTimber = ["tramy", "fosny", "prkna", "late"].includes(category.id);
        expect(
          getArtworkSceneFamily(category.id, variant).every((scene) =>
            isTimber
              ? scene.source.includes("configurator-v11")
              : !scene.source.includes("configurator-v11"),
          ),
        ).toBe(true);
      }
      expect(category.imageSrc.includes("homepage-v11")).toBe(
        ["tramy", "fosny", "prkna", "late"].includes(category.id),
      );
    }
  });
});
