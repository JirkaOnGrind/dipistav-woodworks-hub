import { useMemo, type CSSProperties } from "react";
import {
  calculateSafeArtworkTransform,
  getArtworkRequestedScale,
  getSellingUnitCount,
  resolveArtworkScene,
  type SellingUnitCount,
} from "@/lib/product-artwork";
import type { ProductVariant } from "@/lib/product-catalog";
import { VISUALIZATION_LIMITS } from "@/lib/visualization-limits";
import {
  createPalletComposition,
  getPalletSourceProfile,
  PALLET_COMPOSITION_CANVAS,
} from "@/lib/pallet-composition";

type IllustrationProps = {
  categoryId: string;
  quantity: number;
  variant: ProductVariant;
  title: string;
  imageLoading?: "eager" | "lazy";
  fetchPriority?: "high" | "low" | "auto";
};

type UnitPlacement = {
  x: number;
  y: number;
  scale: number;
  zIndex: number;
  rotation?: number;
};

type BigBagPlacement = {
  column: number;
  depth: number;
  level: number;
  zIndex: number;
};

type BigBagCompositionProfile = {
  columnX: number;
  columnY: number;
  depthX: number;
  depthY: number;
  stackHeight: number;
  secondLevelX: number;
  originX: number;
  originY: number;
  unitScale: number;
};

function repeatedCssVariable(name: string, count: number, operator: "+" | "-") {
  return Array.from({ length: count }, () => `${operator} var(${name})`).join(" ");
}

function palletOffsetExpression(
  terms: readonly [name: string, count: number, operator: "+" | "-"][],
) {
  const increments = terms
    .map(([name, count, operator]) => repeatedCssVariable(name, count, operator))
    .filter(Boolean)
    .join(" ");
  return `calc(0%${increments ? ` ${increments}` : ""})`;
}

const PALLET_VARIANTS = new Set([
  "firewood-pallet",
  "pallet-16",
  "pallet-25",
  "pallet-33",
  "pallet-25-16",
  "pallet-33-16",
]);

function createGridLayout(
  count: number,
  columns: number,
  scale: number,
  xRange = 31,
  yRange = 25,
): UnitPlacement[] {
  const rows = Math.ceil(count / columns);

  return Array.from({ length: count }, (_, index) => {
    const row = Math.floor(index / columns);
    const itemsInRow = Math.min(columns, count - row * columns);
    const column = index % columns;
    const x = itemsInRow === 1 ? 0 : -xRange + (column * xRange * 2) / (itemsInRow - 1);
    const y = rows === 1 ? 0 : -yRange + (row * yRange * 2) / (rows - 1);

    return { x, y, scale: scale * (1 + row * 0.025), zIndex: index + 1 };
  });
}

const UNIT_LAYOUTS: Record<SellingUnitCount, UnitPlacement[]> = {
  1: [{ x: 0, y: 0, scale: 1, zIndex: 1 }],
  2: [
    { x: 17, y: -8, scale: 0.72, zIndex: 1 },
    { x: -17, y: 10, scale: 0.72, zIndex: 2 },
  ],
  3: [
    { x: 0, y: -16, scale: 0.62, zIndex: 1 },
    { x: -25, y: 13, scale: 0.58, zIndex: 2 },
    { x: 25, y: 13, scale: 0.58, zIndex: 3 },
  ],
  4: [
    { x: -18, y: -14, scale: 0.52, zIndex: 1 },
    { x: 18, y: -14, scale: 0.52, zIndex: 2 },
    { x: -18, y: 15, scale: 0.54, zIndex: 3 },
    { x: 18, y: 15, scale: 0.54, zIndex: 4 },
  ],
  5: [
    { x: -22, y: -17, scale: 0.44, zIndex: 1 },
    { x: 22, y: -17, scale: 0.44, zIndex: 2 },
    { x: -32, y: 17, scale: 0.43, zIndex: 3 },
    { x: 0, y: 20, scale: 0.46, zIndex: 4 },
    { x: 32, y: 17, scale: 0.43, zIndex: 5 },
  ],
  8: [
    ...[-21, -7, 7, 21].map((x, index) => ({ x, y: -11, scale: 0.4, zIndex: index + 1 })),
    ...[-21, -7, 7, 21].map((x, index) => ({ x, y: 12, scale: 0.4, zIndex: index + 5 })),
  ],
  12: [-17, 0, 17].flatMap((y, row) =>
    [-23, -8, 8, 23].map((x, column) => ({
      x,
      y,
      scale: 0.32,
      zIndex: row * 4 + column + 1,
    })),
  ),
  16: [-20, -7, 7, 20].flatMap((y, row) =>
    [-24, -8, 8, 24].map((x, column) => ({
      x,
      y,
      scale: 0.28,
      zIndex: row * 4 + column + 1,
    })),
  ),
  20: createGridLayout(20, 5, 0.235, 31, 24),
  30: createGridLayout(30, 6, 0.19, 32, 25),
};

