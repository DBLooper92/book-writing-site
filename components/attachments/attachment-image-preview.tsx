"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from "react";

import { getAttachmentFileUrl } from "@/lib/data/attachments";
import type { Attachment } from "@/types/attachment";

type AttachmentImagePreviewProps = {
  attachment: Attachment;
};

export function AttachmentImagePreview({ attachment }: AttachmentImagePreviewProps) {
  const previewKey =
    attachment.attachmentType === "image"
      ? `${attachment.id}:${attachment.updatedAt?.getTime() ?? 0}:${attachment.storagePath ?? attachment.url ?? ""}`
      : null;
  const [state, setState] = useState<{
    key: string | null;
    imageUrl: string | null;
  }>({
    key: null,
    imageUrl: null,
  });

  useEffect(() => {
    let cancelled = false;

    if (!previewKey || attachment.attachmentType !== "image") {
      return;
    }

    void getAttachmentFileUrl(attachment)
      .then((nextImageUrl) => {
        if (cancelled) {
          return;
        }

        setState({
          key: previewKey,
          imageUrl: nextImageUrl ?? null,
        });
      })
      .catch(() => {
        if (cancelled) {
          return;
        }

        setState({
          key: previewKey,
          imageUrl: attachment.url,
        });
      });

    return () => {
      cancelled = true;
    };
  }, [attachment, previewKey]);

  if (attachment.attachmentType !== "image") {
    return null;
  }

  const loading = state.key !== previewKey;
  const imageUrl = state.key === previewKey ? state.imageUrl : null;

  if (loading) {
    return <p className="text-sm text-zinc-600">Loading image preview...</p>;
  }

  if (!imageUrl) {
    return <p className="text-sm text-zinc-600">No image preview is available for this attachment.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-3xl border border-zinc-200 bg-zinc-50">
        <img src={imageUrl} alt={attachment.title} className="max-h-[36rem] w-full object-contain" />
      </div>
      <a
        href={imageUrl}
        target="_blank"
        rel="noreferrer"
        className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-200 px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
      >
        Open full image
      </a>
    </div>
  );
}
