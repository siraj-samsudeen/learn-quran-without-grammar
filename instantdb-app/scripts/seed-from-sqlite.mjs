#!/usr/bin/env node
/**
 * Seed InstantDB from tools/data/quran.db (Plan 2 of LQWG Slice 1).
 *
 * Pushes the picker-minimal subset of entities defined in instant.schema.ts.
 *
 * Usage:
 *   node scripts/seed-from-sqlite.mjs              # incremental (idempotent on most entities)
 *   node scripts/seed-from-sqlite.mjs --clear      # wipe everything first
 *   node scripts/seed-from-sqlite.mjs --status     # print row counts only
 *   node scripts/seed-from-sqlite.mjs --dry-run    # validate quran.db is present, print plan
 *
 * Pre-reqs:
 *   - tools/data/quran.db built (run `tools/build-quran-db.py --all` from repo root)
 *   - schema pushed (`npx instant-cli push schema` from instantdb-app/)
 *   - npm install better-sqlite3
 */
import { init, id, tx } from "@instantdb/admin";
import Database from "better-sqlite3";
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..", "..");
const QURAN_DB = join(REPO_ROOT, "tools", "data", "quran.db");

const APP_ID = "b1c9a636-2a46-4be6-a055-16d6f2ebd233";
const ADMIN_TOKEN = "5ca3a1a8-a25e-49e3-bf10-3bc6d70000db";

const SIRAJ_EMAIL = "mailsiraj@gmail.com";

const IN_SCOPE_ROOTS = [
  { key: "أله", transliteration: "ilah", threeLetterEn: "alif lam ha", introducedInLesson: 1 },
  { key: "كبر", transliteration: "kabura", threeLetterEn: "kaf ba ra", introducedInLesson: 1 },
  { key: "شهد", transliteration: "shahida", threeLetterEn: "shin ha dal", introducedInLesson: 2 },
  { key: "رسل", transliteration: "rasul", threeLetterEn: "ra sin lam", introducedInLesson: 3 },
  { key: "حيي", transliteration: "hayiya", threeLetterEn: "ha ya ya", introducedInLesson: 4 },
  { key: "صلو", transliteration: "salah", threeLetterEn: "sad lam waw", introducedInLesson: 4 },
  { key: "فلح", transliteration: "falaha", threeLetterEn: "fa lam ha", introducedInLesson: 5 },
  { key: "خير", transliteration: "khayr", threeLetterEn: "kha ya ra", introducedInLesson: 6 },
  { key: "نوم", transliteration: "nawm", threeLetterEn: "nun waw mim", introducedInLesson: 6 },
  { key: "قوم", transliteration: "qama", threeLetterEn: "qaf waw mim", introducedInLesson: 7 },
];

const ADHAN_PHRASES = [
  { arabic: "اللهُ أَكْبَرُ", transliteration: "Allāhu Akbar", english: "Allah is Greatest", category: "adhan", orderIdx: 1, rootKeys: ["أله", "كبر"] },
  { arabic: "أَشْهَدُ أَنْ لَا إِلَٰهَ إِلَّا ٱللَّهُ", transliteration: "Ashhadu an lā ilāha illā 'llāh", english: "I bear witness that there is no god but Allah", category: "adhan", orderIdx: 2, rootKeys: ["شهد", "أله"] },
  { arabic: "أَشْهَدُ أَنَّ مُحَمَّدًا رَسُولُ ٱللَّهِ", transliteration: "Ashhadu anna Muḥammadan rasūlu 'llāh", english: "I bear witness that Muhammad is the Messenger of Allah", category: "adhan", orderIdx: 3, rootKeys: ["شهد", "رسل", "أله"] },
  { arabic: "حَيَّ عَلَى الصَّلَاةِ", transliteration: "Ḥayya ʿala 'ṣ-ṣalāh", english: "Come to prayer", category: "adhan", orderIdx: 4, rootKeys: ["حيي", "صلو"] },
  { arabic: "حَيَّ عَلَى الْفَلَاحِ", transliteration: "Ḥayya ʿala 'l-falāḥ", english: "Come to success", category: "adhan", orderIdx: 5, rootKeys: ["حيي", "فلح"] },
  { arabic: "اللَّهُ أَكْبَرُ اللَّهُ أَكْبَرُ", transliteration: "Allāhu akbar Allāhu akbar", english: "Allah is Greatest, Allah is Greatest", category: "adhan", orderIdx: 6, rootKeys: ["أله", "كبر"] },
  { arabic: "لَا إِلَٰهَ إِلَّا ٱللَّهُ", transliteration: "Lā ilāha illā 'llāh", english: "There is no god but Allah", category: "adhan", orderIdx: 7, rootKeys: ["أله"] },
];

