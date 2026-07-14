import { createFileRoute } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { CustomConfigurator } from "@/components/custom-configurator";
import { ShippingCalculator } from "@/components/shipping-calculator";
import { SiteShell } from "@/components/site-shell";
import { PRODUCT_CATEGORIES } from "@/lib/product-catalog";
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

function CategoryCard({
  href,
  imageSrc,
  title,
  subtitle,
}: {
  href: string;
  imageSrc: string;
  title: string;
  subtitle: string;
}) {
  return (
    <a
      href={href}
      className="group flex h-full flex-col rounded-[1.75rem] border border-border bg-white p-4 shadow-sm transition hover:-translate-y-1 hover:border-[#A86D38]/40 hover:shadow-lg sm:p-5"
    >
      <div className="flex h-36 items-center justify-center rounded-[1.25rem] bg-[linear-gradient(180deg,#f8f4eb_0%,#f0e7d8_100%)] p-4 sm:h-44">
        <img
          src={imageSrc}
          alt=""
          loading="lazy"
          draggable={false}
          className="max-h-full w-auto select-none object-contain drop-shadow-[0_8px_14px_rgba(122,78,36,0.25)] transition duration-300 group-hover:scale-[1.03]"
        />
      </div>

      <div className="mt-4 flex flex-1 flex-col">
        <div className="text-lg font-black tracking-tight text-[#234A33]">{title}</div>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">{subtitle}</p>
        <div className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-[#A86D38]">
          Nakoupit
          <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
        </div>
      </div>
    </a>
  );
}

function IconCheck() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
    >
      <path d="M4 12l5 5L20 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Index() {
  return (
    <SiteShell>
      <section className="relative overflow-hidden bg-[#F5F2E9]">
        <div
          aria-hidden
          className="absolute inset-0 scale-[1.18] bg-cover bg-center opacity-40 blur-[3px]"
          style={{ backgroundImage: "url('/images/woodpatern.jpg')" }}
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-[linear-gradient(180deg,rgba(245,242,233,0.74),rgba(245,242,233,0.9)_56%,rgba(245,242,233,1))]"
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
            Konfigurace rozměrů na míru s okamžitým výpočtem ceny.
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

      <section id="kategorie" className="relative -mt-px bg-[#F5F2E9]">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-[#F5F2E9] to-[#F5F2E9]/0" />
        <div className="relative mx-auto max-w-7xl px-4 py-8 sm:py-14">
          <div className="mb-6">
            <h2 className="text-2xl font-black tracking-tight text-[#1E293B] sm:text-3xl">
              Vyberte si druh řeziva
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Otevřete detail produktu, nastavte rozměr i množství a během chvilky máte jasno v
              ceně.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {PRODUCT_CATEGORIES.map((category) => (
              <CategoryCard
                key={category.id}
                href={`/category/${category.id}`}
                imageSrc={category.imageSrc}
                title={category.name}
                subtitle={category.subtitle}
              />
            ))}
          </div>
        </div>
      </section>

      <CustomConfigurator />

      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:py-16">
          <div className="mb-8 max-w-2xl">
            <h2 className="text-2xl font-black tracking-tight sm:text-3xl">
              Proč zvolit KVH hranoly?
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              {
                title: "Vysušeno na 15 %",
                description: "Tvarová stálost a minimální kroucení, ideální pro nosné konstrukce.",
              },
              {
                title: "Hoblovaný povrch",
                description: "Hladké hrany a stěny bez nutnosti dalšího opracování.",
              },
              {
                title: "Certifikované dřevo",
                description: "Vhodné pro pergoly, garážová stání i moderní dřevostavby.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-border bg-[color:var(--sand)] p-6"
              >
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[color:var(--timber)] text-white">
                  <IconCheck />
                </div>
                <h3 className="mt-4 text-lg font-black tracking-tight text-foreground">
                  {item.title}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <ShippingWidget />


      <section id="kontakt" className="bg-[color:var(--forest)] text-white">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-10 sm:py-14 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <h2 className="text-2xl font-black tracking-tight sm:text-3xl">
              Potřebujete poradit s výpočtem nebo dopravou?
            </h2>
            <p className="mt-2 text-white/80">
              Ozvěte se. Pomůžeme s výběrem řeziva, spočítáme orientační objem i naceníme rozvoz.
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
