import { useEffect, useMemo } from "react";

type WoodVisualizerProps = {
  categoryId: string;
  imageSrc: string;
  imageAlt: string;
  quantity: number;
};

const BEAM_ASSETS = {
  one: "/images/widgets/1TramDIPI_2.webp",
  two: "/images/widgets/2TramDIPI.webp",
  three: "/images/widgets/3TramDIPI.webp",
  five: "/images/widgets/5TramDIPI.webp",
  seven: "/images/widgets/7TramDIPI.webp",
  eleven: "/images/widgets/11TramDIPI.webp",
  eighteen: "/images/widgets/18TramDIPI.webp",
} as const;

const BEAM_IMAGE_STACK = [
  { alt: "Jeden stavební trám", key: "one", src: BEAM_ASSETS.one },
  { alt: "Dva stavební trámy", key: "two", src: BEAM_ASSETS.two },
  { alt: "Tři až čtyři stavební trámy", key: "three", src: BEAM_ASSETS.three },
  { alt: "Pět až šest stavebních trámů", key: "five", src: BEAM_ASSETS.five },
  { alt: "Sedm až deset stavebních trámů", key: "seven", src: BEAM_ASSETS.seven },
  { alt: "Jedenáct až patnáct stavebních trámů", key: "eleven", src: BEAM_ASSETS.eleven },
  { alt: "Šestnáct a více stavebních trámů", key: "eighteen", src: BEAM_ASSETS.eighteen },
] as const;

function preloadImage(src: string) {
  const image = new Image();
  image.decoding = "async";
  image.src = src;
}

function getBeamVisualKey(quantity: number) {
  if (quantity <= 1) {
    return "one";
  }

  if (quantity === 2) {
    return "two";
  }

  if (quantity <= 4) {
    return "three";
  }

  if (quantity <= 6) {
    return "five";
  }

  if (quantity <= 10) {
    return "seven";
  }

  if (quantity <= 15) {
    return "eleven";
  }

  return "eighteen";
}

export function WoodVisualizer({ categoryId, imageSrc, imageAlt, quantity }: WoodVisualizerProps) {
  const isBeamCategory = categoryId === "tramy";
  const activeBeamKey = useMemo(() => getBeamVisualKey(quantity), [quantity]);

  useEffect(() => {
    if (!isBeamCategory) {
      preloadImage(imageSrc);
      return;
    }

    BEAM_IMAGE_STACK.forEach((asset) => preloadImage(asset.src));
  }, [imageSrc, isBeamCategory]);

  return (
    <div className="group flex h-full flex-col rounded-3xl border border-[#A86D38]/15 bg-white/80 p-4 shadow-sm backdrop-blur sm:p-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        <h2 className="text-2xl font-black tracking-tight text-[#1E293B]">Náhled objednávky</h2>
        <div className="rounded-full bg-[#F6F4EE] px-3 py-1.5 text-sm font-bold text-[#1E293B] tabular-nums">
          {quantity} ks
        </div>
      </div>

      <div className="relative flex min-h-[320px] flex-1 items-center justify-center overflow-hidden rounded-[1.75rem] border border-[#E8DFD2] bg-[radial-gradient(circle_at_top,#fffdf7_0%,#f7efe0_58%,#efe4d3_100%)] px-5 py-8 transition-all duration-300 group-hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] sm:min-h-[420px]">
        <div
          aria-hidden
          className="absolute inset-x-10 bottom-8 h-8 rounded-full bg-[#6B4A2F]/10 blur-2xl transition-transform duration-300 group-hover:scale-x-110"
        />

        <div className="relative aspect-[16/10] w-full max-w-[44rem]">
          {isBeamCategory ? (
            BEAM_IMAGE_STACK.map((asset) => (
              <img
                key={asset.key}
                src={asset.src}
                alt={asset.alt}
                loading="eager"
                decoding="async"
                draggable={false}
                className={`absolute inset-0 h-full w-full select-none object-contain drop-shadow-[0_20px_34px_rgba(107,74,47,0.22)] [transform:translateZ(0)] [will-change:opacity] transition-opacity duration-150 ease-out ${
                  activeBeamKey === asset.key ? "opacity-100" : "opacity-0"
                }`}
              />
            ))
          ) : (
            <img
              src={imageSrc}
              alt={imageAlt}
              loading="eager"
              decoding="async"
              draggable={false}
              className="absolute inset-0 h-full w-full select-none object-contain drop-shadow-[0_20px_34px_rgba(107,74,47,0.22)]"
            />
          )}
        </div>
      </div>
    </div>
  );
}
