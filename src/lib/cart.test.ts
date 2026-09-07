import { describe, expect, it } from "vitest";
import {
  uniqueCartDetails,
  upsertCatalogItem,
  visibleVariantDetails,
  type CatalogCartInput,
} from "@/lib/cart";

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

describe("uniqueCartDetails", () => {
  it("skryje variantu a počet, pokud už jsou uvedené v kartě", () => {
    expect(
      uniqueCartDetails(
        "Pelety / Pytel 15 kg",
        ["Varianta: Pytel 15 kg", "Počet: 2 balení", "Hmotnost: 15 kg"],
        2,
      ),
    ).toEqual(["Hmotnost: 15 kg"]);
  });

  it("skryje profil a délku obsažené v názvu produktu", () => {
    expect(
      uniqueCartDetails(
        "Fošna 4 × 14 cm × 400 cm",
        ["Profil: 4 × 14 cm", "Délka: 400 cm", "Dřevina: Smrk"],
        3,
      ),
    ).toEqual(["Dřevina: Smrk"]);
  });
});

describe("visibleVariantDetails", () => {
  it("propustí pouze veřejné rozměrové štítky a skryje výpočtová metadata", () => {
    expect(
      visibleVariantDetails(
        "Prkna",
        [
          "Typ: Tříděná",
          "Tloušťka: 25 mm",
          "Délka: 4 m",
          "Profil: 4 × 14 cm",
          "Šířka: 14–18 cm",
          "Výpočtová šířka: 16 cm (průměr skupiny)",
          "Interní koeficient: 0,16",
        ],
        1,
      ),
    ).toEqual(["Typ: Tříděná", "Tloušťka: 25 mm", "Délka: 4 m", "Profil: 4 × 14 cm"]);
  });
});
