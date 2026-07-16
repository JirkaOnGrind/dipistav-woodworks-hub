import { useEffect, useId, useMemo, useState, type CSSProperties } from "react";
import { Minus, Plus, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCart } from "@/lib/cart";
import { formatCurrency, formatDecimal } from "@/lib/site";

type Species = {
  id: string;
  label: string;
  pricePerM3: number;
  densityKgPerM3: number;
  faceFill: string;
  topFill: string;
  sideFill: string;
};

const SPECIES: Species[] = [
  {
    id: "smrk",
    label: "Smrk",
    pricePerM3: 8500,
    densityKgPerM3: 450,
    faceFill: "#E5D4B3",
    topFill: "#F5EAD0",
    sideFill: "#EEDFC2",
  },
  {
    id: "borovice",
    label: "Borovice",
    pricePerM3: 9200,
    densityKgPerM3: 520,
    faceFill: "#DDB67F",
    topFill: "#EBC898",
    sideFill: "#E3BE8E",
  },
  {
    id: "modrin",
    label: "Mod\u0159\u00edn",
    pricePerM3: 12500,
    densityKgPerM3: 590,
    faceFill: "#D8A17C",
    topFill: "#E5B288",
    sideFill: "#DBA27D",
  },
];

const WIDTH_MIN = 40;
const WIDTH_MAX = 300;
const HEIGHT_MIN = 40;
const HEIGHT_MAX = 300;
const LENGTH_MIN = 1;
const LENGTH_MAX = 8;
const QTY_MIN = 1;
const QTY_MAX = 100;
const PREVIEW_VIEWBOX_WIDTH = 420;
const PREVIEW_VIEWBOX_HEIGHT = 260;

function clamp(value: number, min: number, max: number) {
  if (Number.isNaN(value)) {
    return min;
  }

  return Math.min(Math.max(value, min), max);
}

function clampToStep(value: number, min: number, max: number, step: number) {
  const normalized = clamp(value, min, max);
  const stepped = Math.round((normalized - min) / step) * step + min;
  return Number(stepped.toFixed(step < 1 ? 1 : 0));
}

function parseLocalizedNumber(value: string) {
  return Number(value.replace(",", ".").trim());
}

function formatControlValue(value: number, step: number) {
  if (step >= 1) {
    return String(Math.round(value));
  }

  return value.toFixed(1).replace(".", ",");
}

function SawBladeWatermark() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 400 400"
      className="pointer-events-none absolute right-[-4.5rem] top-[-2.5rem] h-[22rem] w-[22rem] text-[#1E3A2B] opacity-[0.07] lg:right-12 lg:top-1/2 lg:h-[28rem] lg:w-[28rem] lg:-translate-y-1/2"
      fill="none"
    >
      <g stroke="currentColor" strokeWidth="1.1">
        <circle cx="200" cy="200" r="136" />
        <circle cx="200" cy="200" r="92" />
        <circle cx="200" cy="200" r="28" />
        {Array.from({ length: 16 }, (_, index) => {
          const angle = (index * Math.PI * 2) / 16;
          const inner = 136;
          const outer = 168;
          const spread = 0.12;
          const x1 = 200 + Math.cos(angle - spread) * inner;
          const y1 = 200 + Math.sin(angle - spread) * inner;
          const x2 = 200 + Math.cos(angle) * outer;
          const y2 = 200 + Math.sin(angle) * outer;
          const x3 = 200 + Math.cos(angle + spread) * inner;
          const y3 = 200 + Math.sin(angle + spread) * inner;

          return <path key={index} d={`M ${x1} ${y1} L ${x2} ${y2} L ${x3} ${y3}`} />;
        })}
      </g>
    </svg>
  );
}

