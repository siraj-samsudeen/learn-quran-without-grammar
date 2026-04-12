import { NextResponse } from "next/server";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

// Lesson number → root keys mapping (from pipeline-status.json)
const LESSON_ROOTS: Record<number, string[]> = {
  1: ["ilah", "kabura"],
  2: ["shahida"],
  3: ["rasul"],
  4: ["hayiya", "salah"],
  5: ["falaha"],
  6: ["khayr", "nawm"],
  7: ["qama"],
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lessonParam = searchParams.get("lesson");

  if (!lessonParam) {
    return NextResponse.json(
      { error: "Missing ?lesson= parameter" },
      { status: 400 }
    );
  }

  const lessonNumber = parseInt(lessonParam, 10);
  const rootKeys = LESSON_ROOTS[lessonNumber];

  if (!rootKeys) {
    return NextResponse.json(
      { error: `Unknown lesson number: ${lessonNumber}` },
      { status: 404 }
    );
  }

  // Root JSONs live at ../../docs/roots/{rootKey}.json relative to instantdb-app/
  const repoRoot = join(process.cwd(), "..");
  const allVerses: Array<{
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
    lessonNumber: number;
  }> = [];

  for (const rootKey of rootKeys) {
    const filePath = join(repoRoot, "docs", "roots", `${rootKey}.json`);

    if (!existsSync(filePath)) {
      continue;
    }

    const raw = readFileSync(filePath, "utf-8");
    const rootData = JSON.parse(raw);

    if (!rootData.verses || !Array.isArray(rootData.verses)) {
      continue;
    }

    for (const v of rootData.verses) {
      allVerses.push({
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
      });
    }
  }

  return NextResponse.json({
    lessonNumber,
    rootKeys,
    totalVerses: allVerses.length,
    verses: allVerses,
  });
}
