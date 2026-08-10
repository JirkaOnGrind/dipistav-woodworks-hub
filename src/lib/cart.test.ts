import { describe, expect, it } from "vitest";
import { upsertCatalogItem, type CatalogCartInput } from "@/lib/cart";

const lathInput: CatalogCartInput = {
  productId: "late",
  variantId: "lath-60x40-4000",
  title: "Lať 60 × 40 mm / 4 m",
  quantity: 1,
  quantityUnitLabel: "ks",
  details: ["Profil: 60 × 40 mm", "Délka: 4 m"],
  availability: "in-stock",
  pricing: { basis: "linear-meter", rate: 22, displayUnit: "bm" },
  dimensions: { widthMm: 60, heightMm: 40, lengthMm: 4000 },
};

describe("upsertCatalogItem", () => {
  it("sloučí stejnou konfiguraci a znovu vypočítá cenu i bm", () => {
    const first = upsertCatalogItem([], lathInput, () => "test-id");
    const merged = upsertCatalogItem(first, { ...lathInput, quantity: 2 }, () => "unused");
    expect(merged).toHaveLength(1);
    expect(merged[0]).toMatchObject({ quantity: 3, totalPrice: 264 });
    expect(merged[0].kind === "catalog" && merged[0].totalLinearMeters).toBe(12);
  });
});