const PALLET_LAYOUTS: Record<SellingUnitCount, UnitPlacement[]> = {
  1: [{ x: 0, y: 0, scale: 0.94, zIndex: 1 }],
  2: [
    { x: 15, y: -10, scale: 0.68, zIndex: 1 },
    { x: -15, y: 11, scale: 0.72, zIndex: 2 },
  ],
  3: [
    { x: 0, y: -17, scale: 0.58, zIndex: 1 },
    { x: -19, y: 14, scale: 0.61, zIndex: 2 },
    { x: 19, y: 14, scale: 0.61, zIndex: 3 },
  ],
  4: UNIT_LAYOUTS[4],
  5: [
    { x: -18, y: -17, scale: 0.46, zIndex: 1 },
    { x: 18, y: -17, scale: 0.46, zIndex: 2 },
    { x: -27, y: 17, scale: 0.48, zIndex: 3 },
    { x: 0, y: 20, scale: 0.51, zIndex: 4 },
    { x: 27, y: 17, scale: 0.48, zIndex: 5 },
  ],
  8: [
    ...[-27, -9, 9, 27].map((x, index) => ({
      x,
      y: -13,
      scale: 0.39,
      zIndex: index + 1,
    })),
    ...[-27, -9, 9, 27].map((x, index) => ({
      x: x + 3,
      y: 14,
      scale: 0.41,
      zIndex: index + 5,
    })),
  ],
  12: [-21, 0, 21].flatMap((y, row) =>
    [-27, -9, 9, 27].map((x, column) => ({
      x: x + (row === 1 ? 5 : 0),
      y,
      scale: 0.31 + row * 0.015,
      zIndex: row * 4 + column + 1,
    })),
  ),
  16: [3, 5, 5, 3].flatMap((count, row) =>
    createGridLayout(count, count, 0.29 + row * 0.008, row % 2 === 0 ? 22 : 31, 0).map(
      (placement, column) => ({
        ...placement,
        y: -24 + row * 16,
        zIndex: row * 5 + column + 1,
      }),
    ),
  ),
  20: createGridLayout(20, 5, 0.235, 31, 24),
  30: createGridLayout(30, 6, 0.19, 32, 25),
};

