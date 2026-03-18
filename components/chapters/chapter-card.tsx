import Link from "next/link";
import type { ReactNode } from "react";

import type { Chapter } from "@/types/chapter";

type ChapterCardProps = {
  chapter: Chapter;
};

export function ChapterCard({ chapter }: ChapterCardProps) {
  return (
    <article className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-zinc-950">
            <Link href={`/chapters/${chapter.id}`} className="hover:text-zinc-700">
              {chapter.title}
            </Link>
          </h2>
          <p className="mt-2 text-sm leading-6 text-zinc-600">
            {chapter.summary || "No summary yet."}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 text-xs font-medium">
          <Badge>{chapter.status}</Badge>
          <Badge>
            {typeof chapter.chapterNumber === "number"
              ? `Chapter ${chapter.chapterNumber}`
              : "Unnumbered"}
          </Badge>
          <Badge>{chapter.bookId ?? "No book link"}</Badge>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-3 text-sm text-zinc-500">
        <span>Slug: {chapter.slug}</span>
        <span>Project: {chapter.projectId}</span>
        <span>POV: {chapter.pointOfViewCharacterId ?? "n/a"}</span>
      </div>
    </article>
  );
}

function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full bg-zinc-100 px-3 py-1 text-zinc-700">{children}</span>
  );
}
