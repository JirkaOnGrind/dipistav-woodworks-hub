import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ShippingCalculator } from "@/components/shipping-calculator";
import { SiteShell } from "@/components/site-shell";
import { type CustomCartInput, type StandardCartInput, useCart } from "@/lib/cart";
import { COMPANY_EMAIL_HREF, COMPANY_PHONE, COMPANY_PHONE_HREF, formatCurrency } from "@/lib/site";

const ART: Record<string, string> = {
  tram: "/images/tramy-dipi.png",
  fosna: "/images/fosny-dipi.png",
  prkno: "/images/prkna-dipi.png",
  lat: "/images/late-dipi.png",
};

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "DIPISTAV – Pila a prodej dřeva | Stavební řezivo a paliva" },
      {
        name: "description",
        content:
          "Kvalitní stavební řezivo, KVH hranoly, palivové dřevo a řezivo na míru do 8 m přímo z pily DIPISTAV.",
      },
      { property: "og:title", content: "DIPISTAV – Pila a prodej dřeva" },
      {
        property: "og:description",
        content:
          "Stavební trámy, fošny, prkna, latě a řezivo na míru přímo z pily. Rychlá doprava i osobní odběr.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

type PriceMap = Record<string, Record<string, number>>;
type ProductAddHandler = (item: StandardCartInput) => void;
type ConfigAddHandler = (item: CustomCartInput) => void;

const TRAMY: PriceMap = {
  "8x8": { "400": 272, "500": 290 },
  "10x10": { "400": 450, "500": 473 },
  "12x12": { "400": 612, "500": 739 },
  "14x14": { "400": 741, "500": 926 },
  "16x16": { "400": 1087, "500": 1313 },
  "20x20": { "400": 1512, "500": 1890 },
};

const FOSNY: PriceMap = {
  "4x14": { "400": 230 },
  "4x16": { "400": 263, "500": 329 },
  "4x20": { "400": 329, "500": 410 },
  "5x10": { "400": 212, "500": 201 },
  "5x12": { "400": 247, "500": 240 },
  "5x16": { "400": 290, "500": 362 },
  "5x20": { "400": 378, "500": 453 },
};

const PRKNA: PriceMap = {
  "8": { "300": 49.5, "400": 64.8, "500": 82.8 },
  "10": { "300": 63.9, "400": 85.5, "500": 107.1 },
  "12": { "300": 74.7, "400": 102.6, "500": 124.2 },
  "14": { "300": 90.0, "400": 119.7, "500": 138.6 },
};

const LATE: Record<string, number> = { "3000": 57, "4000": 76, "5000": 95 };

function Select({
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
        className="w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm font-medium text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
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

function AddToCartButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="mt-4 w-full rounded-lg bg-[#A86D38] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#8F5927] active:scale-[0.99]"
    >
      Do košíku
    </button>
  );
}

function PriceOut({ value }: { value: string }) {
  return (
    <div className="mt-4 flex items-end justify-between rounded-lg bg-[color:var(--sand)] px-4 py-3">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Cena / ks
      </span>
      <span className="text-2xl font-black tracking-tight text-[color:var(--timber)]">{value}</span>
    </div>
  );
}

function CardShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
      <div className="mb-4">
        <h3 className="text-lg font-black tracking-tight text-foreground">{title}</h3>
        <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>
      </div>
      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  );
}

function TramyCard({ onAdd }: { onAdd: ProductAddHandler }) {
  const profiles = Object.keys(TRAMY);
  const [profile, setProfile] = useState(profiles[0]);
  const [length, setLength] = useState("400");
  const activeLength = TRAMY[profile][length] ? length : Object.keys(TRAMY[profile])[0];
  const price = TRAMY[profile][activeLength];

  return (
    <CardShell title="Stavební trámy" subtitle="8×8 až 20×20 cm · 4 m / 5 m">
      <div className="grid grid-cols-2 gap-3">
        <Select
          label="Profil (cm)"
          value={profile}
          onChange={setProfile}
          options={profiles.map((item) => ({ value: item, label: item.replace("x", " × ") }))}
        />
        <Select
          label="Délka (cm)"
          value={activeLength}
          onChange={setLength}
          options={Object.keys(TRAMY[profile]).map((item) => ({ value: item, label: item }))}
        />
      </div>
      <PriceOut value={formatCurrency(price)} />
      <AddToCartButton
        onClick={() =>
          onAdd({
            title: `Trám ${profile.replace("x", "×")}×${activeLength} cm`,
            unitPrice: price,
            details: [`Profil: ${profile.replace("x", " × ")} cm`, `Délka: ${activeLength} cm`],
          })
        }
      />
    </CardShell>
  );
}

