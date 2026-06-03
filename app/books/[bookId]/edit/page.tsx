"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import type { ReactNode } from "react";

import { BookForm } from "@/components/books/book-form";
import { PageShell } from "@/components/layout/page-shell";
import { useBook } from "@/hooks/use-book";
import { updateBookForProject } from "@/lib/data/books";
import { bookToFormValues, type NormalizedBookFormValues } from "@/types/book";

export default function EditBookPage() {
  const params = useParams<{ bookId: string }>();
  const router = useRouter();
  const bookId = typeof params.bookId === "string" ? params.bookId : null;
  const { book, loading, error, user, uid, activeProjectId, activeProject } = useBook(bookId);

  async function handleUpdateBook(values: NormalizedBookFormValues) {
    if (!uid || !activeProjectId || !bookId) {
      throw new Error("Book context is missing.");
    }

    await updateBookForProject(uid, activeProjectId, bookId, values);
    router.push(`/books/${bookId}`);
  }

  return (
    <PageShell
      eyebrow="Books"
      title={book ? `Edit ${book.title}` : "Edit book"}
      description="Update the first set of structured book fields and write the changes back to the currently active project's book record."
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
              href="/books"
              className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-200 px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
            >
              Back to books
            </Link>
            {bookId ? (
              <Link
                href={`/books/${bookId}`}
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
          Sign in first to edit books.{" "}
          <Link href="/auth" className="font-medium underline">
            Go to auth
          </Link>
          .
        </StateCard>
      ) : loading ? (
        <StateCard tone="neutral">Loading book data...</StateCard>
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
        <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <BookForm
            initialValues={bookToFormValues(book)}
            submitLabel="Save changes"
            onSubmit={handleUpdateBook}
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
