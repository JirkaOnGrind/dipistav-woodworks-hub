import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ProductIllustration } from "@/components/product-illustrations";
import {
  getProductArtworkSources,
  getSellingUnitCount,
  resolveProductArtwork,
} from "@/lib/product-artwork";
import type { ProductVariant } from "@/lib/product-catalog";

type WoodVisualizerProps = {
  categoryId: string;
  imageSrc: string;
  imageAlt: string;
  quantity: number;
  quantityUnitLabel?: string;
  variant?: ProductVariant;
};

const BEAM_ASSETS = {
  one: "/images/illustrations/configurator-v4/beam-1-v4.webp",
  two: "/images/illustrations/configurator-v4/beam-2-v4.webp",
  three: "/images/illustrations/configurator-v4/beam-3-v4.webp",
  five: "/images/illustrations/golden-masters/beam-bundle-6-seams-master-v2.webp",
  eleven: "/images/illustrations/configurator-v4/beam-12-v4.webp",
  eighteen: "/images/illustrations/configurator-v7/beam-16-seams-v7.webp",
} as const;

const BEAM_ALT = {
  one: "Jeden stavební trám",
  two: "Dva stavební trámy",
  three: "Tři až čtyři stavební trámy",
  five: "Pět až deset stavebních trámů",
  eleven: "Jedenáct až patnáct stavebních trámů",
  eighteen: "Šestnáct a více stavebních trámů",
} as const;

type BeamKey = keyof typeof BEAM_ASSETS;

type VisualState = {
  signature: string;
  source: string;
  quantity: number;
  beamKey?: BeamKey;
  variant?: ProductVariant;
};

const decodedImages = new Map<string, Promise<void>>();
const decodedSources = new Set<string>();

function decodeImage(src: string) {
  if (typeof Image === "undefined" || !src) return Promise.resolve();

  const cached = decodedImages.get(src);
  if (cached) return cached;

  const promise = new Promise<void>((resolve) => {
    const image = new Image();
    image.decoding = "async";
    let settled = false;

    const finish = () => {
      if (settled) return;
      settled = true;
      if (typeof image.decode === "function") {
        image
          .decode()
          .catch(() => undefined)
          .finally(() => {
            decodedSources.add(src);
            resolve();
          });
      } else {
        decodedSources.add(src);
        resolve();
      }
    };

    image.onload = finish;
    image.onerror = () => resolve();
    image.src = src;

    if (image.complete) finish();
  });

  decodedImages.set(src, promise);
  return promise;
}

