import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("homepage category artwork", () => {
  it("does not apply an image drop shadow", () => {
    const source = readFileSync("src/components/product-category-section.tsx", "utf8");
    expect(source).not.toContain("drop-shadow");
  });
});
