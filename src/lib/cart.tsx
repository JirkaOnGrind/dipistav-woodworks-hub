/* eslint-disable react-refresh/only-export-components */

import { createContext, useContext, useState, type ReactNode } from "react";
import { formatDecimal } from "@/lib/site";

type CartItemBase = {
  id: string;
  title: string;
  quantity: number;
  details: string[];
  totalPrice?: number;
  unitPrice?: number;
};

export type StandardCartInput = {
  title: string;
  quantity?: number;
  unitPrice?: number;
  details?: string[];
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

type StandardCartItem = CartItemBase & {
  kind: "standard";
};

type CustomCartItem = CartItemBase & {
  kind: "custom";
  widthMm: number;
  heightMm: number;
  lengthM: number;
  species: string;
  volumeM3: number;
};

export type CartItem = StandardCartItem | CustomCartItem;

type CartContextValue = {
  items: CartItem[];
  itemCount: number;
  estimatedTotal: number;
  isOpen: boolean;
  setIsOpen: (nextOpen: boolean) => void;
  openCart: () => void;
  addStandardItem: (item: StandardCartInput) => void;
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

function customDetails(item: CustomCartInput) {
  return [
    `Rozměr: ${item.widthMm} × ${item.heightMm} mm`,
    `Délka: ${item.lengthM.toFixed(1).replace(".", ",")} m`,
    `Počet: ${item.quantity} ks`,
    `Dřevina: ${item.species}`,
    `Objem: ${formatDecimal(item.volumeM3)} m³`,
  ];
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const addStandardItem = (item: StandardCartInput) => {
    const quantity = item.quantity ?? 1;
    const details = item.details ?? [];

    setItems((currentItems) => {
      const existingIndex = currentItems.findIndex(
        (currentItem) =>
          currentItem.kind === "standard" &&
          currentItem.title === item.title &&
          currentItem.unitPrice === item.unitPrice &&
          JSON.stringify(currentItem.details) === JSON.stringify(details),
      );

      if (existingIndex >= 0) {
        return currentItems.map((currentItem, index) => {
          if (index !== existingIndex) {
            return currentItem;
          }

          const nextQuantity = currentItem.quantity + quantity;
          return {
            ...currentItem,
            quantity: nextQuantity,
            totalPrice:
              currentItem.unitPrice != null
                ? currentItem.unitPrice * nextQuantity
                : currentItem.totalPrice,
          };
        });
      }

      return [
        ...currentItems,
        {
          id: createCartId(),
          kind: "standard",
          title: item.title,
          quantity,
          details,
          unitPrice: item.unitPrice,
          totalPrice: item.unitPrice != null ? item.unitPrice * quantity : undefined,
        },
      ];
    });

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
    estimatedTotal: items.reduce((total, item) => total + (item.totalPrice ?? 0), 0),
    isOpen,
    setIsOpen,
    openCart: () => setIsOpen(true),
    addStandardItem,
    addCustomItem,
    removeItem: (itemId: string) =>
      setItems((currentItems) => currentItems.filter((item) => item.id !== itemId)),
    clearCart: () => setItems([]),
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error("useCart musí být použit uvnitř CartProvider.");
  }

  return context;
}
