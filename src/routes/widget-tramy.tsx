import { useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { SiteShell } from "@/components/site-shell";

declare global {
  interface Window {
    BeamConfigurator?: {
      initAll: (scope?: ParentNode) => unknown[];
    };
  }
}

const widgetConfig = JSON.stringify({
  maxQuantity: 200,
  slider: {
    min: 1,
    max: 25,
  },
});

export const Route = createFileRoute("/widget-tramy")({
  component: WidgetTramyPage,
});

function WidgetTramyPage() {
  useEffect(() => {
    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[data-beam-configurator-script="true"]',
    );

    if (window.BeamConfigurator?.initAll) {
      window.BeamConfigurator.initAll(document);
      return;
    }

    if (existingScript) {
      existingScript.addEventListener("load", () => {
        window.BeamConfigurator?.initAll(document);
      });
      return;
    }

    const script = document.createElement("script");
    script.src = "/widgets/beam-configurator.js";
    script.defer = true;
    script.dataset.beamConfiguratorScript = "true";
    script.onload = () => {
      window.BeamConfigurator?.initAll(document);
    };
    document.body.appendChild(script);

    return () => {
      script.onload = null;
    };
  }, []);

  return (
    <SiteShell>
      <section className="relative overflow-hidden border-b border-border bg-[linear-gradient(180deg,#f9f5ee_0%,#f3ede2_100%)]">
        <div
          aria-hidden
          className="absolute inset-0 scale-110 bg-cover bg-center opacity-20 blur-sm"
          style={{ backgroundImage: "url('/images/woodpatern.jpg')" }}
        />

        <div className="relative mx-auto max-w-7xl px-4 py-10 sm:py-14">
          <a
            href="/#kategorie"
            className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-[#234A33] transition hover:text-[#A86D38]"
          >
            <ArrowLeft className="h-4 w-4" />
            Zpět do obchodu
          </a>

          <div className="rounded-3xl border border-white/70 bg-white/88 p-6 shadow-sm backdrop-blur sm:p-8">
            <h1 className="text-3xl font-black tracking-tight text-[#1E293B] sm:text-5xl">
              Timber Beam Configurator
            </h1>
            <p className="mt-3 max-w-2xl text-base font-semibold text-[#1E293B]/72">
              Vanilla JS widget s nulovým flickerem, custom sliderem a okamžitou kalkulací ceny.
            </p>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-[#1E293B]/65 sm:text-base">
              Tenhle blok je postavený tak, aby šel snadno přenést do WordPress Bricks Builderu nebo
              propojit s WooCommerce pomocí vlastního hooku na tlačítko přidání do košíku.
            </p>
          </div>

          <section
            data-beam-configurator
            data-default-profile="10x10"
            data-default-length="400"
            data-default-quantity="5"
            className="mt-6"
          >
            <script
              type="application/json"
              data-beam-config
              dangerouslySetInnerHTML={{ __html: widgetConfig }}
            />

            <div className="grid items-stretch gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(360px,430px)]">
              <div className="rounded-3xl border border-[#A86D38]/15 bg-white/80 p-4 shadow-sm backdrop-blur sm:p-6">
                <header className="mb-4 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#A86D38]">
                      Stavební trámy
                    </p>
                    <h2 className="mt-2 text-2xl font-black tracking-tight text-[#1E293B] sm:text-3xl">
                      Vizualizace sestavy
                    </h2>
                  </div>
                  <output
                    data-beam-quantity-output
                    aria-live="polite"
                    className="rounded-full bg-[#F6F4EE] px-3 py-1.5 text-sm font-bold text-[#1E293B] tabular-nums"
                  >
                    5 ks
                  </output>
                </header>

                <div
                  data-beam-preview
                  className="relative flex min-h-[320px] items-center justify-center overflow-hidden rounded-[1.75rem] border border-[#E8DFD2] bg-[radial-gradient(circle_at_top,#fffdf7_0%,#f7efe0_58%,#efe4d3_100%)] px-5 py-8 sm:min-h-[420px]"
                >
                  <div
                    aria-hidden
                    className="absolute inset-x-10 bottom-8 h-8 rounded-full bg-[#6B4A2F]/10 blur-2xl"
                  />

                  <div className="relative aspect-[16/10] w-full max-w-[44rem]">
                    <img
                      src="/images/widgets/1TramDIPI_2.webp"
                      alt="Jeden stavební trám"
                      data-beam-image
                      data-image-key="one"
                      className="absolute inset-0 h-full w-full object-contain select-none"
                      loading="eager"
                      decoding="async"
                      draggable={false}
                    />
                    <img
                      src="/images/widgets/2TramDIPI.webp"
                      alt="Dva stavební trámy"
                      data-beam-image
                      data-image-key="two"
                      className="absolute inset-0 h-full w-full object-contain select-none"
                      loading="eager"
                      decoding="async"
                      draggable={false}
                    />
                    <img
                      src="/images/widgets/3TramDIPI.webp"
                      alt="Tři až čtyři stavební trámy"
                      data-beam-image
                      data-image-key="three"
                      className="absolute inset-0 h-full w-full object-contain select-none"
                      loading="eager"
                      decoding="async"
                      draggable={false}
                    />
                    <img
                      src="/images/widgets/5TramDIPI.webp"
                      alt="Pět až šest stavebních trámů"
                      data-beam-image
                      data-image-key="five"
                      className="absolute inset-0 h-full w-full object-contain select-none"
                      loading="eager"
                      decoding="async"
                      draggable={false}
                    />
                    <img
                      src="/images/widgets/7TramDIPI.webp"
                      alt="Sedm až deset stavebních trámů"
                      data-beam-image
                      data-image-key="seven"
                      className="absolute inset-0 h-full w-full object-contain select-none"
                      loading="eager"
                      decoding="async"
                      draggable={false}
                    />
                    <img
                      src="/images/widgets/11TramDIPI.webp"
                      alt="Jedenáct a více stavebních trámů"
                      data-beam-image
                      data-image-key="eleven"
                      className="absolute inset-0 h-full w-full object-contain select-none"
                      loading="eager"
                      decoding="async"
                      draggable={false}
                    />
                    <img
                      src="/images/widgets/18TramDIPI.webp"
                      alt="Sedmnáct a více stavebních trámů"
                      data-beam-image
                      data-image-key="eighteen"
                      className="absolute inset-0 h-full w-full object-contain select-none"
                      loading="eager"
                      decoding="async"
                      draggable={false}
                    />
                  </div>
                </div>
              </div>

              <div className="flex h-full flex-col rounded-3xl border border-[#234A33]/12 bg-white p-5 shadow-sm transition-shadow duration-300 hover:shadow-[0_20px_45px_rgba(35,74,51,0.08)] sm:p-7">
                <header className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#A86D38]">
                      Konfigurátor
                    </p>
                    <h2 className="mt-2 text-2xl font-black tracking-tight text-[#1E293B]">
                      Nastavte si sestavu
                    </h2>
                  </div>
                  <div className="min-w-[8.75rem] rounded-2xl bg-[#F6F4EE] px-4 py-3 text-right">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      Cena / ks
                    </div>
                    <output
                      data-beam-unit-price
                      aria-live="polite"
                      className="mt-1 block text-xl font-black tracking-tight text-[color:var(--timber)] tabular-nums"
                    >
                      450 Kč
                    </output>
                  </div>
                </header>

                <div className="mt-6 flex flex-1 flex-col gap-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block">
                      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        Profil
                      </span>
                      <select
                        data-beam-profile
                        aria-label="Vyberte profil trámu"
                        className="h-12 w-full rounded-2xl border border-border bg-white px-4 text-sm font-semibold text-foreground shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </label>

                    <label className="block">
                      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        Délka
                      </span>
                      <select
                        data-beam-length
                        aria-label="Vyberte délku trámu"
                        className="h-12 w-full rounded-2xl border border-border bg-white px-4 text-sm font-semibold text-foreground shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </label>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <label
                        htmlFor="beam-quantity-range"
                        className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground"
                      >
                        Počet kusů
                      </label>
                      <output className="rounded-full bg-[#F6F4EE] px-3 py-1 text-sm font-bold text-[#1E293B] tabular-nums">
                        1-25+
                      </output>
                    </div>

                    <div className="grid items-center gap-4 sm:grid-cols-[minmax(0,1fr)_112px]">
                      <div className="rounded-full bg-[#F6F4EE] px-2 py-3">
                        <input
                          id="beam-quantity-range"
                          data-beam-quantity-range
                          data-beam-range
                          type="range"
                          min={1}
                          max={25}
                          step={1}
                          value={5}
                          aria-label="Počet kusů"
                          aria-valuemin={1}
                          aria-valuemax={25}
                          aria-valuenow={5}
                          className="block w-full cursor-pointer bg-transparent"
                        />
                      </div>

                      <label className="block">
                        <span className="sr-only">Počet kusů v čísle</span>
                        <input
                          data-beam-quantity-input
                          type="number"
                          min={1}
                          max={200}
                          value={5}
                          inputMode="numeric"
                          aria-label="Počet kusů v čísle"
                          className="h-11 w-full rounded-2xl border border-border bg-white px-3 text-base font-black text-[#1E293B] shadow-sm tabular-nums focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </label>
                    </div>
                  </div>

                  <div className="rounded-[1.75rem] border border-[#234A33]/10 bg-[#F6F4EE] p-5">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                      Konfigurace
                    </div>
                    <output
                      data-beam-summary
                      aria-live="polite"
                      className="mt-2 block text-base font-black leading-6 text-[#1E293B]"
                    >
                      10 × 10 cm · 400 cm | 5 ks
                    </output>

                    <div className="mt-5 flex items-end justify-between gap-4">
                      <div>
                        <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                          Celkem
                        </div>
                        <output
                          data-beam-total-price
                          aria-live="polite"
                          className="mt-1 block min-w-[8ch] text-4xl font-black tracking-tight text-[#1E3A2B] tabular-nums"
                        >
                          2 250 Kč
                        </output>
                      </div>

                      <button
                        type="button"
                        data-beam-add
                        className="inline-flex items-center justify-center rounded-2xl bg-[#1e3a2b] px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-[#163022] hover:shadow-[0_14px_30px_rgba(30,58,43,0.18)]"
                      >
                        Přidat trámy do košíku
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </section>
    </SiteShell>
  );
}
