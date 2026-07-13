import { Minus, Plus } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";

type QuantitySelectorProps = {
  quantity: number;
  onChange: (quantity: number) => void;
  min?: number;
  max?: number;
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
}: QuantitySelectorProps) {
  const isMobile = useIsMobile();
  const sliderMax = Math.max(24, Math.min(Math.max(quantity, min), max));

  const updateQuantity = (value: number) => onChange(clampQuantity(value, min, max));

  if (isMobile) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Počet kusů
          </span>
          <span className="text-sm font-bold text-foreground">{quantity} ks</span>
        </div>
        <div className="flex items-center overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
          <Button
            type="button"
            variant="ghost"
            className="h-12 rounded-none px-4 text-foreground hover:bg-[color:var(--sand)]"
            onClick={() => updateQuantity(quantity - 1)}
            disabled={quantity <= min}
          >
            <Minus className="h-4 w-4" />
          </Button>
          <Input
            type="number"
            min={min}
            max={max}
            value={quantity}
            onChange={(event) => updateQuantity(Number(event.target.value))}
            className="h-12 rounded-none border-x border-y-0 border-border text-center text-base font-black shadow-none focus-visible:ring-0"
          />
          <Button
            type="button"
            variant="ghost"
            className="h-12 rounded-none px-4 text-foreground hover:bg-[color:var(--sand)]"
            onClick={() => updateQuantity(quantity + 1)}
            disabled={quantity >= max}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Počet kusů
        </span>
        <span className="text-sm font-bold text-foreground">{quantity} ks</span>
      </div>
      <div className="grid items-center gap-4 md:grid-cols-[minmax(0,1fr)_110px]">
        <Slider
          min={min}
          max={sliderMax}
          step={1}
          value={[quantity]}
          onValueChange={(value) => updateQuantity(value[0] ?? min)}
          className="[&_[data-slot=slider-thumb]]:border-[color:var(--timber)]"
        />
        <Input
          type="number"
          min={min}
          max={max}
          value={quantity}
          onChange={(event) => updateQuantity(Number(event.target.value))}
          className="h-11 border-border bg-white text-base font-black"
        />
      </div>
    </div>
  );
}
