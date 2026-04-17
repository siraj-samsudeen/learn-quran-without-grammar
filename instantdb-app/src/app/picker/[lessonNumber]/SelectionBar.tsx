"use client";

import type { SentenceRow } from "./usePickerData";

export type SelectionBarProps = {
  selectedSentences: SentenceRow[];
  /** forms per root-key already covered by selections */
  coverageByRoot: Map<string, Map<string, number>>;
  lessonRoots: { key: string; transliteration: string }[];
  lessonForms: { rootKey: string; lemmaArabic: string }[];
  activeFilter: FilterState;
  onFilterChange: (next: FilterState) => void;
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

export function SelectionBar(props: SelectionBarProps) {
  const { selectedSentences } = props;
  const sentenceCount = selectedSentences.length;
  const wordCount = selectedSentences.reduce((s, v) => s + v.wordCount, 0);
  // Distinct forms covered across selected sentences
  const coveredForms = new Set<string>();
  for (const s of selectedSentences) {
    for (const f of s.forms ?? []) coveredForms.add(`${f.rootKey}|${f.lemmaArabic}`);
  }

  return (
    <div className="sticky top-0 z-20 bg-[#f0fdf4] border-l-4 border-[#34d399] rounded-r-lg mt-3">
      <div className="flex items-center divide-x divide-[#d1d5db] py-2">
        <Gauge value={sentenceCount} min={RANGES.sentences.min} max={RANGES.sentences.max} label="Sentences" />
        <Gauge value={wordCount} min={RANGES.words.min} max={RANGES.words.max} label="Words" />
        <Gauge value={coveredForms.size} min={RANGES.forms.min} max={RANGES.forms.max} label="Forms" />
      </div>
      {/* Row 2 (chips) appears in Task 11 */}
    </div>
  );
}