function FosnyCard({ onAdd }: { onAdd: ProductAddHandler }) {
  const profiles = Object.keys(FOSNY);
  const [profile, setProfile] = useState(profiles[0]);
  const [length, setLength] = useState("400");
  const activeLength = FOSNY[profile][length] ? length : Object.keys(FOSNY[profile])[0];
  const price = FOSNY[profile][activeLength];

  return (
    <CardShell title="Stavební fošny" subtitle="4×14 až 5×25 cm · 4 m / 5 m">
      <div className="grid grid-cols-2 gap-3">
        <Select
          label="Profil (cm)"
          value={profile}
          onChange={setProfile}
          options={profiles.map((item) => ({ value: item, label: item.replace("x", " × ") }))}
        />
        <Select
          label="Délka (cm)"
          value={activeLength}
          onChange={setLength}
          options={Object.keys(FOSNY[profile]).map((item) => ({ value: item, label: item }))}
        />
      </div>
      <PriceOut value={formatCurrency(price)} />
      <AddToCartButton
        onClick={() =>
          onAdd({
            title: `Fošna ${profile.replace("x", "×")}×${activeLength} cm`,
            unitPrice: price,
            details: [`Profil: ${profile.replace("x", " × ")} cm`, `Délka: ${activeLength} cm`],
          })
        }
      />
    </CardShell>
  );
}

function PrknaCard({ onAdd }: { onAdd: ProductAddHandler }) {
  const widths = Object.keys(PRKNA);
  const [width, setWidth] = useState(widths[0]);
  const [length, setLength] = useState("300");
  const activeLength = PRKNA[width][length] ? length : Object.keys(PRKNA[width])[0];
  const price = PRKNA[width][activeLength];

  return (
    <CardShell title="Stavební prkna" subtitle="Coulová · 8 až 20 cm × 300–500 cm">
      <div className="grid grid-cols-2 gap-3">
        <Select
          label="Šířka (cm)"
          value={width}
          onChange={setWidth}
          options={widths.map((item) => ({ value: item, label: `${item} cm` }))}
        />
        <Select
          label="Délka (cm)"
          value={activeLength}
          onChange={setLength}
          options={Object.keys(PRKNA[width]).map((item) => ({ value: item, label: item }))}
        />
      </div>
      <PriceOut value={formatCurrency(price)} />
      <AddToCartButton
        onClick={() =>
          onAdd({
            title: `Prkno ${width}×${activeLength} cm`,
            unitPrice: price,
            details: [`Šířka: ${width} cm`, `Délka: ${activeLength} cm`],
          })
        }
      />
    </CardShell>
  );
}

function LateCard({ onAdd }: { onAdd: ProductAddHandler }) {
  const [length, setLength] = useState("3000");
  const price = LATE[length];

  return (
    <CardShell title="Střešní latě 60×40 mm" subtitle="19 Kč / bm · 3 / 4 / 5 m">
      <Select
        label="Délka"
        value={length}
        onChange={setLength}
        options={[
          { value: "3000", label: "3 m" },
          { value: "4000", label: "4 m" },
          { value: "5000", label: "5 m" },
        ]}
      />
      <PriceOut value={formatCurrency(price)} />
      <AddToCartButton
        onClick={() =>
          onAdd({
            title: `Lať 60×40 mm / ${Number(length) / 1000} m`,
            unitPrice: price,
            details: [`Profil: 60 × 40 mm`, `Délka: ${Number(length) / 1000} m`],
          })
        }
      />
    </CardShell>
  );
}

function IsoWood({
  variant,
  className = "h-24 w-auto",
}: {
  variant: "tram" | "fosna" | "prkno" | "lat";
  className?: string;
}) {
  return (
    <img
      src={ART[variant]}
      alt=""
      loading="lazy"
      draggable={false}
      style={{ background: "transparent" }}
      className={`${className} select-none object-contain drop-shadow-[0_6px_10px_rgba(122,78,36,0.25)]`}
    />
  );
}

