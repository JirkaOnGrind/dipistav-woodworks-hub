import type { GeneratedArtworkMetadata } from "@/lib/product-artwork-v9-metadata";

export type V13ArtworkMetadata = GeneratedArtworkMetadata & { outputSha256: string };

export const V13_ARTWORK_METADATA: Record<string, V13ArtworkMetadata> = {
  "firewood-loose-9-15-master-v13": {
    canvas: { width: 1536, height: 1024 },
    alphaBounds: { x: 0.092448, y: 0.217773, width: 0.815104, height: 0.564453 },
    opticalCenter: { x: 0.5, y: 0.5 },
    alphaCoverage: 0.309555,
    outputSha256: "f30e1e7ab1a60b9a4fa77c552d7faa9323590a4ba3611ea0d78869de8942116d",
  },
};
