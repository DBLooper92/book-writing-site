import Link from "next/link";
import type { ReactNode } from "react";

import type { AiSession } from "@/types/ai-session";

type AiSessionCardProps = {
  aiSession: AiSession;
};

export function AiSessionCard({ aiSession }: AiSessionCardProps) {
  return (
    <article className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-zinc-950">
            <Link href={`/ai-sessions/${aiSession.id}`} className="hover:text-zinc-700">
              {aiSession.title}
            </Link>
          </h2>
          <p className="mt-2 text-sm leading-6 text-zinc-600">
            {aiSession.summary || "No summary yet."}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 text-xs font-medium">
          <Badge>{formatEnumLabel(aiSession.status)}</Badge>
          <Badge>{formatEnumLabel(aiSession.sessionType)}</Badge>
          <Badge>{aiSession.provider || "No provider"}</Badge>
          {aiSession.sessionType === "brain_dump" ? (
            <Badge>{formatEnumLabel(aiSession.extractionStatus)}</Badge>
          ) : null}
          {aiSession.sessionType === "manuscript_import" && aiSession.workflowState ? (
            <Badge>{formatEnumLabel(aiSession.workflowState.stage)}</Badge>
          ) : null}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-3 text-sm text-zinc-500">
        <span>Model: {aiSession.model || "None"}</span>
        <span>Messages: {aiSession.messagesCount ?? "Unknown"}</span>
        {aiSession.sessionType === "brain_dump" && aiSession.outputSummary ? (
          <span>{aiSession.outputSummary}</span>
        ) : null}
        {aiSession.sessionType === "manuscript_import" && aiSession.workflowState ? (
          <span>
            {aiSession.workflowState.books.length} book
            {aiSession.workflowState.books.length === 1 ? "" : "s"}
          </span>
        ) : null}
      </div>
    </article>
  );
}

function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full bg-zinc-100 px-3 py-1 text-zinc-700">{children}</span>
  );
}

function formatEnumLabel(value: string) {
  return value.replace(/_/g, " ");
}
