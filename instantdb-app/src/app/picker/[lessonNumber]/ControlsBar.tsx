"use client";

import { useState } from "react";
import { PRESETS, type PresetKey, type Weights, DEFAULT_DIVERSITY } from "./scoring";

export type ControlsState = {
  showCount: number;
  activePreset: PresetKey | null; // null = custom (slider edited)
  weights: Weights;
  diversity: number;
};

export const DEFAULT_CONTROLS: ControlsState = {
  showCount: 30,
  activePreset: "recommended",
  weights: PRESETS.recommended.weights,
  diversity: DEFAULT_DIVERSITY,
};

export function ControlsBar({
  state,
  onChange,
}: {
  state: ControlsState;
  onChange: (next: ControlsState) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  function setPreset(key: PresetKey) {
    onChange({ ...state, activePreset: key, weights: PRESETS[key].weights });
  }
  function setWeight(which: keyof Weights, value: number) {
    onChange({
      ...state,
      activePreset: null,
      weights: { ...state.weights, [which]: value },
    });
  }

  return (
    <div className="border border-[#e2e8f0] rounded-lg bg-white">
      <div className="flex items-center gap-3 px-3 py-2 text-[12px]">
        <label className="flex items-center gap-1 text-[#64748b]">
          Show:
          <select
            value={state.showCount}
            onChange={(e) => onChange({ ...state, showCount: Number(e.target.value) })}
            className="border rounded px-1 py-[2px] text-[12px]"
            aria-label="Show count"
          >
            {[20, 30, 50, 200].map((n) => (
              <option key={n} value={n}>
                {n === 200 ? "All" : n}
              </option>
            ))}
          </select>
        </label>

        <span className="text-[#64748b]">|</span>
        <span className="text-[#64748b]">Scoring:</span>
        {(Object.keys(PRESETS) as PresetKey[]).map((k) => {
          const active = state.activePreset === k;
          return (
            <button
              key={k}
              type="button"
              onClick={() => setPreset(k)}
              className={`px-2 py-[2px] rounded border-2 text-[11px] font-medium ${
                active
                  ? "border-[#f59e0b] bg-[#fef3c7] text-[#92400e]"
                  : "border-[#cbd5e1] bg-white text-[#475569] hover:border-[#94a3b8]"
              }`}
              aria-pressed={active}
            >
              {PRESETS[k].label}
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="ml-auto px-[10px] py-[3px] rounded-md bg-[#f1f5f9] border border-[#cbd5e1] text-[11px] text-[#64748b]"
        >
          {expanded ? "▲ Collapse" : "⚙ Fine-tune Ranking"}
        </button>
      </div>

      {expanded && (
        <div className="border-t border-[#e2e8f0] bg-[#f8fafc] px-3 py-3 grid grid-cols-4 gap-4 text-[11px]">
          <Slider label="Favor common words" value={state.weights.d1} color="#3b82f6" onChange={(v) => setWeight("d1", v)} />
          <Slider label="Favor new vocabulary" value={state.weights.d2} color="#8b5cf6" onChange={(v) => setWeight("d2", v)} />
          <Slider label="Favor short sentences" value={state.weights.d3} color="#f59e0b" onChange={(v) => setWeight("d3", v)} />
          <Slider
            label="Form diversity"
            value={Math.round(state.diversity * 100)}
            color="#64748b"
            onChange={(v) => onChange({ ...state, diversity: v / 100 })}
            max={100}
          />
        </div>
      )}
    </div>
  );
}

function Slider({
  label,
  value,
  color,
  onChange,
  max = 100,
}: {
  label: string;
  value: number;
  color: string;
  onChange: (v: number) => void;
  max?: number;
}) {
  return (
    <label className="flex flex-col gap-1">
      <div className="flex justify-between">
        <span className="text-[#475569]">{label}</span>
        <span style={{ color, fontWeight: 700 }}>{value}</span>
      </div>
      <input
        type="range"
        min={0}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-[5px] cursor-pointer"
        aria-label={label}
      />
    </label>
  );
}
