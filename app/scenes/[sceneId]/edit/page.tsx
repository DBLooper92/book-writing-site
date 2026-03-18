"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import type { ReactNode } from "react";

import { PageShell } from "@/components/layout/page-shell";
import { SceneForm } from "@/components/scenes/scene-form";
import { useScene } from "@/hooks/use-scene";
import { updateSceneForProject } from "@/lib/firebase/scenes";
import { sceneToFormValues, type NormalizedSceneFormValues } from "@/types/scene";

export default function EditScenePage() {
  const params = useParams<{ sceneId: string }>();
  const router = useRouter();
  const sceneId = typeof params.sceneId === "string" ? params.sceneId : null;
  const { scene, loading, error, user, uid, activeProjectId, activeProject } =
    useScene(sceneId);

  async function handleUpdateScene(values: NormalizedSceneFormValues) {
    if (!uid || !activeProjectId || !sceneId) {
      throw new Error("Scene context is missing.");
    }

    await updateSceneForProject(uid, activeProjectId, sceneId, values);
    router.push(`/scenes/${sceneId}`);
  }

  return (
    <PageShell
      eyebrow="Scenes"
      title={scene ? `Edit ${scene.title}` : "Edit scene"}
      description="Update the first set of structured scene fields and write the changes back to the currently active project's nested scene document."
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
              href="/scenes"
              className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-200 px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
            >
              Back to scenes
            </Link>
            {sceneId ? (
              <Link
                href={`/scenes/${sceneId}`}
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
          Sign in first to edit scenes.{" "}
          <Link href="/auth" className="font-medium underline">
            Go to auth
          </Link>
          .
        </StateCard>
      ) : loading ? (
        <StateCard tone="neutral">Loading scene data...</StateCard>
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
        <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <SceneForm
            initialValues={sceneToFormValues(scene)}
            submitLabel="Save changes"
            onSubmit={handleUpdateScene}
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
