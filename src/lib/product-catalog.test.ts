import { describe, expect, it } from "vitest";
import {
  BEAM_PRICE_MAP,
  getProductCategory,
  normalizeSelection,
  resolveProductVariant,
  UNSORTED_BOARD_GROUPS,
} from "@/lib/product-catalog";
import { calculateVariantQuote } from "@/lib/pricing";

describe("produktový katalog", () => {
  it("obsahuje úplnou schválenou matici variant", () => {
    const beamCount = Object.values(BEAM_PRICE_MAP).reduce(
      (total, prices) => total + Object.keys(prices).length,
      0,
    );
    const boards = getProductCategory("prkna");
    expect(beamCount).toBe(59);
    expect(getProductCategory("late")?.variants).toHaveLength(6);
    expect(getProductCategory("fosny")?.variants).toHaveLength(1);
    expect(boards?.variants.filter((variant) => variant.modeId === "sorted")).toHaveLength(13);
    expect(boards?.variants.filter((variant) => variant.modeId === "unsorted")).toHaveLength(4);
  });

  it("účtuje široká netříděná prkna podle průměrné šířky 18 cm", () => {
    const boards = getProductCategory("prkna")!;
    const wideBoard = resolveProductVariant(boards, "unsorted", {
      width: "16-20",
      length: "500",
    })!;

    expect(wideBoard.pricing).toMatchObject({ basis: "cubic-meter", rate: 8900 });
    expect(wideBoard.volumeCalculation).toEqual({
      basis: "group-average-width",
      averageWidthMm: 180,
      memberWidthsCm: [16, 18, 20],
    });
    expect(calculateVariantQuote(wideBoard, 1)?.totalVolumeM3).toBeCloseTo(0.0225);
    expect(calculateVariantQuote(wideBoard, 1)?.totalPrice).toBe(200.25);
  });

  it("účtuje užší skupinu podle průměrné šířky 11 cm", () => {
    const boards = getProductCategory("prkna")!;
    const narrowBoard = resolveProductVariant(boards, "unsorted", {
      width: "8-14",
      length: "500",
    })!;

    expect(narrowBoard.pricing).toMatchObject({ basis: "cubic-meter", rate: 7200 });
    expect(calculateVariantQuote(narrowBoard, 10)?.totalVolumeM3).toBeCloseTo(0.1375);
    expect(calculateVariantQuote(narrowBoard, 10)?.totalPrice).toBe(990);
  });

  it("definuje skupiny netříděných prken bez překryvu", () => {
    expect(UNSORTED_BOARD_GROUPS.map((group) => group.memberWidthsCm)).toEqual([
      [8, 10, 12, 14],
      [16, 18, 20],
    ]);
    expect(UNSORTED_BOARD_GROUPS.map((group) => group.averageWidthMm)).toEqual([110, 180]);
  });

  it("při normalizaci přeskočí nenaskladněnou kombinaci", () => {
    const boards = getProductCategory("prkna")!;
    expect(normalizeSelection(boards, "sorted", { width: "18", length: "400" })).toEqual({
      width: "8",
      length: "400",
    });
  });

  it("eviduje 18 × 400 cm jako jedinou nedostupnou variantu prken", () => {
    const boards = getProductCategory("prkna");
    expect(boards).toBeDefined();
    const unavailable = boards!.variants.filter(
      (variant) => variant.availability === "out-of-stock",
    );
    expect(unavailable).toHaveLength(1);
    expect(unavailable[0]).toMatchObject({
      modeId: "sorted",
      selection: { width: "18", length: "400" },
      pricing: null,
    });
  });

  it("normalizuje závislou délku po změně profilu", () => {
    const beams = getProductCategory("tramy")!;
    const selection = normalizeSelection(beams, undefined, { profile: "8x12", length: "700" });
    expect(selection).toEqual({ profile: "8x12", length: "400" });
    expect(resolveProductVariant(beams, undefined, selection)?.pricing?.rate).toBe(453);
  });

  it("počítá referenční ceny přímo z katalogových variant", () => {
    const laths = getProductCategory("late")!;
    const lath = resolveProductVariant(laths, undefined, {
      profile: "50x30",
      length: "5000",
    })!;
    expect(calculateVariantQuote(lath, 2)?.totalPrice).toBe(160);

    const planks = getProductCategory("fosny")!;
    const plank = resolveProductVariant(planks, undefined, {
      profile: "4x14",
      length: "400",
    })!;
    expect(calculateVariantQuote(plank, 2)?.totalPrice).toBe(510);

    const beams = getProductCategory("tramy")!;
    const beam = resolveProductVariant(beams, undefined, {
      profile: "10x16",
      length: "700",
    })!;
    expect(calculateVariantQuote(beam, 2)?.totalPrice).toBe(3136);
  });

  it("má každá kategorie explicitní množstevní politiku", () => {
    for (const categoryId of [
      "tramy",
      "fosny",
      "prkna",
      "late",
      "stipane-drevo",
      "pelety",
      "krajinky",
      "drivi-na-paletach",
    ]) {
      expect(getProductCategory(categoryId)?.quantityPolicy).toEqual({
        min: 1,
        max: 500,
        step: 1,
        sliderMax: 20,
      });
    }
  });

  it("maps only the four approved timber homepage icons to v11", () => {
    const expectedIcons = {
      tramy: "tramy-icon-occlusion-v3-master-v11.webp",
      fosny: "fosny-icon-family-match-v6-master-v11.webp",
      prkna: "prkna-icon-occlusion-v3-master-v11.webp",
      late: "late-icon-production-v2-master-v11.webp",
    } as const;
    for (const [categoryId, filename] of Object.entries(expectedIcons)) {
      expect(getProductCategory(categoryId)?.imageSrc).toBe(
        `/images/illustrations/homepage-v11/${filename}`,
      );
    }
    for (const categoryId of ["stipane-drevo", "pelety", "krajinky", "drivi-na-paletach"]) {
      expect(getProductCategory(categoryId)?.imageSrc).not.toContain("homepage-v11");
    }
  });
});
