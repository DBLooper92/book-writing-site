"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import type { ReactNode } from "react";

import { PageShell } from "@/components/layout/page-shell";
import { NoteForm } from "@/components/notes/note-form";
import { useNote } from "@/hooks/use-note";
import { updateNoteForProject } from "@/lib/firebase/notes";
import { noteToFormValues, type NormalizedNoteFormValues } from "@/types/note";

export default function EditNotePage() {
  const params = useParams<{ noteId: string }>();
  const router = useRouter();
  const noteId = typeof params.noteId === "string" ? params.noteId : null;
  const { note, loading, error, user, uid, activeProjectId, activeProject } =
    useNote(noteId);

  async function handleUpdateNote(values: NormalizedNoteFormValues) {
    if (!uid || !activeProjectId || !noteId) {
      throw new Error("Note context is missing.");
    }

    await updateNoteForProject(uid, activeProjectId, noteId, values);
    router.push(`/notes/${noteId}`);
  }

  return (
    <PageShell
      eyebrow="Notes"
      title={note ? `Edit ${note.title}` : "Edit note"}
      description="Update the first set of structured note fields and write the changes back to the currently active project's nested note document."
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
              href="/notes"
              className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-200 px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
            >
              Back to notes
            </Link>
            {noteId ? (
              <Link
                href={`/notes/${noteId}`}
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
          Sign in first to edit notes.{" "}
          <Link href="/auth" className="font-medium underline">
            Go to auth
          </Link>
          .
        </StateCard>
      ) : loading ? (
        <StateCard tone="neutral">Loading note data...</StateCard>
      ) : !activeProjectId || !activeProject ? (
        <StateCard tone="neutral">
          No active project selected. Choose one on the{" "}
          <Link href="/projects" className="font-medium underline">
            projects page
          </Link>
          .
        </StateCard>
      ) : error || !note ? (
        <StateCard tone="error">{error ?? "Note not found in the active project."}</StateCard>
      ) : (
        <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <NoteForm
            initialValues={noteToFormValues(note)}
            submitLabel="Save changes"
            onSubmit={handleUpdateNote}
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
