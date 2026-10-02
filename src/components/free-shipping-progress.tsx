import { Truck } from "lucide-react";
import { formatCurrency } from "@/lib/site";
import { FREE_SHIPPING_THRESHOLD, freeShippingRemaining } from "@/lib/order-system";

export function FreeShippingProgress({ cartValue }: { cartValue: number }) {
  const remaining = freeShippingRemaining(cartValue);
  const qualified = cartValue > FREE_SHIPPING_THRESHOLD;
  const progress = Math.min(100, (cartValue / (FREE_SHIPPING_THRESHOLD + 0.01)) * 100);

  return (
    <section
      className="rounded-2xl border border-border bg-white px-4 py-3 shadow-sm"
      aria-live="polite"
    >
      <div className="flex items-center justify-between gap-3 text-sm font-bold text-foreground">
        <span className="flex items-center gap-2">
          <Truck className="size-4 text-[color:var(--timber)]" aria-hidden />
          {qualified
            ? "Dopravu máte zdarma"
            : `${formatCurrency(remaining)} zbývá do dopravy zdarma`}
        </span>
        <span className="text-xs text-muted-foreground">nad 100 000 Kč</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-[color:var(--forest)] transition-[width] duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
    </section>
  );
}
