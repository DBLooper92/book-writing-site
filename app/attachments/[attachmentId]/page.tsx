"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import type { ReactNode } from "react";

import { AttachmentDetailSection } from "@/components/attachments/attachment-detail-section";
import { PageShell } from "@/components/layout/page-shell";
import { useAttachment } from "@/hooks/use-attachment";

export default function AttachmentDetailPage() {
  const params = useParams<{ attachmentId: string }>();
  const attachmentId = typeof params.attachmentId === "string" ? params.attachmentId : null;
  const { attachment, loading, error, user, activeProjectId, activeProject } =
    useAttachment(attachmentId);

  return (
    <PageShell
      eyebrow="Attachments"
      title={attachment?.title ?? "Attachment detail"}
      description="Attachment records are loaded from the active project's nested attachments collection so each detail view stays scoped to the current story bible."
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
              Scope: Supabase rows filtered by user_id and project_id for attachments/
              {attachmentId ?? "{attachmentId}"}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/attachments"
              className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-200 px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
            >
              Back to attachments
            </Link>
            {attachment ? (
              <Link
                href={`/attachments/${attachment.id}/edit`}
                className="inline-flex h-11 items-center justify-center rounded-full bg-zinc-950 px-4 text-sm font-medium text-white transition hover:bg-zinc-800"
              >
                Edit attachment
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      {!user ? (
        <StateCard tone="warning">
          Sign in first to view this attachment.{" "}
          <Link href="/auth" className="font-medium underline">
            Go to auth
          </Link>
          .
        </StateCard>
      ) : loading ? (
        <StateCard tone="neutral">Loading attachment details...</StateCard>
      ) : !activeProjectId || !activeProject ? (
        <StateCard tone="neutral">
          No active project selected. Choose one on the{" "}
          <Link href="/projects" className="font-medium underline">
            projects page
          </Link>
          .
        </StateCard>
      ) : error || !attachment ? (
        <StateCard tone="error">
          {error ?? "Attachment not found in the active project."}
        </StateCard>
      ) : (
        <>
          <AttachmentDetailSection title="Summary">
            <div className="space-y-3 text-sm leading-6 text-zinc-700">
              <p>{attachment.summary || "No summary yet."}</p>
              <p>{attachment.description || "No full description yet."}</p>
            </div>
          </AttachmentDetailSection>

          <AttachmentDetailSection title="File metadata">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <DetailItem label="Status" value={formatEnumLabel(attachment.status)} />
              <DetailItem
                label="Attachment type"
                value={formatEnumLabel(attachment.attachmentType)}
              />
              <DetailItem
                label="Storage status"
                value={formatEnumLabel(attachment.storageStatus)}
              />
              <DetailItem label="File name" value={attachment.fileName || "None"} />
              <DetailItem label="MIME type" value={attachment.mimeType || "None"} />
              <DetailItem label="URL" value={attachment.url ?? "None"} />
            </div>
          </AttachmentDetailSection>

          <AttachmentDetailSection title="Links and source">
            <div className="grid gap-4 lg:grid-cols-2">
              <TextBlock label="Source note" value={attachment.sourceNote} />
              <TextBlock
                label="Primary linked record"
                value={
                  attachment.linkedEntityType && attachment.linkedEntityId
                    ? `${attachment.linkedEntityType}: ${attachment.linkedEntityId}`
                    : "None"
                }
              />
              <ListBlock label="Linked note IDs" values={attachment.linkedNoteIds} />
              <ListBlock label="Linked outline IDs" values={attachment.linkedOutlineIds} />
              <ListBlock label="Tags" values={attachment.tags} />
            </div>
          </AttachmentDetailSection>
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
      <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-zinc-700">
        {value || "None yet."}
      </p>
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

function formatEnumLabel(value: string) {
  return value.replace(/_/g, " ");
}
