"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import type { ReactNode } from "react";

import { ChapterDetailSection } from "@/components/chapters/chapter-detail-section";
import { PageShell } from "@/components/layout/page-shell";
import { useChapter } from "@/hooks/use-chapter";

export default function ChapterDetailPage() {
  const params = useParams<{ chapterId: string }>();
  const chapterId = typeof params.chapterId === "string" ? params.chapterId : null;
  const { chapter, loading, error, user, activeProjectId, activeProject } =
    useChapter(chapterId);

  return (
    <PageShell
      eyebrow="Chapters"
      title={chapter?.title ?? "Chapter detail"}
      description="Chapter records are loaded from the active project's nested chapters collection so every detail view stays scoped to the current story bible."
    >
      <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
              Active project
            </p>
            <p className="mt-2 text-sm text-zinc-700">
              {activeProject
                ? `${activeProject.title} (${activeProject.id})`
                : "No active project selected"}
            </p>
            <p className="mt-2 text-xs uppercase tracking-[0.18em] text-zinc-500">
              Scope: Supabase rows filtered by user_id and project_id for chapters/
              {chapterId ?? "{chapterId}"}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/chapters"
              className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-200 px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
            >
              Back to chapters
            </Link>
            {chapter ? (
              <Link
                href={`/chapters/${chapter.id}/edit`}
                className="inline-flex h-11 items-center justify-center rounded-full bg-zinc-950 px-4 text-sm font-medium text-white transition hover:bg-zinc-800"
              >
                Edit chapter
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      {!user ? (
        <StateCard tone="warning">
          Sign in first to view this chapter.{" "}
          <Link href="/auth" className="font-medium underline">
            Go to auth
          </Link>
          .
        </StateCard>
      ) : loading ? (
        <StateCard tone="neutral">Loading chapter details...</StateCard>
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
        <>
          <ChapterDetailSection title="Summary">
            <div className="space-y-3 text-sm leading-6 text-zinc-700">
              <p>{chapter.summary || "No summary yet."}</p>
              <p>{chapter.description || "No full description yet."}</p>
            </div>
          </ChapterDetailSection>

          <ChapterDetailSection title="Chapter details">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <DetailItem label="Status" value={chapter.status} />
              <DetailItem
                label="Chapter number"
                value={formatOptionalNumber(chapter.chapterNumber)}
              />
              <DetailItem label="Book ID" value={chapter.bookId ?? "None"} />
              <DetailItem
                label="POV character ID"
                value={chapter.pointOfViewCharacterId ?? "None"}
              />
              <DetailItem label="Canon level" value={chapter.canonLevel} />
              <DetailItem label="Confidence" value={chapter.confidence} />
              <DetailItem label="Slug" value={chapter.slug} />
            </div>
          </ChapterDetailSection>

          <ChapterDetailSection title="Purpose">
            <p className="text-sm leading-6 text-zinc-700">
              {chapter.purpose || "No chapter purpose recorded yet."}
            </p>
          </ChapterDetailSection>

          <ChapterDetailSection title="Links and references">
            <div className="grid gap-4 lg:grid-cols-2">
              <ListBlock label="Tags" values={chapter.tags} />
              <ListBlock label="Scene IDs" values={chapter.sceneIds} />
              <ListBlock label="Timeline event IDs" values={chapter.timelineEventIds} />
              <ListBlock label="Location IDs" values={chapter.locationIds} />
              <ListBlock label="Character IDs" values={chapter.characterIds} />
              <ListBlock label="Plot thread IDs" values={chapter.plotThreadIds} />
            </div>
          </ChapterDetailSection>

          <ChapterDetailSection title="Foreshadowing and payoffs">
            <div className="grid gap-4 lg:grid-cols-2">
              <ListBlock label="Foreshadows" values={chapter.foreshadows} />
              <ListBlock label="Payoffs" values={chapter.payoffs} />
            </div>
          </ChapterDetailSection>
        </>
      )}
    </PageShell>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
        {label}
      </p>
      <p className="mt-2 wrap-break-word text-sm font-medium text-zinc-900">{value}</p>
    </div>
  );
}

function ListBlock({ label, values }: { label: string; values: string[] }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
        {label}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {values.length > 0 ? (
          values.map((value) => (
            <span
              key={`${label}-${value}`}
              className="rounded-full bg-white px-3 py-1 text-sm text-zinc-700 ring-1 ring-zinc-200"
            >
              {value}
            </span>
          ))
        ) : (
          <span className="text-sm text-zinc-500">None</span>
        )}
      </div>
    </div>
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

function formatOptionalNumber(value: number | null) {
  return typeof value === "number" ? String(value) : "Unknown";
}
