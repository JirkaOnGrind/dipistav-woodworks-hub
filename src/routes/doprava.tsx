import { createFileRoute } from "@tanstack/react-router";
import { Clock3, MapPin, PackageCheck, Truck } from "lucide-react";
import { ShippingCalculator } from "@/components/shipping-calculator";
import { SiteShell } from "@/components/site-shell";
import {
  COMPANY_ADDRESS_LINES,
  COMPANY_MAPS_URL,
  COMPANY_PHONE,
  COMPANY_PHONE_HREF,
} from "@/lib/site";

export const Route = createFileRoute("/doprava")({
  head: () => ({
    meta: [
      { title: "Doprava a osobní odběr | DIPISTAV" },
      {
        name: "description",
        content:
          "Možnosti dopravy a osobního odběru DIPISTAV. Vlastní autojeřáb pro pohodlnou vykládku i bezplatný odběr na pile.",
      },
    ],
  }),
  component: DopravaPage,
});

function DopravaPage() {
  return (
    <SiteShell>
      <section className="relative overflow-hidden bg-white">
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(168,109,56,0.12),transparent_35%),linear-gradient(180deg,rgba(245,242,233,0.8),rgba(245,242,233,0))]"
        />
        <div className="relative mx-auto max-w-7xl px-4 py-14 sm:py-18">
          <div className="max-w-3xl">
            <h1 className="text-4xl font-black tracking-tight text-[#1E293B] sm:text-5xl">
              Možnosti dopravy a osobního odběru
            </h1>
            <p className="mt-4 text-lg text-[#1E293B]/72">
              Řezivo vám přivezeme až na místo nebo připravíme k rychlému osobnímu odběru přímo na pile.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:py-16">
        <div className="mb-8">
          <h2 className="text-2xl font-black tracking-tight text-[#1E293B] sm:text-3xl">
            Doprava s autojeřábem DIPISTAV
          </h2>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
          <div className="space-y-4">
            <div className="rounded-2xl border-2 border-[#A86D38]/30 bg-[#FFFFFF] p-2 shadow-sm">
              <img
                src="/images/doprava.jpeg"
                alt="Nákladní vůz DIPISTAV s hydraulickou rukou při rozvozu řeziva"
                className="h-full w-full rounded-[1rem] object-cover"
              />
            </div>
            <div className="inline-flex rounded-full bg-[#F5F2E9] px-4 py-2 text-xs font-bold text-[#A86D38]">
              Vlastní nákladní vůz s hydraulickou rukou Palfinger
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-[2rem] border border-[#A86D38]/15 bg-white p-6 shadow-sm sm:p-8">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F5F2E9] text-[#A86D38]">
                <Truck className="h-6 w-6" />
              </div>
              <p className="mt-4 text-base leading-7 text-[#1E293B]/78">
                Dovezeme stavební řezivo přímo na stavbu a díky autojeřábu zajistíme pohodlné složení i tam, kde je potřeba přesná manipulace.
              </p>

              <div className="mt-6 grid gap-3">
                {[
                  "Složení materiálu hydraulickou rukou bez nutnosti zajišťovat další techniku.",
                  "Vhodné pro trámy, fošny, prkna i objemnější zakázky na míru.",
                  "Termín rozvozu ladíme podle připravenosti stavby i vašeho harmonogramu.",
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-3 rounded-2xl bg-[#F5F2E9]/70 px-4 py-3 text-sm font-semibold text-[#1E293B]"
                  >
                    <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-[#234A33]">
                      <PackageCheck className="h-4 w-4" />
                    </span>
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <ShippingCalculator />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-12 sm:pb-16">
        <div className="grid gap-6 rounded-[2rem] bg-[#234A33] p-6 text-white shadow-sm sm:p-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <div className="inline-flex rounded-full bg-white/10 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.22em] text-white/80">
              Osobní odběr zdarma
            </div>
            <h2 className="mt-4 text-2xl font-black tracking-tight sm:text-3xl">
              Osobní odběr na pile (Zdarma)
            </h2>
            <p className="mt-3 max-w-2xl text-white/80">
              Přijeďte si pro dřevo osobně. Materiál vám nachystáme předem a naložení vysokozdvižným vozíkem máte bez příplatku.
            </p>

            <div className="mt-6 grid gap-3">
              <div className="flex items-center gap-3 rounded-2xl bg-white/8 px-4 py-3 text-sm font-semibold">
                <MapPin className="h-4 w-4 shrink-0 text-[#D9B48A]" />
                {COMPANY_ADDRESS_LINES.join(", ")}
              </div>
              <div className="flex items-center gap-3 rounded-2xl bg-white/8 px-4 py-3 text-sm font-semibold">
                <Clock3 className="h-4 w-4 shrink-0 text-[#D9B48A]" />
                Po–Pá: 7:00 – 16:00
              </div>
              <div className="flex items-center gap-3 rounded-2xl bg-white/8 px-4 py-3 text-sm font-semibold">
                <Truck className="h-4 w-4 shrink-0 text-[#D9B48A]" />
                Nakládka vysokozdvižným vozíkem bez příplatku
              </div>
            </div>
          </div>

          <div className="rounded-[1.75rem] bg-white p-6 text-[#1E293B] sm:p-8">
            <h3 className="text-xl font-black tracking-tight">Specifikace odběru</h3>
            <div className="mt-5 space-y-4 text-sm leading-7 text-[#1E293B]/78">
              <p>
                Materiál vám připravíme předem, aby odběr proběhl rychle a bez zbytečného čekání. Stačí nám zavolat a domluvit si termín.
              </p>
              <p>
                Pokud chcete mít jistotu, že bude vše připraveno přesně podle rozměrů a množství, doporučujeme odběr potvrdit na čísle {COMPANY_PHONE}.
              </p>
            </div>

            <div className="mt-6 flex flex-col gap-3">
              <a
                href={COMPANY_MAPS_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center rounded-2xl bg-[#A86D38] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#8a5528]"
              >
                Otevřít v Google Maps
              </a>
              <a
                href={COMPANY_PHONE_HREF}
                className="inline-flex items-center justify-center rounded-2xl border border-[#234A33]/15 px-5 py-3 text-sm font-bold text-[#234A33] transition hover:bg-[#F1F5EE]"
              >
                Zavolat a domluvit odběr
              </a>
            </div>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