function BeamPreview({
  width,
  height,
  length,
  species,
}: {
  width: number;
  height: number;
  length: number;
  species: Species;
}) {
  const previewId = useId().replace(/:/g, "");

  const geometry = useMemo(() => {
    const cos30 = Math.cos(Math.PI / 6);
    const sin30 = Math.sin(Math.PI / 6);
    const widthMm = clamp(width, WIDTH_MIN, WIDTH_MAX);
    const heightMm = clamp(height, HEIGHT_MIN, HEIGHT_MAX);
    const lengthMm = clamp(length, LENGTH_MIN, LENGTH_MAX) * 1000;

    const maxSection = Math.max(widthMm, heightMm);
    const minSection = Math.min(widthMm, heightMm);
    const sectionScale = 88 / maxSection;
    const minVisibleBoost = Math.max(1, 14 / (minSection * sectionScale));

    const rawFaceWidth = widthMm * sectionScale * minVisibleBoost;
    const rawFaceHeight = heightMm * sectionScale * minVisibleBoost;

    const lengthRatio = (lengthMm - 1000) / 7000;
    const rawBodyLength = 112 + Math.pow(lengthRatio, 0.9) * 104;

    const rawWidthVector = {
      x: rawFaceWidth * cos30,
      y: rawFaceWidth * sin30,
    };
    const rawLengthVector = {
      x: rawBodyLength * cos30,
      y: -rawBodyLength * sin30,
    };

    const rawBounds = {
      minX: 0,
      maxX: rawWidthVector.x + rawLengthVector.x,
      minY: rawLengthVector.y,
      maxY: rawFaceHeight + rawWidthVector.y,
    };

    const availableWidth = 292;
    const availableHeight = 176;
    const fitScale = Math.min(
      1,
      availableWidth / (rawBounds.maxX - rawBounds.minX),
      availableHeight / (rawBounds.maxY - rawBounds.minY),
    );

    const faceWidth = rawFaceWidth * fitScale;
    const faceHeight = rawFaceHeight * fitScale;
    const widthVector = {
      x: rawWidthVector.x * fitScale,
      y: rawWidthVector.y * fitScale,
    };
    const lengthVector = {
      x: rawLengthVector.x * fitScale,
      y: rawLengthVector.y * fitScale,
    };

    const scaledWidth = (rawBounds.maxX - rawBounds.minX) * fitScale;
    const scaledHeight = (rawBounds.maxY - rawBounds.minY) * fitScale;
    const marginLeft = (PREVIEW_VIEWBOX_WIDTH - scaledWidth) / 2;
    const marginTop = (PREVIEW_VIEWBOX_HEIGHT - scaledHeight) / 2;
    const frontTopLeft = {
      x: marginLeft - rawBounds.minX * fitScale,
      y: marginTop - rawBounds.minY * fitScale,
    };
    const frontTopRight = {
      x: frontTopLeft.x + widthVector.x,
      y: frontTopLeft.y + widthVector.y,
    };
    const frontBottomLeft = {
      x: frontTopLeft.x,
      y: frontTopLeft.y + faceHeight,
    };
    const frontBottomRight = {
      x: frontTopRight.x,
      y: frontTopRight.y + faceHeight,
    };
    const backTopLeft = {
      x: frontTopLeft.x + lengthVector.x,
      y: frontTopLeft.y + lengthVector.y,
    };
    const backTopRight = {
      x: frontTopRight.x + lengthVector.x,
      y: frontTopRight.y + lengthVector.y,
    };
    const backBottomLeft = {
      x: frontBottomLeft.x + lengthVector.x,
      y: frontBottomLeft.y + lengthVector.y,
    };
    const backBottomRight = {
      x: frontBottomRight.x + lengthVector.x,
      y: frontBottomRight.y + lengthVector.y,
    };

    return {
      faceWidth,
      faceHeight,
      widthVector,
      lengthVector,
      frontTopLeft,
      frontTopRight,
      frontBottomLeft,
      frontBottomRight,
      backTopLeft,
      backTopRight,
      backBottomLeft,
      backBottomRight,
    };
  }, [height, length, width]);

  const frontFacePoints = [
    geometry.frontTopLeft,
    geometry.frontTopRight,
    geometry.frontBottomRight,
    geometry.frontBottomLeft,
  ]
    .map((point) => `${point.x},${point.y}`)
    .join(" ");

  const topFacePoints = [
    geometry.frontTopLeft,
    geometry.frontTopRight,
    geometry.backTopRight,
    geometry.backTopLeft,
  ]
    .map((point) => `${point.x},${point.y}`)
    .join(" ");

  const sideFacePoints = [
    geometry.frontTopRight,
    geometry.backTopRight,
    geometry.backBottomRight,
    geometry.frontBottomRight,
  ]
    .map((point) => `${point.x},${point.y}`)
    .join(" ");

  const widthOffset = 34;
  const heightOffset = 34;
  const lengthOffset = 34;

  const widthNormal = {
    x: geometry.widthVector.y,
    y: -geometry.widthVector.x,
  };
  const widthNormalLength = Math.hypot(widthNormal.x, widthNormal.y) || 1;
  const widthNormalUnit = {
    x: widthNormal.x / widthNormalLength,
    y: widthNormal.y / widthNormalLength,
  };

  const lengthNormal = {
    x: -geometry.lengthVector.y,
    y: geometry.lengthVector.x,
  };
  const lengthNormalLength = Math.hypot(lengthNormal.x, lengthNormal.y) || 1;
  const lengthNormalUnit = {
    x: lengthNormal.x / lengthNormalLength,
    y: lengthNormal.y / lengthNormalLength,
  };

  const widthGuideStart = {
    x: geometry.frontTopLeft.x + widthNormalUnit.x * widthOffset - 10,
    y: geometry.frontTopLeft.y + widthNormalUnit.y * widthOffset,
  };
  const widthGuideEnd = {
    x: geometry.frontTopRight.x + widthNormalUnit.x * widthOffset - 10,
    y: geometry.frontTopRight.y + widthNormalUnit.y * widthOffset,
  };

  const heightGuideX = geometry.frontTopLeft.x - heightOffset;

  const lengthGuideStart = {
    x: geometry.frontBottomLeft.x + lengthNormalUnit.x * lengthOffset,
    y: geometry.frontBottomLeft.y + lengthNormalUnit.y * lengthOffset + 2,
  };
  const lengthGuideEnd = {
    x: geometry.backBottomLeft.x + lengthNormalUnit.x * lengthOffset,
    y: geometry.backBottomLeft.y + lengthNormalUnit.y * lengthOffset + 2,
  };

  const widthLabelX = (widthGuideStart.x + widthGuideEnd.x) / 2 - 8;
  const widthLabelY = (widthGuideStart.y + widthGuideEnd.y) / 2 - 10;
  const heightLabelX = heightGuideX - 12;
  const heightLabelY = (geometry.frontTopLeft.y + geometry.frontBottomLeft.y) / 2;
  const lengthLabelX = (lengthGuideStart.x + lengthGuideEnd.x) / 2;
  const lengthLabelY = (lengthGuideStart.y + lengthGuideEnd.y) / 2 + 18;

  return (
    <div className="rounded-[1.8rem] border border-[#1E3A2B]/12 bg-[linear-gradient(180deg,rgba(255,253,248,0.98),rgba(244,238,225,0.96))] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] sm:p-4 lg:flex lg:h-full lg:min-h-[35rem] lg:flex-col lg:p-4">
      <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#1E3A2B]/55">
        {"N\u00e1hled"}
      </div>

      <div className="relative mt-3 flex min-h-[220px] items-center justify-center overflow-hidden rounded-[1.65rem] border border-[#D9D1C1] bg-[radial-gradient(circle_at_top,#fffef9_0%,#f4ebdc_62%,#ecdfcc_100%)] px-3 py-4 sm:min-h-[260px] sm:px-5 sm:py-5 lg:min-h-0 lg:flex-1 lg:px-5 lg:py-4">
        <div
          aria-hidden
          className="absolute inset-x-10 bottom-5 h-6 rounded-full bg-[#6A4A2F]/8 blur-2xl"
          style={{
            transform: `scaleX(${1.04 + ((length - LENGTH_MIN) / (LENGTH_MAX - LENGTH_MIN)) * 0.38})`,
          }}
        />

        <div className="flex h-full w-full items-center justify-center">
          <svg
            viewBox={`0 0 ${PREVIEW_VIEWBOX_WIDTH} ${PREVIEW_VIEWBOX_HEIGHT}`}
            className="relative z-10 h-auto w-full max-w-[27rem] sm:max-w-[31rem] lg:w-[84%] lg:max-w-[42rem]"
          >
            <defs>
              <clipPath id={`${previewId}-top`}>
                <polygon points={topFacePoints} />
              </clipPath>
              <clipPath id={`${previewId}-side`}>
                <polygon points={sideFacePoints} />
              </clipPath>
            </defs>

            <g stroke="#1E3A2B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points={topFacePoints} fill={species.topFill} />
              <polygon points={sideFacePoints} fill={species.sideFill} />
              <polygon points={frontFacePoints} fill={species.faceFill} />
            </g>

            <g
              fill="none"
              stroke="#1E3A2B"
              strokeWidth="1"
              strokeDasharray="3,3"
              strokeOpacity="0.4"
              strokeLinecap="round"
            >
              <path
                d={`M ${geometry.frontTopLeft.x} ${geometry.frontTopLeft.y} L ${widthGuideStart.x} ${widthGuideStart.y}`}
              />
              <path
                d={`M ${geometry.frontTopRight.x} ${geometry.frontTopRight.y} L ${widthGuideEnd.x} ${widthGuideEnd.y}`}
              />
              <path
                d={`M ${widthGuideStart.x} ${widthGuideStart.y} L ${widthGuideEnd.x} ${widthGuideEnd.y}`}
              />

              <path
                d={`M ${geometry.frontTopLeft.x} ${geometry.frontTopLeft.y} L ${heightGuideX} ${geometry.frontTopLeft.y}`}
              />
              <path
                d={`M ${geometry.frontBottomLeft.x} ${geometry.frontBottomLeft.y} L ${heightGuideX} ${geometry.frontBottomLeft.y}`}
              />
              <path
                d={`M ${heightGuideX} ${geometry.frontTopLeft.y} L ${heightGuideX} ${geometry.frontBottomLeft.y}`}
              />

              <path
                d={`M ${geometry.frontBottomLeft.x} ${geometry.frontBottomLeft.y} L ${lengthGuideStart.x} ${lengthGuideStart.y}`}
              />
              <path
                d={`M ${geometry.backBottomLeft.x} ${geometry.backBottomLeft.y} L ${lengthGuideEnd.x} ${lengthGuideEnd.y}`}
              />
              <path
                d={`M ${lengthGuideStart.x} ${lengthGuideStart.y} L ${lengthGuideEnd.x} ${lengthGuideEnd.y}`}
              />
            </g>

            <g fill="#1E3A2B" fontSize="11" fontWeight="600">
              <text x={widthLabelX} y={widthLabelY} textAnchor="middle">
                {width} mm
              </text>
              <text
                x={heightLabelX}
                y={heightLabelY}
                textAnchor="middle"
                transform={`rotate(-90 ${heightLabelX} ${heightLabelY})`}
              >
                {height} mm
              </text>
              <text x={lengthLabelX} y={lengthLabelY} textAnchor="middle">
                {formatControlValue(length, 0.5)} m
              </text>
            </g>
          </svg>
        </div>
      </div>
    </div>
  );
}

