"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

import { AttachmentForm } from "@/components/attachments/attachment-form";
import { PageShell } from "@/components/layout/page-shell";
import { useActiveProject } from "@/hooks/use-active-project";
import { createAttachmentForProject } from "@/lib/data/attachments";
import type { NormalizedAttachmentFormValues } from "@/types/attachment";

export default function NewAttachmentPage() {
  const router = useRouter();
  const { user, uid, activeProjectId, activeProject, loading } = useActiveProject();

  async function handleCreateAttachment(values: NormalizedAttachmentFormValues) {
    if (!uid || !activeProjectId) {
      throw new Error("Select an active project before creating an attachment.");
    }

    const attachmentId = await createAttachmentForProject(uid, activeProjectId, values);
    router.push(`/attachments/${attachmentId}`);
  }

  return (
    <PageShell
      eyebrow="Attachments"
      title="Create attachment"
      description="Start a new attachment metadata record inside the currently active project. This first-pass form focuses on file metadata and raw link targets while leaving real upload workflow for a later pass."
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
                : "A project must be active before attachment creation can continue."}
            </p>
          </div>

          <Link
            href="/attachments"
            className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-200 px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
          >
            Back to attachments
          </Link>
        </div>
      </section>

      {!user ? (
        <StateCard tone="warning">
          Sign in first to create attachments.{" "}
          <Link href="/auth" className="font-medium underline">
            Go to auth
          </Link>
          .
        </StateCard>
      ) : loading ? (
        <StateCard tone="neutral">Loading active project context...</StateCard>
      ) : !activeProjectId || !activeProject ? (
        <StateCard tone="neutral">
          No active project selected. Choose one on the{" "}
          <Link href="/projects" className="font-medium underline">
            projects page
          </Link>
          .
        </StateCard>
      ) : (
        <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <AttachmentForm submitLabel="Create attachment" onSubmit={handleCreateAttachment} />
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
  tone: "neutral" | "warning";
}) {
  const className =
    tone === "warning"
      ? "border-amber-200 bg-amber-50 text-amber-800"
      : "border-zinc-300 bg-zinc-50 text-zinc-600";

  return (
    <section className={`rounded-3xl border p-6 text-sm leading-6 ${className}`}>
      {children}
    </section>
  );
}

