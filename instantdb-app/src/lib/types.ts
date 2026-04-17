// App-wide types that aren't auto-derivable from instant.schema.ts.
//
// Phase model matches the audit spec §1 (5 phases). Each phase on a lesson
// is stored as a string: "blocked" | "ready" | "wip" | "done".

export const PHASE_ORDER = [
  "selection",
  "annotation",
  "audio",
  "qa",
  "published",
] as const;
export type PhaseName = (typeof PHASE_ORDER)[number];

export const PHASE_LABELS: Record<PhaseName, string> = {
  selection: "Selection",
  annotation: "Annotation",
  audio: "Audio",
  qa: "QA",
  published: "Publish",
};

// Matches the string union stored on lessons.phaseXxx fields.
export const PHASE_STATUSES = ["blocked", "ready", "wip", "done"] as const;
export type PhaseStatus = (typeof PHASE_STATUSES)[number];

// Schema field name on `lessons` entity for each phase.
export const PHASE_FIELD: Record<PhaseName, string> = {
  selection: "phaseSelection",
  annotation: "phaseAnnotation",
  audio: "phaseAudio",
  qa: "phaseQA",
  published: "phasePublished",
};

export function isPhaseStatus(v: unknown): v is PhaseStatus {
  return typeof v === "string" && (PHASE_STATUSES as readonly string[]).includes(v);
}
