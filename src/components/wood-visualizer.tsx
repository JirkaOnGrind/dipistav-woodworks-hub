import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ProductIllustration } from "@/components/product-illustrations";
import { getArtworkPreloadSources, resolveArtworkScene } from "@/lib/product-artwork";
import type { ProductVariant } from "@/lib/product-catalog";

type WoodVisualizerProps = {
  categoryId: string;
  imageSrc: string;
  imageAlt: string;
  quantity: number;
  quantityUnitLabel?: string;
  variant?: ProductVariant;
};

type VisualState = {
  signature: string;
  source: string;
  quantity: number;
  variant?: ProductVariant;
};

type VisualLayers = {
  current: VisualState;
  previous?: VisualState;
};

const decodedImages = new Map<string, Promise<boolean>>();
const decodedSources = new Set<string>();

function decodeImage(src: string) {
  if (typeof Image === "undefined" || !src) return Promise.resolve(true);
  if (decodedSources.has(src)) return Promise.resolve(true);

  const cached = decodedImages.get(src);
  if (cached) return cached;

  const promise = new Promise<boolean>((resolve) => {
    const image = new Image();
    image.decoding = "async";
    let settled = false;

    const finish = (success: boolean) => {
      if (settled) return;
      settled = true;
      if (success) decodedSources.add(src);
      resolve(success);
    };

    image.onload = () => {
      if (typeof image.decode !== "function") {
        finish(true);
        return;
      }
      image.decode().then(
        () => finish(true),
        () => finish(false),
      );
    };
    image.onerror = () => finish(false);
    image.src = src;

    if (image.complete) {
      if (image.naturalWidth > 0) image.onload?.(new Event("load"));
      else finish(false);
    }
  });

  decodedImages.set(src, promise);
  return promise;
}

function getVisualState(
  categoryId: string,
  imageSrc: string,
  quantity: number,
  variant?: ProductVariant,
): VisualState {
  if (!variant) {
    return { signature: `fallback:${imageSrc}`, source: imageSrc, quantity };
  }

  const { scene } = resolveArtworkScene(categoryId, variant, quantity);
  return {
    signature: `${scene.id}:${variant.id}:${scene.source}`,
    source: scene.source || imageSrc,
    quantity,
    variant,
  };
}

export function WoodVisualizer({
  categoryId,
  imageSrc,
  imageAlt,
  quantity,
  quantityUnitLabel = "ks",
  variant,
}: WoodVisualizerProps) {
  const targetVisual = useMemo(
    () => getVisualState(categoryId, imageSrc, quantity, variant),
    [categoryId, imageSrc, quantity, variant],
  );
  const [layers, setLayers] = useState<VisualLayers>({ current: targetVisual });
  const layersRef = useRef(layers);
  const requestIdRef = useRef(0);
  const transitionTimerRef = useRef<number>();
  const [isRecoiling, setIsRecoiling] = useState(false);
  const previousVariantRef = useRef(variant?.id);

  useEffect(() => {
    layersRef.current = layers;
  }, [layers]);

  useEffect(() => {
    const sources = variant ? getArtworkPreloadSources(categoryId, variant, quantity) : [imageSrc];
    for (const source of sources) void decodeImage(source);
  }, [categoryId, imageSrc, quantity, variant]);

  useLayoutEffect(() => {
    const active = layersRef.current.current;
    if (active.signature === targetVisual.signature) {
      if (active.quantity !== targetVisual.quantity || active.variant !== targetVisual.variant) {
        setLayers((current) => ({
          ...current,
          current: targetVisual,
        }));
      }
      return;
    }

    const requestId = ++requestIdRef.current;
    let cancelled = false;

    const commit = () => {
      if (cancelled || requestId !== requestIdRef.current) return;
      if (transitionTimerRef.current !== undefined) {
        window.clearTimeout(transitionTimerRef.current);
      }

      setLayers((current) => ({ previous: current.current, current: targetVisual }));
      transitionTimerRef.current = window.setTimeout(() => {
        if (requestId !== requestIdRef.current) return;
        setLayers((current) => ({ current: current.current }));
        transitionTimerRef.current = undefined;
      }, 220);
    };

    if (decodedSources.has(targetVisual.source)) commit();
    else void decodeImage(targetVisual.source).then((success) => success && commit());

    return () => {
      cancelled = true;
    };
  }, [targetVisual]);

  useEffect(
    () => () => {
      requestIdRef.current += 1;
      if (transitionTimerRef.current !== undefined) {
        window.clearTimeout(transitionTimerRef.current);
      }
    },
    [],
  );

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

  const renderLayer = (visual: VisualState, state: "current" | "previous") => (
    <div
      key={visual.signature}
      aria-hidden={state === "previous" || undefined}
      data-artwork-visual-layer
      data-layer-state={state}
      className={`absolute inset-[4%] drop-shadow-[0_20px_34px_rgba(107,74,47,0.2)] ${
        state === "current" ? "is-current" : "is-previous"
      }`}
    >
      {visual.variant ? (
        <ProductIllustration
          categoryId={categoryId}
          quantity={visual.quantity}
          variant={visual.variant}
          title={`${imageAlt}, ${visual.quantity} ${quantityUnitLabel}`}
        />
      ) : (
        <img
          src={visual.source}
          alt={imageAlt}
          loading="eager"
          fetchPriority="high"
          decoding="async"
          draggable={false}
          className="h-full w-full select-none object-contain"
        />
      )}
    </div>
  );

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
            className="relative h-full min-h-[230px] w-full overflow-hidden sm:min-h-[356px]"
          >
            <div
              data-beam-preview-motion
              className={`relative h-full w-full ${isRecoiling ? "is-recoiling" : ""}`}
            >
              <div data-beam-preview-stage className="absolute inset-0 overflow-hidden">
                {layers.previous && renderLayer(layers.previous, "previous")}
                {renderLayer(layers.current, "current")}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
