import { Link } from "@tanstack/react-router";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Mail } from "lucide-react";
import { QuantitySelector } from "@/components/quantity-selector";
import { SiteShell } from "@/components/site-shell";
import { Button } from "@/components/ui/button";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { WoodVisualizer } from "@/components/wood-visualizer";
import { useCart } from "@/lib/cart";
import { type ProductCategory } from "@/lib/product-catalog";
import { COMPANY_EMAIL_HREF, formatCurrency } from "@/lib/site";

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
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-12 w-full rounded-2xl border border-border bg-white px-4 text-sm font-semibold text-foreground shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
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
  const visualQuantity = useDeferredValue(quantity);

  const dimensionOptions = useMemo(
    () => (category.kind === "dimensioned" ? category.getDimensionOptions() : []),
    [category],
  );
  const [dimension, setDimension] = useState(dimensionOptions[0]?.value ?? "");
  const [length, setLength] = useState(
    category.kind === "dimensioned"
      ? (category.getLengthOptions(dimensionOptions[0]?.value ?? "")[0]?.value ?? "")
      : category.kind === "length-only"
        ? (category.getLengthOptions()[0]?.value ?? "")
        : "",
  );
  const optionOptions = useMemo(
    () => (category.kind === "option-only" ? category.getOptionOptions() : []),
    [category],
  );
  const [option, setOption] = useState(
    category.kind === "option-only" ? (category.getOptionOptions()[0]?.value ?? "") : "",
  );

  const lengthOptions = useMemo(() => {
    if (category.kind === "dimensioned") {
      return category.getLengthOptions(dimension);
    }

    if (category.kind === "option-only") {
      return [];
    }

    return category.getLengthOptions();
  }, [category, dimension]);

  useEffect(() => {
    const nextLength = lengthOptions[0]?.value ?? "";
    if (!lengthOptions.some((option) => option.value === length) && nextLength) {
      setLength(nextLength);
    }
  }, [length, lengthOptions]);

  useEffect(() => {
    const nextOption = optionOptions[0]?.value ?? "";
    if (!optionOptions.some((item) => item.value === option) && nextOption) {
      setOption(nextOption);
    }
  }, [option, optionOptions]);

  const unitPrice = useMemo(() => {
    if (category.kind === "dimensioned") {
      return category.priceMap[dimension]?.[length] ?? 0;
    }

    if (category.kind === "option-only") {
      return category.priceByOption[option] ?? 0;
    }

    return category.priceByLength[length] ?? 0;
  }, [category, dimension, length, option]);

  const totalPrice = unitPrice * quantity;
  const selectedDimensionLabel =
    category.kind === "dimensioned"
      ? (dimensionOptions.find((option) => option.value === dimension)?.label ?? dimension)
      : category.kind === "length-only"
        ? category.fixedDimensionLabel
        : "";
  const selectedLengthLabel =
    category.kind === "option-only"
      ? ""
      : (lengthOptions.find((option) => option.value === length)?.label ?? length);
  const selectedOptionLabel = optionOptions.find((item) => item.value === option)?.label ?? option;
  const selectionSummary =
    category.kind === "option-only"
      ? `${selectedOptionLabel} | ${quantity} ks`
      : `${selectedDimensionLabel} · ${selectedLengthLabel} | ${quantity} ks`;
  const inquiryHref = useMemo(() => {
    const subject = `Poptávka: ${category.shortName}`;
    const body = [
      "Dobrý den,",
      "",
      `mám zájem o produkt ${category.name}.`,
      `Konfigurace: ${selectionSummary}`,
      `Počet: ${quantity} ks`,
      "",
      "Prosím o potvrzení dostupnosti, ceny a dopravy.",
      "",
      "Děkuji.",
    ].join("\n");

    return `${COMPANY_EMAIL_HREF}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }, [category.name, category.shortName, quantity, selectionSummary]);

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

    if (category.kind === "option-only") {
      addStandardItem({
        title: category.getCartTitle(option),
        quantity,
        unitPrice,
        details: [...category.getCartDetails(option), `Počet: ${quantity} ks`],
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
      <section
        data-beam-configurator
        className="relative overflow-hidden border-b border-border bg-[linear-gradient(180deg,#f9f5ee_0%,#f3ede2_100%)]"
      >
        <div
          aria-hidden
          className="absolute inset-0 scale-110 bg-cover bg-center opacity-20 blur-sm"
          style={{ backgroundImage: "url('/images/woodpatern.jpg')" }}
        />
        <div className="relative mx-auto max-w-7xl px-4 py-10 sm:py-14">
          <Breadcrumb className="mb-4">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/">Domů</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink href={`/#${category.sectionAnchorId}`}>
                  {category.sectionTitle}
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{category.shortName}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <a
            href={`/#${category.sectionAnchorId}`}
            className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-[#234A33] transition hover:text-[#A86D38]"
          >
            <ArrowLeft className="h-4 w-4" />
            Zpět do obchodu
          </a>

          <div className="rounded-3xl border border-white/70 bg-white/88 p-6 shadow-sm backdrop-blur sm:p-8">
            <h1 className="text-3xl font-black tracking-tight text-[#1E293B] sm:text-5xl">
              {category.name}
            </h1>
            <p className="mt-3 max-w-2xl text-base font-semibold text-[#1E293B]/72">
              {category.subtitle}
            </p>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-[#1E293B]/65 sm:text-base">
              {category.description}
            </p>
          </div>

          <div className="mt-6 grid items-stretch gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(360px,460px)]">
            <div className="order-2 h-full lg:order-1">
              <WoodVisualizer
                categoryId={category.id}
                imageSrc={category.imageSrc}
                imageAlt={category.thumbnailAlt}
                quantity={visualQuantity}
              />
            </div>

            <div className="order-1 flex h-full flex-col rounded-3xl border border-[#234A33]/12 bg-white p-5 shadow-sm transition-shadow duration-300 hover:shadow-[0_20px_45px_rgba(35,74,51,0.08)] sm:p-7 lg:order-2">
              <div className="flex items-start justify-between gap-4">
                <h2 className="text-2xl font-black tracking-tight text-[#1E293B]">
                  Nastavte si sestavu
                </h2>
                <div className="min-w-[8.75rem] rounded-2xl bg-[#F6F4EE] px-4 py-3 text-right">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    {category.priceUnitLabel}
                  </div>
                  <div className="mt-1 text-xl font-black tracking-tight text-[color:var(--timber)] tabular-nums">
                    {formatCurrency(unitPrice)}
                  </div>
                </div>
              </div>

              <div className="mt-6 flex flex-1 flex-col gap-4">
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
                ) : category.kind === "option-only" ? (
                  <div className="grid gap-4">
                    <ProductSelect
                      value={option}
                      onChange={setOption}
                      options={optionOptions}
                      label={category.optionLabel}
                    />
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-2xl border border-border bg-[#F6F4EE] px-4 py-3">
                      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
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

                <QuantitySelector
                  quantity={quantity}
                  onChange={setQuantity}
                  min={1}
                  max={500}
                  sliderMax={20}
                />

                <div className="rounded-[1.75rem] border border-[#234A33]/10 bg-[#F6F4EE] p-5">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    Konfigurace
                  </div>
                  <div className="mt-2 text-base font-black leading-6 text-[#1E293B]">
                    {selectionSummary}
                  </div>

                  <div className="mt-5 flex items-end justify-between gap-4">
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                        Celkem
                      </div>
                      <div
                        aria-live="polite"
                        className="mt-1 min-w-[8ch] text-4xl font-black tracking-tight text-[#1E3A2B] tabular-nums"
                      >
                        {formatCurrency(totalPrice)}
                      </div>
                    </div>
                    <div className="rounded-full border border-white/70 bg-white px-3 py-1.5 text-sm font-bold text-[#1E293B] tabular-nums">
                      {quantity} ks
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <Button
                  type="button"
                  onClick={handleAddToCart}
                  className="h-12 w-full rounded-2xl bg-[#1e3a2b] text-sm font-bold text-white shadow-sm transition hover:bg-[#163022] hover:shadow-[0_14px_30px_rgba(30,58,43,0.18)]"
                >
                  {category.ctaLabel}
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="h-12 w-full rounded-2xl border-[#A86D38]/30 bg-[#FCFAF5] text-sm font-bold text-[#A86D38] shadow-sm transition hover:bg-[#F5ECDD] hover:text-[#8F5927]"
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
