import type { ArtworkSceneDefinition, QuantityBand } from "@/lib/product-artwork";
import { V9_ARTWORK_METADATA } from "@/lib/product-artwork-v9-metadata";

const V9_ROOT = "/images/illustrations/configurator-v9";

export const APPROVED_V9_CANDIDATE_IDS = new Set([
  "fosna-15plus-master-v9",
  "lat-3-4-master-v9",
  "firewood-loose-9plus-master-v9",
  "pellets-pallet-1-master-v9",
  "pellets-set-1-master-v9",
  "firewood-bigbag-5-8-master-v9",
  "firewood-bigbag-9plus-master-v9",
]);

export type ArtworkCandidateStatus = "planned" | "awaiting-approval" | "approved";

export type ArtworkSceneCandidate = ArtworkSceneDefinition & {
  approvalStatus: ArtworkCandidateStatus;
  representativeCount: number;
  alphaCoverage: number;
};

type CandidateDraft = {
  id: string;
  categoryId: string;
  illustrationVariant: string;
  band: QuantityBand;
  rank: number;
  representativeCount: number;
  canvas?: { width: number; height: number };
};

function candidate(draft: CandidateDraft): ArtworkSceneCandidate {
  const metadata = V9_ARTWORK_METADATA[draft.id];
  const canvas = metadata?.canvas ?? draft.canvas ?? { width: 1536, height: 1024 };
  const artworkKey =
    draft.band.min <= 1
      ? "one"
      : draft.band.min === 2
        ? "two"
        : draft.band.min <= 4
          ? "three"
          : draft.band.min <= 9
            ? "five"
            : draft.band.min <= 14
              ? "bundle"
              : "dense";
  return {
    id: draft.id,
    categoryId: draft.categoryId,
    illustrationVariant: draft.illustrationVariant,
    artworkKey,
    quantityBand: draft.band,
    visualMassRank: draft.rank,
    source: `${V9_ROOT}/${draft.id}.webp`,
    canvas,
    alphaBounds: metadata?.alphaBounds ?? { x: 0.07, y: 0.07, width: 0.86, height: 0.86 },
    opticalCenter: metadata?.opticalCenter ?? { x: 0.5, y: 0.5 },
    safeInset: 0.06,
    transformPolicy:
      draft.categoryId === "fosny" || draft.categoryId === "late" ? "timber" : "none",
    preloadNeighbors: [],
    renderMode: "master",
    approvalStatus: APPROVED_V9_CANDIDATE_IDS.has(draft.id)
      ? "approved"
      : metadata
        ? "awaiting-approval"
        : "planned",
    representativeCount: draft.representativeCount,
    alphaCoverage: metadata && "alphaCoverage" in metadata ? metadata.alphaCoverage : 0,
  };
}

function family(
  categoryId: string,
  illustrationVariant: string,
  specs: Array<[id: string, band: QuantityBand, representativeCount: number]>,
  canvas?: { width: number; height: number },
) {
  return specs.map(([id, band, representativeCount], index) =>
    candidate({
      id,
      categoryId,
      illustrationVariant,
      band,
      rank: index + 1,
      representativeCount,
      canvas,
    }),
  );
}

