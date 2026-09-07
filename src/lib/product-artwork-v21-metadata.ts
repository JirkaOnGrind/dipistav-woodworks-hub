import type { NormalizedBounds, NormalizedPoint } from "@/lib/product-artwork";

export type V21ArtworkMetadata = {
  canvas: { width: number; height: number };
  alphaBounds: NormalizedBounds;
  opticalCenter: NormalizedPoint;
  bottomAnchor: NormalizedPoint;
  alphaCoverage: number;
  responsiveSources: readonly { source: string; width: number }[];
};

const ROOT = "/images/illustrations/configurator-v21";

function metadata(
  quantity: number,
  height: number,
  alphaBounds: NormalizedBounds,
  bottomAnchorY: number,
  alphaCoverage: number,
): V21ArtworkMetadata {
  return {
    canvas: { width: 1536, height },
    alphaBounds,
    opticalCenter: { x: 0.5, y: 0.5 },
    bottomAnchor: { x: 0.5, y: bottomAnchorY },
    alphaCoverage,
    responsiveSources: [
      { source: `${ROOT}/pellets-${quantity}-v21-768.webp`, width: 768 },
      { source: `${ROOT}/pellets-${quantity}-v21-1536.webp`, width: 1536 },
    ],
  };
}

export const V21_ARTWORK_METADATA: Record<number, V21ArtworkMetadata> = {
  1: metadata(
    1,
    2536,
    { x: 0.003255, y: 0.001972, width: 0.99349, height: 0.996057 },
    0.998028,
    0.816054,
  ),
  2: metadata(
    2,
    1460,
    { x: 0.001302, y: 0.00137, width: 0.997396, height: 0.99726 },
    0.99863,
    0.74674,
  ),
  3: metadata(
    3,
    909,
    { x: 0.001302, y: 0.0022, width: 0.997396, height: 0.9956 },
    0.9978,
    0.593797,
  ),
  6: metadata(
    6,
    1049,
    { x: 0.001302, y: 0.001907, width: 0.997396, height: 0.996187 },
    0.998093,
    0.646555,
  ),
  9: metadata(
    9,
    1185,
    { x: 0.001302, y: 0.001688, width: 0.997396, height: 0.996624 },
    0.998312,
    0.685711,
  ),
  12: metadata(
    12,
    1302,
    { x: 0.001302, y: 0.001536, width: 0.997396, height: 0.996928 },
    0.998464,
    0.711966,
  ),
  15: metadata(
    15,
    1444,
    { x: 0.001302, y: 0.001385, width: 0.997396, height: 0.99723 },
    0.998615,
    0.739438,
  ),
  21: metadata(
    21,
    1728,
    { x: 0.001302, y: 0.001157, width: 0.997396, height: 0.997685 },
    0.998843,
    0.780773,
  ),
  24: metadata(
    24,
    1185,
    { x: 0.000651, y: 0.000844, width: 0.998698, height: 0.998312 },
    0.999156,
    0.740083,
  ),
  28: metadata(
    28,
    1260,
    { x: 0.000651, y: 0.000794, width: 0.998698, height: 0.998413 },
    0.999206,
    0.767113,
  ),
};