type NumericControlProps = {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
  unit: string;
};

function NumericControl({ label, value, onChange, min, max, step, unit }: NumericControlProps) {
  const id = useId();
  const [draftValue, setDraftValue] = useState(() => formatControlValue(value, step));
  const progress = ((value - min) / Math.max(max - min, step)) * 100;
  const sliderStyle = { "--beam-range-progress": `${progress}%` } as CSSProperties;

  useEffect(() => {
    setDraftValue(formatControlValue(value, step));
  }, [step, value]);

  const commitValue = (nextValue: number) => {
    const normalized = clampToStep(nextValue, min, max, step);
    onChange(normalized);
  };

  const commitDraft = () => {
    const parsed = parseLocalizedNumber(draftValue);

    if (Number.isNaN(parsed)) {
      setDraftValue(formatControlValue(value, step));
      return;
    }

    const normalized = clampToStep(parsed, min, max, step);
    onChange(normalized);
    setDraftValue(formatControlValue(normalized, step));
  };

  return (
    <div className="rounded-[1.55rem] border border-[#1E3A2B]/10 bg-white/82 p-4 shadow-[0_12px_30px_rgba(30,58,43,0.05)] backdrop-blur-sm sm:p-5 lg:p-3.5">
      <div className="flex items-center justify-between gap-3">
        <label
          htmlFor={id}
          className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#1E3A2B]/58"
        >
          {label}
        </label>

        <div className="rounded-full border border-[#1E3A2B]/10 bg-[#FBF9F4] px-3 py-1 text-sm font-black text-[#1E293B] tabular-nums md:hidden">
          {formatControlValue(value, step)} {unit}
        </div>
        <div className="hidden md:block">
          <Input
            id={id}
            aria-label={label}
            type="text"
            inputMode={step < 1 ? "decimal" : "numeric"}
            value={draftValue}
            onChange={(event) => setDraftValue(event.currentTarget.value)}
            onBlur={commitDraft}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                commitDraft();
              }
            }}
            className="h-9 w-24 rounded-full border-[#1E3A2B]/10 bg-[#FBF9F4] px-3 text-center text-sm font-black text-[#1E293B] shadow-none tabular-nums focus-visible:ring-[#1E3A2B]/20 lg:h-8 lg:w-26 lg:text-[0.95rem]"
          />
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3 md:hidden">
        <button
          type="button"
          onClick={() => commitValue(value - step)}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#1E3A2B]/12 bg-[#FBF9F4] text-[#1E3A2B] shadow-sm transition hover:border-[#1E3A2B]/24 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A2B]/20"
          aria-label={`Sn\u00ed\u017eit hodnotu ${label}`}
        >
          <Minus className="h-4 w-4" />
        </button>

        <div className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl border border-[#1E3A2B]/10 bg-[#FBF9F4] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]">
          <Input
            id={id}
            aria-label={label}
            type="text"
            inputMode={step < 1 ? "decimal" : "numeric"}
            value={draftValue}
            onChange={(event) => setDraftValue(event.currentTarget.value)}
            onBlur={commitDraft}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                commitDraft();
              }
            }}
            className="h-auto border-0 bg-transparent px-0 py-0 text-center text-lg font-black text-[#1E293B] shadow-none tabular-nums focus-visible:ring-0"
          />
        </div>

        <button
          type="button"
          onClick={() => commitValue(value + step)}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#1E3A2B]/12 bg-[#FBF9F4] text-[#1E3A2B] shadow-sm transition hover:border-[#1E3A2B]/24 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A2B]/20"
          aria-label={`Zv\u00fd\u0161it hodnotu ${label}`}
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-4 hidden md:block lg:mt-3">
        <input
          id={id}
          data-beam-range
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onInput={(event) => commitValue(Number(event.currentTarget.value))}
          style={sliderStyle}
          className="block w-full cursor-grab touch-none bg-transparent active:cursor-grabbing"
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={value}
        />
      </div>
    </div>
  );
}

