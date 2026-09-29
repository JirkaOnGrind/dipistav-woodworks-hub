import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { SiteShell } from "@/components/site-shell";
import { Card } from "@/components/ui/card";
import { PERGOLA_MODELS, type PergolaModel } from "@/lib/pergola";

function PergolaCardPreview({ model }: { model: PergolaModel }) {
  return (
    <img
      src={`/images/pergolas/${model}.webp`}
      width="358"
      height="176"
      alt={`Náhled: ${PERGOLA_MODELS[model].label}`}
      loading="eager"
      decoding="async"
      className="size-full select-none object-contain transition duration-300 group-hover:scale-[1.03]"
    />
  );
}

function PergolaModelCard({ model }: { model: PergolaModel }) {
  const definition = PERGOLA_MODELS[model];

  return (
    <Card className="group h-full rounded-[1.75rem] border border-border bg-white shadow-sm transition hover:-translate-y-1 hover:border-[#A86D38]/40 hover:shadow-lg">
      <Link
        to="/category/$id"
        params={{ id: "pergoly" }}
        search={{ model }}
        className="flex h-full flex-col p-4 sm:p-5"
        preload="intent"
      >
        <div className="flex h-36 items-center justify-center overflow-hidden rounded-[1.25rem] bg-[radial-gradient(ellipse_at_45%_40%,#fffefa,#ede9de)] sm:h-44">
          <PergolaCardPreview model={model} />
        </div>
        <div className="mt-4 flex min-w-0 flex-1 flex-col">
          <h2 className="text-lg font-black tracking-tight text-[#234A33]">{definition.label}</h2>
          <p className="mt-1 whitespace-normal text-sm leading-6 text-muted-foreground">
            {definition.description}
          </p>
          <div className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-[#A86D38]">
            Poptat
            <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" aria-hidden />
          </div>
        </div>
      </Link>
    </Card>
  );
}

export function PergolaCategoryPage() {
  return (
    <SiteShell>
      <section className="relative overflow-hidden bg-[#F5F2E9]">
        <img
          src="/images/woodpatern.webp"
          width="1136"
          height="936"
          alt=""
          aria-hidden
          decoding="async"
          className="absolute inset-0 size-full object-cover object-center opacity-20 blur-sm"
        />
        <div className="relative mx-auto max-w-7xl px-4 py-10 sm:py-14">
          <div className="mb-6 max-w-3xl">
            <h1 className="text-3xl font-black tracking-tight text-[#1E293B] sm:text-4xl">
              Vyberte typ konstrukce
            </h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground sm:text-base">
              Zvolte způsob kotvení a tvar střechy. Rozměry, materiál i doplňky nastavíte v
              navazujícím konfigurátoru.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {(Object.keys(PERGOLA_MODELS) as PergolaModel[]).map((model) => (
              <PergolaModelCard key={model} model={model} />
            ))}
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
