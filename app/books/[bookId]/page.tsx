"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import type { ReactNode } from "react";

import { BookDetailSection } from "@/components/books/book-detail-section";
import { PageShell } from "@/components/layout/page-shell";
import { useBook } from "@/hooks/use-book";

export default function BookDetailPage() {
  const params = useParams<{ bookId: string }>();
  const bookId = typeof params.bookId === "string" ? params.bookId : null;
  const { book, loading, error, user, activeProjectId, activeProject } = useBook(bookId);

  return (
    <PageShell
      eyebrow="Books"
      title={book?.title ?? "Book detail"}
      description="Book records are loaded from the active project's nested books collection so every detail view stays scoped to the current story bible."
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
              Scope: Supabase rows filtered by user_id and project_id for books/
              {bookId ?? "{bookId}"}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/books"
              className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-200 px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
            >
              Back to books
            </Link>
            {book ? (
              <Link
                href={`/books/${book.id}/edit`}
                className="inline-flex h-11 items-center justify-center rounded-full bg-zinc-950 px-4 text-sm font-medium text-white transition hover:bg-zinc-800"
              >
                Edit book
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      {!user ? (
        <StateCard tone="warning">
          Sign in first to view this book.{" "}
          <Link href="/auth" className="font-medium underline">
            Go to auth
          </Link>
          .
        </StateCard>
      ) : loading ? (
        <StateCard tone="neutral">Loading book details...</StateCard>
      ) : !activeProjectId || !activeProject ? (
        <StateCard tone="neutral">
          No active project selected. Choose one on the{" "}
          <Link href="/projects" className="font-medium underline">
            projects page
          </Link>
          .
        </StateCard>
      ) : error || !book ? (
        <StateCard tone="error">{error ?? "Book not found in the active project."}</StateCard>
      ) : (
        <>
          <BookDetailSection title="Summary">
            <div className="space-y-3 text-sm leading-6 text-zinc-700">
              <p>{book.summary || "No summary yet."}</p>
              <p>{book.description || "No full description yet."}</p>
            </div>
          </BookDetailSection>

          <BookDetailSection title="Manuscript details">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <DetailItem label="Status" value={book.status} />
              <DetailItem label="Draft stage" value={book.draftStage} />
              <DetailItem label="Series order" value={formatOptionalNumber(book.seriesOrder)} />
              <DetailItem label="Canon level" value={book.canonLevel} />
              <DetailItem label="Confidence" value={book.confidence} />
              <DetailItem label="Slug" value={book.slug} />
            </div>
          </BookDetailSection>

          <BookDetailSection title="Premise and progress">
            <div className="grid gap-4 lg:grid-cols-2">
              <TextBlock label="Premise" value={book.premise} />
              <div className="grid gap-3 sm:grid-cols-2">
                <DetailItem
                  label="Word count target"
                  value={formatOptionalNumber(book.wordCountTarget)}
                />
                <DetailItem
                  label="Current word count"
                  value={formatOptionalNumber(book.wordCountCurrent)}
                />
                <DetailItem
                  label="Chronology start"
                  value={formatOptionalNumber(book.internalChronologyStart)}
                />
                <DetailItem
                  label="Chronology end"
                  value={formatOptionalNumber(book.internalChronologyEnd)}
                />
              </div>
            </div>
          </BookDetailSection>

          <BookDetailSection title="Links and references">
            <div className="grid gap-4 lg:grid-cols-2">
              <ListBlock label="Tags" values={book.tags} />
              <ListBlock label="Primary theme IDs" values={book.primaryThemes} />
              <ListBlock label="Main character IDs" values={book.mainCharacters} />
              <ListBlock label="Key location IDs" values={book.keyLocations} />
              <ListBlock label="Related plot thread IDs" values={book.relatedPlotThreads} />
              <ListBlock label="Chapter IDs" values={book.chapterIds} />
              <ListBlock label="Scene IDs" values={book.sceneIds} />
              <ListBlock label="Timeline event IDs" values={book.timelineEventIds} />
            </div>
          </BookDetailSection>

          <BookDetailSection title="Public wiki summary">
            <p className="text-sm leading-6 text-zinc-700">
              {book.publicWikiSummary || "No public wiki summary yet."}
            </p>
          </BookDetailSection>
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

function TextBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
        {label}
      </p>
      <p className="mt-2 text-sm leading-6 text-zinc-700">{value || "None yet."}</p>
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
