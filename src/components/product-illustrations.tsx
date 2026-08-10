import type { CSSProperties } from "react";
import {
  getSellingUnitCount,
  getSellingUnitTransform,
  getTimberArtworkFilter,
  getTimberArtworkTransform,
  resolveProductArtwork,
  type SellingUnitCount,
} from "@/lib/product-artwork";
import type { ProductVariant } from "@/lib/product-catalog";

type IllustrationProps = {
  categoryId: string;
  quantity: number;
  variant: ProductVariant;
  title: string;
};

type UnitPlacement = {
  x: number;
  y: number;
  scale: number;
  zIndex: number;
  rotation?: number;
};

const PALLET_VARIANTS = new Set(["firewood-pallet", "pallet-16", "pallet-25", "pallet-33"]);

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

const SLAB_CLUSTER_LAYOUT: UnitPlacement[] = [
  { x: 15, y: -11, scale: 0.72, zIndex: 1 },
  { x: -15, y: 12, scale: 0.75, zIndex: 2 },
];

const SLAB_UNIT_LAYOUTS: Partial<Record<SellingUnitCount, UnitPlacement[]>> = {
  3: [
    { x: 20, y: -12, scale: 0.57, zIndex: 1, rotation: 0.5 },
    { x: 0, y: 1, scale: 0.6, zIndex: 2, rotation: -0.4 },
    { x: -20, y: 14, scale: 0.59, zIndex: 3, rotation: 0.4 },
  ],
  4: [
    { x: -18, y: -14, scale: 0.5, zIndex: 1 },
    { x: 18, y: -14, scale: 0.5, zIndex: 2 },
    { x: -18, y: 15, scale: 0.52, zIndex: 3 },
    { x: 18, y: 15, scale: 0.52, zIndex: 4 },
  ],
};

export function ProductIllustration({ categoryId, quantity, variant, title }: IllustrationProps) {
  const artwork = resolveProductArtwork(categoryId, variant, quantity);

  if (!artwork.source) return null;

  if (artwork.kind === "timber") {
    return (
      <div data-product-artwork data-artwork-key={artwork.key} className="h-full w-full">
        <img
          src={artwork.source}
          alt={title}
          draggable={false}
          decoding="async"
          className="h-full w-full select-none object-contain"
          style={{
            transform: getTimberArtworkTransform(categoryId, variant, artwork.key),
            filter: getTimberArtworkFilter(categoryId, artwork.key),
          }}
        />
      </div>
    );
  }

  if (artwork.kind === "composition") {
    const isExpandedSlabPile = quantity >= 9 && variant.illustrationVariant.startsWith("slabs-");
    const compositionLayout = isExpandedSlabPile ? SLAB_CLUSTER_LAYOUT : null;

    return (
      <div
        role="img"
        aria-label={title}
        data-product-artwork
        data-artwork-key={artwork.key}
        data-product-composition
        data-composition-unit-count={compositionLayout?.length}
        className="relative flex h-full w-full items-center justify-center"
      >
        {compositionLayout?.map((placement, index) => (
          <div
            key={`${placement.x}-${placement.y}-${index}`}
            aria-hidden
            data-composition-group
            className="absolute inset-0 flex items-center justify-center"
            style={
              {
                "--artwork-x": `${placement.x}%`,
                "--artwork-y": `${placement.y}%`,
                "--artwork-scale": placement.scale,
                "--artwork-rotation": `${placement.rotation ?? 0}deg`,
                zIndex: placement.zIndex,
              } as CSSProperties
            }
          >
            <img
              src={artwork.source}
              alt=""
              draggable={false}
              decoding="async"
              className="h-full w-full select-none object-contain"
              style={{ transform: getSellingUnitTransform(variant) }}
            />
          </div>
        )) ?? (
          <img
            src={artwork.source}
            alt=""
            aria-hidden
            draggable={false}
            decoding="async"
            className="h-full w-full select-none object-contain"
            style={{ transform: getSellingUnitTransform(variant) }}
          />
        )}
      </div>
    );
  }

  const unitCount = getSellingUnitCount(quantity, variant.illustrationVariant);
  const unitTransform = getSellingUnitTransform(variant);
  const isSlab = variant.illustrationVariant.startsWith("slabs-");
  const layout =
    isSlab && SLAB_UNIT_LAYOUTS[unitCount]
      ? SLAB_UNIT_LAYOUTS[unitCount]
      : PALLET_VARIANTS.has(variant.illustrationVariant)
        ? PALLET_LAYOUTS[unitCount]
        : variant.illustrationVariant === "pellets-bag" ||
            variant.illustrationVariant === "pellets-set"
          ? PELLET_BAG_LAYOUTS[unitCount]
          : variant.illustrationVariant === "firewood-loose"
            ? LOOSE_WOOD_LAYOUTS[unitCount]
            : UNIT_LAYOUTS[unitCount];

  return (
    <div
      role="img"
      aria-label={title}
      data-product-artwork
      data-artwork-key={artwork.key}
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
              src={artwork.source}
              alt=""
              draggable={false}
              decoding="async"
              className="h-full w-full select-none object-contain"
              style={{ transform: unitTransform }}
            />
          </div>
        );
      })}
    </div>
  );
}
