import Link from "next/link";

import { PageShell } from "@/components/layout/page-shell";

const quickLinks = [
  {
    href: "/books",
    title: "Books",
    description:
      "Inspect the first manuscript-structure slice with active-project book list, create, detail, and edit flows.",
  },
  {
    href: "/chapters",
    title: "Chapters",
    description:
      "Work one level below books with project-scoped chapter list, create, detail, and edit flows.",
  },
  {
    href: "/scenes",
    title: "Scenes",
    description:
      "Manage the scene layer beneath chapters with project-scoped list, create, detail, and edit flows.",
  },
  {
    href: "/relationships",
    title: "Relationships",
    description:
      "Track project-scoped cross-entity connections with list, create, detail, and edit flows for relationship records.",
  },
  {
    href: "/cultures",
    title: "Cultures",
    description:
      "Manage project-scoped culture records with list, create, detail, and edit flows that align with existing character, faction, and location references.",
  },
  {
    href: "/religions",
    title: "Religions",
    description:
      "Manage project-scoped religion records with list, create, detail, and edit flows that turn existing belief-system references into real canon data.",
  },
  {
    href: "/governments",
    title: "Governments",
    description:
      "Manage project-scoped government records with list, create, detail, and edit flows that turn existing civic-power references into real canon data.",
  },
  {
    href: "/organizations",
    title: "Organizations",
    description:
      "Manage project-scoped organization records with list, create, detail, and edit flows that turn existing institutional references into real canon data.",
  },
  {
    href: "/plot-threads",
    title: "Plot Threads",
    description:
      "Manage project-scoped plot-thread records with list, create, detail, and edit flows that turn existing narrative-thread references into real canon data.",
  },
  {
    href: "/outlines",
    title: "Outlines",
    description:
      "Manage project-scoped outline records with list, create, detail, and edit flows that turn seeded planning structures into real navigable data.",
  },
  {
    href: "/glossary-terms",
    title: "Glossary Terms",
    description:
      "Manage project-scoped glossary term records with list, create, detail, and edit flows that turn reusable lore vocabulary into real navigable data.",
  },
  {
    href: "/eras",
    title: "Eras",
    description:
      "Manage project-scoped era records with list, create, detail, and edit flows that turn seeded chronology anchors into real canon data.",
  },
  {
    href: "/themes",
    title: "Themes",
    description:
      "Manage project-scoped theme records with list, create, detail, and edit flows that turn seeded narrative anchors into real canon data.",
  },
  {
    href: "/languages",
    title: "Languages",
    description:
      "Manage project-scoped language records with list, create, detail, and edit flows that turn seeded linguistic anchors into real canon data.",
  },
  {
    href: "/species",
    title: "Species",
    description:
      "Manage project-scoped species records with list, create, detail, and edit flows that make existing character species references point at real data.",
  },
  {
    href: "/items",
    title: "Items",
    description:
      "Manage project-scoped item records with list, create, detail, and edit flows that turn existing artifact and important-item references into real data.",
  },
  {
    href: "/technologies",
    title: "Technologies",
    description:
      "Manage project-scoped technology records with list, create, detail, and edit flows that turn seeded infrastructure and system references into real canon data.",
  },
  {
    href: "/factions",
    title: "Factions",
    description:
      "Manage project-scoped faction records with list, create, detail, and edit flows aligned to the existing entity-slice pattern.",
  },
  {
    href: "/timeline-events",
    title: "Timeline Events",
    description:
      "Anchor project chronology with timeline-event list, create, detail, and edit flows under the active project.",
  },
  {
    href: "/retcons",
    title: "Retcons",
    description:
      "Track canon revisions with project-scoped retcon list, create, detail, and edit flows for old canon, new canon, and downstream impact records.",
  },
  {
    href: "/attachments",
    title: "Attachments",
    description:
      "Track project-scoped attachment metadata for maps, diagrams, and other reference files without introducing upload workflow yet.",
  },
  {
    href: "/ai-sessions",
    title: "AI Sessions",
    description:
      "Track project-scoped AI work records for brainstorming, summaries, drafting, and metadata about prompt/output sessions.",
  },
  {
    href: "/dev/setup",
    title: "Developer setup",
    description:
      "Initialize the Firestore user and project scaffold under users/{uid}/projects/default-story-bible.",
  },
  {
    href: "/firebase-test",
    title: "Firebase test",
    description:
      "Confirm the client app can reach Firebase Auth and Firestore before building deeper tools.",
  },
  {
    href: "/projects",
    title: "Projects",
    description:
      "View the future home for multiple story-bible projects owned by the authenticated user.",
  },
  {
    href: "/auth",
    title: "Auth",
    description:
      "Sign in with email and password so the dev initializer can write data under your UID.",
  },
] as const;

export default function HomePage() {
  return (
    <PageShell
      eyebrow="Development Workspace"
      title="BookWritingSite"
      description="This app is the private development shell for a future multi-project writing system. Use the development routes to test Firebase, initialize a deterministic story-bible schema, and stage the next set of CRUD tools."
    >
      <section className="grid gap-4 md:grid-cols-2">
        {quickLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm transition hover:border-zinc-300 hover:bg-zinc-50"
          >
            <h2 className="text-lg font-semibold tracking-tight text-zinc-950">
              {link.title}
            </h2>
            <p className="mt-2 text-sm leading-6 text-zinc-600">
              {link.description}
            </p>
          </Link>
        ))}
      </section>

      <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold tracking-tight text-zinc-950">
          Current direction
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-600">
          Firestore data is structured under <code>users/{`{uid}`}</code> so the
          project can stay single-user for now without blocking future expansion to
          multiple authenticated users and multiple projects per user.
        </p>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-600">
          Books, Chapters, Scenes, Timeline Events, Relationships, Factions,
          Cultures, Religions, Governments, Organizations, Plot Threads,
          Outlines, Glossary Terms, Eras, Themes, Languages, Species, Items,
          Technologies, Notes, Retcons, Attachments, and AI Sessions now give
          the manuscript, chronology, connection-tracking, planning,
          reference, canon revision, file-metadata, and workflow-tracking
          layers real project-scoped structure. The broader timeline workspace
          is still a placeholder, but chronology and canon-change tracking no
          longer rely on seed data alone.
        </p>
      </section>
    </PageShell>
  );
}
