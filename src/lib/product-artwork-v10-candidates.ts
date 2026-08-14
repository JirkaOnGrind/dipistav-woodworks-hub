import type { ArtworkSceneCandidate } from "@/lib/product-artwork-v9-candidates";
import { V10_ARTWORK_METADATA } from "@/lib/product-artwork-v10-metadata";
import { CONFIGURATOR_V10_ROOT, V10_ARTWORK_PLAN } from "@/lib/product-artwork-v10-plan";

const APPROVED_V10_IDS = [
  "beam-1-composed-master-v10",
  "beam-2-composed-master-v10",
  "beam-3-4-composed-master-v11",
  "beam-5-8-composed-master-v10",
  "beam-9-11-composed-master-v10",
  "beam-12-15-composed-master-v10",
  "beam-16plus-composed-master-v10",
  "plank-1-master-v10",
  "plank-2-master-v10",
  "plank-3-4-master-v10",
  "plank-5-9-master-v10",
  "plank-10-14-master-v10",
  "plank-15plus-master-v10",
  "board-sorted-3-4-master-v10",
  "board-unsorted-narrow-1-master-v10",
  "board-unsorted-narrow-2-master-v10",
  "board-unsorted-narrow-3-4-master-v10",
  "board-unsorted-narrow-5-9-master-v10",
  "board-unsorted-narrow-10-14-master-v10",
  "board-unsorted-narrow-15plus-master-v10",
  "board-unsorted-wide-1-master-v10",
  "board-unsorted-wide-2-master-v10",
  "board-unsorted-wide-3-4-master-v10",
  "board-unsorted-wide-5-9-master-v10",
  "board-unsorted-wide-10-14-master-v10",
  "board-unsorted-wide-15plus-master-v10",
  "lath-1-master-v10",
  "lath-2-master-v10",
  "lath-3-4-master-v10",
  "lath-5-9-master-v10",
  "lath-10-14-master-v10",
  "lath-15plus-master-v10",
  "firewood-loose-9plus-master-v10",
  "firewood-pallet-1-master-v10",
  "firewood-pallet-2-master-v10",
  "firewood-pallet-3-4-master-v10",
  "firewood-pallet-5-8-master-v10",
  "firewood-pallet-9plus-master-v10",
  "pellets-bag-20plus-master-v10",
  "pellets-set-5plus-master-v10",
  "pellets-pallet-4-5-master-v10",
  "pellets-pallet-6plus-master-v10",
  "slabs-3-4-master-v10",
  "slabs-5plus-master-v10",
  "pallet-25-9plus-master-v10",
  "pallet-33-9plus-master-v10",
  "pallet-16-9plus-master-v10",
] as const;

function artworkKeyForMinimum(minimum: number): ArtworkSceneCandidate["artworkKey"] {
  if (minimum <= 1) return "one";
  if (minimum === 2) return "two";
  if (minimum <= 4) return "three";
  if (minimum <= 9) return "five";
  if (minimum <= 14) return "bundle";
  return "dense";
}

function candidate(id: (typeof APPROVED_V10_IDS)[number]): ArtworkSceneCandidate {
  const family = V10_ARTWORK_PLAN.find((item) =>
    item.bands.some((band) => band.plannedFileName === `${id}.webp`),
  );
  const band = family?.bands.find((item) => item.plannedFileName === `${id}.webp`);
  const generated = V10_ARTWORK_METADATA[id];

  if (!family || !band || !generated) {
    throw new Error(`Incomplete v10 artwork registry entry: ${id}`);
  }

  const transformPolicy =
    family.categoryId === "tramy"
      ? "beam"
      : ["fosny", "late", "prkna"].includes(family.categoryId)
        ? "timber"
        : "none";

  return {
    id,
    categoryId: family.categoryId,
    illustrationVariant: family.id === "slabs" ? "slabs-*" : family.illustrationVariants[0],
    artworkKey: artworkKeyForMinimum(band.quantityBand.min),
    quantityBand: band.quantityBand,
    visualMassRank: family.bands.findIndex((item) => item.id === band.id) + 1,
    source:
      family.categoryId === "tramy"
        ? `/images/illustrations/beams/${id}.webp`
        : `${CONFIGURATOR_V10_ROOT}/${id}.webp`,
    canvas: generated.canvas,
    alphaBounds: generated.alphaBounds,
    opticalCenter: generated.opticalCenter,
    safeInset: family.id === "firewood-loose" ? 0.03 : 0.06,
    transformPolicy,
    preloadNeighbors: [],
    renderMode: "master",
    approvalStatus: "approved",
    representativeCount: band.representativeCount,
    alphaCoverage: generated.alphaCoverage,
    ...(family.categoryId === "tramy"
      ? { filter: "saturate(0.93) brightness(1.02) contrast(1.01)" }
      : {}),
  };
}

export const V10_ARTWORK_CANDIDATES: readonly ArtworkSceneCandidate[] =
  APPROVED_V10_IDS.map(candidate);

export const V10_APPROVED_CANDIDATES = V10_ARTWORK_CANDIDATES;
