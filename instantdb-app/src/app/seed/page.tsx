"use client";

import { useState } from "react";
import { id, tx } from "@instantdb/react";
import db from "@/lib/instant";
import Link from "next/link";

// Real data from teacher/pipeline-status.json
const LESSONS = [
  {
    lessonNumber: 1,
    slug: "lesson-01-allahu-akbar",
    title: "Allahu Akbar",
    seedArabic: "اللهُ أَكْبَرُ",
    seedEnglish: "Allah is Greater",
    roots: JSON.stringify(["ilah", "kabura"]),
    currentPhase: "published",
    notes: "Live since initial launch",
    phaseScoring: "done",
    phasePicking: "done",
    phaseWriting: "done",
    phaseTamil: "done",
    phaseAudio: "done",
    phaseReview: "done",
    phasePublished: "done",
  },
  {
    lessonNumber: 2,
    slug: "lesson-02-shahida",
    title: "I Bear Witness",
    seedArabic: "أَشْهَدُ أَنْ لَا إِلَٰهَ إِلَّا ٱللَّهُ",
    seedEnglish: "I bear witness that there is no god but Allah",
    roots: JSON.stringify(["shahida"]),
    currentPhase: "published",
    notes: "Live",
    phaseScoring: "done",
    phasePicking: "done",
    phaseWriting: "done",
    phaseTamil: "done",
    phaseAudio: "done",
    phaseReview: "done",
    phasePublished: "done",
  },
  {
    lessonNumber: 3,
    slug: "lesson-03-rasul",
    title: "Messenger of Allah",
    seedArabic: "أَشْهَدُ أَنَّ مُحَمَّدًا رَسُولُ ٱللَّهِ",
    seedEnglish: "I bear witness that Muhammad is the Messenger of Allah",
    roots: JSON.stringify(["rasul"]),
    currentPhase: "picking",
    notes: "42 verses scored, picker ready for teacher review",
    phaseScoring: "done",
    phasePicking: "ready",
    phaseWriting: "blocked",
    phaseTamil: "blocked",
    phaseAudio: "blocked",
    phaseReview: "blocked",
    phasePublished: "blocked",
  },
  {
    lessonNumber: 4,
    slug: "lesson-04-salah",
    title: "Come to Prayer",
    seedArabic: "حَيَّ عَلَى الصَّلَاةِ",
    seedEnglish: "Come to prayer",
    roots: JSON.stringify(["hayiya", "salah"]),
    currentPhase: "picking",
    notes: "52 verses scored across 2 roots",
    phaseScoring: "done",
    phasePicking: "ready",
    phaseWriting: "blocked",
    phaseTamil: "blocked",
    phaseAudio: "blocked",
    phaseReview: "blocked",
    phasePublished: "blocked",
  },
  {
    lessonNumber: 5,
    slug: "lesson-05-falaha",
    title: "Come to Success",
    seedArabic: "حَيَّ عَلَى الْفَلَاحِ",
    seedEnglish: "Come to success",
    roots: JSON.stringify(["falaha"]),
    currentPhase: "picking",
    notes: "25 verses scored, only 2 forms (aflaha, muflih)",
    phaseScoring: "done",
    phasePicking: "ready",
    phaseWriting: "blocked",
    phaseTamil: "blocked",
    phaseAudio: "blocked",
    phaseReview: "blocked",
    phasePublished: "blocked",
  },
  {
    lessonNumber: 6,
    slug: "lesson-06-khayr",
    title: "Prayer is Better than Sleep",
    seedArabic: "الصَّلَاةُ خَيْرٌ مِنَ النَّوْمِ",
    seedEnglish: "Prayer is better than sleep",
    roots: JSON.stringify(["khayr", "nawm"]),
    currentPhase: "picking",
    notes: "35 verses scored; nawm has only 9 candidates total",
    phaseScoring: "done",
    phasePicking: "ready",
    phaseWriting: "blocked",
    phaseTamil: "blocked",
    phaseAudio: "blocked",
    phaseReview: "blocked",
    phasePublished: "blocked",
  },
  {
    lessonNumber: 7,
    slug: "lesson-07-qama",
    title: "The Prayer Has Begun",
    seedArabic: "قَدْ قَامَتِ الصَّلَاةُ",
    seedEnglish: "The prayer has begun",
    roots: JSON.stringify(["qama"]),
    currentPhase: "picking",
    notes: "34 verses scored; mostly qawm (people) form",
    phaseScoring: "done",
    phasePicking: "ready",
    phaseWriting: "blocked",
    phaseTamil: "blocked",
    phaseAudio: "blocked",
    phaseReview: "blocked",
    phasePublished: "blocked",
  },
];

