import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PRODUCT_CATEGORIES } from "@/lib/product-catalog";
import { getArtworkSceneFamily, resolveArtworkScene } from "@/lib/product-artwork";

const config = JSON.parse(readFileSync("scripts/bundle_configs.json", "utf8"));
const category = PRODUCT_CATEGORIES.find((item) => item.id === "krajinky")!;

describe("exact slab bundle artwork", () => {
  it("exports exactly the configured bundles and original source in painter order", () => {
    const source = readFileSync(`public${config.source_asset}`).toString("base64");
    expect(Object.keys(config.bundle_configs)).toEqual(
      Array.from({ length: 12 }, (_, i) => String(i + 1)),
    );
    for (let count = 1; count <= 12; count++) {
      const scene = config.bundle_configs[count];
      const svg = readFileSync(`public${scene.asset_url}`, "utf8");
      expect(svg.match(/<use /g)).toHaveLength(count);
      expect(svg.match(/<image /g)).toHaveLength(1);
      expect(svg).toContain(`data:image/webp;base64,${source}`);
      const order = [...svg.matchAll(/data-z-index="([\d.]+)"/g)].map((match) => Number(match[1]));
      expect(order).toEqual([...order].sort((a, b) => a - b));
    }
  });

  it("fills a four-wide base and centers up to three supported layers", () => {
    const expectedLayers = {
      5: [4, 1],
      6: [4, 2],
      7: [4, 3],
      8: [4, 4],
      9: [4, 4, 1],
      10: [4, 4, 2],
      11: [4, 4, 3],
      12: [4, 4, 4],
    };
    for (const [count, layers] of Object.entries(expectedLayers)) {
      const placements = config.bundle_configs[count].positioning_grid as { grid: number[] }[];
      layers.forEach((size, layer) => {
        const columns = placements.filter((p) => p.grid[2] === layer).map((p) => p.grid[1]);
        expect(columns).toHaveLength(size);
        expect(columns.reduce((sum, column) => sum + column, 0) / size).toBe(1.5);
      });
    }
  });

  it("selects all twelve exports for every length and caps larger quantities at twelve", () => {
    for (const variant of category.variants) {
      const family = getArtworkSceneFamily(category.id, variant);
      for (let count = 1; count <= 12; count++) {
        const { scene } = resolveArtworkScene(category.id, variant, count);
        expect(scene.source).toBe(config.bundle_configs[count].asset_url);
        expect(scene.representativeCount).toBe(count);
        expect(family).toContain(scene);
      }
      for (const quantity of [13, 15, 100, 500]) {
        expect(resolveArtworkScene(category.id, variant, quantity).scene.source).toBe(
          config.bundle_configs[12].asset_url,
        );
      }
    }
  });
});