const LESSON_SEEDS = [
  { lessonNumber: 1, slug: "lesson-01-allahu-akbar", title: "Allahu Akbar",
    seedArabic: "اللهُ أَكْبَرُ", seedEnglish: "Allah is Greater", notes: "Restarting selection",
    phaseSelection: "ready", phaseAnnotation: "blocked", phaseAudio: "blocked", phaseQA: "blocked", phasePublished: "blocked" },
  { lessonNumber: 2, slug: "lesson-02-shahida", title: "I Bear Witness",
    seedArabic: "أَشْهَدُ أَنْ لَا إِلَٰهَ إِلَّا ٱللَّهُ", seedEnglish: "I bear witness that there is no god but Allah", notes: "Restarting selection",
    phaseSelection: "ready", phaseAnnotation: "blocked", phaseAudio: "blocked", phaseQA: "blocked", phasePublished: "blocked" },
  { lessonNumber: 3, slug: "lesson-03-rasul", title: "Messenger of Allah",
    seedArabic: "أَشْهَدُ أَنَّ مُحَمَّدًا رَسُولُ ٱللَّهِ", seedEnglish: "I bear witness that Muhammad is the Messenger of Allah",
    notes: "Picker ready", phaseSelection: "ready", phaseAnnotation: "blocked", phaseAudio: "blocked", phaseQA: "blocked", phasePublished: "blocked" },
  { lessonNumber: 4, slug: "lesson-04-salah", title: "Come to Prayer",
    seedArabic: "حَيَّ عَلَى الصَّلَاةِ", seedEnglish: "Come to prayer", notes: "Picker ready",
    phaseSelection: "ready", phaseAnnotation: "blocked", phaseAudio: "blocked", phaseQA: "blocked", phasePublished: "blocked" },
  { lessonNumber: 5, slug: "lesson-05-falaha", title: "Come to Success",
    seedArabic: "حَيَّ عَلَى الْفَلَاحِ", seedEnglish: "Come to success", notes: "Picker ready",
    phaseSelection: "ready", phaseAnnotation: "blocked", phaseAudio: "blocked", phaseQA: "blocked", phasePublished: "blocked" },
  { lessonNumber: 6, slug: "lesson-06-khayr", title: "Better than Sleep",
    seedArabic: "الصَّلَاةُ خَيْرٌ مِنَ النَّوْمِ", seedEnglish: "Prayer is better than sleep", notes: "Picker ready",
    phaseSelection: "ready", phaseAnnotation: "blocked", phaseAudio: "blocked", phaseQA: "blocked", phasePublished: "blocked" },
  { lessonNumber: 7, slug: "lesson-07-qama", title: "Stand for Prayer",
    seedArabic: "قَدْ قَامَتِ الصَّلَاةُ", seedEnglish: "Prayer has begun", notes: "Picker ready",
    phaseSelection: "ready", phaseAnnotation: "blocked", phaseAudio: "blocked", phaseQA: "blocked", phasePublished: "blocked" },
];

const CHUNK = 100;
const args = new Set(process.argv.slice(2));

function log(msg) { console.log(`[seed] ${msg}`); }

async function chunked(items, fn) {
  for (let i = 0; i < items.length; i += CHUNK) {
    const slice = items.slice(i, i + CHUNK);
    await db.transact(slice.map(fn));
    process.stdout.write(`  ${i + slice.length}/${items.length}\r`);
  }
  console.log();
}

const db = init({ appId: APP_ID, adminToken: ADMIN_TOKEN });

// ── Pre-flight ───────────────────────────────────────────────────────────
let qdb;
try {
  qdb = new Database(QURAN_DB, { readonly: true, fileMustExist: true });
} catch (e) {
  console.error(`ERROR: ${QURAN_DB} not found. Run from repo root:`);
  console.error(`  tools/.venv/bin/python tools/build-quran-db.py --all`);
  process.exit(2);
}

