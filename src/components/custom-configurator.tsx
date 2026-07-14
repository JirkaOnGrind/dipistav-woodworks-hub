import { useId, useMemo, useState, type CSSProperties } from "react";
import { ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCart } from "@/lib/cart";
import { formatCurrency, formatDecimal } from "@/lib/site";

type Species = {
  id: string;
  label: string;
  pricePerM3: number;
};

const SPECIES: Species[] = [
  { id: "smrk", label: "Smrk", pricePerM3: 8500 },
  { id: "borovice", label: "Borovice", pricePerM3: 9200 },
  { id: "modrin", label: "Modřín", pricePerM3: 12500 },
];

const WIDTH_MIN = 40;
const WIDTH_MAX = 300;
const HEIGHT_MIN = 40;
const HEIGHT_MAX = 300;
const LENGTH_MIN = 1;
const LENGTH_MAX = 8;
const QTY_MIN = 1;
const QTY_MAX = 100;

function clamp(value: number, min: number, max: number) {
  if (Number.isNaN(value)) return min;
  return Math.min(Math.max(value, min), max);
}

type SliderRowProps = {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  unit: string;
  inputWidth?: string;
};

function SliderRow({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  unit,
  inputWidth = "w-20",
}: SliderRowProps) {
  const id = useId();
  const progress = ((value - min) / Math.max(max - min, 1)) * 100;
  const style = { "--beam-range-progress": `${progress}%` } as CSSProperties;

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <label
          htmlFor={id}
          className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground"
        >
          {label}
        </label>
        <span className="text-sm font-black tabular-nums text-[#1E293B]">
          {value} {unit}
        </span>
      </div>
      <div className="mt-2 grid items-center gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
        <input
          id={id}
          data-beam-range
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onInput={(event) => onChange(clamp(Number(event.currentTarget.value), min, max))}
          style={style}
          className="block w-full cursor-grab touch-none bg-transparent active:cursor-grabbing"
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={value}
        />
        <Input
          aria-label={label}
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          step={step}
          value={value}
          onInput={(event) => onChange(clamp(Number(event.currentTarget.value), min, max))}
          className={`h-10 rounded-xl border-[#234A33]/15 bg-white text-center text-sm font-black text-[#1E293B] shadow-sm tabular-nums ${inputWidth}`}
        />
      </div>
    </div>
  );
}

export function CustomConfigurator() {
  const { addCustomItem } = useCart();
  const [width, setWidth] = useState(100);
  const [height, setHeight] = useState(100);
  const [length, setLength] = useState(4);
  const [quantity, setQuantity] = useState(10);
  const [speciesId, setSpeciesId] = useState<string>(SPECIES[0].id);

  const species = useMemo(
    () => SPECIES.find((item) => item.id === speciesId) ?? SPECIES[0],
    [speciesId],
  );

  const volumeM3 = useMemo(
    () => (width / 1000) * (height / 1000) * length * quantity,
    [width, height, length, quantity],
  );
  const totalPrice = useMemo(
    () => Math.round(volumeM3 * species.pricePerM3),
    [volumeM3, species],
  );

  const handleAdd = () => {
    addCustomItem({
      widthMm: width,
      heightMm: height,
      lengthM: length,
      quantity,
      species: species.label,
      volumeM3,
      totalPrice,
    });
  };

  return (
    <section id="konfigurator" className="bg-[#F5F2E9]">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:py-16">
        <div className="mb-6 max-w-2xl">
          <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#A86D38]">
            Řezivo na míru
          </div>
          <h2 className="mt-2 text-2xl font-black tracking-tight text-[#1E293B] sm:text-3xl">
            Navrhněte si vlastní řezivo do 8 m
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Nastavte rozměr, délku, počet kusů a dřevinu. Objem i orientační cenu spočítáme
            okamžitě.
          </p>
        </div>

        <div
          data-beam-configurator
          className="grid gap-5 rounded-[2rem] border border-[#234A33]/12 bg-white p-5 shadow-sm sm:p-8 lg:grid-cols-[1.15fr_0.85fr]"
        >
          <div className="rounded-[1.75rem] border border-[#234A33]/10 bg-[#FCFAF5] p-5 sm:p-6">
            <h3 className="text-lg font-black tracking-tight text-[#1E293B]">
              Řezivo na míru do 8 m
            </h3>

            <div className="mt-5 space-y-5">
              <SliderRow
                label="Šířka"
                value={width}
                onChange={setWidth}
                min={WIDTH_MIN}
                max={WIDTH_MAX}
                unit="mm"
              />
              <SliderRow
                label="Výška"
                value={height}
                onChange={setHeight}
                min={HEIGHT_MIN}
                max={HEIGHT_MAX}
                unit="mm"
              />
              <SliderRow
                label="Délka"
                value={length}
                onChange={setLength}
                min={LENGTH_MIN}
                max={LENGTH_MAX}
                unit="m"
              />
              <SliderRow
                label="Počet kusů"
                value={quantity}
                onChange={setQuantity}
                min={QTY_MIN}
                max={QTY_MAX}
                unit="ks"
              />

              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Dřevina
                </div>
                <div className="mt-2 grid grid-cols-3 gap-1 rounded-2xl border border-[#234A33]/10 bg-white p-1">
                  {SPECIES.map((item) => {
                    const isActive = item.id === speciesId;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setSpeciesId(item.id)}
                        className={`rounded-xl px-3 py-2.5 text-sm font-bold transition ${
                          isActive
                            ? "bg-[#234A33] text-white shadow-sm"
                            : "text-[#1E293B]/75 hover:bg-[#F1F5EE]"
                        }`}
                        aria-pressed={isActive}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col justify-between rounded-[1.75rem] border border-[#234A33]/10 bg-[#F1F5EE] p-5 sm:p-6">
            <div className="space-y-5">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Objem
                </div>
                <div className="mt-1 text-2xl font-black tracking-tight text-[#1E293B] tabular-nums sm:text-3xl">
                  {formatDecimal(volumeM3)} m³
                </div>
              </div>

              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Sazba
                </div>
                <div className="mt-1 text-sm font-semibold text-[#1E293B]/80">
                  {formatCurrency(species.pricePerM3)} / m³ · {species.label}
                </div>
              </div>

              <div className="rounded-2xl border border-[#234A33]/15 bg-white/70 p-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#234A33]">
                  Celková cena
                </div>
                <div
                  aria-live="polite"
                  className="mt-1 text-3xl font-black tracking-tight text-[#1E3A2B] tabular-nums sm:text-4xl"
                >
                  {formatCurrency(totalPrice)}
                </div>
                <div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  s DPH
                </div>
              </div>

              <div className="rounded-2xl border border-dashed border-[#234A33]/20 bg-white/50 px-4 py-3 text-xs leading-5 text-[#1E293B]/70">
                Orientační cena. Přesné potvrzení dostupnosti a termínu vám pošleme po odeslání
                poptávky.
              </div>
            </div>

            <Button
              type="button"
              onClick={handleAdd}
              className="mt-6 h-12 w-full rounded-2xl bg-[#234A33] text-sm font-bold text-white shadow-sm transition hover:bg-[#1a3826] hover:shadow-[0_14px_30px_rgba(35,74,51,0.2)]"
            >
              <ShoppingCart className="mr-2 h-4 w-4" />
              Přidat do poptávky
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
