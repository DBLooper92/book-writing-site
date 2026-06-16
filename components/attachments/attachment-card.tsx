import Link from "next/link";
import type { ReactNode } from "react";

import { EntityCardDeleteButton } from "@/components/layout/entity-card-delete-button";
import type { Attachment } from "@/types/attachment";

type AttachmentCardProps = {
  attachment: Attachment;
};

export function AttachmentCard({ attachment }: AttachmentCardProps) {
  return (
    <article className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-zinc-950">
            <Link href={`/attachments/${attachment.id}`} className="hover:text-zinc-700">
              {attachment.title}
            </Link>
          </h2>
          <p className="mt-2 text-sm leading-6 text-zinc-600">
            {attachment.summary || "No summary yet."}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 text-xs font-medium">
          <Badge>{formatEnumLabel(attachment.status)}</Badge>
          <Badge>{formatEnumLabel(attachment.attachmentType)}</Badge>
          <Badge>{formatEnumLabel(attachment.storageStatus)}</Badge>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-3 text-sm text-zinc-500">
        <span>File: {attachment.fileName || "No file name"}</span>
        <span>Primary link: {attachment.linkedEntityType ?? "None"}</span>
      </div>

      <div className="mt-4 flex justify-end">
        <EntityCardDeleteButton
          entityId={attachment.id}
          entityLabel="attachment"
          entityTitle={attachment.title}
          redirectHref="/attachments"
          tableName="attachments"
          variant="attachment"
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

function formatEnumLabel(value: string) {
  return value.replace(/_/g, " ");
}
