"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

type SliceNavigationConfig = {
  href: string;
  key: string;
  label: string;
  matchPath: (pathname: string) => boolean;
};

const SLICE_NAVIGATION_CONFIG: SliceNavigationConfig[] = [
  { key: "project-overview", label: "Project Overview", href: "/project-overview", matchPath: matchesSlicePath("/project-overview") },
  { key: "timeline", label: "Timeline", href: "/timeline", matchPath: matchesSlicePath("/timeline") },
  { key: "drafts", label: "Drafts", href: "/drafts", matchPath: matchesSlicePath("/drafts") },
  { key: "ai-jobs", label: "AI Jobs", href: "/ai-jobs", matchPath: matchesSlicePath("/ai-jobs") },
  { key: "codex-setup", label: "Codex Setup", href: "/codex-setup", matchPath: matchesSlicePath("/codex-setup") },
  { key: "books", label: "Books", href: "/books", matchPath: matchesSlicePath("/books") },
  { key: "chapters", label: "Chapters", href: "/chapters", matchPath: matchesSlicePath("/chapters") },
  { key: "scenes", label: "Scenes", href: "/scenes", matchPath: matchesSlicePath("/scenes") },
  { key: "characters", label: "Characters", href: "/characters", matchPath: matchesSlicePath("/characters") },
  { key: "relationships", label: "Relationships", href: "/relationships", matchPath: matchesSlicePath("/relationships") },
  { key: "factions", label: "Factions", href: "/factions", matchPath: matchesSlicePath("/factions") },
  { key: "cultures", label: "Cultures", href: "/cultures", matchPath: matchesSlicePath("/cultures") },
  { key: "religions", label: "Religions", href: "/religions", matchPath: matchesSlicePath("/religions") },
  { key: "governments", label: "Governments", href: "/governments", matchPath: matchesSlicePath("/governments") },
  { key: "organizations", label: "Organizations", href: "/organizations", matchPath: matchesSlicePath("/organizations") },
  { key: "plot-threads", label: "Plot Threads", href: "/plot-threads", matchPath: matchesSlicePath("/plot-threads") },
  { key: "outlines", label: "Outlines", href: "/outlines", matchPath: matchesSlicePath("/outlines") },
  { key: "glossary-terms", label: "Glossary Terms", href: "/glossary-terms", matchPath: matchesSlicePath("/glossary-terms") },
  { key: "eras", label: "Eras", href: "/eras", matchPath: matchesSlicePath("/eras") },
  { key: "themes", label: "Themes", href: "/themes", matchPath: matchesSlicePath("/themes") },
  { key: "languages", label: "Languages", href: "/languages", matchPath: matchesSlicePath("/languages") },
  { key: "species", label: "Species", href: "/species", matchPath: matchesSlicePath("/species") },
  { key: "items", label: "Items", href: "/items", matchPath: matchesSlicePath("/items") },
  { key: "technologies", label: "Technologies", href: "/technologies", matchPath: matchesSlicePath("/technologies") },
  { key: "locations", label: "Locations", href: "/locations", matchPath: matchesSlicePath("/locations") },
  { key: "timeline-events", label: "Timeline Events", href: "/timeline-events", matchPath: matchesSlicePath("/timeline-events") },
  { key: "notes", label: "Notes", href: "/notes", matchPath: matchesSlicePath("/notes") },
  { key: "retcons", label: "Retcons", href: "/retcons", matchPath: matchesSlicePath("/retcons") },
  { key: "attachments", label: "Attachments", href: "/attachments", matchPath: matchesSlicePath("/attachments") },
];

export function getActiveSliceNavigationConfig(pathname: string) {
  return (
    SLICE_NAVIGATION_CONFIG.find((config) => config.matchPath(pathname)) ?? null
  );
}

export function SliceSidebar({ pathname }: { pathname: string }) {
  const activeConfig = getActiveSliceNavigationConfig(pathname);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const activeLinkRef = useRef<HTMLAnchorElement | null>(null);

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    const activeLink = activeLinkRef.current;

    if (!scrollContainer || !activeLink) {
      return;
    }

    const scrollTop =
      activeLink.offsetTop -
      scrollContainer.clientHeight / 2 +
      activeLink.clientHeight / 2;

    scrollContainer.scrollTo({
      top: Math.max(0, scrollTop),
      behavior: "auto",
    });
  }, [activeConfig?.key]);

  return (
    <aside className="border-b border-zinc-200 bg-white xl:h-full xl:overflow-hidden xl:border-b-0 xl:border-r">
      <div ref={scrollContainerRef} className="h-full xl:overflow-y-auto">
        <div className="border-b border-zinc-200 px-5 py-6 sm:px-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
            Workspace
          </p>
          <p className="mt-3 text-sm leading-6 text-zinc-600">
            The desktop app keeps the timeline workspace, slice pages, and review-first Drafts flow inside one local project shell.
          </p>
        </div>

        <nav className="grid gap-1 p-4">
          {SLICE_NAVIGATION_CONFIG.map((config) => {
            const isActive = activeConfig?.key === config.key;

            return (
              <Link
                key={config.key}
                ref={isActive ? activeLinkRef : undefined}
                href={config.href}
                scroll={false}
                aria-current={isActive ? "page" : undefined}
                className={`rounded-2xl px-4 py-3 text-sm transition ${
                  isActive
                    ? "bg-zinc-950 text-white"
                    : "text-zinc-700 hover:bg-zinc-100"
                }`}
              >
                {config.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}

function matchesSlicePath(basePath: string) {
  return (pathname: string) => pathname === basePath || pathname.startsWith(`${basePath}/`);
}
