import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Mail, ShoppingCart } from "lucide-react";
import { QuantitySelector } from "@/components/quantity-selector";
import { SiteShell } from "@/components/site-shell";
import { Button } from "@/components/ui/button";
import { WoodVisualizer } from "@/components/wood-visualizer";
import { useCart } from "@/lib/cart";
import {
  getDefaultModeId,
  getSelectionLabel,
  getSelectionOptions,
  getVariantDetails,
  getVariantTitle,
  normalizeSelection,
  resolveProductVariant,
  type ProductCategory,
  type SelectOption,
} from "@/lib/product-catalog";
import { calculateVariantQuote } from "@/lib/pricing";
import { COMPANY_EMAIL_HREF, formatCurrency, formatDecimal } from "@/lib/site";

function ProductSelect({
  value,
  onChange,
  options,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  label: string;
}) {
  const isFixed = options.length === 1;

  if (isFixed) {
    return (
      <div className="block" aria-label={`${label}: ${options[0].label}`}>
        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {label}
        </span>
        <div className="flex h-12 items-center rounded-2xl border border-[#234A33]/8 bg-[#F6F4EE] px-4 text-sm font-bold text-[#1E293B]">
          {options[0].label}
        </div>
      </div>
    );
  }

  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-12 w-full cursor-pointer rounded-2xl border border-border bg-white px-4 text-sm font-semibold text-foreground shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
      >
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
            disabled={option.availability === "out-of-stock"}
          >
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function pricingLabel(category: ProductCategory, basis?: string) {
  if (basis === "linear-meter") return "Cena / bm";
  if (basis === "cubic-meter") return "Cena / m³";
  if (category.id === "pelety" || category.id === "stipane-drevo") return "Cena / balení";
  if (category.id === "krajinky") return "Cena / balík";
  if (category.id === "drivi-na-paletach") return "Cena / paleta";
  return "Cena / ks";
}

export function ProductDetailPage({ category }: { category: ProductCategory }) {
  const { addCatalogItem } = useCart();
  const initialModeId = getDefaultModeId(category);
  const [modeId, setModeId] = useState<string | undefined>(initialModeId);
  const [selection, setSelection] = useState(() => normalizeSelection(category, initialModeId));
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    const nextModeId = getDefaultModeId(category);
    setModeId(nextModeId);
    setSelection(normalizeSelection(category, nextModeId));
    setQuantity(1);
  }, [category]);

  const selectorOptions = useMemo(
    () =>
      Object.fromEntries(
        category.selectors.map((selector) => [
          selector.key,
          getSelectionOptions(category, selector.key, modeId, selection),
        ]),
      ),
    [category, modeId, selection],
  );

  const variant = useMemo(
    () => resolveProductVariant(category, modeId, selection),
    [category, modeId, selection],
  );
  const quote = useMemo(
    () => (variant ? calculateVariantQuote(variant, quantity) : null),
    [quantity, variant],
  );
  const isUnavailable = !variant || variant.availability === "out-of-stock" || !quote;

  const selectionSummary = category.selectors
    .map((selector) => getSelectionLabel(category, selector.key, selection[selector.key] ?? ""))
    .filter(Boolean)
    .join(" · ");
  const activeModeLabel = category.modes?.find((mode) => mode.id === modeId)?.label;
  const fullSelectionSummary = [
    activeModeLabel,
    selectionSummary,
    `${quantity} ${category.quantityUnitLabel}`,
  ]
    .filter(Boolean)
    .join(" | ");

  const inquiryHref = useMemo(() => {
    const pricingLine = isUnavailable
      ? "Dostupnost: momentálně nenaskladněno"
      : quote && variant?.pricing
        ? `Sazba: ${formatCurrency(quote.rate)} / ${variant.pricing.displayUnit}; celkem ${formatCurrency(quote.totalPrice)}`
        : "";
    const metricLine = quote?.totalVolumeM3
      ? `Objem: ${formatDecimal(quote.totalVolumeM3, 4)} m³`
      : quote?.totalLinearMeters
        ? `Běžné metry: ${formatDecimal(quote.totalLinearMeters, 2)} bm`
        : "";
    const body = [
      "Dobrý den,",
      "",
      `mám zájem o produkt ${category.name}.`,
      `Konfigurace: ${fullSelectionSummary}`,
      pricingLine,
      metricLine,
      "",
      "Prosím o potvrzení dostupnosti, ceny a dopravy.",
      "",
      "Děkuji.",
    ]
      .filter((line) => line !== "")
      .join("\n");
    return `${COMPANY_EMAIL_HREF}?subject=${encodeURIComponent(`Poptávka: ${category.shortName}`)}&body=${encodeURIComponent(body)}`;
  }, [category.name, category.shortName, fullSelectionSummary, isUnavailable, quote, variant]);

  const changeMode = (nextModeId: string) => {
    setModeId(nextModeId);
    setSelection(normalizeSelection(category, nextModeId));
  };

  const changeSelection = (key: string, value: string) => {
    setSelection((current) => normalizeSelection(category, modeId, { ...current, [key]: value }));
  };

  const handleAddToCart = () => {
    if (!variant || !variant.pricing || !quote) return;
    addCatalogItem({
      productId: category.id,
      modeId,
      variantId: variant.id,
      title: getVariantTitle(category, variant),
      quantity,
      quantityUnitLabel: category.quantityUnitLabel,
      details: getVariantDetails(category, variant),
      availability: variant.availability,
      pricing: variant.pricing,
      dimensions: variant.dimensions,
    });
  };

  return (
    <SiteShell>
      <section
        data-beam-configurator
        className="relative overflow-x-clip border-b border-border bg-[linear-gradient(180deg,#f9f5ee_0%,#f3ede2_100%)]"
      >
        <div
          aria-hidden
          className="absolute inset-0 scale-110 bg-cover bg-center opacity-20 blur-sm"
          style={{ backgroundImage: "url('/images/woodpatern.jpg')" }}
        />
        <div className="relative mx-auto w-full min-w-0 max-w-7xl px-4 py-10 sm:py-14">
          <a
            href={`/#${category.sectionAnchorId}`}
            className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-[#234A33] transition hover:text-[#A86D38]"
          >
            <ArrowLeft className="h-4 w-4" />
            Zpět do obchodu
          </a>

          <div className="max-w-3xl py-1 sm:py-3">
            <h1 className="text-3xl font-black tracking-[-0.035em] text-[#1E293B] sm:text-5xl">
              {category.name}
            </h1>
            <p className="mt-3 text-base font-bold text-[#1E293B]/72">{category.subtitle}</p>
            <p className="mt-2 text-sm leading-7 text-[#1E293B]/65 sm:text-base">
              {category.description}
            </p>
          </div>

          <div className="mt-6 grid min-w-0 items-stretch gap-6 xl:grid-cols-[minmax(0,1.08fr)_minmax(25rem,0.92fr)]">
            <div className="order-1 h-full min-w-0">
              <WoodVisualizer
                categoryId={category.id}
                imageSrc={category.imageSrc}
                imageAlt={category.thumbnailAlt}
                quantity={quantity}
                quantityUnitLabel={category.quantityUnitLabel}
                variant={variant}
              />
            </div>

            <div className="order-2 flex h-full min-w-0 flex-col rounded-3xl border border-[#234A33]/12 bg-white p-5 shadow-[0_18px_50px_rgba(30,58,43,0.08)] sm:p-7">
              <div className="flex min-w-0 flex-wrap items-start justify-between gap-4">
                <h2 className="text-2xl font-black tracking-tight text-[#1E293B]">
                  Nastavte si sestavu
                </h2>
                <div className="min-w-[8.75rem] rounded-2xl bg-[#F6F4EE] px-4 py-3 text-right">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    {pricingLabel(category, variant?.pricing?.basis)}
                  </div>
                  <div className="mt-1 text-xl font-black tracking-tight text-[color:var(--timber)] tabular-nums">
                    {variant?.pricing ? formatCurrency(variant.pricing.rate) : "—"}
                  </div>
                </div>
              </div>

              <div className="mt-6 flex flex-1 flex-col gap-4">
                {category.modes && (
                  <div
                    role="group"
                    aria-label="Typ prken"
                    className="grid grid-cols-2 gap-2 rounded-2xl bg-[#F6F4EE] p-1.5"
                  >
                    {category.modes.map((mode) => (
                      <button
                        key={mode.id}
                        type="button"
                        aria-pressed={mode.id === modeId}
                        onClick={() => changeMode(mode.id)}
                        className={`rounded-xl px-3 py-2.5 text-sm font-bold transition ${
                          mode.id === modeId
                            ? "bg-[#234A33] text-white shadow-sm"
                            : "text-[#1E293B]/70 hover:bg-white"
                        }`}
                      >
                        {mode.label}
                      </button>
                    ))}
                  </div>
                )}

                {category.id === "prkna" && (
                  <div className="rounded-2xl border border-border bg-[#F6F4EE] px-4 py-3">
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      Tloušťka
                    </div>
                    <div className="mt-1 text-base font-black text-[#1E293B]">25 mm</div>
                  </div>
                )}

                <div
                  className={`grid gap-4 ${category.selectors.length > 1 ? "sm:grid-cols-2" : ""}`}
                >
                  {category.selectors.map((selector) => (
                    <ProductSelect
                      key={selector.key}
                      value={selection[selector.key] ?? ""}
                      onChange={(value) => changeSelection(selector.key, value)}
                      options={selectorOptions[selector.key] ?? []}
                      label={selector.label}
                    />
                  ))}
                </div>

                <QuantitySelector
                  quantity={quantity}
                  onChange={setQuantity}
                  min={1}
                  max={500}
                  label={category.quantityLabel}
                />

                {isUnavailable ? (
                  <div
                    role="status"
                    className="rounded-[1.75rem] border border-amber-300 bg-amber-50 p-5"
                  >
                    <div className="text-sm font-black text-amber-900">
                      Momentálně nenaskladněno
                    </div>
                    <p className="mt-1 text-sm leading-6 text-amber-900/75">
                      Tuto variantu nyní nelze vložit do košíku. Dostupnost vám rádi ověříme
                      poptávkou.
                    </p>
                  </div>
                ) : (
                  <div className="rounded-[1.75rem] border border-[#234A33]/10 bg-[#F6F4EE] p-5">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                      Konfigurace
                    </div>
                    <div className="mt-2 break-words text-base font-black leading-6 text-[#1E293B]">
                      {fullSelectionSummary}
                    </div>
                    {quote?.totalLinearMeters != null && (
                      <div className="mt-3 text-sm font-semibold text-[#70451F]">
                        Celkem {formatDecimal(quote.totalLinearMeters, 2)} bm
                      </div>
                    )}
                    {quote?.totalVolumeM3 != null && (
                      <div className="mt-3 text-sm font-semibold text-[#70451F]">
                        Objem {formatDecimal(quote.totalVolumeM3, 4)} m³
                      </div>
                    )}
                    <div className="mt-5 flex items-end justify-between gap-4">
                      <div>
                        <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                          Celkem
                        </div>
                        <div
                          aria-live="polite"
                          className="mt-1 text-4xl font-black tracking-tight text-[#1E3A2B] tabular-nums"
                        >
                          {quote ? formatCurrency(quote.totalPrice) : "—"}
                        </div>
                      </div>
                      <div className="rounded-full border border-white/70 bg-white px-3 py-1.5 text-sm font-bold text-[#1E293B]">
                        {quantity} {category.quantityUnitLabel}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <Button
                  type="button"
                  onClick={handleAddToCart}
                  disabled={isUnavailable}
                  className="h-12 w-full rounded-2xl bg-[#1e3a2b] text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-45"
                >
                  {!isUnavailable && <ShoppingCart className="h-4 w-4" />}
                  {isUnavailable ? "Nenaskladněno" : category.ctaLabel}
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="h-12 w-full rounded-2xl border-[#A86D38]/30 bg-[#FCFAF5] text-sm font-bold text-[#A86D38]"
                >
                  <a href={inquiryHref}>
                    <Mail className="h-4 w-4" />
                    Poslat poptávku
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