const LOOSE_WOOD_LAYOUTS: Record<SellingUnitCount, UnitPlacement[]> = {
  1: [{ x: 0, y: 0, scale: 0.96, zIndex: 1 }],
  2: [
    { x: 13, y: -6, scale: 0.72, zIndex: 1 },
    { x: -13, y: 9, scale: 0.74, zIndex: 2 },
  ],
  3: [
    { x: 0, y: -15, scale: 0.63, zIndex: 1 },
    { x: -18, y: 14, scale: 0.61, zIndex: 2 },
    { x: 18, y: 14, scale: 0.61, zIndex: 3 },
  ],
  4: UNIT_LAYOUTS[4],
  5: [
    { x: -17, y: -13, scale: 0.49, zIndex: 1, rotation: -2 },
    { x: 17, y: -15, scale: 0.48, zIndex: 2, rotation: 2 },
    { x: -27, y: 17, scale: 0.46, zIndex: 3, rotation: 1.5 },
    { x: 0, y: 20, scale: 0.5, zIndex: 4, rotation: -1 },
    { x: 27, y: 16, scale: 0.46, zIndex: 5, rotation: 2.5 },
  ],
  8: [
    { x: -20, y: -17, scale: 0.43, zIndex: 1, rotation: -1.8 },
    { x: 0, y: -19, scale: 0.45, zIndex: 2, rotation: 1.2 },
    { x: 20, y: -16, scale: 0.43, zIndex: 3, rotation: 1.8 },
    { x: -21, y: 3, scale: 0.46, zIndex: 4, rotation: 1.2 },
    { x: 0, y: 4, scale: 0.48, zIndex: 5, rotation: -1 },
    { x: 21, y: 3, scale: 0.46, zIndex: 6, rotation: 1.5 },
    { x: -11, y: 22, scale: 0.48, zIndex: 7, rotation: -1.3 },
    { x: 12, y: 22, scale: 0.48, zIndex: 8, rotation: 1.1 },
  ],
  12: UNIT_LAYOUTS[12],
  16: UNIT_LAYOUTS[16],
  20: UNIT_LAYOUTS[20],
  30: UNIT_LAYOUTS[30],
};

const PELLET_BAG_LAYOUTS: Record<SellingUnitCount, UnitPlacement[]> = {
  1: UNIT_LAYOUTS[1],
  2: UNIT_LAYOUTS[2],
  3: UNIT_LAYOUTS[3],
  4: UNIT_LAYOUTS[4],
  5: UNIT_LAYOUTS[5],
  8: UNIT_LAYOUTS[8],
  12: createGridLayout(12, 6, 0.28, 31, 12),
  16: createGridLayout(16, 8, 0.245, 32, 12),
  20: createGridLayout(20, 10, 0.215, 33, 12),
  30: createGridLayout(30, 10, 0.19, 33, 24),
};

const BIG_BAG_MAX_DISPLAY_COUNT = VISUALIZATION_LIMITS.firewood;

const BIG_BAG_CALIBRATION_ANCHORS: Partial<Record<number, BigBagCompositionProfile>> = {
  3: {
    columnX: 25.8,
    columnY: 11.8,
    depthX: -8,
    depthY: 18,
    stackHeight: 13,
    secondLevelX: 4,
    originX: -23.2,
    originY: -9.9,
    unitScale: 0.53,
  },
  5: {
    columnX: 17.6,
    columnY: 8.5,
    depthX: -8,
    depthY: 18,
    stackHeight: 25,
    secondLevelX: 4,
    originX: -36,
    originY: -13,
    unitScale: 0.38,
  },
  6: {
    columnX: 18.2,
    columnY: 8.6,
    depthX: -15.6,
    depthY: 8.4,
    stackHeight: 13,
    secondLevelX: 4,
    originX: -23.7,
    originY: -12.417,
    unitScale: 0.4,
  },
  8: {
    columnX: 19.2,
    columnY: 9,
    depthX: -15.2,
    depthY: 8.7,
    stackHeight: 13,
    secondLevelX: 4,
    originX: -21.7,
    originY: -16.6,
    unitScale: 0.39,
  },
  10: {
    columnX: 14.6,
    columnY: 6.8,
    depthX: -11.2,
    depthY: 6.8,
    stackHeight: 23,
    secondLevelX: 4,
    originX: -23,
    originY: -11,
    unitScale: 0.31,
  },
};

const BIG_BAG_CALIBRATION_COUNTS = [3, 5, 6, 8, 10] as const;

