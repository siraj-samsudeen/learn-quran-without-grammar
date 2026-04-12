"use client";

import { useState } from "react";
import db from "@/lib/instant";
import { tx } from "@instantdb/react";
import Link from "next/link";
import {
  PHASE_ORDER,
  PHASE_LABELS,
  type PhaseName,
  type PhaseStatus,
} from "@/lib/types";

const PHASE_FIELD: Record<PhaseName, string> = {
  scoring: "phaseScoring",
  picking: "phasePicking",
  writing: "phaseWriting",
  tamil: "phaseTamil",
  audio: "phaseAudio",
  review: "phaseReview",
  published: "phasePublished",
};

function getPhaseStatus(
  lesson: Record<string, unknown>,
  phase: PhaseName
): PhaseStatus {
  return (lesson[PHASE_FIELD[phase]] as PhaseStatus) ?? "blocked";
}

function StatusDot({ status }: { status: PhaseStatus }) {
  const styles: Record<PhaseStatus, string> = {
    done: "bg-green-500",
    ready: "bg-blue-500 animate-pulse",
    wip: "bg-amber-500",
    blocked: "bg-gray-200 text-gray-400",
  };
  const labels: Record<PhaseStatus, string> = {
    done: "\u2713",
    ready: "\u25B6",
    wip: "\u2022",
    blocked: "\u2012",
  };
  return (
    <span
      className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold text-white ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}

function PhaseCell({
  lesson,
  phase,
}: {
  lesson: Record<string, unknown>;
  phase: PhaseName;
}) {
  const status = getPhaseStatus(lesson, phase);

  function cycleStatus() {
    const order: PhaseStatus[] = ["blocked", "ready", "wip", "done"];
    const next = order[(order.indexOf(status) + 1) % order.length];
    db.transact(
      tx.lessons[lesson.id as string].update({ [PHASE_FIELD[phase]]: next })
    );
  }

  return (
    <td className="px-2 py-3 text-center">
      <button onClick={cycleStatus} title={`${phase}: ${status} (click to cycle)`}>
        <StatusDot status={status} />
      </button>
    </td>
  );
}

export default function Dashboard() {
  const { isLoading, error, data } = db.useQuery({ lessons: {} });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen text-gray-500">
        Loading...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen text-red-600">
        Error: {error.message}
      </div>
    );
  }

  const lessons = (data?.lessons ?? []).sort(
    (a: Record<string, unknown>, b: Record<string, unknown>) =>
      (a.lessonNumber as number) - (b.lessonNumber as number)
  );

  const published = lessons.filter(
    (l: Record<string, unknown>) => l.currentPhase === "published"
  ).length;
  const inProgress = lessons.filter(
    (l: Record<string, unknown>) =>
      l.currentPhase !== "published" && l.currentPhase !== "scoring"
  ).length;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 font-sans">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-emerald-800">
          Teacher Dashboard
        </h1>
        <p className="text-xs text-gray-500">
          Learn Qur'an Without Grammar — Pipeline Governance
        </p>
      </div>

      {/* Stats */}
      <div className="flex gap-4 mb-6">
        <StatCard value={lessons.length} label="Total Lessons" />
        <StatCard value={published} label="Published" />
        <StatCard value={inProgress} label="In Progress" />
      </div>

      {/* Pipeline Grid */}
      <div className="bg-white border rounded-lg overflow-hidden mb-6">
        <table className="w-full">
          <thead>
            <tr className="border-b-2 border-gray-200">
              <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider w-56">
                Lesson
              </th>
              {PHASE_ORDER.map((p) => (
                <th
                  key={p}
                  className="px-2 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center"
                >
                  {PHASE_LABELS[p]}
                </th>
              ))}
              <th className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">
                Picker
              </th>
            </tr>
          </thead>
          <tbody>
            {lessons.map((lesson: Record<string, unknown>) => (
              <LessonRow
                key={lesson.id as string}
                lesson={lesson}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Empty state */}
      {lessons.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <p className="text-lg mb-2">No lessons loaded</p>
          <Link
            href="/seed"
            className="text-emerald-700 underline text-sm"
          >
            Go to Seed page to load data
          </Link>
        </div>
      )}

      {/* Navigation */}
      <div className="flex gap-3 text-sm">
        <Link
          href="/seed"
          className="text-emerald-700 hover:underline"
        >
          Seed Data
        </Link>
      </div>
    </div>
  );
}

function LessonRow({ lesson }: { lesson: Record<string, unknown> }) {
  const [expanded, setExpanded] = useState(false);
  const pickerReady = getPhaseStatus(lesson, "scoring") === "done";

  return (
    <>
      <tr
        className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <td className="px-4 py-3">
          <div className="font-semibold text-sm">
            L{lesson.lessonNumber as number}. {lesson.title as string}
          </div>
          <div
            className="text-sm text-gray-600 font-arabic"
            dir="rtl"
          >
            {lesson.seedArabic as string}
          </div>
        </td>
        {PHASE_ORDER.map((phase) => (
          <PhaseCell key={phase} lesson={lesson} phase={phase} />
        ))}
        <td className="px-4 py-3 text-center">
          {pickerReady ? (
            <Link
              href={`/picker/${lesson.lessonNumber}`}
              className="inline-block px-3 py-1 bg-blue-50 text-blue-700 rounded text-xs font-medium hover:bg-blue-100"
              onClick={(e) => e.stopPropagation()}
            >
              Open
            </Link>
          ) : (
            <span className="text-xs text-gray-300">--</span>
          )}
        </td>
      </tr>
      {expanded && (
        <tr className="border-b-2 border-gray-200">
          <td
            colSpan={PHASE_ORDER.length + 2}
            className="bg-gray-50 px-6 py-4"
          >
            <LessonDetail lesson={lesson} />
          </td>
        </tr>
      )}
    </>
  );
}

function LessonDetail({ lesson }: { lesson: Record<string, unknown> }) {
  const [notes, setNotes] = useState(lesson.notes as string);
  const [dirty, setDirty] = useState(false);

  function saveNotes() {
    db.transact(tx.lessons[lesson.id as string].update({ notes }));
    setDirty(false);
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-gray-500">Slug:</span>{" "}
          <code className="bg-gray-100 px-1 rounded text-xs">
            {lesson.slug as string}
          </code>
        </div>
        <div>
          <span className="text-gray-500">Roots:</span>{" "}
          {JSON.parse(lesson.roots as string).join(", ")}
        </div>
        <div>
          <span className="text-gray-500">Current Phase:</span>{" "}
          <span className="font-medium">{lesson.currentPhase as string}</span>
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
            <button
              onClick={saveNotes}
              className="px-3 py-1 bg-emerald-700 text-white rounded text-xs font-medium"
            >
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
      <div className="text-[10px] text-gray-500 uppercase tracking-wider">
        {label}
      </div>
    </div>
  );
}

