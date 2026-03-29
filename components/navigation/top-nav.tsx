"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { useAuthUser } from "@/hooks/use-auth-user";
import { emitProjectsChanged, useUserProjects } from "@/hooks/use-user-projects";
import { rememberLastAppRoute } from "@/lib/navigation/last-app-route";
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
  { href: "/plot-threads/new", label: "Plot thread" },
  { href: "/outlines/new", label: "Outline" },
  { href: "/glossary-terms/new", label: "Glossary term" },
  { href: "/eras/new", label: "Era" },
  { href: "/themes/new", label: "Theme" },
  { href: "/languages/new", label: "Language" },
  { href: "/species/new", label: "Species" },
  { href: "/items/new", label: "Item" },
  { href: "/technologies/new", label: "Technology" },
  { href: "/locations/new", label: "Location" },
  { href: buildTimelineCreateHref(), label: "Timeline event" },
  { href: "/notes/new", label: "Note" },
  { href: "/retcons/new", label: "Retcon" },
  { href: "/attachments/new", label: "Attachment" },
  { href: "/ai-sessions/brain-dump", label: "Brain dump" },
  { href: "/ai-sessions/new", label: "AI session" },
] as const;

type OpenMenu = "create" | "project" | null;

export function TopNav() {
  const pathname = usePathname();
  const { user, uid } = useAuthUser();
  const { projects, activeProjectId, loading: projectsLoading } = useUserProjects(uid);
  const activeProject = useMemo(
    () => projects.find((project) => project.id === activeProjectId) ?? null,
    [activeProjectId, projects]
  );
  const [openMenu, setOpenMenu] = useState<OpenMenu>(null);
  const [switchingProject, setSwitchingProject] = useState(false);
  const [projectMenuError, setProjectMenuError] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(true);
  const menuContainerRef = useRef<HTMLDivElement>(null);
  const lastScrollYRef = useRef(0);

  useEffect(() => {
    setOpenMenu(null);
  }, [pathname]);

  useEffect(() => {
    rememberLastAppRoute({
      uid,
      activeProjectId,
      pathname,
    });
  }, [activeProjectId, pathname, uid]);

  useEffect(() => {
    if (!openMenu) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (
        menuContainerRef.current &&
        !menuContainerRef.current.contains(event.target as Node)
      ) {
        setOpenMenu(null);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpenMenu(null);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [openMenu]);

  useEffect(() => {
    lastScrollYRef.current = window.scrollY;

    function handleScroll() {
      const currentScrollY = window.scrollY;
      const delta = currentScrollY - lastScrollYRef.current;

      if (currentScrollY <= 16) {
        setIsVisible(true);
        lastScrollYRef.current = currentScrollY;
        return;
      }

      if (Math.abs(delta) < 8) {
        return;
      }

      setIsVisible(delta < 0);
      lastScrollYRef.current = currentScrollY;
    }

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  async function handleProjectChange(projectId: string) {
    if (!uid || !projectId || projectId === activeProjectId) {
      setOpenMenu(null);
      return;
    }

    setSwitchingProject(true);
    setProjectMenuError(null);

    try {
      await setActiveProjectForUser(uid, projectId);
      emitProjectsChanged();
      setOpenMenu(null);
    } catch (error) {
      setProjectMenuError(
        error instanceof Error ? error.message : "Unable to switch projects."
      );
    } finally {
      setSwitchingProject(false);
    }
  }

  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 transition-transform duration-300 ${
        isVisible ? "translate-y-0" : "-translate-y-full"
      }`}
    >
      <div className="border-b border-zinc-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl justify-end px-6 py-4">
          <div ref={menuContainerRef} className="flex flex-wrap justify-end gap-3">
            <Link
              href="/timeline"
              className={getNavButtonClass(isTimelinePath(pathname))}
            >
              Timeline
            </Link>

            <div className="relative">
              <button
                type="button"
                aria-expanded={openMenu === "create"}
                onClick={() =>
                  setOpenMenu((current) => (current === "create" ? null : "create"))
                }
                className={getNavButtonClass(
                  openMenu === "create" || isCreatePath(pathname)
                )}
              >
                <span>+Create</span>
                <span className="text-[10px] uppercase tracking-[0.2em] text-current/70">
                  v
                </span>
              </button>

              {openMenu === "create" ? (
                <div className="absolute right-0 top-[calc(100%+0.75rem)] w-72 rounded-3xl border border-zinc-200 bg-white p-2 shadow-xl">
                  <div className="max-h-[24rem] overflow-y-auto">
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
                type="button"
                aria-expanded={openMenu === "project"}
                onClick={() => {
                  setProjectMenuError(null);
                  setOpenMenu((current) => (current === "project" ? null : "project"));
                }}
                className={getNavButtonClass(
                  openMenu === "project" || isActivePath(pathname, "/projects")
                )}
              >
                <span className="max-w-[12rem] truncate">
                  {activeProject?.title || "Project"}
                </span>
                <span className="text-[10px] uppercase tracking-[0.2em] text-current/70">
                  v
                </span>
              </button>

              {openMenu === "project" ? (
                <div className="absolute right-0 top-[calc(100%+0.75rem)] w-80 rounded-3xl border border-zinc-200 bg-white p-2 shadow-xl">
                  {!user ? (
                    <div className="rounded-2xl bg-zinc-50 px-4 py-4 text-sm leading-6 text-zinc-600">
                      Sign in to switch projects or create a new one.
                    </div>
                  ) : projectsLoading ? (
                    <div className="rounded-2xl bg-zinc-50 px-4 py-4 text-sm leading-6 text-zinc-600">
                      Loading projects...
                    </div>
                  ) : projects.length === 0 ? (
                    <div className="space-y-2">
                      <div className="rounded-2xl bg-zinc-50 px-4 py-4 text-sm leading-6 text-zinc-600">
                        No projects found for this account yet.
                      </div>
                      <Link href="/projects/new" className="flex rounded-2xl px-4 py-3 text-sm text-zinc-700 transition hover:bg-zinc-100">
                        Create new project
                      </Link>
                    </div>
                  ) : (
                    <>
                      <div className="max-h-[20rem] overflow-y-auto">
                        {projects.map((project) => {
                          const isActiveProject = project.id === activeProjectId;

                          return (
                            <button
                              key={project.id}
                              type="button"
                              disabled={switchingProject}
                              onClick={() => handleProjectChange(project.id)}
                              className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm transition ${
                                isActiveProject
                                  ? "bg-zinc-950 text-white"
                                  : "text-zinc-700 hover:bg-zinc-100"
                              } disabled:cursor-not-allowed disabled:opacity-60`}
                            >
                              <span className="min-w-0">
                                <span className="block truncate font-medium">
                                  {project.title}
                                </span>
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
                        })}
                      </div>

                      <div className="mt-2 border-t border-zinc-200 pt-2">
                        <Link
                          href="/projects/new"
                          className="flex rounded-2xl px-4 py-3 text-sm text-zinc-700 transition hover:bg-zinc-100"
                        >
                          Create new project
                        </Link>
                      </div>
                    </>
                  )}

                  {projectMenuError ? (
                    <p className="mt-2 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
                      {projectMenuError}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

function isActivePath(pathname: string, href: string) {
  if (href === "/") {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function isCreatePath(pathname: string) {
  return createLinks.some((link) => isActivePath(pathname, link.href));
}

function isTimelinePath(pathname: string) {
  return isActivePath(pathname, "/timeline");
}

function getNavButtonClass(active: boolean) {
  return `inline-flex h-11 items-center gap-2 rounded-full px-4 text-sm font-medium transition ${
    active
      ? "bg-zinc-950 text-white"
      : "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
  }`;
}
