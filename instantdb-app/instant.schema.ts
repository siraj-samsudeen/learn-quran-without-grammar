// Learn Qur'an Without Grammar — InstantDB schema (Plan 2 picker-minimal subset)
//
// Scope: 13 entities sufficient to power the verse picker (Plan 3).
// The full DATA-MODEL.md has 21 entities; the rest land in Plans 4-7.
//
// All entity attributes use snake_case sparingly — InstantDB convention is
// camelCase. IDs are server-generated UUIDs unless noted.
//
// Push: `npx instant-cli push schema` (requires INSTANT_APP_ID env var
// or the value hardcoded in src/lib/instant.ts).
import { i } from "@instantdb/react";

const _schema = i.schema({
  entities: {
    // ── Core identity / membership ────────────────────────────────────
    // `$users` is built into InstantDB. We add a `userProfiles` entity
    // for app-level state we attach by link (1:1 with $users).
    userProfiles: i.entity({
      // Mirror keyed by the $user's email (not the $user.id, which can
      // rotate if the magic-link is sent to a new device-pair).
      email: i.string().unique().indexed(),
      displayName: i.string().optional(),
      createdAt: i.number(),
    }),

    courses: i.entity({
      slug: i.string().unique().indexed(),
      name: i.string(),
      description: i.string().optional(),
      createdAt: i.number(),
    }),

    courseMembers: i.entity({
      role: i.string(), // "owner" | "assistant" | "tester" | "student"
      joinedAt: i.number(),
    }),

    // ── Pedagogical content ───────────────────────────────────────────
    seedPhrases: i.entity({
      arabic: i.string(),
      transliteration: i.string(),
      english: i.string(),
      category: i.string(), // "adhan" | "salah" | "dhikr"
      orderIdx: i.number().indexed(),
    }),

    // ── Linguistic primitives (mirrored from quran.db) ────────────────
    roots: i.entity({
      // Root key — Arabic letters with no diacritics, e.g. "أله", "كبر".
      // Byte-stable across Unicode normalisation.
      key: i.string().unique().indexed(),
      transliteration: i.string(), // "ilah", "kabura"
      threeLetterEn: i.string(), // "alif lam ha"
      introducedInLesson: i.number().optional(),
    }),

    lemmas: i.entity({
      // Lemma string with diacritics, as stored in quran-morphology.txt.
      // Look up via `narrow.get_allah_lemma()`-style helpers, not literals.
      arabic: i.string().indexed(),
      // The lemma is owned by exactly one root via the `lemmaRoot` link.
    }),

    forms: i.entity({
      // (root, lemma) pair — duplicates the link target keys for fast
      // queries without hopping through links.
      rootKey: i.string().indexed(),
      lemmaArabic: i.string().indexed(),
      // Composite uniqueness enforced at seed-time, not by InstantDB.
    }),

    // ── Qur'an primary text ───────────────────────────────────────────
    verses: i.entity({
      ref: i.string().unique().indexed(), // "2:255"
      surah: i.number().indexed(),
      verseNum: i.number(), // can't shadow the entity name
      arabic: i.string(), // Uthmani text including waqf marks (byte-equal to Tanzil)
    }),

    translations: i.entity({
      ref: i.string().unique().indexed(), // matches verses.ref
      english: i.string(),
      // Linked to verses by the `translationVerse` link (1:1).
    }),

    sentences: i.entity({
      // Composite key embedded in queryable fields. ID is still server UUID.
      verseRef: i.string().indexed(),
      startWord: i.number(),
      endWord: i.number(),
      arabic: i.string(), // fragment text, waqf marks stripped
      wordCount: i.number().indexed(),
    }),

    sentenceForms: i.entity({
      // Many-to-many: which (root, lemma) pairs touch this sentence.
      // Duplicates rootKey + lemmaArabic for fast filter without joins.
      rootKey: i.string().indexed(),
      lemmaArabic: i.string().indexed(),
    }),

    sentenceScoresA1: i.entity({
      d1Raw: i.number(),
      d2Raw: i.number(),
      d3: i.number(),
    }),

    // ── Authoring entities ────────────────────────────────────────────
    lessons: i.entity({
      lessonNumber: i.number().unique().indexed(),
      slug: i.string().unique().indexed(),
      title: i.string(),
      // Five-phase model from the audit spec §1.
      phaseSelection: i.string(), // "blocked" | "ready" | "wip" | "done"
      phaseAnnotation: i.string(),
      phaseAudio: i.string(),
      phaseQA: i.string(),
      phasePublished: i.string(),
      notes: i.string().optional(),
      seedArabic: i.string().optional(),
      seedEnglish: i.string().optional(),
    }),

    selections: i.entity({
      // Teacher's pick of a sentence for a lesson.
      remark: i.string().optional(), // student-audible
      starred: i.boolean(),
      pickedAt: i.number(),
    }),
  },

  links: {
    // courseMembers ↔ courses + userProfiles
    // (We don't link directly to InstantDB's $users; userProfiles is our
    // app-side mirror, created when a $user logs in via magic-link. The
    // mirror is keyed by $user.email — see src/lib/auth.ts.)
    courseMemberCourse: {
      forward: { on: "courseMembers", has: "one", label: "course", required: true },
      reverse: { on: "courses", has: "many", label: "members" },
    },
    courseMemberProfile: {
      forward: { on: "courseMembers", has: "one", label: "profile", required: true },
      reverse: { on: "userProfiles", has: "many", label: "memberships" },
    },
    // seedPhrases ↔ roots (many-to-many)
    seedPhraseRoots: {
      forward: { on: "seedPhrases", has: "many", label: "roots" },
      reverse: { on: "roots", has: "many", label: "seedPhrases" },
    },
    // lemmas ↔ roots (many-to-one: a lemma belongs to one root)
    lemmaRoot: {
      forward: { on: "lemmas", has: "one", label: "root", required: true },
      reverse: { on: "roots", has: "many", label: "lemmas" },
    },
    // forms ↔ roots + lemmas
    formRoot: {
      forward: { on: "forms", has: "one", label: "root", required: true },
      reverse: { on: "roots", has: "many", label: "forms" },
    },
    formLemma: {
      forward: { on: "forms", has: "one", label: "lemma", required: true },
      reverse: { on: "lemmas", has: "one", label: "form" },
    },
    // translations ↔ verses (1:1)
    translationVerse: {
      forward: { on: "translations", has: "one", label: "verse", required: true },
      reverse: { on: "verses", has: "one", label: "translation" },
    },
    // sentences ↔ verses (many-to-one)
    sentenceVerse: {
      forward: { on: "sentences", has: "one", label: "verse", required: true },
      reverse: { on: "verses", has: "many", label: "sentences" },
    },
    // sentenceForms ↔ sentences + roots + lemmas
    sentenceFormSentence: {
      forward: { on: "sentenceForms", has: "one", label: "sentence", required: true },
      reverse: { on: "sentences", has: "many", label: "forms" },
    },
    sentenceFormRoot: {
      forward: { on: "sentenceForms", has: "one", label: "root", required: true },
      reverse: { on: "roots", has: "many", label: "sentenceForms" },
    },
    sentenceFormLemma: {
      forward: { on: "sentenceForms", has: "one", label: "lemma", required: true },
      reverse: { on: "lemmas", has: "many", label: "sentenceForms" },
    },
    // sentenceScoresA1 ↔ sentences (1:1)
    sentenceScoreSentence: {
      forward: { on: "sentenceScoresA1", has: "one", label: "sentence", required: true },
      reverse: { on: "sentences", has: "one", label: "scoreA1" },
    },
    // selections ↔ lessons + sentences + courseMembers
    selectionLesson: {
      forward: { on: "selections", has: "one", label: "lesson", required: true },
      reverse: { on: "lessons", has: "many", label: "selections" },
    },
    selectionSentence: {
      forward: { on: "selections", has: "one", label: "sentence", required: true },
      reverse: { on: "sentences", has: "many", label: "selectedIn" },
    },
    selectionPickedBy: {
      forward: { on: "selections", has: "one", label: "pickedBy", required: true },
      reverse: { on: "courseMembers", has: "many", label: "selections" },
    },
  },
});

// Re-export the inferred TS types for use elsewhere.
type _AppSchema = typeof _schema;
interface AppSchema extends _AppSchema {}
const schema: AppSchema = _schema;

export type { AppSchema };
export default schema;
