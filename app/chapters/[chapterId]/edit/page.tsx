"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import type { ReactNode } from "react";

import { ChapterForm } from "@/components/chapters/chapter-form";
import { PageShell } from "@/components/layout/page-shell";
import { useChapter } from "@/hooks/use-chapter";
import { updateChapterForProject } from "@/lib/firebase/chapters";
import { chapterToFormValues, type NormalizedChapterFormValues } from "@/types/chapter";

export default function EditChapterPage() {
  const params = useParams<{ chapterId: string }>();
  const router = useRouter();
  const chapterId = typeof params.chapterId === "string" ? params.chapterId : null;
  const { chapter, loading, error, user, uid, activeProjectId, activeProject } =
    useChapter(chapterId);

  async function handleUpdateChapter(values: NormalizedChapterFormValues) {
    if (!uid || !activeProjectId || !chapterId) {
      throw new Error("Chapter context is missing.");
    }

    await updateChapterForProject(uid, activeProjectId, chapterId, values);
    router.push(`/chapters/${chapterId}`);
  }

  return (
    <PageShell
      eyebrow="Chapters"
      title={chapter ? `Edit ${chapter.title}` : "Edit chapter"}
      description="Update the first set of structured chapter fields and write the changes back to the currently active project's nested chapter document."
    >
      <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-zinc-950">
              Active project
            </h2>
            <p className="mt-2 text-sm leading-6 text-zinc-600">
              {activeProject
                ? `${activeProject.title} (${activeProject.id})`
                : "No active project selected"}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/chapters"
              className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-200 px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
            >
              Back to chapters
            </Link>
            {chapterId ? (
              <Link
                href={`/chapters/${chapterId}`}
                className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-200 px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
              >
                View detail
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      {!user ? (
        <StateCard tone="warning">
          Sign in first to edit chapters.{" "}
          <Link href="/auth" className="font-medium underline">
            Go to auth
          </Link>
          .
        </StateCard>
      ) : loading ? (
        <StateCard tone="neutral">Loading chapter data...</StateCard>
      ) : !activeProjectId || !activeProject ? (
        <StateCard tone="neutral">
          No active project selected. Choose one on the{" "}
          <Link href="/projects" className="font-medium underline">
            projects page
          </Link>
          .
        </StateCard>
      ) : error || !chapter ? (
        <StateCard tone="error">{error ?? "Chapter not found in the active project."}</StateCard>
      ) : (
        <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <ChapterForm
            initialValues={chapterToFormValues(chapter)}
            submitLabel="Save changes"
            onSubmit={handleUpdateChapter}
          />
        </section>
      )}
    </PageShell>
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
    <section className={`rounded-3xl border p-6 text-sm leading-6 ${className}`}>
      {children}
    </section>
  );
}
