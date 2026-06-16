"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import type { ReactNode } from "react";

import { EntityImageGallery } from "@/components/attachments/entity-image-gallery";
import { EntityDeleteButton } from "@/components/layout/entity-delete-button";
import { PageShell } from "@/components/layout/page-shell";
import { SceneDetailSection } from "@/components/scenes/scene-detail-section";
import { useScene } from "@/hooks/use-scene";
import { deleteEntityForProject } from "@/lib/data/entity-deletions";

export default function SceneDetailPage() {
  const params = useParams<{ sceneId: string }>();
  const sceneId = typeof params.sceneId === "string" ? params.sceneId : null;
  const { scene, loading, error, user, activeProjectId, activeProject } = useScene(sceneId);

  return (
    <PageShell
      eyebrow="Scenes"
      title={scene?.title ?? "Scene detail"}
      description="Scene records are loaded from the active project's scoped scenes rows so every detail view stays scoped to the current story bible."
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
              Scope: Supabase rows filtered by user_id and project_id for scenes/
              {sceneId ?? "{sceneId}"}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/scenes"
              className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-200 px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
            >
              Back to scenes
            </Link>
            {scene ? (
              <>
                <Link
                  href={`/scenes/${scene.id}/edit`}
                  className="inline-flex h-11 items-center justify-center rounded-full bg-zinc-950 px-4 text-sm font-medium text-white transition hover:bg-zinc-800"
                >
                  Edit scene
                </Link>
                <EntityDeleteButton
                  entityLabel="scene"
                  entityTitle={scene.title}
                  onDelete={() =>
                    deleteEntityForProject(user?.uid ?? "", activeProjectId ?? "", "scenes", scene.id)
                  }
                  redirectHref="/scenes"
                />
              </>
            ) : null}
          </div>
        </div>
      </section>

      {!user ? (
        <StateCard tone="warning">
          Sign in first to view this scene.{" "}
          <Link href="/auth" className="font-medium underline">
            Go to auth
          </Link>
          .
        </StateCard>
      ) : loading ? (
        <StateCard tone="neutral">Loading scene details...</StateCard>
      ) : !activeProjectId || !activeProject ? (
        <StateCard tone="neutral">
          No active project selected. Choose one on the{" "}
          <Link href="/projects" className="font-medium underline">
            projects page
          </Link>
          .
        </StateCard>
      ) : error || !scene ? (
        <StateCard tone="error">{error ?? "Scene not found in the active project."}</StateCard>
      ) : (
        <>
          <EntityImageGallery
            uid={user.uid}
            projectId={activeProjectId}
            entityType="scenes"
            entityId={scene.id}
          />

          <SceneDetailSection title="Summary">
            <div className="space-y-3 text-sm leading-6 text-zinc-700">
              <p>{scene.summary || "No summary yet."}</p>
              <p>{scene.description || "No full description yet."}</p>
            </div>
          </SceneDetailSection>

          <SceneDetailSection title="Scene details">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <DetailItem label="Status" value={scene.status} />
              <DetailItem label="Scene number" value={formatOptionalNumber(scene.sceneNumber)} />
              <DetailItem label="Scene type" value={scene.sceneType} />
              <DetailItem label="Book ID" value={scene.bookId ?? "None"} />
              <DetailItem label="Chapter ID" value={scene.chapterId ?? "None"} />
              <DetailItem
                label="POV character ID"
                value={scene.pointOfViewCharacterId ?? "None"}
              />
              <DetailItem label="Canon level" value={scene.canonLevel} />
              <DetailItem label="Confidence" value={scene.confidence} />
              <DetailItem label="Slug" value={scene.slug} />
            </div>
          </SceneDetailSection>

          <SceneDetailSection title="Scene beats">
            <div className="grid gap-4 lg:grid-cols-3">
              <TextBlock label="Goal" value={scene.goal} empty="No scene goal recorded yet." />
              <TextBlock
                label="Conflict"
                value={scene.conflict}
                empty="No scene conflict recorded yet."
              />
              <TextBlock
                label="Outcome"
                value={scene.outcome}
                empty="No scene outcome recorded yet."
              />
            </div>
          </SceneDetailSection>

          <SceneDetailSection title="Links and references">
            <div className="grid gap-4 lg:grid-cols-2">
              <ListBlock label="Tags" values={scene.tags} />
              <ListBlock label="Timeline event IDs" values={scene.timelineEventIds} />
              <ListBlock label="Character IDs" values={scene.characterIds} />
              <ListBlock label="Location IDs" values={scene.locationIds} />
              <ListBlock label="Plot thread IDs" values={scene.plotThreadIds} />
            </div>
          </SceneDetailSection>

          <SceneDetailSection title="Draft text">
            <p className="whitespace-pre-wrap text-sm leading-6 text-zinc-700">
              {scene.textDraft || "No draft text stored yet."}
            </p>
          </SceneDetailSection>
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

function TextBlock({
  label,
  value,
  empty,
}: {
  label: string;
  value: string;
  empty: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
        {label}
      </p>
      <p className="mt-3 text-sm leading-6 text-zinc-700">{value || empty}</p>
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
