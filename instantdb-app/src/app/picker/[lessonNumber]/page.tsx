"use client";

import { useEffect, useRef, useState, useMemo, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { id as iid, tx } from "@instantdb/react";
import db from "@/lib/instant";
import { usePickerData } from "./usePickerData";
import { ControlsBar, DEFAULT_CONTROLS, type ControlsState } from "./ControlsBar";
import { SelectionBar, type FilterState } from "./SelectionBar";
import { CandidateTable } from "./CandidateTable";
import { rankCandidates, autoSelectTopK } from "./scoring";

export default function PickerPage({
  params,
}: {
  params: Promise<{ lessonNumber: string }>;
}) {
  const { lessonNumber: raw } = use(params);
  const lessonNumber = parseInt(raw, 10);
  const data = usePickerData(lessonNumber);
  const router = useRouter();

  const [controls, setControls] = useState<ControlsState>(DEFAULT_CONTROLS);
  const [filter, setFilter] = useState<FilterState>({ kind: "none" });

  const ranked = useMemo(() => rankCandidates(data.candidates, controls.weights), [data.candidates, controls.weights]);

  const rankById = useMemo(() => {
    const m = new Map<string, { rank: number; score: number }>();
    ranked.forEach((r, i) => {
      m.set(r.id, { rank: i + 1, score: r.composite });
    });
    return m;
  }, [ranked]);

  const selectedIds = useMemo(() => new Set(data.selections.keys()), [data.selections]);

  async function toggleSelect(sentenceId: string) {
    if (!data.lesson || !data.currentMemberId) return;
    const existing = data.selections.get(sentenceId);
    if (existing) {
      await db.transact(tx.selections[existing.id].delete());
      return;
    }
    const newId = iid();
    await db.transact([
      tx.selections[newId].update({
        starred: false,
        pickedAt: Date.now(),
      }),
      tx.selections[newId].link({
        lesson: data.lesson.id,
        sentence: sentenceId,
        pickedBy: data.currentMemberId,
      }),
    ]);
  }

  // Auto-select Top-10 on first load when no selections exist for this lesson.
  // Full wire-up to DB lands in Task 13.
  const autoTop10 = useMemo(() => {
    if (data.selections.size > 0) return [];
    return autoSelectTopK(data.candidates, 10, controls.diversity, controls.weights);
  }, [data.candidates, data.selections, controls.diversity, controls.weights]);

  const autoFiredRef = useRef(false);

  useEffect(() => {
    if (autoFiredRef.current) return;
    if (data.isLoading) return;
    if (!data.lesson || !data.currentMemberId) return;
    if (data.selections.size > 0) return;
    if (autoTop10.length === 0) return;
    autoFiredRef.current = true;

    const txs = autoTop10
      .map((sentenceId) => {
        const newId = iid();
        return [
          tx.selections[newId].update({ starred: false, pickedAt: Date.now() }),
          tx.selections[newId].link({
            lesson: data.lesson!.id,
            sentence: sentenceId,
            pickedBy: data.currentMemberId!,
          }),
        ];
      })
      .flat();
    db.transact(txs);
  }, [data.isLoading, data.lesson, data.currentMemberId, data.selections.size, autoTop10]);

  const selected = useMemo(
    () => data.sentences.filter((s) => data.selections.has(s.id)),
    [data.sentences, data.selections],
  );

  if (data.isLoading) {
    return <div className="flex items-center justify-center h-screen text-gray-500">Loading...</div>;
  }
  if (!data.lesson) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <p className="text-red-600">Lesson {lessonNumber} not found.</p>
        <Link href="/" className="text-emerald-700 underline text-sm">
          ← Back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="px-6 py-4 font-sans max-w-[1200px] mx-auto">
      <div className="flex items-center gap-3 mb-3">
        <Link href="/" className="text-[11px] text-[#475569] underline">
          ← Dashboard
        </Link>
        <select
          value={lessonNumber}
          onChange={(e) => router.push(`/picker/${e.target.value}`)}
          className="text-[12px] font-semibold px-2 py-1 border-2 border-[#0f766e] rounded bg-white text-[#0f766e]"
          aria-label="Lesson"
        >
          {data.lessons.map((l) => (
            <option key={l.id} value={l.lessonNumber}>
              L{l.lessonNumber} — {l.title}
            </option>
          ))}
        </select>
        <h1 className="text-[14px] font-bold text-[#0f172a]">{data.lesson.title}</h1>
        <span
          data-testid="picker-candidate-count"
          data-count={data.candidates.length}
          className="text-[11px] text-[#64748b]"
        >
          {data.candidates.length} candidates · auto-top-10: {autoTop10.length}
        </span>
      </div>

      <ControlsBar state={controls} onChange={setControls} />

      <SelectionBar
        selectedSentences={selected}
        coverageByRoot={new Map()}
        lessonRoots={data.roots.map((r) => ({ key: r.key, transliteration: r.transliteration }))}
        lessonForms={data.forms.map((f) => ({ rootKey: f.rootKey, lemmaArabic: f.lemmaArabic }))}
        activeFilter={filter}
        onFilterChange={setFilter}
      />

      <CandidateTable
        sentences={data.sentences}
        rankById={rankById}
        selectedIds={selectedIds}
        filter={filter}
        maxRows={controls.showCount}
        onToggleSelect={toggleSelect}
      />

      <div
        data-testid="picker-ranked-count"
        data-count={ranked.length}
        className="mt-4 text-[11px] text-[#64748b]"
      >
        Ranked {ranked.length} candidates · top: {ranked[0]?.composite.toFixed(2) ?? "—"}
      </div>
    </div>
  );
}
