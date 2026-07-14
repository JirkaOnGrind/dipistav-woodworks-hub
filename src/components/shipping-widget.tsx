import type { ComponentType } from "react";
import { ConstructionIcon, PhoneCall, Ruler, Store } from "lucide-react";
import {
  COMPANY_PHONE,
  COMPANY_PHONE_HREF,
  formatCurrency,
} from "@/lib/site";

const FREE_SHIPPING_THRESHOLD = 15000;

type Method = {
  icon: typeof Truck;
  title: string;
  description: string;
  badge?: string;
  badgeTone: "brown" | "green" | "neutral";
};

const METHODS: Method[] = [
  {
    icon: ConstructionIcon,
    title: "Auto s hydraulickou rukou",
    description:
      "Složení trámů a těžkého řeziva přímo na pozemek nebo stavbu bez potřeby další techniky.",
    badge: "Nejpopulárnější",
    badgeTone: "brown",
  },
  {
    icon: Store,
    title: "Osobní odběr zdarma",
    description: "Vyzvednutí přímo na naší pile ve Všesulově. Pomůžeme vám s naložením.",
    badge: "0 Kč",
    badgeTone: "green",
  },
  {
    icon: Ruler,
    title: "Atypická doprava / Nadrozměr",
    description: "Pro trámy nad 8 metrů nebo kompletní krovy na míru domluvíme individuální dopravu.",
    badgeTone: "neutral",
  },
];

function BadgePill({ tone, children }: { tone: Method["badgeTone"]; children: React.ReactNode }) {
  const styles =
    tone === "brown"
      ? "bg-[#A86D38] text-white"
      : tone === "green"
        ? "bg-[#234A33] text-white"
        : "bg-[#F5F2E9] text-[#1E293B]/70";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${styles}`}
    >
      {children}
    </span>
  );
}

export function ShippingWidget() {
  const [postcode, setPostcode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [quote, setQuote] = useState<ReturnType<typeof getShippingQuote>>(null);

  const handleCalculate = () => {
    const next = getShippingQuote(postcode);
    if (!next) {
      setQuote(null);
      setError("Zadejte platné PSČ ve formátu 12345.");
      return;
    }
    setError(null);
    setQuote(next);
  };

  return (
    <section id="doprava" className="mx-auto max-w-7xl px-3 py-8 sm:px-6 sm:py-16">
      <div className="rounded-[2rem] border border-[#A86D38]/15 bg-white p-4 shadow-sm sm:p-10">
        {/* Calculator */}
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#F5F2E9] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-[#A86D38]">
            <Truck className="h-3.5 w-3.5" />
            Kalkulačka dopravy
          </div>
          <h2 className="mt-3 text-xl font-black tracking-tight text-[#1E293B] sm:text-3xl">
            Spočítejte si cenu dopravy na vaši stavbu
          </h2>
          <p className="mt-2 text-sm text-[#1E293B]/70 sm:text-base">
            Zadejte PSČ místa doručení a zobrazíme orientační cenu vlastního rozvozu.
          </p>

          <div className="mt-5 flex flex-col gap-2 rounded-2xl border border-[#A86D38]/20 bg-[#FBF8F1] p-2 sm:mt-6 sm:flex-row sm:gap-2 sm:p-2">
            <input
              inputMode="numeric"
              placeholder="Zadejte vaše PSČ (např. 270 34)"
              value={postcode}
              onChange={(e) => setPostcode(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCalculate();
              }}
              className="min-w-0 flex-1 rounded-xl bg-white px-4 py-3.5 text-center text-base font-semibold text-[#1E293B] outline-none ring-1 ring-transparent transition placeholder:text-[#1E293B]/40 focus:ring-[#A86D38]/40 sm:text-left sm:text-lg"
            />
            <button
              type="button"
              onClick={handleCalculate}
              className="inline-flex items-center justify-center rounded-xl bg-[#A86D38] px-6 py-3.5 text-sm font-bold text-white transition hover:bg-[#8a5528]"
            >
              Spočítat dopravu
            </button>
          </div>

          {error && (
            <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700">
              {error}
            </div>
          )}

          {quote && (
            <div className="mt-4 grid gap-3 rounded-2xl border border-[#234A33]/15 bg-gradient-to-br from-[#234A33] to-[#1A3826] p-5 text-left text-white sm:grid-cols-[1fr_auto] sm:items-center">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/70">
                  Doprava na vaši adresu
                </div>
                <div className="mt-1 text-3xl font-black tracking-tight tabular-nums">
                  {formatCurrency(quote.price)}
                </div>
                <div className="mt-1 text-xs text-white/75">
                  PSČ {quote.cleanPostcode} · {quote.leadTime}
                </div>
              </div>
              <div className="rounded-xl bg-white/10 px-4 py-3 text-xs font-semibold text-white/90 sm:text-right">
                Při nákupu nad {formatCurrency(FREE_SHIPPING_THRESHOLD)}
                <div className="text-sm font-black text-[#D9B48A]">ZDARMA</div>
              </div>
            </div>
          )}
        </div>

        {/* Method cards */}
        <div className="mt-8 grid gap-3 sm:mt-12 sm:gap-4 md:grid-cols-3">
          {METHODS.map((m) => {
            const Icon = m.icon;
            return (
              <div
                key={m.title}
                className="group relative flex flex-col rounded-2xl border border-[#A86D38]/15 bg-[#FBF8F1] p-5 transition hover:-translate-y-1 hover:border-[#A86D38]/40 hover:bg-white hover:shadow-lg sm:rounded-3xl sm:p-6"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#234A33] text-white shadow-sm transition group-hover:bg-[#A86D38]">
                    <Icon className="h-6 w-6" />
                  </div>
                  {m.badge && <BadgePill tone={m.badgeTone}>{m.badge}</BadgePill>}
                </div>
                <h3 className="mt-4 text-lg font-black tracking-tight text-[#1E293B]">
                  {m.title}
                </h3>
                <p className="mt-1.5 text-sm leading-6 text-[#1E293B]/70">{m.description}</p>
              </div>
            );
          })}
        </div>

        {/* Single secondary CTA */}
        <div className="mt-6 flex justify-center sm:mt-8">
          <a
            href={COMPANY_PHONE_HREF}
            className="inline-flex items-center gap-2 rounded-2xl border border-[#234A33]/25 bg-white px-5 py-3 text-sm font-bold text-[#234A33] transition hover:bg-[#F1F5EE]"
          >
            <PhoneCall className="h-4 w-4" />
            Mám dotaz k dopravě → Zavolat {COMPANY_PHONE}
          </a>
        </div>
      </div>
    </section>
  );
}
