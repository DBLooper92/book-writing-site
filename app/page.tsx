import Link from "next/link";

import { PageShell } from "@/components/layout/page-shell";

const quickLinks = [
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
      </section>
    </PageShell>
  );
}