function getBeamVisualKey(quantity: number): BeamKey {
  if (quantity <= 1) return "one";
  if (quantity === 2) return "two";
  if (quantity <= 4) return "three";
  if (quantity <= 10) return "five";
  if (quantity <= 15) return "eleven";
  return "eighteen";
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getBeamTransform(variant?: ProductVariant, beamKey?: BeamKey) {
  const width = variant?.dimensions?.widthMm ?? 140;
  const height = variant?.dimensions?.heightMm ?? width;
  const lengthMm = variant?.dimensions?.lengthMm ?? 5000;
  const areaScale = clamp(Math.sqrt((width * height) / (140 * 140)), 0.88, 1.12);
  const ratio = width / height;
  const profileX = clamp(Math.sqrt(ratio), 0.9, 1.1);
  const profileY = clamp(1 / Math.sqrt(ratio), 0.9, 1.1);
  const lengthScale =
    ({ 4000: 0.82, 5000: 1, 6000: 1.1, 7000: 1.18 } as Record<number, number>)[lengthMm] ?? 1;
  const scaleX = clamp(areaScale * lengthScale * profileX, 0.78, 1.18);
  const scaleY = clamp(areaScale * profileY, 0.82, 1.16);
  const positionCorrection: Record<BeamKey, { x: number; y: number }> = {
    one: { x: 0.25, y: 1.55 },
    two: { x: -0.45, y: 1.4 },
    three: { x: 0.8, y: -0.55 },
    five: { x: 0, y: 0.3 },
    eleven: { x: 2.95, y: -2.5 },
    eighteen: { x: 0.8, y: -1.45 },
  };
  const correction = positionCorrection[beamKey ?? "one"];
  return `translate(${correction.x}%, ${correction.y}%) scaleX(${scaleX}) scaleY(${scaleY})`;
}

function getVisualState(
  categoryId: string,
  imageSrc: string,
  quantity: number,
  variant?: ProductVariant,
): VisualState {
  if (categoryId === "tramy") {
    const beamKey = getBeamVisualKey(quantity);
    const source = BEAM_ASSETS[beamKey];
    return { signature: `beam:${beamKey}`, source, quantity, beamKey, variant };
  }

  if (variant) {
    const artwork = resolveProductArtwork(categoryId, variant, quantity);
    const visualKey =
      artwork.kind === "selling-unit"
        ? getSellingUnitCount(quantity, variant.illustrationVariant)
        : artwork.kind === "composition"
          ? variant.illustrationVariant.startsWith("slabs-") && quantity >= 9
            ? "expanded-composition"
            : "composition"
          : artwork.key;
    return {
      signature: `${variant.id}:${artwork.source}:${visualKey}`,
      source: artwork.source || imageSrc,
      quantity,
      variant,
    };
  }

  return { signature: `fallback:${imageSrc}`, source: imageSrc, quantity };
}

export function WoodVisualizer({
  categoryId,
  imageSrc,
  imageAlt,
  quantity,
  quantityUnitLabel = "ks",
  variant,
}: WoodVisualizerProps) {
  const isBeam = categoryId === "tramy";
  const isTimberArtwork = categoryId === "fosny" || categoryId === "prkna" || categoryId === "late";
  const targetVisual = useMemo(
    () => getVisualState(categoryId, imageSrc, quantity, variant),
    [categoryId, imageSrc, quantity, variant],
  );
  const [displayedVisual, setDisplayedVisual] = useState(targetVisual);
  const beamTransform = useMemo(
    () => getBeamTransform(variant, displayedVisual.beamKey),
    [displayedVisual.beamKey, variant],
  );
  const [isRecoiling, setIsRecoiling] = useState(false);
  const previousVariantRef = useRef(variant?.id);

  useEffect(() => {
    const sources = isBeam
      ? Object.values(BEAM_ASSETS)
      : variant
        ? getProductArtworkSources(categoryId, variant)
        : [imageSrc];

    void Promise.all(sources.map((source) => decodeImage(source)));
  }, [categoryId, imageSrc, isBeam, variant]);

  useLayoutEffect(() => {
    if (displayedVisual.signature === targetVisual.signature) {
      if (
        displayedVisual.quantity !== targetVisual.quantity ||
        displayedVisual.variant !== targetVisual.variant
      ) {
        setDisplayedVisual(targetVisual);
      }
      return;
    }

    let cancelled = false;
    if (decodedSources.has(targetVisual.source)) {
      setDisplayedVisual(targetVisual);
      return;
    }

    decodeImage(targetVisual.source).then(() => {
      if (cancelled) return;
      setDisplayedVisual(targetVisual);
    });

    return () => {
      cancelled = true;
    };
  }, [displayedVisual, targetVisual]);

  useEffect(() => {
    if (previousVariantRef.current === variant?.id) return;
    previousVariantRef.current = variant?.id;
    setIsRecoiling(false);
    const frame = window.requestAnimationFrame(() => setIsRecoiling(true));
    const timeout = window.setTimeout(() => setIsRecoiling(false), 420);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timeout);
    };
  }, [variant?.id]);

  return (
    <div className="group flex h-full min-w-0 flex-col rounded-3xl border border-[#A86D38]/15 bg-white/86 p-4 shadow-[0_18px_50px_rgba(30,58,43,0.07)] backdrop-blur sm:p-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        <h2 className="text-2xl font-black tracking-tight text-[#1E293B]">Náhled objednávky</h2>
        <div className="rounded-full bg-[#F6F4EE] px-3 py-1.5 text-sm font-bold text-[#1E293B] tabular-nums">
          {quantity} {quantityUnitLabel}
        </div>
      </div>

      <div
        data-beam-preview
        className="relative flex min-h-[270px] w-full min-w-0 flex-1 items-center justify-center overflow-hidden rounded-[1.75rem] border border-[#E8DFD2] bg-[#F8F1E5] px-3 py-5 sm:min-h-[420px] sm:px-5 sm:py-8"
      >
        <div
          aria-hidden
          className="absolute inset-x-10 bottom-8 h-8 rounded-full bg-[#6B4A2F]/10 blur-2xl"
        />
        <div className="relative w-full max-w-[44rem] min-w-0 self-stretch">
          <div
            data-beam-preview-frame
            className="relative h-full min-h-[230px] w-full overflow-visible sm:min-h-[356px]"
          >
            <div
              data-beam-preview-motion
              className={`relative h-full w-full ${isRecoiling ? "is-recoiling" : ""}`}
            >
              {isBeam && displayedVisual.beamKey ? (
                <div
                  data-beam-preview-stage
                  className="absolute inset-[8%] transition-transform duration-300"
                  style={{
                    transform: beamTransform,
                    filter:
                      displayedVisual.beamKey === "eleven" || displayedVisual.beamKey === "eighteen"
                        ? "saturate(0.93) brightness(1.02) contrast(1.01)"
                        : undefined,
                  }}
                >
                  <img
                    key={displayedVisual.signature}
                    src={displayedVisual.source}
                    alt={BEAM_ALT[displayedVisual.beamKey]}
                    loading="eager"
                    fetchPriority="high"
                    decoding="async"
                    draggable={false}
                    className="absolute inset-0 h-full w-full select-none object-contain drop-shadow-[0_20px_34px_rgba(107,74,47,0.22)]"
                  />
                </div>
              ) : displayedVisual.variant ? (
                <div
                  key={displayedVisual.signature}
                  data-product-illustration-layer
                  className={`${isTimberArtwork ? "absolute inset-[10%]" : "absolute inset-[4%]"} drop-shadow-[0_20px_34px_rgba(107,74,47,0.2)]`}
                >
                  <ProductIllustration
                    categoryId={categoryId}
                    quantity={displayedVisual.quantity}
                    variant={displayedVisual.variant}
                    title={`${imageAlt}, ${displayedVisual.quantity} ${quantityUnitLabel}`}
                  />
                </div>
              ) : (
                <img
                  src={displayedVisual.source}
                  alt={imageAlt}
                  loading="eager"
                  fetchPriority="high"
                  decoding="async"
                  className="absolute inset-[4%] h-[92%] w-[92%] object-contain"
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
