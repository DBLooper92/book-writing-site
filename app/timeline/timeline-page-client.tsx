"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useSearchParams } from "next/navigation";

import { TimelineWorkspaceVisual } from "@/components/timeline/timeline-workspace-visual";
import { useTimelineWorkspace } from "@/hooks/use-timeline-workspace";

export function TimelinePageClient() {
  const [mounted, setMounted] = useState(false);
  const searchParams = useSearchParams();
  const {
    loading,
    error,
    user,
    uid,
    activeProjectId,
    activeProject,
    refreshTimelineEvents,
    filters,
    updateFilters,
    resetFilters,
    hasActiveFilters,
    workspace,
  } = useTimelineWorkspace();
  const isDraftSplitScreen = searchParams.get("draftPane") === "split";

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <main
      className={`flex w-full flex-col bg-[linear-gradient(180deg,#fcfbf7_0%,#f6f3ec_100%)] ${
        isDraftSplitScreen
          ? "h-[calc(100vh-6rem)] overflow-hidden pt-0"
          : "min-h-[calc(100vh-6rem)] pt-4 xl:min-h-[calc(100vh-6rem)] xl:pt-0"
      }`}
    >
      <h1 className="sr-only">Timeline</h1>

      {!mounted ? (
        <StateCard tone="neutral">Loading timeline workspace...</StateCard>
      ) : !user ? (
        <StateCard tone="warning">
          Sign in first to browse timeline data for your projects.{" "}
          <Link href="/auth" className="font-medium underline">
            Go to auth
          </Link>
          .
        </StateCard>
      ) : loading ? (
        <StateCard tone="neutral">Loading timeline workspace...</StateCard>
      ) : !uid || !activeProjectId || !activeProject ? (
        <StateCard tone="neutral">
          No active project selected. Choose one on the{" "}
          <Link href="/projects" className="font-medium underline">
            projects page
          </Link>
          .
        </StateCard>
      ) : error ? (
        <StateCard tone="error">{error}</StateCard>
      ) : (
        <TimelineWorkspaceVisual
          activeProjectId={activeProjectId}
          activeProjectTitle={activeProject.title}
          filters={filters}
          hasActiveFilters={hasActiveFilters}
          onChange={updateFilters}
          onReset={resetFilters}
          stats={workspace.stats}
          timelineEvents={workspace.filteredEvents}
          uid={uid}
          onRefreshTimelineEvents={refreshTimelineEvents}
        />
      )}
    </main>
  );
}

function StateCard({
  children,
  tone,
}: {
  children: ReactNode;
  tone: "neutral" | "warning" | "error";
}) {
  const className =
    tone === "warning"
      ? "border-amber-200 bg-amber-50 text-amber-800"
      : tone === "error"
        ? "border-red-200 bg-red-50 text-red-700"
        : "border-zinc-300 bg-zinc-50 text-zinc-600";

  return (
    <section className="flex flex-1 items-center justify-center">
      <div className={`w-full max-w-3xl rounded-4xl border p-6 text-sm leading-6 ${className}`}>
        {children}
      </div>
    </section>
  );
}
