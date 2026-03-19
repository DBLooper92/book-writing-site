"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import type { ReactNode } from "react";

import { PageShell } from "@/components/layout/page-shell";
import { LanguageForm } from "@/components/languages/language-form";
import { useLanguage } from "@/hooks/use-language";
import { updateLanguageForProject } from "@/lib/firebase/languages";
import {
  languageToFormValues,
  type NormalizedLanguageFormValues,
} from "@/types/language";

export default function EditLanguagePage() {
  const params = useParams<{ languageId: string }>();
  const router = useRouter();
  const languageId =
    typeof params.languageId === "string" ? params.languageId : null;
  const { language, loading, error, user, uid, activeProjectId, activeProject } =
    useLanguage(languageId);

  async function handleUpdateLanguage(values: NormalizedLanguageFormValues) {
    if (!uid || !activeProjectId || !languageId) {
      throw new Error("Language context is missing.");
    }

    await updateLanguageForProject(uid, activeProjectId, languageId, values);
    router.push(`/languages/${languageId}`);
  }

  return (
    <PageShell
      eyebrow="Languages"
      title={language ? `Edit ${language.name}` : "Edit language"}
      description="Update the first set of structured language fields and write the changes back to the currently active project's nested language document."
    >
      <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-zinc-950">
              Active project
            </h2>
            <p className="mt-2 text-sm leading-6 text-zinc-600">
              {activeProject
                ? `${activeProject.title} (${activeProject.id})`
                : "No active project selected"}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/languages"
              className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-200 px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
            >
              Back to languages
            </Link>
            {languageId ? (
              <Link
                href={`/languages/${languageId}`}
                className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-200 px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
              >
                View detail
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      {!user ? (
        <StateCard tone="warning">
          Sign in first to edit languages.{" "}
          <Link href="/auth" className="font-medium underline">
            Go to auth
          </Link>
          .
        </StateCard>
      ) : loading ? (
        <StateCard tone="neutral">Loading language data...</StateCard>
      ) : !activeProjectId || !activeProject ? (
        <StateCard tone="neutral">
          No active project selected. Choose one on the{" "}
          <Link href="/projects" className="font-medium underline">
            projects page
          </Link>
          .
        </StateCard>
      ) : error || !language ? (
        <StateCard tone="error">
          {error ?? "Language not found in the active project."}
        </StateCard>
      ) : (
        <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <LanguageForm
            initialValues={languageToFormValues(language)}
            submitLabel="Save changes"
            onSubmit={handleUpdateLanguage}
          />
        </section>
      )}
    </PageShell>
  );
}

function StateCard({
  children,
  tone,
}: {
  children: ReactNode;
  tone: "neutral" | "warning" | "error";
}) {
  const className =
    tone === "warning"
      ? "border-amber-200 bg-amber-50 text-amber-800"
      : tone === "error"
        ? "border-red-200 bg-red-50 text-red-700"
        : "border-zinc-300 bg-zinc-50 text-zinc-600";

  return (
    <section className={`rounded-3xl border p-6 text-sm leading-6 ${className}`}>
      {children}
    </section>
  );
}