// All lessons with their root JSONs
const LOADABLE_LESSONS = [
  { num: 1, label: "L1 — ilah + kabura", roots: "ilah, kabura", verseEstimate: "29" },
  { num: 2, label: "L2 — shahida", roots: "shahida", verseEstimate: "20" },
  { num: 3, label: "L3 — rasul", roots: "rasul", verseEstimate: "429" },
  { num: 4, label: "L4 — hayiya + salah", roots: "hayiya, salah", verseEstimate: "256" },
  { num: 5, label: "L5 — falaha", roots: "falaha", verseEstimate: "40" },
  { num: 6, label: "L6 — khayr + nawm", roots: "khayr, nawm", verseEstimate: "187" },
  { num: 7, label: "L7 — qama", roots: "qama", verseEstimate: "597" },
];

export default function SeedPage() {
  const [log, setLog] = useState<string[]>([]);
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  const { data } = db.useQuery({ lessons: {}, verses: {}, selections: {} });

  const addLog = (msg: string) =>
    setLog((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);

  const setBusy = (key: string, busy: boolean) =>
    setLoading((prev) => ({ ...prev, [key]: busy }));

  // --- Seed lessons ---
  async function seedLessons() {
    setBusy("lessons", true);
    addLog("Seeding 7 lessons...");
    const txns = LESSONS.map((lesson) => tx.lessons[id()].update(lesson));
    await db.transact(txns);
    addLog(`Done — seeded ${LESSONS.length} lessons`);
    setBusy("lessons", false);
  }

  // --- Load verses for a lesson from API route (reads root JSONs from disk) ---
  async function loadVerses(lessonNumber: number) {
    const key = `verses-${lessonNumber}`;
    setBusy(key, true);
    addLog(`Loading verses for Lesson ${lessonNumber} from root JSONs...`);

    try {
      const res = await fetch(`/api/roots?lesson=${lessonNumber}`);
      if (!res.ok) {
        addLog(`ERROR: API returned ${res.status}`);
        setBusy(key, false);
        return;
      }
      const { verses, totalVerses, rootKeys } = await res.json();
      addLog(`API returned ${totalVerses} verses for roots: ${rootKeys.join(", ")}`);

      // Batch in chunks of 100 to avoid hitting limits
      const CHUNK = 100;
      for (let i = 0; i < verses.length; i += CHUNK) {
        const chunk = verses.slice(i, i + CHUNK);
        const txns = chunk.map(
          (v: Record<string, unknown>) => tx.verses[id()].update(v)
        );
        await db.transact(txns);
        addLog(
          `  Wrote ${Math.min(i + CHUNK, verses.length)}/${verses.length} verses`
        );
      }

      addLog(`Done — loaded ${totalVerses} verses for Lesson ${lessonNumber}`);
    } catch (e) {
      addLog(`ERROR: ${e instanceof Error ? e.message : String(e)}`);
    }
    setBusy(key, false);
  }

  // --- Seed everything at once ---
  async function seedAll() {
    await seedLessons();
    for (const l of LOADABLE_LESSONS) {
      await loadVerses(l.num);
    }
    addLog("=== All done! ===");
  }

  // --- Clear all data ---
  async function clearAll() {
    setBusy("clear", true);
    addLog("Clearing all data...");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const txns: any[] = [];

    if (data?.lessons) {
      for (const l of data.lessons) txns.push(tx.lessons[l.id].delete());
    }
    if (data?.verses) {
      for (const v of data.verses) txns.push(tx.verses[v.id].delete());
    }
    if (data?.selections) {
      for (const s of data.selections) txns.push(tx.selections[s.id].delete());
    }

    if (txns.length > 0) {
      // Batch deletes in chunks
      const CHUNK = 100;
      for (let i = 0; i < txns.length; i += CHUNK) {
        await db.transact(txns.slice(i, i + CHUNK));
      }
    }
    addLog(`Cleared ${txns.length} records`);
    setBusy("clear", false);
  }

  // --- Counts ---
  const lessonCount = data?.lessons?.length ?? 0;
  const verseCount = data?.verses?.length ?? 0;
  const selectionCount = data?.selections?.length ?? 0;

  // Per-lesson verse counts
  const versesPerLesson: Record<number, number> = {};
  for (const v of data?.verses ?? []) {
    const ln = v.lessonNumber as number;
    versesPerLesson[ln] = (versesPerLesson[ln] ?? 0) + 1;
  }

  return (
    <div className="max-w-3xl mx-auto p-6 font-sans">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-emerald-800">
            Seed InstantDB
          </h1>
          <p className="text-sm text-gray-500">
            Load real data from <code>docs/roots/*.json</code> and{" "}
            <code>pipeline-status.json</code>
          </p>
        </div>
        <Link href="/" className="text-sm text-emerald-700 hover:underline">
          &larr; Dashboard
        </Link>
      </div>

      {/* DB State */}
      <div className="bg-white border rounded-lg p-4 mb-6">
        <h2 className="font-semibold text-sm text-gray-700 mb-2">
          Current DB State
        </h2>
        <div className="flex gap-6 text-sm">
          <div>
            <span className="text-2xl font-bold text-emerald-700">
              {lessonCount}
            </span>{" "}
            <span className="text-gray-500">lessons</span>
          </div>
          <div>
            <span className="text-2xl font-bold text-blue-700">
              {verseCount}
            </span>{" "}
            <span className="text-gray-500">verses</span>
          </div>
          <div>
            <span className="text-2xl font-bold text-amber-700">
              {selectionCount}
            </span>{" "}
            <span className="text-gray-500">selections</span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <button
          onClick={seedAll}
          disabled={loading.lessons}
          className="px-4 py-2 bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 text-sm font-medium disabled:opacity-50"
        >
          {loading.lessons ? "Working..." : "Seed Everything"}
        </button>
        <button
          onClick={seedLessons}
          disabled={loading.lessons}
          className="px-4 py-2 bg-white border border-emerald-700 text-emerald-700 rounded-lg hover:bg-emerald-50 text-sm font-medium disabled:opacity-50"
        >
          Lessons Only
        </button>
        <button
          onClick={clearAll}
          disabled={loading.clear}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium disabled:opacity-50"
        >
          {loading.clear ? "Clearing..." : "Clear All"}
        </button>
      </div>

      {/* Per-lesson verse loading */}
      <div className="bg-white border rounded-lg overflow-hidden mb-6">
        <div className="px-4 py-3 border-b bg-gray-50">
          <h2 className="font-semibold text-sm text-gray-700">
            Load Verses Per Lesson
          </h2>
          <p className="text-xs text-gray-500">
            Reads from <code>docs/roots/*.json</code> via API route
          </p>
        </div>
        <div className="divide-y">
          {LOADABLE_LESSONS.map((l) => {
            const key = `verses-${l.num}`;
            const loaded = versesPerLesson[l.num] ?? 0;
            return (
              <div
                key={l.num}
                className="px-4 py-3 flex items-center justify-between"
              >
                <div>
                  <span className="font-medium text-sm">{l.label}</span>
                  <span className="text-xs text-gray-400 ml-2">
                    ({l.roots}) ~{l.verseEstimate} verses
                  </span>
                  {loaded > 0 && (
                    <span className="text-xs text-emerald-600 ml-2">
                      {loaded} loaded
                    </span>
                  )}
                </div>
                <div className="flex gap-2 items-center">
                  {loaded > 0 && (
                    <Link
                      href={`/picker/${l.num}`}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      Open Picker
                    </Link>
                  )}
                  <button
                    onClick={() => loadVerses(l.num)}
                    disabled={loading[key]}
                    className="px-3 py-1 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700 disabled:opacity-50"
                  >
                    {loading[key] ? "Loading..." : "Load"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Log */}
      {log.length > 0 && (
        <div className="bg-gray-900 text-gray-200 p-4 rounded-lg text-xs font-mono max-h-80 overflow-auto">
          {log.map((l, i) => (
            <div key={i} className="py-0.5">
              {l}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
