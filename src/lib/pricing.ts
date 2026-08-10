export type Availability = "in-stock" | "out-of-stock";

export type PriceDefinition =
  | {
      basis: "piece";
      rate: number;
      displayUnit: "ks" | "balení" | "balík" | "paleta";
    }
  | { basis: "linear-meter"; rate: number; displayUnit: "bm" }
  | { basis: "cubic-meter"; rate: number; displayUnit: "m³" };

export type VariantDimensions = {
  thicknessMm?: number;
  widthMm?: number;
  heightMm?: number;
  lengthMm?: number;
};

export type PriceableVariant = {
  availability: Availability;
  dimensions?: VariantDimensions;
  pricing: PriceDefinition | null;
};

export type CatalogQuote = {
  billableAmount: number;
  billableUnit: PriceDefinition["displayUnit"];
  quantity: number;
  rate: number;
  totalPrice: number;
  totalLinearMeters?: number;
  totalVolumeM3?: number;
};

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function calculateVariantQuote(
  variant: PriceableVariant,
  requestedQuantity: number,
): CatalogQuote | null {
  if (variant.availability !== "in-stock" || !variant.pricing) {
    return null;
  }

  const quantity = Math.max(1, Math.trunc(requestedQuantity));
  const { pricing } = variant;

  if (pricing.basis === "piece") {
    return {
      billableAmount: quantity,
      billableUnit: pricing.displayUnit,
      quantity,
      rate: pricing.rate,
      totalPrice: roundMoney(pricing.rate * quantity),
    };
  }

  if (pricing.basis === "linear-meter") {
    const lengthMm = variant.dimensions?.lengthMm;

    if (!lengthMm) {
      throw new Error("Pro cenu za bm musí mít varianta definovanou délku.");
    }

    const totalLinearMeters = (lengthMm / 1000) * quantity;
    return {
      billableAmount: totalLinearMeters,
      billableUnit: pricing.displayUnit,
      quantity,
      rate: pricing.rate,
      totalLinearMeters,
      totalPrice: roundMoney(pricing.rate * totalLinearMeters),
    };
  }

  const { thicknessMm, widthMm, lengthMm } = variant.dimensions ?? {};

  if (!thicknessMm || !widthMm || !lengthMm) {
    throw new Error("Pro cenu za m³ musí mít varianta tloušťku, šířku a délku.");
  }

  const totalVolumeM3 = (thicknessMm / 1000) * (widthMm / 1000) * (lengthMm / 1000) * quantity;

  return {
    billableAmount: totalVolumeM3,
    billableUnit: pricing.displayUnit,
    quantity,
    rate: pricing.rate,
    totalPrice: roundMoney(pricing.rate * totalVolumeM3),
    totalVolumeM3,
  };
}
