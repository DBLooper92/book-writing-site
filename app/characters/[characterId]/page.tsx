"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import type { ReactNode } from "react";

import { CharacterDetailSection } from "@/components/characters/character-detail-section";
import { PageShell } from "@/components/layout/page-shell";
import { useCharacter } from "@/hooks/use-character";

export default function CharacterDetailPage() {
  const params = useParams<{ characterId: string }>();
  const characterId = typeof params.characterId === "string" ? params.characterId : null;
  const { character, loading, error, user, activeProjectId, activeProject } =
    useCharacter(characterId);

  return (
    <PageShell
      eyebrow="Characters"
      title={character?.name ?? "Character detail"}
      description="Character records are loaded from the active project's scoped characters rows so every detail view stays scoped to the current story bible."
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
              Scope: Supabase rows filtered by user_id and project_id for characters/
              {characterId ?? "{characterId}"}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/characters"
              className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-200 px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
            >
              Back to characters
            </Link>
            {character ? (
              <Link
                href={`/characters/${character.id}/edit`}
                className="inline-flex h-11 items-center justify-center rounded-full bg-zinc-950 px-4 text-sm font-medium text-white transition hover:bg-zinc-800"
              >
                Edit character
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      {!user ? (
        <StateCard tone="warning">
          Sign in first to view this character.{" "}
          <Link href="/auth" className="font-medium underline">
            Go to auth
          </Link>
          .
        </StateCard>
      ) : loading ? (
        <StateCard tone="neutral">Loading character details...</StateCard>
      ) : !activeProjectId || !activeProject ? (
        <StateCard tone="neutral">
          No active project selected. Choose one on the{" "}
          <Link href="/projects" className="font-medium underline">
            projects page
          </Link>
          .
        </StateCard>
      ) : error || !character ? (
        <StateCard tone="error">
          {error ?? "Character not found in the active project."}
        </StateCard>
      ) : (
        <>
          <CharacterDetailSection title="Summary">
            <div className="space-y-3 text-sm leading-6 text-zinc-700">
              <p>{character.summary || "No summary yet."}</p>
              <p>{character.description || "No full description yet."}</p>
            </div>
          </CharacterDetailSection>

          <CharacterDetailSection title="Core details">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <DetailItem label="Status" value={character.status} />
              <DetailItem label="Character type" value={character.characterType} />
              <DetailItem label="Importance" value={character.importanceLevel} />
              <DetailItem label="Birth year" value={formatOptionalNumber(character.birthYear)} />
              <DetailItem label="Death year" value={formatOptionalNumber(character.deathYear)} />
              <DetailItem label="Apparent age" value={character.apparentAge || "Unknown"} />
              <DetailItem label="Actual age" value={character.actualAge || "Unknown"} />
              <DetailItem label="Home location ID" value={character.homeLocationId ?? "None"} />
              <DetailItem
                label="Current location ID"
                value={character.currentLocationId ?? "None"}
              />
            </div>
          </CharacterDetailSection>

          <CharacterDetailSection title="Identity and meta">
            <div className="grid gap-4 lg:grid-cols-2">
              <ListBlock label="Aliases" values={character.aliases} />
              <ListBlock label="Occupation" values={character.occupation} />
              <ListBlock label="Tags" values={character.tags} />
              <ListBlock label="Skills" values={character.skills} />
              <DetailItem label="Canon level" value={character.canonLevel} />
              <DetailItem label="Confidence" value={character.confidence} />
            </div>
          </CharacterDetailSection>

          <CharacterDetailSection title="Traits and motivations">
            <div className="grid gap-4 lg:grid-cols-2">
              <ListBlock label="Traits" values={character.traits} />
              <ListBlock label="Flaws" values={character.flaws} />
              <ListBlock label="Motivations" values={character.motivations} />
              <ListBlock label="Fears" values={character.fears} />
              <ListBlock label="Secrets" values={character.secrets} />
              <ListBlock label="Beliefs" values={character.beliefs} />
            </div>
          </CharacterDetailSection>

          <CharacterDetailSection title="Appearance and arc">
            <div className="grid gap-4 lg:grid-cols-2">
              <TextBlock label="Appearance" value={character.appearance} />
              <TextBlock label="Voice profile" value={character.voiceProfile} />
              <TextBlock label="Arc summary" value={character.arcSummary} />
              <TextBlock label="Arc start state" value={character.arcStartState} />
              <TextBlock label="Arc end state" value={character.arcEndState} />
            </div>
          </CharacterDetailSection>

          <CharacterDetailSection title="World links and references">
            <div className="grid gap-4 lg:grid-cols-2">
              <DetailItem label="Species ID" value={character.speciesId ?? "None"} />
              <ListBlock label="Culture IDs" values={character.cultureIds} />
              <ListBlock label="Faction IDs" values={character.factionIds} />
              <ListBlock label="Religion IDs" values={character.religionIds} />
              <ListBlock label="Language IDs" values={character.languageIds} />
              <ListBlock label="Relationship IDs" values={character.keyRelationshipIds} />
              <ListBlock label="Timeline event IDs" values={character.timelineEventIds} />
              <ListBlock label="Book IDs" values={character.bookIds} />
              <ListBlock label="Chapter IDs" values={character.chapterIds} />
              <ListBlock label="Scene IDs" values={character.sceneIds} />
              <ListBlock label="Important items" values={character.importantItems} />
            </div>
          </CharacterDetailSection>

          <CharacterDetailSection title="Public wiki summary">
            <p className="text-sm leading-6 text-zinc-700">
              {character.publicWikiSummary || "No public wiki summary yet."}
            </p>
          </CharacterDetailSection>
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

function TextBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
        {label}
      </p>
      <p className="mt-2 text-sm leading-6 text-zinc-700">
        {value || "None yet."}
      </p>
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

function formatOptionalNumber(value: number | null) {
  return typeof value === "number" ? String(value) : "Unknown";
}
