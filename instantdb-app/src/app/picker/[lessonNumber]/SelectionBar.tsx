"use client";

import type React from "react";
import type { SentenceRow } from "./usePickerData";

export type SelectionBarProps = {
  selectedSentences: SentenceRow[];
  lessonRoots: { key: string; transliteration: string }[];
  lessonForms: { rootKey: string; lemmaArabic: string }[];
  activeFilter: FilterState;
  onFilterChange: (next: FilterState) => void;
  /** Number of sentences remaining after the current filter is applied. */
  filteredCount: number;
};

export type FilterState =
  | { kind: "none" }
  | { kind: "root"; rootKey: string }
  | { kind: "form"; rootKey: string; lemmaArabic: string };

const RANGES = {
  sentences: { min: 10, max: 12 },
  words: { min: 100, max: 120 },
  forms: { min: 5, max: 7 },
};

function Gauge({ value, min, max, label }: { value: number; min: number; max: number; label: string }) {
  const inRange = value >= min && value <= max;
  return (
    <div className="flex flex-col px-3">
      <div className="flex items-baseline gap-1">
        <span
          className="font-extrabold text-[20px]"
          style={{ color: inRange ? "#059669" : "#f59e0b" }}
        >
          {value}
        </span>
        <span className="text-[11px] text-[#64748b]">
          / {min}-{max}
        </span>
      </div>
      <span className="text-[9px] uppercase tracking-wider text-[#64748b]">{label}</span>
    </div>
  );
}

function chipState(count: number): {
  border: string;
  bg: string;
  text: string;
  dashed: boolean;
} {
  if (count === 0) {
    return { border: "#d1d5db", bg: "#fafafa", text: "#cbd5e1", dashed: true };
  }
  if (count >= 3) return { border: "#22c55e", bg: "#f0fdf4", text: "#1f2937", dashed: false };
  if (count === 2) return { border: "#f59e0b", bg: "#fffbeb", text: "#1f2937", dashed: false };
  return { border: "#ef4444", bg: "#fef2f2", text: "#1f2937", dashed: false };
}

