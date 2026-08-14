import { describe, expect, it } from "vitest";
import {
  CONFIGURATOR_V10_ROOT,
  getV10ArtworkFamilyPlan,
  V10_ARTWORK_PLAN,
} from "@/lib/product-artwork-v10-plan";

describe("v10 artwork plan", () => {
  it("pokrývá všech 16 cílových rodin souvislými pásmy od množství jedna", () => {
    expect(V10_ARTWORK_PLAN).toHaveLength(16);

    for (const artworkFamily of V10_ARTWORK_PLAN) {
      expect(artworkFamily.bands[0]?.quantityBand.min, artworkFamily.id).toBe(1);
      for (let index = 1; index < artworkFamily.bands.length; index += 1) {
        const previous = artworkFamily.bands[index - 1];
        const current = artworkFamily.bands[index];
        expect(current.quantityBand.min, current.id).toBe(
          (previous.quantityBand.max ?? current.quantityBand.min - 1) + 1,
        );
      }
      expect(artworkFamily.bands.at(-1)?.quantityBand.max, artworkFamily.id).toBeUndefined();
    }
  });

  it("má pravdivé fyzické počty a unikátní plánované názvy, ale žádné aktivní source", () => {
    const bands = V10_ARTWORK_PLAN.flatMap((artworkFamily) => artworkFamily.bands);
    const filenames = bands.map((band) => band.plannedFileName);

    expect(new Set(filenames).size).toBe(filenames.length);
    for (const artworkFamily of V10_ARTWORK_PLAN) {
      expect(artworkFamily.approvalStatus).toBe("planned");
      expect(artworkFamily).not.toHaveProperty("source");
      for (const band of artworkFamily.bands) {
        expect(Number.isInteger(band.representativeCount), band.id).toBe(true);
        expect(band.representativeCount, band.id).toBeGreaterThan(0);
        expect(band.plannedFileName).toMatch(/(?:-master-v(?:10|11)|-v10)\.webp$/);
        expect(band).not.toHaveProperty("source");
      }
    }
    expect(CONFIGURATOR_V10_ROOT).toBe("/images/illustrations/configurator-v10");
  });

  it("zapisuje potvrzená speciální pásma a reprezentativní počty", () => {
    const beams = getV10ArtworkFamilyPlan("tramy", "beam")!;
    expect(
      beams.bands.slice(3).map((band) => [band.quantityBand, band.representativeCount]),
    ).toEqual([
      [{ min: 5, max: 8 }, 6],
      [{ min: 9, max: 11 }, 9],
      [{ min: 12, max: 15 }, 12],
      [{ min: 16 }, 16],
    ]);
    expect(beams.bands.slice(4).map((band) => band.plannedFileName)).toEqual([
      "beam-9-11-composed-master-v10.webp",
      "beam-12-15-composed-master-v10.webp",
      "beam-16plus-composed-master-v10.webp",
    ]);
    expect(beams.bands.find((band) => band.quantityBand.min === 3)?.plannedFileName).toBe(
      "beam-3-4-composed-master-v11.webp",
    );
    expect(beams.sharedRequirements.join(" ")).toContain("beam-9-v10.webp");
    expect(beams.sharedRequirements.join(" ")).toContain("rovnou izometrickou základnou");
    expect(beams.sharedRequirements.join(" ")).toContain("třemi souvislými podélnými švy");

    const plank = getV10ArtworkFamilyPlan("fosny", "plank")!;
    expect(plank.bands.find((band) => band.id === "plank-5-9")).toMatchObject({
      representativeCount: 6,
      quantityBand: { min: 5, max: 9 },
    });

    const laths = getV10ArtworkFamilyPlan("late", "lath")!;
    expect(laths.bands.find((band) => band.id === "lath-10-14")).toMatchObject({
      representativeCount: 12,
      quantityBand: { min: 10, max: 14 },
    });

    const pelletSets = getV10ArtworkFamilyPlan("pelety", "pellets-set")!;
    expect(pelletSets.bands.map((band) => band.quantityBand)).toEqual([
      { min: 1, max: 1 },
      { min: 2, max: 2 },
      { min: 3, max: 4 },
      { min: 5 },
    ]);
    expect(pelletSets.bands.at(-1)?.representativeCount).toBe(50);

    const pelletPallets = getV10ArtworkFamilyPlan("pelety", "pellets-pallet")!;
    expect(pelletPallets.bands.at(-1)).toMatchObject({
      quantityBand: { min: 6 },
      representativeCount: 6,
    });

    const slabs = getV10ArtworkFamilyPlan("krajinky", "slabs-2m")!;
    expect(slabs.bands.map((band) => band.quantityBand)).toEqual([
      { min: 1, max: 1 },
      { min: 2, max: 2 },
      { min: 3, max: 4 },
      { min: 5 },
    ]);
  });

  it("vyžaduje u volného dřeva o 30 % větší alpha coverage při stejném měřítku polen", () => {
    const looseFirewood = getV10ArtworkFamilyPlan("stipane-drevo", "firewood-loose")!;
    expect(looseFirewood.bands.at(-1)?.relativeAlphaCoverage).toEqual({
      referenceBandId: "firewood-loose-5-8",
      minimumRatio: 1.3,
      preserveIndividualScale: true,
    });
  });

  it("rozlišuje úzká a široká netříděná prkna jako samostatné vizuální rodiny", () => {
    expect(getV10ArtworkFamilyPlan("prkna", "board-unsorted-narrow")?.id).toBe(
      "board-unsorted-narrow",
    );
    expect(getV10ArtworkFamilyPlan("prkna", "board-unsorted-wide")?.id).toBe("board-unsorted-wide");
  });
});
