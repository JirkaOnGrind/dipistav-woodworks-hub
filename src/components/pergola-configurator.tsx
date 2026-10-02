import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type FocusEvent,
  type ReactNode,
} from "react";
import { ChevronDown } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { ProductHeader } from "@/components/product-header";
import { SiteShell } from "@/components/site-shell";
import {
  AccessoryControls,
  DimensionControls,
  MaterialSelectors,
  PriceSummary,
} from "@/components/pergola-controls";
import { PergolaMobileSheet } from "@/components/pergola-mobile-sheet";
import { PergolaViewer } from "@/components/pergola-viewer";
import { usePergolaViewportLayout } from "@/components/pergola-viewport";
import {
  PERGOLA_DRAFT_SAVE_DELAY_MS,
  readPergolaDraft,
  writePergolaDraft,
} from "@/lib/pergola-draft";
import { savePergolaInquiry } from "@/lib/order-system";
import {
  DEFAULT_PERGOLA,
  isValidPostalCode,
  PERGOLA_MODELS,
  quotePergola,
  type PergolaConfig,
  type PergolaModel,
} from "@/lib/pergola";
import "./pergola.css";

function ConfiguratorAccordion({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <details
      className="pergola-accordion"
      open={isOpen}
      onToggle={(event) => setIsOpen(event.currentTarget.open)}
    >
      <summary>
        <span>{title}</span>
        <ChevronDown aria-hidden />
      </summary>
      <div className="pergola-accordion-content">{children}</div>
    </details>
  );
}

export default function PergolaConfigurator({ model }: { model: PergolaModel }) {
  const [config, setConfig] = useState<PergolaConfig>(() => ({ ...DEFAULT_PERGOLA, model }));
  const [draftReady, setDraftReady] = useState(false);
  const saveTimeoutRef = useRef<number | null>(null);
  const navigate = useNavigate();
  const quote = quotePergola(config);
  const viewport = usePergolaViewportLayout();
  const dockExpansion = Math.max(0, viewport.visualHeight - 650);
  const dockRowHeight = Math.min(60, 44 + dockExpansion * 0.055);
  const dockRowGap = Math.min(6, dockExpansion * 0.018);

  useEffect(() => {
    const storedConfig = readPergolaDraft(window.localStorage);
    if (storedConfig) setConfig({ ...storedConfig, model });
    setDraftReady(true);
  }, [model]);

  useEffect(() => {
    if (!draftReady) return;

    if (saveTimeoutRef.current !== null) window.clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = window.setTimeout(() => {
      writePergolaDraft(window.localStorage, config);
      saveTimeoutRef.current = null;
    }, PERGOLA_DRAFT_SAVE_DELAY_MS);

    return () => {
      if (saveTimeoutRef.current !== null) window.clearTimeout(saveTimeoutRef.current);
    };
  }, [config, draftReady]);

  function update<K extends keyof PergolaConfig>(key: K, value: PergolaConfig[K]) {
    setConfig((current) => ({ ...current, [key]: value }));
  }

  function addToInquiry() {
    if (config.delivery && !isValidPostalCode(config.postalCode)) return;
    savePergolaInquiry(config);
    if (saveTimeoutRef.current !== null) {
      window.clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    void navigate({ to: "/poptavka-pergoly" });
  }

  function keepFocusedInputVisible(event: FocusEvent<HTMLElement>) {
    if (viewport.mode !== "desktop") return;
    if (!(event.target instanceof HTMLInputElement)) return;
    const input = event.target;
    window.setTimeout(() => input.scrollIntoView({ block: "center", behavior: "smooth" }), 280);
  }

  return (
    <SiteShell productDetail>
      <div className="pergola-surface">
        <div className="pergola-surface-texture" aria-hidden />
        <section
          className="pergola-page"
          aria-labelledby="pergola-title"
          data-viewport-mode={viewport.mode}
          data-keyboard-open={viewport.keyboardOpen || undefined}
          style={
            viewport.mode === "desktop"
              ? undefined
              : ({
                  "--pergola-visual-height": `${viewport.visualHeight}px`,
                  "--pergola-visual-offset-top": `${viewport.visualOffsetTop}px`,
                  "--pergola-dock-row-height": `${dockRowHeight}px`,
                  "--pergola-dock-row-gap": `${dockRowGap}px`,
                } as CSSProperties)
          }
          onFocusCapture={keepFocusedInputVisible}
        >
          <ProductHeader
            titleId="pergola-title"
            title={
              <>
                Pergola <span className="pergola-title-accent">na míru.</span>
              </>
            }
            description={PERGOLA_MODELS[config.model].label}
          />

          <div className="pergola-layout">
            <div className="pergola-stage">
              <PergolaViewer config={config} annotationsVisible={viewport.mode === "desktop"} />
              <PergolaMobileSheet
                config={config}
                quote={quote}
                update={update}
                onSubmit={addToInquiry}
              />
            </div>

            <aside className="pergola-panel" aria-label="Konfigurace pergoly">
              <h2 className="pergola-panel-title">Konfigurace</h2>
              <div className="pergola-panel-scroll">
                <ConfiguratorAccordion title="Rozměry konstrukce" defaultOpen>
                  <DimensionControls config={config} update={update} />
                </ConfiguratorAccordion>
                <ConfiguratorAccordion title="Materiál a povrchy">
                  <MaterialSelectors config={config} update={update} />
                </ConfiguratorAccordion>
                <ConfiguratorAccordion title="Doplňky a služby">
                  <AccessoryControls config={config} update={update} />
                </ConfiguratorAccordion>
              </div>
              <PriceSummary config={config} quote={quote} onSubmit={addToInquiry} />
            </aside>

            <div
              className="pergola-mobile-dock"
              aria-label="Rozměry pergoly"
              onPointerDownCapture={(event) => event.stopPropagation()}
            >
              <DimensionControls config={config} update={update} mobile />
            </div>
          </div>
        </section>
      </div>
    </SiteShell>
  );
}
