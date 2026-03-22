"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

import { PageShell } from "@/components/layout/page-shell";
import { useAuthUser } from "@/hooks/use-auth-user";
import { emitProjectsChanged } from "@/hooks/use-user-projects";
import { createProjectForUser } from "@/lib/data/projects";

type Notice =
  | { tone: "neutral"; text: string }
  | { tone: "success"; text: string }
  | { tone: "error"; text: string };

const defaultNotice: Notice = {
  tone: "neutral",
  text: "Create a project here. New projects stay user-scoped and become active immediately after creation.",
};

export default function NewProjectPage() {
  const router = useRouter();
  const { user } = useAuthUser();
  const [title, setTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [notice, setNotice] = useState<Notice>(defaultNotice);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
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
        title
      );
      emitProjectsChanged();

      setNotice({
        tone: "success",
        text: `Created project ${projectId}. Redirecting to project management...`,
      });

      router.push("/projects");
    } catch (error) {
      setNotice({
        tone: "error",
        text: error instanceof Error ? error.message : "Unable to create project.",
      });
    } finally {
      setCreating(false);
    }
  }

  return (
    <PageShell
      eyebrow="Projects"
      title="Create project"
      description="Use this dedicated create screen when you want to add a new project from the header. The new project is activated as soon as the save succeeds."
    >
      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold tracking-tight text-zinc-950">
            New project details
          </h2>
          <p className="mt-2 text-sm leading-6 text-zinc-600">
            Keep the first pass small. Give the project a clear title, create it,
            and then continue working under the newly active project scope.
          </p>

          {!user ? (
            <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">
              Sign in first to create a project for your account.
            </div>
          ) : (
            <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-zinc-700">
                  Project name
                </span>
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Example: Book Two Outline"
                  disabled={creating}
                  className="h-12 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-sm text-zinc-950 outline-none transition focus:border-zinc-400 disabled:cursor-not-allowed disabled:bg-zinc-100"
                />
              </label>

              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={creating || !title.trim()}
                  className="inline-flex h-12 items-center justify-center rounded-full bg-zinc-950 px-5 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-300"
                >
                  {creating ? "Creating..." : "Create project"}
                </button>
                <Link
                  href="/projects"
                  className="inline-flex h-12 items-center justify-center rounded-full border border-zinc-200 px-5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
                >
                  Back to projects
                </Link>
              </div>
            </form>
          )}
        </div>

        <div className="rounded-3xl border border-zinc-200 bg-zinc-50 p-6 shadow-sm">
          <h2 className="text-lg font-semibold tracking-tight text-zinc-950">
            What happens next
          </h2>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-zinc-600">
            <li>The new project is written under your user scope.</li>
            <li>Your profile `activeProjectId` is updated to the new project.</li>
            <li>Existing slice pages immediately start reading from that new scope.</li>
          </ul>

          <div
            className={`mt-6 rounded-2xl px-4 py-3 text-sm leading-6 ${
              notice.tone === "success"
                ? "bg-emerald-50 text-emerald-800"
                : notice.tone === "error"
                  ? "bg-red-50 text-red-800"
                  : "bg-white text-zinc-700"
            }`}
          >
            {notice.text}
          </div>
        </div>
      </section>
    </PageShell>
  );
}
