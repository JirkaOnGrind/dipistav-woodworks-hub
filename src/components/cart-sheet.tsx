import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useCart } from "@/lib/cart";
import { COMPANY_EMAIL_HREF, COMPANY_PHONE, COMPANY_PHONE_HREF, formatCurrency } from "@/lib/site";

export function CartSheet() {
  const { items, itemCount, estimatedTotal, isOpen, setIsOpen, removeItem, clearCart } = useCart();

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetContent
        side="right"
        className="w-full max-w-md border-l border-[#A86D38]/10 bg-[#FBF8F1] p-0 sm:max-w-lg"
      >
        <div className="flex h-full flex-col">
          <SheetHeader className="border-b border-[#A86D38]/10 px-6 py-5 text-left">
            <SheetTitle className="text-2xl font-black tracking-tight text-[#1E293B]">
              Košík a poptávka
            </SheetTitle>
            <SheetDescription className="text-sm text-[#1E293B]/70">
              {itemCount === 0
                ? "Zatím tu není žádná položka."
                : `Vybráno ${itemCount} ${itemCount === 1 ? "kus" : itemCount < 5 ? "kusy" : "kusů"} k nacenění nebo objednání.`}
            </SheetDescription>
          </SheetHeader>

          <ScrollArea className="flex-1">
            <div className="space-y-4 px-6 py-6">
              {items.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-[#A86D38]/35 bg-white px-6 py-10 text-center">
                  <div className="text-lg font-black tracking-tight text-[#1E293B]">
                    Košík je zatím prázdný
                  </div>
                  <p className="mt-2 text-sm text-[#1E293B]/70">
                    Přidejte stavební řezivo nebo vlastní poptávku z konfigurátoru a vše se sem
                    ihned propíše.
                  </p>
                </div>
              ) : (
                items.map((item) => (
                  <article
                    key={item.id}
                    className="rounded-3xl border border-[#A86D38]/15 bg-white p-5 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="inline-flex rounded-full bg-[#F5F2E9] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#A86D38]">
                          {item.kind === "custom" ? "Poptávka na míru" : "Skladová položka"}
                        </div>
                        <h3 className="mt-3 text-lg font-black tracking-tight text-[#1E293B]">
                          {item.title}
                        </h3>
                      </div>

                      <button
                        onClick={() => removeItem(item.id)}
                        className="rounded-full border border-[#A86D38]/15 px-3 py-1.5 text-xs font-bold text-[#1E293B]/70 transition hover:border-[#A86D38]/40 hover:text-[#1E293B]"
                      >
                        Odebrat
                      </button>
                    </div>

                    <div className="mt-4 space-y-2 text-sm text-[#1E293B]/75">
                      {item.details.map((detail) => (
                        <div key={detail} className="rounded-2xl bg-[#F5F2E9]/70 px-3 py-2">
                          {detail}
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 flex items-end justify-between gap-4 rounded-2xl bg-[#234A33] px-4 py-3 text-white">
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-white/65">
                          Počet
                        </div>
                        <div className="mt-1 text-sm font-bold">{item.quantity} ks</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-white/65">
                          {item.kind === "custom" ? "Orientační cena" : "Cena položky"}
                        </div>
                        <div className="mt-1 text-lg font-black tracking-tight">
                          {item.totalPrice != null ? formatCurrency(item.totalPrice) : "Na dotaz"}
                        </div>
                      </div>
                    </div>
                  </article>
                ))
              )}
            </div>
          </ScrollArea>

          <div className="border-t border-[#A86D38]/10 bg-white px-6 py-5">
            <div className="flex items-end justify-between gap-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#1E293B]/55">
                  Odhad celkem
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

            <div className="mt-4 rounded-3xl bg-[#F5F2E9] p-4 text-sm text-[#1E293B]/80">
              Pro dokončení objednávky nebo poptávky nám zavolejte na{" "}
              <a className="font-bold text-[#234A33]" href={COMPANY_PHONE_HREF}>
                {COMPANY_PHONE}
              </a>{" "}
              nebo napište na{" "}
              <a className="font-bold text-[#234A33]" href={COMPANY_EMAIL_HREF}>
                info@dipistav.cz
              </a>
              .
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
