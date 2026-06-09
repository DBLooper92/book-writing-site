"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { useAuthUser } from "@/hooks/use-auth-user";
import { emitProjectsChanged, useUserProjects } from "@/hooks/use-user-projects";
import { setActiveProjectForUser } from "@/lib/data/projects";
import { buildTimelineCreateHref } from "@/lib/timeline/create-route";

const createLinks = [
  { href: "/books/new", label: "Book" },
  { href: "/chapters/new", label: "Chapter" },
  { href: "/scenes/new", label: "Scene" },
  { href: "/characters/new", label: "Character" },
  { href: "/relationships/new", label: "Relationship" },
  { href: "/factions/new", label: "Faction" },
  { href: "/cultures/new", label: "Culture" },
  { href: "/religions/new", label: "Religion" },
  { href: "/governments/new", label: "Government" },
  { href: "/organizations/new", label: "Organization" },
  { href: "/plot-threads/new", label: "Plot Thread" },
  { href: "/outlines/new", label: "Outline" },
  { href: "/glossary-terms/new", label: "Glossary Term" },
  { href: "/eras/new", label: "Era" },
  { href: "/themes/new", label: "Theme" },
  { href: "/languages/new", label: "Language" },
  { href: "/species/new", label: "Species" },
  { href: "/items/new", label: "Item" },
  { href: "/technologies/new", label: "Technology" },
  { href: "/locations/new", label: "Location" },
  { href: buildTimelineCreateHref(), label: "Timeline Event" },
  { href: "/notes/new", label: "Note" },
  { href: "/retcons/new", label: "Retcon" },
  { href: "/attachments/new", label: "Attachment" },
] as const;

type OpenMenu = "create" | "project" | null;

