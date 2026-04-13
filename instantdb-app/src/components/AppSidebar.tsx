"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import db from "@/lib/instant";

export default function AppSidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const prevPathRef = useRef(pathname);

  // Close mobile sidebar on navigation
  if (prevPathRef.current !== pathname) {
    prevPathRef.current = pathname;
    if (mobileOpen) setMobileOpen(false);
  }

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMobileOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  const sidebarContent = (
    <>
      {/* Header */}
      <div className="px-5 py-4 border-b border-[#e5e5e5]">
        <h1 className="text-[0.8rem] font-bold text-[#0f766e] leading-tight">
          Learn Qur'an Without Grammar
        </h1>
      </div>

      {/* Nav links */}
      <nav className="py-2 border-b border-[#e5e5e5]">
        <NavLink href="/" label="Dashboard" active={pathname === "/"} />
        <NavLink href="/seed" label="Seed Data" active={pathname === "/seed"} />
      </nav>

      {/* Contextual content */}
      <div className="py-2">
        {pathname === "/" && <DashboardSidebar />}
        {pathname.startsWith("/picker/") && <PickerSidebar />}
        {pathname === "/seed" && <SeedSidebar />}
      </div>
    </>
  );

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="fixed top-3 left-3 z-[110] p-2 bg-white border border-[#e5e5e5] rounded-lg shadow-sm text-[#6b6b6b] hover:text-[#1a1a1a] hidden max-[900px]:block"
        aria-label="Open menu"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <title>Menu</title>
          <path d="M3 5h14M3 10h14M3 15h14" />
        </svg>
      </button>

      {/* Desktop sidebar */}
      <aside className="bg-white border-r border-[#e5e5e5] sticky top-0 h-screen overflow-y-auto w-[240px] flex-shrink-0 max-[900px]:hidden">
        {sidebarContent}
      </aside>

      {/* Mobile overlay sidebar */}
      {mobileOpen && (
        <>
          <button
            type="button"
            className="fixed inset-0 bg-black/40 z-100 border-none cursor-default"
            onClick={() => setMobileOpen(false)}
            aria-label="Close sidebar"
          />
          <aside className="fixed inset-y-0 left-0 w-[260px] bg-white z-[101] overflow-y-auto shadow-xl">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="absolute top-3 right-3 p-1 text-[#6b6b6b] hover:text-[#1a1a1a]"
              aria-label="Close menu"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <title>Close</title>
                <path d="M4 4l10 10M14 4L4 14" />
              </svg>
            </button>
            {sidebarContent}
          </aside>
        </>
      )}
    </>
  );
}

