"use client";

import { use, useState, useMemo, useRef } from "react";
import { tx, id as iid } from "@instantdb/react";
import db from "@/lib/instant";
import { useRouter } from "next/navigation";
import type { VerseSection } from "@/lib/types";
import IssueBar from "@/components/IssueBar";

const SECTIONS: { key: VerseSection; label: string }[] = [
  { key: "learning", label: "Learning" },
  { key: "recall", label: "Recall" },
  { key: "pipeline", label: "Pipeline" },
];

const RECITERS = [
  { name: "Alafasy", folder: "Alafasy_128kbps" },
  { name: "Husary", folder: "Husary_128kbps" },
  { name: "Abdul Basit (Murattal)", folder: "Abdul_Basit_Murattal_192kbps" },
  { name: "Abdul Basit (Mujawwad)", folder: "Abdul_Basit_Mujawwad_128kbps" },
  { name: "Hani Ar-Rifai", folder: "Hani_Rifai_192kbps" },
  { name: "Hudhaifi", folder: "Hudhaify_128kbps" },
  { name: "Ash-Shatri", folder: "Abu_Bakr_Ash-Shaatree_128kbps" },
  { name: "Al-Juhainy", folder: "Abdullaah_3awwaad_Al-Juhaynee_128kbps" },
  { name: "Maher Al-Muaiqly", folder: "MaherAlMuaiqly128kbps" },
  { name: "As-Sudais", folder: "Abdurrahmaan_As-Sudais_192kbps" },
  { name: "Yasser Ad-Dussary", folder: "Yasser_Ad-Dussary_128kbps" },
];

function buildAudioUrl(ref: string, reciterFolder: string) {
  const [surah, ayah] = ref.split(":");
  return `https://everyayah.com/data/${reciterFolder}/${surah.padStart(3, "0")}${ayah.padStart(3, "0")}.mp3`;
}

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
    issues: {},
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen text-gray-500">
        Loading...
      </div>
    );
  }

  const lessons = (data?.lessons ?? []).sort(
    (a: Record<string, unknown>, b: Record<string, unknown>) =>
      (a.lessonNumber as number) - (b.lessonNumber as number)
  );

  const lesson = lessons.find(
    (l: Record<string, unknown>) => l.lessonNumber === lessonNumber
  );

  if (!lesson) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <p className="text-red-600">Lesson {lessonNumber} not found.</p>
      </div>
    );
  }

  const verses = (data?.verses ?? [])
    .filter((v: Record<string, unknown>) => v.lessonNumber === lessonNumber)
    .sort((a: Record<string, unknown>, b: Record<string, unknown>) => {
      return ((b.scoreFinal as number) ?? 0) - ((a.scoreFinal as number) ?? 0);
    });

  const selections = data?.selections ?? [];
  const issues = data?.issues ?? [];

  return (
    <PickerContent
      lesson={lesson}
      lessons={lessons}
      verses={verses}
      selections={selections}
      issues={issues}
      lessonNumber={lessonNumber}
    />
  );
}