export const V9_ARTWORK_CANDIDATES: readonly ArtworkSceneCandidate[] = [
  ...family("fosny", "plank", [["fosna-15plus-master-v9", { min: 15 }, 15]]),
  ...family("late", "lath", [
    ["lat-3-4-master-v9", { min: 3, max: 4 }, 4],
    ["lat-5-9-master-v9", { min: 5, max: 9 }, 7],
    ["lat-10-14-master-v9", { min: 10, max: 14 }, 12],
  ]),
  ...family("stipane-drevo", "firewood-loose", [
    ["firewood-loose-2-master-v9", { min: 2, max: 2 }, 2],
    ["firewood-loose-3-4-master-v9", { min: 3, max: 4 }, 4],
    ["firewood-loose-5-8-master-v9", { min: 5, max: 8 }, 6],
    ["firewood-loose-9plus-master-v9", { min: 9 }, 9],
  ]),
  ...family("stipane-drevo", "firewood-bag", [
    ["firewood-bigbag-2-master-v9", { min: 2, max: 2 }, 2],
    ["firewood-bigbag-3-4-master-v9", { min: 3, max: 4 }, 4],
    ["firewood-bigbag-5-8-master-v9", { min: 5, max: 8 }, 5],
    ["firewood-bigbag-9plus-master-v9", { min: 9 }, 9],
  ]),
  ...family("stipane-drevo", "firewood-pallet", [
    ["firewood-pallet-2-master-v9", { min: 2, max: 2 }, 2],
    ["firewood-pallet-3-4-master-v9", { min: 3, max: 4 }, 4],
    ["firewood-pallet-5-8-master-v9", { min: 5, max: 8 }, 6],
    ["firewood-pallet-9plus-master-v9", { min: 9 }, 9],
  ]),
  ...family(
    "drivi-na-paletach",
    "pallet-25",
    [
      ["pallet-25-1-master-v9", { min: 1, max: 1 }, 1],
      ["pallet-25-2-master-v9", { min: 2, max: 2 }, 2],
      ["pallet-25-3-4-master-v9", { min: 3, max: 4 }, 4],
      ["pallet-25-5-8-master-v9", { min: 5, max: 8 }, 6],
      ["pallet-25-9plus-master-v9", { min: 9 }, 9],
    ],
    { width: 1254, height: 1254 },
  ),
  ...family("drivi-na-paletach", "pallet-33", [
    ["pallet-33-2-master-v9", { min: 2, max: 2 }, 2],
    ["pallet-33-3-4-master-v9", { min: 3, max: 4 }, 4],
    ["pallet-33-5-8-master-v9", { min: 5, max: 8 }, 6],
    ["pallet-33-9plus-master-v9", { min: 9 }, 9],
  ]),
  ...family("drivi-na-paletach", "pallet-16", [
    ["pallet-16-2-master-v9", { min: 2, max: 2 }, 2],
    ["pallet-16-3-4-master-v9", { min: 3, max: 4 }, 4],
    ["pallet-16-5-8-master-v9", { min: 5, max: 8 }, 6],
    ["pallet-16-9plus-master-v9", { min: 9 }, 9],
  ]),
  ...family("pelety", "pellets-bag", [
    ["pellets-bag-2-master-v9", { min: 2, max: 2 }, 2],
    ["pellets-bag-3-4-master-v9", { min: 3, max: 4 }, 4],
    ["pellets-bag-5-9-master-v9", { min: 5, max: 9 }, 7],
    ["pellets-bag-10-19-master-v9", { min: 10, max: 19 }, 15],
    ["pellets-bag-20plus-master-v9", { min: 20 }, 20],
  ]),
  ...family("pelety", "pellets-set", [
    ["pellets-set-1-master-v9", { min: 1, max: 1 }, 10],
    ["pellets-set-2-master-v9", { min: 2, max: 2 }, 20],
    ["pellets-set-3-4-master-v9", { min: 3, max: 4 }, 30],
    ["pellets-set-5-9-master-v9", { min: 5, max: 9 }, 50],
    ["pellets-set-10-19-master-v9", { min: 10, max: 19 }, 100],
    ["pellets-set-20plus-master-v9", { min: 20 }, 200],
  ]),
  ...family(
    "pelety",
    "pellets-pallet",
    [
      ["pellets-pallet-1-master-v9", { min: 1, max: 1 }, 1],
      ["pellets-pallet-2-master-v9", { min: 2, max: 2 }, 2],
      ["pellets-pallet-3-master-v9", { min: 3, max: 3 }, 3],
      ["pellets-pallet-4plus-master-v9", { min: 4 }, 4],
    ],
    { width: 1254, height: 1254 },
  ),
  ...family("krajinky", "slabs-*", [
    ["slabs-4-master-v9", { min: 4, max: 4 }, 4],
    ["slabs-5-8-master-v9", { min: 5, max: 8 }, 5],
    ["slabs-9plus-master-v9", { min: 9 }, 9],
  ]),
];

export const V9_APPROVAL_CANDIDATES = V9_ARTWORK_CANDIDATES.filter(
  (candidateScene) => candidateScene.approvalStatus === "awaiting-approval",
);

export const V9_APPROVED_CANDIDATES = V9_ARTWORK_CANDIDATES.filter(
  (candidateScene) => candidateScene.approvalStatus === "approved",
);
