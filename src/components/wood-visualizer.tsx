import { useEffect, useMemo, useRef, useState } from "react";

type WoodVisualizerProps = {
  categoryId: string;
  imageSrc: string;
  imageAlt: string;
  quantity: number;
  dimension?: string;
  length?: string;
  option?: string;
};

const BEAM_ASSETS = {
  one: "/images/illustrations/beams/beam-1-500-v2.webp",
  two: "/images/illustrations/beams/beam-2-500-v2.webp",
  three: "/images/illustrations/beams/beam-3-500-v2.webp",
  five: "/images/illustrations/beams/beam-5-500-v2.webp",
  seven: "/images/illustrations/beams/beam-7-500-v2.webp",
  eleven: "/images/illustrations/beams/beam-11-500-v2.webp",
  eighteen: "/images/illustrations/beams/beam-18-500-v2.webp",
} as const;

const BEAM_CHOPPED_ASSETS = {
  one: "/images/illustrations/beams/beam-1-400-v2.webp",
  two: "/images/illustrations/beams/beam-2-400-v2.webp",
  three: "/images/illustrations/beams/beam-3-400-v2.webp",
  five: "/images/illustrations/beams/beam-5-400-v2.webp",
  seven: "/images/illustrations/beams/beam-7-400-v2.webp",
  eleven: "/images/illustrations/beams/beam-11-400-v2.webp",
  eighteen: "/images/illustrations/beams/beam-18-400-v2.webp",
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

type LayerPose = {
  x: number;
  y: number;
  scale: number;
  rotate: number;
  zIndex: number;
};

const PRODUCT_LAYER_PRESETS: Record<number, LayerPose[]> = {
  1: [{ x: 0, y: 0, scale: 0.94, rotate: 0, zIndex: 1 }],
  2: [
    { x: -22, y: 4, scale: 0.68, rotate: -2, zIndex: 1 },
    { x: 22, y: 4, scale: 0.68, rotate: 2, zIndex: 2 },
  ],
  3: [
    { x: -25, y: 12, scale: 0.58, rotate: -3, zIndex: 1 },
    { x: 0, y: -8, scale: 0.64, rotate: 0, zIndex: 3 },
    { x: 25, y: 12, scale: 0.58, rotate: 3, zIndex: 2 },
  ],
  4: [
    { x: -27, y: -8, scale: 0.52, rotate: -3, zIndex: 1 },
    { x: 27, y: -8, scale: 0.52, rotate: 3, zIndex: 2 },
    { x: -14, y: 20, scale: 0.5, rotate: -1, zIndex: 3 },
    { x: 14, y: 20, scale: 0.5, rotate: 1, zIndex: 4 },
  ],
  5: [
    { x: -31, y: 6, scale: 0.45, rotate: -4, zIndex: 1 },
    { x: -16, y: -14, scale: 0.48, rotate: -2, zIndex: 2 },
    { x: 0, y: 14, scale: 0.5, rotate: 0, zIndex: 5 },
    { x: 16, y: -14, scale: 0.48, rotate: 2, zIndex: 3 },
    { x: 31, y: 6, scale: 0.45, rotate: 4, zIndex: 4 },
  ],
};

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

function clampScale(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getProductVisualCount(quantity: number) {
  if (quantity <= 1) return 1;
  if (quantity === 2) return 2;
  if (quantity <= 4) return 3;
  if (quantity <= 8) return 4;
  return 5;
}

function getProductStageTransform({
  categoryId,
  dimension,
  length,
  option,
}: Pick<WoodVisualizerProps, "categoryId" | "dimension" | "length" | "option">) {
  let scale = 1;
  let scaleX = 1;

  if (categoryId === "fosny" && dimension) {
    const [thickness, width] = dimension.split("x").map(Number);
    const crossSection = thickness * width;
    scale = clampScale(0.92 + ((crossSection - 40) / 60) * 0.14, 0.92, 1.06);
  } else if (categoryId === "prkna" && dimension) {
    scale = clampScale(0.92 + ((Number(dimension) - 8) / 6) * 0.14, 0.92, 1.06);
  }

  if (length) {
    const normalizedLength = Number(length) > 1000 ? Number(length) / 10 : Number(length);
    scaleX = clampScale(0.9 + ((normalizedLength - 300) / 200) * 0.18, 0.9, 1.08);
  }

  if (option) {
    if (categoryId === "krajinky") {
      scaleX = option.includes("2m") ? 0.9 : option.includes("4m") ? 1.08 : 1;
    } else if (categoryId === "stipane-drevo") {
      scale = option.startsWith("volne") ? 0.93 : option.startsWith("paleta") ? 1.07 : 1;
    } else if (categoryId === "pelety") {
      scale = option.startsWith("pytel") ? 0.93 : option.startsWith("paleta") ? 1.07 : 1;
    } else if (categoryId === "drivi-na-paletach") {
      scale = option.includes("33cm") ? 0.95 : option.includes("16prm") ? 1.07 : 1;
    }
  }

  return `scale(${scale}) scaleX(${scaleX})`;
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
  option,
}: WoodVisualizerProps) {
  const isBeamCategory = categoryId === "tramy";
  const activeBeamKey = useMemo(() => getBeamVisualKey(quantity), [quantity]);
  const beamRestScale = useMemo(() => getBeamRestScale(dimension), [dimension]);
  const productVisualCount = useMemo(() => getProductVisualCount(quantity), [quantity]);
  const productLayerPoses = PRODUCT_LAYER_PRESETS[productVisualCount];
  const stageTransform = useMemo(
    () =>
      isBeamCategory
        ? `scale(${beamRestScale})`
        : getProductStageTransform({ categoryId, dimension, length, option }),
    [beamRestScale, categoryId, dimension, isBeamCategory, length, option],
  );
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
    option?: string;
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
    const previousSelection = previousSelectionRef.current;
    const nextSelection = { dimension, length, option, quantity };

    if (!previousSelection) {
      previousSelectionRef.current = nextSelection;
      return;
    }

    const primarySelectionChanged =
      previousSelection.dimension !== dimension || previousSelection.option !== option;
    const passiveSelectionChanged =
      previousSelection.length !== length || previousSelection.quantity !== quantity;

    if (primarySelectionChanged) {
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
  }, [dimension, length, option, quantity]);

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
                style={{ transform: stageTransform }}
              >
                {isBeamCategory
                  ? beamImageStack.map((asset) => (
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
                  : Array.from({ length: 5 }, (_, index) => {
                      const pose = productLayerPoses[index];
                      const isVisible = Boolean(pose);

                      return (
                        <img
                          key={index}
                          src={imageSrc}
                          alt={index === 0 ? imageAlt : ""}
                          aria-hidden={index === 0 ? undefined : true}
                          loading="eager"
                          decoding="async"
                          draggable={false}
                          data-product-illustration-layer
                          className="absolute inset-0 h-full w-full max-h-full max-w-full select-none object-contain drop-shadow-[0_20px_34px_rgba(107,74,47,0.2)]"
                          style={{
                            opacity: isVisible ? 1 : 0,
                            transform: pose
                              ? `translate(${pose.x}%, ${pose.y}%) scale(${pose.scale}) rotate(${pose.rotate}deg)`
                              : "translate(0, 8%) scale(0.42)",
                            zIndex: pose?.zIndex ?? 0,
                            transitionDelay: `${index * 24}ms`,
                          }}
                        />
                      );
                    })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
