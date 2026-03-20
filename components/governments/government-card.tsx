import Link from "next/link";
import type { ReactNode } from "react";

import type { Government } from "@/types/government";

type GovernmentCardProps = {
  government: Government;
};

export function GovernmentCard({ government }: GovernmentCardProps) {
  return (
    <article className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-zinc-950">
            <Link href={`/governments/${government.id}`} className="hover:text-zinc-700">
              {government.name}
            </Link>
          </h2>
          <p className="mt-2 text-sm leading-6 text-zinc-600">
            {government.summary || "No summary yet."}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 text-xs font-medium">
          <Badge>{government.status}</Badge>
          <Badge>{government.leaderTitles.length} titles</Badge>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-3 text-sm text-zinc-500">
        <span>Slug: {government.slug}</span>
        <span>Project: {government.projectId}</span>
      </div>
    </article>
  );
}

function Badge({ children }: { children: ReactNode }) {
  return <span className="rounded-full bg-zinc-100 px-3 py-1 text-zinc-700">{children}</span>;
}
