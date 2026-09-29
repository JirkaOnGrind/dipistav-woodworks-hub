import { SlidersHorizontal } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  AccessoryControls,
  MaterialSelectors,
  PriceSummary,
  type PergolaUpdate,
} from "@/components/pergola-controls";
import { formatCurrency } from "@/lib/site";
import type { PergolaConfig, PergolaQuote } from "@/lib/pergola";

export function PergolaMobileSheet({
  config,
  quote,
  update,
  onSubmit,
}: {
  config: PergolaConfig;
  quote: PergolaQuote;
  update: PergolaUpdate;
  onSubmit: () => void;
}) {
  return (
    <div className="pergola-mobile-options">
      <Sheet>
        <SheetTrigger asChild>
          <button
            className="pergola-mobile-options-trigger"
            type="button"
            aria-label={`Materiály, doplňky a cena. Celkem ${formatCurrency(quote.total)}`}
          >
            <SlidersHorizontal aria-hidden />
            <span>Materiály a cena</span>
            <strong>{formatCurrency(quote.total)}</strong>
          </button>
        </SheetTrigger>
        <SheetContent side="bottom" className="pergola-mobile-sheet">
          <SheetHeader className="pergola-mobile-sheet-header">
            <SheetTitle>Materiály, doplňky a cena</SheetTitle>
            <SheetDescription className="sr-only">Nastavení pergoly.</SheetDescription>
          </SheetHeader>
          <div className="pergola-mobile-sheet-body">
            <MaterialSelectors config={config} update={update} mobile />
            <AccessoryControls config={config} update={update} />
            <PriceSummary config={config} quote={quote} onSubmit={onSubmit} />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
