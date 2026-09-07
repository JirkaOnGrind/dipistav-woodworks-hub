import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { ProductIllustration } from "@/components/product-illustrations";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { getArtworkInteractionMotion } from "@/lib/artwork-interaction-motion";
import { getFirewoodBackground } from "@/lib/firewood-artwork";
import { setMediaViewMode, useMediaViewMode, type MediaViewMode } from "@/lib/media-view-mode";
import { getArtworkPreloadSources, resolveArtworkScene } from "@/lib/product-artwork";
import type { ResponsiveArtworkSource } from "@/lib/product-artwork";
import type { ProductVariant } from "@/lib/product-catalog";
import { cn } from "@/lib/utils";
import { getVisualizationLimitMessage } from "@/lib/visualization-limits";

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
  responsiveSources?: readonly ResponsiveArtworkSource[];
  responsiveSizes?: string;
  quantity: number;
  variant?: ProductVariant;
};

type VisualLayers = {
  current: VisualState;
  previous?: VisualState;
};

const decodedImages = new Map<string, Promise<boolean>>();
const decodedSources = new Set<string>();
const GALLERY_ITEMS = [1, 2, 3, 4] as const;

// Leave vertical gestures to the page; only horizontal gestures change photos.
function useGallerySwipe(onNavigate: (direction: number) => void) {
  const start = useRef<{ x: number; y: number } | null>(null);
  const moved = useRef(false);
  const [offset, setOffset] = useState(0);
  return {
    style: { touchAction: "pan-y" } as CSSProperties,
    onTouchStart: (event: React.TouchEvent) => {
      const touch = event.touches[0];
      start.current = { x: touch.clientX, y: touch.clientY };
      moved.current = false;
    },
    onTouchMove: (event: React.TouchEvent) => {
      if (!start.current) return;
      const dx = event.touches[0].clientX - start.current.x;
      const dy = event.touches[0].clientY - start.current.y;
      if (Math.abs(dx) > 8 || Math.abs(dy) > 8) moved.current = true;
      if (Math.abs(dx) > Math.abs(dy)) setOffset(dx * 0.4);
    },
    onTouchEnd: (event: React.TouchEvent) => {
      if (!start.current) return;
      const dx = event.changedTouches[0].clientX - start.current.x;
      const dy = event.changedTouches[0].clientY - start.current.y;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) onNavigate(dx < 0 ? 1 : -1);
      start.current = null;
      setOffset(0);
    },
    onTouchCancel: () => {
      start.current = null;
      setOffset(0);
    },
    onClickCapture: (event: React.MouseEvent) => {
      if (moved.current) {
        event.preventDefault();
        event.stopPropagation();
        moved.current = false;
      }
    },
    offset,
  };
}

function galleryLabel(item: (typeof GALLERY_ITEMS)[number]) {
  return `${item}: sem bude přidaná fotka`;
}

function GalleryPlaceholder({
  item,
  className,
}: {
  item: (typeof GALLERY_ITEMS)[number];
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex size-full items-center justify-center bg-stone-200 p-3 text-center text-sm font-bold leading-5 text-stone-700",
        className,
      )}
    >
      {galleryLabel(item)}
    </div>
  );
}