function interpolateBigBagProfile(
  start: BigBagCompositionProfile,
  end: BigBagCompositionProfile,
  progress: number,
): BigBagCompositionProfile {
  const interpolate = (startValue: number, endValue: number) =>
    startValue + (endValue - startValue) * progress;

  return {
    columnX: interpolate(start.columnX, end.columnX),
    columnY: interpolate(start.columnY, end.columnY),
    depthX: interpolate(start.depthX, end.depthX),
    depthY: interpolate(start.depthY, end.depthY),
    stackHeight: interpolate(start.stackHeight, end.stackHeight),
    secondLevelX: interpolate(start.secondLevelX, end.secondLevelX),
    originX: interpolate(start.originX, end.originX),
    originY: interpolate(start.originY, end.originY),
    unitScale: interpolate(start.unitScale, end.unitScale),
  };
}

function getCalibratedBigBagProfile(count: number) {
  const exactProfile = BIG_BAG_CALIBRATION_ANCHORS[count];
  if (exactProfile) return exactProfile;
  if (count < 3 || count > 10) return null;

  const upperCount = BIG_BAG_CALIBRATION_COUNTS.find((anchorCount) => anchorCount > count)!;
  const lowerCount = [...BIG_BAG_CALIBRATION_COUNTS]
    .reverse()
    .find((anchorCount) => anchorCount < count)!;
  const progress = (count - lowerCount) / (upperCount - lowerCount);

  return interpolateBigBagProfile(
    BIG_BAG_CALIBRATION_ANCHORS[lowerCount]!,
    BIG_BAG_CALIBRATION_ANCHORS[upperCount]!,
    progress,
  );
}

function createBigBagLayout(quantity: number): BigBagPlacement[] {
  const count = Math.min(BIG_BAG_MAX_DISPLAY_COUNT, Math.max(1, Math.trunc(quantity)));
  const columns = count <= 5 ? count : count <= 8 ? 4 : 5;
  const levelCapacity = columns * 2;

  return Array.from({ length: count }, (_, index) => {
    const level = Math.floor(index / levelCapacity);
    const levelIndex = index % levelCapacity;
    const depth = Math.floor(levelIndex / columns);
    const rowStart = level * levelCapacity + depth * columns;
    const itemsInRow = Math.min(columns, count - rowStart);
    const column = Math.floor((columns - itemsInRow) / 2) + (levelIndex % columns);

    return {
      column,
      depth,
      level,
      zIndex: level * 100 + depth * 10 + column + 1,
    };
  });
}

function bigBagScale(count: number) {
  if (count === 1) return 0.92;
  if (count === 2) return 0.64;
  if (count === 3) return 0.52;
  if (count === 4) return 0.43;
  if (count === 5) return 0.37;
  if (count === 6) return 0.35;
  if (count === 7) return 0.34;
  if (count === 8) return 0.33;
  if (count === 9) return 0.315;
  if (count === 10) return 0.3;
  if (count <= 15) return 0.27;
  return 0.24;
}

