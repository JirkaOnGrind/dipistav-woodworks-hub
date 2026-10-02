import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { Building2, Check, LoaderCircle, MapPin, Truck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  calculateMockShipping,
  isMoravianPostcode,
  isValidPostcode,
  lookupCompanyByIco,
  normalizePostcode,
  type CompanyDetails,
  type FlowType,
  type ShippingQuote,
} from "@/lib/order-system";
import { formatCurrency } from "@/lib/site";

export type CustomerFormState = {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  street: string;
  city: string;
  postcode: string;
  isBusiness: boolean;
  company: CompanyDetails;
  fulfillment: "pickup" | "delivery";
  payment: "cash" | "card";
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex min-w-0 flex-col gap-1.5 text-sm font-bold text-foreground">
      {label}
      {children}
    </label>
  );
}

export function CustomerDetailsForm({
  flow,
  value,
  onChange,
  cartValue = 0,
  onShippingQuote,
}: {
  flow: FlowType;
  value: CustomerFormState;
  onChange: Dispatch<SetStateAction<CustomerFormState>>;
  cartValue?: number;
  onShippingQuote: Dispatch<SetStateAction<ShippingQuote | null>>;
}) {
  const [aresState, setAresState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [aresMessage, setAresMessage] = useState("");
  const [shippingState, setShippingState] = useState<"idle" | "loading" | "success" | "error">(
    "idle",
  );
  const lookupId = useRef(0);
  const postcode = normalizePostcode(value.postcode);
  const moraviaBlocked = flow === "pergola_inquiry" && isMoravianPostcode(postcode);
  const freeShipping = flow === "order" && cartValue > 100_000;

  const update = <K extends keyof CustomerFormState>(key: K, next: CustomerFormState[K]) =>
    onChange({ ...value, [key]: next });

  useEffect(() => {
    if (!value.isBusiness || value.company.ico.length !== 8) {
      setAresState("idle");
      setAresMessage("");
      return;
    }
    const currentLookup = ++lookupId.current;
    setAresState("loading");
    setAresMessage("Načítám údaje z ARES…");
    const timer = window.setTimeout(() => {
      lookupCompanyByIco(value.company.ico)
        .then((company) => {
          if (lookupId.current !== currentLookup) return;
          onChange((current) => ({ ...current, company }));
          setAresState("success");
          setAresMessage("Firma byla nalezena a údaje doplněny.");
        })
        .catch((error: unknown) => {
          if (lookupId.current !== currentLookup) return;
          setAresState("error");
          setAresMessage(error instanceof Error ? error.message : "ARES je dočasně nedostupný.");
        });
    }, 280);
    return () => window.clearTimeout(timer);
  }, [onChange, value.company.ico, value.isBusiness]);

  useEffect(() => {
    if (value.fulfillment === "pickup" || !isValidPostcode(postcode) || moraviaBlocked) {
      setShippingState("idle");
      onShippingQuote(null);
      return;
    }
    setShippingState("loading");
    const timer = window.setTimeout(() => {
      calculateMockShipping(postcode)
        .then((quote) => {
          onShippingQuote(freeShipping ? { ...quote, price: 0 } : quote);
          setShippingState("success");
        })
        .catch(() => {
          onShippingQuote(null);
          setShippingState("error");
        });
    }, 220);
    return () => window.clearTimeout(timer);
  }, [freeShipping, moraviaBlocked, onShippingQuote, postcode, value.fulfillment]);

  return (
    <div className="flex flex-col gap-5">
      <fieldset className="rounded-2xl border border-border bg-white p-4 sm:p-5">
        <legend className="px-1 text-lg font-black">Kontaktní údaje</legend>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <Field label="Jméno">
            <Input
              required
              autoComplete="given-name"
              value={value.firstName}
              onChange={(event) => update("firstName", event.target.value)}
            />
          </Field>
          <Field label="Příjmení">
            <Input
              required
              autoComplete="family-name"
              value={value.lastName}
              onChange={(event) => update("lastName", event.target.value)}
            />
          </Field>
          <Field label="Telefon">
            <Input
              required
              type="tel"
              autoComplete="tel"
              value={value.phone}
              onChange={(event) => update("phone", event.target.value)}
            />
          </Field>
          <Field label="E-mail">
            <Input
              required
              type="email"
              autoComplete="email"
              value={value.email}
              onChange={(event) => update("email", event.target.value)}
            />
          </Field>
        </div>
      </fieldset>

      <fieldset className="rounded-2xl border border-border bg-white p-4 sm:p-5">
        <legend className="px-1 text-lg font-black">Fakturační údaje</legend>
        <label className="mt-3 flex items-center justify-between gap-4 rounded-xl bg-muted/55 p-3 text-sm font-bold">
          <span className="flex items-center gap-2">
            <Building2 className="size-4" /> Nakupuji na firmu
          </span>
          <Switch
            checked={value.isBusiness}
            onCheckedChange={(checked) => update("isBusiness", checked)}
          />
        </label>
        {value.isBusiness ? (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="IČO">
              <Input
                inputMode="numeric"
                maxLength={8}
                value={value.company.ico}
                onChange={(event) =>
                  update("company", {
                    ...value.company,
                    ico: event.target.value.replace(/\D/g, "").slice(0, 8),
                  })
                }
              />
            </Field>
            <div className="flex items-end">
              <div
                className="flex min-h-9 w-full items-center gap-2 rounded-md bg-muted px-3 text-sm"
                role="status"
              >
                {aresState === "loading" ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : aresState === "success" ? (
                  <Check className="size-4 text-[color:var(--forest)]" />
                ) : null}
                <span
                  className={aresState === "error" ? "text-destructive" : "text-muted-foreground"}
                >
                  {aresMessage || "Doplníme údaje automaticky."}
                </span>
              </div>
            </div>
            <Field label="Název firmy">
              <Input
                value={value.company.companyName}
                onChange={(event) =>
                  update("company", { ...value.company, companyName: event.target.value })
                }
              />
            </Field>
            <Field label="DIČ">
              <Input
                value={value.company.dic}
                onChange={(event) =>
                  update("company", { ...value.company, dic: event.target.value })
                }
              />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Fakturační adresa">
                <Input
                  value={value.company.billingAddress}
                  onChange={(event) =>
                    update("company", { ...value.company, billingAddress: event.target.value })
                  }
                />
              </Field>
            </div>
          </div>
        ) : null}
      </fieldset>

      {flow === "order" ? (
        <fieldset className="rounded-2xl border border-border bg-white p-4 sm:p-5">
          <legend className="px-1 text-lg font-black">Způsob převzetí</legend>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {(["pickup", "delivery"] as const).map((option) => (
              <label
                key={option}
                className="flex cursor-pointer gap-3 rounded-xl border border-border p-4 has-[:checked]:border-[color:var(--forest)] has-[:checked]:bg-muted/60"
              >
                <input
                  type="radio"
                  name="fulfillment"
                  value={option}
                  checked={value.fulfillment === option}
                  onChange={() => update("fulfillment", option)}
                />
                <span className="flex gap-2 text-sm font-bold">
                  {option === "pickup" ? (
                    <MapPin className="size-4" />
                  ) : (
                    <Truck className="size-4" />
                  )}
                  {option === "pickup" ? "Vyzvednutí ve Všesulově · 0 Kč" : "Doprava DIPISTAV"}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}

      {flow === "pergola_inquiry" || value.fulfillment === "delivery" ? (
        <fieldset className="rounded-2xl border border-border bg-white p-4 sm:p-5">
          <legend className="px-1 text-lg font-black">
            {flow === "pergola_inquiry" ? "Místo realizace" : "Dodací adresa"}
          </legend>
          <div className="mt-3 grid gap-4 sm:grid-cols-[1.5fr_.7fr_1fr]">
            <Field label="Ulice a číslo popisné">
              <Input
                required
                autoComplete="street-address"
                value={value.street}
                onChange={(event) => update("street", event.target.value)}
              />
            </Field>
            <Field label="PSČ">
              <Input
                required
                inputMode="numeric"
                autoComplete="postal-code"
                value={value.postcode}
                aria-invalid={moraviaBlocked}
                onChange={(event) => update("postcode", normalizePostcode(event.target.value))}
              />
            </Field>
            <Field label="Město">
              <Input
                required
                autoComplete="address-level2"
                value={value.city}
                onChange={(event) => update("city", event.target.value)}
              />
            </Field>
          </div>
          {moraviaBlocked ? (
            <p
              className="mt-3 rounded-xl bg-destructive/10 px-4 py-3 text-sm font-bold text-destructive"
              role="alert"
            >
              Delivery not available for this region
            </p>
          ) : null}
          {shippingState === "loading" ? (
            <p className="mt-3 text-sm text-muted-foreground">Počítám trasu z Všesulova…</p>
          ) : null}
          {shippingState === "error" ? (
            <p className="mt-3 text-sm text-destructive">
              Dopravu se nepodařilo spočítat. Zkuste to znovu.
            </p>
          ) : null}
        </fieldset>
      ) : null}

      {flow === "order" ? (
        <fieldset className="rounded-2xl border border-border bg-white p-4 sm:p-5">
          <legend className="px-1 text-lg font-black">Platba při převzetí</legend>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {(["cash", "card"] as const).map((payment) => (
              <label
                key={payment}
                className="flex cursor-pointer gap-3 rounded-xl border border-border p-4 has-[:checked]:border-[color:var(--forest)] has-[:checked]:bg-muted/60"
              >
                <input
                  type="radio"
                  name="payment"
                  value={payment}
                  checked={value.payment === payment}
                  onChange={() => update("payment", payment)}
                />
                <span className="text-sm font-bold">
                  {payment === "cash" ? "Hotově řidiči" : "Kartou u řidiče"}
                </span>
              </label>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Nejde o online platbu. Volbu předáme řidiči.
          </p>
        </fieldset>
      ) : null}
    </div>
  );
}
