"use client";

import { useState } from "react";
import { tx } from "@instantdb/react";
import Link from "next/link";
import db from "@/lib/instant";
import {
  PHASE_ORDER,
  PHASE_LABELS,
  PHASE_FIELD,
  type PhaseName,
  type PhaseStatus,
  isPhaseStatus,
} from "@/lib/types";

type LessonRow = {
  id: string;
  lessonNumber: number;
  slug: string;
  title: string;
  notes?: string;
  seedArabic?: string;
  seedEnglish?: string;
  phaseSelection: string;
  phaseAnnotation: string;
  phaseAudio: string;
  phaseQA: string;
  phasePublished: string;
};

function statusOf(lesson: LessonRow, phase: PhaseName): PhaseStatus {
  const raw = lesson[PHASE_FIELD[phase] as keyof LessonRow];
  return isPhaseStatus(raw) ? raw : "blocked";
}

function StatusDot({ status }: { status: PhaseStatus }) {
  const styles: Record<PhaseStatus, string> = {
    done: "bg-green-500 text-white",
    ready: "bg-blue-500 animate-pulse text-white",
    wip: "bg-amber-500 text-white",
    blocked: "bg-gray-200 text-gray-400",
  };
  const glyph: Record<PhaseStatus, string> = {
    done: "\u2713",
    ready: "\u25B6",
    wip: "\u2022",
    blocked: "\u2012",
  };
  return (
    <span
      className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold ${styles[status]}`}
    >
      {glyph[status]}
    </span>
  );
}

function PhaseCell({ lesson, phase }: { lesson: LessonRow; phase: PhaseName }) {
  const status = statusOf(lesson, phase);
  function cycle() {
    const order: PhaseStatus[] = ["blocked", "ready", "wip", "done"];
    const next = order[(order.indexOf(status) + 1) % order.length];
    db.transact(tx.lessons[lesson.id].update({ [PHASE_FIELD[phase]]: next }));
  }
  return (
    <td className="px-2 py-3 text-center">
      <button onClick={cycle} title={`${phase}: ${status} (click to cycle)`}>
        <StatusDot status={status} />
      </button>
    </td>
  );
}

export default function Dashboard() {
  const { isLoading, error, data } = db.useQuery({ lessons: {} });
  const [expanded, setExpanded] = useState<string | null>(null);

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen text-gray-500">Loading...</div>;
  }
  if (error) {
    return <div className="flex items-center justify-center h-screen text-red-600">Error: {error.message}</div>;
  }

  const lessons = [...(data?.lessons ?? [])].sort(
    (a, b) => a.lessonNumber - b.lessonNumber,
  ) as unknown as LessonRow[];

  const published = lessons.filter((l) => l.phasePublished === "done").length;
  const inProgress = lessons.filter((l) => l.phasePublished !== "done").length;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 font-sans">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-emerald-800">Teacher Dashboard</h1>
        <p className="text-xs text-gray-500">Learn Qur&apos;an Without Grammar — Pipeline Governance</p>
      </div>

      <div className="flex gap-4 mb-6">
        <StatCard value={lessons.length} label="Total Lessons" />
        <StatCard value={published} label="Published" />
        <StatCard value={inProgress} label="In Progress" />
      </div>

      <div className="bg-white border rounded-lg overflow-hidden mb-6">
        <table className="w-full">
          <thead>
            <tr className="border-b-2 border-gray-200 bg-gray-50">
              <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider w-56">
                Lesson
              </th>
              {PHASE_ORDER.map((p) => (
                <th key={p} className="px-2 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">
                  {PHASE_LABELS[p]}
                </th>
              ))}
              <th className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">
                Picker
              </th>
            </tr>
          </thead>
          <tbody>
            {lessons.map((lesson) => (
              <LessonRowComp
                key={lesson.id}
                lesson={lesson}
                expanded={expanded === lesson.id}
                onToggle={() => setExpanded((cur) => (cur === lesson.id ? null : lesson.id))}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function LessonRowComp({
  lesson,
  expanded,
  onToggle,
}: {
  lesson: LessonRow;
  expanded: boolean;
  onToggle: () => void;
}) {
  const pickerReady = statusOf(lesson, "selection") !== "blocked";
  return (
    <>
      <tr className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer" onClick={onToggle}>
        <td className="px-4 py-3">
          <div className="font-semibold text-sm">
            L{lesson.lessonNumber}. {lesson.title}
          </div>
          {lesson.seedArabic && (
            <div className="text-sm text-gray-600 font-arabic" dir="rtl">
              {lesson.seedArabic}
            </div>
          )}
        </td>
        {PHASE_ORDER.map((phase) => (
          <PhaseCell key={phase} lesson={lesson} phase={phase} />
        ))}
        <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
          {pickerReady ? (
            <Link
              href={`/picker/${lesson.lessonNumber}`}
              className="inline-block px-3 py-1 bg-blue-50 text-blue-700 rounded text-xs font-medium hover:bg-blue-100"
            >
              Open picker
            </Link>
          ) : (
            <span className="text-xs text-gray-300">--</span>
          )}
        </td>
      </tr>
      {expanded && (
        <tr className="border-b-2 border-gray-200">
          <td colSpan={PHASE_ORDER.length + 2} className="bg-gray-50 px-6 py-4">
            <LessonDetail lesson={lesson} />
          </td>
        </tr>
      )}
    </>
  );
}

function LessonDetail({ lesson }: { lesson: LessonRow }) {
  const [notes, setNotes] = useState(lesson.notes ?? "");
  const [dirty, setDirty] = useState(false);
  function save() {
    db.transact(tx.lessons[lesson.id].update({ notes }));
    setDirty(false);
  }
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-gray-500">Slug:</span>{" "}
          <code className="bg-gray-100 px-1 rounded text-xs">{lesson.slug}</code>
        </div>
        <div>
          <span className="text-gray-500">Published phase:</span>{" "}
          <span className="font-medium">{lesson.phasePublished}</span>
        </div>
      </div>
      <div>
        <label className="text-xs text-gray-500 block mb-1">Notes</label>
        <div className="flex gap-2">
          <input
            value={notes}
            onChange={(e) => {
              setNotes(e.target.value);
              setDirty(true);
            }}
            className="flex-1 border rounded px-2 py-1 text-sm"
          />
          {dirty && (
            <button onClick={save} className="px-3 py-1 bg-emerald-700 text-white rounded text-xs font-medium">
              Save
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ value, label }: { value: number; label: string }) {
  return (
    <div className="bg-white border rounded-lg px-4 py-3 min-w-[100px]">
      <div className="text-2xl font-bold text-emerald-800">{value}</div>
      <div className="text-[10px] text-gray-500 uppercase tracking-wider">{label}</div>
    </div>
  );
}