function getBigBagCompositionStyle(layout: BigBagPlacement[], count: number): CSSProperties {
  const calibratedProfile = getCalibratedBigBagProfile(count);
  if (calibratedProfile) {
    const percentage = (value: number) => `${Number(value.toFixed(3))}%`;

    return {
      "--bigbag-column-x": percentage(calibratedProfile.columnX),
      "--bigbag-column-y": percentage(calibratedProfile.columnY),
      "--bigbag-depth-x": percentage(calibratedProfile.depthX),
      "--bigbag-depth-y": percentage(calibratedProfile.depthY),
      "--bigbag-stack-height": percentage(calibratedProfile.stackHeight),
      "--bigbag-second-level-x": percentage(calibratedProfile.secondLevelX),
      "--bigbag-origin-x": percentage(calibratedProfile.originX),
      "--bigbag-origin-y": percentage(calibratedProfile.originY),
      "--bigbag-unit-scale": Number(calibratedProfile.unitScale.toFixed(3)),
    } as CSSProperties;
  }

  const compactProfile = count <= 5;
  const columnX = compactProfile ? 17.8 : 14.6;
  const columnY = compactProfile ? 9.1 : 6.8;
  const depthX = compactProfile ? -8 : -12;
  const depthY = compactProfile ? 18 : 7.1;
  const centerX = compactProfile ? 1.6 : 0.2;
  const centerY = compactProfile ? 5.2 : 6.15;
  const totals = layout.reduce(
    (sum, placement) => ({
      column: sum.column + placement.column,
      depth: sum.depth + placement.depth,
      level: sum.level + placement.level,
    }),
    { column: 0, depth: 0, level: 0 },
  );
  const divisor = layout.length || 1;
  const averageColumn = totals.column / divisor;
  const averageDepth = totals.depth / divisor;
  const averageLevel = totals.level / divisor;
  const stackHeight = 25;
  const secondLevelX = 4;
  const originX =
    centerX - averageColumn * columnX - averageDepth * depthX - averageLevel * secondLevelX;
  const originY =
    centerY - averageColumn * columnY - averageDepth * depthY + averageLevel * stackHeight;

  return {
    "--bigbag-column-x": `${count === 2 ? 32.8 : columnX}%`,
    "--bigbag-column-y": `${count === 2 ? 13.1 : columnY}%`,
    "--bigbag-depth-x": `${depthX}%`,
    "--bigbag-depth-y": `${depthY}%`,
    "--bigbag-stack-height": `${stackHeight}%`,
    "--bigbag-second-level-x": `${secondLevelX}%`,
    "--bigbag-origin-x": `${count === 2 ? -15.1 : Number(originX.toFixed(3))}%`,
    "--bigbag-origin-y": `${Number(originY.toFixed(3))}%`,
    "--bigbag-unit-scale": bigBagScale(count),
  } as CSSProperties;
}

