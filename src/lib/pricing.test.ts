import { describe, expect, it } from "vitest";
import { calculateVariantQuote } from "@/lib/pricing";

describe("calculateVariantQuote", () => {
  it("počítá cenu latí podle běžných metrů", () => {
    expect(
      calculateVariantQuote(
        {
          availability: "in-stock",
          dimensions: { widthMm: 60, heightMm: 40, lengthMm: 4000 },
          pricing: { basis: "linear-meter", rate: 22, displayUnit: "bm" },
        },
        3,
      ),
    ).toMatchObject({ totalLinearMeters: 12, totalPrice: 264 });
  });

  it("počítá objem netříděných prken bez mezizaokrouhlení", () => {
    const quote = calculateVariantQuote(
      {
        availability: "in-stock",
        dimensions: { thicknessMm: 25, widthMm: 140, lengthMm: 5000 },
        pricing: { basis: "cubic-meter", rate: 7200, displayUnit: "m³" },
      },
      10,
    );
    expect(quote?.totalVolumeM3).toBeCloseTo(0.175, 8);
    expect(quote?.totalPrice).toBe(1260);
  });

  it("nevrací cenu pro nenaskladněnou variantu", () => {
    expect(calculateVariantQuote({ availability: "out-of-stock", pricing: null }, 1)).toBeNull();
  });
});
