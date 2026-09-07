import { describe, expect, it } from "vitest";
import {
  BEAM_PRICE_MAP,
  getEffectiveQuantityPolicy,
  getVariantDetails,
  getVariantTitle,
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

    expect(wideBoard.pricing).toMatchObject({
      basis: "cubic-meter",
      rate: 8900,
      quantityMode: "volume",
    });
    expect(wideBoard.volumeCalculation).toEqual({
      basis: "group-average-width",
      averageWidthMm: 180,
      memberWidthsCm: [16, 18, 20],
    });
    expect(calculateVariantQuote(wideBoard, 1)?.totalVolumeM3).toBe(1);
    expect(calculateVariantQuote(wideBoard, 1)?.totalPrice).toBe(8900);
  });

  it("účtuje užší skupinu podle průměrné šířky 11 cm", () => {
    const boards = getProductCategory("prkna")!;
    const narrowBoard = resolveProductVariant(boards, "unsorted", {
      width: "8-14",
      length: "500",
    })!;

    expect(narrowBoard.pricing).toMatchObject({ basis: "cubic-meter", rate: 7200 });
    expect(calculateVariantQuote(narrowBoard, 10)?.totalVolumeM3).toBe(10);
    expect(calculateVariantQuote(narrowBoard, 10)?.totalPrice).toBe(72000);
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
    ]) {
      expect(getProductCategory(categoryId)?.quantityPolicy).toEqual({
        min: 1,
        max: 500,
        step: 1,
        sliderMax: 20,
      });
    }
    expect(getProductCategory("drivi-na-paletach")?.quantityPolicy).toEqual({
      min: 1,
      max: 500,
      step: 1,
      sliderMax: 12,
    });
  });

  it("omezuje na 12 jen ovládání skutečných paletových variant", () => {
    const firewood = getProductCategory("stipane-drevo")!;
    const pellets = getProductCategory("pelety")!;
    const loose = firewood.variants.find(
      (variant) => variant.illustrationVariant === "firewood-loose",
    );
    const firewoodPallet = firewood.variants.find(
      (variant) => variant.illustrationVariant === "firewood-pallet",
    );
    const pelletPallet = pellets.variants.find(
      (variant) => variant.illustrationVariant === "pellets-pallet",
    );

    expect(getEffectiveQuantityPolicy(firewood, loose).max).toBe(500);
    expect(getEffectiveQuantityPolicy(firewood, firewoodPallet)).toMatchObject({
      max: 500,
      sliderMax: 12,
    });
    expect(getEffectiveQuantityPolicy(pellets, pelletPallet)).toMatchObject({
      max: 500,
      sliderMax: 12,
    });
  });

  it("používá pro netříděná prkna množství přímo v m³", () => {
    const boards = getProductCategory("prkna")!;
    const unsorted = boards.variants.find((variant) => variant.modeId === "unsorted");

    expect(getEffectiveQuantityPolicy(boards, unsorted)).toEqual({
      min: 1,
      max: 20,
      step: 1,
      sliderMax: 10,
    });
    expect(unsorted?.pricing).toMatchObject({
      basis: "cubic-meter",
      displayUnit: "m³",
      quantityMode: "volume",
    });
  });

  it("modeluje délku a objem palet jako nezávislou cenovou matici", () => {
    const pallets = getProductCategory("drivi-na-paletach")!;
    expect(pallets.selectors).toEqual([
      { key: "logLength", label: "Délka polen" },
      { key: "volume", label: "Objem palety" },
    ]);
    expect(normalizeSelection(pallets, undefined)).toEqual({ logLength: "25", volume: "1" });

    const expectedRates = {
      "33-1": 2190,
      "33-1.6": 3190,
      "25-1": 2290,
      "25-1.6": 3290,
    };

    for (const [combination, rate] of Object.entries(expectedRates)) {
      const [logLength, volume] = combination.split("-");
      const selection = normalizeSelection(pallets, undefined, { logLength, volume });
      const variant = resolveProductVariant(pallets, undefined, selection);
      expect(selection).toEqual({ logLength, volume });
      expect(variant?.pricing).toMatchObject({ basis: "piece", rate, displayUnit: "paleta" });
      expect(calculateVariantQuote(variant!, 3)?.totalPrice).toBe(rate * 3);
      expect(getVariantTitle(pallets, variant!)).not.toContain("undefined");
      expect(getVariantDetails(pallets, variant!)).toEqual([
        `Délka polen: ${logLength} cm`,
        `Objem palety: ${volume === "1.6" ? "1,6" : volume} prm`,
      ]);
    }
  });

  it("maps the four timber homepage icons to cropped single pieces", () => {
    const expectedIcons = {
      tramy: "tramy-single.webp",
      fosny: "fosny-single.webp",
      prkna: "prkna-single.webp",
      late: "late-single.webp",
    } as const;
    for (const [categoryId, filename] of Object.entries(expectedIcons)) {
      expect(getProductCategory(categoryId)?.imageSrc).toBe(
        `/images/illustrations/homepage-v41/${filename}`,
      );
    }
    for (const categoryId of ["stipane-drevo", "pelety", "krajinky", "drivi-na-paletach"]) {
      expect(getProductCategory(categoryId)?.imageSrc).not.toContain("homepage-v11");
    }
  });
});
