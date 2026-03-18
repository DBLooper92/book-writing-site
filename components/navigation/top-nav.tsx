"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { ProjectSelect } from "@/components/projects/project-select";
import { useAuthUser } from "@/hooks/use-auth-user";
import { useUserProjects } from "@/hooks/use-user-projects";
import { setActiveProjectForUser } from "@/lib/firebase/projects";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/firebase-test", label: "Firebase Test" },
  { href: "/dev/setup", label: "Dev Setup" },
  { href: "/books", label: "Books" },
  { href: "/chapters", label: "Chapters" },
  { href: "/characters", label: "Characters" },
  { href: "/locations", label: "Locations" },
  { href: "/timeline", label: "Timeline" },
  { href: "/notes", label: "Notes" },
  { href: "/projects", label: "Projects" },
] as const;

export function TopNav() {
  const pathname = usePathname();
  const { user, loading, uid } = useAuthUser();
  const { projects, activeProjectId, loading: projectsLoading } = useUserProjects(uid);
  const [switchingProject, setSwitchingProject] = useState(false);

  async function handleProjectChange(projectId: string) {
    if (!uid || !projectId) {
      return;
    }

    setSwitchingProject(true);

    try {
      await setActiveProjectForUser(uid, projectId);
    } finally {
      setSwitchingProject(false);
    }
  }

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-6 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <Link
            href="/"
            className="text-sm font-semibold uppercase tracking-[0.26em] text-zinc-900"
          >
            BookWritingSite
          </Link>
          <nav className="flex flex-wrap gap-2">
            {navLinks.map((link) => {
              const active = isActivePath(pathname, link.href);

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`inline-flex h-10 items-center justify-center rounded-full px-4 text-sm font-medium transition ${
                    active
                      ? "bg-zinc-950 text-white"
                      : "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          {user ? (
            <ProjectSelect
              compact
              label="Project"
              projects={projects}
              activeProjectId={activeProjectId}
              loading={projectsLoading}
              disabled={switchingProject}
              onChange={handleProjectChange}
            />
          ) : null}
          <div className="rounded-full border border-zinc-200 bg-zinc-50 px-4 py-2 text-xs text-zinc-600">
            {loading ? (
              "Auth loading..."
            ) : user ? (
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span>{user.email ?? uid}</span>
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-zinc-300" />
                <span>Not signed in</span>
              </span>
            )}
          </div>
          <Link
            href="/auth"
            className="inline-flex h-10 items-center justify-center rounded-full border border-zinc-200 px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
          >
            Auth
          </Link>
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
