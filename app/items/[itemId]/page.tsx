"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import type { ReactNode } from "react";

import { ItemDetailSection } from "@/components/items/item-detail-section";
import { PageShell } from "@/components/layout/page-shell";
import { useItem } from "@/hooks/use-item";

export default function ItemDetailPage() {
  const params = useParams<{ itemId: string }>();
  const itemId = typeof params.itemId === "string" ? params.itemId : null;
  const { item, loading, error, user, activeProjectId, activeProject } = useItem(itemId);

  return (
    <PageShell
      eyebrow="Items"
      title={item?.name ?? "Item detail"}
      description="Item records are loaded from the active project's scoped items rows so every artifact or object record stays scoped to the current story bible."
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
              Scope: Supabase rows filtered by user_id and project_id for items/
              {itemId ?? "{itemId}"}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/items"
              className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-200 px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
            >
              Back to items
            </Link>
            {item ? (
              <Link
                href={`/items/${item.id}/edit`}
                className="inline-flex h-11 items-center justify-center rounded-full bg-zinc-950 px-4 text-sm font-medium text-white transition hover:bg-zinc-800"
              >
                Edit item
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      {!user ? (
        <StateCard tone="warning">
          Sign in first to view this item.{" "}
          <Link href="/auth" className="font-medium underline">
            Go to auth
          </Link>
          .
        </StateCard>
      ) : loading ? (
        <StateCard tone="neutral">Loading item details...</StateCard>
      ) : !activeProjectId || !activeProject ? (
        <StateCard tone="neutral">
          No active project selected. Choose one on the{" "}
          <Link href="/projects" className="font-medium underline">
            projects page
          </Link>
          .
        </StateCard>
      ) : error || !item ? (
        <StateCard tone="error">{error ?? "Item not found in the active project."}</StateCard>
      ) : (
        <>
          <ItemDetailSection title="Summary">
            <div className="space-y-3 text-sm leading-6 text-zinc-700">
              <p>{item.summary || "No summary yet."}</p>
              <p>{item.description || "No full description yet."}</p>
            </div>
          </ItemDetailSection>

          <ItemDetailSection title="Core details">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <DetailItem label="Status" value={item.status} />
              <DetailItem label="Item type" value={item.itemType || "item"} />
              <DetailItem label="Material" value={item.material || "Unknown"} />
              <DetailItem label="Created year" value={formatOptionalNumber(item.createdYear)} />
              <DetailItem label="Canon level" value={item.canonLevel} />
              <DetailItem label="Confidence" value={item.confidence} />
            </div>
          </ItemDetailSection>

          <ItemDetailSection title="Connections and use">
            <div className="grid gap-4 lg:grid-cols-2">
              <ListBlock label="Owner character IDs" values={item.ownerCharacterIds} />
              <ListBlock label="Location IDs" values={item.locationIds} />
              <ListBlock label="Faction IDs" values={item.factionIds} />
              <ListBlock label="Timeline event IDs" values={item.timelineEventIds} />
              <ListBlock label="Abilities" values={item.abilities} />
              <ListBlock label="Limitations" values={item.limitations} />
              <ListBlock label="Tags" values={item.tags} />
            </div>
          </ItemDetailSection>

          <ItemDetailSection title="Meaning">
            <div className="grid gap-4 lg:grid-cols-2">
              <TextBlock label="Symbolic meaning" value={item.symbolicMeaning} />
              <TextBlock label="Public wiki summary" value={item.publicWikiSummary} />
            </div>
          </ItemDetailSection>
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
      <p className="mt-2 text-sm leading-6 text-zinc-700">{value || "None yet."}</p>
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
