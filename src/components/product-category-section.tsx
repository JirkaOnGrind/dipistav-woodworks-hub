import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { type ProductCategorySection as ProductCategorySectionConfig } from "@/lib/product-catalog";

function CategoryCard({
  id,
  imageSrc,
  imageAlt,
  title,
  subtitle,
}: {
  id: string;
  imageSrc: string;
  imageAlt: string;
  title: string;
  subtitle: string;
}) {
  const isTimberThumbnail = imageSrc.includes("/homepage-v41/");
  const image384Src = imageSrc.replace(/\.webp$/, ".384w.webp");
  const image640Src = imageSrc.replace(/\.webp$/, ".640w.webp");
  const fullImageWidth = imageSrc.includes("/configurator-v30/") ? 1280 : 768;
  const imageWidth = isTimberThumbnail ? 768 : 1254;
  const imageHeight = isTimberThumbnail ? 480 : 1254;

  return (
    <Card className="group h-full rounded-[1.75rem] border border-border bg-white shadow-sm transition hover:-translate-y-1 hover:border-[#A86D38]/40 hover:shadow-lg">
      <Link
        to="/category/$id"
        params={{ id }}
        className="flex h-full flex-col p-4 sm:p-5"
        preload="intent"
      >
        <div className="flex h-36 items-center justify-center rounded-[1.25rem] bg-[linear-gradient(180deg,#f8f4eb_0%,#f0e7d8_100%)] p-4 sm:h-44">
          <img
            data-category-image
            src={imageSrc}
            srcSet={`${image384Src} 384w, ${image640Src} 640w, ${imageSrc} ${fullImageWidth}w`}
            sizes="(min-width: 1280px) 272px, (min-width: 640px) 44vw, 90vw"
            width={imageWidth}
            height={imageHeight}
            alt={imageAlt}
            loading="lazy"
            decoding="async"
            draggable={false}
            className="max-h-full w-auto select-none object-contain transition duration-300 group-hover:scale-[1.03]"
          />
        </div>

        <div className="mt-4 flex flex-1 flex-col">
          <div className="text-lg font-black tracking-tight text-[#234A33]">{title}</div>
          <p className="product-selling-copy mt-1 text-sm leading-6 text-muted-foreground">
            {subtitle}
          </p>
          <div className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-[#A86D38]">
            Nakoupit
            <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
          </div>
        </div>
      </Link>
    </Card>
  );
}

export function ProductCategorySection({ section }: { section: ProductCategorySectionConfig }) {
  return (
    <section id={section.anchorId} className="scroll-mt-24">
      <div className="mb-6">
        <h2 className="text-2xl font-black tracking-tight text-[#1E293B] sm:text-3xl">
          {section.title}
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          {section.description}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {section.categories.map((category) => (
          <CategoryCard
            key={category.id}
            id={category.id}
            imageSrc={category.imageSrc}
            imageAlt={category.thumbnailAlt}
            title={category.name}
            subtitle={category.subtitle}
          />
        ))}
      </div>
    </section>
  );
}