function GalleryLightbox({
  item,
  open,
  onOpenChange,
  onNavigate,
  onSelect,
  onCloseAutoFocus,
}: {
  item: (typeof GALLERY_ITEMS)[number];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigate: (direction: number) => void;
  onSelect: (item: (typeof GALLERY_ITEMS)[number]) => void;
  onCloseAutoFocus: (event: Event) => void;
}) {
  const { offset, ...swipe } = useGallerySwipe(onNavigate);
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open ? (
          <DialogPrimitive.Portal forceMount>
            <DialogPrimitive.Overlay asChild forceMount>
              <motion.div
                className="fixed inset-0 z-50 bg-[#1E293B]/35 backdrop-blur-md"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
              />
            </DialogPrimitive.Overlay>

            <DialogPrimitive.Content asChild forceMount onCloseAutoFocus={onCloseAutoFocus}>
              <motion.section
                data-gallery-modal
                aria-describedby="product-gallery-lightbox-description"
                className="fixed left-1/2 top-1/2 z-50 h-[65dvh] w-[92vw] overflow-hidden rounded-3xl bg-[#FFFFFF] shadow-[0_32px_100px_rgba(30,41,59,0.3)] focus:outline-none detail-desktop:w-[65vw]"
                onKeyDown={(event) => {
                  if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
                    event.preventDefault();
                    onNavigate(event.key === "ArrowLeft" ? -1 : 1);
                  }
                }}
                initial={{ opacity: 0, scale: 0.94, x: "-50%", y: "-48%" }}
                animate={{ opacity: 1, scale: 1, x: "-50%", y: "-50%" }}
                exit={{ opacity: 0, scale: 0.96, x: "-50%", y: "-48%" }}
                transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
              >
                <DialogPrimitive.Title className="sr-only">
                  Fotografie produktu {item}
                </DialogPrimitive.Title>
                <DialogPrimitive.Description
                  id="product-gallery-lightbox-description"
                  className="sr-only"
                >
                  Zvětšený náhled vybrané fotografie produktu.
                </DialogPrimitive.Description>

                <div className="gallery-modal-image" {...swipe}>
                  <div className="size-full" style={{ transform: `translateX(${offset}px)` }}>
                    <GalleryPlaceholder
                      item={item}
                      className="bg-white px-16 text-base sm:px-24 sm:text-xl"
                    />
                  </div>
                </div>
                <div className="gallery-modal-counter" aria-live="polite">
                  {item} / {GALLERY_ITEMS.length}
                </div>
                <div className="gallery-modal-thumbnails" aria-label="Fotografie produktu">
                  {GALLERY_ITEMS.map((photo) => (
                    <button
                      key={photo}
                      type="button"
                      aria-label={`Vybrat fotografii ${photo}`}
                      aria-pressed={item === photo}
                      onClick={() => onSelect(photo)}
                      className="size-20 shrink-0 overflow-hidden rounded-lg border-2 border-transparent aria-pressed:border-[#A86D38]"
                    >
                      <GalleryPlaceholder item={photo} className="text-[10px]" />
                    </button>
                  ))}
                </div>

                {([-1, 1] as const).map((direction) => (
                  <Button
                    key={direction}
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={direction === -1 ? "Předchozí fotografie" : "Další fotografie"}
                    onClick={() => onNavigate(direction)}
                    className={cn(
                      "absolute top-1/2 size-12 -translate-y-1/2 rounded-full border-2 border-[#A66B38]/60 bg-[#FFFFFF] text-[#A66B38] transition-all duration-150 hover:scale-110 hover:bg-[#A66B38] hover:text-white hover:shadow-lg active:scale-95 focus-visible:ring-[#A66B38]",
                      direction === -1 ? "left-3 sm:left-5" : "right-3 sm:right-5",
                    )}
                  >
                    {direction === -1 ? <ChevronLeft /> : <ChevronRight />}
                  </Button>
                ))}

                <DialogPrimitive.Close asChild>
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    aria-label="Zavřít zvětšenou fotografii"
                    className="absolute right-3 top-3 size-12 rounded-full border-2 border-[#A66B38]/60 bg-[#FFFFFF] text-[#A66B38] transition-all duration-150 hover:scale-110 hover:bg-[#A66B38] hover:text-white hover:shadow-lg active:scale-95 focus-visible:ring-[#A66B38] sm:right-5 sm:top-5"
                  >
                    <X />
                  </Button>
                </DialogPrimitive.Close>
              </motion.section>
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        ) : null}
      </AnimatePresence>
    </DialogPrimitive.Root>
  );
}

function ProductGallery() {
  const [selectedItem, setSelectedItem] = useState<(typeof GALLERY_ITEMS)[number]>(1);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const navigate = (direction: number) => {
    setSelectedItem((current) => {
      const index = GALLERY_ITEMS.indexOf(current);
      return GALLERY_ITEMS[(index + direction + GALLERY_ITEMS.length) % GALLERY_ITEMS.length];
    });
  };
  const { offset, ...swipe } = useGallerySwipe(navigate);

  return (
    <div className="flex min-h-0 min-w-0 flex-col gap-3 detail-desktop:h-full" data-product-gallery>
      <button
        ref={triggerRef}
        {...swipe}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
            event.preventDefault();
            navigate(event.key === "ArrowLeft" ? -1 : 1);
          }
        }}
        type="button"
        onClick={() => setLightboxOpen(true)}
        aria-label={`Otevřít fotografii ${selectedItem} v celé velikosti`}
        className="group/main aspect-[4/3] min-h-0 w-full overflow-hidden rounded-2xl border border-stone-300 bg-stone-200 text-left shadow-inner outline-none transition focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 sm:rounded-[1.75rem] detail-desktop:aspect-auto detail-desktop:flex-1"
      >
        <div className="size-full" style={{ transform: `translateX(${offset}px)` }}>
          <GalleryPlaceholder
            item={selectedItem}
            className="transition duration-200 group-hover/main:bg-stone-300 sm:text-base"
          />
        </div>
      </button>

      <div
        className="flex min-w-0 shrink-0 gap-3 overflow-x-auto pb-1 detail-desktop:grid detail-desktop:h-[clamp(3rem,10dvh,6rem)] detail-desktop:grid-cols-4 detail-desktop:overflow-visible"
        aria-label="Fotografie produktu"
      >
        {GALLERY_ITEMS.map((item) => {
          const isActive = item === selectedItem;
          return (
            <button
              key={item}
              type="button"
              aria-label={`Vybrat fotografii ${item}`}
              aria-pressed={isActive}
              onClick={() => setSelectedItem(item)}
              className={cn(
                "aspect-square w-[clamp(4.75rem,22vw,7rem)] shrink-0 overflow-hidden rounded-xl outline-none transition duration-200 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 detail-desktop:aspect-auto detail-desktop:h-full detail-desktop:w-auto",
                isActive
                  ? "border-4 border-primary opacity-100"
                  : "border-2 border-transparent opacity-60 hover:opacity-100",
              )}
            >
              <GalleryPlaceholder item={item} className="text-[10px] leading-4 sm:text-xs" />
            </button>
          );
        })}
      </div>

      <GalleryLightbox
        item={selectedItem}
        open={lightboxOpen}
        onOpenChange={setLightboxOpen}
        onNavigate={navigate}
        onSelect={setSelectedItem}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          triggerRef.current?.focus();
        }}
      />
    </div>
  );
}

