import { useEffect, useMemo, useRef, useState } from "react";

type WoodVisualizerProps = {
  categoryId: string;
  imageSrc: string;
  quantity: number;
};

type VisualState = {
  flip?: boolean;
  key: string;
  src: string;
};

const TRANSITION_MS = 150;

const BEAM_ASSETS = {
  one: "/images/1TramDIPI_2.png",
  two: "/images/2TramDIPI_3.png",
  three: "/images/3TramDIPI_2.png",
  four: "/images/4TramyDIPI-Photoroom_4.png",
  five: "/images/5TramDIPI_3.png",
  full: "/images/TramyDIPIFinal_3.png",
} as const;

const ALL_BEAM_ASSETS = Object.values(BEAM_ASSETS);

function preloadImage(src: string) {
  const image = new Image();
  image.src = src;
}

function getBeamVisual(quantity: number): VisualState {
  if (quantity <= 1) {
    return { key: "beam-1", src: BEAM_ASSETS.one };
  }

  if (quantity === 2) {
    return { key: "beam-2", src: BEAM_ASSETS.two };
  }

  if (quantity === 3) {
    return { key: "beam-3", src: BEAM_ASSETS.three };
  }

  if (quantity === 4) {
    return { key: "beam-4", src: BEAM_ASSETS.four };
  }

  if (quantity <= 9) {
    return { key: "beam-5-9", src: BEAM_ASSETS.five };
  }

  return { flip: true, key: "beam-10-plus", src: BEAM_ASSETS.full };
}

function getGenericVisual(imageSrc: string): VisualState {
  return { key: `generic-${imageSrc}`, src: imageSrc };
}

function getVisual(categoryId: string, imageSrc: string, quantity: number) {
  if (categoryId === "tramy") {
    return getBeamVisual(quantity);
  }

  return getGenericVisual(imageSrc);
}

export function WoodVisualizer({ categoryId, imageSrc, quantity }: WoodVisualizerProps) {
  const mappedVisual = useMemo(
    () => getVisual(categoryId, imageSrc, quantity),
    [categoryId, imageSrc, quantity],
  );

  const [currentVisual, setCurrentVisual] = useState<VisualState>(mappedVisual);
  const [previousVisual, setPreviousVisual] = useState<VisualState | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const transitionTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (categoryId === "tramy") {
      ALL_BEAM_ASSETS.forEach(preloadImage);
    }

    preloadImage(imageSrc);
  }, [categoryId, imageSrc]);

  useEffect(() => {
    if (mappedVisual.key === currentVisual.key) {
      return;
    }

    if (transitionTimerRef.current !== null) {
      window.clearTimeout(transitionTimerRef.current);
    }

    setPreviousVisual(currentVisual);
    setCurrentVisual(mappedVisual);
    setIsTransitioning(true);

    const frame = window.requestAnimationFrame(() => {
      setIsTransitioning(false);
    });

    transitionTimerRef.current = window.setTimeout(() => {
      setPreviousVisual(null);
      transitionTimerRef.current = null;
    }, TRANSITION_MS);

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [currentVisual, mappedVisual]);

  useEffect(() => {
    return () => {
      if (transitionTimerRef.current !== null) {
        window.clearTimeout(transitionTimerRef.current);
      }
    };
  }, []);

  const visualSurfaceClass = currentVisual.flip || previousVisual?.flip ? "scale-x-[-1]" : "";

  return (
    <div className="group rounded-[2rem] border border-[#A86D38]/15 bg-[linear-gradient(180deg,#fffdf8_0%,#f5f2e9_100%)] p-4 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_20px_45px_rgba(107,74,47,0.10)] sm:p-6">
      <div className="relative flex h-[280px] items-center justify-center overflow-hidden rounded-[1.75rem] border border-white/80 bg-[radial-gradient(circle_at_top,#fefcf6_0%,#f3ead9_58%,#eadfce_100%)] px-5 py-8 transition-all duration-300 sm:h-[360px]">
        <div
          aria-hidden
          className="absolute inset-x-10 bottom-7 h-8 rounded-full bg-[#6B4A2F]/12 blur-2xl transition-transform duration-300 group-hover:scale-x-105"
        />

        <div
          className={`relative flex h-full w-full items-center justify-center ${visualSurfaceClass}`}
        >
          {previousVisual ? (
            <img
              src={previousVisual.src}
              alt=""
              loading="eager"
              draggable={false}
              className={`absolute max-h-[210px] w-auto select-none object-contain drop-shadow-[0_18px_28px_rgba(107,74,47,0.24)] transition-opacity duration-150 ease-out sm:max-h-[260px] ${
                isTransitioning ? "opacity-100" : "opacity-0"
              }`}
            />
          ) : null}

          <img
            key={currentVisual.key}
            src={currentVisual.src}
            alt=""
            loading="eager"
            draggable={false}
            className={`absolute max-h-[210px] w-auto select-none object-contain drop-shadow-[0_18px_28px_rgba(107,74,47,0.24)] transition-opacity duration-150 ease-out sm:max-h-[260px] ${
              isTransitioning ? "opacity-0" : "opacity-100"
            }`}
          />
        </div>
      </div>
    </div>
  );
}
