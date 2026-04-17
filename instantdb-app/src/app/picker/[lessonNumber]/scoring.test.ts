import { describe, it, expect } from "vitest";
import {
  normalizeD1D2,
  compositeScore,
  autoSelectTopK,
  PRESETS,
  type Candidate,
} from "./scoring";

function c(id: string, d1Raw: number, d2Raw: number, d3: number, forms: string[]): Candidate {
  return { id, d1Raw, d2Raw, d3, forms };
}

describe("normalizeD1D2", () => {
  it("maps min→0 and max→10 across the pool", () => {
    const pool = [c("a", 0, 0, 0, []), c("b", 5, 2, 0, []), c("c", 10, 10, 0, [])];
    const { d1, d2 } = normalizeD1D2(pool);
    expect(d1["a"]).toBe(0);
    expect(d1["c"]).toBe(10);
    expect(d1["b"]).toBe(5);
    expect(d2["b"]).toBe(2);
  });

  it("returns all-zero map when range is degenerate", () => {
    const pool = [c("a", 3, 3, 0, []), c("b", 3, 3, 0, [])];
    const { d1, d2 } = normalizeD1D2(pool);
    expect(d1["a"]).toBe(0);
    expect(d2["b"]).toBe(0);
  });
});

describe("compositeScore", () => {
  it("applies preset weights to normalized dims + raw d3", () => {
    // Recommended: D1=35, D2=25, D3=40; all dims = 10 → composite = 10
    expect(compositeScore(10, 10, 10, PRESETS.recommended.weights)).toBeCloseTo(10, 5);
  });

  it("zeros out when all dims are zero", () => {
    expect(compositeScore(0, 0, 0, PRESETS.recommended.weights)).toBe(0);
  });
});

describe("autoSelectTopK diversity decay", () => {
  it("prefers new forms when decay < 1", () => {
    const pool = [
      c("same1", 10, 10, 10, ["A"]),
      c("same2", 10, 10, 10, ["A"]),
      c("newB", 10, 10, 10, ["B"]),
    ];
    const weights = PRESETS.recommended.weights;
    const picked = autoSelectTopK(pool, 2, 0.5, weights);
    expect(picked).toContain("same1");
    expect(picked).toContain("newB");
    expect(picked).not.toContain("same2");
  });

  it("with decay=1 just takes the top K by raw composite", () => {
    const pool = [
      c("a", 10, 10, 10, ["A"]),
      c("b", 10, 10, 10, ["A"]),
      c("c", 1, 1, 1, ["B"]),
    ];
    const picked = autoSelectTopK(pool, 2, 1.0, PRESETS.recommended.weights);
    expect(picked).toEqual(expect.arrayContaining(["a", "b"]));
    expect(picked).not.toContain("c");
  });
});
