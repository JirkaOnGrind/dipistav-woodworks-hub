import { describe, expect, it } from "vitest";
import {
  createPalletComposition,
  DREVO1_COLUMN_VECTOR,
  DREVO1_DEPTH_VECTOR,
  DREVO1_LEVEL_VECTOR,
  EURO_PALLET_FOOTPRINT_MM,
  getPalletDisplayCount,
  getPalletCompositionScaleBoost,
  getPalletRepresentativeCount,
  getPalletSlotSupports,
  getPalletSlots,
  isPalletSlotSupported,
  PALLET_COMPOSITION_CANVAS,
  PALLET_DEPTH_SORT_VECTOR,
  PALLET_SOURCE_PROFILES,
  PELLET_PALLET_CONTACT_OVERLAP_PX,
  type PalletSlot,
} from "@/lib/pallet-composition";

function boxesOverlap(left: PalletSlot, right: PalletSlot) {
  return (
    left.column < right.column + 1 &&
    left.column + 1 > right.column &&
    left.depth < right.depth + 1 &&
    left.depth + 1 > right.depth &&
    left.level < right.level + 1 &&
    left.level + 1 > right.level
  );
}

describe("pallet composition", () => {
  it("keeps the requested count exact while capping only the illustration at 12 pallets", () => {
    for (const quantity of [1, 2, 3, 4, 5, 7, 8, 9, 12, 20, 21, 100, 500]) {
      const composition = createPalletComposition(quantity);
      const displayCount = Math.min(quantity, 12);
      expect(getPalletDisplayCount(quantity)).toBe(displayCount);
      expect(getPalletRepresentativeCount(quantity)).toBe(displayCount);
      expect(composition).toMatchObject({
        requestedCount: quantity,
        displayCount,
        representativeCount: displayCount,
      });
      expect(composition.placements).toHaveLength(displayCount);
    }
  });

  it("uses the same strict integer grid for every source profile", () => {
    for (const profile of Object.values(PALLET_SOURCE_PROFILES)) {
      for (const quantity of [1, 2, 3, 5, 7, 9, 20, 500]) {
        const composition = createPalletComposition(quantity, profile);
        expect(composition.profileId).toBe(profile.id);
        expect(
          composition.placements.map(({ column, depth, level }) => ({ column, depth, level })),
        ).toEqual(
          createPalletComposition(quantity).placements.map(({ column, depth, level }) => ({
            column,
            depth,
            level,
          })),
        );
        expect(
          composition.placements.every(
            (placement) =>
              Number.isInteger(placement.column) &&
              Number.isInteger(placement.depth) &&
              Number.isInteger(placement.level),
          ),
        ).toBe(true);
      }
    }
  });

  it("registers the measured drevo1 alpha bounds and contact vectors", () => {
    const profile = PALLET_SOURCE_PROFILES["firewood-drevo1"];
    expect(profile).toMatchObject({
      source: "/images/illustrations/configurator-v27/drevo1.webp",
      canvas: { width: 1000, height: 1000 },
      alphaBounds: { left: 64, top: 34, right: 907, bottom: 968 },
      contactAnchors: { base: { x: 508, y: 967 }, top: { x: 508, y: 459 } },
      projectedModuleHeightPx: 508,
      columnVector: DREVO1_COLUMN_VECTOR,
      depthVector: DREVO1_DEPTH_VECTOR,
      levelVector: DREVO1_LEVEL_VECTOR,
    });
    expect(DREVO1_COLUMN_VECTOR).toEqual({ x: 459.129, y: 188.07 });
    expect(DREVO1_DEPTH_VECTOR).toEqual({ x: -451.713, y: 255.357 });
    expect(DREVO1_LEVEL_VECTOR).toEqual({ x: 0, y: -508 });

    const shortLogProfile = PALLET_SOURCE_PROFILES["firewood-drevo1-25"];
    expect(shortLogProfile).toMatchObject({
      source: "/images/illustrations/configurator-v27/drevo1-25cm.webp",
      maskSource: "/images/illustrations/configurator-v27/drevo1.webp",
      canvas: { width: 1254, height: 1254 },
      projectedModuleHeightPx: 637.032,
    });
    expect(shortLogProfile.columnVector.x / profile.columnVector.x).toBeCloseTo(1.254, 10);
    expect(shortLogProfile.depthVector.y / profile.depthVector.y).toBeCloseTo(1.254, 10);
    expect(shortLogProfile.levelVector.y / profile.levelVector.y).toBeCloseTo(1.254, 10);
  });

  it("keeps independent placeholder geometry for every Dříví pallet variant", () => {
    const cases = [
      {
        profileId: "firewood-25",
        source: "/images/illustrations/configurator-v31/firewood-pallet-25cm-final-v31.webp",
        prefix: "pallet-25cm-1prm",
        bounds: { left: 248, top: 0, right: 1975, bottom: 2002 },
        presentationScaleMultiplier: 1,
      },
      {
        profileId: "firewood-25-16",
        source: "/images/illustrations/configurator-v31/firewood-pallet-25cm-final-v31.webp",
        prefix: "pallet-25cm-16prm",
        bounds: { left: 248, top: 0, right: 1975, bottom: 2002 },
        presentationScaleMultiplier: 1.07,
      },
      {
        profileId: "firewood-33-1prm",
        source: "/images/illustrations/configurator-v31/firewood-pallet-33cm-final-v31.webp",
        prefix: "pallet-33cm-1prm",
        bounds: { left: 243, top: 0, right: 1975, bottom: 2002 },
        presentationScaleMultiplier: 1,
      },
      {
        profileId: "firewood-33-16prm",
        source: "/images/illustrations/configurator-v31/firewood-pallet-33cm-final-v31.webp",
        prefix: "pallet-33cm-16prm",
        bounds: { left: 243, top: 0, right: 1975, bottom: 2002 },
        presentationScaleMultiplier: 1.07,
      },
    ] as const;

    for (const testCase of cases) {
      const profile = PALLET_SOURCE_PROFILES[testCase.profileId];
      expect(profile).toMatchObject({
        source: testCase.source,
        calibrationVariablePrefix: testCase.prefix,
        canvas: { width: 2048, height: 2048 },
        alphaBounds: testCase.bounds,
        columnVector: { x: 980.992, y: 405.504 },
        depthVector: { x: -823.296, y: 432.128 },
        levelVector: { x: 86.016, y: -1198.08 },
      });
      expect(createPalletComposition(1, profile).presentationScaleMultiplier).toBe(
        testCase.presentationScaleMultiplier,
      );
    }
  });

  it("keeps the first six pallets on a 3 × 2 ground footprint", () => {
    expect(getPalletSlots(6)).toEqual([
      { column: 0, depth: 0, level: 0 },
      { column: 1, depth: 0, level: 0 },
      { column: 2, depth: 0, level: 0 },
      { column: 0, depth: 1, level: 0 },
      { column: 1, depth: 1, level: 0 },
      { column: 2, depth: 1, level: 0 },
    ]);
    expect(getPalletSlots(7)).toEqual([...getPalletSlots(6), { column: 0, depth: 0, level: 1 }]);
  });

  it("keeps filling the established upper levels without collapsing back to ground", () => {
    for (const quantity of [7, 8, 9, 12, 13, 20, 65, 500]) {
      const slots = getPalletSlots(quantity);
      expect(Math.max(...slots.map((slot) => slot.column))).toBeLessThan(3);
      expect(Math.max(...slots.map((slot) => slot.depth))).toBeLessThan(2);
      expect(Math.max(...slots.map((slot) => slot.level))).toBe(Math.floor((quantity - 1) / 6));
    }
    expect(getPalletSlots(9).filter((slot) => slot.level === 0)).toHaveLength(6);
    expect(getPalletSlots(9).filter((slot) => slot.level === 1)).toHaveLength(3);
  });

  it("keeps unique cells and direct full-area support for every upper pallet", () => {
    for (const count of [1, 2, 3, 4, 5, 7, 8, 9, 20, 64, 65, 500]) {
      const slots = getPalletSlots(count);
      expect(new Set(slots.map((slot) => `${slot.column}:${slot.depth}:${slot.level}`)).size).toBe(
        count,
      );
      for (const slot of slots) {
        expect(isPalletSlotSupported(slot, slots), JSON.stringify(slot)).toBe(true);
        if (slot.level > 0) {
          expect(getPalletSlotSupports(slot, slots)).toEqual([
            { column: slot.column, depth: slot.depth, level: slot.level - 1 },
          ]);
        }
      }
    }
  });

  it("keeps every 3D cell interior disjoint", () => {
    for (const count of [1, 4, 7, 9, 20, 65]) {
      const slots = getPalletSlots(count);
      for (let leftIndex = 0; leftIndex < slots.length; leftIndex += 1) {
        for (let rightIndex = leftIndex + 1; rightIndex < slots.length; rightIndex += 1) {
          expect(boxesOverlap(slots[leftIndex], slots[rightIndex])).toBe(false);
        }
      }
    }
  });

  it("sorts back-to-front with a monotonically increasing z-index", () => {
    for (const quantity of [1, 2, 3, 5, 7, 9, 20, 65]) {
      const { placements } = createPalletComposition(quantity);
      for (let index = 0; index < placements.length; index += 1) {
        const placement = placements[index];
        expect(placement.viewDepth).toBe(
          placement.column * PALLET_DEPTH_SORT_VECTOR.column +
            placement.depth * PALLET_DEPTH_SORT_VECTOR.depth +
            placement.level * PALLET_DEPTH_SORT_VECTOR.level,
        );
        if (index > 0) {
          expect(placement.viewDepth).toBeGreaterThanOrEqual(placements[index - 1].viewDepth);
        }
        expect(placement.zIndex).toBe(index + 1);
      }
    }
  });

  it("keeps every transformed alpha bound inside the canonical safe area", () => {
    for (const profile of Object.values(PALLET_SOURCE_PROFILES)) {
      for (const quantity of [1, 2, 3, 5, 7, 9, 20, 65, 500]) {
        const composition = createPalletComposition(quantity, profile);
        const safeLeft = PALLET_COMPOSITION_CANVAS.width * composition.safeInset + 8;
        const safeTop = PALLET_COMPOSITION_CANVAS.height * composition.safeInset + 8;
        const safeRight = PALLET_COMPOSITION_CANVAS.width - safeLeft;
        const safeBottom = PALLET_COMPOSITION_CANVAS.height - safeTop;
        for (const placement of composition.placements) {
          const [scaleX, , , scaleY, translateX, translateY] = placement.matrix;
          expect(translateX + scaleX * profile.alphaBounds.left).toBeGreaterThanOrEqual(
            safeLeft - 0.001,
          );
          expect(translateY + scaleY * profile.alphaBounds.top).toBeGreaterThanOrEqual(
            safeTop - 0.001,
          );
          expect(translateX + scaleX * profile.alphaBounds.right).toBeLessThanOrEqual(
            safeRight + 0.001,
          );
          expect(translateY + scaleY * profile.alphaBounds.bottom).toBeLessThanOrEqual(
            safeBottom + 0.001,
          );
        }
      }
    }
  });

  it("converts every fitted matrix to an equivalent CSS translate", () => {
    const profile = PALLET_SOURCE_PROFILES["firewood-drevo1"];
    const composition = createPalletComposition(7, profile);
    for (const placement of composition.placements) {
      expect(
        PALLET_COMPOSITION_CANVAS.width / 2 +
          (placement.cssTranslate.xPercent / 100) * profile.canvas.width,
      ).toBeCloseTo(placement.matrix[4], 10);
      expect(
        PALLET_COMPOSITION_CANVAS.height / 2 +
          (placement.cssTranslate.yPercent / 100) * profile.canvas.height,
      ).toBeCloseTo(placement.matrix[5], 10);
    }
  });

  it("keeps reusable pallet geometry and calibrated vertical contact", () => {
    for (const profile of Object.values(PALLET_SOURCE_PROFILES)) {
      expect(profile.physicalGeometry.footprintMm).toEqual(EURO_PALLET_FOOTPRINT_MM);
      expect(profile.contactPlanes).toEqual({ baseZ: 0, topZ: 1 });
      expect(profile.contactAnchors.base.x).toBe(profile.contactAnchors.top.x);
      expect(profile.contactAnchors.base.y - profile.contactAnchors.top.y).toBeCloseTo(
        profile.projectedModuleHeightPx,
        0,
      );
      expect(Math.abs(profile.levelVector.y)).toBeCloseTo(profile.projectedModuleHeightPx, 0);
    }
    expect(PELLET_PALLET_CONTACT_OVERLAP_PX).toBe(20);
    expect(PALLET_SOURCE_PROFILES["firewood-25"].levelVector).toEqual({ x: 86.016, y: -1198.08 });
    expect(PALLET_SOURCE_PROFILES["pellets-975"]).toMatchObject({
      source: "/images/illustrations/configurator-v33/pellets-pallet-975-crisp-v33.webp",
      canvas: { width: 1407, height: 1118 },
      alphaBounds: { left: 56, top: 26, right: 1375, bottom: 1093 },
      contactAnchors: { base: { x: 703.5, y: 1093 }, top: { x: 703.5, y: 635.664581 } },
      projectedModuleHeightPx: 457.335419,
      columnVector: { x: 679.761476, y: 258.143181 },
      depthVector: { x: -412.966713, y: 399.885681 },
      levelVector: { x: 14.07, y: -457.335419 },
    });
  });

  it("centers every auto-fitted composition", () => {
    for (const profile of [
      PALLET_SOURCE_PROFILES["firewood-drevo1"],
      PALLET_SOURCE_PROFILES["pellets-975"],
      PALLET_SOURCE_PROFILES["firewood-25"],
      PALLET_SOURCE_PROFILES["firewood-25-16"],
      PALLET_SOURCE_PROFILES["firewood-33-1prm"],
      PALLET_SOURCE_PROFILES["firewood-33-16prm"],
    ]) {
      for (const quantity of [1, 3, 5, 6, 7, 9, 12, 20, 65, 500]) {
        const composition = createPalletComposition(quantity, profile);
        const centerX =
          composition.translation.x +
          (composition.scale * (composition.rawBounds.left + composition.rawBounds.right)) / 2;
        const centerY =
          composition.translation.y +
          (composition.scale * (composition.rawBounds.top + composition.rawBounds.bottom)) / 2;
        expect(centerX).toBeCloseTo(PALLET_COMPOSITION_CANVAS.width / 2, 10);
        expect(centerY).toBeCloseTo(PALLET_COMPOSITION_CANVAS.height / 2, 10);
      }
    }
  });

  it("přidá jeden pevný osmiprocentní boost od druhé vrstvy", () => {
    expect(getPalletCompositionScaleBoost(1)).toBe(1);
    expect(getPalletCompositionScaleBoost(6)).toBe(1);
    expect(getPalletCompositionScaleBoost(7)).toBe(1.08);
    expect(getPalletCompositionScaleBoost(12)).toBe(1.08);
    expect(createPalletComposition(6).scaleBoost).toBe(1);
    expect(createPalletComposition(7).scaleBoost).toBe(1.08);
    expect(createPalletComposition(50).scaleBoost).toBe(1.08);
  });

  it("makes only the 1.6 prm Dříví variants modestly larger", () => {
    for (const [onePrmId, sixteenPrmId] of [
      ["firewood-25", "firewood-25-16"],
      ["firewood-33-1prm", "firewood-33-16prm"],
    ] as const) {
      for (const quantity of [1, 6, 12]) {
        const onePrm = createPalletComposition(quantity, PALLET_SOURCE_PROFILES[onePrmId]);
        const sixteenPrm = createPalletComposition(quantity, PALLET_SOURCE_PROFILES[sixteenPrmId]);
        expect(onePrm.presentationScaleMultiplier).toBe(1);
        expect(sixteenPrm.presentationScaleMultiplier).toBe(1.07);
        expect(sixteenPrm.scale).toBeGreaterThan(onePrm.scale);
        expect(sixteenPrm.scale / onePrm.scale).toBeCloseTo(1.07, 10);
      }
    }
  });

  it("rejects invalid slot counts and remains deterministic", () => {
    for (const invalid of [0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => getPalletSlots(invalid)).toThrow("Invalid pallet display count");
    }
    expect(createPalletComposition(20)).toEqual(createPalletComposition(20));
  });
});
