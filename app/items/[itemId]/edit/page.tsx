"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import type { ReactNode } from "react";

import { ItemForm } from "@/components/items/item-form";
import { PageShell } from "@/components/layout/page-shell";
import { useItem } from "@/hooks/use-item";
import { updateItemForProject } from "@/lib/data/items";
import { itemToFormValues, type NormalizedItemFormValues } from "@/types/item";

export default function EditItemPage() {
  const params = useParams<{ itemId: string }>();
  const router = useRouter();
  const itemId = typeof params.itemId === "string" ? params.itemId : null;
  const { item, loading, error, user, uid, activeProjectId, activeProject } = useItem(itemId);

  async function handleUpdateItem(values: NormalizedItemFormValues) {
    if (!uid || !activeProjectId || !itemId) {
      throw new Error("Item context is missing.");
    }

    await updateItemForProject(uid, activeProjectId, itemId, values);
    router.push(`/items/${itemId}`);
  }

  return (
    <PageShell
      eyebrow="Items"
      title={item ? `Edit ${item.name}` : "Edit item"}
      description="Update the first set of structured item fields and write the changes back to the currently active project's nested item document."
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
              href="/items"
              className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-200 px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
            >
              Back to items
            </Link>
            {itemId ? (
              <Link
                href={`/items/${itemId}`}
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
          Sign in first to edit items.{" "}
          <Link href="/auth" className="font-medium underline">
            Go to auth
          </Link>
          .
        </StateCard>
      ) : loading ? (
        <StateCard tone="neutral">Loading item data...</StateCard>
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
        <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <ItemForm
            initialValues={itemToFormValues(item)}
            submitLabel="Save changes"
            onSubmit={handleUpdateItem}
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
