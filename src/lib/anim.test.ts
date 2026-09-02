import { describe, expect, it } from "vitest";

import { easeOutCubic, formatEsAr } from "./anim";

describe("formatEsAr", () => {
  it("formats 2000 as \"2.000\"", () => {
    expect(formatEsAr(2000)).toBe("2.000");
  });

  it("formats 1500 as \"1.500\"", () => {
    expect(formatEsAr(1500)).toBe("1.500");
  });
});

describe("easeOutCubic", () => {
  it("returns 0 at t=0 and 1 at t=1", () => {
    expect(easeOutCubic(0)).toBe(0);
    expect(easeOutCubic(1)).toBe(1);
  });

  it("stays within [0, 1] for the interpolation range", () => {
    for (let t = 0; t <= 1.0001; t += 0.05) {
      const v = easeOutCubic(t);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1.0001);
    }
  });

  it("is monotonically non-decreasing", () => {
    let prev = -Infinity;
    for (let t = 0; t <= 1.0001; t += 0.05) {
      const v = easeOutCubic(t);
      expect(v).toBeGreaterThanOrEqual(prev);
      prev = v;
    }
  });
});
