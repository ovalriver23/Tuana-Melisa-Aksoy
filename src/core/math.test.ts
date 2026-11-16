import { describe, expect, it } from "vitest";
import { clamp, lerp, smoothstep } from "./math";

describe("clamp", () => {
  it("leaves values inside the range alone", () => {
    expect(clamp(0.4, 0, 1)).toBe(0.4);
  });

  it("pulls values back to the nearest edge", () => {
    expect(clamp(-3, 0, 1)).toBe(0);
    expect(clamp(7, 0, 1)).toBe(1);
  });
});

describe("lerp", () => {
  it("returns the ends at t = 0 and t = 1", () => {
    expect(lerp(10, 20, 0)).toBe(10);
    expect(lerp(10, 20, 1)).toBe(20);
  });

  it("returns the midpoint at t = 0.5", () => {
    expect(lerp(10, 20, 0.5)).toBe(15);
  });
});

describe("smoothstep", () => {
  it("is 0 before the first edge and 1 after the second", () => {
    expect(smoothstep(0.2, 0.8, 0)).toBe(0);
    expect(smoothstep(0.2, 0.8, 1)).toBe(1);
  });

  it("passes through one half at the middle", () => {
    expect(smoothstep(0.2, 0.8, 0.5)).toBeCloseTo(0.5);
  });

  it("never goes backwards", () => {
    let previous = 0;
    for (let value = 0; value <= 1; value += 0.05) {
      const current = smoothstep(0, 1, value);
      expect(current).toBeGreaterThanOrEqual(previous);
      previous = current;
    }
  });
});
