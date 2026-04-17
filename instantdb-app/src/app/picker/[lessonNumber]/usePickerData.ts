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

export function usePickerData(lessonNumber: number): PickerData {
  const member = useCurrentCourseMember();

  // Query everything the picker needs in one shot — InstantDB dedupes.
  const { isLoading, error, data } = db.useQuery({
    lessons: {},
    roots: {},
    forms: {},
    sentences: {
      verse: { translation: {} },
      forms: {},
      scoreA1: {},
      selectedIn: { lesson: {} },
    },
  });

  const { lessons, lesson, sentences, candidates, selections, roots, forms } = useMemo(() => {
    const lessons = ((data?.lessons ?? []) as unknown as LessonRow[]).slice().sort((a, b) => a.lessonNumber - b.lessonNumber);
    const lesson = lessons.find((l) => l.lessonNumber === lessonNumber) ?? null;
    const rawSentences = (data?.sentences ?? []) as unknown as SentenceRow[];

    // A sentence is a *candidate* for this lesson if it has >=1 form whose
    // root is among the lesson's in-scope roots. The "in-scope" list lives
    // on the seed (the 10-root picker-minimal set), so for Plan 3 we simply
    // include any sentence that has forms AND has a scoreA1 record —
    // whether it's relevant to this lesson is determined downstream by
    // the root-filter chips in the selection bar.
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

    // Map sentenceId → selection row, filtered to this lesson.
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
      sentences: candidatePool,
      candidates,
      selections: sel,
      roots: (data?.roots ?? []) as unknown as RootRow[],
      forms: (data?.forms ?? []) as unknown as FormRow[],
    };
  }, [data, lessonNumber]);

  return {
    isLoading,
    error,
    lesson,
    lessons,
    roots,
    forms,
    sentences,
    candidates,
    selections,
    currentMemberId: member?.id ?? null,
  };
}