export function TopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { uid } = useAuthUser();
  const { projects, activeProjectId, activeProjectPath, loading } = useUserProjects(uid);
  const createButtonRef = useRef<HTMLButtonElement | null>(null);
  const createMenuRef = useRef<HTMLDivElement | null>(null);
  const projectButtonRef = useRef<HTMLButtonElement | null>(null);
  const projectMenuRef = useRef<HTMLDivElement | null>(null);
  const activeProject = useMemo(
    () => projects.find((project) => project.path === activeProjectPath) ?? null,
    [activeProjectPath, projects]
  );
  const [openMenu, setOpenMenu] = useState<OpenMenu>(null);
  const [working, setWorking] = useState(false);
  const [projectMenuError, setProjectMenuError] = useState<string | null>(null);

  useEffect(() => {
    setOpenMenu(null);
  }, [pathname]);

  useEffect(() => {
    if (!openMenu) {
      return;
    }

    const previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handlePointerDown(event: PointerEvent) {
      const target = event.target;

      if (!(target instanceof Node)) {
        setOpenMenu(null);
        return;
      }

      const activeMenuRef = openMenu === "create" ? createMenuRef : projectMenuRef;
      const activeButtonRef = openMenu === "create" ? createButtonRef : projectButtonRef;
      const activeMenuNode = activeMenuRef.current;
      const activeButtonNode = activeButtonRef.current;

      if (activeMenuNode?.contains(target) || activeButtonNode?.contains(target)) {
        return;
      }

      setOpenMenu(null);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpenMenu(null);
      }
    }

    window.addEventListener("pointerdown", handlePointerDown, true);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      window.removeEventListener("pointerdown", handlePointerDown, true);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [openMenu]);

  async function handleOpenExistingProject() {
    setWorking(true);
    setProjectMenuError(null);

    try {
      const project = await window.bookBible.launcher.openExistingProject();

      if (project) {
        emitProjectsChanged();
        router.push("/timeline");
      }
    } catch (error) {
      setProjectMenuError(error instanceof Error ? error.message : "Unable to open that project.");
    } finally {
      setWorking(false);
      setOpenMenu(null);
    }
  }

  async function handleProjectChange(projectPath: string) {
    if (!uid || projectPath === activeProjectPath) {
      setOpenMenu(null);
      return;
    }

    setWorking(true);
    setProjectMenuError(null);

    try {
      await setActiveProjectForUser(uid, projectPath);
      emitProjectsChanged();
      router.push("/timeline");
    } catch (error) {
      setProjectMenuError(
        error instanceof Error ? error.message : "Unable to switch to that project."
      );
    } finally {
      setWorking(false);
      setOpenMenu(null);
    }
  }

  async function handleRevealProject() {
    try {
      await window.bookBible.launcher.revealProject(null);
      setOpenMenu(null);
    } catch (error) {
      setProjectMenuError(
        error instanceof Error ? error.message : "Unable to reveal the project folder."
      );
    }
  }

  async function handleCloseProject() {
    await window.bookBible.project.close();
    emitProjectsChanged();
    setOpenMenu(null);
    router.push("/");
  }

  return (
    <>
      {openMenu ? (
        <div
          aria-hidden="true"
          onClick={() => setOpenMenu(null)}
          className="fixed inset-0 z-30 bg-zinc-950/10 backdrop-blur-sm backdrop-saturate-75"
        />
      ) : null}
      <header className="fixed inset-x-0 top-0 z-40 border-b border-zinc-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-6 py-4">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-sm font-semibold uppercase tracking-[0.24em] text-zinc-500">
            Book Bible
          </Link>

          <nav className="hidden items-center gap-3 md:flex">
            <Link href="/project-overview" className={getNavButtonClass(isActivePath(pathname, "/project-overview"))}>
              Overview
            </Link>
            <Link href="/timeline" className={getNavButtonClass(isActivePath(pathname, "/timeline"))}>
              Timeline
            </Link>
            <Link href="/drafts" className={getNavButtonClass(isActivePath(pathname, "/drafts"))}>
              Drafts
            </Link>
            <Link href="/ai-jobs" className={getNavButtonClass(isActivePath(pathname, "/ai-jobs"))}>
              AI Jobs
            </Link>
            <Link href="/codex-setup" className={getNavButtonClass(isActivePath(pathname, "/codex-setup"))}>
              Codex Setup
            </Link>
            <Link href="/profile" className={getNavButtonClass(isActivePath(pathname, "/profile"))}>
              Profile
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <button
              ref={createButtonRef}
              type="button"
              disabled={!activeProjectId}
              onClick={() => setOpenMenu((current) => (current === "create" ? null : "create"))}
              className={getNavButtonClass(openMenu === "create" || isCreatePath(pathname))}
            >
              + Create
            </button>

            {openMenu === "create" ? (
              <div
                ref={createMenuRef}
                className="absolute right-0 top-[calc(100%+0.75rem)] z-40 w-72 rounded-3xl border border-zinc-200 bg-white p-2 shadow-xl"
              >
                <div className="max-h-[24rem] overflow-y-auto overscroll-contain">
                  {createLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`flex items-center justify-between rounded-2xl px-4 py-3 text-sm transition ${
                        isActivePath(pathname, link.href)
                          ? "bg-zinc-950 text-white"
                          : "text-zinc-700 hover:bg-zinc-100"
                      }`}
                    >
                      <span>{link.label}</span>
                      <span className="text-[10px] uppercase tracking-[0.18em] text-current/60">
                        new
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <div className="relative">
            <button
              ref={projectButtonRef}
              type="button"
              onClick={() => {
                setProjectMenuError(null);
                setOpenMenu((current) => (current === "project" ? null : "project"));
              }}
              className={getNavButtonClass(openMenu === "project")}
            >
              <span className="max-w-[12rem] truncate">{activeProject?.title ?? "Launcher"}</span>
            </button>

            {openMenu === "project" ? (
              <div
                ref={projectMenuRef}
                className="absolute right-0 top-[calc(100%+0.75rem)] z-40 flex max-h-[calc(100vh-6rem)] w-80 flex-col overflow-hidden rounded-3xl border border-zinc-200 bg-white p-2 shadow-xl"
              >
                <div className="shrink-0">
                  <Link
                    href="/profile"
                    className="flex w-full rounded-2xl px-4 py-3 text-left text-sm text-zinc-700 transition hover:bg-zinc-100"
                  >
                    Profile
                  </Link>

                  <button
                    type="button"
                    onClick={() => void handleOpenExistingProject()}
                    disabled={working}
                    className="flex w-full rounded-2xl px-4 py-3 text-left text-sm text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Open Existing Project
                  </button>

                  {activeProjectId ? (
                    <>
                      <button
                        type="button"
                        onClick={() => void handleRevealProject()}
                        className="flex w-full rounded-2xl px-4 py-3 text-left text-sm text-zinc-700 transition hover:bg-zinc-100"
                      >
                        Reveal In Explorer
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleCloseProject()}
                        className="flex w-full rounded-2xl px-4 py-3 text-left text-sm text-zinc-700 transition hover:bg-zinc-100"
                      >
                        Close Project
                      </button>
                    </>
                  ) : null}
                </div>

                <div className="mt-2 flex min-h-0 flex-1 flex-col border-t border-zinc-200 pt-2">
                  <p className="shrink-0 px-4 pb-2 text-[10px] font-medium uppercase tracking-[0.18em] text-zinc-500">
                    Recent Projects
                  </p>
                  <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
                    {loading ? (
                      <div className="rounded-2xl px-4 py-3 text-sm text-zinc-500">
                        Loading projects...
                      </div>
                    ) : projects.length === 0 ? (
                      <div className="rounded-2xl px-4 py-3 text-sm text-zinc-500">
                        No local projects yet.
                      </div>
                    ) : (
                      projects.map((project) => {
                        const isActiveProject = project.path === activeProjectPath;

                        return (
                          <button
                            key={project.path}
                            type="button"
                            disabled={working}
                            onClick={() => void handleProjectChange(project.path)}
                            className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm transition ${
                              isActiveProject
                                ? "bg-zinc-950 text-white"
                                : "text-zinc-700 hover:bg-zinc-100"
                            } disabled:cursor-not-allowed disabled:opacity-60`}
                          >
                            <span className="min-w-0">
                              <span className="block truncate font-medium">{project.title}</span>
                              <span className="block truncate text-xs uppercase tracking-[0.16em] text-current/60">
                                {project.id}
                              </span>
                            </span>
                            {isActiveProject ? (
                              <span className="rounded-full bg-white/12 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-current">
                                Active
                              </span>
                            ) : null}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>

                {projectMenuError ? (
                  <p className="mt-2 shrink-0 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
                    {projectMenuError}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </div>
      </header>
    </>
  );
}

function isCreatePath(pathname: string) {
  return createLinks.some((link) => isActivePath(pathname, link.href));
}

function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function getNavButtonClass(active: boolean) {
  return `inline-flex h-11 items-center rounded-full px-4 text-sm font-medium transition ${
    active
      ? "bg-zinc-950 text-white"
      : "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
  }`;
}