function NavLink({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-2 px-5 py-[0.45rem] text-[0.8rem] font-medium transition-colors ${
        active
          ? "text-[#0f766e] font-semibold bg-[#f0fdf4] border-r-[3px] border-[#0f766e]"
          : "text-[#6b6b6b] hover:bg-[#f9fafb] hover:text-[#1a1a1a]"
      }`}
    >
      {label}
    </Link>
  );
}

function DashboardSidebar() {
  const { isLoading, data } = db.useQuery({ lessons: {} });

  if (isLoading || !data?.lessons) return null;

  const lessons = [...data.lessons].sort(
    (a: Record<string, unknown>, b: Record<string, unknown>) =>
      (a.lessonNumber as number) - (b.lessonNumber as number)
  );

  return (
    <>
      {lessons.map((lesson: Record<string, unknown>) => (
        <Link
          key={lesson.id as string}
          href={`/picker/${lesson.lessonNumber}`}
          className="flex items-center gap-2 px-5 py-[0.4rem] cursor-pointer transition-colors hover:bg-[#f9fafb] text-inherit no-underline"
        >
          <span className="text-[0.7rem] font-bold text-[#6b6b6b] min-w-[1.3rem]">
            {lesson.lessonNumber as number}
          </span>
          <span className="text-[0.78rem] font-medium text-[#1a1a1a]">
            {lesson.title as string}
          </span>
        </Link>
      ))}
    </>
  );
}

function PickerSidebar() {
  const pathname = usePathname();
  const lessonNumber = parseInt(pathname.split("/").pop() || "0", 10);

  const { isLoading, data } = db.useQuery({
    lessons: {},
    verses: {},
    selections: {},
  });

  if (isLoading || !data) return null;

  const lesson = data.lessons?.find(
    (l: Record<string, unknown>) => l.lessonNumber === lessonNumber
  );
  if (!lesson) return null;

  const verses = (data.verses ?? []).filter(
    (v: Record<string, unknown>) => v.lessonNumber === lessonNumber
  );
  const selections = (data.selections ?? []).filter(
    (s: Record<string, unknown>) => s.lessonNumber === lessonNumber
  );

  // Build selection map
  const selectionMap: Record<string, string> = {};
  for (const s of selections) {
    selectionMap[s.verseRef as string] = s.section as string;
  }

  // Group verses by rootKey
  const groups: Record<string, Record<string, unknown>[]> = {};
  for (const v of verses) {
    const key = v.rootKey as string;
    if (!groups[key]) groups[key] = [];
    groups[key].push(v);
  }

  // Count per root per section
  function countSection(rootKey: string, section: string) {
    return groups[rootKey]?.filter(
      (v) => (selectionMap[v.ref as string] ?? "none") === section
    ).length ?? 0;
  }

  // Determine current vs recall roots from lesson config
  const rootKeys = Object.keys(groups);
  // Parse lesson roots to determine which are "current"
  let currentRoots: string[] = [];
  try {
    currentRoots = JSON.parse(lesson.roots as string);
  } catch {
    currentRoots = rootKeys;
  }
  const recallRoots = rootKeys.filter((k) => !currentRoots.includes(k));

  const totalRecall = recallRoots.reduce(
    (sum, rk) => sum + countSection(rk, "recall"),
    0
  );

  return (
    <>
      {/* Lesson info */}
      <div className="px-5 py-3 border-b border-[#e5e5e5]">
        <h2 className="text-[0.82rem] font-bold text-[#1a1a1a]">
          L{lessonNumber}. {lesson.title as string}
        </h2>
        <div
          className="font-arabic text-[0.95rem] text-[#6b6b6b] mt-1 leading-relaxed"
          dir="rtl"
          style={{ textAlign: "right" }}
        >
          {lesson.seedArabic as string}
        </div>
      </div>

      {/* Current roots */}
      {currentRoots.map((rootKey) => (
        <div key={rootKey} className="mb-2">
          <div className="flex items-baseline gap-2 px-5 pt-2 pb-[0.15rem]">
            <span className="font-arabic text-[1.1rem] font-bold text-[#1a1a1a]">
              {/* Show first form from this root group */}
              {(groups[rootKey]?.[0]?.form as string) ?? rootKey}
            </span>
            <span className="text-[0.68rem] text-[#6b6b6b]">this lesson</span>
          </div>
          <SidebarNavLink
            href={`#group-${rootKey}`}
            label="Learning"
            count={countSection(rootKey, "learning")}
            filled={countSection(rootKey, "learning") > 0}
            variant="learning"
          />
          <SidebarNavLink
            href={`#group-${rootKey}`}
            label="Pipeline"
            count={countSection(rootKey, "pipeline")}
          />
          <SidebarNavLink
            href={`#group-${rootKey}`}
            label="Unassigned"
            count={countSection(rootKey, "none")}
          />
        </div>
      ))}

      {/* Divider + Recall roots */}
      {recallRoots.length > 0 && (
        <>
          <div className="h-px bg-[#e5e5e5] mx-5 my-2" />
          <SidebarNavLink
            href="#recall"
            label="All recall"
            count={totalRecall}
            filled={totalRecall > 0}
            variant="recall"
            bold
          />
          {recallRoots.map((rootKey) => (
            <div key={rootKey} className="mb-1">
              <div className="flex items-baseline gap-2 px-5 pt-2 pb-[0.15rem]">
                <span className="font-arabic text-[1.1rem] font-bold text-[#1a1a1a]">
                  {(groups[rootKey]?.[0]?.form as string) ?? rootKey}
                </span>
                <span className="text-[0.68rem] text-[#6b6b6b]">
                  recall
                </span>
              </div>
              <SidebarNavLink
                href={`#group-${rootKey}`}
                label="Recall"
                count={countSection(rootKey, "recall")}
              />
              <SidebarNavLink
                href={`#group-${rootKey}`}
                label="Pipeline"
                count={countSection(rootKey, "pipeline")}
              />
            </div>
          ))}
        </>
      )}
    </>
  );
}

function SeedSidebar() {
  const { isLoading, data } = db.useQuery({
    lessons: {},
    verses: {},
    selections: {},
  });

  if (isLoading || !data) return null;

  const stats = [
    { label: "Lessons", value: data.lessons?.length ?? 0 },
    { label: "Verses", value: data.verses?.length ?? 0 },
    { label: "Selections", value: data.selections?.length ?? 0 },
  ];

  return (
    <>
      {stats.map((s) => (
        <div
          key={s.label}
          className="flex justify-between px-5 py-1 text-[0.75rem]"
        >
          <span className="text-[#6b6b6b]">{s.label}</span>
          <span className="font-semibold text-[#1a1a1a]">
            {s.value.toLocaleString()}
          </span>
        </div>
      ))}
    </>
  );
}

function SidebarNavLink({
  href,
  label,
  count,
  filled,
  variant,
  bold,
}: {
  href: string;
  label: string;
  count: number;
  filled?: boolean;
  variant?: "learning" | "recall";
  bold?: boolean;
}) {
  const isFilled = filled && variant;

  const textColor = isFilled
    ? variant === "learning"
      ? "text-[#0f766e]"
      : "text-[#d97706]"
    : "text-[#6b6b6b]";

  const borderColor = isFilled
    ? variant === "learning"
      ? "border-l-[#0f766e]"
      : "border-l-[#d97706]"
    : "border-l-transparent";

  const countBg = isFilled
    ? variant === "learning"
      ? "bg-[#ccfbf1] text-[#0f766e]"
      : "bg-[#fef3c7] text-[#d97706]"
    : "bg-[#f3f4f6] text-[#6b6b6b]";

  return (
    <a
      href={href}
      className={`flex items-center justify-between py-[0.3rem] pr-5 border-l-[3px] transition-colors hover:bg-[#f9fafb] hover:text-[#1a1a1a] no-underline ${textColor} ${borderColor} ${
        bold ? "pl-5 font-semibold" : "pl-8"
      }`}
      style={{ fontSize: "0.78rem", fontWeight: bold ? 600 : 500 }}
    >
      {label}
      <span
        className={`px-[0.45rem] py-[0.05rem] rounded-full text-[0.68rem] font-semibold tabular-nums ${countBg}`}
      >
        {count}
      </span>
    </a>
  );
}
