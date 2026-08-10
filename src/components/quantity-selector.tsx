import { useEffect, useId, useRef, useState, type CSSProperties } from "react";
import { Minus, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";

type QuantitySelectorProps = {
  quantity: number;
  onChange: (quantity: number) => void;
  label?: string;
  min?: number;
  max?: number;
  sliderMax?: number;
};

function clampQuantity(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.min(Math.max(Math.round(value), min), max);
}

export function QuantitySelector({
  quantity,
  onChange,
  label = "Počet kusů",
  min = 1,
  max = 500,
  sliderMax = 20,
}: QuantitySelectorProps) {
  const inputId = useId();
  const rangeId = useId();
  const effectiveSliderMax = Math.min(max, Math.max(sliderMax, min));
  const sliderValue = Math.min(Math.max(quantity, min), effectiveSliderMax);
  const quantityRef = useRef(quantity);
  const [draftValue, setDraftValue] = useState(() => String(quantity));
  const sliderProgress = ((sliderValue - min) / Math.max(effectiveSliderMax - min, 1)) * 100;
  const sliderStyle = {
    "--beam-range-progress": `${sliderProgress}%`,
  } as CSSProperties;

  useEffect(() => {
    quantityRef.current = quantity;
    setDraftValue(String(quantity));
  }, [quantity]);

  const updateQuantity = (value: number) => {
    const nextQuantity = clampQuantity(value, min, max);
    quantityRef.current = nextQuantity;
    onChange(nextQuantity);
  };
  const commitDraft = () => {
    const parsed = Number(draftValue.trim());

    if (!Number.isFinite(parsed)) {
      setDraftValue(String(quantity));
      return;
    }

    const nextQuantity = clampQuantity(parsed, min, max);
    quantityRef.current = nextQuantity;
    onChange(nextQuantity);
    setDraftValue(String(nextQuantity));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-end justify-between gap-4">
        <label
          htmlFor={inputId}
          className="block text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground"
        >
          {label}
        </label>
        <div className="flex items-baseline gap-2">
          <Input
            id={inputId}
            aria-label={`${label} přesně`}
            type="text"
            inputMode="numeric"
            value={draftValue}
            onChange={(event) => setDraftValue(event.currentTarget.value)}
            onBlur={commitDraft}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                commitDraft();
                event.currentTarget.select();
              }
              if (event.key === "Escape") {
                setDraftValue(String(quantity));
                event.currentTarget.blur();
              }
            }}
            className="h-11 w-20 rounded-xl border-[#1E3A2B]/12 bg-white px-2 text-center text-base font-black text-[#1E293B] shadow-sm tabular-nums focus-visible:ring-[#1E3A2B]/20"
          />
          <span className="text-sm font-bold text-[#1E293B]/58">ks</span>
        </div>
      </div>

      <div className="grid grid-cols-[48px_minmax(0,1fr)_48px] items-center gap-3 rounded-[1.5rem] border border-[#234A33]/10 bg-[#FCFAF5] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] sm:gap-4 sm:p-4">
        <button
          type="button"
          onClick={() => updateQuantity(quantityRef.current - 1)}
          disabled={quantity <= min}
          className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#1E3A2B]/12 bg-white text-[#1E3A2B] shadow-sm transition hover:border-[#1E3A2B]/24 hover:bg-[#FFFDF8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A2B]/20 disabled:cursor-default disabled:opacity-35"
          aria-label={`Snížit: ${label}`}
        >
          <Minus className="h-4 w-4" />
        </button>

        <input
          id={rangeId}
          aria-label={label}
          aria-valuemin={min}
          aria-valuemax={effectiveSliderMax}
          aria-valuenow={sliderValue}
          aria-valuetext={`${quantity} kusů`}
          data-beam-range
          type="range"
          min={min}
          max={effectiveSliderMax}
          step={1}
          value={sliderValue}
          onChange={(event) => updateQuantity(Number(event.currentTarget.value))}
          style={sliderStyle}
          className="block w-full cursor-grab bg-transparent active:cursor-grabbing"
        />

        <button
          type="button"
          onClick={() => updateQuantity(quantityRef.current + 1)}
          disabled={quantity >= max}
          className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#1E3A2B]/12 bg-white text-[#1E3A2B] shadow-sm transition hover:border-[#1E3A2B]/24 hover:bg-[#FFFDF8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A2B]/20 disabled:cursor-default disabled:opacity-35"
          aria-label={`Zvýšit: ${label}`}
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      <div className="flex h-4 items-center justify-end" aria-live="polite">
        <p
          aria-hidden={quantity <= effectiveSliderMax}
          className={`text-right text-xs font-medium text-muted-foreground transition-opacity duration-200 ${
            quantity > effectiveSliderMax ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
        >
          Posuvník je do {effectiveSliderMax} ks, vyšší počet zadejte přesně.
        </p>
      </div>
    </div>
  );
}
