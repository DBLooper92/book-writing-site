import Link from "next/link";
import type { ReactNode } from "react";

import type { Era } from "@/types/era";

type EraCardProps = {
  era: Era;
};

export function EraCard({ era }: EraCardProps) {
  return (
    <article className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-zinc-950">
            <Link href={`/eras/${era.id}`} className="hover:text-zinc-700">
              {era.name}
            </Link>
          </h2>
          <p className="mt-2 text-sm leading-6 text-zinc-600">
            {era.summary || "No summary yet."}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 text-xs font-medium">
          <Badge>{era.status}</Badge>
          <Badge>{formatEraRange(era.startYear, era.endYear)}</Badge>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-3 text-sm text-zinc-500">
        <span>Slug: {era.slug}</span>
        <span>Project: {era.projectId}</span>
      </div>
    </article>
  );
}

function Badge({ children }: { children: ReactNode }) {
  return <span className="rounded-full bg-zinc-100 px-3 py-1 text-zinc-700">{children}</span>;
}

function formatEraRange(startYear: number | null, endYear: number | null) {
  if (typeof startYear === "number" && typeof endYear === "number") {
    return startYear === endYear ? String(startYear) : `${startYear}-${endYear}`;
  }

  if (typeof startYear === "number") {
    return `From ${startYear}`;
  }

  if (typeof endYear === "number") {
    return `Until ${endYear}`;
  }

  return "Undated";
}
