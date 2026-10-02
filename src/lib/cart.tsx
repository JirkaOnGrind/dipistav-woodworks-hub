/* eslint-disable react-refresh/only-export-components */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
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
type CartActions = Pick<
  CartContextValue,
  "setIsOpen" | "openCart" | "addCatalogItem" | "addCustomItem" | "removeItem" | "clearCart"
>;
const CartActionsContext = createContext<CartActions | null>(null);
const CART_STORAGE_KEY = "dipistav-cart-v1";
let cartMemory: CartItem[] | undefined;

function isCartItem(value: unknown): value is CartItem {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<CartItem>;
  return (
    typeof item.id === "string" &&
    (item.kind === "catalog" || item.kind === "custom") &&
    typeof item.title === "string" &&
    typeof item.quantity === "number" &&
    typeof item.quantityUnitLabel === "string" &&
    Array.isArray(item.details) &&
    item.details.every((detail) => typeof detail === "string") &&
    typeof item.totalPrice === "number"
  );
}

function readStoredItems() {
  if (typeof window === "undefined") return [];
  try {
    const stored = JSON.parse(window.localStorage.getItem(CART_STORAGE_KEY) ?? "null") as unknown;
    if (!stored || typeof stored !== "object") return [];
    const payload = stored as { version?: unknown; items?: unknown };
    return payload.version === 1 && Array.isArray(payload.items) && payload.items.every(isCartItem)
      ? payload.items.filter((item) => item.kind !== "catalog" || item.productId !== "pergoly")
      : [];
  } catch {
    return [];
  }
}

function persistItems(items: CartItem[]) {
  cartMemory = items;
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify({ version: 1, items }));
  } catch {
    // The in-memory store still keeps the cart alive when storage is unavailable.
  }
}

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

function normalizedText(value: string) {
  return value
    .toLocaleLowerCase("cs-CZ")
    .replace(/[^a-z0-9á-ž]+/gi, " ")
    .trim();
}

export function uniqueCartDetails(title: string, details: string[], quantity: number) {
  const titleText = normalizedText(title);
  const titleParts = title.split("/").map(normalizedText);
  const quantityText = String(quantity);
  const seen = new Set<string>();

  return details.filter((detail) => {
    const [label, ...valueParts] = detail.split(":");
    const normalizedLabel = normalizedText(label);
    const value = normalizedText(valueParts.length > 0 ? valueParts.join(":") : label);
    const normalizedDetail = normalizedText(detail);
    const isDimensionAlreadyInTitle =
      ["profil", "délka", "šířka", "tloušťka", "rozměr"].includes(normalizedLabel) &&
      titleText.includes(value);
    const isDuplicate =
      !value ||
      titleText === value ||
      titleParts.includes(value) ||
      isDimensionAlreadyInTitle ||
      (/^počet\b/i.test(detail) && normalizedDetail.includes(quantityText)) ||
      seen.has(normalizedDetail);
    seen.add(normalizedDetail);
    return !isDuplicate;
  });
}

const VISIBLE_VARIANT_DETAIL_LABELS = new Set(["typ", "tloušťka", "délka", "profil"]);
const HIDDEN_VARIANT_DETAIL_TEXT = ["výpočtová šířka", "průměr skupiny"];

export function visibleVariantDetails(title: string, details: string[], quantity: number) {
  return uniqueCartDetails(title, details, quantity).filter((detail) => {
    const [label = ""] = detail.split(":");
    const normalizedDetail = normalizedText(detail);
    return (
      VISIBLE_VARIANT_DETAIL_LABELS.has(normalizedText(label)) &&
      !HIDDEN_VARIANT_DETAIL_TEXT.some((hiddenText) => normalizedDetail.includes(hiddenText))
    );
  });
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
  const [items, setItems] = useState<CartItem[]>(() => cartMemory ?? []);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (cartMemory) return;
    const storedItems = readStoredItems();
    cartMemory = storedItems;
    setItems(storedItems);
  }, []);

  const updateItems = useCallback((updater: (currentItems: CartItem[]) => CartItem[]) => {
    setItems((currentItems) => {
      const nextItems = updater(currentItems);
      persistItems(nextItems);
      return nextItems;
    });
  }, []);

  const addCatalogItem = useCallback(
    (input: CatalogCartInput) => {
      if (input.productId === "pergoly") return;
      updateItems((currentItems) => upsertCatalogItem(currentItems, input));
      setIsOpen(true);
    },
    [updateItems],
  );

  const addCustomItem = useCallback(
    (item: CustomCartInput) => {
      updateItems((currentItems) => [
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
    },
    [updateItems],
  );

  const actions = useMemo<CartActions>(
    () => ({
      setIsOpen,
      openCart: () => setIsOpen(true),
      addCatalogItem,
      addCustomItem,
      removeItem: (itemId) =>
        updateItems((currentItems) => currentItems.filter((item) => item.id !== itemId)),
      clearCart: () => updateItems(() => []),
    }),
    [addCatalogItem, addCustomItem, updateItems],
  );
  const value = useMemo<CartContextValue>(
    () => ({
      items,
      itemCount: items.length,
      estimatedTotal: items.reduce((total, item) => total + item.totalPrice, 0),
      isOpen,
      ...actions,
    }),
    [actions, isOpen, items],
  );

  return (
    <CartActionsContext.Provider value={actions}>
      <CartContext.Provider value={value}>{children}</CartContext.Provider>
    </CartActionsContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart musí být použit uvnitř CartProvider.");
  return context;
}

export function useCartActions() {
  const context = useContext(CartActionsContext);
  if (!context) throw new Error("useCartActions musí být použit uvnitř CartProvider.");
  return context;
}
