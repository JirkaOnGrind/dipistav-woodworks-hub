import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { SiteShell } from "@/components/site-shell";
import { QuantitySelector } from "@/components/quantity-selector";
import { WoodVisualizer } from "@/components/wood-visualizer";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart";
import { formatCurrency } from "@/lib/site";
import { type ProductCategory } from "@/lib/product-catalog";

function ProductSelect({
  value,
  onChange,
  options,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  label: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-xl border border-border bg-white px-3 text-sm font-medium text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function ProductDetailPage({ category }: { category: ProductCategory }) {
  const { addStandardItem } = useCart();
  const [quantity, setQuantity] = useState(1);

  const dimensionOptions = useMemo(
    () => (category.kind === "dimensioned" ? category.getDimensionOptions() : []),
    [category],
  );
  const [dimension, setDimension] = useState(dimensionOptions[0]?.value ?? "");
  const [length, setLength] = useState(
    category.kind === "dimensioned"
      ? (category.getLengthOptions(dimensionOptions[0]?.value ?? "")[0]?.value ?? "")
      : (category.getLengthOptions()[0]?.value ?? ""),
  );

  const lengthOptions = useMemo(() => {
    if (category.kind === "dimensioned") {
      return category.getLengthOptions(dimension);
    }

    return category.getLengthOptions();
  }, [category, dimension]);

  useEffect(() => {
    const nextLength = lengthOptions[0]?.value ?? "";
    if (!lengthOptions.some((option) => option.value === length) && nextLength) {
      setLength(nextLength);
    }
  }, [length, lengthOptions]);

  const unitPrice = useMemo(() => {
    if (category.kind === "dimensioned") {
      return category.priceMap[dimension]?.[length] ?? 0;
    }

    return category.priceByLength[length] ?? 0;
  }, [category, dimension, length]);

  const totalPrice = unitPrice * quantity;
  const selectedLengthLabel =
    lengthOptions.find((option) => option.value === length)?.label ?? length;
  const selectionSummary =
    category.kind === "dimensioned"
      ? `${dimensionOptions.find((option) => option.value === dimension)?.label ?? dimension} · ${selectedLengthLabel}`
      : `${category.fixedDimensionLabel} · ${selectedLengthLabel}`;

  const handleAddToCart = () => {
    if (category.kind === "dimensioned") {
      addStandardItem({
        title: category.getCartTitle(dimension, length),
        quantity,
        unitPrice,
        details: [...category.getCartDetails(dimension, length), `Počet: ${quantity} ks`],
      });
      return;
    }

    addStandardItem({
      title: category.getCartTitle(length),
      quantity,
      unitPrice,
      details: [...category.getCartDetails(length), `Počet: ${quantity} ks`],
    });
  };

  return (
    <SiteShell>
      <section className="relative overflow-hidden border-b border-border bg-[linear-gradient(180deg,#f7f3ea_0%,#f5f2e9_100%)]">
        <div
          aria-hidden
          className="absolute inset-0 scale-110 bg-cover bg-center opacity-25 blur-sm"
          style={{ backgroundImage: "url('/images/woodpatern.jpg')" }}
        />
        <div className="relative mx-auto max-w-7xl px-4 py-10 sm:py-14">
          <Link
            to="/"
            className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-[#234A33] transition hover:text-[#A86D38]"
          >
            <ArrowLeft className="h-4 w-4" />
            Zpět na kategorie
          </Link>

          <div className="grid gap-6 md:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)] md:items-start">
            <div className="space-y-5">
              <div className="rounded-[2rem] border border-white/60 bg-white/85 p-5 shadow-sm backdrop-blur sm:p-7">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#A86D38]">
                  Produktový detail
                </p>
                <h1 className="mt-3 text-3xl font-black tracking-tight text-[#1E293B] sm:text-5xl">
                  {category.name}
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-[#1E293B]/72 sm:text-base">
                  {category.description}
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {category.previewNotes.map((note) => (
                    <div
                      key={note}
                      className="rounded-full border border-[#A86D38]/15 bg-white px-3 py-1.5 text-sm font-semibold text-[#234A33]"
                    >
                      {note}
                    </div>
                  ))}
                </div>
              </div>

              <WoodVisualizer
                imageSrc={category.imageSrc}
                name={category.shortName}
                quantity={quantity}
              />
            </div>

            <div className="rounded-[2rem] border border-[#234A33]/15 bg-white p-5 shadow-sm sm:p-7">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#A86D38]">
                    Konfigurátor
                  </p>
                  <h2 className="mt-2 text-2xl font-black tracking-tight text-[#1E293B]">
                    Nastavte si sestavu
                  </h2>
                </div>
                <div className="rounded-2xl bg-[color:var(--sand)] px-3 py-2 text-right">
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {category.priceUnitLabel}
                  </div>
                  <div className="text-xl font-black tracking-tight text-[color:var(--timber)]">
                    {formatCurrency(unitPrice)}
                  </div>
                </div>
              </div>

              <div className="mt-6 space-y-4">
                {category.kind === "dimensioned" ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <ProductSelect
                      value={dimension}
                      onChange={setDimension}
                      options={dimensionOptions}
                      label={category.dimensionLabel}
                    />
                    <ProductSelect
                      value={length}
                      onChange={setLength}
                      options={lengthOptions}
                      label={category.lengthLabel}
                    />
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-2xl border border-border bg-[color:var(--sand)]/70 px-4 py-3">
                      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Profil
                      </div>
                      <div className="mt-1 text-base font-black text-[#1E293B]">
                        {category.fixedDimensionLabel}
                      </div>
                    </div>
                    <ProductSelect
                      value={length}
                      onChange={setLength}
                      options={lengthOptions}
                      label={category.lengthLabel}
                    />
                  </div>
                )}

                <QuantitySelector quantity={quantity} onChange={setQuantity} />

                <div className="rounded-[1.5rem] border border-[#234A33]/10 bg-[#F1F5EE] p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Aktuální konfigurace
                      </div>
                      <div className="mt-1 text-lg font-black text-[#1E293B]">
                        {selectionSummary}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Celkem
                      </div>
                      <div className="mt-1 text-3xl font-black tracking-tight text-[#234A33]">
                        {formatCurrency(totalPrice)}
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-2 text-sm text-[#1E293B]/75">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-[#A86D38]" />
                      <span>Množství upravíte krokově na mobilu i přes slider na desktopu.</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-[#A86D38]" />
                      <span>
                        Při vyšším počtu kusů se vizualizace automaticky zkrátí na 12 prvků.
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <Button
                type="button"
                onClick={handleAddToCart}
                className="mt-6 h-12 w-full rounded-xl bg-[#234A33] text-sm font-bold text-white hover:bg-[#1A3826]"
              >
                {category.ctaLabel}
              </Button>
            </div>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
