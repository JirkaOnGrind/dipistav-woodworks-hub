/* eslint-disable react-refresh/only-export-components */

import { createContext, useContext, useState, type ReactNode } from "react";
import {
  calculateVariantQuote,
  type Availability,
  type PriceDefinition,
  type VariantDimensions,
} from "@/lib/pricing";
import { formatDecimal } from "@/lib/site";

type CartItemBase = {
  id: string;
  title: string;
  quantity: number;
  quantityUnitLabel: string;
  details: string[];
  totalPrice: number;
};

export type CatalogCartInput = {
  productId: string;
  modeId?: string;
  variantId: string;
  title: string;
  quantity: number;
  quantityUnitLabel: string;
  details: string[];
  availability: Availability;
  pricing: PriceDefinition | null;
  dimensions?: VariantDimensions;
};

export type CustomCartInput = {
  widthMm: number;
  heightMm: number;
  lengthM: number;
  quantity: number;
  species: string;
  volumeM3: number;
  totalPrice: number;
};

export type CatalogCartItem = CartItemBase & {
  kind: "catalog";
  configKey: string;
  productId: string;
  modeId?: string;
  variantId: string;
  availability: Availability;
  pricing: PriceDefinition;
  dimensions?: VariantDimensions;
  rate: number;
  billableAmount: number;
  billableUnit: PriceDefinition["displayUnit"];
  totalLinearMeters?: number;
  totalVolumeM3?: number;
};

type CustomCartItem = CartItemBase & {
  kind: "custom";
  widthMm: number;
  heightMm: number;
  lengthM: number;
  species: string;
  volumeM3: number;
};

export type CartItem = CatalogCartItem | CustomCartItem;

type CartContextValue = {
  items: CartItem[];
  itemCount: number;
  estimatedTotal: number;
  isOpen: boolean;
  setIsOpen: (nextOpen: boolean) => void;
  openCart: () => void;
  addCatalogItem: (item: CatalogCartInput) => void;
  addCustomItem: (item: CustomCartInput) => void;
  removeItem: (itemId: string) => void;
  clearCart: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

function createCartId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2, 10);
}

function createConfigKey(item: Pick<CatalogCartInput, "productId" | "modeId" | "variantId">) {
  return [item.productId, item.modeId ?? "default", item.variantId].join(":");
}

function customDetails(item: CustomCartInput) {
  return [
    `Rozměr: ${item.widthMm} × ${item.heightMm} mm`,
    `Délka: ${item.lengthM.toFixed(1).replace(".", ",")} m`,
    `Dřevina: ${item.species}`,
    `Objem: ${formatDecimal(item.volumeM3, 4)} m³`,
  ];
}

export function upsertCatalogItem(
  currentItems: CartItem[],
  input: CatalogCartInput,
  idFactory: () => string = createCartId,
) {
  const initialQuote = calculateVariantQuote(input, input.quantity);
  if (!initialQuote || !input.pricing) return currentItems;

  const configKey = createConfigKey(input);
  const existingIndex = currentItems.findIndex(
    (item) => item.kind === "catalog" && item.configKey === configKey,
  );

  if (existingIndex >= 0) {
    return currentItems.map((item, index) => {
      if (index !== existingIndex || item.kind !== "catalog") return item;
      const quantity = item.quantity + input.quantity;
      const quote = calculateVariantQuote(item, quantity);
      if (!quote) return item;
      return {
        ...item,
        quantity,
        rate: quote.rate,
        billableAmount: quote.billableAmount,
        billableUnit: quote.billableUnit,
        totalLinearMeters: quote.totalLinearMeters,
        totalVolumeM3: quote.totalVolumeM3,
        totalPrice: quote.totalPrice,
      };
    });
  }

  return [
    ...currentItems,
    {
      id: idFactory(),
      kind: "catalog" as const,
      configKey,
      productId: input.productId,
      modeId: input.modeId,
      variantId: input.variantId,
      title: input.title,
      quantity: input.quantity,
      quantityUnitLabel: input.quantityUnitLabel,
      details: input.details,
      availability: input.availability,
      pricing: input.pricing,
      dimensions: input.dimensions,
      rate: initialQuote.rate,
      billableAmount: initialQuote.billableAmount,
      billableUnit: initialQuote.billableUnit,
      totalLinearMeters: initialQuote.totalLinearMeters,
      totalVolumeM3: initialQuote.totalVolumeM3,
      totalPrice: initialQuote.totalPrice,
    },
  ];
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const addCatalogItem = (input: CatalogCartInput) => {
    setItems((currentItems) => upsertCatalogItem(currentItems, input));
    setIsOpen(true);
  };

  const addCustomItem = (item: CustomCartInput) => {
    setItems((currentItems) => [
      ...currentItems,
      {
        id: createCartId(),
        kind: "custom",
        title: "Řezivo na míru",
        quantity: item.quantity,
        quantityUnitLabel: "ks",
        details: customDetails(item),
        widthMm: item.widthMm,
        heightMm: item.heightMm,
        lengthM: item.lengthM,
        species: item.species,
        volumeM3: item.volumeM3,
        totalPrice: item.totalPrice,
      },
    ]);
    setIsOpen(true);
  };

  const value: CartContextValue = {
    items,
    itemCount: items.reduce((total, item) => total + item.quantity, 0),
    estimatedTotal: items.reduce((total, item) => total + item.totalPrice, 0),
    isOpen,
    setIsOpen,
    openCart: () => setIsOpen(true),
    addCatalogItem,
    addCustomItem,
    removeItem: (itemId) =>
      setItems((currentItems) => currentItems.filter((item) => item.id !== itemId)),
    clearCart: () => setItems([]),
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart musí být použit uvnitř CartProvider.");
  return context;
}
