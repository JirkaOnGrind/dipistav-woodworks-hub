import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { getArtworkInteractionMotion } from "@/lib/artwork-interaction-motion";
import type { ProductVariant } from "@/lib/product-catalog";

function variant(dimensions: ProductVariant["dimensions"]): ProductVariant {
  return {
    id: "motion-test",
    selection: {},
    dimensions,
    availability: "in-stock",
    pricing: null,
    illustrationVariant: "beam",
  };
}

describe("artwork interaction motion", () => {
  it("expands the non-lath length amplitude by exactly 15 percent", () => {
    for (const categoryId of ["tramy", "fosny", "prkna"]) {
      expect(getArtworkInteractionMotion(categoryId, variant({ lengthMm: 3000 })).lengthScale).toBe(
        0.977,
      );
      expect(getArtworkInteractionMotion(categoryId, variant({ lengthMm: 4000 })).lengthScale).toBe(
        1,
      );
      expect(getArtworkInteractionMotion(categoryId, variant({ lengthMm: 5000 })).lengthScale).toBe(
        1.023,
      );
      expect((1.023 - 0.977) / (1.02 - 0.98)).toBeCloseTo(1.15, 8);
    }
  });

  it("creates a visible but bounded profile jump from 8 to 20 cm", () => {
    expect(
      getArtworkInteractionMotion("tramy", variant({ widthMm: 80, heightMm: 80, lengthMm: 3000 }))
        .profileScale,
    ).toBe(0.95);
    expect(
      getArtworkInteractionMotion("tramy", variant({ widthMm: 200, heightMm: 200, lengthMm: 3000 }))
        .profileScale,
    ).toBe(1.05);
  });

  it("keeps every non-lath profile inside the premium preview safe bounds", () => {
    for (const dimensions of [
      { widthMm: 80, heightMm: 80, lengthMm: 3000 },
      { widthMm: 80, heightMm: 200, lengthMm: 4000 },
      { widthMm: 200, heightMm: 200, lengthMm: 7000 },
    ]) {
      const motion = getArtworkInteractionMotion("tramy", variant(dimensions));
      expect(motion.scaleX).toBeGreaterThanOrEqual(0.92);
      expect(motion.scaleX).toBeLessThanOrEqual(1.08);
      expect(motion.scaleY).toBeGreaterThanOrEqual(0.92);
      expect(motion.scaleY).toBeLessThanOrEqual(1.08);
    }
  });

  it("communicates a tall rectangular beam without destabilizing its footprint", () => {
    const motion = getArtworkInteractionMotion(
      "tramy",
      variant({ widthMm: 80, heightMm: 200, lengthMm: 4000 }),
    );
    expect(motion.scaleY).toBeGreaterThan(motion.scaleX);
    expect(motion.scaleY - motion.scaleX).toBeLessThan(0.08);
  });

  it("keeps the approved lath scaling byte-for-byte equivalent", () => {
    expect(
      getArtworkInteractionMotion("late", variant({ widthMm: 30, heightMm: 50, lengthMm: 4000 })),
    ).toMatchObject({ lengthScale: 1.05, profileScale: 1, scaleX: 1.05, scaleY: 1.05 });
    expect(
      getArtworkInteractionMotion("late", variant({ widthMm: 40, heightMm: 60, lengthMm: 5000 })),
    ).toMatchObject({
      lengthScale: 1.09,
      profileScale: 1.06,
      scaleX: 1.1554,
      scaleY: 1.1554,
    });
  });

  it("declares the 250 ms transition and reduced-motion override", () => {
    const styles = readFileSync("src/styles.css", "utf8");
    expect(styles).toContain("transition: transform 0.25s ease-out");
    expect(styles).toContain("[data-artwork-interaction-transform]");
    expect(styles).toContain("@media (prefers-reduced-motion: reduce)");
  });

  it("uses the same bounded perceptual transform in the standalone beam widget", () => {
    const widget = readFileSync("public/widgets/beam-configurator.js", "utf8");
    expect(widget).toContain("const profileScale = 0.95 + profileProgress * 0.1");
    expect(widget).toContain("500: 1.023, 600: 1.04025, 700: 1.0575");
    expect(widget).toContain("clamp(lengthScale * profileScale * aspectScaleX, 0.92, 1.08)");
    expect(widget).toContain("scaleX(${scaleX}) scaleY(${scaleY})");
  });
});
