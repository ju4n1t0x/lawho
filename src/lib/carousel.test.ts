import { describe, expect, it } from "vitest";

import { exceedsDragThreshold, resolveScrollBehavior } from "./carousel";

describe("resolveScrollBehavior", () => {
  it("returns 'auto' when reduced motion is true", () => {
    expect(resolveScrollBehavior(true)).toBe("auto");
  });

  it("returns 'smooth' when reduced motion is false (default)", () => {
    expect(resolveScrollBehavior(false)).toBe("smooth");
  });
});

describe("exceedsDragThreshold", () => {
  it("returns false when dx is below threshold", () => {
    expect(exceedsDragThreshold(5, 2)).toBe(false);
  });

  it("returns true when dx exceeds threshold and is horizontal-dominant", () => {
    expect(exceedsDragThreshold(20, 5)).toBe(true);
  });

  it("returns false when dx exceeds threshold but dy is larger (vertical-dominant)", () => {
    expect(exceedsDragThreshold(10, 25)).toBe(false);
  });

  it("returns false when both dx and dy are zero", () => {
    expect(exceedsDragThreshold(0, 0)).toBe(false);
  });

  it("accepts negative dx (drag left)", () => {
    expect(exceedsDragThreshold(-20, -5)).toBe(true);
  });

  it("returns true exactly at threshold+1", () => {
    expect(exceedsDragThreshold(9, 3)).toBe(true);
  });

  it("returns false exactly at threshold", () => {
    expect(exceedsDragThreshold(8, 3)).toBe(false);
  });

  it("respects custom threshold", () => {
    expect(exceedsDragThreshold(5, 2, 3)).toBe(true);
  });
});
