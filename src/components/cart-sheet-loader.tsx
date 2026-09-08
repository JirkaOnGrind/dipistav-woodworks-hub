import { lazy, Suspense, useEffect, useState } from "react";
import { useCart } from "@/lib/cart";

const loadCartSheet = () =>
  import("@/components/cart-sheet").then((module) => ({ default: module.CartSheet }));
const LazyCartSheet = lazy(loadCartSheet);

export function preloadCartSheet() {
  void loadCartSheet();
}

export function CartSheetLoader() {
  const { isOpen } = useCart();
  const [hasOpened, setHasOpened] = useState(false);
  const [isPrepared, setIsPrepared] = useState(false);

  useEffect(() => {
    if (isOpen) setHasOpened(true);
  }, [isOpen]);

  useEffect(() => {
    let active = true;
    const preload = () => {
      void loadCartSheet().then(() => {
        if (active) setIsPrepared(true);
      });
    };
    const idleWindow = window as Window & {
      requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
      cancelIdleCallback?: (handle: number) => void;
    };
    if (idleWindow.requestIdleCallback) {
      const handle = idleWindow.requestIdleCallback(preload, { timeout: 5000 });
      return () => {
        active = false;
        idleWindow.cancelIdleCallback?.(handle);
      };
    }
    const handle = window.setTimeout(preload, 5000);
    return () => {
      active = false;
      window.clearTimeout(handle);
    };
  }, []);

  if (!isOpen && !hasOpened && !isPrepared) return null;
  return (
    <Suspense fallback={null}>
      <LazyCartSheet />
    </Suspense>
  );
}
