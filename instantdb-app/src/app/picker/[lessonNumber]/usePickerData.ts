"use client";

import { useMemo } from "react";
import db from "@/lib/instant";
import { useCurrentCourseMember } from "@/lib/auth";
import type { Candidate } from "./scoring";

export type SentenceRow = {
  id: string;
  verseRef: string;
  startWord: number;
  endWord: number;
  arabic: string;
  wordCount: number;
  verse?: { ref: string; surah: number; verseNum: number; arabic: string; translation?: { english: string } };
  forms?: Array<{ id: string; rootKey: string; lemmaArabic: string }>;
  scoreA1?: { d1Raw: number; d2Raw: number; d3: number };
  selectedIn?: Array<{ id: string; lesson?: { lessonNumber: number } }>;
};

export type RootRow = { id: string; key: string; transliteration: string; introducedInLesson?: number };
export type FormRow = { id: string; rootKey: string; lemmaArabic: string };
export type LessonRow = {
  id: string;
  lessonNumber: number;
  slug: string;
  title: string;
  phaseSelection: string;
  phaseAnnotation: string;
  phaseAudio: string;
  phaseQA: string;
  phasePublished: string;
};
export type SelectionRow = {
  id: string;
  starred: boolean;
  remark?: string;
  lesson?: { id: string; lessonNumber: number };
  sentence?: { id: string };
};

export type PickerData = {
  isLoading: boolean;
  error?: { message: string };
  lesson: LessonRow | null;
  lessons: LessonRow[];
  roots: RootRow[];
  forms: FormRow[];
  sentences: SentenceRow[];
  candidates: Candidate[];
  /** sentenceId → selection record (only for this lesson) */
  selections: Map<string, SelectionRow>;
  /** current teacher's courseMember.id (null if not signed in) */
  currentMemberId: string | null;
};

/**
 * Two-phase query so we don't pull all 10,493 sentences on every picker visit.
 *
 * Phase 1 (tiny): lessons + roots scoped to `introducedInLesson <= lessonNumber`.
 *   Cumulative so earlier-lesson roots still show for recall/diversity.
 *
 * Phase 2 (scoped): sentenceForms filtered by the root keys from Phase 1, with
 *   their sentences + verses + scoreA1 + all-forms-on-the-sentence + selections.
 *   This is 1-2 orders of magnitude smaller than the "all sentences" approach.
 */
export function usePickerData(lessonNumber: number): PickerData {
  const member = useCurrentCourseMember();

  // Phase 1 — small. Gets all 7 lessons and the roots in scope for this lesson.
  const phase1 = db.useQuery({
    lessons: {},
    roots: {
      $: { where: { introducedInLesson: { $lte: lessonNumber } } },
    },
  });

  const rootKeys = useMemo(
    () => ((phase1.data?.roots ?? []) as unknown as RootRow[]).map((r) => r.key),
    [phase1.data],
  );

  // Phase 2 — scoped to rootKeys. null until phase 1 returns a non-empty set.
  const phase2 = db.useQuery(
    rootKeys.length > 0
      ? {
          forms: {
            $: { where: { rootKey: { $in: rootKeys } } },
          },
          sentenceForms: {
            $: { where: { rootKey: { $in: rootKeys } } },
            sentence: {
              verse: { translation: {} },
              forms: {},
              scoreA1: {},
              selectedIn: { lesson: {} },
            },
          },
        }
      : null,
  );

  const derived = useMemo(() => {
    const lessons = ((phase1.data?.lessons ?? []) as unknown as LessonRow[])
      .slice()
      .sort((a, b) => a.lessonNumber - b.lessonNumber);
    const lesson = lessons.find((l) => l.lessonNumber === lessonNumber) ?? null;
    const roots = (phase1.data?.roots ?? []) as unknown as RootRow[];
    const forms = (phase2.data?.forms ?? []) as unknown as FormRow[];

    // Dedupe sentences across the scoped sentenceForms
    type SFWithSentence = { sentence?: SentenceRow };
    const sfRows = (phase2.data?.sentenceForms ?? []) as unknown as SFWithSentence[];
    const seen = new Set<string>();
    const rawSentences: SentenceRow[] = [];
    for (const sf of sfRows) {
      const s = sf.sentence;
      if (!s || seen.has(s.id)) continue;
      seen.add(s.id);
      rawSentences.push(s);
    }

    // Candidate pool: sentences that have forms + an A1 score
    const candidatePool: SentenceRow[] = rawSentences.filter(
      (s) => (s.forms?.length ?? 0) > 0 && s.scoreA1 !== undefined,
    );

    const candidates: Candidate[] = candidatePool.map((s) => ({
      id: s.id,
      d1Raw: s.scoreA1!.d1Raw,
      d2Raw: s.scoreA1!.d2Raw,
      d3: s.scoreA1!.d3,
      forms: (s.forms ?? []).map((f) => f.lemmaArabic),
    }));

    // Map sentenceId → selection row for THIS lesson only
    const sel = new Map<string, SelectionRow>();
    for (const s of rawSentences) {
      for (const sIn of s.selectedIn ?? []) {
        if (sIn.lesson?.lessonNumber === lessonNumber) {
          sel.set(s.id, sIn as unknown as SelectionRow);
        }
      }
    }

    return {
      lessons,
      lesson,
      roots,
      forms,
      sentences: candidatePool,
      candidates,
      selections: sel,
    };
  }, [phase1.data, phase2.data, lessonNumber]);

  return {
    isLoading: phase1.isLoading || phase2.isLoading,
    error: phase1.error ?? phase2.error,
    ...derived,
    currentMemberId: member?.id ?? null,
  };
}
