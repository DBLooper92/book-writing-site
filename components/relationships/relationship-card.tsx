import Link from "next/link";
import type { ReactNode } from "react";

import { EntityCardDeleteButton } from "@/components/layout/entity-card-delete-button";
import type { Relationship } from "@/types/relationship";

type RelationshipCardProps = {
  relationship: Relationship;
};

export function RelationshipCard({ relationship }: RelationshipCardProps) {
  return (
    <article className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-zinc-950">
            <Link href={`/relationships/${relationship.id}`} className="hover:text-zinc-700">
              {relationship.title}
            </Link>
          </h2>
          <p className="mt-2 text-sm leading-6 text-zinc-600">
            {relationship.summary || "No summary yet."}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 text-xs font-medium">
          <Badge>{relationship.status}</Badge>
          <Badge>{formatEnumValue(relationship.relationshipType)}</Badge>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-3 text-sm text-zinc-500">
        <span>
          {formatEntityType(relationship.entityAType)}: {relationship.entityAId || "None"}
        </span>
        <span>
          {formatEntityType(relationship.entityBType)}: {relationship.entityBId || "None"}
        </span>
      </div>

      <div className="mt-4 flex justify-end">
        <EntityCardDeleteButton
          entityId={relationship.id}
          entityLabel="relationship"
          entityTitle={relationship.title}
          redirectHref="/relationships"
          tableName="relationships"
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

function formatEnumValue(value: string) {
  return value.replace(/[_-]+/g, " ");
}

function formatEntityType(value: string) {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}
