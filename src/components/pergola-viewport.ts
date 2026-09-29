import { useEffect, useState } from "react";

export const PERGOLA_COMPACT_HEIGHT = 750;
const KEYBOARD_HEIGHT_THRESHOLD = 120;

export type PergolaViewportLayout = {
  mode: "desktop" | "portrait" | "compact" | "landscape";
  keyboardOpen: boolean;
};

export type PergolaViewportState = PergolaViewportLayout & {
  visualHeight: number;
  visualOffsetTop: number;
};

export function resolvePergolaViewportLayout({
  width,
  height,
  visualHeight = height,
}: {
  width: number;
  height: number;
  visualHeight?: number;
}): PergolaViewportLayout {
  const keyboardOpen = height - visualHeight >= KEYBOARD_HEIGHT_THRESHOLD;

  if (width >= 1024) return { mode: "desktop", keyboardOpen };
  if (width > height) return { mode: "landscape", keyboardOpen };

  const compact = height < PERGOLA_COMPACT_HEIGHT;
  return {
    mode: compact ? "compact" : "portrait",
    keyboardOpen,
  };
}

function readViewport(): PergolaViewportState {
  const visualHeight = window.visualViewport?.height ?? window.innerHeight;
  return {
    ...resolvePergolaViewportLayout({
      width: window.innerWidth,
      height: window.innerHeight,
      visualHeight,
    }),
    visualHeight,
    visualOffsetTop: window.visualViewport?.offsetTop ?? 0,
  };
}

export function usePergolaViewportLayout() {
  const [layout, setLayout] = useState<PergolaViewportState>(() =>
    typeof window === "undefined"
      ? {
          mode: "desktop",
          keyboardOpen: false,
          visualHeight: 0,
          visualOffsetTop: 0,
        }
      : readViewport(),
  );

  useEffect(() => {
    let frame: number | undefined;
    const update = () => {
      if (frame !== undefined) return;
      frame = window.requestAnimationFrame(() => {
        frame = undefined;
        setLayout(readViewport());
      });
    };

    update();
    window.addEventListener("resize", update, { passive: true });
    window.addEventListener("orientationchange", update, { passive: true });
    window.visualViewport?.addEventListener("resize", update, { passive: true });
    window.visualViewport?.addEventListener("scroll", update, { passive: true });
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
      window.visualViewport?.removeEventListener("resize", update);
      window.visualViewport?.removeEventListener("scroll", update);
      if (frame !== undefined) window.cancelAnimationFrame(frame);
    };
  }, []);

  const desktop = layout.mode === "desktop";

  useEffect(() => {
    if (desktop) return;
    const root = document.documentElement;
    const previousHeight = root.style.getPropertyValue("--pergola-visual-height");
    const previousOffset = root.style.getPropertyValue("--pergola-visual-offset-top");
    root.style.setProperty("--pergola-visual-height", `${layout.visualHeight}px`);
    root.style.setProperty("--pergola-visual-offset-top", `${layout.visualOffsetTop}px`);
    return () => {
      if (previousHeight) root.style.setProperty("--pergola-visual-height", previousHeight);
      else root.style.removeProperty("--pergola-visual-height");
      if (previousOffset) root.style.setProperty("--pergola-visual-offset-top", previousOffset);
      else root.style.removeProperty("--pergola-visual-offset-top");
    };
  }, [desktop, layout.visualHeight, layout.visualOffsetTop]);

  useEffect(() => {
    if (desktop) return;

    const root = document.documentElement;
    const body = document.body;
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    const previous = {
      rootOverflow: root.style.overflow,
      rootOverscrollBehavior: root.style.overscrollBehavior,
      bodyPosition: body.style.position,
      bodyTop: body.style.top,
      bodyRight: body.style.right,
      bodyBottom: body.style.bottom,
      bodyLeft: body.style.left,
      bodyWidth: body.style.width,
      bodyOverflow: body.style.overflow,
      bodyOverscrollBehavior: body.style.overscrollBehavior,
    };

    root.style.overflow = "hidden";
    root.style.overscrollBehavior = "none";
    body.style.position = "fixed";
    body.style.top = `${-scrollY}px`;
    body.style.right = "0";
    body.style.bottom = "auto";
    body.style.left = `${-scrollX}px`;
    body.style.width = "100%";
    body.style.overflow = "hidden";
    body.style.overscrollBehavior = "none";

    return () => {
      root.style.overflow = previous.rootOverflow;
      root.style.overscrollBehavior = previous.rootOverscrollBehavior;
      body.style.position = previous.bodyPosition;
      body.style.top = previous.bodyTop;
      body.style.right = previous.bodyRight;
      body.style.bottom = previous.bodyBottom;
      body.style.left = previous.bodyLeft;
      body.style.width = previous.bodyWidth;
      body.style.overflow = previous.bodyOverflow;
      body.style.overscrollBehavior = previous.bodyOverscrollBehavior;
      window.scrollTo(scrollX, scrollY);
    };
  }, [desktop]);

  return layout;
}
