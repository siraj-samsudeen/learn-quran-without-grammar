// Mirrors the data in teacher/pipeline-status.json and docs/roots/*.json

export type PhaseStatus = "done" | "ready" | "blocked" | "wip";

export type PhaseName =
  | "scoring"
  | "picking"
  | "writing"
  | "tamil"
  | "audio"
  | "review"
  | "published";

export const PHASE_ORDER: PhaseName[] = [
  "scoring",
  "picking",
  "writing",
  "tamil",
  "audio",
  "review",
  "published",
];

export const PHASE_LABELS: Record<PhaseName, string> = {
  scoring: "Score",
  picking: "Pick",
  writing: "Write",
  tamil: "Tamil",
  audio: "Audio",
  review: "Review",
  published: "Live",
};

export type VerseSection = "learning" | "recall" | "pipeline" | "none";

export interface LessonData {
  id: string;
  lessonNumber: number;
  slug: string;
  title: string;
  seedArabic: string;
  seedEnglish: string;
  roots: string; // JSON array stored as string
  currentPhase: PhaseName;
  notes: string;
  // Phase statuses stored as individual fields
  phaseScoring: PhaseStatus;
  phasePicking: PhaseStatus;
  phaseWriting: PhaseStatus;
  phaseTamil: PhaseStatus;
  phaseAudio: PhaseStatus;
  phaseReview: PhaseStatus;
  phasePublished: PhaseStatus;
}

export interface VerseData {
  id: string;
  ref: string;
  arabicFull: string;
  translation: string;
  form: string;
  rootKey: string;
  surahName: string;
  wordCount: number;
  scoreFinal: number | null;
  scoreStory: number | null;
  scoreFamiliarity: number | null;
  scoreTeachingFit: number | null;
  fragment: boolean;
  lessonNumber: number; // which lesson this verse is a candidate for
}

export interface SelectionData {
  id: string;
  lessonNumber: number;
  verseRef: string;
  section: VerseSection;
  remark: string;
  rootKey: string;
  form: string;
  updatedAt: number;
}
