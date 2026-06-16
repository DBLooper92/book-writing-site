"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type EntityDeleteButtonProps = {
  entityLabel: string;
  entityTitle: string;
  onDelete: () => Promise<void>;
  redirectHref: string;
};

export function EntityDeleteButton({
  entityLabel,
  entityTitle,
  onDelete,
  redirectHref,
}: EntityDeleteButtonProps) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (deleting) {
      return;
    }

    const shouldDelete = window.confirm(`Delete "${entityTitle}"? This cannot be undone.`);

    if (!shouldDelete) {
      return;
    }

    setDeleting(true);

    try {
      await onDelete();
      router.push(redirectHref);
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
      className="inline-flex h-11 items-center justify-center rounded-full border border-red-200 bg-red-50 px-4 text-sm font-medium text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-70"
    >
      {deleting ? `Deleting...` : `Delete ${entityLabel}`}
    </button>
  );
}
