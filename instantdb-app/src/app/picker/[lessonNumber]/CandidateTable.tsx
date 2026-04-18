"use client";

import { useMemo, useState } from "react";
import type { SentenceRow } from "./usePickerData";
import type { FilterState } from "./SelectionBar";
import { surahName } from "./surah-names";

export type SortKey = "score" | "words" | "ref" | "forms" | "arabic" | "english";
export type SortDir = "asc" | "desc";

export type TableProps = {
  sentences: SentenceRow[];
  rankById: Map<string, { rank: number; score: number }>;
  selectedIds: Set<string>;
  filter: FilterState;
  maxRows: number;
  onToggleSelect: (sentenceId: string) => void;
};

function rankColor(rank: number): string {
  if (rank <= 10) return "#059669";
  if (rank <= 20) return "#0369a1";
  return "#64748b";
}

function refWithFragment(s: SentenceRow): string {
  const verseRef = s.verseRef;
  const surah = s.verse?.surah ?? parseInt(verseRef.split(":")[0], 10);
  return `${surahName(surah)} ${verseRef}`;
}

function applyFilter(rows: SentenceRow[], filter: FilterState): SentenceRow[] {
  if (filter.kind === "none") return rows;
  if (filter.kind === "root") {
    return rows.filter((s) => (s.forms ?? []).some((f) => f.rootKey === filter.rootKey));
  }
  return rows.filter((s) =>
    (s.forms ?? []).some((f) => f.rootKey === filter.rootKey && f.lemmaArabic === filter.lemmaArabic),
  );
}

export function CandidateTable(props: TableProps) {
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({ key: "score", dir: "desc" });

  const rows = useMemo(() => {
    const filtered = applyFilter(props.sentences, props.filter);
    const cmp = {
      score: (a: SentenceRow, b: SentenceRow) =>
        (props.rankById.get(b.id)?.score ?? 0) - (props.rankById.get(a.id)?.score ?? 0),
      words: (a: SentenceRow, b: SentenceRow) => a.wordCount - b.wordCount,
      ref: (a: SentenceRow, b: SentenceRow) => a.verseRef.localeCompare(b.verseRef, "en", { numeric: true }),
      forms: (a: SentenceRow, b: SentenceRow) => {
        const al = a.forms?.[0]?.lemmaArabic ?? "";
        const bl = b.forms?.[0]?.lemmaArabic ?? "";
        return al.localeCompare(bl);
      },
      arabic: (a: SentenceRow, b: SentenceRow) => a.arabic.localeCompare(b.arabic),
      english: (a: SentenceRow, b: SentenceRow) => {
        const ae = a.verse?.translation?.english?.toLowerCase() ?? "";
        const be = b.verse?.translation?.english?.toLowerCase() ?? "";
        return ae.localeCompare(be);
      },
    }[sort.key];
    const sorted = [...filtered].sort(cmp);
    if (sort.dir === "asc") sorted.reverse();
    return sorted.slice(0, props.maxRows);
  }, [props.sentences, props.filter, props.rankById, props.maxRows, sort]);

  function toggleSort(key: SortKey) {
    setSort((cur) => (cur.key === key ? { key, dir: cur.dir === "asc" ? "desc" : "asc" } : { key, dir: "desc" }));
  }

  return (
    <table className="w-full border-collapse mt-3 text-[11px]" data-testid="candidate-table">
      <thead>
        <tr className="bg-[#f8fafc] text-[#64748b] uppercase tracking-wider">
          <th className="px-2 py-2 text-right w-[50px] cursor-pointer" onClick={() => toggleSort("score")}>
            Score
          </th>
          <th className="px-2 py-2 text-left w-[100px] cursor-pointer" onClick={() => toggleSort("ref")}>
            Ref
          </th>
          <th className="px-2 py-2 text-left w-[100px] cursor-pointer" onClick={() => toggleSort("forms")}>
            Forms
          </th>
          <th className="px-2 py-2 text-right cursor-pointer" onClick={() => toggleSort("arabic")}>
            Arabic
          </th>
          <th className="px-2 py-2 text-left cursor-pointer" onClick={() => toggleSort("english")}>
            English
          </th>
          <th className="px-2 py-2 text-right w-[36px] cursor-pointer" onClick={() => toggleSort("words")}>
            Words
          </th>
          <th className="px-2 py-2 w-[60px]">Bar</th>
          <th className="px-2 py-2 text-left w-[80px]">Hook</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((s) => {
          const r = props.rankById.get(s.id);
          const selected = props.selectedIds.has(s.id);
          const isFragment = (s.verse?.arabic ?? "") !== s.arabic;
          return (
            <tr
              key={s.id}
              data-testid="candidate-row"
              data-selected={selected}
              data-sentence-id={s.id}
              onClick={() => props.onToggleSelect(s.id)}
              className="cursor-pointer hover:bg-[#f1f5f9]"
              style={selected ? { background: "#f0fdf4" } : undefined}
            >
              <td className="px-2 py-2 text-right font-bold" style={{ color: r ? rankColor(r.rank) : "#64748b" }}>
                {r ? r.score.toFixed(1) : "—"}
              </td>
              <td className="px-2 py-2">{refWithFragment(s)}</td>
              <td className="px-2 py-2">
                {(s.forms ?? []).map((f) => (
                  <span
                    key={f.id}
                    className="inline-block mr-1 px-1 py-[1px] rounded-md bg-[#eef2ff] text-[10px] font-arabic"
                    dir="rtl"
                  >
                    {f.lemmaArabic}
                  </span>
                ))}
              </td>
              <td
                className="px-2 py-2 text-right font-arabic text-[14px]"
                dir="rtl"
                style={{
                  borderRight: isFragment ? "3px dashed #94a3b8" : "3px solid #3b82f6",
                }}
              >
                {s.arabic}
              </td>
              <td className="px-2 py-2 text-[#64748b]">{s.verse?.translation?.english ?? ""}</td>
              <td className="px-2 py-2 text-right">{s.wordCount}</td>
              <td className="px-2 py-2">
                {s.scoreA1 && (
                  <div className="flex h-[8px] w-[50px] rounded-sm overflow-hidden">
                    <div style={{ width: `${Math.min(100, s.scoreA1.d1Raw * 10)}%`, background: "#3b82f6" }} />
                    <div style={{ width: `${Math.min(100, s.scoreA1.d2Raw * 10)}%`, background: "#8b5cf6" }} />
                    <div style={{ width: `${s.scoreA1.d3 * 10}%`, background: "#f59e0b" }} />
                  </div>
                )}
              </td>
              <td className="px-2 py-2 text-[10px] text-[#94a3b8]">
                {/* hookReason lands in Plan 4; empty for now */}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
