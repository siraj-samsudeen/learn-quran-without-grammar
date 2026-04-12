"use client";

import { useState } from "react";
import { id, tx } from "@instantdb/react";
import db from "@/lib/instant";

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

export default function SeedPage() {
  const [status, setStatus] = useState("idle");
  const [log, setLog] = useState<string[]>([]);

  const { data } = db.useQuery({ lessons: {}, verses: {} });

  const addLog = (msg: string) => setLog((prev) => [...prev, msg]);

  async function seedLessons() {
    setStatus("seeding-lessons");
    addLog("Seeding lessons...");
    const txns = LESSONS.map((lesson) => tx.lessons[id()].update(lesson));
    await db.transact(txns);
    addLog(`Seeded ${LESSONS.length} lessons`);
    setStatus("done-lessons");
  }

  async function seedVersesFromFile() {
    setStatus("seeding-verses");
    addLog("Paste root JSON verses array into the text area and click Load");
  }

  async function clearAll() {
    setStatus("clearing");
    addLog("Clearing all data...");

    const txns: ReturnType<typeof tx.lessons[string]["delete"]>[] = [];

    if (data?.lessons) {
      for (const l of data.lessons) {
        txns.push(tx.lessons[l.id].delete());
      }
    }
    if (data?.verses) {
      for (const v of data.verses) {
        txns.push(tx.verses[v.id].delete());
      }
    }

    if (txns.length > 0) {
      await db.transact(txns);
    }
    addLog(`Cleared ${txns.length} records`);
    setStatus("idle");
  }

  return (
    <div className="max-w-3xl mx-auto p-6 font-sans">
      <h1 className="text-2xl font-bold text-emerald-800 mb-2">
        Seed InstantDB
      </h1>
      <p className="text-sm text-gray-500 mb-6">
        Load real lesson and verse data into InstantDB from the existing JSON
        files.
      </p>

      <div className="flex gap-3 mb-6">
        <button
          onClick={seedLessons}
          className="px-4 py-2 bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 text-sm font-medium"
        >
          Seed Lessons (pipeline-status)
        </button>
        <button
          onClick={clearAll}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium"
        >
          Clear All
        </button>
      </div>

      <VerseLoader addLog={addLog} />

      {/* Current DB state */}
      <div className="mt-6 bg-gray-50 rounded-lg border p-4">
        <h2 className="font-semibold text-sm text-gray-700 mb-2">
          Current DB State
        </h2>
        <p className="text-sm text-gray-600">
          Lessons: {data?.lessons?.length ?? 0} | Verses:{" "}
          {data?.verses?.length ?? 0}
        </p>
      </div>

      {/* Log */}
      {log.length > 0 && (
        <div className="mt-4 bg-gray-900 text-gray-200 p-4 rounded-lg text-xs font-mono max-h-64 overflow-auto">
          {log.map((l, i) => (
            <div key={i}>{l}</div>
          ))}
        </div>
      )}
    </div>
  );
}

function VerseLoader({ addLog }: { addLog: (msg: string) => void }) {
  const [json, setJson] = useState("");
  const [rootKey, setRootKey] = useState("rasul");
  const [lessonNum, setLessonNum] = useState(3);

  async function loadVerses() {
    try {
      const parsed = JSON.parse(json);

      // Accept either { verses: [...] } or just [...]
      const verses: Array<{
        ref: string;
        arabic_full: string;
        translation: string;
        form: string;
        surah_name: string;
        word_count: number;
        scores: {
          final: number | null;
          story: number | null;
          familiarity: number | null;
          teaching_fit: number | null;
          fragment: boolean;
        };
      }> = Array.isArray(parsed) ? parsed : parsed.verses;

      if (!verses || !Array.isArray(verses)) {
        addLog("ERROR: Expected { verses: [...] } or an array");
        return;
      }

      addLog(`Loading ${verses.length} verses for root=${rootKey} lesson=${lessonNum}...`);

      const txns = verses.map((v) =>
        tx.verses[id()].update({
          ref: v.ref,
          arabicFull: v.arabic_full,
          translation: v.translation,
          form: v.form,
          rootKey,
          surahName: v.surah_name,
          wordCount: v.word_count,
          scoreFinal: v.scores?.final ?? null,
          scoreStory: v.scores?.story ?? null,
          scoreFamiliarity: v.scores?.familiarity ?? null,
          scoreTeachingFit: v.scores?.teaching_fit ?? null,
          fragment: v.scores?.fragment ?? false,
          lessonNumber: lessonNum,
        })
      );

      await db.transact(txns);
      addLog(`Loaded ${verses.length} verses`);
      setJson("");
    } catch (e) {
      addLog(`ERROR: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return (
    <div className="bg-white border rounded-lg p-4">
      <h2 className="font-semibold text-sm text-gray-700 mb-3">
        Load Verses from Root JSON
      </h2>
      <div className="flex gap-3 mb-3">
        <div>
          <label className="text-xs text-gray-500 block mb-1">Root key</label>
          <input
            value={rootKey}
            onChange={(e) => setRootKey(e.target.value)}
            className="border rounded px-2 py-1 text-sm w-24"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">Lesson #</label>
          <input
            type="number"
            value={lessonNum}
            onChange={(e) => setLessonNum(Number(e.target.value))}
            className="border rounded px-2 py-1 text-sm w-16"
          />
        </div>
      </div>
      <p className="text-xs text-gray-500 mb-2">
        Paste the contents of <code>docs/roots/rasul.json</code> (or just the
        verses array):
      </p>
      <textarea
        value={json}
        onChange={(e) => setJson(e.target.value)}
        rows={6}
        className="w-full border rounded p-2 text-xs font-mono mb-3"
        placeholder='Paste root JSON here, e.g. {"verses": [...]}'
      />
      <button
        onClick={loadVerses}
        disabled={!json.trim()}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50"
      >
        Load Verses
      </button>
    </div>
  );
}
