import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import logoAsset from "@/assets/dipistav-logo.asset.json";

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

/* ---------- helpers ---------- */

const fmtCZK = (n: number) =>
  new Intl.NumberFormat("cs-CZ", { maximumFractionDigits: 2 }).format(n) + " Kč";

type PriceMap = Record<string, Record<string, number>>;

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

/* ---------- UI primitives ---------- */

function Select({
  value,
  onChange,
  options,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
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
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm font-medium text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
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
      className="mt-4 w-full rounded-lg bg-[color:var(--forest)] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[color:var(--forest-dark)] active:scale-[0.99]"
    >
      Vložit do košíku
    </button>
  );
}

function PriceOut({ label, value }: { label: string; value: string }) {
  return (
    <div className="mt-4 flex items-end justify-between rounded-lg bg-[color:var(--sand)] px-4 py-3">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className="text-2xl font-black tracking-tight text-[color:var(--timber)]">
        {value}
      </span>
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
        <h3 className="text-lg font-black tracking-tight text-foreground">
          {title}
        </h3>
        <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>
      </div>
      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  );
}

/* ---------- Product cards ---------- */

function TramyCard({ onAdd }: { onAdd: (n: string) => void }) {
  const profiles = Object.keys(TRAMY);
  const [profile, setProfile] = useState(profiles[0]);
  const lengths = Object.keys(TRAMY[profile]);
  const [length, setLength] = useState(lengths[0]);
  const activeLen = TRAMY[profile][length] ? length : Object.keys(TRAMY[profile])[0];
  const price = TRAMY[profile][activeLen];

  return (
    <CardShell title="Stavební trámy" subtitle="Profil × délka – přesná cena">
      <div className="grid grid-cols-2 gap-3">
        <Select
          label="Profil (cm)"
          value={profile}
          onChange={(v) => setProfile(v)}
          options={profiles.map((p) => ({ value: p, label: p.replace("x", " × ") }))}
        />
        <Select
          label="Délka (cm)"
          value={activeLen}
          onChange={setLength}
          options={Object.keys(TRAMY[profile]).map((l) => ({ value: l, label: l }))}
        />
      </div>
      <PriceOut label="Cena za kus" value={fmtCZK(price)} />
      <AddToCartButton
        onClick={() => onAdd(`Trám ${profile.replace("x", "×")}×${activeLen} cm`)}
      />
    </CardShell>
  );
}

function FosnyCard({ onAdd }: { onAdd: (n: string) => void }) {
  const profiles = Object.keys(FOSNY);
  const [profile, setProfile] = useState(profiles[0]);
  const [length, setLength] = useState(Object.keys(FOSNY[profile])[0]);
  const activeLen = FOSNY[profile][length] ? length : Object.keys(FOSNY[profile])[0];
  const price = FOSNY[profile][activeLen];

  return (
    <CardShell title="Stavební fošny" subtitle="Profil × délka – přesná cena">
      <div className="grid grid-cols-2 gap-3">
        <Select
          label="Profil (cm)"
          value={profile}
          onChange={(v) => setProfile(v)}
          options={profiles.map((p) => ({ value: p, label: p.replace("x", " × ") }))}
        />
        <Select
          label="Délka (cm)"
          value={activeLen}
          onChange={setLength}
          options={Object.keys(FOSNY[profile]).map((l) => ({ value: l, label: l }))}
        />
      </div>
      <PriceOut label="Cena za kus" value={fmtCZK(price)} />
      <AddToCartButton
        onClick={() => onAdd(`Fošna ${profile.replace("x", "×")}×${activeLen} cm`)}
      />
    </CardShell>
  );
}

function PrknaCard({ onAdd }: { onAdd: (n: string) => void }) {
  const widths = Object.keys(PRKNA);
  const [width, setWidth] = useState(widths[0]);
  const [length, setLength] = useState(Object.keys(PRKNA[width])[0]);
  const activeLen = PRKNA[width][length] ? length : Object.keys(PRKNA[width])[0];
  const price = PRKNA[width][activeLen];

  return (
    <CardShell title="Stavební prkna" subtitle="Tříděná coulová – cena za kus">
      <div className="grid grid-cols-2 gap-3">
        <Select
          label="Šířka (cm)"
          value={width}
          onChange={setWidth}
          options={widths.map((w) => ({ value: w, label: w + " cm" }))}
        />
        <Select
          label="Délka (cm)"
          value={activeLen}
          onChange={setLength}
          options={Object.keys(PRKNA[width]).map((l) => ({ value: l, label: l }))}
        />
      </div>
      <PriceOut label="Cena za kus" value={fmtCZK(price)} />
      <AddToCartButton onClick={() => onAdd(`Prkno ${width}×${activeLen} cm`)} />
    </CardShell>
  );
}

