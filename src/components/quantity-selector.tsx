import { useEffect, useId, useRef, useState, type CSSProperties } from "react";
import { Minus, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useRafValueChange } from "@/hooks/use-raf-value-change";

type QuantitySelectorProps = {
  quantity: number;
  onChange: (quantity: number) => void;
  onPreviewChange?: (quantity: number) => void;
  label?: string;
  min?: number;
  max?: number;
  step?: number;
  sliderMax?: number;
  unitLabel?: string;
};

const ignorePreviewChange = () => undefined;

function clampQuantity(value: number, min: number, max: number, step: number) {
  if (!Number.isFinite(value)) return min;
  const steppedValue = min + Math.round((value - min) / step) * step;
  return Math.min(Math.max(steppedValue, min), max);
}

export function QuantitySelector({
  quantity,
  onChange,
  onPreviewChange,
  label = "Počet kusů",
  min = 1,
  max = 500,
  step = 1,
  sliderMax = 20,
  unitLabel = "ks",
}: QuantitySelectorProps) {
  const inputId = useId();
  const rangeId = useId();
  const effectiveSliderMax = Math.min(max, Math.max(sliderMax, min));
  const sliderValue = Math.min(Math.max(quantity, min), effectiveSliderMax);
  const quantityRef = useRef(quantity);
  const [draftValue, setDraftValue] = useState(() => String(quantity));
  const [sliderDraft, setSliderDraft] = useState(sliderValue);
  const sliderProgress = ((sliderDraft - min) / Math.max(effectiveSliderMax - min, 1)) * 100;
  const sliderStyle = {
    "--beam-range-progress": `${sliderProgress}%`,
  } as CSSProperties;

  useEffect(() => {
    quantityRef.current = quantity;
    setDraftValue(String(quantity));
    setSliderDraft(Math.min(Math.max(quantity, min), effectiveSliderMax));
  }, [effectiveSliderMax, min, quantity]);

  const updateQuantity = (value: number) => {
    const nextQuantity = clampQuantity(value, min, max, step);
    quantityRef.current = nextQuantity;
    onChange(nextQuantity);
  };
  const sliderChange = useRafValueChange(updateQuantity);
  const previewChange = useRafValueChange(onPreviewChange ?? ignorePreviewChange, {
    transition: false,
  });
  const commitDraft = () => {
    const parsed = Number(draftValue.trim());

    if (!Number.isFinite(parsed)) {
      setDraftValue(String(quantity));
      return;
    }

    const nextQuantity = clampQuantity(parsed, min, max, step);
    quantityRef.current = nextQuantity;
    onChange(nextQuantity);
    setDraftValue(String(nextQuantity));
  };

  return (
    <div data-quantity-selector className="flex flex-col gap-3">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 sm:flex sm:items-center sm:justify-between sm:gap-4">
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
            inputMode={Number.isInteger(step) ? "numeric" : "decimal"}
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
          <span className="text-sm font-bold text-[#1E293B]/58">{unitLabel}</span>
        </div>
      </div>

      <div className="grid grid-cols-[48px_minmax(0,1fr)_48px] items-center gap-3 rounded-[1.5rem] border border-[#234A33]/10 bg-[#FCFAF5] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] sm:gap-4 sm:p-4">
        <button
          type="button"
          onClick={() => updateQuantity(quantityRef.current - step)}
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
          aria-valuenow={sliderDraft}
          aria-valuetext={`${sliderDraft} ${unitLabel}`}
          data-beam-range
          type="range"
          min={min}
          max={effectiveSliderMax}
          step={step}
          value={sliderDraft}
          onChange={(event) => {
            const nextValue = clampQuantity(
              Number(event.currentTarget.value),
              min,
              effectiveSliderMax,
              step,
            );
            quantityRef.current = nextValue;
            setSliderDraft(nextValue);
            setDraftValue(String(nextValue));
            previewChange.schedule(nextValue);
          }}
          onPointerUp={(event) => {
            previewChange.flush(Number(event.currentTarget.value));
            sliderChange.flush(Number(event.currentTarget.value));
          }}
          onPointerCancel={(event) => {
            previewChange.flush(Number(event.currentTarget.value));
            sliderChange.flush(Number(event.currentTarget.value));
          }}
          onKeyUp={(event) => {
            previewChange.flush(Number(event.currentTarget.value));
            sliderChange.schedule(Number(event.currentTarget.value));
          }}
          style={sliderStyle}
          className="block w-full cursor-grab bg-transparent active:cursor-grabbing"
        />

        <button
          type="button"
          onClick={() => updateQuantity(quantityRef.current + step)}
          disabled={quantity >= max}
          className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#1E3A2B]/12 bg-white text-[#1E3A2B] shadow-sm transition hover:border-[#1E3A2B]/24 hover:bg-[#FFFDF8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A2B]/20 disabled:cursor-default disabled:opacity-35"
          aria-label={`Zvýšit: ${label}`}
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
