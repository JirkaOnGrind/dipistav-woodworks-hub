import { lazy, Suspense } from "react";
import { Link } from "@tanstack/react-router";
import { createFileRoute } from "@tanstack/react-router";
import { PergolaCategoryPage } from "@/components/pergola-category-page";
import { SiteShell } from "@/components/site-shell";
import { ProductDetailPage } from "@/components/product-detail-page";
import { getProductCategory } from "@/lib/product-catalog";
import { isPergolaModel, PERGOLA_MODELS } from "@/lib/pergola";
import "@/components/pergola.css";

const PergolaConfigurator = lazy(() => import("@/components/pergola-configurator"));

export const Route = createFileRoute("/category/$id")({
  validateSearch: (search: Record<string, unknown>) => ({
    model: isPergolaModel(search.model) ? search.model : undefined,
  }),
  head: ({ params }) => {
    if (params.id === "pergoly")
      return {
        meta: [
          { title: "Pergoly – konfigurátor | DIPISTAV" },
          {
            name: "description",
            content:
              "Vyberte samostatnou, nástěnnou nebo sedlovou pergolu a nastavte rozměry, nátěry, doplňky a orientační cenu v interaktivním konfigurátoru.",
          },
        ],
      };
    const category = getProductCategory(params.id);

    if (!category) {
      return {
        meta: [{ title: "Kategorie nebyla nalezena | DIPISTAV" }],
      };
    }

    return {
      meta: [
        { title: `${category.title} | DIPISTAV` },
        { name: "description", content: category.subtitle },
      ],
    };
  },
  component: CategoryRouteComponent,
});

function CategoryRouteComponent() {
  const { id } = Route.useParams();
  const { model } = Route.useSearch();
  const category = getProductCategory(id);

  if (id === "pergoly" && !model) return <PergolaCategoryPage />;

  if (id === "pergoly")
    return (
      <Suspense
        fallback={
          <SiteShell productDetail>
            <div className="pergola-surface">
              <div className="pergola-surface-texture" aria-hidden />
              <section className="pergola-page" aria-label="Načítání konfigurátoru pergoly">
                <header className="pergola-heading">
                  <h1>
                    <span className="pergola-title-desktop">
                      Pergola <span className="pergola-title-accent">na míru.</span>
                    </span>
                    <span className="pergola-title-mobile">Pergoly</span>
                  </h1>
                  <p className="pergola-subtitle-desktop">{PERGOLA_MODELS[model].label}</p>
                  <p className="pergola-subtitle-mobile">{PERGOLA_MODELS[model].label}</p>
                </header>
                <div className="pergola-layout">
                  <div className="pergola-stage">
                    <div className="pergola-viewer" data-viewer-status="loading">
                      <div className="pergola-viewer-message" data-status="loading" role="status">
                        Načítáme konfigurátor pergoly…
                      </div>
                    </div>
                  </div>
                  <aside className="pergola-panel pergola-panel-skeleton" aria-hidden="true" />
                </div>
              </section>
            </div>
          </SiteShell>
        }
      >
        <PergolaConfigurator key={model} model={model} />
      </Suspense>
    );

  if (!category) {
    return (
      <SiteShell>
        <section className="mx-auto max-w-3xl px-4 py-16">
          <div className="rounded-[2rem] border border-border bg-white p-8 text-center shadow-sm">
            <h1 className="text-3xl font-black tracking-tight text-[#1E293B]">
              Kategorie nebyla nalezena
            </h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Vybraná stránka produktu neexistuje. Vraťte se prosím na přehled kategorií a zvolte
              jiný typ řeziva.
            </p>
            <Link
              to="/"
              className="mt-6 inline-flex items-center justify-center rounded-xl bg-[#234A33] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#1A3826]"
            >
              Zpět na úvod
            </Link>
          </div>
        </section>
      </SiteShell>
    );
  }

  return <ProductDetailPage category={category} />;
}
