"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import type { ReactNode } from "react";

import { PageShell } from "@/components/layout/page-shell";
import { NoteDetailSection } from "@/components/notes/note-detail-section";
import { useNote } from "@/hooks/use-note";

export default function NoteDetailPage() {
  const params = useParams<{ noteId: string }>();
  const noteId = typeof params.noteId === "string" ? params.noteId : null;
  const { note, loading, error, user, activeProjectId, activeProject } = useNote(noteId);

  return (
    <PageShell
      eyebrow="Notes"
      title={note?.title ?? "Note detail"}
      description="Note records are loaded from the active project's scoped notes rows so each detail view stays scoped to the current story bible."
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
              Scope: Supabase rows filtered by user_id and project_id for notes/
              {noteId ?? "{noteId}"}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/notes"
              className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-200 px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
            >
              Back to notes
            </Link>
            {note ? (
              <Link
                href={`/notes/${note.id}/edit`}
                className="inline-flex h-11 items-center justify-center rounded-full bg-zinc-950 px-4 text-sm font-medium text-white transition hover:bg-zinc-800"
              >
                Edit note
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      {!user ? (
        <StateCard tone="warning">
          Sign in first to view this note.{" "}
          <Link href="/auth" className="font-medium underline">
            Go to auth
          </Link>
          .
        </StateCard>
      ) : loading ? (
        <StateCard tone="neutral">Loading note details...</StateCard>
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
        <>
          <NoteDetailSection title="Summary">
            <div className="space-y-3 text-sm leading-6 text-zinc-700">
              <p>{note.summary || "No summary yet."}</p>
              <p>{note.description || "No full description yet."}</p>
            </div>
          </NoteDetailSection>

          <NoteDetailSection title="Content">
            <p className="whitespace-pre-wrap text-sm leading-7 text-zinc-700">
              {note.content || "No note content yet."}
            </p>
          </NoteDetailSection>

          <NoteDetailSection title="Core details">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <DetailItem label="Status" value={note.status} />
              <DetailItem label="Note type" value={note.noteType} />
              <DetailItem label="Canon level" value={note.canonLevel} />
              <DetailItem label="Confidence" value={note.confidence} />
              <DetailItem label="Linked entity type" value={note.linkedEntityType ?? "None"} />
              <DetailItem label="Linked entity ID" value={note.linkedEntityId ?? "None"} />
            </div>
          </NoteDetailSection>

          <NoteDetailSection title="Links and references">
            <div className="grid gap-4 lg:grid-cols-2">
              <ListBlock label="Tags" values={note.tags} />
              <ListBlock label="Book IDs" values={note.linkedBookIds} />
              <ListBlock label="Chapter IDs" values={note.linkedChapterIds} />
              <ListBlock label="Character IDs" values={note.linkedCharacterIds} />
              <ListBlock label="Location IDs" values={note.linkedLocationIds} />
              <ListBlock label="Event IDs" values={note.linkedEventIds} />
              <ListBlock label="Thread IDs" values={note.linkedThreadIds} />
            </div>
          </NoteDetailSection>
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
