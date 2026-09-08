import { createFileRoute } from "@tanstack/react-router";
import { Camera, Handshake, Ruler, Trees } from "lucide-react";
import { SiteShell } from "@/components/site-shell";
import { COMPANY_EMAIL_HREF, COMPANY_PHONE, COMPANY_PHONE_HREF } from "@/lib/site";

export const Route = createFileRoute("/o-nas")({
  head: () => ({
    meta: [
      { title: "O nás | DIPISTAV" },
      {
        name: "description",
        content:
          "Poctivá česká pila a prodej dřeva DIPISTAV. Lokální surovina, výroba na míru a osobní přístup.",
      },
    ],
  }),
  component: ONasPage,
});

function ONasPage() {
  return (
    <SiteShell>
      <section className="relative overflow-hidden bg-white">
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(35,74,51,0.1),transparent_36%),linear-gradient(180deg,rgba(245,242,233,0.82),rgba(245,242,233,0))]"
        />
        <div className="relative mx-auto max-w-7xl px-4 py-14 sm:py-18">
          <div>
            <h1 className="whitespace-nowrap text-[clamp(1.15rem,4.8vw,3rem)] font-black leading-tight tracking-tight text-[#1E293B]">
              Poctivá česká pila a paliva
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[#1E293B]/72 sm:text-base">
              Dodáváme stavební řezivo a palivové dřevo, na které je spoleh od první poptávky až po
              vykládku na místě.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pt-10 sm:pt-12">
        <div className="rounded-[2rem] border border-[#A86D38]/12 bg-white p-6 shadow-sm sm:p-8">
          <div className="max-w-2xl">
            <h2 className="whitespace-nowrap text-[clamp(1rem,3.4vw,1.875rem)] font-black tracking-tight text-[#1E293B]">
              Dřevo, které známe od původu až po expedici
            </h2>
            <p className="mt-3 text-sm leading-6 text-[#1E293B]/75">
              Každou zakázku řešíme osobně. Pomůžeme s výběrem profilu, doporučíme vhodné rozměry a
              připravíme materiál tak, aby na stavbě vše sedělo bez zbytečných kompromisů.
            </p>
          </div>

          <div className="mt-6 grid justify-items-center gap-3 md:flex md:flex-wrap">
            {[
              { label: "Lokální surovina", icon: Trees },
              { label: "Výroba na míru", icon: Ruler },
              { label: "Osobní přístup", icon: Handshake },
            ].map((pillar) => (
              <div
                key={pillar.label}
                className="inline-flex items-center gap-3 rounded-full bg-[#F5F2E9] px-5 py-3 text-xs font-bold text-[#234A33] sm:text-sm"
              >
                <pillar.icon className="h-4 w-4" />
                {pillar.label}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:py-16">
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          <figure className="overflow-hidden rounded-[1.75rem] border border-[#A86D38]/10 bg-white shadow-sm">
            <img
              src="/images/onas2.webp"
              width="1600"
              height="1200"
              alt="Naložené fošny a prkna připravené k expedici"
              loading="eager"
              fetchPriority="high"
              decoding="async"
              className="h-72 w-full object-cover"
            />
            <figcaption className="px-5 py-4 text-sm font-semibold text-[#1E293B]/80">
              Stavební fošny a prkna připravená k expedici
            </figcaption>
          </figure>

          <figure className="overflow-hidden rounded-[1.75rem] border border-[#A86D38]/10 bg-white shadow-sm">
            <img
              src="/images/onas1.webp"
              width="1200"
              height="1600"
              alt="Masivní stavební trámy na korbě nákladního vozu"
              loading="eager"
              fetchPriority="auto"
              decoding="async"
              className="h-72 w-full object-cover"
            />
            <figcaption className="px-5 py-4 text-sm font-semibold text-[#1E293B]/80">
              Masivní stavební trámy na míru až do 8 m
            </figcaption>
          </figure>

          <div className="flex min-h-[260px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#A86D38]/50 bg-[#F5F2E9]/60 p-8 text-center">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-white text-[#A86D38] shadow-sm">
              <Camera className="h-7 w-7" />
            </div>
            <div className="mt-5 text-lg font-black tracking-tight text-[#1E293B]">
              Zde doplníme vaši týmovou fotku nebo fotku z areálu pily
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-12 sm:pb-16">
        <div className="rounded-[2rem] bg-[#234A33] px-6 py-8 text-white shadow-sm sm:px-10 sm:py-10">
          <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <h2 className="text-xl font-black tracking-tight sm:text-2xl">
                Chcete připravit nabídku na trámy, fošny nebo atypické řezivo?
              </h2>
              <p className="mt-3 text-sm leading-6 text-white/80">
                Zavolejte nám nebo pošlete poptávku. Připravíme přehlednou nabídku, ověříme
                dostupnost a doporučíme nejvhodnější řešení pro váš projekt.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row md:flex-col lg:flex-row">
              <a
                href={COMPANY_PHONE_HREF}
                className="inline-flex items-center justify-center rounded-2xl bg-[#A86D38] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#8a5528]"
              >
                Volejte {COMPANY_PHONE}
              </a>
              <a
                href={COMPANY_EMAIL_HREF}
                className="inline-flex items-center justify-center rounded-2xl border border-white/25 px-6 py-3 text-sm font-bold text-white transition hover:bg-white/10"
              >
                Poslat poptávku e-mailem
              </a>
            </div>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
