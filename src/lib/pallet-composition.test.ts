import { describe, expect, it } from "vitest";
import {
  createPalletComposition,
  getPalletRepresentativeCount,
  getPalletSlots,
  isPalletSlotSupported,
  PALLET_COMPOSITION_CANVAS,
  PALLET_UNIT_ALPHA_BOUNDS,
} from "@/lib/pallet-composition";

const CASES = [
  [1, 1],
  [2, 2],
  [3, 3],
  [4, 3],
  [5, 6],
  [8, 6],
  [9, 9],
  [11, 9],
  [12, 12],
  [15, 12],
  [16, 16],
  [20, 16],
  [500, 16],
] as const;

describe("pallet composition", () => {
  it("maps every quantity band to the intended representative count", () => {
    for (const [quantity, expected] of CASES) {
      expect(getPalletRepresentativeCount(quantity)).toBe(expected);
      expect(createPalletComposition(quantity).placements).toHaveLength(expected);
    }
  });

  it("uses at most two supported levels without gaps", () => {
    for (const representativeCount of [1, 2, 3, 6, 9, 12, 16]) {
      const slots = getPalletSlots(representativeCount);
      expect(Math.max(...slots.map((slot) => slot.level))).toBeLessThanOrEqual(1);
      for (const slot of slots) {
        expect(isPalletSlotSupported(slot, slots), JSON.stringify(slot)).toBe(true);
      }
    }
  });

  it("sorts back-to-front and lower-before-upper at equal depth", () => {
    for (const quantity of [1, 2, 3, 5, 9, 12, 16]) {
      const { placements } = createPalletComposition(quantity);
      for (let index = 1; index < placements.length; index += 1) {
        const previous = placements[index - 1];
        const current = placements[index];
        expect(current.viewDepth + 0.0001).toBeGreaterThanOrEqual(previous.viewDepth);
        if (Math.abs(current.viewDepth - previous.viewDepth) < 0.0001) {
          expect(current.level).toBeGreaterThanOrEqual(previous.level);
        }
        expect(current.zIndex).toBe(index + 1);
      }
    }
  });

  it("keeps every transformed alpha bound inside the canonical safe area", () => {
    const safeLeft = PALLET_COMPOSITION_CANVAS.width * 0.07 + 8;
    const safeTop = PALLET_COMPOSITION_CANVAS.height * 0.07 + 8;
    const safeRight = PALLET_COMPOSITION_CANVAS.width - safeLeft;
    const safeBottom = PALLET_COMPOSITION_CANVAS.height - safeTop;

    for (const quantity of [1, 2, 3, 5, 9, 12, 16, 500]) {
      for (const placement of createPalletComposition(quantity).placements) {
        const [scaleX, , , scaleY, translateX, translateY] = placement.matrix;
        expect(translateX + scaleX * PALLET_UNIT_ALPHA_BOUNDS.left).toBeGreaterThanOrEqual(
          safeLeft - 0.001,
        );
        expect(translateY + scaleY * PALLET_UNIT_ALPHA_BOUNDS.top).toBeGreaterThanOrEqual(
          safeTop - 0.001,
        );
        expect(translateX + scaleX * PALLET_UNIT_ALPHA_BOUNDS.right).toBeLessThanOrEqual(
          safeRight + 0.001,
        );
        expect(translateY + scaleY * PALLET_UNIT_ALPHA_BOUNDS.bottom).toBeLessThanOrEqual(
          safeBottom + 0.001,
        );
      }
    }
  });

  it("is deterministic", () => {
    expect(createPalletComposition(16)).toEqual(createPalletComposition(16));
  });
});
