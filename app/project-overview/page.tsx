"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { PageShell } from "@/components/layout/page-shell";
import { useProjectRecord } from "@/hooks/use-project-record";

export default function ProjectOverviewPage() {
  const { user, activeProjectId, activeProject, projectRecord, projectError, loading } =
    useProjectRecord();
  const projectSettings = isSettingsRecord(projectRecord?.settings)
    ? projectRecord.settings
    : null;

  return (
    <PageShell
      eyebrow="Project"
      title={projectRecord?.title ?? activeProject?.title ?? "Project overview"}
      description="Review the current active project's high-level writing, worldbuilding, and runtime defaults without leaving the shared story-bible workspace."
    >
      <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-zinc-950">
              Active project context
            </h2>
            <p className="mt-2 text-sm leading-6 text-zinc-600">
              {activeProject
                ? `${activeProject.title} (${activeProject.id})`
                : "Choose an active project to load overview details."}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/projects"
              className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-200 px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
            >
              Manage projects
            </Link>
            <Link
              href="/timeline"
              className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-200 px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
            >
              Open timeline
            </Link>
          </div>
        </div>
      </section>

      {!user ? (
        <StateCard tone="warning">
          Sign in first to load the active project overview.{" "}
          <Link href="/auth" className="font-medium underline">
            Go to auth
          </Link>
          .
        </StateCard>
      ) : loading ? (
        <StateCard tone="neutral">Loading active project overview...</StateCard>
      ) : !activeProjectId || !activeProject ? (
        <StateCard tone="neutral">
          No active project selected. Choose one on the{" "}
          <Link href="/projects" className="font-medium underline">
            projects page
          </Link>
          .
        </StateCard>
      ) : projectError || !projectRecord ? (
        <StateCard tone="error">
          {projectError ?? "Active project details could not be found."}
        </StateCard>
      ) : (
        <>
          <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
            <OverviewPanel title="Story summary">
              <div className="space-y-4 text-sm leading-6 text-zinc-700">
                <p>{projectRecord.summary || "No project summary yet."}</p>
                <p>{projectRecord.description || "No project description yet."}</p>
              </div>
            </OverviewPanel>

            <OverviewPanel title="Core metadata">
              <div className="grid gap-3 sm:grid-cols-2">
                <DetailItem label="Project ID" value={projectRecord.id} />
                <DetailItem label="Status" value={projectRecord.status} />
                <DetailItem label="Genre" value={projectRecord.genre || "Unassigned"} />
                <DetailItem label="Tone" value={projectRecord.tone || "Undecided"} />
                <DetailItem
                  label="Writing status"
                  value={projectRecord.writingStatus || "Undecided"}
                />
                <DetailItem
                  label="POV style"
                  value={projectRecord.primaryPointOfViewStyle || "Undecided"}
                />
              </div>
            </OverviewPanel>
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <OverviewPanel title="Structure and chronology">
              <div className="grid gap-3 sm:grid-cols-2">
                <DetailItem
                  label="Timeline start"
                  value={formatOptionalNumber(projectRecord.timelineStartYear)}
                />
                <DetailItem
                  label="Timeline end"
                  value={formatOptionalNumber(projectRecord.timelineEndYear)}
                />
                <DetailItem
                  label="Book order mode"
                  value={projectRecord.bookOrderMode || "Undecided"}
                />
                <DetailItem
                  label="Default calendar"
                  value={projectRecord.defaultCalendarSystemId || "Unassigned"}
                />
                <DetailItem
                  label="Notes root ID"
                  value={projectRecord.notesRootId || "Unassigned"}
                />
                <DetailItem
                  label="Slug"
                  value={projectRecord.slug || "Unassigned"}
                />
              </div>
            </OverviewPanel>

            <OverviewPanel title="Themes and runtime settings">
              <div className="space-y-5">
                <ListBlock label="Project themes" values={projectRecord.themes} />
                <div className="grid gap-3 sm:grid-cols-2">
                  <DetailItem
                    label="Public wiki"
                    value={formatSettingBoolean(projectSettings?.allowPublicWiki)}
                  />
                  <DetailItem
                    label="AI writing"
                    value={formatSettingBoolean(projectSettings?.allowAIWriting)}
                  />
                  <DetailItem
                    label="AI editing"
                    value={formatSettingBoolean(projectSettings?.allowAIEditing)}
                  />
                  <DetailItem
                    label="Timeline scale"
                    value={formatSettingString(projectSettings?.defaultTimelineScale)}
                  />
                  <DetailItem
                    label="Spoiler policy"
                    value={formatSettingString(projectSettings?.spoilerPolicy)}
                  />
                  <DetailItem
                    label="Default language"
                    value={formatSettingString(projectSettings?.defaultLanguageId)}
                  />
                </div>
              </div>
            </OverviewPanel>
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <OverviewPanel title="Timestamps">
              <div className="grid gap-3 sm:grid-cols-2">
                <DetailItem
                  label="Created"
                  value={formatTimestamp(projectRecord.createdAt)}
                />
                <DetailItem
                  label="Updated"
                  value={formatTimestamp(projectRecord.updatedAt)}
                />
              </div>
            </OverviewPanel>

            <OverviewPanel title="Next routes">
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/books"
                  className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-200 px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
                >
                  Open books
                </Link>
                <Link
                  href="/characters"
                  className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-200 px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
                >
                  Open characters
                </Link>
                <Link
                  href="/notes"
                  className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-200 px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
                >
                  Open notes
                </Link>
              </div>
            </OverviewPanel>
          </section>
        </>
      )}
    </PageShell>
  );
}

function OverviewPanel({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold tracking-tight text-zinc-950">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
        {label}
      </p>
      <p className="mt-2 text-sm font-medium text-zinc-900">{value}</p>
    </div>
  );
}

function ListBlock({ label, values }: { label: string; values: string[] }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
        {label}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {values.length > 0 ? (
          values.map((value) => (
            <span
              key={`${label}-${value}`}
              className="rounded-full bg-zinc-100 px-3 py-1 text-sm text-zinc-700"
            >
              {value}
            </span>
          ))
        ) : (
          <span className="text-sm text-zinc-500">None yet.</span>
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

function formatTimestamp(value: string) {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString();
}

function isSettingsRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function formatSettingBoolean(value: unknown) {
  return typeof value === "boolean" ? (value ? "Enabled" : "Disabled") : "Unknown";
}

function formatSettingString(value: unknown) {
  return typeof value === "string" && value.trim() ? value : "Unassigned";
}
