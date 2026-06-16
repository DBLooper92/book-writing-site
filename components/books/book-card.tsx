import Link from "next/link";
import type { ReactNode } from "react";

import { EntityCardDeleteButton } from "@/components/layout/entity-card-delete-button";
import type { Book } from "@/types/book";

type BookCardProps = {
  book: Book;
};

export function BookCard({ book }: BookCardProps) {
  return (
    <article className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-zinc-950">
            <Link href={`/books/${book.id}`} className="hover:text-zinc-700">
              {book.title}
            </Link>
          </h2>
          <p className="mt-2 text-sm leading-6 text-zinc-600">
            {book.summary || "No summary yet."}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 text-xs font-medium">
          <Badge>{book.status}</Badge>
          <Badge>{book.draftStage}</Badge>
          <Badge>
            {typeof book.seriesOrder === "number" ? `Series ${book.seriesOrder}` : "Unordered"}
          </Badge>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-3 text-sm text-zinc-500">
        <span>Slug: {book.slug}</span>
        <span>Project: {book.projectId}</span>
        <span>
          Target: {typeof book.wordCountTarget === "number" ? book.wordCountTarget : "n/a"}
        </span>
      </div>

      <div className="mt-4 flex justify-end">
        <EntityCardDeleteButton
          entityId={book.id}
          entityLabel="book"
          entityTitle={book.title}
          redirectHref="/books"
          tableName="books"
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
