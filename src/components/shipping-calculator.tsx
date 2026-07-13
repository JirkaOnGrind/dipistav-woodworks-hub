import { useState } from "react";
import { MapPinned, Truck } from "lucide-react";
import { formatCurrency, getShippingQuote } from "@/lib/site";

export function ShippingCalculator() {
  const [postcode, setPostcode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [quote, setQuote] = useState<ReturnType<typeof getShippingQuote>>(null);

  const handleCalculate = () => {
    const nextQuote = getShippingQuote(postcode);

    if (!nextQuote) {
      setQuote(null);
      setError("Zadejte platné PSČ ve formátu 12345.");
      return;
    }

    setError(null);
    setQuote(nextQuote);
  };

  return (
    <div className="rounded-2xl border border-border/40 bg-white p-3.5 shadow-sm sm:rounded-3xl sm:border-[#A86D38]/20 sm:p-6">
      <div className="flex items-start gap-3">
        <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#F5F2E9] text-[#A86D38]">
          <Truck className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-xl font-black tracking-tight text-[#1E293B]">Doprava podle PSČ</h3>
          <p className="mt-1 text-sm text-[#1E293B]/70">
            Zadejte PSČ a zobrazíme vám orientační cenu vlastního rozvozu.
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <input
          inputMode="numeric"
          placeholder="Např. 27034"
          value={postcode}
          onChange={(event) => setPostcode(event.target.value)}
          className="w-full rounded-2xl border border-[#A86D38]/20 bg-[#F5F2E9]/60 px-4 py-3 text-sm font-semibold text-[#1E293B] outline-none transition focus:border-[#A86D38] focus:bg-white focus:ring-2 focus:ring-[#A86D38]/15 sm:flex-1"
        />
        <button
          onClick={handleCalculate}
          className="inline-flex items-center justify-center rounded-2xl bg-[#A86D38] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#8a5528]"
        >
          Spočítat dopravu
        </button>
      </div>

      {error && (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}

      {quote && (
        <div className="mt-4 rounded-3xl border border-[#234A33]/15 bg-[#234A33] p-5 text-white">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
                Orientační cena
              </div>
              <div className="mt-1 text-3xl font-black tracking-tight">
                {formatCurrency(quote.price)}
              </div>
            </div>
            <div className="rounded-2xl bg-white/10 px-3 py-2 text-right">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-white/60">
                PSČ
              </div>
              <div className="mt-1 text-sm font-bold">{quote.cleanPostcode}</div>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2 rounded-2xl bg-white/8 px-4 py-3 text-sm text-white/90">
            <MapPinned className="h-4 w-4 shrink-0" />
            Předpokládaný termín rozvozu: {quote.leadTime}
          </div>

          <p className="mt-3 text-sm text-white/75">{quote.note}</p>
        </div>
      )}
    </div>
  );
}
