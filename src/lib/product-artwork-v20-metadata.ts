import type { GeneratedArtworkMetadata } from "@/lib/product-artwork-v9-metadata";

export type V20ArtworkMetadata = GeneratedArtworkMetadata & { outputSha256: string };

export const V20_ARTWORK_METADATA: Record<string, V20ArtworkMetadata> = {
  "pellets-bag-3-master-v20": {
    canvas: { width: 1536, height: 1024 },
    alphaBounds: { x: 0.075521, y: 0.125, width: 0.848958, height: 0.75 },
    opticalCenter: { x: 0.5, y: 0.5 },
    alphaCoverage: 0.3812,
    outputSha256: "8968ada8d0157975f8245ba55e5b3ca4e6ec93b78465c6ebd0d65aa3ac5c05e8",
  },
};
