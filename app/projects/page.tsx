"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { PageShell } from "@/components/layout/page-shell";
import { ProjectSelect } from "@/components/projects/project-select";
import { useAuthUser } from "@/hooks/use-auth-user";
import { useUserProjects } from "@/hooks/use-user-projects";
import {
  renameProjectForUser,
  setActiveProjectForUser,
} from "@/lib/data/projects";
import { emitProjectsChanged } from "@/hooks/use-user-projects";

type Notice =
  | { tone: "neutral"; text: string }
  | { tone: "success"; text: string }
  | { tone: "error"; text: string };

const defaultNotice: Notice = {
  tone: "neutral",
  text: "Switch the active project here, rename the current one, and use the dedicated create screen when you need a new project.",
};

export default function ProjectsPage() {
  const { user, uid, loading: authLoading } = useAuthUser();
  const { projects, activeProjectId, loading: projectsLoading } = useUserProjects(uid);
  const [draftNames, setDraftNames] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<Notice>(defaultNotice);
  const [savingProjectId, setSavingProjectId] = useState<string | null>(null);
  const [switchingProject, setSwitchingProject] = useState(false);
  const activeProject =
    projects.find((project) => project.id === activeProjectId) ?? null;

  useEffect(() => {
    setDraftNames((current) => {
      const next = { ...current };
      const validIds = new Set(projects.map((project) => project.id));

      projects.forEach((project) => {
        if (!(project.id in next)) {
          next[project.id] = project.title;
        }
      });

      Object.keys(next).forEach((projectId) => {
        if (!validIds.has(projectId)) {
          delete next[projectId];
        }
      });

      return next;
    });
  }, [projects]);

  async function handleRenameProject(projectId: string) {
    if (!uid) {
      setNotice({
        tone: "error",
        text: "Sign in before renaming a project.",
      });
      return;
    }

    setSavingProjectId(projectId);
    setNotice({
      tone: "neutral",
      text: `Saving name for ${projectId}...`,
    });

    try {
      await renameProjectForUser(uid, projectId, draftNames[projectId] ?? "");
      emitProjectsChanged();
      setNotice({
        tone: "success",
        text: `Updated the name for ${projectId}.`,
      });
    } catch (error) {
      setNotice({
        tone: "error",
        text: error instanceof Error ? error.message : "Unable to rename project.",
      });
    } finally {
      setSavingProjectId(null);
    }
  }

  async function handleSelectProject(projectId: string) {
    if (!uid || !projectId) {
      return;
    }

    setSwitchingProject(true);
    setNotice({
      tone: "neutral",
      text: `Switching active project to ${projectId}...`,
    });

    try {
      await setActiveProjectForUser(uid, projectId);
      emitProjectsChanged();
      setNotice({
        tone: "success",
        text: `Active project is now ${projectId}.`,
      });
    } catch (error) {
      setNotice({
        tone: "error",
        text:
          error instanceof Error ? error.message : "Unable to switch active project.",
      });
    } finally {
      setSwitchingProject(false);
    }
  }

  return (
    <PageShell
      eyebrow="Projects"
      title="Project management"
      description="Use this screen to switch the active project, rename the current one, and review which project scope the rest of the app is reading from."
    >
      <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold tracking-tight text-zinc-950">
            Project selection
          </h2>
          <p className="mt-2 text-sm leading-6 text-zinc-600">
            The header now uses the same active project value stored on your profile,
            so selecting a project here updates the dropdown there too.
          </p>

          <div className="mt-4">
            <ProjectSelect
              projects={projects}
              activeProjectId={activeProjectId}
              loading={authLoading || projectsLoading}
              disabled={!user || switchingProject}
              onChange={handleSelectProject}
            />
          </div>
        </div>

        <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold tracking-tight text-zinc-950">New project</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-600">
            Project creation now has its own route so the header dropdown can send
            you to a dedicated screen without overloading this management page.
          </p>
          <div className="mt-4 rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 p-4">
            <p className="text-sm leading-6 text-zinc-600">
              Creating a project still writes the new record under your user scope
              and makes it active immediately.
            </p>
            <Link
              href="/projects/new"
              className="mt-4 inline-flex h-12 items-center justify-center rounded-full bg-zinc-950 px-5 text-sm font-medium text-white transition hover:bg-zinc-800"
            >
              Go to project create screen
            </Link>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-zinc-950">
              Active project details
            </h2>
            <p className="mt-2 text-sm leading-6 text-zinc-600">
              Edit only the active project here. Use the selector above to switch
              projects, then update the visible project name.
            </p>
          </div>
          <p className="text-sm text-zinc-500">
            {projects.length} project{projects.length === 1 ? "" : "s"}
          </p>
        </div>

        {!user ? (
          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">
            Sign in first to manage projects for your account.
          </div>
        ) : projects.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 p-4 text-sm leading-6 text-zinc-600">
            No projects found yet. Open the dedicated create screen, or run the
            dev initializer to seed the default story-bible project.
          </div>
        ) : !activeProject ? (
          <div className="mt-6 rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 p-4 text-sm leading-6 text-zinc-600">
            Select an active project above to edit its name and review its summary.
          </div>
        ) : (
          <div className="mt-6 rounded-3xl border border-zinc-200 bg-zinc-50 p-5">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-zinc-950">
                {activeProject.id}
              </p>
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
                Active
              </span>
            </div>

            <p className="mt-2 text-sm text-zinc-600">
              {activeProject.summary ?? "No summary yet."}
            </p>

            <div className="mt-4 flex flex-col gap-3 md:flex-row">
              <input
                value={draftNames[activeProject.id] ?? ""}
                onChange={(event) =>
                  setDraftNames((current) => ({
                    ...current,
                    [activeProject.id]: event.target.value,
                  }))
                }
                className="h-11 flex-1 rounded-2xl border border-zinc-200 bg-white px-4 text-sm text-zinc-950 outline-none transition focus:border-zinc-400"
              />
              <button
                type="button"
                onClick={() => handleRenameProject(activeProject.id)}
                disabled={
                  savingProjectId === activeProject.id ||
                  !draftNames[activeProject.id]?.trim()
                }
                className="inline-flex h-11 items-center justify-center rounded-full bg-zinc-950 px-5 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-300"
              >
                {savingProjectId === activeProject.id ? "Saving..." : "Save name"}
              </button>
            </div>
          </div>
        )}

        <div
          className={`mt-6 rounded-2xl px-4 py-3 text-sm leading-6 ${
            notice.tone === "success"
              ? "bg-emerald-50 text-emerald-800"
              : notice.tone === "error"
                ? "bg-red-50 text-red-800"
                : "bg-zinc-100 text-zinc-700"
          }`}
        >
          {notice.text}
        </div>
      </section>
    </PageShell>
  );
}

