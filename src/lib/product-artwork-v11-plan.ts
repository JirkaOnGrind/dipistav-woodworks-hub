import type { QuantityBand } from "@/lib/product-artwork";

export const CONFIGURATOR_V11_ROOT = "/images/illustrations/configurator-v11";
export const HOMEPAGE_V11_ROOT = "/images/illustrations/homepage-v11";

export const V11_PLANK_VECTORS = {
  column: [280, -58],
  rowDown: [0, 119],
  back: [-372, -183],
} as const;

export const V11_FRONT_PROFILE_RANGES = {
  beam: { height: 1, widthMin: 1, widthMax: 1 },
  plank: { height: 1, widthMin: 2.3, widthMax: 2.5 },
  board: { height: 1, widthMin: 4.5, widthMax: 5.0 },
  lath: { height: 1, widthMin: 1.25, widthMax: 1.5 },
} as const;

export const V11_ARTWORK_CONSTANTS = {
  canvas: { width: 1536, height: 1024 },
  superSample: 4,
  camera: { projection: "orthographic", azimuthDegrees: 40, elevationDegrees: 27 },
  safeInset: 0.07,
  contourReservePixels: 8,
  maximumAutoFitScale: 2,
  lineWeights: { outer: 4, edge: 3, seam: 3, rings: 1.5, grain: 1.25 },
  palette: {
    outer: "#501801",
    edge: "#501801",
    seam: "#6B310B",
    grain: "#804015",
    sideShadow: "#965622",
    side: "#C5813B",
    topBase: "#F0A242",
    top: "#F4A847",
    end: "#EEA847",
  },
  canonicalTextureSource: "artwork-sources/beams/beam-unit-tile-master-v1-4x.png",
  visualReference: "Obrázek Codex 12. 8. 2026 19_45_37.png",
  cornerPolicy: "no-corner-discoloration-no-dirty-corner-shading-no-ao",
} as const;

export type V11ArtworkFamilyId = "beam" | "plank" | "board" | "lath";

export type V11ArtworkBandPlan = {
  id: string;
  quantityBand: QuantityBand;
  representativeCount: number;
  layout: "1x1" | "2x1" | "2+1-centered" | "3x2" | "3x3" | "4x3" | "4x4";
  plannedSource: string;
  approvalStatus: "approved";
  styleVersion: "v11";
  fitPolicy: "adaptive-bounds";
};

export type V11ArtworkFamilyPlan = {
  id: V11ArtworkFamilyId;
  categoryId: "tramy" | "fosny" | "prkna" | "late";
  illustrationVariants: readonly string[];
  bands: readonly V11ArtworkBandPlan[];
};

export const V11_BAND_SPECS = [
  ["1", { min: 1, max: 1 }, 1, "1x1"],
  ["2", { min: 2, max: 2 }, 2, "2x1"],
  ["3-4", { min: 3, max: 4 }, 3, "2+1-centered"],
  ["5-8", { min: 5, max: 8 }, 6, "3x2"],
  ["9-11", { min: 9, max: 11 }, 9, "3x3"],
  ["12-15", { min: 12, max: 15 }, 12, "4x3"],
  ["16plus", { min: 16 }, 16, "4x4"],
] as const;

function family(
  id: V11ArtworkFamilyId,
  categoryId: V11ArtworkFamilyPlan["categoryId"],
  illustrationVariants: readonly string[],
): V11ArtworkFamilyPlan {
  return {
    id,
    categoryId,
    illustrationVariants,
    bands: V11_BAND_SPECS.map(([suffix, quantityBand, representativeCount, layout]) => ({
      id: `${id}-${suffix}-master-v11`,
      quantityBand,
      representativeCount,
      layout,
      plannedSource: `${CONFIGURATOR_V11_ROOT}/${id}-${suffix}-master-v11.webp`,
      approvalStatus: "approved",
      styleVersion: "v11",
      fitPolicy: "adaptive-bounds",
    })),
  };
}

export const V11_ARTWORK_PLAN: readonly V11ArtworkFamilyPlan[] = [
  family("beam", "tramy", ["beam"]),
  family("plank", "fosny", ["plank"]),
  family("board", "prkna", ["board-sorted", "board-unsorted-narrow", "board-unsorted-wide"]),
  family("lath", "late", ["lath"]),
];

export const V11_HOMEPAGE_ICON_PLAN = [
  ["tramy", "tramy-icon-master-v11.webp", "2+1", "approved"],
  ["fosny", "fosny-icon-master-v11.webp", "3x2", "approved"],
  ["prkna", "prkna-icon-master-v11.webp", "3x2", "approved"],
  ["late", "late-icon-master-v11.webp", "3x3", "approved"],
  ["stipane-drevo", "stipane-drevo-icon-master-v11.webp", "loose 1 prm", "planned"],
  ["pelety", "pelety-icon-master-v11.webp", "one canonical 15 kg bag", "planned"],
  ["krajinky", "krajinky-icon-master-v11.webp", "one 3 m bundle", "planned"],
  [
    "drivi-na-paletach",
    "drivi-na-paletach-icon-master-v11.webp",
    "33 cm / 1 prm pallet",
    "planned",
  ],
].map(([categoryId, filename, composition, approvalStatus]) => ({
  categoryId,
  composition,
  plannedSource: `${HOMEPAGE_V11_ROOT}/${filename}`,
  approvalStatus: approvalStatus as "approved" | "planned",
  styleVersion: "v11" as const,
  fitPolicy: "adaptive-bounds" as const,
}));
