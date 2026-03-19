import Link from "next/link";
import type { ReactNode } from "react";

import type { Culture } from "@/types/culture";

type CultureCardProps = {
  culture: Culture;
};

export function CultureCard({ culture }: CultureCardProps) {
  return (
    <article className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-zinc-950">
            <Link href={`/cultures/${culture.id}`} className="hover:text-zinc-700">
              {culture.name}
            </Link>
          </h2>
          <p className="mt-2 text-sm leading-6 text-zinc-600">
            {culture.summary || "No summary yet."}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 text-xs font-medium">
          <Badge>{culture.status}</Badge>
          <Badge>{culture.coreValues.length} core values</Badge>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-3 text-sm text-zinc-500">
        <span>Slug: {culture.slug}</span>
        <span>Project: {culture.projectId}</span>
      </div>
    </article>
  );
}

function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full bg-zinc-100 px-3 py-1 text-zinc-700">{children}</span>
  );
}
