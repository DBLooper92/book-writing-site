"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import type { ReactNode } from "react";

import { EntityImageGallery } from "@/components/attachments/entity-image-gallery";
import { EntityDeleteButton } from "@/components/layout/entity-delete-button";
import { PageShell } from "@/components/layout/page-shell";
import { ThemeDetailSection } from "@/components/themes/theme-detail-section";
import { useTheme } from "@/hooks/use-theme";
import { deleteEntityForProject } from "@/lib/data/entity-deletions";

export default function ThemeDetailPage() {
  const params = useParams<{ themeId: string }>();
  const themeId = typeof params.themeId === "string" ? params.themeId : null;
  const { theme, loading, error, user, activeProjectId, activeProject } = useTheme(themeId);

  return (
    <PageShell
      eyebrow="Themes"
      title={theme?.name ?? "Theme detail"}
      description="Theme records are loaded from the active project's scoped themes rows so narrative anchors stay scoped to the current story bible."
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
              Scope: Supabase rows filtered by user_id and project_id for themes/
              {themeId ?? "{themeId}"}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/themes"
              className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-200 px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
            >
              Back to themes
            </Link>
            {theme ? (
              <>
                <Link
                  href={`/themes/${theme.id}/edit`}
                  className="inline-flex h-11 items-center justify-center rounded-full bg-zinc-950 px-4 text-sm font-medium text-white transition hover:bg-zinc-800"
                >
                  Edit theme
                </Link>
                <EntityDeleteButton
                  entityLabel="theme"
                  entityTitle={theme.name}
                  onDelete={() =>
                    deleteEntityForProject(user?.uid ?? "", activeProjectId ?? "", "themes", theme.id)
                  }
                  redirectHref="/themes"
                />
              </>
            ) : null}
          </div>
        </div>
      </section>

      {!user ? (
        <StateCard tone="warning">
          Sign in first to view this theme.{" "}
          <Link href="/auth" className="font-medium underline">
            Go to auth
          </Link>
          .
        </StateCard>
      ) : loading ? (
        <StateCard tone="neutral">Loading theme details...</StateCard>
      ) : !activeProjectId || !activeProject ? (
        <StateCard tone="neutral">
          No active project selected. Choose one on the{" "}
          <Link href="/projects" className="font-medium underline">
            projects page
          </Link>
          .
        </StateCard>
      ) : error || !theme ? (
        <StateCard tone="error">{error ?? "Theme not found in the active project."}</StateCard>
      ) : (
        <>
          <EntityImageGallery
            uid={user.uid}
            projectId={activeProjectId}
            entityType="themes"
            entityId={theme.id}
          />

          <ThemeDetailSection title="Summary">
            <div className="space-y-3 text-sm leading-6 text-zinc-700">
              <p>{theme.summary || "No summary yet."}</p>
              <p>{theme.description || "No full description yet."}</p>
            </div>
          </ThemeDetailSection>

          <ThemeDetailSection title="Core details">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <DetailItem label="Status" value={formatEnumValue(theme.status)} />
              <DetailItem label="Canon level" value={formatEnumValue(theme.canonLevel)} />
              <DetailItem label="Confidence" value={formatEnumValue(theme.confidence)} />
              <DetailItem label="Slug" value={theme.slug} />
            </div>
          </ThemeDetailSection>

          <ThemeDetailSection title="Core question">
            <p className="text-sm leading-6 text-zinc-700">
              {theme.centralQuestion || "No central question stored yet."}
            </p>
          </ThemeDetailSection>

          <ThemeDetailSection title="Links and references">
            <div className="grid gap-4 lg:grid-cols-2">
              <ListBlock label="Associated book IDs" values={theme.associatedBookIds} />
              <ListBlock label="Associated character IDs" values={theme.associatedCharacterIds} />
              <ListBlock
                label="Associated timeline event IDs"
                values={theme.associatedTimelineEventIds}
              />
              <ListBlock label="Associated era IDs" values={theme.associatedEraIds} />
              <ListBlock
                label="Associated plot thread IDs"
                values={theme.associatedPlotThreadIds}
              />
              <ListBlock label="Tags" values={theme.tags} />
            </div>
          </ThemeDetailSection>

          <ThemeDetailSection title="Motifs">
            <ListBlock label="Motifs" values={theme.motifs} />
          </ThemeDetailSection>

          <ThemeDetailSection title="Public wiki summary">
            <p className="whitespace-pre-wrap text-sm leading-6 text-zinc-700">
              {theme.publicWikiSummary || "No public wiki summary stored yet."}
            </p>
          </ThemeDetailSection>
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

function formatEnumValue(value: string) {
  if (!value) {
    return "Unknown";
  }

  return value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}
