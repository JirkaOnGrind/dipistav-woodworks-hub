import { VISUALIZATION_LIMITS } from "@/lib/visualization-limits";

export type PalletSlot = {
  column: number;
  depth: number;
  level: number;
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
  cssTranslate: { xPercent: number; yPercent: number };
};

export type PalletComposition = {
  profileId: PalletSourceProfileId;
  requestedCount: number;
  displayCount: number;
  /** @deprecated Use displayCount. Kept for existing artwork metadata consumers. */
  representativeCount: number;
  placements: readonly PalletPlacement[];
  rawBounds: PalletBounds;
  safeInset: number;
  scaleBoost: number;
  presentationScaleMultiplier: number;
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

const DEFAULT_SAFE_INSET = 0.07;
const CONTOUR_RESERVE = 8;
const MAX_PALLET_DISPLAY_COUNT = VISUALIZATION_LIMITS.pallets;
const SECOND_LAYER_START = 7;
const SECOND_LAYER_SCALE_BOOST = 1.08;

export const PALLET_DEPTH_SORT_VECTOR = {
  column: 1,
  depth: 1,
  level: 1,
} as const;

// Each source illustration has its own projected footprint. These vectors are calibrated from
// the visible corner-post seams (top and pallet base), so adjacent copies share one contact plane
// instead of drifting apart when a generic isometric step is applied to dissimilar artwork.
const FIREWOOD_16_COLUMN_VECTOR = { x: 413, y: 220 } as const;
const FIREWOOD_16_DEPTH_VECTOR = { x: -499, y: 228 } as const;
const FIREWOOD_V25_COLUMN_VECTOR = { x: 500, y: 208 } as const;
const FIREWOOD_V25_DEPTH_VECTOR = { x: -426, y: 229 } as const;
// Firewood calibration is stored in the 1000 px source coordinate system so it stays
// independent of the auto-fit scale. The two footprint measurements are weighted by
// rendered scale squared (0.67^2 and 0.48^2); only the 12-pallet state constrains height.
export const DREVO1_COLUMN_VECTOR = { x: 459.129, y: 188.07 } as const;
export const DREVO1_DEPTH_VECTOR = { x: -451.713, y: 255.357 } as const;
export const DREVO1_LEVEL_VECTOR = { x: 0, y: -508 } as const;
export const PALLET_LEVEL_VECTOR = { x: 0, y: -648.629 } as const;
export const PELLET_PALLET_CONTACT_OVERLAP_PX = 20;
const PELLET_PALLET_LEVEL_VECTOR = {
  x: 0,
  y: -659.997 + PELLET_PALLET_CONTACT_OVERLAP_PX,
} as const;
// The 3/5/12-pallet measurements are fitted by their visible adjacency count:
// columns use 2/3/8 edges, depth uses 2/6 edges, and only 12 pallets constrain level 2.
const PELLETS_975_COLUMN_VECTOR = { x: 679.761476, y: 258.143181 } as const;
const PELLETS_975_DEPTH_VECTOR = { x: -412.966713, y: 399.885681 } as const;
const PELLETS_975_LEVEL_VECTOR = { x: 14.07, y: -457.335419 } as const;
const FIREWOOD_16_LEVEL_VECTOR = { x: 0, y: -672.997 } as const;

// One shared projection keeps all four Dříví variants aligned. The footprint stays
// unchanged; the upper level follows the dedicated 12-pallet calibration.
const DRIVI_PALLET_CANVAS = { width: 2048, height: 2048 } as const;
const DRIVI_PALLET_COLUMN_VECTOR = { x: 980.992, y: 405.504 } as const;
const DRIVI_PALLET_DEPTH_VECTOR = { x: -823.296, y: 432.128 } as const;
const DRIVI_PALLET_LEVEL_VECTOR = { x: 86.016, y: -1198.08 } as const;
const DRIVI_PALLET_MODULE_HEIGHT = 1198.08;
const DRIVI_PALLET_CONTACT_ANCHORS = {
  base: { x: 1024, y: 2002 },
  top: { x: 1024, y: 803.92 },
} as const;

export const EURO_PALLET_FOOTPRINT_MM = { length: 1200, width: 800 } as const;

export type PalletPhysicalGeometry = {
  footprintMm: { length: number; width: number };
  /** Unknown until a product has a verified physical specification. */
  loadedHeightMm: number | null;
};

export type PalletContactPlanes = {
  /** Normalized local module coordinates used by the projection profile. */
  baseZ: 0;
  topZ: 1;
};

export type PalletContactAnchors = {
  base: { x: number; y: number };
  top: { x: number; y: number };
};

export type PalletSourceProfile = {
  id: string;
  source: string;
  maskSource?: string;
  calibrationVariablePrefix?:
    "pallet-25cm-1prm" | "pallet-25cm-16prm" | "pallet-33cm-1prm" | "pallet-33cm-16prm";
  presentationScaleMultiplier?: number;
  canvas: { width: number; height: number };
  alphaBounds: { left: number; top: number; right: number; bottom: number };
  physicalGeometry: PalletPhysicalGeometry;
  contactPlanes: PalletContactPlanes;
  contactAnchors: PalletContactAnchors;
  projectedModuleHeightPx: number;
  columnVector: { x: number; y: number };
  depthVector: { x: number; y: number };
  levelVector: { x: number; y: number };
  safeInset: number;
};

const EURO_PALLET_GEOMETRY = {
  footprintMm: EURO_PALLET_FOOTPRINT_MM,
  loadedHeightMm: null,
} as const satisfies PalletPhysicalGeometry;

const MODULE_CONTACT_PLANES = { baseZ: 0, topZ: 1 } as const satisfies PalletContactPlanes;

export const PALLET_SOURCE_PROFILES = {
  "firewood-drevo1": {
    id: "firewood-drevo1",
    source: "/images/illustrations/configurator-v27/drevo1.webp",
    canvas: { width: 1000, height: 1000 },
    alphaBounds: { left: 64, top: 34, right: 907, bottom: 968 },
    physicalGeometry: EURO_PALLET_GEOMETRY,
    contactPlanes: MODULE_CONTACT_PLANES,
    contactAnchors: { base: { x: 508, y: 967 }, top: { x: 508, y: 459 } },
    projectedModuleHeightPx: 508,
    columnVector: DREVO1_COLUMN_VECTOR,
    depthVector: DREVO1_DEPTH_VECTOR,
    levelVector: DREVO1_LEVEL_VECTOR,
    safeInset: 0.04,
  },
  "firewood-drevo1-25": {
    id: "firewood-drevo1-25",
    source: "/images/illustrations/configurator-v27/drevo1-25cm.webp",
    maskSource: "/images/illustrations/configurator-v27/drevo1.webp",
    canvas: { width: 1254, height: 1254 },
    alphaBounds: { left: 80.256, top: 42.636, right: 1137.378, bottom: 1213.872 },
    physicalGeometry: EURO_PALLET_GEOMETRY,
    contactPlanes: MODULE_CONTACT_PLANES,
    contactAnchors: { base: { x: 637.032, y: 1212.618 }, top: { x: 637.032, y: 575.586 } },
    projectedModuleHeightPx: 637.032,
    columnVector: { x: 575.747766, y: 235.83978 },
    depthVector: { x: -566.448102, y: 320.217678 },
    levelVector: { x: 0, y: -637.032 },
    safeInset: 0.04,
  },
  "firewood-16": {
    id: "firewood-16",
    source: "/images/illustrations/configurator-v22/firewood-pallet-16-strict-v22.webp",
    canvas: PALLET_UNIT_CANVAS,
    alphaBounds: { left: 134, top: 64, right: 1127, bottom: 1197 },
    physicalGeometry: EURO_PALLET_GEOMETRY,
    contactPlanes: MODULE_CONTACT_PLANES,
    contactAnchors: { base: { x: 627, y: 1197 }, top: { x: 627, y: 537 } },
    projectedModuleHeightPx: 660,
    columnVector: FIREWOOD_16_COLUMN_VECTOR,
    depthVector: FIREWOOD_16_DEPTH_VECTOR,
    levelVector: { x: 0, y: -660 },
    safeInset: DEFAULT_SAFE_INSET,
  },
  "firewood-25": {
    id: "firewood-25",
    source: "/images/illustrations/configurator-v31/firewood-pallet-25cm-final-v31.webp",
    calibrationVariablePrefix: "pallet-25cm-1prm",
    canvas: DRIVI_PALLET_CANVAS,
    alphaBounds: { left: 248, top: 0, right: 1975, bottom: 2002 },
    physicalGeometry: EURO_PALLET_GEOMETRY,
    contactPlanes: MODULE_CONTACT_PLANES,
    contactAnchors: DRIVI_PALLET_CONTACT_ANCHORS,
    projectedModuleHeightPx: DRIVI_PALLET_MODULE_HEIGHT,
    columnVector: DRIVI_PALLET_COLUMN_VECTOR,
    depthVector: DRIVI_PALLET_DEPTH_VECTOR,
    levelVector: DRIVI_PALLET_LEVEL_VECTOR,
    safeInset: DEFAULT_SAFE_INSET,
  },
  "firewood-33": {
    id: "firewood-33",
    source: "/images/illustrations/configurator-v25/firewood-pallet-1prm-33-split-v25.webp",
    canvas: PALLET_UNIT_CANVAS,
    alphaBounds: { left: 133, top: 88, right: 1120, bottom: 1166 },
    physicalGeometry: EURO_PALLET_GEOMETRY,
    contactPlanes: MODULE_CONTACT_PLANES,
    contactAnchors: { base: { x: 627, y: 1166 }, top: { x: 627, y: 526 } },
    projectedModuleHeightPx: 640,
    columnVector: FIREWOOD_V25_COLUMN_VECTOR,
    depthVector: FIREWOOD_V25_DEPTH_VECTOR,
    levelVector: PELLET_PALLET_LEVEL_VECTOR,
    safeInset: DEFAULT_SAFE_INSET,
  },
  "firewood-33-1prm": {
    id: "firewood-33-1prm",
    source: "/images/illustrations/configurator-v31/firewood-pallet-33cm-final-v31.webp",
    calibrationVariablePrefix: "pallet-33cm-1prm",
    canvas: DRIVI_PALLET_CANVAS,
    alphaBounds: { left: 243, top: 0, right: 1975, bottom: 2002 },
    physicalGeometry: EURO_PALLET_GEOMETRY,
    contactPlanes: MODULE_CONTACT_PLANES,
    contactAnchors: DRIVI_PALLET_CONTACT_ANCHORS,
    projectedModuleHeightPx: DRIVI_PALLET_MODULE_HEIGHT,
    columnVector: DRIVI_PALLET_COLUMN_VECTOR,
    depthVector: DRIVI_PALLET_DEPTH_VECTOR,
    levelVector: DRIVI_PALLET_LEVEL_VECTOR,
    safeInset: DEFAULT_SAFE_INSET,
  },
  "firewood-25-16": {
    id: "firewood-25-16",
    source: "/images/illustrations/configurator-v31/firewood-pallet-25cm-final-v31.webp",
    calibrationVariablePrefix: "pallet-25cm-16prm",
    presentationScaleMultiplier: 1.07,
    canvas: DRIVI_PALLET_CANVAS,
    alphaBounds: { left: 248, top: 0, right: 1975, bottom: 2002 },
    physicalGeometry: EURO_PALLET_GEOMETRY,
    contactPlanes: MODULE_CONTACT_PLANES,
    contactAnchors: DRIVI_PALLET_CONTACT_ANCHORS,
    projectedModuleHeightPx: DRIVI_PALLET_MODULE_HEIGHT,
    columnVector: DRIVI_PALLET_COLUMN_VECTOR,
    depthVector: DRIVI_PALLET_DEPTH_VECTOR,
    levelVector: DRIVI_PALLET_LEVEL_VECTOR,
    safeInset: DEFAULT_SAFE_INSET,
  },
  "firewood-33-16": {
    id: "firewood-33-16",
    source: "/images/illustrations/configurator-v25/firewood-pallet-16prm-33-split-v25.webp",
    canvas: PALLET_UNIT_CANVAS,
    alphaBounds: { left: 133, top: 55, right: 1120, bottom: 1166 },
    physicalGeometry: EURO_PALLET_GEOMETRY,
    contactPlanes: MODULE_CONTACT_PLANES,
    contactAnchors: { base: { x: 627, y: 1166 }, top: { x: 627, y: 493 } },
    projectedModuleHeightPx: 673,
    columnVector: FIREWOOD_V25_COLUMN_VECTOR,
    depthVector: FIREWOOD_V25_DEPTH_VECTOR,
    levelVector: FIREWOOD_16_LEVEL_VECTOR,
    safeInset: DEFAULT_SAFE_INSET,
  },
  "firewood-33-16prm": {
    id: "firewood-33-16prm",
    source: "/images/illustrations/configurator-v31/firewood-pallet-33cm-final-v31.webp",
    calibrationVariablePrefix: "pallet-33cm-16prm",
    presentationScaleMultiplier: 1.07,
    canvas: DRIVI_PALLET_CANVAS,
    alphaBounds: { left: 243, top: 0, right: 1975, bottom: 2002 },
    physicalGeometry: EURO_PALLET_GEOMETRY,
    contactPlanes: MODULE_CONTACT_PLANES,
    contactAnchors: DRIVI_PALLET_CONTACT_ANCHORS,
    projectedModuleHeightPx: DRIVI_PALLET_MODULE_HEIGHT,
    columnVector: DRIVI_PALLET_COLUMN_VECTOR,
    depthVector: DRIVI_PALLET_DEPTH_VECTOR,
    levelVector: DRIVI_PALLET_LEVEL_VECTOR,
    safeInset: DEFAULT_SAFE_INSET,
  },
  "pellets-975": {
    id: "pellets-975",
    source: "/images/illustrations/configurator-v33/pellets-pallet-975-crisp-v33.webp",
    canvas: { width: 1407, height: 1118 },
    alphaBounds: { left: 56, top: 26, right: 1375, bottom: 1093 },
    physicalGeometry: EURO_PALLET_GEOMETRY,
    contactPlanes: MODULE_CONTACT_PLANES,
    contactAnchors: { base: { x: 703.5, y: 1093 }, top: { x: 703.5, y: 635.664581 } },
    projectedModuleHeightPx: 457.335419,
    columnVector: PELLETS_975_COLUMN_VECTOR,
    depthVector: PELLETS_975_DEPTH_VECTOR,
    levelVector: PELLETS_975_LEVEL_VECTOR,
    safeInset: DEFAULT_SAFE_INSET,
  },
} as const satisfies Record<string, PalletSourceProfile>;

export type PalletSourceProfileId = keyof typeof PALLET_SOURCE_PROFILES;

export function getPalletSourceProfile(id: PalletSourceProfileId): PalletSourceProfile {
  return PALLET_SOURCE_PROFILES[id];
}

function normalizeRequestedCount(quantity: number) {
  if (!Number.isFinite(quantity)) throw new Error(`Invalid pallet quantity: ${quantity}`);
  return Math.max(1, Math.trunc(quantity));
}

export function getPalletDisplayCount(quantity: number) {
  return Math.min(normalizeRequestedCount(quantity), MAX_PALLET_DISPLAY_COUNT);
}

/** @deprecated Use getPalletDisplayCount. */
export const getPalletRepresentativeCount = getPalletDisplayCount;

export function getPalletSlots(displayCount: number): readonly PalletSlot[] {
  if (!Number.isInteger(displayCount) || displayCount < 1) {
    throw new Error(`Invalid pallet display count: ${displayCount}`);
  }

  // Keep one stable 3 × 2 footprint: the first six pallets stay on the ground;
  // every later pallet fills the next level without ever collapsing back down.
  const footprintColumns = 3;
  const layerCapacity = 6;

  return Array.from({ length: displayCount }, (_, index) => {
    const level = Math.floor(index / layerCapacity);
    const layerIndex = index % layerCapacity;
    return {
      column: layerIndex % footprintColumns,
      depth: Math.floor(layerIndex / footprintColumns),
      level,
    };
  });
}

export function getPalletSlotSupports(slot: PalletSlot, slots: readonly PalletSlot[]) {
  if (slot.level === 0) return [];
  return slots.filter(
    (candidate) =>
      candidate.level === slot.level - 1 &&
      candidate.column === slot.column &&
      candidate.depth === slot.depth,
  );
}

export function isPalletSlotSupported(slot: PalletSlot, slots: readonly PalletSlot[]) {
  const hasValidGridCoordinates =
    Number.isInteger(slot.column) && Number.isInteger(slot.depth) && Number.isInteger(slot.level);
  if (!hasValidGridCoordinates) return false;
  if (slot.level === 0) return true;
  return getPalletSlotSupports(slot, slots).length === 1;
}

function projectSlot(slot: PalletSlot, profile: PalletSourceProfile) {
  return {
    ...slot,
    x:
      slot.column * profile.columnVector.x +
      slot.depth * profile.depthVector.x +
      slot.level * profile.levelVector.x,
    y:
      slot.column * profile.columnVector.y +
      slot.depth * profile.depthVector.y +
      slot.level * profile.levelVector.y,
    viewDepth:
      slot.column * PALLET_DEPTH_SORT_VECTOR.column +
      slot.depth * PALLET_DEPTH_SORT_VECTOR.depth +
      slot.level * PALLET_DEPTH_SORT_VECTOR.level,
  };
}

function boundsForProjectedSlots(
  projected: readonly ReturnType<typeof projectSlot>[],
  profile: PalletSourceProfile,
) {
  let left = Number.POSITIVE_INFINITY;
  let top = Number.POSITIVE_INFINITY;
  let right = Number.NEGATIVE_INFINITY;
  let bottom = Number.NEGATIVE_INFINITY;

  for (const placement of projected) {
    left = Math.min(left, profile.alphaBounds.left + placement.x);
    top = Math.min(top, profile.alphaBounds.top + placement.y);
    right = Math.max(right, profile.alphaBounds.right + placement.x);
    bottom = Math.max(bottom, profile.alphaBounds.bottom + placement.y);
  }

  return { left, top, right, bottom, width: right - left, height: bottom - top };
}

export function getPalletCompositionScaleBoost(displayCount: number) {
  return displayCount >= SECOND_LAYER_START ? SECOND_LAYER_SCALE_BOOST : 1;
}

export function createPalletComposition(
  quantity: number,
  profile: PalletSourceProfile = PALLET_SOURCE_PROFILES["firewood-16"],
): PalletComposition {
  const requestedCount = normalizeRequestedCount(quantity);
  const displayCount = getPalletDisplayCount(requestedCount);
  const slots = getPalletSlots(displayCount);
  const occupied = new Set<string>();
  for (const slot of slots) {
    const key = `${slot.column}:${slot.depth}:${slot.level}`;
    if (occupied.has(key)) throw new Error(`Overlapping pallet slot: ${JSON.stringify(slot)}`);
    occupied.add(key);
    if (!isPalletSlotSupported(slot, slots)) {
      throw new Error(`Unsupported floating pallet slot: ${JSON.stringify(slot)}`);
    }
  }
  const projected = slots
    .map((slot) => projectSlot(slot, profile))
    .sort((left, right) => {
      const depthDifference = left.viewDepth - right.viewDepth;
      if (Math.abs(depthDifference) > 0.0001) return depthDifference;
      if (left.level !== right.level) return left.level - right.level;
      return left.x - right.x;
    });
  const rawBounds = boundsForProjectedSlots(projected, profile);
  const scaleBoost = getPalletCompositionScaleBoost(displayCount);
  const usableWidth =
    PALLET_COMPOSITION_CANVAS.width * (1 - 2 * profile.safeInset) - 2 * CONTOUR_RESERVE;
  const usableHeight =
    PALLET_COMPOSITION_CANVAS.height * (1 - 2 * profile.safeInset) - 2 * CONTOUR_RESERVE;
  const baseScale = Math.min(2, usableWidth / rawBounds.width, usableHeight / rawBounds.height);
  const unclippedScale = Math.min(
    2,
    (PALLET_COMPOSITION_CANVAS.width - 2 * CONTOUR_RESERVE) / rawBounds.width,
    (PALLET_COMPOSITION_CANVAS.height - 2 * CONTOUR_RESERVE) / rawBounds.height,
  );
  const presentationScaleMultiplier = profile.presentationScaleMultiplier ?? 1;
  const scale = Math.min(baseScale * scaleBoost * presentationScaleMultiplier, unclippedScale);
  const safeInset = scaleBoost * presentationScaleMultiplier > 1 ? 0 : profile.safeInset;
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
    cssTranslate: {
      xPercent:
        ((translation.x + scale * placement.x - PALLET_COMPOSITION_CANVAS.width / 2) /
          profile.canvas.width) *
        100,
      yPercent:
        ((translation.y + scale * placement.y - PALLET_COMPOSITION_CANVAS.height / 2) /
          profile.canvas.height) *
        100,
    },
  }));

  return {
    profileId: profile.id as PalletSourceProfileId,
    requestedCount,
    displayCount,
    representativeCount: displayCount,
    placements,
    rawBounds,
    safeInset,
    scaleBoost,
    presentationScaleMultiplier,
    scale,
    translation,
  };
}
