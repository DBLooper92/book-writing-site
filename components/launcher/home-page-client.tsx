"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

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

export function HomePageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectNameInputRef = useRef<HTMLInputElement | null>(null);
  const [state, setState] = useState<LauncherState>({
    currentProject: null,
    error: null,
    loading: true,
    projectName: "",
    recentProjects: [],
    working: false,
  });
  const shouldFocusNewProject = searchParams.get("newProject") === "1";

  useEffect(() => {
    if (!shouldFocusNewProject) {
      return;
    }

    projectNameInputRef.current?.focus();
  }, [shouldFocusNewProject]);

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
      const openedProject = await window.bookBible.launcher.openExistingProject();

      if (openedProject) {
        emitProjectsChanged();
        await refreshLauncher();
        router.push("/timeline");
      }
    } catch (error) {
      setState((current) => ({
        ...current,
        error: error instanceof Error ? error.message : "Unable to open a project.",
      }));
    } finally {
      setState((current) => ({
        ...current,
        working: false,
      }));
    }
  }

  async function handleOpenRecentProject(projectPath: string) {
    setState((current) => ({
      ...current,
      error: null,
      working: true,
    }));

    try {
      const openedProject = await window.bookBible.launcher.openProjectAtPath(projectPath);

      if (openedProject) {
        emitProjectsChanged();
        await refreshLauncher();
        router.push("/timeline");
      }
    } catch (error) {
      setState((current) => ({
        ...current,
        error: error instanceof Error ? error.message : "Unable to open that recent project.",
      }));
    } finally {
      setState((current) => ({
        ...current,
        working: false,
      }));
    }
  }

  async function handleRevealCurrentProject() {
    if (!state.currentProject) {
      setState((current) => ({
        ...current,
        error: "No current project is open to reveal.",
      }));
      return;
    }

    try {
      await window.bookBible.launcher.revealProject(state.currentProject.path);
    } catch (error) {
      setState((current) => ({
        ...current,
        error:
          error instanceof Error ? error.message : "Unable to reveal the current project folder.",
      }));
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
      <section className="rounded-[2rem] border border-zinc-200 bg-white/92 p-6 shadow-[0_24px_80px_-48px_rgba(24,24,27,0.45)] backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-zinc-500">
              Desktop Launcher
            </p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-zinc-950">
              Book Bible Desktop
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-600">
              Open a local writing project, create a new one under your Documents folder, or jump
              back into the current workspace at timeline.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/timeline"
              className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-200 px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
            >
              Open Timeline
            </Link>
            <button
              type="button"
              onClick={() => void handleRevealCurrentProject()}
              className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-200 px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
            >
              Reveal Current Project Folder
            </button>
          </div>
        </div>
      </section>

      {state.error ? (
        <section className="rounded-3xl border border-red-200 bg-red-50 px-5 py-4 text-sm leading-6 text-red-800">
          {state.error}
        </section>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <div className="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-[0_24px_80px_-56px_rgba(24,24,27,0.45)]">
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.22em] text-zinc-500">
                Create Project
              </p>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <input
                  ref={projectNameInputRef}
                  value={state.projectName}
                  onChange={(event) =>
                    setState((current) => ({
                      ...current,
                      projectName: event.target.value,
                    }))
                  }
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void handleCreateProject();
                    }
                  }}
                  placeholder="Project title"
                  className="h-12 flex-1 rounded-full border border-zinc-200 bg-zinc-50 px-5 text-sm text-zinc-950 outline-none transition focus:border-zinc-400 focus:bg-white"
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
            </div>

            <button
              type="button"
              onClick={() => void handleOpenExistingProject()}
              disabled={state.working}
              className="inline-flex h-11 w-fit items-center justify-center rounded-full border border-zinc-200 px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Open Existing Project
            </button>
          </div>
        </div>

        <div className="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-[0_24px_80px_-56px_rgba(24,24,27,0.45)]">
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-zinc-500">
            Current Project
          </p>
          <div className="mt-4 space-y-4">
            {state.loading ? (
              <p className="text-sm leading-6 text-zinc-600">Loading current project...</p>
            ) : state.currentProject ? (
              <div>
                <h2 className="text-2xl font-semibold tracking-tight text-zinc-950">
                  {state.currentProject.title}
                </h2>
                <p className="mt-2 break-all text-sm leading-6 text-zinc-600">
                  {state.currentProject.path}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void handleRevealCurrentProject()}
                    className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-200 px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
                  >
                    Reveal In Explorer
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-sm leading-6 text-zinc-600">
                No local project is open right now.
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-[0_24px_80px_-56px_rgba(24,24,27,0.45)]">
        <p className="text-xs font-medium uppercase tracking-[0.22em] text-zinc-500">
          Recent Projects
        </p>
        <div className="mt-4">
          {state.loading ? (
            <p className="text-sm leading-6 text-zinc-600">Loading recent projects...</p>
          ) : state.recentProjects.length === 0 ? (
            <p className="text-sm leading-6 text-zinc-600">No desktop projects have been opened yet.</p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {state.recentProjects.map((project) => (
                <button
                  key={project.path}
                  type="button"
                  onClick={() => void handleOpenRecentProject(project.path)}
                  disabled={state.working}
                  className="rounded-[1.5rem] border border-zinc-200 bg-zinc-50 px-4 py-4 text-left transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-base font-semibold text-zinc-950">
                        {project.title}
                      </p>
                      <p className="mt-2 truncate text-xs uppercase tracking-[0.16em] text-zinc-500">
                        {project.path}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-zinc-950 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-white">
                      {project.missing ? "Missing" : "Open"}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