function CategoryCard({
  variant,
  title,
  subtitle,
}: {
  variant: "tram" | "fosna" | "prkno" | "lat";
  title: string;
  subtitle: string;
}) {
  return (
    <a
      href="/#produkty"
      className="group flex flex-col items-start gap-3 rounded-2xl border border-border bg-white p-4 transition hover:-translate-y-0.5 hover:border-[color:var(--timber)] hover:shadow-lg sm:p-5"
    >
      <div className="flex h-32 w-full items-center justify-center rounded-xl bg-[color:var(--sand)]/80 p-3 sm:h-40">
        <IsoWood variant={variant} className="max-h-[90%] w-auto" />
      </div>

      <div>
        <div className="text-sm font-black tracking-tight text-[color:var(--forest)] sm:text-base">
          {title}
        </div>
        <div className="text-xs text-muted-foreground sm:text-sm">{subtitle}</div>
      </div>
    </a>
  );
}

function ConfRow({
  label,
  value,
  min,
  max,
  step,
  onChange,
  suffix,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  suffix: string;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        <span className="text-sm font-bold text-foreground">
          {value} {suffix}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
          className="flex-1 accent-[#234A33]"
        />
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
          className="w-20 rounded-md border border-[#234A33]/25 bg-white px-2 py-1.5 text-sm font-semibold text-[#1E293B] focus:border-[#234A33] focus:outline-none focus:ring-2 focus:ring-[#234A33]/20"
        />
      </div>
    </div>
  );
}

