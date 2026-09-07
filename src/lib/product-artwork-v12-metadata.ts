import type { GeneratedArtworkMetadata } from "@/lib/product-artwork-v9-metadata";

export type V12ArtworkMetadata = GeneratedArtworkMetadata & { outputSha256: string };

function metadata(
  canvas: GeneratedArtworkMetadata["canvas"],
  alphaCoverage: number,
  alphaBounds: GeneratedArtworkMetadata["alphaBounds"],
  opticalCenter: GeneratedArtworkMetadata["opticalCenter"],
  outputSha256: string,
): V12ArtworkMetadata {
  return { canvas, alphaBounds, opticalCenter, alphaCoverage, outputSha256 };
}

export const V12_ARTWORK_METADATA: Record<string, V12ArtworkMetadata> = {
  "firewood-loose-1-2-master-v12": metadata(
    { width: 1254, height: 1254 },
    0.53259,
    { x: 0.0311, y: 0.082935, width: 0.937799, height: 0.791866 },
    { x: 0.5, y: 0.478868 },
    "8eb1bdd9115c41200e221064aff2c9a7ee819938391078acb671714d1c597da5",
  ),
  "firewood-loose-3-4-master-v12": metadata(
    { width: 1536, height: 1024 },
    0.263062,
    { x: 0.16862, y: 0.196289, width: 0.662109, height: 0.607422 },
    { x: 0.499674, y: 0.5 },
    "41772a982014feef7fe215271e774cf11413b5c75b25687d234daf201d3881b7",
  ),
  "firewood-loose-5-8-master-v12": metadata(
    { width: 1536, height: 1024 },
    0.330823,
    { x: 0.126302, y: 0.163086, width: 0.746745, height: 0.673828 },
    { x: 0.499674, y: 0.5 },
    "c56ad66c3dac847c9ae3107bc094fcc2de062342a8d6635c71e85396875f4536",
  ),
  "firewood-loose-9-15-master-v12": metadata(
    { width: 1536, height: 1024 },
    0.353553,
    { x: 0.093099, y: 0.166992, width: 0.814453, height: 0.666992 },
    { x: 0.500326, y: 0.500488 },
    "6885a7663e397e895cb9c3e552ce5211313dde54cc3d4a8c1600f35b26741c4f",
  ),
  "firewood-loose-16plus-master-v12": metadata(
    { width: 1536, height: 1024 },
    0.443385,
    { x: 0.075521, y: 0.114258, width: 0.848958, height: 0.770508 },
    { x: 0.5, y: 0.499512 },
    "993a4d12bbb2f0f511d74ab70d2d1738f88492f640602e8cfeb4805a919c3a9f",
  ),
};
