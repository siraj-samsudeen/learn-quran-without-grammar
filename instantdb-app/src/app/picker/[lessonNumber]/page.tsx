"use client";

import { use, useState, useMemo } from "react";
import { tx, id as iid } from "@instantdb/react";
import db from "@/lib/instant";
import Link from "next/link";
import type { VerseSection } from "@/lib/types";

const SECTIONS: { key: VerseSection; label: string; color: string }[] = [
  { key: "learning", label: "Learning", color: "bg-emerald-100 text-emerald-800 border-emerald-300" },
  { key: "recall", label: "Recall", color: "bg-blue-100 text-blue-800 border-blue-300" },
  { key: "pipeline", label: "Pipeline", color: "bg-amber-100 text-amber-800 border-amber-300" },
  { key: "none", label: "Skip", color: "bg-gray-100 text-gray-500 border-gray-300" },
];

export default function PickerPage({
  params,
}: {
  params: Promise<{ lessonNumber: string }>;
}) {
  const { lessonNumber: lessonNumStr } = use(params);
  const lessonNumber = parseInt(lessonNumStr, 10);

  const { isLoading, data } = db.useQuery({
    lessons: {},
    verses: {},
    selections: {},
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen text-gray-500">
        Loading...
      </div>
    );
  }

  const lesson = data?.lessons?.find(
    (l: Record<string, unknown>) => l.lessonNumber === lessonNumber
  );

  if (!lesson) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <p className="text-red-600">Lesson {lessonNumber} not found.</p>
        <Link href="/" className="text-emerald-700 underline text-sm">
          Back to dashboard
        </Link>
      </div>
    );
  }

  const verses = (data?.verses ?? [])
    .filter((v: Record<string, unknown>) => v.lessonNumber === lessonNumber)
    .sort((a: Record<string, unknown>, b: Record<string, unknown>) => {
      const sa = (b.scoreFinal as number) ?? 0;
      const sb = (a.scoreFinal as number) ?? 0;
      return sa - sb;
    });

  const selections = data?.selections ?? [];

  return (
    <PickerContent
      lesson={lesson}
      verses={verses}
      selections={selections}
      lessonNumber={lessonNumber}
    />
  );
}

