import { describe, expect, it } from "vitest";
import {
  calculateShippingPrice,
  FREE_SHIPPING_THRESHOLD,
  freeShippingRemaining,
  isMoravianPostcode,
  normalizePostcode,
} from "@/lib/order-system";

describe("dual-flow order rules", () => {
  it("normalizes Czech postcodes", () => {
    expect(normalizePostcode("270 34")).toBe("27034");
    expect(normalizePostcode("CZ-60200")).toBe("60200");
  });

  it("blocks configured Moravian postcode ranges without blocking Všesulov", () => {
    expect(isMoravianPostcode("602 00")).toBe(true);
    expect(isMoravianPostcode("77900")).toBe(true);
    expect(isMoravianPostcode("59401")).toBe(true);
    expect(isMoravianPostcode("56802")).toBe(true);
    expect(isMoravianPostcode("27034")).toBe(false);
    expect(isMoravianPostcode("11000")).toBe(false);
  });

  it("keeps the free-shipping threshold strictly greater than 100,000 CZK", () => {
    expect(freeShippingRemaining(FREE_SHIPPING_THRESHOLD)).toBeCloseTo(0.01);
    expect(freeShippingRemaining(FREE_SHIPPING_THRESHOLD + 0.01)).toBe(0);
  });

  it("charges both legs of the route at 35 CZK per kilometre", () => {
    expect(calculateShippingPrice(38)).toBe(2660);
  });
});