function LateCard({ onAdd }: { onAdd: (n: string) => void }) {
  const [length, setLength] = useState("3000");
  const price = LATE[length];

  return (
    <CardShell title="Střešní latě 60×40 mm" subtitle="Cena 19 Kč / bm">
      <Select
        label="Délka"
        value={length}
        onChange={setLength}
        options={[
          { value: "3000", label: "3 m (3000 mm)" },
          { value: "4000", label: "4 m (4000 mm)" },
          { value: "5000", label: "5 m (5000 mm)" },
        ]}
      />
      <PriceOut label="Cena za kus" value={fmtCZK(price)} />
      <AddToCartButton onClick={() => onAdd(`Lať 60×40 mm / ${Number(length) / 1000} m`)} />
    </CardShell>
  );
}

/* ---------- Category illustration ---------- */

function WoodIcon({ variant }: { variant: "tram" | "fosna" | "prkno" | "lat" }) {
  const stroke = "var(--forest)";
  const wood = "var(--timber)";
  return (
    <svg viewBox="0 0 96 64" className="h-16 w-24" fill="none" strokeWidth="2">
      {variant === "tram" && (
        <>
          <rect x="14" y="14" width="68" height="36" rx="3" stroke={stroke} fill={wood} fillOpacity="0.18" />
          <path d="M20 22 h56 M20 32 h56 M20 42 h56" stroke={stroke} strokeOpacity="0.5" />
        </>
      )}
      {variant === "fosna" && (
        <>
          <rect x="8" y="20" width="80" height="24" rx="2" stroke={stroke} fill={wood} fillOpacity="0.18" />
          <path d="M14 26 h68 M14 32 h68 M14 38 h68" stroke={stroke} strokeOpacity="0.5" />
        </>
      )}
      {variant === "prkno" && (
        <>
          <rect x="6" y="26" width="84" height="12" rx="2" stroke={stroke} fill={wood} fillOpacity="0.18" />
          <path d="M12 30 h72 M12 34 h72" stroke={stroke} strokeOpacity="0.5" />
        </>
      )}
      {variant === "lat" && (
        <>
          <rect x="10" y="22" width="76" height="6" rx="1" stroke={stroke} fill={wood} fillOpacity="0.18" />
          <rect x="10" y="36" width="76" height="6" rx="1" stroke={stroke} fill={wood} fillOpacity="0.18" />
        </>
      )}
    </svg>
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
      href="#produkty"
      className="group flex flex-col items-start gap-3 rounded-2xl border border-border bg-[color:var(--sand)] p-5 transition hover:-translate-y-0.5 hover:border-[color:var(--timber)] hover:shadow-md"
    >
      <div className="flex h-20 w-full items-center justify-center rounded-xl bg-white">
        <WoodIcon variant={variant} />
      </div>
      <div>
        <div className="text-base font-black tracking-tight text-[color:var(--forest)]">
          {title}
        </div>
        <div className="text-sm text-muted-foreground">{subtitle}</div>
      </div>
    </a>
  );
}

/* ---------- Configurator ---------- */