function getDecodeRequest(visual: VisualState | string) {
  if (typeof visual === "string") return { src: visual, cacheKey: visual };
  const srcSet = visual.responsiveSources
    ?.map(({ source, width }) => `${source} ${width}w`)
    .join(", ");
  return {
    src: visual.source,
    srcSet,
    sizes: srcSet ? visual.responsiveSizes : undefined,
    cacheKey: [visual.source, srcSet, visual.responsiveSizes].filter(Boolean).join("|"),
  };
}

function decodeImage(visual: VisualState | string) {
  const { src, srcSet, sizes, cacheKey } = getDecodeRequest(visual);
  if (typeof Image === "undefined" || !src) return Promise.resolve(true);
  if (decodedSources.has(cacheKey)) return Promise.resolve(true);

  const cached = decodedImages.get(cacheKey);
  if (cached) return cached;

  const promise = new Promise<boolean>((resolve) => {
    const image = new Image();
    image.decoding = "async";
    let settled = false;

    const finish = (success: boolean) => {
      if (settled) return;
      settled = true;
      if (success) decodedSources.add(cacheKey);
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
    if (srcSet) image.srcset = srcSet;
    if (sizes) image.sizes = sizes;
    image.src = src;

    if (image.complete) {
      if (image.naturalWidth > 0) image.onload?.(new Event("load"));
      else finish(false);
    }
  });

  decodedImages.set(cacheKey, promise);
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
    responsiveSources: scene.responsiveSources,
    responsiveSizes: scene.responsiveSizes,
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
  const mediaViewMode = useMediaViewMode();
  const limitMessage = getVisualizationLimitMessage(categoryId, variant, quantity);
  const interactionMotion = getArtworkInteractionMotion(categoryId, variant);
  const interactionStyle = {
    "--artwork-interaction-scale-x": interactionMotion.scaleX,
    "--artwork-interaction-scale-y": interactionMotion.scaleY,
  } as CSSProperties;
  const targetVisual = useMemo(
    () => getVisualState(categoryId, imageSrc, quantity, variant),
    [categoryId, imageSrc, quantity, variant],
  );
  const [layers, setLayers] = useState<VisualLayers>({ current: targetVisual });
  const layersRef = useRef(layers);
  const requestIdRef = useRef(0);
  const transitionTimerRef = useRef<number | undefined>(undefined);
  const [isRecoiling, setIsRecoiling] = useState(false);
  const previousVariantRef = useRef(variant?.id);

  useEffect(() => {
    layersRef.current = layers;
  }, [layers]);

  useEffect(() => {
    if (targetVisual.responsiveSources) {
      void decodeImage(targetVisual);
      return;
    }
    const sources = variant ? getArtworkPreloadSources(categoryId, variant, quantity) : [imageSrc];
    for (const source of sources) void decodeImage(source);
  }, [categoryId, imageSrc, quantity, targetVisual, variant]);

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

    if (decodedSources.has(getDecodeRequest(targetVisual).cacheKey)) commit();
    else void decodeImage(targetVisual).then((success) => success && commit());

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
      className={`absolute inset-[4%] ${visual.variant?.illustrationVariant === "firewood-loose" ? "" : "drop-shadow-[0_20px_34px_rgba(107,74,47,0.2)]"} ${
        state === "current" ? "is-current" : "is-previous"
      }`}
    >
      {visual.variant ? (
        <ProductIllustration
          categoryId={categoryId}
          quantity={visual.quantity}
          variant={visual.variant}
          title={`${imageAlt}, ${visual.quantity} ${quantityUnitLabel}`}
          imageLoading={state === "current" ? "eager" : "lazy"}
          fetchPriority={state === "current" ? "high" : "low"}
        />
      ) : (
        <img
          src={visual.source}
          alt={imageAlt}
          loading="eager"
          fetchPriority="high"
          decoding="async"
          draggable={false}
          className="h-full max-h-full w-full select-none object-contain"
        />
      )}
    </div>
  );

  const changeMediaViewMode = (mode: string) => {
    if (mode) setMediaViewMode(mode as MediaViewMode);
  };

  return (
    <div
      data-product-media-viewer
      className="group flex h-full min-h-0 min-w-0 flex-col rounded-3xl border border-[#A86D38]/15 bg-white/86 p-4 shadow-[0_18px_50px_rgba(30,58,43,0.07)] backdrop-blur detail-desktop:max-h-[100dvh]"
    >
      <div data-media-toolbar className="mb-3 flex shrink-0 items-center justify-between gap-3">
        <ToggleGroup
          type="single"
          value={mediaViewMode}
          onValueChange={changeMediaViewMode}
          aria-label="Způsob zobrazení produktu"
          className="hidden grid-cols-2 rounded-full bg-muted p-1 detail-desktop:grid"
        >
          <ToggleGroupItem
            value="visualization"
            className="h-10 min-w-28 rounded-full px-4 text-sm font-bold text-muted-foreground data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
          >
            Vizualizace
          </ToggleGroupItem>
          <ToggleGroupItem
            value="gallery"
            className="h-10 min-w-28 rounded-full px-4 text-sm font-bold text-muted-foreground data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
          >
            Galerie
          </ToggleGroupItem>
        </ToggleGroup>
        <div
          data-media-quantity
          className="ml-auto shrink-0 rounded-full bg-[#F6F4EE] px-3 py-1.5 text-sm font-bold text-[#1E293B] tabular-nums"
        >
          {quantity} {quantityUnitLabel}
        </div>
      </div>

      <div
        data-gallery-container
        className={cn(
          "min-h-0 min-w-0 flex-1",
          mediaViewMode === "gallery" ? "block" : "detail-desktop:hidden",
        )}
      >
        <ProductGallery />
      </div>

      <div
        data-beam-preview
        style={
          layers.current.variant?.illustrationVariant === "firewood-loose"
            ? { backgroundColor: getFirewoodBackground(layers.current.quantity) }
            : undefined
        }
        className={cn(
          "relative min-h-0 w-full min-w-0 flex-1 items-center justify-center overflow-hidden rounded-[1.75rem] border border-[#E8DFD2] bg-[#F8F1E5] [&_img]:max-h-full [&_img]:object-contain",
          mediaViewMode === "visualization" ? "hidden detail-desktop:flex" : "hidden",
        )}
      >
        <div
          aria-hidden
          className={cn(
            "absolute inset-x-10 bottom-8 h-8 rounded-full bg-[#6B4A2F]/10 blur-2xl",
            variant?.illustrationVariant === "firewood-loose" && "hidden",
          )}
        />
        <div className="relative h-full max-h-full w-full min-w-0 pb-12">
          <div
            data-beam-preview-frame
            className="relative h-full max-h-full min-h-0 w-full overflow-hidden"
          >
            <div
              data-beam-preview-motion
              className={`relative h-full w-full ${isRecoiling ? "is-recoiling" : ""}`}
            >
              <div data-beam-preview-stage className="absolute inset-0 overflow-hidden">
                <div
                  data-artwork-interaction-transform
                  data-length-scale={interactionMotion.lengthScale}
                  data-profile-scale={interactionMotion.profileScale}
                  data-combined-scale={interactionMotion.scale}
                  data-scale-x={interactionMotion.scaleX}
                  data-scale-y={interactionMotion.scaleY}
                  style={interactionStyle}
                  className="absolute inset-0"
                >
                  {layers.previous && renderLayer(layers.previous, "previous")}
                  {renderLayer(layers.current, "current")}
                </div>
              </div>
            </div>
          </div>
        </div>
        {limitMessage && (
          <p
            data-visualization-limit
            role="status"
            className="absolute inset-x-3 bottom-3 z-10 m-0 rounded-xl bg-transparent px-3 py-2 text-center text-xs leading-4 text-[#70451F]"
          >
            {limitMessage}
          </p>
        )}
      </div>
    </div>
  );
}
