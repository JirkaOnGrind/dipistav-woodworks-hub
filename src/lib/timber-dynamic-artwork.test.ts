import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PRODUCT_CATEGORIES } from "@/lib/product-catalog";
import { resolveArtworkScene } from "@/lib/product-artwork";
import {
  getTimberDisplayCount,
  MAX_TIMBER_DISPLAY_COUNT,
  TIMBER_PIECES_PER_LAYER,
} from "@/lib/timber-dynamic-artwork";

const CONFIG_PATH = "scripts/timber_dynamic_config_v35.json";
const ASSET_ROOT = "public/images/illustrations/timber-dynamic-v35";
const GOLDEN_ROOT = "public/images/illustrations/configurator-v11";

const config = JSON.parse(readFileSync(CONFIG_PATH, "utf8")) as {
  piecesPerLayer: number;
  maxPieces: number;
  families: Record<
    string,
    {
      assetPrefix: string;
      goldenPrefix: string;
      column: [number, number];
      rowDown: [number, number];
      back: [number, number];
    }
  >;
};

describe("dynamic timber artwork v35", () => {
  it("uses crisp plank textures while preserving the original projection and silhouette bounds", () => {
    const category = PRODUCT_CATEGORIES.find((item) => item.id === "fosny")!;
    for (let count = 1; count <= 20; count += 1) {
      const scene = resolveArtworkScene(category.id, category.variants[0], count).scene;
      const image = readFileSync(`public${scene.source}`);
      const updated = JSON.parse(readFileSync(`public${scene.source.replace(/\.webp$/, ".manifest.json")}`, "utf8"));
      const original = JSON.parse(readFileSync(`${ASSET_ROOT}/plank-${count}-master-v35.manifest.json`, "utf8"));
      expect(updated.designVectors).toEqual(original.designVectors);
      expect(updated.alphaBoundsPixels).toEqual(original.alphaBoundsPixels);
      expect(updated.representativeCount).toBe(count);
      expect(updated.topFaceTextureLanes).toBe(4);
      expect(updated.topFaceTexturePolicy).toBe("canonical-clean-right-plank-top-grain");
      expect(createHash("sha256").update(image).digest("hex")).toBe(updated.outputSha256);
    }
  });
  it("exposes one whole-family projection config for every timber family", () => {
    expect(config.piecesPerLayer).toBe(TIMBER_PIECES_PER_LAYER);
    expect(config.maxPieces).toBe(20); // The preserved v35 generation contract.
    expect(MAX_TIMBER_DISPLAY_COUNT).toBe(30);
    expect(Object.keys(config.families)).toEqual([
      "beam",
      "plank",
      "board",
      "board-unsorted-narrow",
      "board-unsorted-wide",
      "lath",
    ]);
    for (const family of Object.values(config.families)) {
      expect(family.column).toHaveLength(2);
      expect(family.rowDown).toHaveLength(2);
      expect(family.back).toHaveLength(2);
    }
  });

  it("keeps approved one- and two-piece masters byte-for-byte identical", () => {
    for (const family of Object.values(config.families)) {
      for (const count of [1, 2]) {
        const dynamic = readFileSync(
          `${ASSET_ROOT}/${family.assetPrefix}-${count}-master-v35.webp`,
        );
        const golden = readFileSync(
          `${GOLDEN_ROOT}/${family.goldenPrefix}-${count}-master-v11.webp`,
        );
        expect(dynamic.equals(golden), `${family.assetPrefix}-${count}`).toBe(true);
      }
    }
  });

  it("fills five pieces on the bottom before adding each upper layer", () => {
    for (const family of Object.values(config.families)) {
      for (let count = 3; count <= MAX_TIMBER_DISPLAY_COUNT; count += 1) {
        const manifest = JSON.parse(
          readFileSync(
            `${count > 20 ? "public/images/illustrations/timber-v40" : ASSET_ROOT}/${family.assetPrefix}-${count}-master-${count > 20 ? "v40" : "v35"}.manifest.json`,
            "utf8",
          ),
        ) as {
          representativeCount: number;
          piecesPerLayer: number;
          levelCount: number;
          renderedMembers: Array<{ row: number }>;
        };
        const levels = Math.ceil(count / TIMBER_PIECES_PER_LAYER);
        const bottomRow = levels - 1;
        expect(manifest.representativeCount).toBe(count);
        expect(manifest.piecesPerLayer).toBe(TIMBER_PIECES_PER_LAYER);
        expect(manifest.levelCount).toBe(levels);
        expect(manifest.renderedMembers).toHaveLength(count);
        expect(manifest.renderedMembers.filter((member) => member.row === bottomRow)).toHaveLength(
          Math.min(TIMBER_PIECES_PER_LAYER, count),
        );
      }
    }
  });

  it("locks every generated master to its manifest hash", () => {
    for (const family of Object.values(config.families)) {
      for (let count = 1; count <= MAX_TIMBER_DISPLAY_COUNT; count += 1) {
        const imagePath = `${count > 20 ? "public/images/illustrations/timber-v40" : ASSET_ROOT}/${family.assetPrefix}-${count}-master-${count > 20 ? "v40" : "v35"}.webp`;
        const manifest = JSON.parse(
          readFileSync(imagePath.replace(/\.webp$/, ".manifest.json"), "utf8"),
        ) as { outputSha256: string };
        const actual = createHash("sha256").update(readFileSync(imagePath)).digest("hex");
        expect(actual, `${family.assetPrefix}-${count}`).toBe(manifest.outputSha256);
      }
    }
  });

  it("resolves every piece quantity exactly and caps the pile at thirty", () => {
    for (const categoryId of ["tramy", "fosny", "late"] as const) {
      const category = PRODUCT_CATEGORIES.find((item) => item.id === categoryId)!;
      const variant = category.variants[0];
      for (let count = 1; count <= MAX_TIMBER_DISPLAY_COUNT; count += 1) {
        expect(resolveArtworkScene(category.id, variant, count).scene.representativeCount).toBe(
          count,
        );
      }
      expect(resolveArtworkScene(category.id, variant, 500).scene.representativeCount).toBe(30);
    }
  });

  it("maps every selected m³ of unsorted boards to one full five-piece layer", () => {
    const category = PRODUCT_CATEGORIES.find((item) => item.id === "prkna")!;
    for (const variant of category.variants.filter((item) => item.modeId === "unsorted")) {
      expect(getTimberDisplayCount(variant, 1)).toBe(5);
      expect(getTimberDisplayCount(variant, 2)).toBe(10);
      expect(getTimberDisplayCount(variant, 3)).toBe(15);
      expect(getTimberDisplayCount(variant, 4)).toBe(20);
      expect(getTimberDisplayCount(variant, 5)).toBe(25);
      expect(getTimberDisplayCount(variant, 6)).toBe(30);
      expect(getTimberDisplayCount(variant, 20)).toBe(30);
    }
  });
});
