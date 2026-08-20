export type PalletSlot = {
  column: number;
  depth: number;
  level: 0 | 1;
};

export type PalletBounds = {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
};

export type PalletPlacement = PalletSlot & {
  x: number;
  y: number;
  viewDepth: number;
  zIndex: number;
  matrix: readonly [number, number, number, number, number, number];
};

export type PalletComposition = {
  representativeCount: number;
  placements: readonly PalletPlacement[];
  rawBounds: PalletBounds;
  scale: number;
  translation: { x: number; y: number };
};

export const PALLET_COMPOSITION_CANVAS = { width: 1536, height: 1024 } as const;
export const PALLET_UNIT_CANVAS = { width: 1254, height: 1254 } as const;
export const PALLET_UNIT_ALPHA_BOUNDS = {
  left: 142,
  top: 83,
  right: 1112,
  bottom: 1172,
} as const;

const SAFE_INSET = 0.07;
const CONTOUR_RESERVE = 8;
const AZIMUTH_RADIANS = (40 * Math.PI) / 180;

const COLUMN_VECTOR = { x: 527.432, y: 200.922 } as const;
const DEPTH_VECTOR = { x: -442.568, y: 239.449 } as const;
const LEVEL_VECTOR = { x: 0, y: -648.629 } as const;

const BASE_2_X_2: readonly PalletSlot[] = [
  { column: 0, depth: 0, level: 0 },
  { column: 1, depth: 0, level: 0 },
  { column: 0, depth: 1, level: 0 },
  { column: 1, depth: 1, level: 0 },
];

const SLOT_LAYOUTS: Readonly<Record<number, readonly PalletSlot[]>> = {
  1: [{ column: 0, depth: 0, level: 0 }],
  2: [
    { column: 0, depth: 0, level: 0 },
    { column: 1, depth: 0, level: 0 },
  ],
  3: [
    { column: 0, depth: 0, level: 0 },
    { column: 1, depth: 0, level: 0 },
    { column: 0.5, depth: 0, level: 1 },
  ],
  6: [...BASE_2_X_2, { column: 0, depth: 0.5, level: 1 }, { column: 1, depth: 0.5, level: 1 }],
  9: [
    ...[0, 1, 2].flatMap((column) => [
      { column, depth: 0, level: 0 as const },
      { column, depth: 1, level: 0 as const },
    ]),
    ...[0, 1, 2].map((column) => ({ column, depth: 0.5, level: 1 as const })),
  ],
  12: [
    ...[0, 1, 2, 3].flatMap((column) => [
      { column, depth: 0, level: 0 as const },
      { column, depth: 1, level: 0 as const },
    ]),
    ...[0, 1, 2, 3].map((column) => ({ column, depth: 0.5, level: 1 as const })),
  ],
  16: [
    ...[0, 1, 2, 3].flatMap((column) =>
      [0, 1, 2].map((depth) => ({ column, depth, level: 0 as const })),
    ),
    ...[0, 1, 2, 3].map((column) => ({ column, depth: 1, level: 1 as const })),
  ],
};

function almostEqual(left: number, right: number) {
  return Math.abs(left - right) < 0.0001;
}

export function getPalletRepresentativeCount(quantity: number) {
  if (quantity <= 1) return 1;
  if (quantity === 2) return 2;
  if (quantity <= 4) return 3;
  if (quantity <= 8) return 6;
  if (quantity <= 11) return 9;
  if (quantity <= 15) return 12;
  return 16;
}

export function getPalletSlots(representativeCount: number): readonly PalletSlot[] {
  const slots = SLOT_LAYOUTS[representativeCount];
  if (!slots) throw new Error(`Unsupported pallet representative count: ${representativeCount}`);
  return slots;
}

export function isPalletSlotSupported(slot: PalletSlot, slots: readonly PalletSlot[]) {
  if (slot.level === 0) return true;

  const bases = slots.filter((candidate) => candidate.level === 0);
  const hasBase = (column: number, depth: number) =>
    bases.some(
      (candidate) => almostEqual(candidate.column, column) && almostEqual(candidate.depth, depth),
    );

  if (hasBase(slot.column, slot.depth)) return true;

  const left = Math.floor(slot.column);
  const right = Math.ceil(slot.column);
  if (!almostEqual(left, right) && hasBase(left, slot.depth) && hasBase(right, slot.depth)) {
    return true;
  }

  const back = Math.floor(slot.depth);
  const front = Math.ceil(slot.depth);
  return !almostEqual(back, front) && hasBase(slot.column, back) && hasBase(slot.column, front);
}

function projectSlot(slot: PalletSlot) {
  return {
    ...slot,
    x: slot.column * COLUMN_VECTOR.x + slot.depth * DEPTH_VECTOR.x + slot.level * LEVEL_VECTOR.x,
    y: slot.column * COLUMN_VECTOR.y + slot.depth * DEPTH_VECTOR.y + slot.level * LEVEL_VECTOR.y,
    viewDepth: slot.column * Math.sin(AZIMUTH_RADIANS) + slot.depth * Math.cos(AZIMUTH_RADIANS),
  };
}

function boundsForProjectedSlots(projected: readonly ReturnType<typeof projectSlot>[]) {
  let left = Number.POSITIVE_INFINITY;
  let top = Number.POSITIVE_INFINITY;
  let right = Number.NEGATIVE_INFINITY;
  let bottom = Number.NEGATIVE_INFINITY;

  for (const placement of projected) {
    left = Math.min(left, PALLET_UNIT_ALPHA_BOUNDS.left + placement.x);
    top = Math.min(top, PALLET_UNIT_ALPHA_BOUNDS.top + placement.y);
    right = Math.max(right, PALLET_UNIT_ALPHA_BOUNDS.right + placement.x);
    bottom = Math.max(bottom, PALLET_UNIT_ALPHA_BOUNDS.bottom + placement.y);
  }

  return { left, top, right, bottom, width: right - left, height: bottom - top };
}

export function createPalletComposition(quantity: number): PalletComposition {
  const representativeCount = getPalletRepresentativeCount(quantity);
  const slots = getPalletSlots(representativeCount);
  const projected = slots.map(projectSlot).sort((left, right) => {
    const depthDifference = left.viewDepth - right.viewDepth;
    if (Math.abs(depthDifference) > 0.0001) return depthDifference;
    if (left.level !== right.level) return left.level - right.level;
    return left.x - right.x;
  });
  const rawBounds = boundsForProjectedSlots(projected);
  const usableWidth = PALLET_COMPOSITION_CANVAS.width * (1 - 2 * SAFE_INSET) - 2 * CONTOUR_RESERVE;
  const usableHeight =
    PALLET_COMPOSITION_CANVAS.height * (1 - 2 * SAFE_INSET) - 2 * CONTOUR_RESERVE;
  const scale = Math.min(2, usableWidth / rawBounds.width, usableHeight / rawBounds.height);
  const translation = {
    x: PALLET_COMPOSITION_CANVAS.width / 2 - (scale * (rawBounds.left + rawBounds.right)) / 2,
    y: PALLET_COMPOSITION_CANVAS.height / 2 - (scale * (rawBounds.top + rawBounds.bottom)) / 2,
  };

  const placements = projected.map((placement, index) => ({
    ...placement,
    zIndex: index + 1,
    matrix: [
      scale,
      0,
      0,
      scale,
      translation.x + scale * placement.x,
      translation.y + scale * placement.y,
    ] as const,
  }));

  return { representativeCount, placements, rawBounds, scale, translation };
}
