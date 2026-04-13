"use client";

import { useState } from "react";
import { tx, id as iid } from "@instantdb/react";
import db from "@/lib/instant";
import type { IssueType } from "@/lib/types";

const ISSUE_CHIPS: { type: IssueType; activeStyle: string }[] = [
  { type: "Arabic", activeStyle: "bg-[#e8f5ee] border-[#1a6b3a] text-[#1a6b3a]" },
  { type: "Eng", activeStyle: "bg-[#e8f0fe] border-[#1a56db] text-[#1a56db]" },
  { type: "Audio", activeStyle: "bg-[#fef3c7] border-[#b8930a] text-[#92740a]" },
  { type: "Hook", activeStyle: "bg-[#fce7f3] border-[#be185d] text-[#be185d]" },
  { type: "Other", activeStyle: "bg-[#f3f4f6] border-[#636366] text-[#636366]" },
];

export default function IssueBar({
  verseRef,
  lessonNumber,
  existingIssue,
}: {
  verseRef: string;
  lessonNumber: number;
  existingIssue: Record<string, unknown> | null;
}) {
  const [noteDraft, setNoteDraft] = useState(
    (existingIssue?.note as string) ?? ""
  );

  const activeType = (existingIssue?.type as IssueType) ?? null;
  const hasIssue = activeType !== null;

  function handleChipClick(chipType: IssueType) {
    if (activeType === chipType) {
      // Deselect — delete the issue
      if (existingIssue) {
        db.transact(tx.issues[existingIssue.id as string].delete());
      }
    } else if (existingIssue) {
      // Change type on existing issue
      db.transact(
        tx.issues[existingIssue.id as string].update({ type: chipType })
      );
    } else {
      // Create new issue
      db.transact(
        tx.issues[iid()].update({
          verseRef,
          lessonNumber,
          type: chipType,
          note: "",
          createdAt: Date.now(),
        })
      );
    }
  }

  function handleNoteBlur() {
    if (!existingIssue) return;
    const trimmed = noteDraft.trim();
    if (trimmed !== (existingIssue.note as string)) {
      db.transact(
        tx.issues[existingIssue.id as string].update({ note: trimmed })
      );
    }
  }

  return (
    <div
      data-testid="issue-bar"
      data-has-issue={hasIssue ? "true" : "false"}
      className={`flex items-center gap-[0.35rem] mt-2 px-[0.6rem] py-[0.4rem] rounded-lg border transition-colors ${
        hasIssue
          ? "bg-[#fefce8] border-[#fde68a]"
          : "bg-[#fafaf9] border-transparent hover:border-[#e5e5e5]"
      }`}
    >
      <span className={`text-[0.85rem] flex-shrink-0 ${hasIssue ? "text-[#f59e0b]" : "text-[#d1d5db]"}`}>
        {hasIssue ? "\u2691" : "\u2690"}
      </span>

      <div className="flex gap-1 flex-shrink-0">
        {ISSUE_CHIPS.map((chip) => (
          <button
            key={chip.type}
            type="button"
            onClick={() => handleChipClick(chip.type)}
            className={`px-2 py-[0.15rem] rounded-xl border text-[0.68rem] font-medium cursor-pointer transition-colors leading-[1.4] ${
              activeType === chip.type
                ? chip.activeStyle
                : "bg-white border-[#e5e7eb] text-[#9ca3af] hover:border-[#9ca3af] hover:text-[#1a1a1a]"
            }`}
          >
            {chip.type}
          </button>
        ))}
      </div>

      <input
        type="text"
        value={noteDraft}
        onChange={(e) => setNoteDraft(e.target.value)}
        onBlur={handleNoteBlur}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.currentTarget.blur();
          }
        }}
        placeholder="note..."
        className="flex-1 border-none bg-transparent text-[0.78rem] text-[#1a1a1a] px-1 py-[0.2rem] min-w-[80px] focus:outline-none placeholder:text-[#d1d5db] placeholder:italic"
      />
    </div>
  );
}
