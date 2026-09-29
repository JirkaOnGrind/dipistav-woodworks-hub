import { useEffect, useId, useState, type ReactNode } from "react";
import { ArrowRight, ChevronLeft, ChevronRight, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { formatCurrency } from "@/lib/site";
import {
  clampDimension,
  isValidPostalCode,
  PERGOLA_ADDONS,
  PERGOLA_LIMITS,
  ROOF_COLORS,
  WOOD_PAINTS,
  type PergolaConfig,
  type PergolaQuote,
} from "@/lib/pergola";

export type PergolaUpdate = <K extends keyof PergolaConfig>(
  key: K,
  value: PergolaConfig[K],
) => void;

type DimensionKey = keyof typeof PERGOLA_LIMITS;

const DIMENSIONS: { key: DimensionKey; label: string }[] = [
  { key: "width", label: "Šířka" },
  { key: "depth", label: "Hloubka" },
  { key: "height", label: "Výška" },
];

function DimensionControl({
  dimension,
  label,
  value,
  onChange,
}: {
  dimension: DimensionKey;
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  const { min, max } = PERGOLA_LIMITS[dimension];
  const [draft, setDraft] = useState(value.toFixed(1));

  useEffect(() => setDraft(value.toFixed(1)), [value]);

  const adjust = (delta: number) => onChange(clampDimension(value + delta, min, max));

  return (
    <div className="pergola-dimension" data-dimension={dimension}>
      <span className="pergola-dimension-label-text">{label}</span>
      <span className="pergola-number-field">
        <Input
          type="number"
          min={min}
          max={max}
          step={0.1}
          inputMode="decimal"
          value={draft}
          aria-label={`${label} v metrech`}
          onChange={(event) => {
            setDraft(event.target.value);
            const next = event.target.valueAsNumber;
            if (Number.isFinite(next) && next >= min && next <= max) onChange(next);
          }}
          onBlur={() => {
            const next = draft.trim() ? clampDimension(Number(draft), min, max) : value;
            setDraft(next.toFixed(1));
            onChange(next);
          }}
        />
        <span aria-hidden>m</span>
      </span>
      <div className="pergola-slider-control">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="pergola-stepper-button"
          disabled={value <= min}
          aria-label={`Snížit: ${label}`}
          onClick={() => adjust(-0.1)}
        >
          <Minus data-icon="inline-start" aria-hidden />
        </Button>
        <Slider
          className="pergola-range"
          min={min}
          max={max}
          step={0.1}
          value={[value]}
          thumbLabel={`${label} – posuvník`}
          thumbValueText={`${value.toLocaleString("cs-CZ")} metru`}
          onValueChange={([next]) => {
            if (next !== undefined) onChange(next);
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="pergola-stepper-button"
          disabled={value >= max}
          aria-label={`Zvýšit: ${label}`}
          onClick={() => adjust(0.1)}
        >
          <Plus data-icon="inline-start" aria-hidden />
        </Button>
      </div>
    </div>
  );
}

export function DimensionControls({
  config,
  update,
  mobile = false,
}: {
  config: PergolaConfig;
  update: PergolaUpdate;
  mobile?: boolean;
}) {
  return (
    <fieldset className="pergola-dimensions" data-mobile={mobile || undefined}>
      <legend className={mobile ? "sr-only" : undefined}>Rozměry konstrukce</legend>
      {DIMENSIONS.map(({ key, label }) => (
        <DimensionControl
          key={key}
          dimension={key}
          label={label}
          value={config[key]}
          onChange={(value) => update(key, value)}
        />
      ))}
      {!mobile && <p className="pergola-hint">Šířka a hloubka 4–6 m · výška 2–4 m</p>}
    </fieldset>
  );
}

type FinishCategory = "stains" | "opaque";
type FinishOption = {
  label: string;
  code: string;
  color: string;
  category?: FinishCategory;
};

function Swatch({
  colorKey,
  palette,
  category,
}: {
  colorKey: string;
  palette: "wood" | "roof";
  category?: FinishCategory;
}) {
  return (
    <span
      className={`pergola-swatch pergola-swatch--${palette}-${colorKey}`}
      data-finish-category={category}
      aria-hidden
    />
  );
}

const SWATCHES_PER_PAGE = 5;
const FINISH_CATEGORIES: { value: FinishCategory; label: string }[] = [
  { value: "stains", label: "Lazury" },
  { value: "opaque", label: "Krycí" },
];

function ConfiguratorSectionHeader({
  title,
  detail,
  secondaryControls,
  actions,
}: {
  title: string;
  detail?: string;
  secondaryControls?: ReactNode;
  actions?: ReactNode;
}) {
  const fullTitle = detail ? `${title} (${detail})` : title;
  const hasSecondaryControls = Boolean(secondaryControls);

  return (
    <div
      className="pergola-section-header"
      data-secondary-controls={hasSecondaryControls || undefined}
    >
      <h2 className="pergola-section-title" title={fullTitle}>
        <span>{title}</span>
        {detail ? <small aria-live="polite">({detail})</small> : null}
      </h2>
      {secondaryControls || actions ? (
        <div className="pergola-section-controls">
          {secondaryControls}
          {actions}
        </div>
      ) : null}
    </div>
  );
}

function FinishGroup({
  legend,
  value,
  colors,
  palette,
  disabled = false,
  onValueChange,
}: {
  legend: string;
  value: string;
  colors: Record<string, FinishOption>;
  palette: "wood" | "roof";
  disabled?: boolean;
  onValueChange: (value: string) => void;
}) {
  const selected = colors[value];
  const selectedCategory = selected.category ?? "all";
  const [category, setCategory] = useState<FinishCategory | "all">(selectedCategory);
  const [page, setPage] = useState(0);
  const categoryEntries = Object.entries(colors).filter(
    ([, finish]) => category === "all" || finish.category === category,
  );
  const pageCount = Math.ceil(categoryEntries.length / SWATCHES_PER_PAGE);
  const currentPage = Math.min(page, Math.max(0, pageCount - 1));
  const visibleEntries = categoryEntries.slice(
    currentPage * SWATCHES_PER_PAGE,
    (currentPage + 1) * SWATCHES_PER_PAGE,
  );

  useEffect(() => {
    setCategory(selectedCategory);
    const matchingEntries = Object.entries(colors).filter(
      ([, finish]) => selectedCategory === "all" || finish.category === selectedCategory,
    );
    const selectedIndex = matchingEntries.findIndex(([key]) => key === value);
    setPage(Math.max(0, Math.floor(selectedIndex / SWATCHES_PER_PAGE)));
  }, [colors, selectedCategory, value]);

  return (
    <fieldset disabled={disabled} data-palette={palette}>
      <legend className="sr-only">{legend}</legend>
      <ConfiguratorSectionHeader
        title={legend}
        detail={selected.label}
        secondaryControls={
          palette === "wood" ? (
            <ToggleGroup
              className="pergola-finish-tabs"
              type="single"
              value={category}
              onValueChange={(next) => {
                if (!next) return;
                setCategory(next as FinishCategory);
                setPage(0);
              }}
              aria-label="Kategorie nátěru dřeva"
            >
              {FINISH_CATEGORIES.map((option) => (
                <ToggleGroupItem key={option.value} value={option.value}>
                  {option.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          ) : undefined
        }
        actions={
          pageCount > 1 ? (
            <div className="pergola-finish-pagination">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="pergola-swatch-page-button"
                disabled={currentPage === 0}
                aria-label={`Předchozí odstíny – ${legend}`}
                onClick={() => setPage((current) => Math.max(0, current - 1))}
              >
                <ChevronLeft data-icon="inline-start" aria-hidden />
              </Button>
              <span aria-label={`Strana ${currentPage + 1} z ${pageCount}`}>
                {currentPage + 1}/{pageCount}
              </span>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="pergola-swatch-page-button"
                disabled={currentPage >= pageCount - 1}
                aria-label={`Další odstíny – ${legend}`}
                onClick={() => setPage((current) => Math.min(pageCount - 1, current + 1))}
              >
                <ChevronRight data-icon="inline-start" aria-hidden />
              </Button>
            </div>
          ) : undefined
        }
      />
      <ToggleGroup
        className="pergola-swatch-options"
        type="single"
        value={value}
        disabled={disabled}
        onValueChange={(next) => {
          if (next) onValueChange(next);
        }}
        aria-label={legend}
        variant="outline"
      >
        {visibleEntries.map(([key, finish]) => (
          <ToggleGroupItem key={key} value={key} aria-label={finish.label} title={finish.label}>
            <Swatch colorKey={key} palette={palette} category={finish.category} />
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </fieldset>
  );
}

export function MaterialSelectors({
  config,
  update,
  mobile = false,
}: {
  config: PergolaConfig;
  update: PergolaUpdate;
  mobile?: boolean;
}) {
  return (
    <div className="pergola-finishes" data-mobile={mobile || undefined}>
      <FinishGroup
        legend="Nátěr dřeva"
        value={config.wood}
        colors={WOOD_PAINTS}
        palette="wood"
        onValueChange={(value) => update("wood", value as PergolaConfig["wood"])}
      />
      <FinishGroup
        legend="Plechová krytina"
        value={config.roof}
        colors={ROOF_COLORS}
        palette="roof"
        disabled={!config.roofing}
        onValueChange={(value) => update("roof", value as PergolaConfig["roof"])}
      />
    </div>
  );
}

function DeliveryPostalCode({
  id,
  value,
  onChange,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const valid = isValidPostalCode(value);
  const errorId = useId();

  return (
    <label id={id} className="pergola-distance" data-invalid={!valid || undefined}>
      <Input
        type="text"
        inputMode="numeric"
        autoComplete="postal-code"
        pattern="[0-9]{5}"
        maxLength={5}
        value={value}
        aria-label="PSČ pro výpočet dopravy"
        aria-invalid={!valid}
        aria-describedby={!valid ? errorId : undefined}
        onChange={(event) => onChange(event.target.value.replace(/\D/g, "").slice(0, 5))}
      />
      <span aria-hidden>PSČ</span>
      {!valid && (
        <small id={errorId} className="pergola-postal-error">
          Zadejte přesně 5 číslic.
        </small>
      )}
    </label>
  );
}

export function AccessoryControls({
  config,
  update,
}: {
  config: PergolaConfig;
  update: PergolaUpdate;
}) {
  const controlId = useId();

  return (
    <fieldset className="pergola-addons">
      <legend>Doplňky a služby</legend>
      {PERGOLA_ADDONS.map(({ key, label, rate }) => {
        const switchId = `${controlId}-${key}`;
        const detailId = `${switchId}-detail`;

        return (
          <div className="pergola-addon" key={key} data-checked={config[key] || undefined}>
            <label className="pergola-addon-name" htmlFor={switchId}>
              {label}
            </label>
            {key === "delivery" && config.delivery ? (
              <DeliveryPostalCode
                id={detailId}
                value={config.postalCode}
                onChange={(value) => update("postalCode", value)}
              />
            ) : (
              <span className="pergola-rate" id={detailId}>
                {rate}
              </span>
            )}
            <span className="pergola-addon-toggle">
              <Switch
                id={switchId}
                className="pergola-switch"
                checked={config[key]}
                onCheckedChange={(checked) => update(key, checked)}
                aria-describedby={detailId}
              />
            </span>
          </div>
        );
      })}
    </fieldset>
  );
}

export function PriceSummary({
  config,
  quote,
  onSubmit,
}: {
  config: PergolaConfig;
  quote: PergolaQuote;
  onSubmit: () => void;
}) {
  return (
    <section className="pergola-summary" aria-label="Kalkulace">
      <h2>Kalkulace</h2>
      <dl className="pergola-breakdown">
        <div>
          <dt>
            Konstrukce · {quote.area.toLocaleString("cs-CZ", { maximumFractionDigits: 2 })} m²
          </dt>
          <dd>{formatCurrency(quote.structure)}</dd>
        </div>
        <div>
          <dt>Nátěr dřeva</dt>
          <dd>{formatCurrency(quote.paint)}</dd>
        </div>
        {PERGOLA_ADDONS.filter(({ key }) => config[key]).map(({ key, label }) => (
          <div key={key}>
            <dt>{label}</dt>
            <dd>{formatCurrency(quote.addons[key])}</dd>
          </div>
        ))}
      </dl>
      <div className="pergola-total">
        <output aria-live="polite" data-pergola-total>
          {formatCurrency(quote.total)}
        </output>
        <span className="pergola-total-caption">Orientační cena</span>
      </div>
      <Button
        type="button"
        disabled={config.delivery && !isValidPostalCode(config.postalCode)}
        onClick={onSubmit}
      >
        Přidat do poptávky <ArrowRight data-icon="inline-end" />
      </Button>
      <p className="pergola-hint">Konečnou cenu potvrdíme v nabídce.</p>
    </section>
  );
}