function Configurator({ onAdd }: { onAdd: (n: string) => void }) {
  const [width, setWidth] = useState(100);
  const [height, setHeight] = useState(100);
  const [length, setLength] = useState(4);
  const [qty, setQty] = useState(10);
  const [species, setSpecies] = useState("Smrk");

  const { volume, total } = useMemo(() => {
    const v = (width / 1000) * (height / 1000) * length * qty;
    return { volume: v, total: Math.round(v * 8500) };
  }, [width, height, length, qty]);

  const Row = ({
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
    onChange: (v: number) => void;
    suffix: string;
  }) => (
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
          onChange={(e) => onChange(Number(e.target.value))}
          className="flex-1 accent-[color:var(--forest)]"
        />
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-20 rounded-md border border-border bg-white px-2 py-1.5 text-sm font-semibold text-foreground focus:border-primary focus:outline-none"
        />
      </div>
    </div>
  );

  return (
    <div className="rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-8">
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="inline-flex rounded-full bg-[color:var(--forest)]/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[color:var(--forest)]">
            Konfigurátor
          </div>
          <h2 className="mt-2 text-2xl font-black tracking-tight text-foreground sm:text-3xl">
            Řezivo na míru do 8 m
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Zadejte rozměry a spočítáme atypické řezivo přímo z pily.
          </p>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-4">
          <Row label="Šířka" value={width} min={20} max={300} step={5} onChange={setWidth} suffix="mm" />
          <Row label="Výška" value={height} min={20} max={300} step={5} onChange={setHeight} suffix="mm" />
          <Row label="Délka" value={length} min={1} max={8} step={0.1} onChange={setLength} suffix="m" />
          <Row label="Počet kusů" value={qty} min={1} max={500} step={1} onChange={setQty} suffix="ks" />
          <div>
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Dřevina
            </span>
            <div className="grid grid-cols-3 gap-2">
              {["Smrk", "Borovice", "Modřín"].map((s) => (
                <button
                  key={s}
                  onClick={() => setSpecies(s)}
                  className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                    species === s
                      ? "border-[color:var(--forest)] bg-[color:var(--forest)] text-white"
                      : "border-border bg-white text-foreground hover:border-[color:var(--forest)]"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-between rounded-2xl bg-[color:var(--sand)] p-6">
          <div className="space-y-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Objem
              </div>
              <div className="text-2xl font-black tracking-tight text-foreground">
                {volume.toFixed(3)} m³
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Základní sazba
              </div>
              <div className="text-sm font-semibold text-foreground">
                8 500 Kč / m³ · {species}
              </div>
            </div>
            <div className="rounded-xl bg-white p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Celková cena
              </div>
              <div className="mt-1 text-4xl font-black tracking-tight text-[color:var(--timber)]">
                {new Intl.NumberFormat("cs-CZ").format(total)} Kč
              </div>
              <div className="text-xs text-muted-foreground">s DPH</div>
            </div>
          </div>
          <button
            onClick={() =>
              onAdd(
                `Atypické řezivo ${width}×${height}×${length} m · ${qty} ks · ${species}`
              )
            }
            className="mt-6 w-full rounded-lg bg-[color:var(--forest)] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[color:var(--forest-dark)]"
          >
            Přidat atypické řezivo do poptávky / košíku
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Page ---------- */

function Index() {
  const [cart, setCart] = useState<string[]>([]);
  const add = (name: string) => setCart((c) => [...c, name]);

  const nav = [
    "Obchod",
    "KVH Hranoly",
    "Paliva",
    "Řezivo na míru",
    "Doprava",
    "O nás",
    "Kontakt",
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Topbar */}
      <div className="bg-[color:var(--slate-ink)] text-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-2 text-xs sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <a href="tel:+420736697480" className="hover:text-[color:var(--timber)]">
              Tel: +420 736 697 480
            </a>
            <span className="hidden text-white/30 sm:inline">|</span>
            <a href="mailto:info@dipistav.cz" className="hover:text-[color:var(--timber)]">
              info@dipistav.cz
            </a>
          </div>
          <div className="text-white/80">Rychlá doprava &amp; Osobní odběr</div>
        </div>
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-white/95 backdrop-blur">
        <div className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-4 py-3 sm:py-4">
          <a href="/" className="flex min-w-0 items-center gap-3">
            <img
              src={logoAsset.url}
              alt="DIPISTAV"
              className="h-11 w-auto shrink-0 rounded-md object-contain sm:h-12"
            />
            <span className="truncate text-lg font-black tracking-tight text-[color:var(--forest)] sm:text-xl">
              DIPISTAV
            </span>
          </a>

          <div className="flex items-center gap-2">
            <nav className="hidden xl:flex items-center gap-6 pr-2">
              {nav.map((n) => (
                <a
                  key={n}
                  href="#"
                  className="text-sm font-semibold text-foreground/80 transition hover:text-[color:var(--forest)]"
                >
                  {n}
                </a>
              ))}
            </nav>
            <button
              aria-label="Košík"
              className="relative inline-flex h-11 w-11 items-center justify-center rounded-full bg-[color:var(--forest)] text-white shadow-sm transition hover:bg-[color:var(--forest-dark)]"
            >
              <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="2">
                <path d="M3 4h2l2.4 12.5a2 2 0 0 0 2 1.5h8.2a2 2 0 0 0 2-1.6L21 8H6" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="10" cy="21" r="1.4" fill="currentColor" />
                <circle cx="18" cy="21" r="1.4" fill="currentColor" />
              </svg>
              {cart.length > 0 && (
                <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-[color:var(--timber)] px-1 text-[10px] font-black text-white">
                  {cart.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Mobile nav */}
        <nav className="xl:hidden border-t border-border bg-[color:var(--sand)]">
          <div className="mx-auto flex max-w-7xl gap-4 overflow-x-auto px-4 py-2 text-sm font-semibold">
            {nav.map((n) => (
              <a key={n} href="#" className="shrink-0 text-foreground/80 hover:text-[color:var(--forest)]">
                {n}
              </a>
            ))}
          </div>
        </nav>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:py-16 lg:grid-cols-2 lg:items-center lg:py-20">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--forest)]/20 bg-white px-3 py-1 text-xs font-semibold text-[color:var(--forest)]">
              <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--forest)]" />
              Pila &amp; prodej dřeva
            </div>
            <h1 className="mt-4 text-4xl font-black leading-[1.05] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Kvalitní stavební řezivo a paliva{" "}
              <span className="text-[color:var(--forest)]">přímo z pily</span>
            </h1>
            <p className="mt-5 max-w-xl text-base text-muted-foreground sm:text-lg">
              Nakupujte standardní rozměry nebo si spočítejte atypické řezivo na
              míru do 8 metrů.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <a
                href="#produkty"
                className="inline-flex items-center justify-center rounded-lg bg-[color:var(--forest)] px-6 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[color:var(--forest-dark)]"
              >
                Prohlédnout obchod
              </a>
              <a
                href="#konfigurator"
                className="inline-flex items-center justify-center rounded-lg border-2 border-[color:var(--forest)] bg-white px-6 py-3 text-sm font-semibold text-[color:var(--forest)] transition hover:bg-[color:var(--sand)]"
              >
                Konfigurátor na míru
              </a>
            </div>

            <dl className="mt-10 grid grid-cols-3 gap-4 border-t border-border pt-6">
              {[
                ["8 m", "Max. délka"],
                ["8 500 Kč/m³", "Základní sazba"],
                ["24 h", "Odezva poptávky"],
              ].map(([v, l]) => (
                <div key={l}>
                  <dt className="text-lg font-black text-[color:var(--forest)] sm:text-xl">{v}</dt>
                  <dd className="text-xs text-muted-foreground">{l}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="relative">
            <div className="absolute -inset-4 rounded-3xl bg-[color:var(--forest)]/5 blur-2xl" />
            <div className="relative rounded-3xl border border-border bg-white p-6 shadow-lg">
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Nejprodávanější
                </div>
                <div className="text-xs font-semibold text-[color:var(--timber)]">Skladem</div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                {[
                  { t: "Trám 10×10×400", p: "450 Kč" },
                  { t: "Fošna 5×12×400", p: "247 Kč" },
                  { t: "Prkno 12×400", p: "102,60 Kč" },
                  { t: "Lať 60×40 / 4 m", p: "76 Kč" },
                ].map((x) => (
                  <div
                    key={x.t}
                    className="rounded-xl border border-border bg-[color:var(--sand)] p-3"
                  >
                    <WoodIcon variant="fosna" />
                    <div className="mt-2 text-sm font-bold text-foreground">{x.t}</div>
                    <div className="text-sm font-black text-[color:var(--timber)]">{x.p}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="mx-auto max-w-7xl px-4 pb-4">
        <div className="mb-5 flex items-end justify-between">
          <h2 className="text-2xl font-black tracking-tight sm:text-3xl">Kategorie</h2>
          <a href="#produkty" className="text-sm font-semibold text-[color:var(--forest)] hover:underline">
            Celý sortiment →
          </a>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <CategoryCard variant="tram" title="TRÁMY" subtitle="Stavební trámy" />
          <CategoryCard variant="fosna" title="FOŠNY" subtitle="Stavební fošny" />
          <CategoryCard variant="prkno" title="PRKNA" subtitle="Stavební prkna" />
          <CategoryCard variant="lat" title="LATĚ & PRISMY" subtitle="Střešní latě a hranoly" />
        </div>
      </section>

      {/* Products */}
      <section id="produkty" className="mx-auto max-w-7xl px-4 py-12 sm:py-16">
        <div className="mb-6">
          <div className="inline-flex rounded-full bg-[color:var(--timber)]/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[color:var(--timber-dark)]">
            Standardní rozměry
          </div>
          <h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
            Vyberte profil a délku
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Ceny se aktualizují okamžitě podle vybraných rozměrů.
          </p>
        </div>
        <div className="grid gap-4 sm:gap-5 md:grid-cols-2 xl:grid-cols-4">
          <TramyCard onAdd={add} />
          <FosnyCard onAdd={add} />
          <PrknaCard onAdd={add} />
          <LateCard onAdd={add} />
        </div>
      </section>

      {/* Configurator */}
      <section id="konfigurator" className="mx-auto max-w-7xl px-4 pb-12 sm:pb-16">
        <Configurator onAdd={add} />
      </section>

      {/* Contact banner */}
      <section className="bg-[color:var(--forest)] text-white">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-10 sm:py-14 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <h2 className="text-2xl font-black tracking-tight sm:text-3xl">
              Potřebujete poradit nebo specifikovat rozměry?
            </h2>
            <p className="mt-2 text-white/80">
              Ozvěte se – rádi vám pomůžeme s výběrem řeziva a dopravou.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row md:flex-col lg:flex-row">
            <a
              href="tel:+420736697480"
              className="inline-flex items-center justify-center rounded-lg bg-[color:var(--timber)] px-6 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-[color:var(--timber-dark)]"
            >
              Volejte +420 736 697 480
            </a>
            <a
              href="mailto:info@dipistav.cz"
              className="inline-flex items-center justify-center rounded-lg border-2 border-white/40 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              info@dipistav.cz
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[color:var(--slate-ink)] text-white/80">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="flex items-center gap-3">
              <img src={logoAsset.url} alt="DIPISTAV" className="h-10 w-auto rounded" />
              <span className="text-lg font-black text-white">DIPISTAV</span>
            </div>
            <p className="mt-3 text-sm text-white/70">
              Pila a prodej dřeva. Stavební řezivo, KVH hranoly, paliva a řezivo
              na míru přímo z pily.
            </p>
          </div>
          <div>
            <div className="mb-3 text-sm font-black uppercase tracking-wide text-white">
              Kontakt
            </div>
            <ul className="space-y-1.5 text-sm">
              <li>Tel: +420 736 697 480</li>
              <li>info@dipistav.cz</li>
              <li>IČO: 00000000</li>
              <li>DIČ: CZ00000000</li>
            </ul>
          </div>
          <div>
            <div className="mb-3 text-sm font-black uppercase tracking-wide text-white">
              Otevírací doba
            </div>
            <ul className="space-y-1.5 text-sm">
              <li>Po–Pá: 7:00 – 16:00</li>
              <li>So: 8:00 – 12:00</li>
              <li>Ne: zavřeno</li>
            </ul>
          </div>
          <div>
            <div className="mb-3 text-sm font-black uppercase tracking-wide text-white">
              Navigace
            </div>
            <ul className="space-y-1.5 text-sm">
              {nav.map((n) => (
                <li key={n}>
                  <a href="#" className="hover:text-[color:var(--timber)]">
                    {n}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="border-t border-white/10">
          <div className="mx-auto max-w-7xl px-4 py-4 text-xs text-white/50">
            © {new Date().getFullYear()} DIPISTAV – Pila a prodej dřeva. Všechna práva vyhrazena.
          </div>
        </div>
      </footer>
    </div>
  );
}