export function SelectionBar(props: SelectionBarProps) {
  const { selectedSentences } = props;
  const sentenceCount = selectedSentences.length;
  const wordCount = selectedSentences.reduce((s, v) => s + v.wordCount, 0);
  const coveredForms = new Set<string>();
  for (const s of selectedSentences) {
    for (const f of s.forms ?? []) coveredForms.add(`${f.rootKey}|${f.lemmaArabic}`);
  }

  // Count covered forms per (root, lemma)
  const countsByForm = new Map<string, number>();
  for (const s of selectedSentences) {
    for (const f of s.forms ?? []) {
      const k = `${f.rootKey}|${f.lemmaArabic}`;
      countsByForm.set(k, (countsByForm.get(k) ?? 0) + 1);
    }
  }

  // Group all in-scope forms by root
  const formsByRoot = new Map<string, string[]>();
  for (const f of props.lessonForms) {
    const arr = formsByRoot.get(f.rootKey) ?? [];
    arr.push(f.lemmaArabic);
    formsByRoot.set(f.rootKey, arr);
  }

  const isFormActive = (rootKey: string, lemma: string) =>
    props.activeFilter.kind === "form" &&
    props.activeFilter.rootKey === rootKey &&
    props.activeFilter.lemmaArabic === lemma;

  const isRootActive = (rootKey: string) =>
    props.activeFilter.kind === "root" && props.activeFilter.rootKey === rootKey;

  const anyFilter = props.activeFilter.kind !== "none";

  return (
    <div className="sticky top-0 z-20 bg-[#f0fdf4] border-l-4 border-[#34d399] rounded-r-lg mt-3">
      <div className="flex items-center divide-x divide-[#d1d5db] py-2">
        <Gauge value={sentenceCount} min={RANGES.sentences.min} max={RANGES.sentences.max} label="Sentences" />
        <Gauge value={wordCount} min={RANGES.words.min} max={RANGES.words.max} label="Words" />
        <Gauge value={coveredForms.size} min={RANGES.forms.min} max={RANGES.forms.max} label="Forms" />
      </div>

      <div className="border-t border-[#e2e8f0] bg-[#f8fdf8] px-3 py-2 flex flex-wrap items-center gap-3">
        {props.lessonRoots.map((root) => {
          const forms = formsByRoot.get(root.key) ?? [];
          const covered = forms.filter((l) => (countsByForm.get(`${root.key}|${l}`) ?? 0) > 0).length;
          const rootActive = isRootActive(root.key);
          const dim = anyFilter && !rootActive && props.activeFilter.kind === "root";

          return (
            <div key={root.key} className={`flex items-center gap-1 ${dim ? "opacity-35" : ""}`}>
              <button
                type="button"
                onClick={() =>
                  props.onFilterChange(
                    rootActive ? { kind: "none" } : { kind: "root", rootKey: root.key },
                  )
                }
                className={`text-[9px] font-bold uppercase tracking-wider px-2 py-[2px] rounded ${
                  rootActive
                    ? "bg-[#1f2937] text-white ring-2 ring-[#3b82f6]"
                    : "text-[#64748b]"
                }`}
                aria-pressed={rootActive}
              >
                {root.transliteration.toUpperCase()} {covered}/{forms.length}
              </button>
              {forms.map((lemma) => {
                const count = countsByForm.get(`${root.key}|${lemma}`) ?? 0;
                const { border, bg, text, dashed } = chipState(count);
                const active = isFormActive(root.key, lemma);
                const chipDim = anyFilter && !active && props.activeFilter.kind === "form";
                const style: React.CSSProperties = active
                  ? { background: "#1f2937", color: "white", border: "2px solid #1f2937", boxShadow: "0 0 0 2px #3b82f6" }
                  : {
                      background: bg,
                      color: text,
                      border: `${dashed ? "1.5px dashed" : "2px solid"} ${border}`,
                      fontWeight: count >= 3 ? 600 : 400,
                    };
                return (
                  <button
                    key={lemma}
                    type="button"
                    style={style}
                    onClick={() =>
                      props.onFilterChange(
                        active
                          ? { kind: "none" }
                          : { kind: "form", rootKey: root.key, lemmaArabic: lemma },
                      )
                    }
                    className={`px-2 py-[2px] rounded-md font-arabic text-[11px] ${chipDim ? "opacity-35" : ""}`}
                    dir="rtl"
                    aria-pressed={active}
                    data-testid="heatmap-chip"
                    data-root={root.key}
                    data-lemma={lemma}
                    data-count={count}
                  >
                    {lemma}
                    {count >= 3 && (
                      <sup style={{ fontSize: 8, fontFamily: "system-ui", color: "#16a34a" }}>{count}</sup>
                    )}
                  </button>
                );
              })}
            </div>
          );
        })}

        {anyFilter && (
          <div
            data-testid="filter-status-line"
            className="basis-full text-[9px] text-[#64748b]"
          >
            Showing <strong>{props.filteredCount} sentences</strong>{" "}
            {props.activeFilter.kind === "form" && (
              <>
                containing{" "}
                <strong className="font-arabic" dir="rtl">
                  {props.activeFilter.lemmaArabic}
                </strong>
              </>
            )}
            {props.activeFilter.kind === "root" && (
              <>
                from root <strong>{props.activeFilter.rootKey}</strong>
              </>
            )}{" "}
            · click another chip or clear
          </div>
        )}

        {anyFilter && (
          <button
            type="button"
            onClick={() => props.onFilterChange({ kind: "none" })}
            className="ml-auto px-[10px] py-[3px] rounded-md bg-[#1f2937] text-white text-[10px]"
          >
            ✕ Clear filter
          </button>
        )}
      </div>
    </div>
  );
}