if (args.has("--dry-run")) {
  log(`quran.db OK at ${QURAN_DB}`);
  log(`Verses: ${qdb.prepare("SELECT COUNT(*) c FROM verses").get().c}`);
  log(`Sentences: ${qdb.prepare("SELECT COUNT(*) c FROM sentences").get().c}`);
  log(`Sentence_forms (in-scope): ${qdb.prepare(`SELECT COUNT(*) c FROM sentence_forms WHERE root IN (${IN_SCOPE_ROOTS.map(r => `'${r.key}'`).join(",")})`).get().c}`);
  log(`Would seed: courses, courseMembers (Siraj), 7 seedPhrases, 10 roots, all lemmas+forms in scope, 6236 verses+translations, 10493 sentences, sentence_forms in scope, sentence_scores_a1, 7 lessons.`);
  process.exit(0);
}

if (args.has("--status")) {
  const counts = await db.query({
    courses: {}, courseMembers: {}, seedPhrases: {}, roots: {}, lemmas: {},
    forms: {}, verses: {}, translations: {}, sentences: {},
    sentenceForms: {}, sentenceScoresA1: {}, lessons: {}, selections: {},
  });
  for (const [k, v] of Object.entries(counts)) {
    console.log(`  ${k.padEnd(22)}: ${v.length}`);
  }
  process.exit(0);
}

if (args.has("--clear")) {
  log("CLEARING all entities …");
  for (const ent of ["selections", "lessons", "sentenceScoresA1", "sentenceForms",
    "sentences", "translations", "verses", "forms", "lemmas", "roots",
    "seedPhrases", "courseMembers", "courses", "userProfiles"]) {
    const rows = (await db.query({ [ent]: {} }))[ent] || [];
    if (rows.length === 0) continue;
    log(`  ${ent}: ${rows.length} rows`);
    for (let i = 0; i < rows.length; i += CHUNK) {
      const slice = rows.slice(i, i + CHUNK);
      await db.transact(slice.map(r => tx[ent][r.id].delete()));
    }
  }
  log("clear complete");
}

// ── 1. courses ───────────────────────────────────────────────────────────
const COURSE_SLUG = "lqwg-adhan";
const courseId = id();
log(`courses: 1 (${COURSE_SLUG})`);
await db.transact([
  tx.courses[courseId].update({
    slug: COURSE_SLUG, name: "Learn Qur'an Without Grammar — Adhān",
    description: "Recognise root-word families through the Adhān",
    createdAt: Date.now(),
  }),
]);

// ── 2. userProfiles + courseMembers ──────────────────────────────────────
const sirajProfileId = id();
log(`userProfiles + courseMembers: Siraj as owner`);
await db.transact([
  tx.userProfiles[sirajProfileId].update({
    email: SIRAJ_EMAIL, displayName: "Siraj Samsudeen", createdAt: Date.now(),
  }),
  tx.courseMembers[id()].update({ role: "owner", joinedAt: Date.now() })
    .link({ course: courseId, profile: sirajProfileId }),
]);

// ── 3. seedPhrases ──────────────────────────────────────────────────────
log(`seedPhrases: ${ADHAN_PHRASES.length}`);
const phrasesById = ADHAN_PHRASES.map(p => ({ ...p, _id: id() }));
await db.transact(phrasesById.map(p =>
  tx.seedPhrases[p._id].update({
    arabic: p.arabic, transliteration: p.transliteration, english: p.english,
    category: p.category, orderIdx: p.orderIdx,
  })
));

// ── 4. roots ────────────────────────────────────────────────────────────
log(`roots: ${IN_SCOPE_ROOTS.length}`);
const rootIdByKey = {};
for (const r of IN_SCOPE_ROOTS) rootIdByKey[r.key] = id();
await db.transact(IN_SCOPE_ROOTS.map(r =>
  tx.roots[rootIdByKey[r.key]].update({
    key: r.key, transliteration: r.transliteration,
    threeLetterEn: r.threeLetterEn, introducedInLesson: r.introducedInLesson,
  })
));

// Wire seedPhrases ↔ roots
log(`linking seedPhrases ↔ roots`);
await db.transact(phrasesById.map(p =>
  tx.seedPhrases[p._id].link({ roots: p.rootKeys.map(k => rootIdByKey[k]) })
));

