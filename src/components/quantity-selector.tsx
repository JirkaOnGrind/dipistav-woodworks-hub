import { useEffect, useId, useState, type CSSProperties } from "react";
import { Minus, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";

type QuantitySelectorProps = {
  quantity: number;
  onChange: (quantity: number) => void;
  min?: number;
  max?: number;
  sliderMax?: number;
};

function clampQuantity(value: number, min: number, max: number) {
  if (Number.isNaN(value)) {
    return min;
  }

  return Math.min(Math.max(value, min), max);
}

export function QuantitySelector({
  quantity,
  onChange,
  min = 1,
  max = 500,
  sliderMax = 20,
}: QuantitySelectorProps) {
  const inputId = useId();
  const [draftValue, setDraftValue] = useState(() => String(quantity));
  const sliderValue = Math.min(quantity, sliderMax);
  const sliderProgress = ((sliderValue - min) / Math.max(sliderMax - min, 1)) * 100;
  const sliderStyle = {
    "--beam-range-progress": `${sliderProgress}%`,
  } as CSSProperties;

  useEffect(() => {
    setDraftValue(String(quantity));
  }, [quantity]);

  const updateQuantity = (value: number) => onChange(clampQuantity(value, min, max));
  const commitDraft = () => {
    const parsed = Number(draftValue.trim());

    if (Number.isNaN(parsed)) {
      setDraftValue(String(quantity));
      return;
    }

    const nextQuantity = clampQuantity(parsed, min, max);
    onChange(nextQuantity);
    setDraftValue(String(nextQuantity));
  };

  return (
    <div className="space-y-4">
      <label
        htmlFor={inputId}
        className="block text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground"
      >
        Počet kusů
      </label>

      <div className="rounded-[1.75rem] border border-[#234A33]/10 bg-[#FCFAF5] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] sm:p-5">
        <div className="flex items-center gap-3 sm:hidden">
          <button
            type="button"
            onClick={() => updateQuantity(quantity - 1)}
            disabled={quantity <= min}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#1E3A2B]/12 bg-[#FBF9F4] text-[#1E3A2B] shadow-sm transition hover:border-[#1E3A2B]/24 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A2B]/20 disabled:cursor-not-allowed disabled:opacity-45"
            aria-label="Snížit počet kusů"
          >
            <Minus className="h-4 w-4" />
          </button>

          <div className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl border border-[#1E3A2B]/10 bg-white px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]">
            <Input
              id={inputId}
              aria-label="Počet kusů v čísle"
              type="text"
              inputMode="numeric"
              value={draftValue}
              onChange={(event) => setDraftValue(event.currentTarget.value)}
              onBlur={commitDraft}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  commitDraft();
                }
              }}
              className="h-auto border-0 bg-transparent px-0 py-0 text-center text-lg font-black text-[#1E293B] shadow-none tabular-nums focus-visible:ring-0"
            />
          </div>

          <button
            type="button"
            onClick={() => updateQuantity(quantity + 1)}
            disabled={quantity >= max}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#1E3A2B]/12 bg-[#FBF9F4] text-[#1E3A2B] shadow-sm transition hover:border-[#1E3A2B]/24 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A2B]/20 disabled:cursor-not-allowed disabled:opacity-45"
            aria-label="Zvýšit počet kusů"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        <div className="hidden items-center gap-4 sm:grid sm:grid-cols-[minmax(0,1fr)_112px] lg:grid-cols-[minmax(0,1fr)_124px]">
          <input
            id={inputId}
            aria-label="Počet kusů"
            aria-valuemin={min}
            aria-valuemax={sliderMax}
            aria-valuenow={sliderValue}
            data-beam-range
            type="range"
            min={min}
            max={sliderMax}
            step={1}
            value={sliderValue}
            onInput={(event) => updateQuantity(Number(event.currentTarget.value))}
            style={sliderStyle}
            className="block w-full cursor-grab touch-none bg-transparent active:cursor-grabbing"
          />

          <div className="flex items-center gap-2 rounded-2xl border border-[#1E3A2B]/10 bg-white px-3 py-2.5 shadow-sm">
            <Input
              aria-label="Počet kusů v čísle"
              type="text"
              inputMode="numeric"
              value={draftValue}
              onChange={(event) => setDraftValue(event.currentTarget.value)}
              onBlur={commitDraft}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  commitDraft();
                }
              }}
              className="h-auto border-0 bg-transparent px-0 py-0 text-center text-base font-black text-[#1E293B] shadow-none tabular-nums focus-visible:ring-0"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