export function CustomConfigurator() {
  const { addCustomItem } = useCart();
  const [width, setWidth] = useState(100);
  const [height, setHeight] = useState(100);
  const [length, setLength] = useState(4);
  const [quantity, setQuantity] = useState(10);
  const [speciesId, setSpeciesId] = useState<string>(SPECIES[0].id);

  const species = useMemo(
    () => SPECIES.find((item) => item.id === speciesId) ?? SPECIES[0],
    [speciesId],
  );

  const volumeM3 = useMemo(
    () => (width / 1000) * (height / 1000) * length * quantity,
    [width, height, length, quantity],
  );
  const totalPrice = useMemo(() => Math.round(volumeM3 * species.pricePerM3), [volumeM3, species]);
  const totalWeightKg = useMemo(
    () => Math.round(volumeM3 * species.densityKgPerM3),
    [volumeM3, species],
  );

  const handleAdd = () => {
    addCustomItem({
      widthMm: width,
      heightMm: height,
      lengthM: length,
      quantity,
      species: species.label,
      volumeM3,
      totalPrice,
    });
  };

  return (
    <section id="konfigurator" className="scroll-mt-24 bg-[#FBF9F4]">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:py-16 lg:py-20">
        <h2 className="mb-8 max-w-3xl text-3xl font-black tracking-tight text-[#1E293B] sm:text-4xl">
          {"Navrhn\u011bte si vlastn\u00ed \u0159ezivo"}
        </h2>

        <div
          data-beam-configurator
          className="relative rounded-[2rem] border border-[#1E3A2B]/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.84),rgba(255,252,246,0.96))] p-4 shadow-[0_24px_70px_rgba(30,58,43,0.08)] sm:p-6 lg:p-8"
        >
          <SawBladeWatermark />

          <div className="relative grid gap-6 lg:grid-cols-[minmax(360px,0.92fr)_minmax(420px,1.08fr)] lg:items-stretch lg:gap-6 xl:grid-cols-[minmax(380px,0.9fr)_minmax(460px,1.1fr)]">
            <div className="space-y-3 lg:flex lg:h-full lg:flex-col lg:space-y-3.5">
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-1 lg:gap-3.5">
                <NumericControl
                  label={"\u0160\u00ed\u0159ka"}
                  value={width}
                  onChange={setWidth}
                  min={WIDTH_MIN}
                  max={WIDTH_MAX}
                  step={10}
                  unit="mm"
                />
                <NumericControl
                  label={"V\u00fd\u0161ka"}
                  value={height}
                  onChange={setHeight}
                  min={HEIGHT_MIN}
                  max={HEIGHT_MAX}
                  step={10}
                  unit="mm"
                />
                <NumericControl
                  label={"D\u00e9lka"}
                  value={length}
                  onChange={setLength}
                  min={LENGTH_MIN}
                  max={LENGTH_MAX}
                  step={0.5}
                  unit="m"
                />
                <NumericControl
                  label={"Po\u010det ks"}
                  value={quantity}
                  onChange={setQuantity}
                  min={QTY_MIN}
                  max={QTY_MAX}
                  step={1}
                  unit="ks"
                />
              </div>

              <div className="rounded-[1.55rem] border border-[#1E3A2B]/10 bg-white/82 p-3 shadow-[0_12px_30px_rgba(30,58,43,0.05)] backdrop-blur-sm lg:p-3.5">
                <div className="grid grid-cols-3 gap-2 lg:gap-2.5">
                  {SPECIES.map((item) => {
                    const isActive = item.id === speciesId;

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setSpeciesId(item.id)}
                        className={`rounded-full border px-3 py-2.5 text-sm font-bold transition lg:px-4 ${
                          isActive
                            ? "border-[#1E3A2B] bg-[#1E3A2B] text-white shadow-[0_10px_24px_rgba(30,58,43,0.16)]"
                            : "border-[#1E3A2B]/10 bg-[#FBF9F4] text-[#1E293B] hover:border-[#1E3A2B]/22 hover:bg-white"
                        }`}
                        aria-pressed={isActive}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="hidden rounded-[1.65rem] border border-[#1E3A2B]/12 bg-white/88 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] lg:block">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-[#1E3A2B]/10 bg-[#FBF9F4] px-3.5 py-3">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#1E3A2B]/55">
                      {"Objem celkem"}
                    </div>
                    <div className="mt-1 text-[1.7rem] font-black text-[#1E3A2B] tabular-nums">
                      {formatDecimal(volumeM3)} {"m\u00b3"}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-[#1E3A2B]/10 bg-[#FBF9F4] px-3.5 py-3">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#1E3A2B]/55">
                      {"Hmotnost"}
                    </div>
                    <div className="mt-1 text-[1.7rem] font-black text-[#1E293B] tabular-nums">
                      {new Intl.NumberFormat("cs-CZ").format(totalWeightKg)} kg
                    </div>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 items-center gap-3">
                  <div className="min-w-0 px-0.5">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#1E3A2B]/52">
                      {"Celkov\u00e1 cena s DPH"}
                    </div>
                    <div
                      aria-live="polite"
                      className="mt-1 text-[2rem] font-black tracking-tight text-[#1E3A2B] tabular-nums"
                    >
                      {formatCurrency(totalPrice)}
                    </div>
                  </div>

                  <Button
                    type="button"
                    onClick={handleAdd}
                    className="h-11 w-full rounded-[1.2rem] bg-[#1E3A2B] px-5 text-sm font-bold text-white shadow-[0_14px_28px_rgba(30,58,43,0.16)] transition hover:bg-[#173021] hover:shadow-[0_18px_34px_rgba(30,58,43,0.2)]"
                  >
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    {"P\u0159idat do popt\u00e1vky"}
                  </Button>
                </div>
              </div>
            </div>

            <aside className="lg:self-stretch">
              <div className="space-y-3 rounded-[1.9rem] border border-[#1E3A2B]/12 bg-[#EEF3EA] p-3 shadow-[0_22px_48px_rgba(30,58,43,0.12)] sm:p-4 lg:flex lg:h-full lg:flex-col lg:p-4">
                <BeamPreview width={width} height={height} length={length} species={species} />

                <div className="rounded-[1.8rem] border border-[#1E3A2B]/12 bg-white/88 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] sm:p-5 lg:hidden">
                  <div className="grid gap-2.5 sm:grid-cols-2 sm:gap-3">
                    <div className="rounded-2xl border border-[#1E3A2B]/10 bg-[#FBF9F4] px-3 py-2.5 sm:px-4 sm:py-3 lg:px-3.5 lg:py-2.5">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#1E3A2B]/55 sm:text-[11px] sm:tracking-[0.2em]">
                        {"Objem celkem"}
                      </div>
                      <div className="mt-1 text-xl font-black text-[#1E3A2B] tabular-nums sm:text-2xl lg:text-[1.7rem]">
                        {formatDecimal(volumeM3)} {"m\u00b3"}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-[#1E3A2B]/10 bg-[#FBF9F4] px-3 py-2.5 sm:px-4 sm:py-3 lg:px-3.5 lg:py-2.5">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#1E3A2B]/55 sm:text-[11px] sm:tracking-[0.2em]">
                        {"Hmotnost"}
                      </div>
                      <div className="mt-1 text-xl font-black text-[#1E293B] tabular-nums sm:text-2xl lg:text-[1.7rem]">
                        {new Intl.NumberFormat("cs-CZ").format(totalWeightKg)} kg
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 space-y-3">
                    <div className="rounded-[1.55rem] bg-[#1E3A2B] px-4 py-3.5 text-white shadow-[0_14px_30px_rgba(30,58,43,0.18)] sm:px-5 sm:py-4">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/72 sm:text-[11px] sm:tracking-[0.22em]">
                        {"Celkov\u00e1 cena s DPH"}
                      </div>
                      <div
                        aria-live="polite"
                        className="mt-1.5 text-[1.85rem] font-black tracking-tight text-white tabular-nums sm:mt-2 sm:text-[2.15rem]"
                      >
                        {formatCurrency(totalPrice)}
                      </div>
                    </div>

                    <Button
                      type="button"
                      onClick={handleAdd}
                      className="h-12 w-full rounded-[1.4rem] bg-[#1E3A2B] text-sm font-bold text-white shadow-[0_18px_40px_rgba(30,58,43,0.16)] transition hover:bg-[#173021] hover:shadow-[0_22px_46px_rgba(30,58,43,0.22)] sm:h-13 sm:text-base"
                    >
                      <ShoppingCart className="mr-2 h-4 w-4" />
                      {"P\u0159idat do popt\u00e1vky"}
                    </Button>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </section>
  );
}
