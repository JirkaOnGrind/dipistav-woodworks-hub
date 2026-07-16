import { createFileRoute } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { CustomConfigurator } from "@/components/custom-configurator";
import { ProductCategorySection } from "@/components/product-category-section";
import { ShippingWidget } from "@/components/shipping-widget";
import { SiteShell } from "@/components/site-shell";
import { PRODUCT_CATEGORY_SECTIONS } from "@/lib/product-catalog";
import { COMPANY_EMAIL_HREF, COMPANY_PHONE, COMPANY_PHONE_HREF } from "@/lib/site";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "DIPISTAV - Pila a prodej dřeva | Stavební řezivo a paliva" },
      {
        name: "description",
        content:
          "Kvalitní stavební řezivo, KVH hranoly, palivové dřevo a řezivo na míru do 8 m přímo z pily DIPISTAV.",
      },
      { property: "og:title", content: "DIPISTAV - Pila a prodej dřeva" },
      {
        property: "og:description",
        content:
          "Vyberte si řezivo online, nastavte rozměr i množství a hned uvidíte orientační cenu své objednávky.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});


function Index() {
  return (
    <SiteShell>
      <section className="relative overflow-hidden bg-[#F5F2E9]">
        <div
          aria-hidden
          className="absolute inset-0 scale-[1.04] bg-center bg-no-repeat opacity-[0.32] sm:scale-[1.18] sm:opacity-40 sm:blur-[3px]"
          style={{
            backgroundImage: "url('/images/woodpatern.jpg')",
            backgroundRepeat: "no-repeat",
            backgroundSize: "cover",
          }}
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-[linear-gradient(180deg,rgba(245,242,233,0.58),rgba(245,242,233,0.84)_58%,rgba(245,242,233,0.98))] sm:bg-[linear-gradient(180deg,rgba(245,242,233,0.74),rgba(245,242,233,0.9)_56%,rgba(245,242,233,1))]"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.34),transparent_48%)] sm:bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.18),transparent_54%)]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-56 bg-gradient-to-b from-transparent via-[#F5F2E9] via-40% to-[#F5F2E9]"
        />

        <div className="relative mx-auto max-w-5xl px-4 py-8 text-center sm:py-20 lg:py-28">
          <h1 className="text-[28px] font-bold leading-[1.15] tracking-tight text-[#1E293B] sm:text-5xl sm:font-black sm:leading-[1.05] lg:text-6xl">
            Stavební řezivo doručené
            <span className="text-[#A86D38]"> až na vaši stavbu</span>
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[#1E293B]/70 sm:mt-5 sm:text-lg">
            Vyberte si rozměr, délku i množství přesně podle své stavby a hned uvidíte, co pro vás dává smysl.
          </p>

          <div className="mx-auto mt-5 flex max-w-md flex-col items-center gap-3 sm:mt-8">
            <a
              href="#kategorie"
              className="inline-flex w-full items-center justify-center rounded-xl bg-[#234A33] px-6 py-3.5 text-sm font-bold text-white transition hover:bg-[#1a3826] sm:w-auto sm:px-8"
            >
              Prohlédnout sortiment
            </a>
            <a
              href="#konfigurator"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#A86D38] underline-offset-4 hover:underline"
            >
              nebo navrhnout řezivo na míru
              <ArrowRight className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </section>

      <section className="relative -mt-px bg-[#F5F2E9]">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-[#F5F2E9] to-[#F5F2E9]/0" />
        <div className="relative mx-auto max-w-7xl space-y-12 px-4 py-8 sm:space-y-14 sm:py-14">
          {PRODUCT_CATEGORY_SECTIONS.map((section) => (
            <ProductCategorySection key={section.id} section={section} />
          ))}
        </div>
      </section>

      <CustomConfigurator />


      <ShippingWidget />

      <section id="kontakt" className="bg-[color:var(--forest)] text-white">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-10 sm:py-14 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <h2 className="text-2xl font-black tracking-tight sm:text-3xl">
              Potřebujete poradit s výběrem nebo dopravou?
            </h2>
            <p className="mt-2 text-white/80">
              Ozvěte se nám. Doporučíme vhodné řezivo, ověříme dostupnost a připravíme řešení, které bude na stavbě opravdu fungovat.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row md:flex-col lg:flex-row">
            <a
              href={COMPANY_PHONE_HREF}
              className="inline-flex items-center justify-center rounded-lg bg-[color:var(--timber)] px-6 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#8a5528]"
            >
              Volejte {COMPANY_PHONE}
            </a>
            <a
              href={COMPANY_EMAIL_HREF}
              className="inline-flex items-center justify-center rounded-lg border-2 border-white/40 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Napsat e-mail
            </a>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
