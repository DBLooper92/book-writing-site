"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import type { ReactNode } from "react";

import { EntityImageGallery } from "@/components/attachments/entity-image-gallery";
import { PageShell } from "@/components/layout/page-shell";
import { LanguageDetailSection } from "@/components/languages/language-detail-section";
import { useLanguage } from "@/hooks/use-language";

export default function LanguageDetailPage() {
  const params = useParams<{ languageId: string }>();
  const languageId = typeof params.languageId === "string" ? params.languageId : null;
  const { language, loading, error, user, activeProjectId, activeProject } =
    useLanguage(languageId);

  return (
    <PageShell
      eyebrow="Languages"
      title={language?.name ?? "Language detail"}
      description="Language records are loaded from the active project's scoped languages rows so linguistic references stay scoped to the current story bible."
    >
      <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
              Active project
            </p>
            <p className="mt-2 text-sm text-zinc-700">
              {activeProject
                ? `${activeProject.title} (${activeProject.id})`
                : "No active project selected"}
            </p>
            <p className="mt-2 text-xs uppercase tracking-[0.18em] text-zinc-500">
              Scope: Supabase rows filtered by user_id and project_id for languages/
              {languageId ?? "{languageId}"}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/languages"
              className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-200 px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
            >
              Back to languages
            </Link>
            {language ? (
              <Link
                href={`/languages/${language.id}/edit`}
                className="inline-flex h-11 items-center justify-center rounded-full bg-zinc-950 px-4 text-sm font-medium text-white transition hover:bg-zinc-800"
              >
                Edit language
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      {!user ? (
        <StateCard tone="warning">
          Sign in first to view this language.{" "}
          <Link href="/auth" className="font-medium underline">
            Go to auth
          </Link>
          .
        </StateCard>
      ) : loading ? (
        <StateCard tone="neutral">Loading language details...</StateCard>
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
        <>
          <EntityImageGallery
            uid={user.uid}
            projectId={activeProjectId}
            entityType="languages"
            entityId={language.id}
          />

          <LanguageDetailSection title="Summary">
            <div className="space-y-3 text-sm leading-6 text-zinc-700">
              <p>{language.summary || "No summary yet."}</p>
              <p>{language.description || "No full description yet."}</p>
            </div>
          </LanguageDetailSection>

          <LanguageDetailSection title="Core details">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <DetailItem label="Status" value={formatEnumValue(language.status)} />
              <DetailItem
                label="Canon level"
                value={formatEnumValue(language.canonLevel)}
              />
              <DetailItem
                label="Confidence"
                value={formatEnumValue(language.confidence)}
              />
              <DetailItem label="Language family" value={language.languageFamily || "None"} />
              <DetailItem label="Writing system" value={language.writingSystem || "None"} />
              <DetailItem label="Slug" value={language.slug} />
            </div>
          </LanguageDetailSection>

          <LanguageDetailSection title="Regional and linguistic references">
            <div className="grid gap-4 lg:grid-cols-2">
              <ListBlock label="Primary region IDs" values={language.primaryRegions} />
              <ListBlock label="Dialects" values={language.dialects} />
              <ListBlock label="Loan sources" values={language.loanSources} />
              <ListBlock label="Tags" values={language.tags} />
            </div>
          </LanguageDetailSection>

          <LanguageDetailSection title="Public wiki summary">
            <p className="whitespace-pre-wrap text-sm leading-6 text-zinc-700">
              {language.publicWikiSummary || "No public wiki summary stored yet."}
            </p>
          </LanguageDetailSection>
        </>
      )}
    </PageShell>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
        {label}
      </p>
      <p className="mt-2 wrap-break-word text-sm font-medium text-zinc-900">{value}</p>
    </div>
  );
}

function ListBlock({ label, values }: { label: string; values: string[] }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
        {label}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {values.length > 0 ? (
          values.map((value) => (
            <span
              key={`${label}-${value}`}
              className="rounded-full bg-white px-3 py-1 text-sm text-zinc-700 ring-1 ring-zinc-200"
            >
              {value}
            </span>
          ))
        ) : (
          <span className="text-sm text-zinc-500">None</span>
        )}
      </div>
    </div>
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

function formatEnumValue(value: string) {
  if (!value) {
    return "Unknown";
  }

  return value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}
