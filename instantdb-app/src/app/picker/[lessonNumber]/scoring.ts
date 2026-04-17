// Picker ranking + auto-selection utilities.
//
// Formula: composite(s) = (d1n * w1 + d2n * w2 + d3 * w3) / (w1 + w2 + w3)
// where d1n, d2n ∈ [0, 10] are min-max normalized across the candidate pool
// and d3 is already on [0, 10] piecewise by word_count (see SCORING.md).
//
// Auto-select uses diminishing-returns diversity: effective_score(s) =
// composite(s) * decay^(sum over s.forms of times_already_covered[form])

export type Candidate = {
  id: string;
  d1Raw: number;
  d2Raw: number;
  d3: number;
  forms: string[]; // lemma-arabic keys from sentenceForms
};

export type PresetKey = "recommended" | "short" | "frequency";

export type Weights = { d1: number; d2: number; d3: number };

export const PRESETS: Record<PresetKey, { label: string; weights: Weights }> = {
  recommended: { label: "★ Recommended", weights: { d1: 35, d2: 25, d3: 40 } },
  short: { label: "Short", weights: { d1: 20, d2: 20, d3: 60 } },
  frequency: { label: "Frequency", weights: { d1: 50, d2: 25, d3: 25 } },
};

export const DEFAULT_DIVERSITY = 0.7;

export function normalizeD1D2(pool: Candidate[]): {
  d1: Record<string, number>;
  d2: Record<string, number>;
} {
  const d1: Record<string, number> = {};
  const d2: Record<string, number> = {};
  if (pool.length === 0) return { d1, d2 };
  const d1s = pool.map((c) => c.d1Raw);
  const d2s = pool.map((c) => c.d2Raw);
  const d1min = Math.min(...d1s);
  const d1max = Math.max(...d1s);
  const d2min = Math.min(...d2s);
  const d2max = Math.max(...d2s);
  for (const c of pool) {
    d1[c.id] = d1max > d1min ? ((c.d1Raw - d1min) / (d1max - d1min)) * 10 : 0;
    d2[c.id] = d2max > d2min ? ((c.d2Raw - d2min) / (d2max - d2min)) * 10 : 0;
  }
  return { d1, d2 };
}

export function compositeScore(d1n: number, d2n: number, d3: number, w: Weights): number {
  const denom = w.d1 + w.d2 + w.d3;
  if (denom === 0) return 0;
  return (d1n * w.d1 + d2n * w.d2 + d3 * w.d3) / denom;
}

export function rankCandidates(
  pool: Candidate[],
  w: Weights,
): Array<{ id: string; composite: number }> {
  const { d1, d2 } = normalizeD1D2(pool);
  return pool
    .map((c) => ({ id: c.id, composite: compositeScore(d1[c.id], d2[c.id], c.d3, w) }))
    .sort((a, b) => b.composite - a.composite);
}

export function autoSelectTopK(
  pool: Candidate[],
  k: number,
  decay: number,
  w: Weights,
): string[] {
  const { d1, d2 } = normalizeD1D2(pool);
  const base = new Map<string, number>();
  for (const c of pool) base.set(c.id, compositeScore(d1[c.id], d2[c.id], c.d3, w));

  const picked: string[] = [];
  const coverage = new Map<string, number>(); // form → times covered
  const byId = new Map(pool.map((c) => [c.id, c]));

  while (picked.length < Math.min(k, pool.length)) {
    let bestId: string | null = null;
    let bestScore = -Infinity;
    for (const c of pool) {
      if (picked.includes(c.id)) continue;
      const priorExposure = c.forms.reduce((s, f) => s + (coverage.get(f) ?? 0), 0);
      const eff = (base.get(c.id) ?? 0) * Math.pow(decay, priorExposure);
      if (eff > bestScore) {
        bestScore = eff;
        bestId = c.id;
      }
    }
    if (bestId === null) break;
    picked.push(bestId);
    for (const f of byId.get(bestId)!.forms) {
      coverage.set(f, (coverage.get(f) ?? 0) + 1);
    }
  }
  return picked;
}
