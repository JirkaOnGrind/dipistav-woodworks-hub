import { useEffect, useMemo, useState } from "react";

type WoodVisualizerProps = {
  categoryId: string;
  imageSrc: string;
  quantity: number;
};

const BEAM_ASSETS = {
  single: "/images/beam-single-stack.png",
  four: "/images/beam-four-stack.png",
  full: "/images/beam-full-stack.png",
} as const;

function preloadImage(src: string) {
  const image = new Image();
  image.src = src;
}

function getVisualMode(categoryId: string, quantity: number) {
  if (categoryId !== "tramy") {
    return "generic";
  }

  if (quantity >= 10) {
    return "full";
  }

  if (quantity >= 4) {
    return "four";
  }

  return "single";
}

function getVisualLayers(quantity: number) {
  if (quantity >= 10) {
    return [{ key: "full-0", src: BEAM_ASSETS.full, className: "z-20", style: {} }];
  }

  if (quantity >= 8) {
    return [
      {
        key: "four-back",
        src: BEAM_ASSETS.four,
        className: "z-10 opacity-85",
        style: { transform: "translate(-46%, 8%) scale(0.96)" },
      },
      {
        key: "four-front",
        src: BEAM_ASSETS.four,
        className: "z-20",
        style: { transform: "translate(-54%, -2%) scale(1)" },
      },
    ];
  }

  if (quantity >= 4) {
    return [
      {
        key: "four-0",
        src: BEAM_ASSETS.four,
        className: "z-20",
        style: { transform: "translate(-50%, 0%) scale(1)" },
      },
    ];
  }

  return Array.from({ length: quantity }, (_, index) => {
    const offsets = [
      { x: -50, y: 0, scale: 1, z: 20 },
      { x: -46, y: 10, scale: 0.985, z: 15 },
      { x: -42, y: 20, scale: 0.97, z: 10 },
    ];
    const offset = offsets[index] ?? offsets[offsets.length - 1];

    return {
      key: `single-${index}`,
      src: BEAM_ASSETS.single,
      className: "",
      style: {
        transform: `translate(${offset.x}%, ${offset.y}%) scale(${offset.scale})`,
        zIndex: offset.z,
      },
    };
  });
}

export function WoodVisualizer({ categoryId, imageSrc, quantity }: WoodVisualizerProps) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    preloadImage(BEAM_ASSETS.single);
    preloadImage(BEAM_ASSETS.four);
    preloadImage(BEAM_ASSETS.full);
    preloadImage(imageSrc);
    setIsReady(true);
  }, [imageSrc]);

  const visualMode = getVisualMode(categoryId, quantity);
  const layers = useMemo(() => {
    if (visualMode === "generic") {
      return [
        {
          key: "generic",
          src: imageSrc,
          className: "z-20",
          style: { transform: "translate(-50%, 0%) scale(1)" },
        },
      ];
    }

    return getVisualLayers(quantity);
  }, [imageSrc, quantity, visualMode]);

  const overflowBadge = quantity > 10 ? `+${quantity - 10} ks` : null;

  return (
    <div className="group rounded-[2rem] border border-[#A86D38]/15 bg-[linear-gradient(180deg,#fffdf8_0%,#f5f2e9_100%)] p-4 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_20px_45px_rgba(107,74,47,0.10)] sm:p-6">
      <div className="relative flex h-[280px] items-end justify-center overflow-hidden rounded-[1.75rem] border border-white/80 bg-[radial-gradient(circle_at_top,#fefcf6_0%,#f3ead9_58%,#eadfce_100%)] px-4 pb-6 pt-8 transition-all duration-300 sm:h-[360px]">
        <div
          aria-hidden
          className="absolute inset-x-8 bottom-6 h-8 rounded-full bg-[#6B4A2F]/15 blur-2xl transition-transform duration-300 group-hover:scale-x-105"
        />
        <div
          className={`absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.28),rgba(255,255,255,0))] transition-opacity duration-300 ${
            isReady ? "opacity-100" : "opacity-0"
          }`}
        />

        {layers.map((layer) => (
          <div
            key={layer.key}
            className={`absolute bottom-8 left-1/2 transition-all duration-300 ease-out ${layer.className}`}
            style={layer.style}
          >
            <img
              src={layer.src}
              alt=""
              loading="eager"
              draggable={false}
              className="max-h-[210px] w-auto select-none object-contain drop-shadow-[0_18px_28px_rgba(107,74,47,0.24)] transition-all duration-300 ease-out sm:max-h-[260px]"
            />
          </div>
        ))}

        {overflowBadge ? (
          <div className="absolute right-5 top-5 rounded-full bg-[#234A33] px-3 py-1.5 text-xs font-black text-white shadow-lg">
            {overflowBadge}
          </div>
        ) : null}
      </div>
    </div>
  );
}