function Configurator({ onAdd }: { onAdd: ConfigAddHandler }) {
  const [width, setWidth] = useState(100);
  const [height, setHeight] = useState(100);
  const [length, setLength] = useState(4);
  const [quantity, setQuantity] = useState(10);
  const [species, setSpecies] = useState("Smrk");

  const { volume, total } = useMemo(() => {
    const calculatedVolume = (width / 1000) * (height / 1000) * length * quantity;
    return { volume: calculatedVolume, total: Math.round(calculatedVolume * 8500) };
  }, [height, length, quantity, width]);

  return (
    <div className="rounded-3xl border border-[#234A33]/20 bg-[#F1F5EE] p-6 shadow-sm sm:p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-black tracking-tight text-[#1E293B] sm:text-3xl">
          Řezivo na míru do 8 m
        </h2>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-4">
          <ConfRow
            label="Šířka"
            value={width}
            min={20}
            max={300}
            step={5}
            onChange={setWidth}
            suffix="mm"
          />
          <ConfRow
            label="Výška"
            value={height}
            min={20}
            max={300}
            step={5}
            onChange={setHeight}
            suffix="mm"
          />
          <ConfRow
            label="Délka"
            value={length}
            min={1}
            max={8}
            step={0.1}
            onChange={setLength}
            suffix="m"
          />
          <ConfRow
            label="Počet kusů"
            value={quantity}
            min={1}
            max={500}
            step={1}
            onChange={setQuantity}
            suffix="ks"
          />
          <div>
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Dřevina
            </span>
            <div className="grid grid-cols-3 gap-2 rounded-xl bg-white/70 p-1">
              {["Smrk", "Borovice", "Modřín"].map((option) => (
                <button
                  key={option}
                  onClick={() => setSpecies(option)}
                  className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                    species === option
                      ? "bg-[#234A33] text-white shadow"
                      : "bg-transparent text-[#1E293B] hover:bg-white"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-between rounded-2xl border border-[#234A33]/20 bg-white p-6 shadow-md">
          <div className="space-y-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Objem
              </div>
              <div className="text-2xl font-black tracking-tight text-[#1E293B]">
                {volume.toFixed(3).replace(".", ",")} m³
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Sazba
              </div>
              <div className="text-sm font-semibold text-[#1E293B]">8 500 Kč / m³ · {species}</div>
            </div>
            <div className="rounded-xl bg-[#EAF0E4] p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Celková cena
              </div>
              <div className="mt-1 text-4xl font-black tracking-tight text-[#234A33]">
                {formatCurrency(total)}
              </div>
              <div className="text-xs text-muted-foreground">s DPH</div>
            </div>
          </div>
          <button
            onClick={() =>
              onAdd({
                widthMm: width,
                heightMm: height,
                lengthM: length,
                quantity,
                species,
                volumeM3: volume,
                totalPrice: total,
              })
            }
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#234A33] px-4 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#1A3826]"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
            >
              <path
                d="M3 4h2l2.4 12.5a2 2 0 0 0 2 1.5h8.2a2 2 0 0 0 2-1.6L21 8H6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="10" cy="21" r="1.4" fill="currentColor" />
              <circle cx="18" cy="21" r="1.4" fill="currentColor" />
            </svg>
            Přidat do poptávky
          </button>
        </div>
      </div>
    </div>
  );
}

function IconCheck() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
    >
      <path d="M4 12l5 5L20 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Index() {
  const { addStandardItem, addCustomItem } = useCart();

  return (
    <SiteShell>
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 scale-[1.22] bg-cover bg-center opacity-34 blur-[5px]"
          style={{ backgroundImage: "url('/images/woodpatern.jpg')" }}
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-[linear-gradient(180deg,rgba(245,242,233,0.72),rgba(245,242,233,0.83)_50%,rgba(245,242,233,0.96))]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-gradient-to-b from-transparent via-[#F5F2E9]/72 to-[#F5F2E9]"
        />

        <div className="relative mx-auto max-w-5xl px-4 py-10 sm:py-20 lg:py-28">
          <div className="text-center">
            <h1 className="text-[26px] font-bold leading-tight tracking-tight text-[#1E293B] sm:text-5xl sm:font-black sm:leading-[1.05] lg:text-6xl">
              Kvalitní stavební <span className="text-[#A86D38]">řezivo a paliva</span> přímo z pily
            </h1>
            <p className="mx-auto mt-3 line-clamp-2 max-w-sm text-xs text-[#1E293B]/70 sm:mt-5 sm:line-clamp-none sm:max-w-2xl sm:text-lg">
              Standardní profily skladem. Atypická výroba na míru do délky 8 metrů a vlastní doprava
              s hydraulickou rukou.
            </p>

            <div className="mx-auto mt-5 grid w-full max-w-xs grid-cols-2 gap-2 sm:mt-8 sm:flex sm:max-w-none sm:flex-row sm:items-center sm:justify-center sm:gap-3">
              <a
                href="/#produkty"
                className="inline-flex items-center justify-center rounded-lg bg-[#A86D38] px-3 py-2.5 text-xs font-bold text-white shadow-md transition hover:bg-[#8F5927] sm:px-7 sm:py-3.5 sm:text-sm"
              >
                Prohlédnout obchod
              </a>
              <a
                href="/#konfigurator"
                className="inline-flex items-center justify-center rounded-lg bg-[#234A33] px-3 py-2.5 text-xs font-bold text-white shadow-md transition hover:bg-[#1a3826] sm:px-7 sm:py-3.5 sm:text-sm"
              >
                Konfigurátor na míru
              </a>
            </div>

            <div className="no-scrollbar mt-5 flex snap-x gap-2 overflow-x-auto px-4 py-1 sm:mt-8 sm:flex-wrap sm:justify-center sm:overflow-visible sm:px-0">
              {["Délky až do 8 m", "Platba kartou i dobírka", "Vlastní doprava"].map((item) => (
                <span
                  key={item}
                  className="inline-flex shrink-0 snap-center items-center gap-1.5 whitespace-nowrap rounded-full border border-[#A86D38]/30 bg-white/85 px-3 py-1 text-[11px] font-semibold text-[#1E293B] shadow-sm sm:px-3.5 sm:py-1.5 sm:text-xs"
                >
                  <span className="text-[#234A33]">
                    <IconCheck />
                  </span>
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>

      </section>

      <section className="relative mx-auto max-w-7xl px-4 pb-4">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-4 -top-14 h-20 rounded-full bg-[#F5F2E9] blur-2xl"
        />
        <div className="mb-5 flex items-end justify-between">
          <h2 className="text-2xl font-black tracking-tight sm:text-3xl">Kategorie</h2>
          <a
            href="/#produkty"
            className="text-sm font-semibold text-[color:var(--forest)] hover:underline"
          >
            Sortiment →
          </a>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <CategoryCard variant="tram" title="TRÁMY" subtitle="Stavební trámy" />
          <CategoryCard variant="fosna" title="FOŠNY" subtitle="Stavební fošny" />
          <CategoryCard variant="prkno" title="PRKNA" subtitle="Stavební prkna" />
          <CategoryCard variant="lat" title="LATĚ & PRISMY" subtitle="Střešní latě a hranoly" />
        </div>
      </section>

      <section id="produkty" className="mx-auto max-w-7xl px-4 py-12 sm:py-16">
        <div className="mb-6">
          <h2 className="text-2xl font-black tracking-tight sm:text-3xl">
            Stavební řezivo – standardní profily
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Vyberte profil a délku. Cena se přepočítá okamžitě a položku můžete hned přidat do
            košíku.
          </p>
        </div>

        <div className="grid gap-4 sm:gap-5 md:grid-cols-2 xl:grid-cols-4">
          <TramyCard onAdd={addStandardItem} />
          <FosnyCard onAdd={addStandardItem} />
          <PrknaCard onAdd={addStandardItem} />
          <LateCard onAdd={addStandardItem} />
        </div>
      </section>

      <section id="konfigurator" className="mx-auto max-w-7xl px-4 pb-12 sm:pb-16">
        <Configurator onAdd={addCustomItem} />
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:py-16">
          <div className="mb-8 max-w-2xl">
            <h2 className="text-2xl font-black tracking-tight sm:text-3xl">
              Proč zvolit KVH hranoly?
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              {
                title: "Vysušeno na 15 %",
                description: "Tvarová stálost a minimální kroucení – ideální pro nosné konstrukce.",
              },
              {
                title: "Hoblovaný povrch",
                description: "Hladké hrany a stěny bez nutnosti dalšího opracování.",
              },
              {
                title: "Certifikované dřevo",
                description: "Vhodné pro pergoly, garážová stání i moderní dřevostavby.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-border bg-[color:var(--sand)] p-6"
              >
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[color:var(--timber)] text-white">
                  <IconCheck />
                </div>
                <h3 className="mt-4 text-lg font-black tracking-tight text-foreground">
                  {item.title}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="doprava" className="mx-auto max-w-7xl px-4 py-12 sm:py-16">
        <div className="grid gap-6 rounded-[2rem] border border-[#A86D38]/15 bg-white p-6 shadow-sm sm:p-10 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-5">
            <div>
              <div className="inline-flex rounded-full bg-[#F5F2E9] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#A86D38]">
                Doprava a vykládka
              </div>
              <h2 className="mt-3 text-2xl font-black tracking-tight text-[#1E293B] sm:text-3xl">
                Doručíme řezivo až na stavbu
              </h2>
              <p className="mt-2 text-sm text-[#1E293B]/70 sm:text-base">
                Vlastní autojeřáb DIPISTAV zvládne pohodlnou vykládku i tam, kde je potřeba
                přesnost, rychlost a jistota.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {[
                "Složení hydraulickou rukou přímo na místě",
                "Objednávky skladového i atypického řeziva",
                "Osobní odběr zdarma přímo na pile",
                "Rychlá domluva termínu po telefonu",
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-3 rounded-2xl border border-[#A86D38]/10 bg-[#F5F2E9]/70 px-4 py-3 text-sm font-semibold text-[#1E293B]"
                >
                  <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-[#A86D38]">
                    <IconCheck />
                  </span>
                  {item}
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <a
                href="/doprava"
                className="inline-flex items-center justify-center rounded-2xl bg-[#234A33] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#1A3826]"
              >
                Zobrazit možnosti dopravy
              </a>
              <a
                href={COMPANY_PHONE_HREF}
                className="inline-flex items-center justify-center rounded-2xl border border-[#234A33]/15 px-6 py-3 text-sm font-bold text-[#234A33] transition hover:bg-[#F1F5EE]"
              >
                Zavolat pro termín
              </a>
            </div>
          </div>

          <ShippingCalculator />
        </div>
      </section>

      <section id="kontakt" className="bg-[color:var(--forest)] text-white">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-10 sm:py-14 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <h2 className="text-2xl font-black tracking-tight sm:text-3xl">
              Potřebujete poradit s výpočtem nebo dopravou?
            </h2>
            <p className="mt-2 text-white/80">
              Ozvěte se – pomůžeme s výběrem řeziva, spočítáme orientační objem i naceníme rozvoz.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row md:flex-col lg:flex-row">
            <a
              href={COMPANY_PHONE_HREF}
              className="inline-flex items-center justify-center rounded-lg bg-[color:var(--timber)] px-6 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#8a5528]"
            >
              Volejte {COMPANY_PHONE}
            </a>
            <a
              href={COMPANY_EMAIL_HREF}
              className="inline-flex items-center justify-center rounded-lg border-2 border-white/40 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Napsat e-mail
            </a>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
