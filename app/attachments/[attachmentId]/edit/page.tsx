"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import type { ReactNode } from "react";

import { AttachmentForm } from "@/components/attachments/attachment-form";
import { PageShell } from "@/components/layout/page-shell";
import { useAttachment } from "@/hooks/use-attachment";
import { updateAttachmentForProject } from "@/lib/data/attachments";
import {
  attachmentToFormValues,
  type NormalizedAttachmentFormValues,
} from "@/types/attachment";

export default function EditAttachmentPage() {
  const params = useParams<{ attachmentId: string }>();
  const router = useRouter();
  const attachmentId =
    typeof params.attachmentId === "string" ? params.attachmentId : null;
  const { attachment, loading, error, user, uid, activeProjectId, activeProject } =
    useAttachment(attachmentId);

  async function handleUpdateAttachment(values: NormalizedAttachmentFormValues) {
    if (!uid || !activeProjectId || !attachmentId) {
      throw new Error("Attachment context is missing.");
    }

    await updateAttachmentForProject(uid, activeProjectId, attachmentId, values);
    router.push(`/attachments/${attachmentId}`);
  }

  return (
    <PageShell
      eyebrow="Attachments"
      title={attachment ? `Edit ${attachment.title}` : "Edit attachment"}
      description="Update the first set of structured attachment metadata fields and write the changes back to the currently active project's scoped attachment row."
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
              href="/attachments"
              className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-200 px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
            >
              Back to attachments
            </Link>
            {attachmentId ? (
              <Link
                href={`/attachments/${attachmentId}`}
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
          Sign in first to edit attachments.{" "}
          <Link href="/auth" className="font-medium underline">
            Go to auth
          </Link>
          .
        </StateCard>
      ) : loading ? (
        <StateCard tone="neutral">Loading attachment data...</StateCard>
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
        <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <AttachmentForm
            initialValues={attachmentToFormValues(attachment)}
            submitLabel="Save changes"
            onSubmit={handleUpdateAttachment}
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
