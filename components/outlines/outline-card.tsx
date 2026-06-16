import Link from "next/link";
import type { ReactNode } from "react";

import { EntityCardDeleteButton } from "@/components/layout/entity-card-delete-button";
import type { Outline } from "@/types/outline";

type OutlineCardProps = {
  outline: Outline;
};

export function OutlineCard({ outline }: OutlineCardProps) {
  return (
    <article className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-zinc-950">
            <Link href={`/outlines/${outline.id}`} className="hover:text-zinc-700">
              {outline.title}
            </Link>
          </h2>
          <p className="mt-2 text-sm leading-6 text-zinc-600">
            {outline.summary || "No summary yet."}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 text-xs font-medium">
          <Badge>{outline.status}</Badge>
          <Badge>{outline.outlineType || "outline"}</Badge>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-3 text-sm text-zinc-500">
        <span>Scope: {outline.scope || "not set"}</span>
        <span>Project: {outline.projectId}</span>
      </div>

      <div className="mt-4 flex justify-end">
        <EntityCardDeleteButton
          entityId={outline.id}
          entityLabel="outline"
          entityTitle={outline.title}
          redirectHref="/outlines"
          tableName="outlines"
        />
      </div>
    </article>
  );
}

function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full bg-zinc-100 px-3 py-1 text-zinc-700">{children}</span>
  );
}
