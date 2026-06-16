"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import type { ReactNode } from "react";

import { EntityImageGallery } from "@/components/attachments/entity-image-gallery";
import { EntityDeleteButton } from "@/components/layout/entity-delete-button";
import { PageShell } from "@/components/layout/page-shell";
import { TechnologyDetailSection } from "@/components/technologies/technology-detail-section";
import { useTechnology } from "@/hooks/use-technology";
import { deleteEntityForProject } from "@/lib/data/entity-deletions";

export default function TechnologyDetailPage() {
  const params = useParams<{ technologyId: string }>();
  const technologyId = typeof params.technologyId === "string" ? params.technologyId : null;
  const { technology, loading, error, user, activeProjectId, activeProject } =
    useTechnology(technologyId);

  return (
    <PageShell
      eyebrow="Technologies"
      title={technology?.name ?? "Technology detail"}
      description="Technology records are loaded from the active project's scoped technologies rows so infrastructure and system records stay scoped to the current story bible."
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
              Scope: Supabase rows filtered by user_id and project_id for technologies/
              {technologyId ?? "{technologyId}"}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/technologies"
              className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-200 px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
            >
              Back to technologies
            </Link>
            {technology ? (
              <>
                <Link
                  href={`/technologies/${technology.id}/edit`}
                  className="inline-flex h-11 items-center justify-center rounded-full bg-zinc-950 px-4 text-sm font-medium text-white transition hover:bg-zinc-800"
                >
                  Edit technology
                </Link>
                <EntityDeleteButton
                  entityLabel="technology"
                  entityTitle={technology.name}
                  onDelete={() =>
                    deleteEntityForProject(
                      user?.uid ?? "",
                      activeProjectId ?? "",
                      "technologies",
                      technology.id
                    )
                  }
                  redirectHref="/technologies"
                />
              </>
            ) : null}
          </div>
        </div>
      </section>

      {!user ? (
        <StateCard tone="warning">
          Sign in first to view this technology.{" "}
          <Link href="/auth" className="font-medium underline">
            Go to auth
          </Link>
          .
        </StateCard>
      ) : loading ? (
        <StateCard tone="neutral">Loading technology details...</StateCard>
      ) : !activeProjectId || !activeProject ? (
        <StateCard tone="neutral">
          No active project selected. Choose one on the{" "}
          <Link href="/projects" className="font-medium underline">
            projects page
          </Link>
          .
        </StateCard>
      ) : error || !technology ? (
        <StateCard tone="error">
          {error ?? "Technology not found in the active project."}
        </StateCard>
      ) : (
        <>
          <EntityImageGallery
            uid={user.uid}
            projectId={activeProjectId}
            entityType="technologies"
            entityId={technology.id}
          />

          <TechnologyDetailSection title="Summary">
            <div className="space-y-3 text-sm leading-6 text-zinc-700">
              <p>{technology.summary || "No summary yet."}</p>
              <p>{technology.description || "No full description yet."}</p>
            </div>
          </TechnologyDetailSection>

          <TechnologyDetailSection title="Core details">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <DetailItem label="Status" value={technology.status} />
              <DetailItem
                label="Technology type"
                value={technology.technologyType || "technology"}
              />
              <DetailItem
                label="Invented year"
                value={formatOptionalNumber(technology.inventedYear)}
              />
              <DetailItem label="Canon level" value={technology.canonLevel} />
              <DetailItem label="Confidence" value={technology.confidence} />
              <DetailItem
                label="Power source"
                value={technology.powerSource || "Unknown"}
              />
            </div>
          </TechnologyDetailSection>

          <TechnologyDetailSection title="Operational context">
            <div className="grid gap-4 lg:grid-cols-2">
              <TextBlock label="Inventor notes" value={technology.inventorNotes} />
              <TextBlock label="Public wiki summary" value={technology.publicWikiSummary} />
            </div>
          </TechnologyDetailSection>

          <TechnologyDetailSection title="Connections and constraints">
            <div className="grid gap-4 lg:grid-cols-2">
              <ListBlock
                label="Associated location IDs"
                values={technology.associatedLocationIds}
              />
              <ListBlock
                label="Associated faction IDs"
                values={technology.associatedFactionIds}
              />
              <ListBlock label="Timeline event IDs" values={technology.timelineEventIds} />
              <ListBlock label="Limitations" values={technology.limitations} />
              <ListBlock label="Tags" values={technology.tags} />
            </div>
          </TechnologyDetailSection>
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
