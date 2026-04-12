#!/usr/bin/env node
/**
 * Seed InstantDB with all lesson + verse data from the repo.
 *
 * Usage:
 *   node scripts/seed.mjs            # seed everything
 *   node scripts/seed.mjs --clear    # clear all data first, then seed
 */
import { init, id, tx } from "@instantdb/admin";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

const APP_ID = "b1c9a636-2a46-4be6-a055-16d6f2ebd233";
const ADMIN_TOKEN = "5ca3a1a8-a25e-49e3-bf10-3bc6d70000db";

const db = init({ appId: APP_ID, adminToken: ADMIN_TOKEN });

const REPO_ROOT = join(import.meta.dirname, "..", "..");

// ─── Lesson data (from teacher/pipeline-status.json) ─────────────────────────
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
    phaseScoring: "done", phasePicking: "done", phaseWriting: "done",
    phaseTamil: "done", phaseAudio: "done", phaseReview: "done", phasePublished: "done",
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
    phaseScoring: "done", phasePicking: "done", phaseWriting: "done",
    phaseTamil: "done", phaseAudio: "done", phaseReview: "done", phasePublished: "done",
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
    phaseScoring: "done", phasePicking: "ready", phaseWriting: "blocked",
    phaseTamil: "blocked", phaseAudio: "blocked", phaseReview: "blocked", phasePublished: "blocked",
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
    phaseScoring: "done", phasePicking: "ready", phaseWriting: "blocked",
    phaseTamil: "blocked", phaseAudio: "blocked", phaseReview: "blocked", phasePublished: "blocked",
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
    phaseScoring: "done", phasePicking: "ready", phaseWriting: "blocked",
    phaseTamil: "blocked", phaseAudio: "blocked", phaseReview: "blocked", phasePublished: "blocked",
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
    phaseScoring: "done", phasePicking: "ready", phaseWriting: "blocked",
    phaseTamil: "blocked", phaseAudio: "blocked", phaseReview: "blocked", phasePublished: "blocked",
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
    phaseScoring: "done", phasePicking: "ready", phaseWriting: "blocked",
    phaseTamil: "blocked", phaseAudio: "blocked", phaseReview: "blocked", phasePublished: "blocked",
  },
];

const LESSON_ROOTS = {
  1: ["ilah", "kabura"],
  2: ["shahida"],
  3: ["rasul"],
  4: ["hayiya", "salah"],
  5: ["falaha"],
  6: ["khayr", "nawm"],
  7: ["qama"],
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function readRootVerses(rootKey, lessonNumber) {
  const filePath = join(REPO_ROOT, "docs", "roots", `${rootKey}.json`);
  if (!existsSync(filePath)) {
    console.log(`  SKIP ${rootKey}.json — file not found`);
    return [];
  }
  const data = JSON.parse(readFileSync(filePath, "utf-8"));
  if (!data.verses) return [];

  return data.verses.map((v) => ({
    ref: v.ref,
    arabicFull: v.arabic_full,
    translation: v.translation || "",
    form: v.form,
    rootKey,
    surahName: v.surah_name || "",
    wordCount: v.word_count || 0,
    scoreFinal: v.scores?.final ?? null,
    scoreStory:
      typeof v.scores?.story === "object"
        ? v.scores.story?.score ?? null
        : v.scores?.story ?? null,
    scoreFamiliarity:
      typeof v.scores?.familiarity === "object"
        ? v.scores.familiarity?.score ?? null
        : v.scores?.familiarity ?? null,
    scoreTeachingFit:
      typeof v.scores?.teaching_fit === "object"
        ? v.scores.teaching_fit?.score ?? null
        : v.scores?.teaching_fit ?? null,
    fragment: v.scores?.fragment ?? false,
    lessonNumber,
  }));
}

async function transactChunked(txns, label, chunkSize = 100) {
  for (let i = 0; i < txns.length; i += chunkSize) {
    const chunk = txns.slice(i, i + chunkSize);
    await db.transact(chunk);
    const done = Math.min(i + chunkSize, txns.length);
    process.stdout.write(`\r  ${label}: ${done}/${txns.length}`);
  }
  console.log();
}

// ─── Clear ───────────────────────────────────────────────────────────────────

async function clearAll() {
  console.log("Clearing existing data...");

  for (const table of ["lessons", "verses", "selections"]) {
    const result = await db.query({ [table]: {} });
    const rows = result[table] || [];
    if (rows.length === 0) {
      console.log(`  ${table}: empty`);
      continue;
    }
    const txns = rows.map((r) => tx[table][r.id].delete());
    await transactChunked(txns, table);
    console.log(`  ${table}: deleted ${rows.length}`);
  }
}

// ─── Seed ────────────────────────────────────────────────────────────────────

async function seedLessons() {
  console.log("Seeding 7 lessons...");
  const txns = LESSONS.map((l) => tx.lessons[id()].update(l));
  await db.transact(txns);
  console.log(`  Done — ${LESSONS.length} lessons`);
}

async function seedVerses() {
  let total = 0;
  for (const [lessonNum, rootKeys] of Object.entries(LESSON_ROOTS)) {
    const ln = Number(lessonNum);
    const allVerses = [];
    for (const rootKey of rootKeys) {
      const verses = readRootVerses(rootKey, ln);
      allVerses.push(...verses);
    }
    if (allVerses.length === 0) continue;

    console.log(
      `Lesson ${ln}: ${allVerses.length} verses (${rootKeys.join(", ")})`
    );
    const txns = allVerses.map((v) => tx.verses[id()].update(v));
    await transactChunked(txns, `L${ln}`);
    total += allVerses.length;
  }
  console.log(`\nTotal verses seeded: ${total}`);
}

// ─── Main ────────────────────────────────────────────────────────────────────

const doClear = process.argv.includes("--clear");

console.log("=== InstantDB Seed Script ===");
console.log(`App: ${APP_ID}`);
console.log();

if (doClear) {
  await clearAll();
  console.log();
}

await seedLessons();
console.log();
await seedVerses();
console.log();
console.log("=== Done! ===");