export function ProductIllustration({
  categoryId,
  quantity,
  variant,
  title,
  imageLoading = "lazy",
  fetchPriority = "auto",
}: IllustrationProps) {
  const { scene } = resolveArtworkScene(categoryId, variant, quantity);
  const palletProfile =
    scene.renderMode === "modular-pallet" && scene.palletProfile
      ? getPalletSourceProfile(scene.palletProfile)
      : null;
  const palletComposition = useMemo(() => {
    if (!palletProfile) return null;
    return createPalletComposition(quantity, palletProfile);
  }, [palletProfile, quantity]);
  if (!scene.source) return null;

  if (scene.renderMode === "modular-pallet" && palletComposition && palletProfile) {
    const xPercentPerSourcePixel = 100 / scene.canvas.width;
    const yPercentPerSourcePixel = 100 / scene.canvas.height;
    const calibrationPrefix = palletProfile.calibrationVariablePrefix;
    const projectionPercentage = (value: number) => `${Number(value.toFixed(6))}%`;
    const projectionValues = {
      columnX: projectionPercentage(palletProfile.columnVector.x * xPercentPerSourcePixel),
      columnY: projectionPercentage(palletProfile.columnVector.y * yPercentPerSourcePixel),
      depthX: projectionPercentage(palletProfile.depthVector.x * xPercentPerSourcePixel),
      depthY: projectionPercentage(palletProfile.depthVector.y * yPercentPerSourcePixel),
      stackHeight: projectionPercentage(
        Math.abs(palletProfile.levelVector.y) * yPercentPerSourcePixel,
      ),
      secondLevelX: projectionPercentage(palletProfile.levelVector.x * xPercentPerSourcePixel),
    };
    const projectionStyle = calibrationPrefix
      ? {
          [`--${calibrationPrefix}-column-x`]: projectionValues.columnX,
          [`--${calibrationPrefix}-column-y`]: projectionValues.columnY,
          [`--${calibrationPrefix}-depth-x`]: projectionValues.depthX,
          [`--${calibrationPrefix}-depth-y`]: projectionValues.depthY,
          [`--${calibrationPrefix}-stack-height`]: projectionValues.stackHeight,
          [`--${calibrationPrefix}-second-level-x`]: projectionValues.secondLevelX,
          "--pallet-column-x": `var(--${calibrationPrefix}-column-x)`,
          "--pallet-column-y": `var(--${calibrationPrefix}-column-y)`,
          "--pallet-depth-x": `var(--${calibrationPrefix}-depth-x)`,
          "--pallet-depth-y": `var(--${calibrationPrefix}-depth-y)`,
          "--pallet-stack-height": `var(--${calibrationPrefix}-stack-height)`,
          "--pallet-second-level-x": `var(--${calibrationPrefix}-second-level-x)`,
        }
      : {
          "--pallet-column-x": projectionValues.columnX,
          "--pallet-column-y": projectionValues.columnY,
          "--pallet-depth-x": projectionValues.depthX,
          "--pallet-depth-y": projectionValues.depthY,
          "--pallet-stack-height": projectionValues.stackHeight,
          "--pallet-second-level-x": projectionValues.secondLevelX,
        };
    const unitWidthCqw = (scene.canvas.width / PALLET_COMPOSITION_CANVAS.width) * 100;
    const unitWidthCqh = (scene.canvas.width / PALLET_COMPOSITION_CANVAS.height) * 100;
    const palletStageStyle = {
      "--pallet-unit-cqw": `${unitWidthCqw}cqw`,
      "--pallet-unit-cqh": `${unitWidthCqh}cqh`,
      "--pallet-rendered-cqw": `${unitWidthCqw * palletComposition.scale}cqw`,
      "--pallet-rendered-cqh": `${unitWidthCqh * palletComposition.scale}cqh`,
      "--pallet-unit-aspect-ratio": `${scene.canvas.width} / ${scene.canvas.height}`,
      "--pallet-origin-x": `${((palletComposition.translation.x - PALLET_COMPOSITION_CANVAS.width / 2) / scene.canvas.width) * 100}%`,
      "--pallet-origin-y": `${((palletComposition.translation.y - PALLET_COMPOSITION_CANVAS.height / 2) / scene.canvas.height) * 100}%`,
      ...projectionStyle,
      "--pallet-scale": palletComposition.scale,
    } as CSSProperties;

    return (
      <div
        role="img"
        aria-label={title}
        data-product-artwork
        data-artwork-scene={scene.id}
        data-artwork-key={scene.artworkKey}
        data-artwork-render-mode="modular-pallet"
        data-pallet-profile={palletComposition.profileId}
        data-pallet-requested-count={palletComposition.requestedCount}
        data-pallet-display-count={palletComposition.displayCount}
        data-pallet-representative-count={palletComposition.representativeCount}
        data-pallet-scale-boost={palletComposition.scaleBoost}
        data-pallet-presentation-scale={palletComposition.presentationScaleMultiplier}
        data-safe-inset={scene.safeInset}
        className="flex h-full w-full items-center justify-center"
      >
        <div
          aria-hidden
          data-pallet-composition
          data-pallet-calibration-scope={calibrationPrefix}
          style={palletStageStyle}
          className="relative h-full w-full select-none overflow-visible"
        >
          <div data-pallet-cluster>
            <div data-pallet-raster-grid>
              {palletComposition.placements.map((placement) => {
                const palletStyle = {
                  "--pallet-x": palletOffsetExpression([
                    ["--pallet-column-x", placement.column, "+"],
                    ["--pallet-depth-x", placement.depth, "+"],
                    ["--pallet-second-level-x", placement.level > 0 ? 1 : 0, "+"],
                  ]),
                  "--pallet-y": palletOffsetExpression([
                    ["--pallet-column-y", placement.column, "+"],
                    ["--pallet-depth-y", placement.depth, "+"],
                    ["--pallet-stack-height", placement.level, "-"],
                  ]),
                  "--pallet-z": placement.zIndex,
                  ...(palletProfile?.maskSource
                    ? {
                        WebkitMaskImage: `url(${palletProfile.maskSource})`,
                        maskImage: `url(${palletProfile.maskSource})`,
                        WebkitMaskPosition: "center",
                        maskPosition: "center",
                        WebkitMaskRepeat: "no-repeat",
                        maskRepeat: "no-repeat",
                        WebkitMaskSize: "100% 100%",
                        maskSize: "100% 100%",
                      }
                    : {}),
                } as CSSProperties;

                return (
                  <img
                    key={`${placement.column}-${placement.depth}-${placement.level}`}
                    data-pallet-unit
                    data-pallet-column={placement.column}
                    data-pallet-depth={placement.depth}
                    data-pallet-level={placement.level}
                    data-pallet-z-index={placement.zIndex}
                    data-pallet-mask-source={palletProfile?.maskSource}
                    src={scene.source}
                    alt=""
                    loading={imageLoading}
                    fetchPriority={fetchPriority}
                    decoding="async"
                    draggable={false}
                    style={palletStyle}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (scene.renderMode === "master") {
    const safeTransform = calculateSafeArtworkTransform(
      scene,
      getArtworkRequestedScale(scene, variant),
    );
    const previewScale = scene.previewScale ?? 1;
    const bottomAnchor = scene.bottomAnchor ?? { x: 0.5, y: 0.5 };
    const srcSet = scene.responsiveSources
      ?.map(({ source, width }) => `${source} ${width}w`)
      .join(", ");

    return (
      <div
        role="img"
        aria-label={title}
        data-product-artwork
        data-artwork-scene={scene.id}
        data-artwork-key={scene.artworkKey}
        data-artwork-render-mode="master"
        data-safe-inset={scene.safeInset}
        data-preview-scale={previewScale}
        data-bottom-anchor={`${bottomAnchor.x},${bottomAnchor.y}`}
        className="flex h-full w-full items-center justify-center"
      >
        <img
          src={scene.source}
          srcSet={srcSet}
          sizes={srcSet ? scene.responsiveSizes : undefined}
          alt=""
          aria-hidden
          width={scene.canvas.width}
          height={scene.canvas.height}
          loading={imageLoading}
          fetchPriority={fetchPriority}
          draggable={false}
          decoding="async"
          className="max-h-full max-w-full select-none object-contain"
          style={{
            transform: `${safeTransform.transform} scale(${previewScale})`,
            transformOrigin: "center",
            filter: scene.filter,
            ...(scene.styleVersion === "v36"
              ? {
                  maskImage:
                    "linear-gradient(to right, transparent, black 8%, black 92%, transparent), linear-gradient(to bottom, transparent, black 8%, black 92%, transparent)",
                  maskComposite: "intersect",
                }
              : {}),
          }}
        />
      </div>
    );
  }

  const isBigBag = variant.illustrationVariant === "firewood-bag";
  const unitCount = isBigBag
    ? Math.min(BIG_BAG_MAX_DISPLAY_COUNT, Math.max(1, Math.trunc(quantity)))
    : (scene.legacyUnitCount ?? getSellingUnitCount(quantity, variant.illustrationVariant));
  const bigBagLayout = isBigBag ? createBigBagLayout(unitCount) : null;
  const sellingUnitCount = unitCount as SellingUnitCount;
  const layout = PALLET_VARIANTS.has(variant.illustrationVariant)
    ? PALLET_LAYOUTS[sellingUnitCount]
    : variant.illustrationVariant === "pellets-bag" || variant.illustrationVariant === "pellets-set"
      ? PELLET_BAG_LAYOUTS[sellingUnitCount]
      : variant.illustrationVariant === "firewood-loose"
        ? LOOSE_WOOD_LAYOUTS[sellingUnitCount]
        : UNIT_LAYOUTS[sellingUnitCount];

  if (bigBagLayout) {
    const compositionStyle = getBigBagCompositionStyle(bigBagLayout, unitCount);
    const responsiveFit = unitCount === 7 || unitCount === 9;
    // A square coordinate plane keeps the calibrated projection independent of
    // viewport aspect ratio. Fit the complete source canvases, without clipping.
    if (responsiveFit) {
      const profile = getCalibratedBigBagProfile(unitCount)!;
      const centers = bigBagLayout.map((p) => ({
        x:
          profile.originX +
          p.column * profile.columnX +
          p.depth * profile.depthX +
          p.level * profile.secondLevelX,
        y:
          profile.originY +
          p.column * profile.columnY +
          p.depth * profile.depthY -
          p.level * profile.stackHeight,
      }));
      const left = Math.min(...centers.map((p) => p.x)) - profile.unitScale * 50;
      const right = Math.max(...centers.map((p) => p.x)) + profile.unitScale * 50;
      const top = Math.min(...centers.map((p) => p.y)) - profile.unitScale * 50;
      const bottom = Math.max(...centers.map((p) => p.y)) + profile.unitScale * 50;
      Object.assign(compositionStyle, {
        "--bigbag-fit-scale": Math.min(1, 94 / (right - left), 94 / (bottom - top)),
        "--bigbag-fit-x": `${-(left + right) / 2}%`,
        "--bigbag-fit-y": `${-(top + bottom) / 2}%`,
      });
    }

    return (
      <div
        role="img"
        aria-label={title}
        data-product-artwork
        data-artwork-scene={scene.id}
        data-artwork-key={scene.artworkKey}
        data-artwork-render-mode="bigbag-composition"
        data-bigbag-composition
        data-bigbag-responsive={responsiveFit || undefined}
        data-selling-unit-count={unitCount}
        data-requested-unit-count={Math.max(1, Math.trunc(quantity))}
        className="relative h-full w-full"
        style={compositionStyle}
      >
        <div data-bigbag-canvas className={responsiveFit ? "absolute" : "absolute inset-0"}>
          {bigBagLayout.map((placement, index) => {
            const style = {
              "--artwork-x": palletOffsetExpression([
                ["--bigbag-origin-x", 1, "+"],
                ["--bigbag-column-x", placement.column, "+"],
                ["--bigbag-depth-x", placement.depth, "+"],
                ["--bigbag-second-level-x", placement.level, "+"],
              ]),
              "--artwork-y": palletOffsetExpression([
                ["--bigbag-origin-y", 1, "+"],
                ["--bigbag-column-y", placement.column, "+"],
                ["--bigbag-depth-y", placement.depth, "+"],
                ["--bigbag-stack-height", placement.level, "-"],
              ]),
              "--artwork-scale": "var(--bigbag-unit-scale)",
              zIndex: placement.zIndex,
            } as CSSProperties;

            return (
              <div
                key={`${placement.column}-${placement.depth}-${placement.level}-${index}`}
                aria-hidden
                data-selling-unit
                data-bigbag-unit
                data-bigbag-column={placement.column}
                data-bigbag-depth={placement.depth}
                data-bigbag-level={placement.level}
                className="absolute inset-0 flex items-center justify-center"
                style={style}
              >
                <img
                  src={scene.source}
                  alt=""
                  draggable={false}
                  decoding="async"
                  className="h-full w-full select-none object-contain"
                />
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div
      role="img"
      aria-label={title}
      data-product-artwork
      data-artwork-scene={scene.id}
      data-artwork-key={scene.artworkKey}
      data-artwork-render-mode="legacy-units"
      data-selling-unit-count={unitCount}
      className="relative h-full w-full"
    >
      {layout.map((placement, index) => {
        const style = {
          "--artwork-x": `${placement.x}%`,
          "--artwork-y": `${placement.y}%`,
          "--artwork-scale": placement.scale,
          "--artwork-rotation": `${placement.rotation ?? 0}deg`,
          zIndex: placement.zIndex,
        } as CSSProperties;

        return (
          <div
            key={`${placement.x}-${placement.y}-${index}`}
            aria-hidden
            data-selling-unit
            className="absolute inset-0 flex items-center justify-center"
            style={style}
          >
            <img
              src={scene.source}
              alt=""
              draggable={false}
              decoding="async"
              className="h-full w-full select-none object-contain"
            />
          </div>
        );
      })}
    </div>
  );
}
