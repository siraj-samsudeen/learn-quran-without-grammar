#!/usr/bin/env node
/**
 * Seed InstantDB with all lesson + verse data from the repo.
 *
 * Features:
 *   - Retry with exponential backoff on rate-limit / transient errors
 *   - Idempotent: uses verse ref + rootKey as dedup key, skips already-loaded records
 *   - Resumable: if interrupted, re-run and it picks up where it left off
 *   - Progress file: writes scripts/.seed-progress.json so you can see what was done
 *
 * Usage:
 *   node scripts/seed.mjs                  # seed everything (skips existing)
 *   node scripts/seed.mjs --clear          # clear all data first, then seed
 *   node scripts/seed.mjs --lesson 5       # seed only lesson 5
 *   node scripts/seed.mjs --lessons-only   # seed lesson metadata only (no verses)
 *   node scripts/seed.mjs --status         # show what's in the DB without changing anything
 */
import { init, id, tx } from "@instantdb/admin";
import { readFileSync, existsSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── Config ──────────────────────────────────────────────────────────────────

const APP_ID = "b1c9a636-2a46-4be6-a055-16d6f2ebd233";
const ADMIN_TOKEN = "5ca3a1a8-a25e-49e3-bf10-3bc6d70000db";

const db = init({ appId: APP_ID, adminToken: ADMIN_TOKEN });

const REPO_ROOT = join(__dirname, "..", "..");
const PROGRESS_FILE = join(__dirname, ".seed-progress.json");

const CHUNK_SIZE = 50; // records per transaction (conservative for rate limits)
const MAX_RETRIES = 5;
const BASE_DELAY_MS = 1000; // 1s, 2s, 4s, 8s, 16s

// ─── Lesson data (from teacher/pipeline-status.json) ─────────────────────────
const LESSONS = [
  {
    lessonNumber: 1, slug: "lesson-01-allahu-akbar", title: "Allahu Akbar",
    seedArabic: "اللهُ أَكْبَرُ", seedEnglish: "Allah is Greater",
    roots: JSON.stringify(["ilah", "kabura"]), currentPhase: "published",
    notes: "Live since initial launch",
    phaseScoring: "done", phasePicking: "done", phaseWriting: "done",
    phaseTamil: "done", phaseAudio: "done", phaseReview: "done", phasePublished: "done",
  },
  {
    lessonNumber: 2, slug: "lesson-02-shahida", title: "I Bear Witness",
    seedArabic: "أَشْهَدُ أَنْ لَا إِلَٰهَ إِلَّا ٱللَّهُ",
    seedEnglish: "I bear witness that there is no god but Allah",
    roots: JSON.stringify(["shahida"]), currentPhase: "published", notes: "Live",
    phaseScoring: "done", phasePicking: "done", phaseWriting: "done",
    phaseTamil: "done", phaseAudio: "done", phaseReview: "done", phasePublished: "done",
  },
  {
    lessonNumber: 3, slug: "lesson-03-rasul", title: "Messenger of Allah",
    seedArabic: "أَشْهَدُ أَنَّ مُحَمَّدًا رَسُولُ ٱللَّهِ",
    seedEnglish: "I bear witness that Muhammad is the Messenger of Allah",
    roots: JSON.stringify(["rasul"]), currentPhase: "picking",
    notes: "42 verses scored, picker ready for teacher review",
    phaseScoring: "done", phasePicking: "ready", phaseWriting: "blocked",
    phaseTamil: "blocked", phaseAudio: "blocked", phaseReview: "blocked", phasePublished: "blocked",
  },
  {
    lessonNumber: 4, slug: "lesson-04-salah", title: "Come to Prayer",
    seedArabic: "حَيَّ عَلَى الصَّلَاةِ", seedEnglish: "Come to prayer",
    roots: JSON.stringify(["hayiya", "salah"]), currentPhase: "picking",
    notes: "52 verses scored across 2 roots",
    phaseScoring: "done", phasePicking: "ready", phaseWriting: "blocked",
    phaseTamil: "blocked", phaseAudio: "blocked", phaseReview: "blocked", phasePublished: "blocked",
  },
  {
    lessonNumber: 5, slug: "lesson-05-falaha", title: "Come to Success",
    seedArabic: "حَيَّ عَلَى الْفَلَاحِ", seedEnglish: "Come to success",
    roots: JSON.stringify(["falaha"]), currentPhase: "picking",
    notes: "25 verses scored, only 2 forms (aflaha, muflih)",
    phaseScoring: "done", phasePicking: "ready", phaseWriting: "blocked",
    phaseTamil: "blocked", phaseAudio: "blocked", phaseReview: "blocked", phasePublished: "blocked",
  },
  {
    lessonNumber: 6, slug: "lesson-06-khayr", title: "Prayer is Better than Sleep",
    seedArabic: "الصَّلَاةُ خَيْرٌ مِنَ النَّوْمِ", seedEnglish: "Prayer is better than sleep",
    roots: JSON.stringify(["khayr", "nawm"]), currentPhase: "picking",
    notes: "35 verses scored; nawm has only 9 candidates total",
    phaseScoring: "done", phasePicking: "ready", phaseWriting: "blocked",
    phaseTamil: "blocked", phaseAudio: "blocked", phaseReview: "blocked", phasePublished: "blocked",
  },
  {
    lessonNumber: 7, slug: "lesson-07-qama", title: "The Prayer Has Begun",
    seedArabic: "قَدْ قَامَتِ الصَّلَاةُ", seedEnglish: "The prayer has begun",
    roots: JSON.stringify(["qama"]), currentPhase: "picking",
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

// ─── Retry with exponential backoff ─────────────────────────────────────────

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withRetry(fn, label) {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const isRetryable =
        err?.message?.includes("rate") ||
        err?.message?.includes("Rate") ||
        err?.message?.includes("429") ||
        err?.message?.includes("503") ||
        err?.message?.includes("timeout") ||
        err?.message?.includes("ECONNRESET") ||
        err?.message?.includes("fetch failed") ||
        err?.message?.includes("EAI_AGAIN");

      if (!isRetryable || attempt === MAX_RETRIES) {
        console.error(`\n  FAILED ${label} after ${attempt} attempts: ${err.message}`);
        throw err;
      }

      const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
      console.log(`\n  Rate limited on ${label} (attempt ${attempt}/${MAX_RETRIES}), retrying in ${delay}ms...`);
      await sleep(delay);
    }
  }
}

// ─── Read root JSON verses ──────────────────────────────────────────────────

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

// ─── Chunked transact with retry + inter-chunk delay ────────────────────────

async function transactChunked(txns, label) {
  let succeeded = 0;
  let failed = 0;

  for (let i = 0; i < txns.length; i += CHUNK_SIZE) {
    const chunk = txns.slice(i, i + CHUNK_SIZE);
    const chunkLabel = `${label} [${i + 1}-${Math.min(i + CHUNK_SIZE, txns.length)}/${txns.length}]`;

    try {
      await withRetry(() => db.transact(chunk), chunkLabel);
      succeeded += chunk.length;
      process.stdout.write(`\r  ${label}: ${succeeded}/${txns.length} written`);
    } catch {
      failed += chunk.length;
      console.log(`\n  SKIPPED chunk ${chunkLabel} after all retries`);
    }

    // Small delay between chunks to avoid triggering rate limits
    if (i + CHUNK_SIZE < txns.length) {
      await sleep(200);
    }
  }

  console.log();
  return { succeeded, failed };
}

// ─── Query existing data for idempotency ────────────────────────────────────

async function getExistingData() {
  const [lessonsResult, versesResult] = await Promise.all([
    withRetry(() => db.query({ lessons: {} }), "query lessons"),
    withRetry(() => db.query({ verses: {} }), "query verses"),
  ]);

  const existingLessons = new Map();
  for (const l of lessonsResult.lessons || []) {
    existingLessons.set(l.lessonNumber, l);
  }

  // Build a set of "ref|rootKey" for dedup
  const existingVerseKeys = new Set();
  for (const v of versesResult.verses || []) {
    existingVerseKeys.add(`${v.ref}|${v.rootKey}`);
  }

  return { existingLessons, existingVerseKeys };
}

// ─── Progress tracking ──────────────────────────────────────────────────────

function saveProgress(progress) {
  writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
}

// ─── Clear ───────────────────────────────────────────────────────────────────

async function clearAll() {
  console.log("Clearing existing data...");

  for (const table of ["selections", "verses", "lessons"]) {
    const result = await withRetry(() => db.query({ [table]: {} }), `query ${table}`);
    const rows = result[table] || [];
    if (rows.length === 0) {
      console.log(`  ${table}: empty`);
      continue;
    }
    console.log(`  ${table}: deleting ${rows.length} records...`);
    const txns = rows.map((r) => tx[table][r.id].delete());
    await transactChunked(txns, `delete ${table}`);
  }
}

// ─── Seed lessons (idempotent) ──────────────────────────────────────────────

async function seedLessons(existingLessons) {
  const toInsert = LESSONS.filter((l) => !existingLessons.has(l.lessonNumber));

  if (toInsert.length === 0) {
    console.log("Lessons: all 7 already exist, skipping");
    return;
  }

  console.log(`Seeding ${toInsert.length} new lessons (${LESSONS.length - toInsert.length} already exist)...`);
  const txns = toInsert.map((l) => tx.lessons[id()].update(l));
  await withRetry(() => db.transact(txns), "seed lessons");
  console.log(`  Done — ${toInsert.length} lessons created`);
}

// ─── Seed verses (idempotent, resumable) ────────────────────────────────────

async function seedVerses(existingVerseKeys, onlyLesson) {
  const progress = {
    startedAt: new Date().toISOString(),
    lessons: {},
    totalInserted: 0,
    totalSkipped: 0,
    totalFailed: 0,
  };

  let grandTotal = 0;

  for (const [lessonNum, rootKeys] of Object.entries(LESSON_ROOTS)) {
    const ln = Number(lessonNum);
    if (onlyLesson !== null && ln !== onlyLesson) continue;

    // Read all verses for this lesson from root JSONs
    const allVerses = [];
    for (const rootKey of rootKeys) {
      const verses = readRootVerses(rootKey, ln);
      allVerses.push(...verses);
    }
    if (allVerses.length === 0) continue;

    // Filter out already-existing verses (dedup by ref + rootKey)
    const newVerses = allVerses.filter(
      (v) => !existingVerseKeys.has(`${v.ref}|${v.rootKey}`)
    );

    const skipped = allVerses.length - newVerses.length;

    if (newVerses.length === 0) {
      console.log(`L${ln} (${rootKeys.join(", ")}): all ${allVerses.length} verses already exist, skipping`);
      progress.lessons[ln] = { total: allVerses.length, inserted: 0, skipped, failed: 0, status: "already_complete" };
      progress.totalSkipped += skipped;
      continue;
    }

    console.log(
      `L${ln} (${rootKeys.join(", ")}): ${newVerses.length} new / ${skipped} existing / ${allVerses.length} total`
    );

    const txns = newVerses.map((v) => tx.verses[id()].update(v));
    const { succeeded, failed } = await transactChunked(txns, `L${ln}`);

    progress.lessons[ln] = {
      total: allVerses.length,
      inserted: succeeded,
      skipped,
      failed,
      status: failed > 0 ? "partial" : "complete",
    };
    progress.totalInserted += succeeded;
    progress.totalSkipped += skipped;
    progress.totalFailed += failed;
    grandTotal += succeeded;
  }

  progress.completedAt = new Date().toISOString();
  saveProgress(progress);

  console.log(`\n  Summary: ${progress.totalInserted} inserted, ${progress.totalSkipped} skipped, ${progress.totalFailed} failed`);
  console.log(`  Progress saved to ${PROGRESS_FILE}`);

  if (progress.totalFailed > 0) {
    console.log(`\n  ⚠ Some records failed. Re-run the script to retry — it will skip already-inserted records.`);
  }

  return grandTotal;
}

// ─── Status ─────────────────────────────────────────────────────────────────

async function showStatus() {
  console.log("Querying current DB state...\n");

  const [lessonsResult, versesResult, selectionsResult] = await Promise.all([
    withRetry(() => db.query({ lessons: {} }), "query lessons"),
    withRetry(() => db.query({ verses: {} }), "query verses"),
    withRetry(() => db.query({ selections: {} }), "query selections"),
  ]);

  const lessons = lessonsResult.lessons || [];
  const verses = versesResult.verses || [];
  const selections = selectionsResult.selections || [];

  console.log(`  Lessons:    ${lessons.length}`);
  console.log(`  Verses:     ${verses.length}`);
  console.log(`  Selections: ${selections.length}`);

  if (verses.length > 0) {
    // Count per lesson
    const perLesson = {};
    for (const v of verses) {
      const ln = v.lessonNumber;
      perLesson[ln] = (perLesson[ln] || 0) + 1;
    }
    console.log("\n  Verses per lesson:");
    for (const [ln, count] of Object.entries(perLesson).sort((a, b) => a[0] - b[0])) {
      const rootKeys = LESSON_ROOTS[ln]?.join(", ") || "?";
      console.log(`    L${ln} (${rootKeys}): ${count}`);
    }
  }

  if (existsSync(PROGRESS_FILE)) {
    const progress = JSON.parse(readFileSync(PROGRESS_FILE, "utf-8"));
    console.log(`\n  Last seed run: ${progress.startedAt}`);
    if (progress.totalFailed > 0) {
      console.log(`  ⚠ ${progress.totalFailed} records failed — re-run to retry`);
    }
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const doClear = args.includes("--clear");
const doStatus = args.includes("--status");
const lessonsOnly = args.includes("--lessons-only");
const lessonIdx = args.indexOf("--lesson");
const onlyLesson = lessonIdx >= 0 ? Number(args[lessonIdx + 1]) : null;

console.log("=== InstantDB Seed Script ===");
console.log(`App:   ${APP_ID}`);
console.log(`Chunk: ${CHUNK_SIZE} records/txn, ${MAX_RETRIES} retries, ${BASE_DELAY_MS}ms base delay`);
console.log();

if (doStatus) {
  await showStatus();
  process.exit(0);
}

if (doClear) {
  await clearAll();
  console.log();
}

// Query existing data for idempotency
console.log("Checking existing data...");
const { existingLessons, existingVerseKeys } = await getExistingData();
console.log(`  Found ${existingLessons.size} lessons, ${existingVerseKeys.size} verses\n`);

await seedLessons(existingLessons);
console.log();

if (!lessonsOnly) {
  await seedVerses(existingVerseKeys, onlyLesson);
}

console.log("\n=== Done! ===");
