import { useEffect, useMemo, useRef, useState } from "react";

type WoodVisualizerProps = {
  categoryId: string;
  imageSrc: string;
  imageAlt: string;
  quantity: number;
  dimension?: string;
  length?: string;
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

const BEAM_CHOPPED_ASSETS = {
  one: "/images/widgets/1TramDIPICHOPPED.png",
  two: "/images/widgets/2TramDIPICHOPPED.png",
  three: "/images/widgets/3TramDIPICHOPPED.png",
  five: "/images/widgets/5TramDIPICHOPPED.png",
  seven: "/images/widgets/7TramDIPICHOPPED.webp",
  eleven: "/images/widgets/11TramDIPICHOPPED.webp",
  eighteen: "/images/widgets/18TramDIPICHOPPED.webp",
} as const;

const BEAM_IMAGE_STACK = [
  { alt: "Jeden stavebn\u00ed tr\u00e1m", key: "one", src: BEAM_ASSETS.one },
  { alt: "Dva stavebn\u00ed tr\u00e1my", key: "two", src: BEAM_ASSETS.two },
  {
    alt: "T\u0159i a\u017e \u010dty\u0159i stavebn\u00ed tr\u00e1my",
    key: "three",
    src: BEAM_ASSETS.three,
  },
  {
    alt: "P\u011bt a\u017e \u0161est stavebn\u00edch tr\u00e1m\u016f",
    key: "five",
    src: BEAM_ASSETS.five,
  },
  {
    alt: "Sedm a\u017e deset stavebn\u00edch tr\u00e1m\u016f",
    key: "seven",
    src: BEAM_ASSETS.seven,
  },
  {
    alt: "Jeden\u00e1ct a\u017e patn\u00e1ct stavebn\u00edch tr\u00e1m\u016f",
    key: "eleven",
    src: BEAM_ASSETS.eleven,
  },
  {
    alt: "\u0160estn\u00e1ct a v\u00edce stavebn\u00edch tr\u00e1m\u016f",
    key: "eighteen",
    src: BEAM_ASSETS.eighteen,
  },
] as const;

const BEAM_REST_SCALES: Record<string, number> = {
  "8x8": 0.92,
  "10x10": 0.95,
  "12x12": 0.98,
  "14x14": 1,
  "16x16": 1.04,
  "18x18": 1.04,
  "20x20": 1.08,
};

const RECOIL_DURATION_MS = 420;

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

function getBeamRestScale(dimension?: string) {
  if (!dimension) {
    return 1;
  }

  return BEAM_REST_SCALES[dimension] ?? 1;
}

function getBeamAssetSrc(key: keyof typeof BEAM_ASSETS, length?: string) {
  if (length === "400" && key in BEAM_CHOPPED_ASSETS) {
    return BEAM_CHOPPED_ASSETS[key as keyof typeof BEAM_CHOPPED_ASSETS];
  }

  return BEAM_ASSETS[key];
}

export function WoodVisualizer({
  categoryId,
  imageSrc,
  imageAlt,
  quantity,
  dimension,
  length,
}: WoodVisualizerProps) {
  const isBeamCategory = categoryId === "tramy";
  const activeBeamKey = useMemo(() => getBeamVisualKey(quantity), [quantity]);
  const beamRestScale = useMemo(() => getBeamRestScale(dimension), [dimension]);
  const beamImageStack = useMemo(
    () =>
      BEAM_IMAGE_STACK.map((asset) => ({
        ...asset,
        src: getBeamAssetSrc(asset.key, length),
      })),
    [length],
  );
  const [isRecoiling, setIsRecoiling] = useState(false);
  const recoilFrameRef = useRef<number | null>(null);
  const recoilTimeoutRef = useRef<number | null>(null);
  const previousSelectionRef = useRef<{
    dimension?: string;
    length?: string;
    quantity: number;
  } | null>(null);

  useEffect(() => {
    if (!isBeamCategory) {
      preloadImage(imageSrc);
      return;
    }

    beamImageStack.forEach((asset) => preloadImage(asset.src));
  }, [beamImageStack, imageSrc, isBeamCategory]);

  useEffect(() => {
    return () => {
      if (recoilFrameRef.current != null) {
        window.cancelAnimationFrame(recoilFrameRef.current);
      }

      if (recoilTimeoutRef.current != null) {
        window.clearTimeout(recoilTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isBeamCategory) {
      previousSelectionRef.current = null;
      setIsRecoiling(false);
      return;
    }

    const previousSelection = previousSelectionRef.current;
    const nextSelection = { dimension, length, quantity };

    if (!previousSelection) {
      previousSelectionRef.current = nextSelection;
      return;
    }

    const dimensionChanged = previousSelection.dimension !== dimension;
    const passiveSelectionChanged =
      previousSelection.length !== length || previousSelection.quantity !== quantity;

    if (dimensionChanged) {
      if (recoilFrameRef.current != null) {
        window.cancelAnimationFrame(recoilFrameRef.current);
      }

      if (recoilTimeoutRef.current != null) {
        window.clearTimeout(recoilTimeoutRef.current);
      }

      setIsRecoiling(false);

      recoilFrameRef.current = window.requestAnimationFrame(() => {
        setIsRecoiling(true);
        recoilFrameRef.current = null;

        recoilTimeoutRef.current = window.setTimeout(() => {
          setIsRecoiling(false);
          recoilTimeoutRef.current = null;
        }, RECOIL_DURATION_MS);
      });
    } else if (passiveSelectionChanged) {
      if (recoilFrameRef.current != null) {
        window.cancelAnimationFrame(recoilFrameRef.current);
        recoilFrameRef.current = null;
      }

      if (recoilTimeoutRef.current != null) {
        window.clearTimeout(recoilTimeoutRef.current);
        recoilTimeoutRef.current = null;
      }

      setIsRecoiling(false);
    }

    previousSelectionRef.current = nextSelection;
  }, [dimension, isBeamCategory, length, quantity]);

  return (
    <div className="group flex h-full min-w-0 flex-col rounded-3xl border border-[#A86D38]/15 bg-white/80 p-4 shadow-sm backdrop-blur sm:p-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        <h2 className="text-2xl font-black tracking-tight text-[#1E293B]">
          {"N\u00e1hled objedn\u00e1vky"}
        </h2>
        <div className="rounded-full bg-[#F6F4EE] px-3 py-1.5 text-sm font-bold text-[#1E293B] tabular-nums">
          {quantity} ks
        </div>
      </div>

      <div className="relative flex min-h-[240px] w-full min-w-0 flex-1 items-center justify-center overflow-hidden rounded-[1.75rem] border border-[#E8DFD2] bg-[radial-gradient(circle_at_top,#fffdf7_0%,#f7efe0_58%,#efe4d3_100%)] px-3 py-5 transition-all duration-300 group-hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] sm:min-h-[420px] sm:px-5 sm:py-8">
        <div
          aria-hidden
          className="absolute inset-x-10 bottom-8 h-8 rounded-full bg-[#6B4A2F]/10 blur-2xl transition-transform duration-300 group-hover:scale-x-110"
        />

        <div className="relative w-full max-w-[44rem] min-w-0">
          <div className="relative aspect-[1820/1024] w-full max-h-full max-w-full overflow-hidden">
            <div
              data-beam-preview-motion
              className={`relative h-full w-full max-h-full max-w-full overflow-hidden ${
                isRecoiling ? "is-recoiling" : ""
              }`}
            >
              <div
                data-beam-preview-stage
                className="relative h-full w-full max-h-full max-w-full overflow-hidden"
                style={{ transform: `scale(${beamRestScale})` }}
              >
                {isBeamCategory ? (
                  beamImageStack.map((asset) => (
                    <img
                      key={asset.key}
                      src={asset.src}
                      alt={asset.alt}
                      loading="eager"
                      decoding="async"
                      draggable={false}
                      className={`absolute inset-0 h-full w-full max-h-full max-w-full select-none object-contain drop-shadow-[0_20px_34px_rgba(107,74,47,0.22)] [transform:translateZ(0)] [will-change:opacity] transition-opacity duration-150 ease-out ${
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
                    className="absolute inset-0 h-full w-full max-h-full max-w-full select-none object-contain drop-shadow-[0_20px_34px_rgba(107,74,47,0.22)]"
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