// ── 5. lemmas + forms (in scope only) ───────────────────────────────────
const lemmaRows = qdb.prepare(`
  SELECT DISTINCT root, lemma FROM sentence_forms WHERE root IN (${IN_SCOPE_ROOTS.map(r => `'${r.key}'`).join(",")})
`).all();
log(`lemmas + forms: ${lemmaRows.length} (root, lemma) pairs`);
const lemmaIdByKey = {};  // key = `${root}|${lemma}`
for (const { root, lemma } of lemmaRows) lemmaIdByKey[`${root}|${lemma}`] = id();
await chunked(lemmaRows, ({ root, lemma }) => {
  const lid = lemmaIdByKey[`${root}|${lemma}`];
  return tx.lemmas[lid].update({ arabic: lemma }).link({ root: rootIdByKey[root] });
});
const formIdByKey = {};
await chunked(lemmaRows, ({ root, lemma }) => {
  const fid = id(); formIdByKey[`${root}|${lemma}`] = fid;
  return tx.forms[fid].update({ rootKey: root, lemmaArabic: lemma })
    .link({ root: rootIdByKey[root], lemma: lemmaIdByKey[`${root}|${lemma}`] });
});

// ── 6. verses + translations (all 6,236) ────────────────────────────────
const verseRows = qdb.prepare(`
  SELECT v.ref, v.surah, v.verse, v.arabic, t.english
  FROM verses v JOIN translations t ON t.ref = v.ref
`).all();
log(`verses + translations: ${verseRows.length}`);
const verseIdByRef = {};
for (const v of verseRows) verseIdByRef[v.ref] = id();
await chunked(verseRows, v => tx.verses[verseIdByRef[v.ref]].update({
  ref: v.ref, surah: v.surah, verseNum: v.verse, arabic: v.arabic,
}));
await chunked(verseRows, v => {
  const tid = id();
  return tx.translations[tid].update({ ref: v.ref, english: v.english })
    .link({ verse: verseIdByRef[v.ref] });
});

// ── 7. sentences ────────────────────────────────────────────────────────
const sentenceRows = qdb.prepare(`SELECT id, verse_ref, start_word, end_word, arabic, word_count FROM sentences`).all();
log(`sentences: ${sentenceRows.length}`);
const sentenceIdBySqliteId = {};
for (const s of sentenceRows) sentenceIdBySqliteId[s.id] = id();
await chunked(sentenceRows, s => tx.sentences[sentenceIdBySqliteId[s.id]].update({
  verseRef: s.verse_ref, startWord: s.start_word, endWord: s.end_word,
  arabic: s.arabic, wordCount: s.word_count,
}).link({ verse: verseIdByRef[s.verse_ref] }));

// ── 8. sentenceForms (in scope only) ────────────────────────────────────
const sfRows = qdb.prepare(`
  SELECT sentence_id, root, lemma FROM sentence_forms WHERE root IN (${IN_SCOPE_ROOTS.map(r => `'${r.key}'`).join(",")})
`).all();
log(`sentenceForms (in scope): ${sfRows.length}`);
await chunked(sfRows, ({ sentence_id, root, lemma }) => tx.sentenceForms[id()].update({
  rootKey: root, lemmaArabic: lemma,
}).link({
  sentence: sentenceIdBySqliteId[sentence_id],
  root: rootIdByKey[root],
  lemma: lemmaIdByKey[`${root}|${lemma}`],
}));

// ── 9. sentenceScoresA1 (in-scope sentences only) ───────────────────────
const inScopeSentenceIds = [...new Set(sfRows.map(r => r.sentence_id))];
const placeholders = inScopeSentenceIds.map(() => "?").join(",");
const scoreRows = qdb.prepare(`SELECT sentence_id, d1_raw, d2_raw, d3 FROM sentence_scores_a1 WHERE sentence_id IN (${placeholders})`).all(...inScopeSentenceIds);
log(`sentenceScoresA1 (in scope): ${scoreRows.length}`);
await chunked(scoreRows, ({ sentence_id, d1_raw, d2_raw, d3 }) => tx.sentenceScoresA1[id()].update({
  d1Raw: d1_raw, d2Raw: d2_raw, d3,
}).link({ sentence: sentenceIdBySqliteId[sentence_id] }));

// ── 10. lessons ─────────────────────────────────────────────────────────
log(`lessons: ${LESSON_SEEDS.length}`);
await db.transact(LESSON_SEEDS.map(l => tx.lessons[id()].update(l)));

log("DONE");
process.exit(0);