function PickerContent({
  lesson,
  verses,
  selections,
  lessonNumber,
}: {
  lesson: Record<string, unknown>;
  verses: Record<string, unknown>[];
  selections: Record<string, unknown>[];
  lessonNumber: number;
}) {
  const [filter, setFilter] = useState<VerseSection | "all">("all");
  const [groupByRoot, setGroupByRoot] = useState(true);

  // Build a map of verseRef -> selection for this lesson
  const selectionMap = useMemo(() => {
    const map: Record<string, Record<string, unknown>> = {};
    for (const s of selections) {
      if ((s.lessonNumber as number) === lessonNumber) {
        map[s.verseRef as string] = s;
      }
    }
    return map;
  }, [selections, lessonNumber]);

  function getSection(verseRef: string): VerseSection {
    return (selectionMap[verseRef]?.section as VerseSection) ?? "none";
  }

  // Counts per section
  const counts = useMemo(() => {
    const c: Record<VerseSection, number> = {
      learning: 0,
      recall: 0,
      pipeline: 0,
      none: 0,
    };
    for (const v of verses) {
      c[getSection(v.ref as string)]++;
    }
    return c;
  }, [verses, selectionMap]);

  // Filter verses
  const filtered =
    filter === "all"
      ? verses
      : verses.filter((v) => getSection(v.ref as string) === filter);

  // Group by root
  const groups = useMemo(() => {
    if (!groupByRoot) return { all: filtered };
    const g: Record<string, Record<string, unknown>[]> = {};
    for (const v of filtered) {
      const key = v.rootKey as string;
      if (!g[key]) g[key] = [];
      g[key].push(v);
    }
    return g;
  }, [filtered, groupByRoot]);

  function setVerseSection(verseRef: string, section: VerseSection, rootKey: string, form: string) {
    const existing = selectionMap[verseRef];
    if (existing) {
      db.transact(
        tx.selections[existing.id as string].update({
          section,
          updatedAt: Date.now(),
        })
      );
    } else {
      db.transact(
        tx.selections[iid()].update({
          lessonNumber,
          verseRef,
          section,
          rootKey,
          form,
          remark: "",
          updatedAt: Date.now(),
        })
      );
    }
  }

  function updateRemark(verseRef: string, remark: string, rootKey: string, form: string) {
    const existing = selectionMap[verseRef];
    if (existing) {
      db.transact(
        tx.selections[existing.id as string].update({
          remark,
          updatedAt: Date.now(),
        })
      );
    } else {
      db.transact(
        tx.selections[iid()].update({
          lessonNumber,
          verseRef,
          section: "none" as VerseSection,
          rootKey,
          form,
          remark,
          updatedAt: Date.now(),
        })
      );
    }
  }

  function exportSelections() {
    const output = {
      lesson: lessonNumber,
      anchor: lesson.seedArabic,
      exported_at: new Date().toISOString(),
      selections: {
        learning: [] as { ref: string; form: string; group: string; remark?: string }[],
        recall: [] as { ref: string; form: string; group: string; remark?: string }[],
        pipeline: [] as { ref: string; form: string; group: string; remark?: string }[],
      },
    };

    for (const s of selections) {
      if ((s.lessonNumber as number) !== lessonNumber) continue;
      const sec = s.section as VerseSection;
      if (sec === "none") continue;
      const entry: { ref: string; form: string; group: string; remark?: string } = {
        ref: s.verseRef as string,
        form: s.form as string,
        group: s.rootKey as string,
      };
      if (s.remark) entry.remark = s.remark as string;
      output.selections[sec].push(entry);
    }

    navigator.clipboard.writeText(JSON.stringify(output, null, 2));
    alert("Selections JSON copied to clipboard!");
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 font-sans">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <Link href="/" className="text-xs text-emerald-700 hover:underline">
            &larr; Dashboard
          </Link>
          <h1 className="text-xl font-bold text-emerald-800 mt-1">
            L{lessonNumber}. {lesson.title as string} — Verse Picker
          </h1>
          <div className="text-lg font-arabic mt-1" dir="rtl">
            {lesson.seedArabic as string}
          </div>
        </div>
        <button
          onClick={exportSelections}
          className="px-4 py-2 bg-emerald-700 text-white rounded-lg text-sm font-medium hover:bg-emerald-800"
        >
          Copy JSON
        </button>
      </div>

      {/* Counters */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <CounterPill
          label="All"
          count={verses.length}
          active={filter === "all"}
          onClick={() => setFilter("all")}
          color="bg-gray-200 text-gray-700"
        />
        {SECTIONS.map((s) => (
          <CounterPill
            key={s.key}
            label={s.label}
            count={counts[s.key]}
            active={filter === s.key}
            onClick={() => setFilter(filter === s.key ? "all" : s.key)}
            color={s.color}
          />
        ))}
        <div className="flex-1" />
        <label className="flex items-center gap-1 text-xs text-gray-500">
          <input
            type="checkbox"
            checked={groupByRoot}
            onChange={(e) => setGroupByRoot(e.target.checked)}
          />
          Group by root
        </label>
      </div>

      {/* No verses */}
      {verses.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <p className="text-lg mb-2">No verses loaded for Lesson {lessonNumber}</p>
          <Link href="/seed" className="text-emerald-700 underline text-sm">
            Go to Seed page to load verse data
          </Link>
        </div>
      )}

      {/* Verse cards */}
      {Object.entries(groups).map(([rootKey, rootVerses]) => (
        <div key={rootKey} className="mb-6">
          {groupByRoot && rootKey !== "all" && (
            <h2 className="text-sm font-semibold text-gray-600 mb-2 uppercase tracking-wider">
              {rootKey} ({rootVerses.length} verses)
            </h2>
          )}
          <div className="space-y-3">
            {rootVerses.map((v) => (
              <VerseCard
                key={v.id as string}
                verse={v}
                section={getSection(v.ref as string)}
                remark={(selectionMap[v.ref as string]?.remark as string) ?? ""}
                onSetSection={(sec) =>
                  setVerseSection(v.ref as string, sec, v.rootKey as string, v.form as string)
                }
                onSetRemark={(r) =>
                  updateRemark(v.ref as string, r, v.rootKey as string, v.form as string)
                }
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function VerseCard({
  verse,
  section,
  remark,
  onSetSection,
  onSetRemark,
}: {
  verse: Record<string, unknown>;
  section: VerseSection;
  remark: string;
  onSetSection: (s: VerseSection) => void;
  onSetRemark: (r: string) => void;
}) {
  const [editingRemark, setEditingRemark] = useState(false);
  const [remarkDraft, setRemarkDraft] = useState(remark);
  const sectionStyle = SECTIONS.find((s) => s.key === section);

  return (
    <div
      className={`border rounded-lg p-4 ${
        section === "learning"
          ? "border-emerald-300 bg-emerald-50/50"
          : section === "recall"
          ? "border-blue-300 bg-blue-50/50"
          : section === "pipeline"
          ? "border-amber-300 bg-amber-50/50"
          : "border-gray-200 bg-white"
      }`}
    >
      <div className="flex gap-4">
        {/* Score badge */}
        <div className="flex flex-col items-center justify-start min-w-[48px]">
          <div className="text-lg font-bold text-emerald-700">
            {verse.scoreFinal != null
              ? (verse.scoreFinal as number).toFixed(1)
              : "--"}
          </div>
          <div className="text-[10px] text-gray-400">score</div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Arabic */}
          <div
            className="text-lg leading-relaxed font-arabic mb-1"
            dir="rtl"
          >
            {verse.arabicFull as string}
          </div>

          {/* Translation */}
          <div className="text-sm text-gray-600 mb-2">
            {verse.translation as string}
          </div>

          {/* Meta row */}
          <div className="flex items-center gap-3 text-xs text-gray-400 mb-2">
            <span>
              ({verse.surahName as string} {verse.ref as string})
            </span>
            <span>Form: <strong className="text-gray-600 font-arabic">{verse.form as string}</strong></span>
            <span>{verse.wordCount as number} words</span>
            {verse.fragment && (
              <span className="text-amber-600 font-medium">FRAGMENT</span>
            )}
          </div>

          {/* Section buttons */}
          <div className="flex gap-2 mb-2">
            {SECTIONS.map((s) => (
              <button
                key={s.key}
                onClick={() => onSetSection(s.key)}
                className={`px-3 py-1 rounded border text-xs font-medium transition-colors ${
                  section === s.key
                    ? s.color + " border-current"
                    : "bg-white text-gray-400 border-gray-200 hover:border-gray-400"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* Remark */}
          {editingRemark ? (
            <div className="flex gap-2">
              <input
                autoFocus
                value={remarkDraft}
                onChange={(e) => setRemarkDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    onSetRemark(remarkDraft);
                    setEditingRemark(false);
                  }
                  if (e.key === "Escape") {
                    setRemarkDraft(remark);
                    setEditingRemark(false);
                  }
                }}
                className="flex-1 border rounded px-2 py-1 text-sm"
                placeholder="Why this verse?"
              />
              <button
                onClick={() => {
                  onSetRemark(remarkDraft);
                  setEditingRemark(false);
                }}
                className="px-2 py-1 bg-emerald-700 text-white rounded text-xs"
              >
                Save
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                setRemarkDraft(remark);
                setEditingRemark(true);
              }}
              className={`text-xs ${
                remark
                  ? "text-emerald-700"
                  : "text-gray-400 hover:text-gray-600"
              }`}
            >
              {remark || "+ Add remark"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function CounterPill({
  label,
  count,
  active,
  onClick,
  color,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
  color: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
        active ? color + " border-current ring-2 ring-offset-1 ring-current/20" : "bg-white text-gray-500 border-gray-200"
      }`}
    >
      {label} <span className="font-bold">{count}</span>
    </button>
  );
}
