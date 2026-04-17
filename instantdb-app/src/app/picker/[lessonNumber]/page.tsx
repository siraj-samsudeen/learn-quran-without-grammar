"use client";

import { use } from "react";
import Link from "next/link";
import { usePickerData } from "./usePickerData";

export default function PickerPage({
  params,
}: {
  params: Promise<{ lessonNumber: string }>;
}) {
  const { lessonNumber: raw } = use(params);
  const lessonNumber = parseInt(raw, 10);
  const data = usePickerData(lessonNumber);

  if (data.isLoading) {
    return <div className="flex items-center justify-center h-screen text-gray-500">Loading...</div>;
  }
  if (!data.lesson) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <p className="text-red-600">Lesson {lessonNumber} not found.</p>
        <Link href="/" className="text-emerald-700 underline text-sm">
          ← Back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="px-6 py-4 font-sans max-w-[1200px] mx-auto">
      <div className="flex items-center gap-3 mb-3">
        <Link href="/" className="text-[11px] text-[#475569] underline">
          ← Dashboard
        </Link>
        <h1 className="text-[14px] font-bold text-[#0f172a]">
          L{data.lesson.lessonNumber} — {data.lesson.title}
        </h1>
      </div>
      <div
        data-testid="picker-candidate-count"
        data-count={data.candidates.length}
        className="text-[11px] text-[#64748b]"
      >
        {data.candidates.length} candidates loaded
      </div>
    </div>
  );
}
