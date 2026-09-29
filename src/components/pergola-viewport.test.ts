import { describe, expect, it } from "vitest";
import { resolvePergolaViewportLayout } from "./pergola-viewport";

describe("pergola responsive layout", () => {
  it("uses compact controls on short portrait phones", () => {
    expect(resolvePergolaViewportLayout({ width: 375, height: 667 })).toMatchObject({
      mode: "compact",
    });
    expect(resolvePergolaViewportLayout({ width: 390, height: 749 }).mode).toBe("compact");
    expect(resolvePergolaViewportLayout({ width: 390, height: 750 }).mode).toBe("portrait");
  });

  it("uses portrait layout without coupling secondary options to viewport height", () => {
    expect(resolvePergolaViewportLayout({ width: 430, height: 932 })).toMatchObject({
      mode: "portrait",
    });
    expect(resolvePergolaViewportLayout({ width: 390, height: 780 })).toMatchObject({
      mode: "portrait",
    });
  });

  it("switches mobile landscape to split-screen without treating the keyboard as orientation", () => {
    expect(resolvePergolaViewportLayout({ width: 844, height: 390 })).toMatchObject({
      mode: "landscape",
    });
    expect(resolvePergolaViewportLayout({ width: 390, height: 844, visualHeight: 500 })).toEqual({
      mode: "portrait",
      keyboardOpen: true,
    });
  });

  it("keeps desktop behavior above the product breakpoint", () => {
    expect(resolvePergolaViewportLayout({ width: 1024, height: 600 }).mode).toBe("desktop");
  });
});
