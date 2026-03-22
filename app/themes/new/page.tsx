"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

import { PageShell } from "@/components/layout/page-shell";
import { ThemeForm } from "@/components/themes/theme-form";
import { useActiveProject } from "@/hooks/use-active-project";
import { createThemeForProject } from "@/lib/data/themes";
import type { NormalizedThemeFormValues } from "@/types/theme";

export default function NewThemePage() {
  const router = useRouter();
  const { user, uid, activeProjectId, activeProject, loading } = useActiveProject();

  async function handleCreateTheme(values: NormalizedThemeFormValues) {
    if (!uid || !activeProjectId) {
      throw new Error("Select an active project before creating a theme.");
    }

    const themeId = await createThemeForProject(uid, activeProjectId, values);
    router.push(`/themes/${themeId}`);
  }

  return (
    <PageShell
      eyebrow="Themes"
      title="Create theme"
      description="Start a new theme inside the currently active project. This initial form is intentionally small but it writes into the full project-scoped theme document shape."
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
                : "A project must be active before theme creation can continue."}
            </p>
          </div>

          <Link
            href="/themes"
            className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-200 px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
          >
            Back to themes
          </Link>
        </div>
      </section>

      {!user ? (
        <StateCard tone="warning">
          Sign in first to create themes.{" "}
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
          <ThemeForm submitLabel="Create theme" onSubmit={handleCreateTheme} />
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
