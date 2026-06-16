import Link from "next/link";
import type { ReactNode } from "react";

import { EntityCardDeleteButton } from "@/components/layout/entity-card-delete-button";
import type { PlotThread } from "@/types/plot-thread";

type PlotThreadCardProps = {
  plotThread: PlotThread;
};

export function PlotThreadCard({ plotThread }: PlotThreadCardProps) {
  return (
    <article className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-zinc-950">
            <Link href={`/plot-threads/${plotThread.id}`} className="hover:text-zinc-700">
              {plotThread.title}
            </Link>
          </h2>
          <p className="mt-2 text-sm leading-6 text-zinc-600">
            {plotThread.summary || "No summary yet."}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 text-xs font-medium">
          <Badge>{plotThread.status}</Badge>
          <Badge>{plotThread.openQuestions.length} questions</Badge>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-3 text-sm text-zinc-500">
        <span>Slug: {plotThread.slug}</span>
        <span>Project: {plotThread.projectId}</span>
      </div>

      <div className="mt-4 flex justify-end">
        <EntityCardDeleteButton
          entityId={plotThread.id}
          entityLabel="plot thread"
          entityTitle={plotThread.title}
          redirectHref="/plot-threads"
          tableName="plot_threads"
        />
      </div>
    </article>
  );
}

function Badge({ children }: { children: ReactNode }) {
  return <span className="rounded-full bg-zinc-100 px-3 py-1 text-zinc-700">{children}</span>;
}
