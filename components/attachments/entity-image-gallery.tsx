"use client";

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useEffect, useState, type ChangeEvent } from "react";

import {
  ATTACHMENT_IMAGE_ALLOWED_MIME_TYPES,
  ATTACHMENT_IMAGE_MAX_FILE_SIZE_BYTES,
  deleteAttachmentForProject,
  getAttachmentFileUrl,
  getImageAttachmentsForEntity,
  uploadImageAttachmentForEntity,
} from "@/lib/data/attachments";
import type { Attachment } from "@/types/attachment";

type EntityImageGalleryProps = {
  uid: string;
  projectId: string;
  entityType: string;
  entityId: string;
};

type EntityImageItem = {
  attachment: Attachment;
  imageUrl: string | null;
};

export function EntityImageGallery({
  uid,
  projectId,
  entityType,
  entityId,
}: EntityImageGalleryProps) {
  const [images, setImages] = useState<EntityImageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deletingAttachmentId, setDeletingAttachmentId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [refreshNonce, setRefreshNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError(null);

    void getImageAttachmentsForEntity(uid, projectId, entityType, entityId)
      .then(async (attachments: Attachment[]) => {
        const nextImages = await Promise.all(
          attachments.map(async (attachment: Attachment) => ({
            attachment,
            imageUrl: await readAttachmentImageUrl(attachment),
          }))
        );

        if (cancelled) {
          return;
        }

        setImages(nextImages);
        setError(null);
        setLoading(false);
      })
      .catch((nextError) => {
        if (cancelled) {
          return;
        }

        setImages([]);
        setError(getErrorMessage(nextError));
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [entityId, entityType, projectId, refreshNonce, uid]);

  async function handleFileSelection(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";

    if (files.length === 0) {
      return;
    }

    setUploading(true);
    setError(null);
    setSuccess(null);

    let uploadedCount = 0;
    const failures: string[] = [];

    for (const file of files) {
      try {
        await uploadImageAttachmentForEntity(uid, projectId, entityType, entityId, file);
        uploadedCount += 1;
      } catch (nextError) {
        failures.push(`${file.name}: ${getErrorMessage(nextError)}`);
      }
    }

    if (uploadedCount > 0) {
      setSuccess(`Uploaded ${uploadedCount} image${uploadedCount === 1 ? "" : "s"}.`);
      setRefreshNonce((current) => current + 1);
    }

    if (failures.length > 0) {
      setError(failures.join(" "));
    }

    setUploading(false);
  }

  async function handleDelete(attachment: Attachment) {
    const confirmed = window.confirm(
      `Delete "${attachment.title}" from this project? This removes the stored image file and its attachment record.`
    );

    if (!confirmed) {
      return;
    }

    setDeletingAttachmentId(attachment.id);
    setError(null);
    setSuccess(null);

    try {
      await deleteAttachmentForProject(uid, projectId, attachment.id);
      setSuccess(`Deleted ${attachment.title}.`);
      setRefreshNonce((current) => current + 1);
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setDeletingAttachmentId(null);
    }
  }

  return (
    <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-zinc-950">Images</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-600">
            Upload one or more images linked to this record. Each upload creates a scoped
            attachment row and stores the file in the private Supabase Storage bucket for this
            project owner.
          </p>
          <p className="mt-2 text-xs leading-5 text-zinc-500">
            Allowed types: JPG, PNG, WebP, GIF, and AVIF. Maximum size:{" "}
            {formatBytes(ATTACHMENT_IMAGE_MAX_FILE_SIZE_BYTES)} per image.
          </p>
        </div>

        <label className="inline-flex h-11 cursor-pointer items-center justify-center rounded-full bg-zinc-950 px-4 text-sm font-medium text-white transition hover:bg-zinc-800">
          <input
            type="file"
            accept={ATTACHMENT_IMAGE_ALLOWED_MIME_TYPES.join(",")}
            multiple
            disabled={uploading}
            onChange={handleFileSelection}
            className="sr-only"
          />
          {uploading ? "Uploading..." : "Upload images"}
        </label>
      </div>

      {error ? (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {success ? (
        <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {success}
        </div>
      ) : null}

      {loading ? (
        <div className="mt-6 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-5 text-sm text-zinc-600">
          Loading linked images...
        </div>
      ) : images.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-6 text-sm text-zinc-600">
          No images are linked to this record yet.
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {images.map(({ attachment, imageUrl }) => {
            const deleting = deletingAttachmentId === attachment.id;

            return (
              <article
                key={attachment.id}
                className="overflow-hidden rounded-3xl border border-zinc-200 bg-zinc-50"
              >
                <div className="aspect-[4/3] bg-zinc-100">
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={attachment.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center px-6 text-center text-sm text-zinc-500">
                      Preview unavailable.
                    </div>
                  )}
                </div>

                <div className="space-y-4 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-zinc-950">{attachment.title}</h3>
                      <p className="mt-1 break-all text-xs text-zinc-500">
                        {attachment.fileName || "Unnamed image"}
                      </p>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-zinc-700 ring-1 ring-zinc-200">
                      {formatEnumLabel(attachment.storageStatus)}
                    </span>
                  </div>

                  <div className="grid gap-2 text-sm text-zinc-600">
                    <MetaRow
                      label="Added"
                      value={formatDate(attachment.createdAt) || "Unknown"}
                    />
                    <MetaRow label="MIME type" value={attachment.mimeType || "Unknown"} />
                    <MetaRow
                      label="File size"
                      value={formatBytes(attachment.fileSizeBytes) || "Unknown"}
                    />
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {imageUrl ? (
                      <a
                        href={imageUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex h-9 items-center justify-center rounded-full border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-700 transition hover:bg-zinc-100"
                      >
                        Open image
                      </a>
                    ) : null}
                    <Link
                      href={`/attachments/${attachment.id}`}
                      className="inline-flex h-9 items-center justify-center rounded-full border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-700 transition hover:bg-zinc-100"
                    >
                      Attachment detail
                    </Link>
                    <Link
                      href={`/attachments/${attachment.id}/edit`}
                      className="inline-flex h-9 items-center justify-center rounded-full border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-700 transition hover:bg-zinc-100"
                    >
                      Edit metadata
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleDelete(attachment)}
                      disabled={deleting}
                      className="inline-flex h-9 items-center justify-center rounded-full border border-red-200 bg-white px-3 text-xs font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:border-zinc-200 disabled:text-zinc-400"
                    >
                      {deleting ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-white px-3 py-2">
      <span className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
        {label}
      </span>
      <span className="text-right text-sm text-zinc-700">{value}</span>
    </div>
  );
}

async function readAttachmentImageUrl(attachment: Attachment) {
  try {
    return await getAttachmentFileUrl(attachment);
  } catch {
    return attachment.url;
  }
}

function formatEnumLabel(value: string) {
  return value.replace(/_/g, " ");
}

function formatDate(value: Date | null) {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(value);
}

function formatBytes(value: number | null) {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return null;
  }

  if (value < 1024) {
    return `${value} B`;
  }

  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }

  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unable to manage images for this record.";
}