function PickerContent({
  lesson,
  lessons,
  verses,
  selections,
  issues,
  lessonNumber,
}: {
  lesson: Record<string, unknown>;
  lessons: Record<string, unknown>[];
  verses: Record<string, unknown>[];
  selections: Record<string, unknown>[];
  issues: Record<string, unknown>[];
  lessonNumber: number;
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<VerseSection | "all">("all");
  const [groupByRoot, setGroupByRoot] = useState(true);

  // Track currently playing audio for mutual exclusion
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  const selectionMap = useMemo(() => {
    const map: Record<string, Record<string, unknown>> = {};
    for (const s of selections) {
      if ((s.lessonNumber as number) === lessonNumber) {
        map[s.verseRef as string] = s;
      }
    }
    return map;
  }, [selections, lessonNumber]);

  // Build issue map: verseRef -> issue record
  const issueMap = useMemo(() => {
    const map: Record<string, Record<string, unknown>> = {};
    for (const iss of issues) {
      if ((iss.lessonNumber as number) === lessonNumber) {
        map[iss.verseRef as string] = iss;
      }
    }
    return map;
  }, [issues, lessonNumber]);

  function getSection(verseRef: string): VerseSection {
    return (selectionMap[verseRef]?.section as VerseSection) ?? "none";
  }

  const counts = useMemo(() => {
    const c: Record<VerseSection, number> = { learning: 0, recall: 0, pipeline: 0, none: 0 };
    for (const v of verses) {
      c[getSection(v.ref as string)]++;
    }
    return c;
  }, [verses, selectionMap]);

  const filtered =
    filter === "all"
      ? verses
      : verses.filter((v) => getSection(v.ref as string) === filter);

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

  function setVerseSection(verseRef: string, newSection: VerseSection, rootKey: string, form: string) {
    const current = getSection(verseRef);
    // Toggle: clicking active button deselects back to none
    const section = current === newSection ? "none" : newSection;
    const existing = selectionMap[verseRef];
    if (existing) {
      db.transact(
        tx.selections[existing.id as string].update({ section, updatedAt: Date.now() })
      );
    } else {
      db.transact(
        tx.selections[iid()].update({
          lessonNumber, verseRef, section, rootKey, form, remark: "", updatedAt: Date.now(),
        })
      );
    }
  }

  function updateRemark(verseRef: string, remark: string, rootKey: string, form: string) {
    const existing = selectionMap[verseRef];
    if (existing) {
      db.transact(
        tx.selections[existing.id as string].update({ remark, updatedAt: Date.now() })
      );
    } else {
      db.transact(
        tx.selections[iid()].update({
          lessonNumber, verseRef, section: "none" as VerseSection, rootKey, form, remark, updatedAt: Date.now(),
        })
      );
    }
  }

  function handlePlay(audioEl: HTMLAudioElement) {
    if (currentAudioRef.current && currentAudioRef.current !== audioEl) {
      currentAudioRef.current.pause();
    }
    currentAudioRef.current = audioEl;
  }

  return (
    <div className="px-8 py-6 font-sans max-w-[980px]">
      {/* Sticky top bar */}
      <div className="sticky top-0 z-50 bg-[rgba(250,248,243,0.97)] backdrop-blur-sm pb-3 pt-2 -mx-8 px-8 border-b border-[#e5e5e5] mb-4 flex items-center gap-3 flex-wrap">
        {/* Lesson selector */}
        <select
          value={lessonNumber}
          onChange={(e) => router.push(`/picker/${e.target.value}`)}
          className="text-[0.82rem] font-semibold px-3 py-[0.4rem] border-2 border-[#0f766e] rounded-lg bg-white text-[#0f766e] cursor-pointer"
        >
          {lessons.map((l: Record<string, unknown>) => (
            <option key={l.lessonNumber as number} value={l.lessonNumber as number}>
              L{l.lessonNumber as number} — {l.title as string}
            </option>
          ))}
        </select>

        {/* Counter pills */}
        <div className="flex gap-2 flex-wrap">
          <CounterPill label="All" count={verses.length} active={filter === "all"} onClick={() => setFilter("all")} />
          {SECTIONS.map((s) => (
            <CounterPill
              key={s.key}
              label={s.label}
              count={counts[s.key]}
              active={filter === s.key}
              onClick={() => setFilter(filter === s.key ? "all" : s.key)}
              variant={s.key}
            />
          ))}
        </div>

        <div className="ml-auto">
          <label className="flex items-center gap-1 text-[0.72rem] text-[#6b6b6b] cursor-pointer">
            <input type="checkbox" checked={groupByRoot} onChange={(e) => setGroupByRoot(e.target.checked)} />
            Group by root
          </label>
        </div>
      </div>

      {/* No verses */}
      {verses.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <p className="text-lg mb-2">No verses loaded for Lesson {lessonNumber}</p>
        </div>
      )}

      {/* Verse cards */}
      {Object.entries(groups).map(([rootKey, rootVerses]) => (
        <div key={rootKey} className="mb-6">
          {groupByRoot && rootKey !== "all" && (
            <h2
              id={`group-${rootKey}`}
              className="text-[1rem] font-bold text-[#6b6b6b] mb-1 uppercase tracking-wider pb-2 border-b border-[#e5e5e5]"
              style={{ scrollMarginTop: "5rem" }}
            >
              {rootKey} ({rootVerses.length} verses)
            </h2>
          )}
          <div className="grid gap-[0.9rem] mt-3">
            {rootVerses.map((v) => (
              <VerseCard
                key={v.id as string}
                verse={v}
                section={getSection(v.ref as string)}
                remark={(selectionMap[v.ref as string]?.remark as string) ?? ""}
                issue={issueMap[v.ref as string] ?? null}
                lessonNumber={lessonNumber}
                onSetSection={(sec) =>
                  setVerseSection(v.ref as string, sec, v.rootKey as string, v.form as string)
                }
                onSetRemark={(r) =>
                  updateRemark(v.ref as string, r, v.rootKey as string, v.form as string)
                }
                onPlay={handlePlay}
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
  issue,
  lessonNumber,
  onSetSection,
  onSetRemark,
  onPlay,
}: {
  verse: Record<string, unknown>;
  section: VerseSection;
  remark: string;
  issue: Record<string, unknown> | null;
  lessonNumber: number;
  onSetSection: (s: VerseSection) => void;
  onSetRemark: (r: string) => void;
  onPlay: (audio: HTMLAudioElement) => void;
}) {
  const [reciter, setReciter] = useState("Alafasy_128kbps");
  const audioRef = useRef<HTMLAudioElement>(null);
  const remarkRef = useRef<HTMLDivElement>(null);
  const [remarkEdited, setRemarkEdited] = useState(false);

  const score = verse.scoreFinal as number | null;
  const scoreClass =
    score != null && score >= 10
      ? "bg-[#dcfce7] text-[#16a34a]"
      : score != null && score >= 6
      ? "bg-[#fef9c3] text-[#854d0e]"
      : "bg-[#f3f4f6] text-[#6b6b6b]";

  const borderColor =
    section === "learning"
      ? "border-l-[#0f766e]"
      : section === "recall"
      ? "border-l-[#d97706]"
      : section === "pipeline"
      ? "border-l-[#6b7280]"
      : "border-l-[#e5e5e5]";

  function handleReciterChange(folder: string) {
    setReciter(folder);
    if (audioRef.current) {
      audioRef.current.src = buildAudioUrl(verse.ref as string, folder);
      audioRef.current.load();
    }
  }

  function handleRemarkBlur() {
    const text = remarkRef.current?.textContent ?? "";
    if (text !== remark) {
      onSetRemark(text);
      setRemarkEdited(true);
    }
  }

  return (
    <div
      data-testid="verse-card"
      data-section={section}
      className={`bg-white border border-[#e5e5e5] border-l-[6px] ${borderColor} rounded-[10px] p-4 relative`}
    >
      {/* Top row: ref + badges + section buttons */}
      <div className="flex items-start justify-between gap-4 mb-1">
        <div className="flex gap-2 items-center flex-wrap">
          <span className="font-bold text-[1rem]">{verse.ref as string}</span>
          <span className="badge-form">{verse.form as string}</span>
          <span className={`px-2 py-[0.15rem] rounded text-[0.74rem] font-medium ${scoreClass}`}>
            &#9733; {score != null ? score.toFixed(1) : "--"}
          </span>
        </div>
        <div className="flex gap-[0.3rem]">
          {SECTIONS.map((s) => {
            const isActive = section === s.key;
            const activeStyle =
              s.key === "learning"
                ? "bg-[#0f766e] border-[#0f766e] text-white"
                : s.key === "recall"
                ? "bg-[#d97706] border-[#d97706] text-white"
                : "bg-[#6b7280] border-[#6b7280] text-white";
            return (
              <button
                type="button"
                key={s.key}
                onClick={() => onSetSection(s.key)}
                className={`px-[0.65rem] py-[0.3rem] rounded-[6px] text-[0.76rem] font-semibold border-[1.5px] transition-colors ${
                  isActive
                    ? activeStyle
                    : "bg-white text-[#6b6b6b] border-[#e5e5e5] hover:border-[#1a1a1a] hover:text-[#1a1a1a]"
                }`}
              >
                {s.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Arabic */}
      <div className="font-arabic text-[1.4rem] leading-[2] mt-2 mb-1" dir="rtl" style={{ textAlign: "right" }}>
        {verse.arabicFull as string}
      </div>

      {/* Audio player */}
      <div className="flex items-center gap-2 my-1">
        <audio
          ref={audioRef}
          controls
          preload="none"
          src={buildAudioUrl(verse.ref as string, reciter)}
          onPlay={() => audioRef.current && onPlay(audioRef.current)}
          className="h-7 flex-1 max-w-[320px] rounded"
        />
        <select
          value={reciter}
          onChange={(e) => handleReciterChange(e.target.value)}
          className="text-[0.72rem] px-1 py-[0.2rem] border border-[#e5e5e5] rounded bg-white text-[#6b6b6b] cursor-pointer focus:outline-none focus:border-[#0f766e]"
        >
          {RECITERS.map((r) => (
            <option key={r.folder} value={r.folder}>{r.name}</option>
          ))}
        </select>
      </div>

      {/* Translation */}
      <div className="italic text-[0.9rem] text-[#374151] mb-1">
        {verse.translation as string}
      </div>

      {/* Meta row */}
      <div className="flex items-center gap-2 text-[0.72rem] text-[#6b6b6b] mb-1 flex-wrap">
        <span>({verse.surahName as string} {verse.ref as string})</span>
        <span>
          Form: <strong className="font-arabic text-[#1a1a1a]">{verse.form as string}</strong>
        </span>
        <span>{verse.wordCount as number} words</span>
        {verse.fragment && (
          <span className="text-[#d97706] font-semibold">FRAGMENT</span>
        )}
      </div>

      {/* Remark — always visible, inline editable */}
      <div className="text-[0.7rem] font-semibold text-[#6b6b6b] uppercase tracking-wider mt-2 mb-1">
        Remark
      </div>
      <div
        ref={remarkRef}
        contentEditable
        suppressContentEditableWarning
        onBlur={handleRemarkBlur}
        className={`text-[0.85rem] px-2 py-1 rounded-[6px] min-h-[1.5rem] transition-colors ${
          remark || remarkEdited
            ? "border-[1.5px] border-dashed border-[#0f766e] bg-[#ccfbf1] text-[#1a1a1a]"
            : "border-[1.5px] border-dashed border-transparent text-[#6b6b6b] hover:border-[#e5e5e5] hover:bg-[#fafafa]"
        } focus:outline-none focus:border-[#0f766e] focus:bg-white focus:text-[#1a1a1a]`}
      >
        {remark || "Click to add remark..."}
      </div>

      {/* Issue bar */}
      <IssueBar
        verseRef={verse.ref as string}
        lessonNumber={lessonNumber}
        existingIssue={issue}
      />
    </div>
  );
}

function CounterPill({
  label,
  count,
  active,
  onClick,
  variant,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
  variant?: string;
}) {
  const filledStyle =
    variant === "learning"
      ? "bg-[#ccfbf1] border-[#0f766e] text-[#0f766e]"
      : variant === "recall"
      ? "bg-[#fef3c7] border-[#d97706] text-[#d97706]"
      : variant === "pipeline"
      ? "bg-[#f3f4f6] border-[#6b7280] text-[#6b7280]"
      : "bg-[#e5e5e5] border-[#999] text-[#6b6b6b]";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-[0.7rem] py-[0.35rem] rounded-full text-[0.75rem] font-semibold border-2 transition-all ${
        active
          ? `${filledStyle} shadow-[0_0_0_2px_rgba(15,118,110,0.15)]`
          : "bg-white text-[#6b6b6b] border-[#e5e5e5] hover:border-[#999]"
      }`}
    >
      {label} <span className="font-bold">{count}</span>
    </button>
  );
}
