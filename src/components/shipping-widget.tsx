import type { ComponentType, ReactNode } from "react";
import { ConstructionIcon, PhoneCall, Ruler, Store } from "lucide-react";
import { COMPANY_PHONE, COMPANY_PHONE_HREF } from "@/lib/site";

type Method = {
  icon: ComponentType<{ className?: string }>;
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
    description:
      "Pro trámy nad 8 metrů nebo kompletní krovy na míru domluvíme individuální dopravu.",
    badgeTone: "neutral",
  },
];

function BadgePill({ tone, children }: { tone: Method["badgeTone"]; children: ReactNode }) {
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
  return (
    <section id="doprava" className="mx-auto max-w-7xl px-3 py-8 sm:px-6 sm:py-16">
      <div className="rounded-[2rem] border border-[#A86D38]/15 bg-white p-4 shadow-sm sm:p-10">
        {/* Method cards */}
        <div className="grid gap-3 sm:gap-4 md:grid-cols-3">
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
                <h3 className="mt-4 text-lg font-black tracking-tight text-[#1E293B]">{m.title}</h3>
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
