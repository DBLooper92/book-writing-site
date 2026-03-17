"use client";

import { useEffect, useState } from "react";

import { PageShell } from "@/components/layout/page-shell";
import { ProjectSelect } from "@/components/projects/project-select";
import { useAuthUser } from "@/hooks/use-auth-user";
import { useUserProjects } from "@/hooks/use-user-projects";
import {
  createProjectForUser,
  renameProjectForUser,
  setActiveProjectForUser,
} from "@/lib/firebase/projects";

type Notice =
  | { tone: "neutral"; text: string }
  | { tone: "success"; text: string }
  | { tone: "error"; text: string };

const defaultNotice: Notice = {
  tone: "neutral",
  text: "Create new projects here, rename existing ones, and choose which project is active in the header.",
};

export default function ProjectsPage() {
  const { user, uid, loading: authLoading } = useAuthUser();
  const { projects, activeProjectId, loading: projectsLoading } = useUserProjects(uid);
  const [newProjectTitle, setNewProjectTitle] = useState("");
  const [draftNames, setDraftNames] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<Notice>(defaultNotice);
  const [creating, setCreating] = useState(false);
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

  async function handleCreateProject(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!user) {
      setNotice({
        tone: "error",
        text: "Sign in before creating a project.",
      });
      return;
    }

    setCreating(true);
    setNotice({
      tone: "neutral",
      text: "Creating project...",
    });

    try {
      const projectId = await createProjectForUser(
        {
          uid: user.uid,
          email: user.email ?? null,
          displayName: user.displayName ?? null,
        },
        newProjectTitle
      );

      setNewProjectTitle("");
      setNotice({
        tone: "success",
        text: `Created project ${projectId} and made it active.`,
      });
    } catch (error) {
      setNotice({
        tone: "error",
        text: error instanceof Error ? error.message : "Unable to create project.",
      });
    } finally {
      setCreating(false);
    }
  }

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
      description="Projects live under users/{uid}/projects/{projectId}. Use this screen to create new projects, rename them, and choose which project should be active in the header selector."
    >
      <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold tracking-tight text-zinc-950">
            Project selection
          </h2>
          <p className="mt-2 text-sm leading-6 text-zinc-600">
            The header now uses the same active project value stored on your user
            document, so selecting a project here updates the dropdown there too.
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
          <h2 className="text-lg font-semibold tracking-tight text-zinc-950">
            Create a new project
          </h2>
          <p className="mt-2 text-sm leading-6 text-zinc-600">
            New projects are created inside your user document. The new project is
            automatically set as active after creation.
          </p>

          <form className="mt-4 space-y-4" onSubmit={handleCreateProject}>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-zinc-700">
                Project name
              </span>
              <input
                value={newProjectTitle}
                onChange={(event) => setNewProjectTitle(event.target.value)}
                placeholder="Example: Book Two Outline"
                disabled={!user || creating}
                className="h-12 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-sm text-zinc-950 outline-none transition focus:border-zinc-400 disabled:cursor-not-allowed disabled:bg-zinc-100"
              />
            </label>

            <button
              type="submit"
              disabled={!user || creating || !newProjectTitle.trim()}
              className="inline-flex h-12 items-center justify-center rounded-full bg-zinc-950 px-5 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-300"
            >
              {creating ? "Creating..." : "Create project"}
            </button>
          </form>
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
            No projects found yet. Create one above, or run the dev initializer to
            seed the default story-bible project.
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
