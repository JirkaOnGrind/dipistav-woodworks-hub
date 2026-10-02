import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, CheckCircle2, LockKeyhole, MapPinned, PackageCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteShell } from "@/components/site-shell";
import { CustomerDetailsForm, type CustomerFormState } from "@/components/customer-details-form";
import { visibleVariantDetails, useCart } from "@/lib/cart";
import {
  cartItemsForOrder,
  isMoravianPostcode,
  readPergolaInquiry,
  type FlowType,
  type ShippingQuote,
} from "@/lib/order-system";
import {
  DEFAULT_PERGOLA,
  PERGOLA_MODELS,
  ROOF_COLORS,
  WOOD_PAINTS,
  quotePergola,
} from "@/lib/pergola";
import { formatCurrency } from "@/lib/site";

const EMPTY_CUSTOMER_FORM: CustomerFormState = {
  firstName: "",
  lastName: "",
  phone: "",
  email: "",
  street: "",
  city: "",
  postcode: "",
  isBusiness: false,
  company: { ico: "", dic: "", companyName: "", billingAddress: "" },
  fulfillment: "delivery",
  payment: "cash",
};

export function OrderFlowPage({ flow }: { flow: FlowType }) {
  const cart = useCart();
  const items = useMemo(() => cartItemsForOrder(cart.items), [cart.items]);
  const cartValue = items.reduce((total, item) => total + item.totalPrice, 0);
  const [customer, setCustomer] = useState<CustomerFormState>(EMPTY_CUSTOMER_FORM);
  const [shipping, setShipping] = useState<ShippingQuote | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const pergola = useMemo(
    () =>
      (typeof window === "undefined" ? DEFAULT_PERGOLA : readPergolaInquiry()) ?? DEFAULT_PERGOLA,
    [],
  );
  const pergolaQuote = quotePergola(pergola);
  const isInquiry = flow === "pergola_inquiry";
  const shippingPrice = customer.fulfillment === "pickup" ? 0 : (shipping?.price ?? 0);
  const grandTotal = cartValue + shippingPrice;
  const blocked = isInquiry && isMoravianPostcode(customer.postcode);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (blocked) return;
    setSubmitted(true);
    if (!isInquiry) cart.clearCart();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (submitted) {
    return (
      <SiteShell>
        <section className="mx-auto flex min-h-[66vh] max-w-2xl items-center px-4 py-12">
          <div className="w-full rounded-3xl border border-border bg-white p-7 text-center shadow-sm sm:p-10">
            <CheckCircle2 className="mx-auto size-12 text-[color:var(--forest)]" aria-hidden />
            <h1 className="mt-5 text-3xl font-black tracking-tight">
              {isInquiry ? "Poptávka je připravená" : "Objednávka je připravená"}
            </h1>
            <p className="mx-auto mt-3 max-w-lg text-muted-foreground">
              Běžíte v ukázkovém režimu. Po připojení Supabase se záznam bezpečně uloží a objeví v
              administraci.
            </p>
            <Button asChild className="mt-6">
              <Link to="/">Zpět na úvod</Link>
            </Button>
          </div>
        </section>
      </SiteShell>
    );
  }

  return (
    <SiteShell productDetail>
      <section className="bg-muted/35">
        <div className="mx-auto max-w-7xl px-4 py-6 lg:py-8">
          <Link
            to={isInquiry ? "/category/$id" : "/"}
            params={isInquiry ? { id: "pergoly" } : undefined}
            className="inline-flex items-center gap-2 text-sm font-bold text-[color:var(--forest)]"
          >
            <ArrowLeft className="size-4" aria-hidden />{" "}
            {isInquiry ? "Zpět ke konfiguraci" : "Pokračovat v nákupu"}
          </Link>
          <div className="mt-3">
            <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
              {isInquiry ? "Nezávazná poptávka pergoly" : "Dokončení objednávky"}
            </h1>
            <p className="mt-2 text-muted-foreground">
              {isInquiry
                ? "Vyplňte kontaktní údaje. Pergola zůstává oddělená od nákupního košíku."
                : "Zkontrolujte údaje, dopravu a způsob platby při převzetí."}
            </p>
          </div>

          <form
            onSubmit={submit}
            className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_370px]"
          >
            <CustomerDetailsForm
              flow={flow}
              value={customer}
              onChange={setCustomer}
              cartValue={cartValue}
              onShippingQuote={setShipping}
            />

            <aside className="rounded-3xl border border-border bg-white p-5 shadow-sm lg:sticky lg:top-24">
              <h2 className="text-xl font-black">
                {isInquiry ? "Vaše pergola" : "Shrnutí objednávky"}
              </h2>
              <div className="mt-4 flex flex-col gap-3">
                {isInquiry ? (
                  <>
                    <div className="rounded-2xl bg-muted/60 p-4">
                      <div className="font-black">{PERGOLA_MODELS[pergola.model].label}</div>
                      <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                        <dt className="text-muted-foreground">Rozměr</dt>
                        <dd className="font-bold">
                          {pergola.width} × {pergola.depth} × {pergola.height} m
                        </dd>
                        <dt className="text-muted-foreground">Nátěr</dt>
                        <dd className="font-bold">{WOOD_PAINTS[pergola.wood].label}</dd>
                        <dt className="text-muted-foreground">Střecha</dt>
                        <dd className="font-bold">
                          {pergola.roofing ? ROOF_COLORS[pergola.roof].label : "Bez zastřešení"}
                        </dd>
                      </dl>
                    </div>
                    <div className="flex items-end justify-between gap-4 border-t border-border pt-4">
                      <span className="text-sm text-muted-foreground">Orientační cena</span>
                      <strong className="text-2xl text-[color:var(--forest)]">
                        {formatCurrency(pergolaQuote.total)}
                      </strong>
                    </div>
                  </>
                ) : items.length > 0 ? (
                  items.map((item) => (
                    <article key={item.id} className="border-b border-border pb-3 last:border-0">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-black">{item.title}</h3>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {visibleVariantDetails(item.title, item.details, item.quantity).join(
                              " · ",
                            ) || `${item.quantity} ${item.quantityUnitLabel}`}
                          </p>
                        </div>
                        <strong className="whitespace-nowrap">
                          {formatCurrency(item.totalPrice)}
                        </strong>
                      </div>
                    </article>
                  ))
                ) : (
                  <div className="rounded-2xl bg-muted p-4 text-sm text-muted-foreground">
                    Košík je prázdný. Přidejte nejprve řezivo nebo palivo.
                  </div>
                )}
              </div>

              {shipping ? (
                <div className="mt-4 rounded-2xl bg-[color:var(--forest)] p-4 text-white">
                  <div className="flex items-center gap-2 font-black">
                    <MapPinned className="size-4" /> Výpočet dopravy
                  </div>
                  <p className="mt-2 text-sm text-white/75">
                    Všesulov → PSČ {shipping.destinationPostcode}
                  </p>
                  <div className="mt-3 flex items-end justify-between gap-3">
                    <span className="text-sm">2 × {shipping.oneWayKm} km × 35 Kč</span>
                    <strong className="text-xl">{formatCurrency(shipping.price)}</strong>
                  </div>
                  <p className="mt-2 text-xs text-white/60">
                    Ukázkový výpočet · Mapy.cz se připojí po doplnění klíče.
                  </p>
                </div>
              ) : null}

              {!isInquiry ? (
                <div className="mt-4 flex items-end justify-between gap-4 border-t border-border pt-4">
                  <span className="font-bold">Celkem</span>
                  <strong className="text-3xl text-[color:var(--forest)]">
                    {formatCurrency(grandTotal)}
                  </strong>
                </div>
              ) : null}

              <Button
                type="submit"
                className="mt-5 h-12 w-full"
                disabled={blocked || (!isInquiry && items.length === 0)}
              >
                <PackageCheck data-icon="inline-start" />{" "}
                {isInquiry ? "Odeslat poptávku" : "Odeslat objednávku"}
              </Button>
              <p className="mt-3 flex items-start gap-2 text-xs text-muted-foreground">
                <LockKeyhole className="mt-0.5 size-3.5 shrink-0" /> Data se v ostrém režimu
                ukládají pouze přes zabezpečené Supabase rozhraní.
              </p>
            </aside>
          </form>
        </div>
      </section>
    </SiteShell>
  );
}
