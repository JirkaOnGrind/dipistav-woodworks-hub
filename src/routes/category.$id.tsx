import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { SiteShell } from "@/components/site-shell";
import { ProductDetailPage } from "@/components/product-detail-page";
import { getProductCategory } from "@/lib/product-catalog";

export const Route = createFileRoute("/category/$id")({
  component: CategoryRouteComponent,
});

function CategoryRouteComponent() {
  const { id } = Route.useParams();
  const category = getProductCategory(id);

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
