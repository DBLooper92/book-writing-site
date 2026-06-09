"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { emitProjectsChanged } from "@/hooks/use-user-projects";
import type { DesktopCurrentProject, DesktopRecentProject } from "@/types/electron-api";

type LauncherState = {
  currentProject: DesktopCurrentProject | null;
  error: string | null;
  loading: boolean;
  projectName: string;
  recentProjects: DesktopRecentProject[];
  working: boolean;
};

export default function HomePage() {
  const router = useRouter();
  const [state, setState] = useState<LauncherState>({
    currentProject: null,
    error: null,
    loading: true,
    projectName: "",
    recentProjects: [],
    working: false,
  });

  useEffect(() => {
    let cancelled = false;
    const syncRefresh = () => {
      if (cancelled) {
        return;
      }

      try {
        const currentProject = window.bookBible?.project?.getCurrentSync?.() ?? null;
        const recentProjects = window.bookBible?.launcher?.listRecentProjectsSync?.() ?? [];

        setState((current) => ({
          ...current,
          currentProject,
          loading: false,
          recentProjects,
        }));
      } catch {
        // Keep the async path as the fallback if sync access is temporarily unavailable.
      }
    };

    async function loadLauncher() {
      try {
        const [recentProjects, currentProject] = await Promise.all([
          window.bookBible.launcher.listRecentProjects(),
          window.bookBible.project.getCurrent(),
        ]);

        if (cancelled) {
          return;
        }

        setState((current) => ({
          ...current,
          currentProject,
          error: null,
          loading: false,
          recentProjects,
        }));
      } catch (error) {
        if (cancelled) {
          return;
        }

        setState((current) => ({
          ...current,
          error: error instanceof Error ? error.message : "Unable to load desktop projects.",
          loading: false,
          recentProjects: [],
        }));
      }
    }

    syncRefresh();
    void loadLauncher();
    const unsubscribeProject = window.bookBible.project.subscribe(() => {
      syncRefresh();
      void loadLauncher();
    });

    return () => {
      cancelled = true;
      unsubscribeProject();
    };
  }, []);

  async function refreshLauncher() {
    const [recentProjects, currentProject] = await Promise.all([
      window.bookBible.launcher.listRecentProjects(),
      window.bookBible.project.getCurrent(),
    ]);

    setState((current) => ({
      ...current,
      currentProject,
      recentProjects,
    }));
  }

  async function handleCreateProject() {
    const title = state.projectName.trim();

    if (!title) {
      setState((current) => ({
        ...current,
        error: "Enter a project name first.",
      }));
      return;
    }

    setState((current) => ({
      ...current,
      error: null,
      working: true,
    }));

    try {
      await window.bookBible.launcher.createProject({
        title,
      });
      emitProjectsChanged();
      await refreshLauncher();
      router.push("/timeline");
    } catch (error) {
      setState((current) => ({
        ...current,
        error: error instanceof Error ? error.message : "Unable to create the project.",
      }));
    } finally {
      setState((current) => ({
        ...current,
        projectName: "",
        working: false,
      }));
    }
  }

  async function handleOpenExistingProject() {
    setState((current) => ({
      ...current,
      error: null,
      working: true,
    }));

    try {
      const project = await window.bookBible.launcher.openExistingProject();

      if (project) {
        emitProjectsChanged();
        await refreshLauncher();
        router.push("/timeline");
      }
    } catch (error) {
      setState((current) => ({
        ...current,
        error: error instanceof Error ? error.message : "Unable to open the selected project.",
      }));
    } finally {
      setState((current) => ({
        ...current,
        working: false,
      }));
    }
  }

  async function handleOpenRecent(projectPath: string) {
    setState((current) => ({
      ...current,
      error: null,
      working: true,
    }));

    try {
      await window.bookBible.launcher.openProjectAtPath(projectPath);
      emitProjectsChanged();
      await refreshLauncher();
      router.push("/timeline");
    } catch (error) {
      setState((current) => ({
        ...current,
        error: error instanceof Error ? error.message : "Unable to open that project.",
      }));
    } finally {
      setState((current) => ({
        ...current,
        working: false,
      }));
    }
  }

  async function handleReveal(projectPath?: string) {
    try {
      await window.bookBible.launcher.revealProject(projectPath ?? null);
    } catch (error) {
      setState((current) => ({
        ...current,
        error: error instanceof Error ? error.message : "Unable to reveal the project folder.",
      }));
    }
  }

  async function handleRemoveRecent(projectPath: string) {
    await window.bookBible.launcher.removeRecentProject(projectPath);
    emitProjectsChanged();
    await refreshLauncher();
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-10">
      <section className="rounded-[2rem] border border-zinc-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-medium uppercase tracking-[0.24em] text-zinc-500">
          Desktop Launcher
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-zinc-950">
          Book Bible Desktop
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-600">
          Open a local writing project, create a new one under your Documents folder, or jump
          back into the current workspace at timeline.
        </p>

        <div className="mt-8 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="rounded-[1.5rem] border border-zinc-200 bg-zinc-50 p-5">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-500">
              Create Project
            </p>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <input
                value={state.projectName}
                onChange={(event) =>
                  setState((current) => ({
                    ...current,
                    projectName: event.target.value,
                  }))
                }
                placeholder="Project title"
                className="h-12 flex-1 rounded-full border border-zinc-300 bg-white px-5 text-sm text-zinc-900 outline-none transition focus:border-zinc-500"
              />
              <button
                type="button"
                onClick={() => void handleCreateProject()}
                disabled={state.working}
                className="inline-flex h-12 items-center justify-center rounded-full bg-zinc-950 px-5 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Create Project
              </button>
            </div>
            <button
              type="button"
              onClick={() => void handleOpenExistingProject()}
              disabled={state.working}
              className="mt-3 inline-flex h-11 items-center justify-center rounded-full border border-zinc-200 px-4 text-sm font-medium text-zinc-700 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              Open Existing Project
            </button>
          </section>

          <section className="rounded-[1.5rem] border border-zinc-200 bg-zinc-50 p-5">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-500">
              Current Project
            </p>
            {state.currentProject ? (
              <div className="mt-4 space-y-4">
                <div>
                  <h2 className="text-xl font-semibold tracking-tight text-zinc-950">
                    {state.currentProject.title}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-zinc-600">
                    {state.currentProject.path}
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Link
                    href="/timeline"
                    className="inline-flex h-11 items-center justify-center rounded-full bg-zinc-950 px-4 text-sm font-medium text-white transition hover:bg-zinc-800"
                  >
                    Open Timeline
                  </Link>
                  <button
                    type="button"
                    onClick={() => void handleReveal(state.currentProject?.path)}
                    className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-200 px-4 text-sm font-medium text-zinc-700 transition hover:bg-white"
                  >
                    Reveal In Explorer
                  </button>
                </div>
              </div>
            ) : (
              <p className="mt-4 text-sm leading-6 text-zinc-600">
                No local project is open right now.
              </p>
            )}
          </section>
        </div>

        {state.error ? (
          <p className="mt-5 rounded-[1.25rem] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {state.error}
          </p>
        ) : null}
      </section>

      <section className="rounded-[2rem] border border-zinc-200 bg-white p-8 shadow-sm">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-zinc-500">
            Recent Projects
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-zinc-950">
            {state.loading
              ? "Loading..."
              : `${state.recentProjects.length} recent project${state.recentProjects.length === 1 ? "" : "s"}`}
          </h2>
        </div>

        {state.recentProjects.length === 0 ? (
          <div className="mt-6 rounded-[1.5rem] border border-dashed border-zinc-300 bg-zinc-50 px-5 py-6 text-sm leading-6 text-zinc-600">
            No desktop projects have been opened yet.
          </div>
        ) : (
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {state.recentProjects.map((project) => (
              <article
                key={project.path}
                className="rounded-[1.5rem] border border-zinc-200 bg-zinc-50 p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h3 className="truncate text-lg font-semibold tracking-tight text-zinc-950">
                      {project.title}
                    </h3>
                    <p className="mt-2 break-all text-sm leading-6 text-zinc-600">
                      {project.path}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-[10px] font-medium uppercase tracking-[0.18em] ${
                      project.missing
                        ? "bg-red-100 text-red-700"
                        : "bg-zinc-950 text-white"
                    }`}
                  >
                    {project.missing ? "Missing" : "Ready"}
                  </span>
                </div>

                <p className="mt-4 text-xs uppercase tracking-[0.18em] text-zinc-500">
                  Last opened {new Date(project.lastOpenedAt).toLocaleString()}
                </p>

                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => void handleOpenRecent(project.path)}
                    disabled={project.missing || state.working}
                    className="inline-flex h-11 items-center justify-center rounded-full bg-zinc-950 px-4 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Open
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleReveal(project.path)}
                    className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-200 px-4 text-sm font-medium text-zinc-700 transition hover:bg-white"
                  >
                    Reveal
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleRemoveRecent(project.path)}
                    className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-200 px-4 text-sm font-medium text-zinc-700 transition hover:bg-white"
                  >
                    Remove
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
