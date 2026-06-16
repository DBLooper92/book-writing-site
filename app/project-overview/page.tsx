"use client";

import type { ReactNode } from "react";
import Link from "next/link";

import { PageShell } from "@/components/layout/page-shell";
import { useProjectRecord } from "@/hooks/use-project-record";

export default function ProjectOverviewPage() {
  const { activeProject, activeProjectId, projectRecord, projectError, loading } =
    useProjectRecord();
  const projectSettings = isSettingsRecord(projectRecord?.settings) ? projectRecord.settings : null;

  return (
    <PageShell
      eyebrow="Project"
      title="Project overview"
      description="Review the current local project metadata, writing defaults, and canon runtime settings."
    >
      {loading ? (
        <StateCard tone="neutral">Loading local project overview...</StateCard>
      ) : !activeProjectId || !activeProject || !projectRecord ? (
        <StateCard tone={projectError ? "error" : "neutral"}>
          {projectError ?? "No local project is currently open."}
        </StateCard>
      ) : (
        <>
          <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-zinc-950">
                  Active desktop project
                </h2>
                <p className="mt-2 text-sm leading-6 text-zinc-600">
                  {activeProject.title} ({activeProject.id})
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  href="/timeline"
                  className="inline-flex h-11 items-center justify-center rounded-full bg-zinc-950 px-4 text-sm font-medium text-white transition hover:bg-zinc-800"
                >
                  Open timeline
                </Link>
                <Link
                  href="/drafts"
                  className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-200 px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
                >
                  Open drafts
                </Link>
              </div>
            </div>
          </section>

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
                <DetailItem label="Slug" value={projectRecord.slug || "Unassigned"} />
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
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">{label}</p>
      <p className="mt-2 text-sm font-medium text-zinc-900">{value}</p>
    </div>
  );
}

function ListBlock({ label, values }: { label: string; values: string[] }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">{label}</p>
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
  tone: "neutral" | "error";
}) {
  const className =
    tone === "error"
      ? "border-red-200 bg-red-50 text-red-700"
      : "border-zinc-300 bg-zinc-50 text-zinc-600";

  return (
    <section className={`rounded-3xl border p-6 text-sm leading-6 ${className}`}>{children}</section>
  );
}

function formatOptionalNumber(value: number | null) {
  return typeof value === "number" ? String(value) : "Unknown";
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
