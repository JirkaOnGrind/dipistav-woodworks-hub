import { useId, type CSSProperties } from "react";
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
  const sliderValue = Math.min(quantity, sliderMax);
  const sliderProgress = ((sliderValue - min) / Math.max(sliderMax - min, 1)) * 100;
  const sliderStyle = {
    "--beam-range-progress": `${sliderProgress}%`,
  } as CSSProperties;

  const updateQuantity = (value: number) => onChange(clampQuantity(value, min, max));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <label
          htmlFor={inputId}
          className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground"
        >
          Počet kusů
        </label>
        <span className="rounded-full bg-[#F6F4EE] px-3 py-1 text-sm font-bold text-[#1E293B] tabular-nums">
          {quantity} ks
        </span>
      </div>

      <div className="rounded-[1.75rem] border border-[#234A33]/10 bg-[#FCFAF5] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]">
        <div className="grid items-center gap-4 sm:grid-cols-[minmax(0,1fr)_120px]">
          <div>
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

            <div className="mt-2 flex items-center justify-between px-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#1E293B]/45">
              <span>{min} ks</span>
              <span>{sliderMax}+ ks</span>
            </div>
          </div>

          <Input
            aria-label="Počet kusů v čísle"
            type="number"
            inputMode="numeric"
            min={min}
            max={max}
            value={quantity}
            onInput={(event) => updateQuantity(Number(event.currentTarget.value))}
            className="h-12 rounded-2xl border-[#234A33]/12 bg-white text-base font-black text-[#1E293B] shadow-sm tabular-nums"
          />
        </div>
      </div>
    </div>
  );
}
