import { Link } from "@tanstack/react-router";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FreeShippingProgress } from "@/components/free-shipping-progress";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { visibleVariantDetails, useCart } from "@/lib/cart";
import { formatCurrency } from "@/lib/site";

function billableUnitLabel(unit: string, amount: number) {
  if (unit !== "paleta") return unit;
  if (amount === 1) return "paleta";
  if (Number.isInteger(amount) && amount >= 2 && amount <= 4) return "palety";
  return "palet";
}

function formatBillableAmount(amount: number) {
  return new Intl.NumberFormat("cs-CZ", { maximumFractionDigits: 4 }).format(amount);
}

export function CartSheet() {
  const { items, estimatedTotal, isOpen, setIsOpen, removeItem, clearCart } = useCart();

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetContent
        side="right"
        className="w-full max-w-md border-l border-[#A86D38]/10 bg-[#FBF8F1] p-0 sm:max-w-lg"
      >
        <div className="flex h-full flex-col">
          <SheetHeader className="border-b border-[#A86D38]/10 px-4 py-4 text-left min-[381px]:px-6 min-[381px]:py-5">
            <SheetTitle className="text-2xl font-black tracking-tight text-[#1E293B]">
              Košík
            </SheetTitle>
            <SheetDescription className="text-sm text-[#1E293B]/70">
              V košíku máte {items.length} položek
            </SheetDescription>
          </SheetHeader>

          <ScrollArea className="min-h-0 flex-1">
            <div className="mb-4 space-y-3 px-3 py-4 min-[381px]:space-y-4 min-[381px]:px-6 min-[381px]:py-6">
              {items.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-[#A86D38]/35 bg-white px-6 py-10 text-center">
                  <div className="text-lg font-black tracking-tight text-[#1E293B]">
                    Košík je zatím prázdný
                  </div>
                  <p className="mt-2 text-sm text-[#1E293B]/70">
                    Přidejte stavební řezivo nebo palivo. Pergoly mají vlastní poptávkový formulář.
                  </p>
                </div>
              ) : (
                items.map((item) => (
                  <article
                    key={item.id}
                    className="rounded-2xl border border-[#A86D38]/15 bg-white p-3 shadow-sm min-[381px]:rounded-3xl"
                  >
                    <div className="flex flex-col items-start gap-2">
                      <button
                        onClick={() => removeItem(item.id)}
                        className="rounded-full border border-[#A86D38]/15 px-3 py-1.5 text-xs font-bold text-[#1E293B]/70 transition hover:border-[#A86D38]/40 hover:text-[#1E293B]"
                      >
                        Odebrat
                      </button>
                      <h3 className="text-lg font-black tracking-tight text-[#1E293B]">
                        {item.title}
                      </h3>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-1 text-[11px] text-[#1E293B]/75 min-[381px]:mt-4">
                      {(item.kind === "catalog" && item.productId === "pergoly"
                        ? item.details
                        : visibleVariantDetails(item.title, item.details, item.quantity)
                      ).map((detail) => (
                        <div key={detail} className="rounded-full bg-[#F5F2E9]/70 px-2 py-0.5">
                          {detail}
                        </div>
                      ))}
                      {item.kind === "catalog" && (
                        <div className="rounded-full border border-[#A86D38]/10 bg-[#FFF9EF] px-2 py-0.5 font-semibold text-[#70451F]">
                          {formatCurrency(item.rate)} / {item.billableUnit}
                          {item.pricing.basis !== "piece" && (
                            <>
                              {" · "}
                              {item.pricing.basis === "cubic-meter"
                                ? formatBillableAmount(item.billableAmount)
                                : new Intl.NumberFormat("cs-CZ", {
                                    maximumFractionDigits: 2,
                                  }).format(item.billableAmount)}{" "}
                              {billableUnitLabel(item.billableUnit, item.billableAmount)}
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-3 border-t border-[#A86D38]/10 pt-3 text-[#1E293B]">
                      <div className="text-sm font-semibold">
                        {item.quantity} {item.quantityUnitLabel}
                      </div>
                      <div className="text-lg font-black tracking-tight text-[#234A33]">
                        {formatCurrency(item.totalPrice)}
                      </div>
                    </div>
                  </article>
                ))
              )}
            </div>
          </ScrollArea>

          <div className="shrink-0 border-t border-[#A86D38]/10 bg-white px-3 py-3 min-[381px]:px-6 min-[381px]:py-5">
            {items.length > 0 && <FreeShippingProgress cartValue={estimatedTotal} />}
            <div className="flex items-end justify-between gap-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#1E293B]/55">
                  Cena celkem
                </div>
                <div className="mt-1 text-3xl font-black tracking-tight text-[#234A33]">
                  {estimatedTotal > 0 ? formatCurrency(estimatedTotal) : "Na dotaz"}
                </div>
              </div>
              {items.length > 0 && (
                <button
                  onClick={clearCart}
                  className="rounded-2xl border border-[#A86D38]/15 px-4 py-2 text-sm font-bold text-[#1E293B]/70 transition hover:border-[#A86D38]/35 hover:text-[#1E293B]"
                >
                  Vymazat vše
                </button>
              )}
            </div>

            <Link
              to="/checkout"
              onClick={() => setIsOpen(false)}
              className="mt-3 inline-flex w-full items-center justify-center rounded-2xl bg-[#A86D38] px-6 py-4 text-base font-black text-white shadow-lg shadow-[#A86D38]/20 transition hover:bg-[#8A5528] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#234A33] focus-visible:ring-offset-2 min-[381px]:mt-4 min-[381px]:text-lg"
            >
              Přejít k objednávce
            </Link>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
