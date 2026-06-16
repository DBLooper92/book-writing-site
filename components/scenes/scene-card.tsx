import Link from "next/link";
import type { ReactNode } from "react";

import { EntityCardDeleteButton } from "@/components/layout/entity-card-delete-button";
import type { Scene } from "@/types/scene";

type SceneCardProps = {
  scene: Scene;
};

export function SceneCard({ scene }: SceneCardProps) {
  return (
    <article className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-zinc-950">
            <Link href={`/scenes/${scene.id}`} className="hover:text-zinc-700">
              {scene.title}
            </Link>
          </h2>
          <p className="mt-2 text-sm leading-6 text-zinc-600">
            {scene.summary || "No summary yet."}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 text-xs font-medium">
          <Badge>{scene.status}</Badge>
          <Badge>
            {typeof scene.sceneNumber === "number" ? `Scene ${scene.sceneNumber}` : "Unnumbered"}
          </Badge>
          <Badge>{scene.sceneType}</Badge>
          <Badge>{scene.chapterId ?? "No chapter link"}</Badge>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-3 text-sm text-zinc-500">
        <span>Slug: {scene.slug}</span>
        <span>Project: {scene.projectId}</span>
        <span>Book: {scene.bookId ?? "n/a"}</span>
        <span>POV: {scene.pointOfViewCharacterId ?? "n/a"}</span>
      </div>

      <div className="mt-4 flex justify-end">
        <EntityCardDeleteButton
          entityId={scene.id}
          entityLabel="scene"
          entityTitle={scene.title}
          redirectHref="/scenes"
          tableName="scenes"
        />
      </div>
    </article>
  );
}

function Badge({ children }: { children: ReactNode }) {
  return <span className="rounded-full bg-zinc-100 px-3 py-1 text-zinc-700">{children}</span>;
}
