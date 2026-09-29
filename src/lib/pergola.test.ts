import { describe, expect, it } from "vitest";
import {
  ASSEMBLY_RATE_PER_SQM,
  BASE_RATE_PER_SQM,
  clampDimension,
  DEFAULT_PERGOLA,
  DELIVERY_ZIP_MULTIPLIER,
  deliveryCostForPostalCode,
  GABLE_ROOF_PITCH_DEGREES,
  gableRidgeHeight,
  isValidPostalCode,
  PAINT_RATE_PER_SQM,
  pergolaCartInput,
  pergolaMaterials,
  pergolaParts,
  quotePergola,
  ROOF_COLORS,
  ROOF_RATE_PER_SQM,
  WOOD_PAINTS,
} from "./pergola";
import { upsertCatalogItem } from "./cart";

describe("pergola geometry", () => {
  const zExtent = ({ size, rotationX = 0 }: ReturnType<typeof pergolaParts>[number]) =>
    (size[2] * Math.abs(Math.cos(rotationX)) + size[1] * Math.abs(Math.sin(rotationX))) / 2;

  it.each([4, 5, 6])("keeps four posts and increases rafters at width %s", (width) => {
    const parts = pergolaParts({ ...DEFAULT_PERGOLA, width, depth: 6 });
    expect(parts.filter((p) => p.kind === "post")).toHaveLength(4);
    expect(parts.filter((p) => p.kind === "beam")).toHaveLength(2);
    const rafters = parts.filter((p) => p.kind === "rafter");
    expect(rafters.length).toBe(Math.ceil((width - 0.16) / 0.6) + 1);
    expect(rafters[1].position[0] - rafters[0].position[0]).toBeLessThanOrEqual(0.6);
    const posts = parts.filter((p) => p.kind === "post");
    expect(posts[0].size[1]).toBeGreaterThan(posts[2].size[1]);
    expect(posts.every((p) => p.position[1] === p.size[1] / 2)).toBe(true);
    expect(parts.every((p) => p.size.every((v) => Number.isFinite(v) && v > 0))).toBe(true);
  });
  it("removes the roof and adds exactly four anchors", () => {
    const parts = pergolaParts({ ...DEFAULT_PERGOLA, roofing: false, anchors: true });
    expect(parts.filter((p) => p.kind === "roof")).toHaveLength(0);
    expect(parts.filter((p) => p.kind === "anchor")).toHaveLength(4);
  });

  it.each([
    ["freestanding-pent", 4, 0],
    ["wall-pent", 2, 1],
    ["gable-freestanding", 4, 0],
  ] as const)("builds %s with its own support layout", (model, postCount, wallCount) => {
    const parts = pergolaParts({ ...DEFAULT_PERGOLA, model, anchors: true });
    expect(parts.filter(({ kind }) => kind === "post")).toHaveLength(postCount);
    expect(parts.filter(({ kind }) => kind === "anchor")).toHaveLength(postCount);
    expect(parts.filter(({ kind }) => kind === "wall")).toHaveLength(wallCount);
    expect(parts.filter(({ kind }) => kind === "beam")).toHaveLength(2);
  });

  it("derives model-specific material quantities from the generated parts", () => {
    const wall = pergolaMaterials({ ...DEFAULT_PERGOLA, model: "wall-pent", anchors: true });
    const freestanding = pergolaMaterials(DEFAULT_PERGOLA);
    const gable = pergolaMaterials({ ...DEFAULT_PERGOLA, model: "gable-freestanding" });

    expect(wall).toMatchObject({ postCount: 2, anchorCount: 2 });
    expect(freestanding).toMatchObject({ postCount: 4, anchorCount: 0 });
    expect(gable).toMatchObject({ postCount: 4, anchorCount: 0 });
    expect(wall.timberVolumeM3).toBeLessThan(freestanding.timberVolumeM3);
    expect(gable.timberVolumeM3).toBeGreaterThan(freestanding.timberVolumeM3);
    expect(pergolaMaterials({ ...DEFAULT_PERGOLA, roofing: false }).roofingAreaM2).toBe(0);
  });

  it("builds a 20-degree gable around a ridge above the configured eave height", () => {
    const config = { ...DEFAULT_PERGOLA, model: "gable-freestanding" as const, depth: 6 };
    const parts = pergolaParts(config);
    const rafterCount = Math.ceil((config.width - 0.16) / 0.6) + 1;

    expect(parts.filter(({ kind }) => kind === "ridge")).toHaveLength(1);
    expect(parts.filter(({ kind }) => kind === "rafter")).toHaveLength(rafterCount * 2);
    expect(parts.filter(({ kind }) => kind === "roof")).toHaveLength(2);
    expect(gableRidgeHeight(config)).toBeCloseTo(
      config.height + (config.depth / 2) * Math.tan((GABLE_ROOF_PITCH_DEGREES * Math.PI) / 180),
    );
    expect(parts.filter(({ kind }) => kind === "post").every(({ size }) => size[1] === 2.5)).toBe(
      true,
    );
  });

  it.each([4, 6])("stops wall-mounted roof members at the wall plane at depth %s", (depth) => {
    const parts = pergolaParts({ ...DEFAULT_PERGOLA, model: "wall-pent", depth });
    const wallFace = -depth / 2;
    const slopedParts = parts.filter(({ kind }) => kind === "rafter" || kind === "roof");

    expect(slopedParts.length).toBeGreaterThan(0);
    for (const part of slopedParts) {
      expect(part.position[2] - zExtent(part)).toBeCloseTo(wallFace, 10);
    }
  });

  it.each([4, 6])("joins both gable top surfaces without a ridge gap at depth %s", (depth) => {
    const parts = pergolaParts({ ...DEFAULT_PERGOLA, model: "gable-freestanding", depth });
    const slopedParts = parts.filter(({ kind }) => kind === "rafter" || kind === "roof");

    expect(slopedParts.length).toBeGreaterThan(0);
    for (const part of slopedParts) {
      const angle = Math.abs(part.rotationX ?? 0);
      const innerTopEdge =
        Math.abs(part.position[2]) -
        (part.size[2] * Math.cos(angle)) / 2 +
        (part.size[1] * Math.sin(angle)) / 2;
      expect(innerTopEdge).toBeCloseTo(0, 10);
    }
  });
});

