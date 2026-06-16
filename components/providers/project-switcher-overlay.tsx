"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { useAuthUser } from "@/hooks/use-auth-user";
import { useScrollLock } from "@/hooks/use-scroll-lock";
import { emitProjectsChanged, useUserProjects } from "@/hooks/use-user-projects";
import { setActiveProjectForUser } from "@/lib/data/projects";

export function ProjectSwitcherOverlay() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { uid } = useAuthUser();
  const { activeProjectPath, projects, loading } = useUserProjects(uid);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isOpen = searchParams.get("changeProject") === "1";
  useScrollLock(isOpen);

  useEffect(() => {
    if (!isOpen) {
      setWorking(false);
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  async function handleClose() {
    const nextSearchParams = new URLSearchParams(searchParams.toString());
    nextSearchParams.delete("changeProject");

    const nextPath = nextSearchParams.toString()
      ? `${pathname}?${nextSearchParams.toString()}`
      : pathname;

    router.replace(nextPath);
  }

  async function handleProjectSelect(projectPath: string) {
    if (!uid || working) {
      return;
    }

    setWorking(true);
    setError(null);

    try {
      await setActiveProjectForUser(uid, projectPath);
      emitProjectsChanged();
      router.push("/timeline");
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError.message : "Unable to switch to that project."
      );
    } finally {
      setWorking(false);
    }
  }

  return (
    <div
      aria-modal="true"
      role="dialog"
      className="fixed inset-0 z-50 flex items-center justify-center overscroll-contain bg-zinc-950/40 px-6 py-8 backdrop-blur-md"
      onClick={handleClose}
    >
      <div
        className="relative w-full max-w-4xl rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-[0_30px_80px_rgba(0,0,0,0.2)]"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={() => void handleClose()}
          className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full border border-zinc-200 text-zinc-500 transition hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-950"
          aria-label="Close project switcher"
        >
          ×
        </button>

        <div className="max-w-2xl">
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-zinc-500">
            Change Project
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-950">
            Select a local project
          </h2>
          <p className="mt-3 text-sm leading-6 text-zinc-600">
            Choose from the projects this install already knows about. The currently active project
            is highlighted.
          </p>
        </div>

        {error ? (
          <p className="mt-5 rounded-[1.25rem] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <div className="mt-6">
          {loading ? (
            <div className="rounded-[1.5rem] border border-zinc-200 bg-zinc-50 px-5 py-6 text-sm text-zinc-600">
              Loading projects...
            </div>
          ) : projects.length === 0 ? (
            <div className="rounded-[1.5rem] border border-dashed border-zinc-300 bg-zinc-50 px-5 py-6 text-sm leading-6 text-zinc-600">
              No local projects are attached yet. Use Open Project to add one.
            </div>
          ) : (
            <div className="grid max-h-[60vh] gap-3 overflow-y-auto pr-1 md:grid-cols-2">
              {projects.map((project) => {
                const isActiveProject = project.path === activeProjectPath;

                return (
                  <button
                    key={project.path}
                    type="button"
                    disabled={working || project.status === "missing"}
                    onClick={() => void handleProjectSelect(project.path)}
                    className={`rounded-[1.5rem] border px-4 py-4 text-left transition ${
                      isActiveProject
                        ? "border-zinc-950 bg-zinc-950 text-white"
                        : "border-zinc-200 bg-zinc-50 text-zinc-950 hover:bg-white"
                    } disabled:cursor-not-allowed disabled:opacity-60`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="truncate text-base font-semibold">{project.title}</div>
                        <div className="mt-2 truncate text-xs uppercase tracking-[0.16em] text-current/55">
                          {project.path}
                        </div>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2 py-1 text-[10px] uppercase tracking-[0.2em] ${
                          isActiveProject
                            ? "bg-white/12 text-current"
                            : "bg-zinc-200 text-zinc-600"
                        }`}
                      >
                        {isActiveProject ? "Current" : project.status === "missing" ? "Missing" : "Open"}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
