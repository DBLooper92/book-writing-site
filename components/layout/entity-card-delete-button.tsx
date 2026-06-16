"use client";

import { useState } from "react";

import { useActiveProject } from "@/hooks/use-active-project";
import { deleteAttachmentForProject } from "@/lib/data/attachments";
import { deleteEntityForProject } from "@/lib/data/entity-deletions";
import type { EntityTableName } from "@/lib/data/entity-deletions";

type EntityCardDeleteButtonProps = {
  entityId: string;
  entityLabel: string;
  entityTitle: string;
  redirectHref: string;
  tableName: EntityTableName;
  variant?: "attachment" | "entity";
};

export function EntityCardDeleteButton({
  entityId,
  entityLabel,
  entityTitle,
  redirectHref,
  tableName,
  variant = "entity",
}: EntityCardDeleteButtonProps) {
  const { activeProjectId, uid } = useActiveProject();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (deleting) {
      return;
    }

    if (!uid || !activeProjectId) {
      window.alert("Sign in and choose an active project before deleting.");
      return;
    }

    const shouldDelete = window.confirm(`Delete "${entityTitle}"? This cannot be undone.`);

    if (!shouldDelete) {
      return;
    }

    setDeleting(true);

    try {
      if (variant === "attachment") {
        await deleteAttachmentForProject(uid, activeProjectId, entityId);
      }

      await deleteEntityForProject(uid, activeProjectId, tableName, entityId);
      window.location.assign(redirectHref);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : `Unable to delete this ${entityLabel}.`;
      window.alert(message);
      setDeleting(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={deleting}
      className="inline-flex h-9 items-center justify-center rounded-full border border-red-200 bg-red-50 px-3.5 text-xs font-medium text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-70"
    >
      {deleting ? "Deleting..." : `Delete ${entityLabel}`}
    </button>
  );
}