describe("pergola quote and inquiry", () => {
  it("contains the complete coating and roofing palettes", () => {
    const woodFinishes = Object.values(WOOD_PAINTS);
    expect(woodFinishes.filter(({ category }) => category === "stains")).toHaveLength(15);
    expect(woodFinishes.filter(({ category }) => category === "opaque")).toHaveLength(15);
    expect(Object.values(ROOF_COLORS)).toHaveLength(15);
    expect(woodFinishes.map(({ label }) => label)).toEqual(
      expect.arrayContaining([
        "RAL 1004 lazura",
        "NCS S2040 R80B krycí",
        "Palisander RC-720",
        "Ebenholz RC-780",
      ]),
    );
    expect(Object.values(ROOF_COLORS).map(({ label }) => label)).toEqual(
      expect.arrayContaining(["RAL 3005", "RAL 7016", "RAL 9010"]),
    );
    expect(
      [...woodFinishes, ...Object.values(ROOF_COLORS)].every(({ color }) =>
        /^#[0-9a-f]{6}$/i.test(color),
      ),
    ).toBe(true);
  });

  it("clamps decimal dimensions to the configured precision", () => {
    expect(clampDimension(4.26, 4, 6)).toBe(4.3);
    expect(clampDimension(3, 4, 6)).toBe(4);
    expect(clampDimension(7, 4, 6)).toBe(6);
  });

  it("prices area, height, paint and each selected service", () => {
    const config = {
      ...DEFAULT_PERGOLA,
      wood: "nussbaumRc660" as const,
      delivery: true,
      postalCode: "11042",
      anchors: true,
      hardware: true,
      assembly: true,
    };
    const area = config.width * config.depth;
    expect(quotePergola(config).structure).toBe(area * BASE_RATE_PER_SQM);
    expect(quotePergola(config).paint).toBe(area * PAINT_RATE_PER_SQM);
    expect(quotePergola(config).addons.delivery).toBe(42 * DELIVERY_ZIP_MULTIPLIER);
    expect(quotePergola(config).addons.assembly).toBe(area * ASSEMBLY_RATE_PER_SQM);
    expect(quotePergola(config).total).toBe(
      area * BASE_RATE_PER_SQM +
        area * PAINT_RATE_PER_SQM +
        42 * DELIVERY_ZIP_MULTIPLIER +
        2400 +
        1200 +
        area * ASSEMBLY_RATE_PER_SQM +
        area * ROOF_RATE_PER_SQM,
    );
    expect(quotePergola({ ...config, roofing: false }).total).toBe(
      quotePergola(config).total - area * ROOF_RATE_PER_SQM,
    );
    expect(quotePergola({ ...DEFAULT_PERGOLA, width: 6 }).total).toBeGreaterThan(
      quotePergola(DEFAULT_PERGOLA).total,
    );
  });
  it("accepts exactly five postal-code digits and derives a stable delivery price", () => {
    expect(isValidPostalCode("11000")).toBe(true);
    expect(isValidPostalCode("1234")).toBe(false);
    expect(isValidPostalCode("123456")).toBe(false);
    expect(isValidPostalCode("12a45")).toBe(false);
    expect(deliveryCostForPostalCode("11042")).toBe(42 * DELIVERY_ZIP_MULTIPLIER);
    expect(deliveryCostForPostalCode("11042")).toBe(deliveryCostForPostalCode("11042"));
    expect(deliveryCostForPostalCode("1104")).toBe(0);
  });
  it("propagates model pillar counts into structure and anchor prices", () => {
    const freestanding = quotePergola({ ...DEFAULT_PERGOLA, anchors: true });
    const wall = quotePergola({
      ...DEFAULT_PERGOLA,
      model: "wall-pent",
      anchors: true,
    });
    const gable = quotePergola({
      ...DEFAULT_PERGOLA,
      model: "gable-freestanding",
      anchors: true,
    });

    expect(wall.materials.postCount).toBe(2);
    expect(wall.addons.anchors).toBe(1200);
    expect(freestanding.addons.anchors).toBe(2400);
    expect(gable.addons.anchors).toBe(2400);
    expect(wall.structure).toBeLessThan(freestanding.structure);
    expect(gable.structure).toBeGreaterThan(freestanding.structure);
    expect(gable.addons.roofing).toBeGreaterThan(freestanding.addons.roofing);
  });
  it("preserves selected options and merges only identical configurations", () => {
    const input = pergolaCartInput({ ...DEFAULT_PERGOLA, delivery: true, postalCode: "11042" });
    expect(input.details).toContain("Doprava: PSČ 11042, 1470 Kč");
    const once = upsertCatalogItem([], input, () => "first");
    const twice = upsertCatalogItem(once, input);
    expect(twice).toHaveLength(1);
    expect(twice[0].quantity).toBe(2);
    expect(twice[0].totalPrice).toBe(
      2 * quotePergola({ ...DEFAULT_PERGOLA, delivery: true, postalCode: "11042" }).total,
    );
    expect(
      upsertCatalogItem(twice, pergolaCartInput({ ...DEFAULT_PERGOLA, width: 5 })),
    ).toHaveLength(2);
    expect(
      upsertCatalogItem(twice, pergolaCartInput({ ...DEFAULT_PERGOLA, model: "wall-pent" })),
    ).toHaveLength(2);
  });
});
