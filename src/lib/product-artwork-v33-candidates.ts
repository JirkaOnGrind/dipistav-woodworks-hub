import type { ArtworkSceneCandidate } from "@/lib/product-artwork-v9-candidates";
import { V12_ARTWORK_METADATA } from "@/lib/product-artwork-v12-metadata";
import { V15_ARTWORK_METADATA } from "@/lib/product-artwork-v15-metadata";

const V33_ROOT = "/images/illustrations/configurator-v33";
const V34_ROOT = "/images/illustrations/configurator-v34";
const V15_ROOT = "/images/illustrations/configurator-v15";

const looseScene = (
  id: string,
  source: string,
  quantityBand: { min: number; max?: number },
  visualMassRank: number,
  representativeCount: number,
  targetAlphaWidth: number,
  canvas: { width: number; height: number },
  alphaBounds: { x: number; y: number; width: number; height: number },
): ArtworkSceneCandidate => ({
  id,
  categoryId: "stipane-drevo",
  illustrationVariant: "firewood-loose",
  artworkKey:
    quantityBand.min === 1
      ? "one"
      : quantityBand.min === 2
        ? "two"
        : quantityBand.min <= 4
          ? "three"
          : quantityBand.min <= 8
            ? "five"
            : quantityBand.min <= 15
              ? "bundle"
              : "dense",
  quantityBand,
  visualMassRank,
  source,
  canvas,
  alphaBounds,
  opticalCenter: { x: 0.5, y: 0.5 },
  safeInset: 0.04,
  transformPolicy: "none",
  preloadNeighbors: [],
  renderMode: "master",
  approvalStatus: "approved",
  representativeCount,
  alphaCoverage: alphaBounds.width * alphaBounds.height,
  styleVersion: "v34",
  fitPolicy: "alpha-safe",
  targetAlphaWidth,
});

const looseV15 = (id: keyof typeof V15_ARTWORK_METADATA) => V15_ARTWORK_METADATA[id];
const looseV12 = (id: keyof typeof V12_ARTWORK_METADATA) => V12_ARTWORK_METADATA[id];

const looseOne = looseV15("firewood-loose-1-2-master-v15");
const looseFive = looseV15("firewood-loose-5-8-master-v15");
const looseNine = looseV15("firewood-loose-9-15-master-v15");
const looseDense = looseV12("firewood-loose-16plus-master-v12");

export const V33_ARTWORK_CANDIDATES: readonly ArtworkSceneCandidate[] = [
  looseScene(
    "firewood-loose-1-master-v33",
    `${V15_ROOT}/firewood-loose-1-2-master-v15.webp`,
    { min: 1, max: 1 },
    1,
    1,
    0.52,
    looseOne.canvas,
    looseOne.alphaBounds,
  ),
  looseScene(
    "firewood-loose-2-master-v33",
    `${V34_ROOT}/firewood-loose-2-v34.webp`,
    { min: 2, max: 2 },
    2,
    2,
    0.66,
    { width: 1536, height: 1024 },
    { x: 0.061849, y: 0.022461, width: 0.905599, height: 0.956055 },
  ),
  looseScene(
    "firewood-loose-3-master-v33",
    `${V34_ROOT}/firewood-loose-3-v34.webp`,
    { min: 3, max: 3 },
    3,
    3,
    0.78,
    { width: 1536, height: 1024 },
    { x: 0.009115, y: 0.120117, width: 0.979818, height: 0.817383 },
  ),
  looseScene(
    "firewood-loose-4-master-v33",
    `${V34_ROOT}/firewood-loose-4-v34.webp`,
    { min: 4, max: 4 },
    4,
    4,
    0.86,
    { width: 1536, height: 1024 },
    { x: 0.061198, y: 0.151367, width: 0.88737, height: 0.81543 },
  ),
  looseScene(
    "firewood-loose-5-8-master-v33",
    `${V15_ROOT}/firewood-loose-5-8-master-v15.webp`,
    { min: 5, max: 8 },
    5,
    6,
    0.9,
    looseFive.canvas,
    looseFive.alphaBounds,
  ),
  looseScene(
    "firewood-loose-9-15-master-v33",
    `${V15_ROOT}/firewood-loose-9-15-master-v15.webp`,
    { min: 9, max: 15 },
    6,
    12,
    0.915,
    looseNine.canvas,
    looseNine.alphaBounds,
  ),
  looseScene(
    "firewood-loose-16plus-master-v33",
    "/images/illustrations/configurator-v12/firewood-loose-16plus-master-v12.webp",
    { min: 16 },
    7,
    16,
    0.92,
    looseDense.canvas,
    looseDense.alphaBounds,
  ),
  {
    id: "firewood-bigbag-dynamic-v33",
    categoryId: "stipane-drevo",
    illustrationVariant: "firewood-bag",
    artworkKey: "one",
    quantityBand: { min: 1 },
    visualMassRank: 1,
    source: "/images/illustrations/configurator-v3/drevo-bigbag-v3.webp",
    canvas: { width: 1254, height: 1254 },
    alphaBounds: { x: 0.077352, y: 0.026316, width: 0.854864, height: 0.949761 },
    opticalCenter: { x: 0.5, y: 0.5 },
    safeInset: 0.04,
    transformPolicy: "none",
    preloadNeighbors: [],
    renderMode: "legacy-units",
    approvalStatus: "approved",
    representativeCount: 20,
    alphaCoverage: 0.55,
    styleVersion: "v33",
  },
  {
    id: "slabwood-dynamic-units-v33",
    categoryId: "krajinky",
    illustrationVariant: "slabs-*",
    artworkKey: "one",
    quantityBand: { min: 1, max: 5 },
    visualMassRank: 1,
    source: "/images/illustrations/krajinky-v2.webp",
    canvas: { width: 1254, height: 1254 },
    alphaBounds: { x: 0.038278, y: 0.107656, width: 0.937002, height: 0.783892 },
    opticalCenter: { x: 0.5, y: 0.5 },
    safeInset: 0.03,
    transformPolicy: "none",
    preloadNeighbors: [],
    renderMode: "legacy-units",
    approvalStatus: "approved",
    representativeCount: 5,
    alphaCoverage: 0.61,
    styleVersion: "v33",
  },
  {
    id: "slabwood-dense-pile-v33",
    categoryId: "krajinky",
    illustrationVariant: "slabs-*",
    artworkKey: "dense",
    quantityBand: { min: 6 },
    visualMassRank: 2,
    source: `${V33_ROOT}/slabwood-dense-pile-v33.webp`,
    canvas: { width: 1536, height: 1024 },
    alphaBounds: { x: 0.007161, y: 0.029297, width: 0.985677, height: 0.956055 },
    opticalCenter: { x: 0.5, y: 0.5 },
    safeInset: 0.035,
    transformPolicy: "none",
    preloadNeighbors: [],
    renderMode: "master",
    approvalStatus: "approved",
    representativeCount: 12,
    alphaCoverage: 0.75,
    styleVersion: "v33",
    fitPolicy: "alpha-safe",
    targetAlphaWidth: 0.91,
  },
];

export const V33_APPROVED_CANDIDATES = V33_ARTWORK_CANDIDATES;
