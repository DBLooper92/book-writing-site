"use client";

import { useSyncExternalStore, type ReactNode } from "react";

import { ChapterDraftWorkspace } from "@/components/manuscript/chapter-draft-workspace";
import { useActiveProject } from "@/hooks/use-active-project";

export default function ManuscriptPage() {
  const { activeProject, activeProjectId, loading, uid, user } = useActiveProject();
  const hydrated = useHydrated();

  return (
    <main className="flex min-h-[calc(100vh-6rem)] w-full flex-col bg-[linear-gradient(180deg,#fcfbf7_0%,#f4efe6_100%)] xl:min-h-[calc(100vh-6rem)]">
      <h1 className="sr-only">Manuscript</h1>

      {!hydrated || loading ? (
        <StateCard tone="neutral">Loading chapter draft workspace...</StateCard>
      ) : !user ? (
        <StateCard tone="warning">Sign in first to open the chapter editor.</StateCard>
      ) : !uid || !activeProjectId || !activeProject ? (
        <StateCard tone="neutral">No active project selected. Open one from the launcher.</StateCard>
      ) : (
        <div className="flex min-h-0 flex-1">
          <ChapterDraftWorkspace
            activeProjectId={activeProjectId}
            layoutMode="standalone"
            uid={uid}
          />
        </div>
      )}
    </main>
  );
}

function useHydrated() {
  return useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false
  );
}

function StateCard({
  children,
  tone,
}: {
  children: ReactNode;
  tone: "neutral" | "warning";
}) {
  const className =
    tone === "warning"
      ? "border-amber-200 bg-amber-50 text-amber-800"
      : "border-zinc-300 bg-zinc-50 text-zinc-600";

  return (
    <section className="flex flex-1 items-center justify-center">
      <div className={`w-full max-w-3xl rounded-4xl border p-6 text-sm leading-6 ${className}`}>
        {children}
      </div>
    </section>
  );
}
