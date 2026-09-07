import type { GeneratedArtworkMetadata } from "@/lib/product-artwork-v9-metadata";

export type V19ArtworkMetadata = GeneratedArtworkMetadata & { outputSha256: string };

export const V19_ARTWORK_METADATA: Record<string, V19ArtworkMetadata> = {
  "pellets-bag-1-master-v19": {
    canvas: { width: 1536, height: 1024 },
    alphaBounds: { x: 0.330729, y: 0.079102, width: 0.337891, height: 0.841797 },
    opticalCenter: { x: 0.499674, y: 0.5 },
    alphaCoverage: 0.235088,
    outputSha256: "5dbe89acd380057e769f9131e10c83afb379ccda98fc19551298cf01979d4ac2",
  },
  "pellets-bag-2-master-v19": {
    canvas: { width: 1536, height: 1024 },
    alphaBounds: { x: 0.201823, y: 0.078125, width: 0.597656, height: 0.842773 },
    opticalCenter: { x: 0.500651, y: 0.499512 },
    alphaCoverage: 0.377824,
    outputSha256: "33306fe4d83c997b43cf7ba83292bd459bff1327a3cd1b3f84cf01c9c65ab899",
  },
};
