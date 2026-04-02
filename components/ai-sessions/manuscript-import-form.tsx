"use client";

import { useMemo, useState, type ChangeEvent, type FormEvent } from "react";

import {
  ATTACHMENT_DOCUMENT_ALLOWED_MIME_TYPES,
  ATTACHMENT_DOCUMENT_MAX_FILE_SIZE_BYTES,
  uploadDocumentAttachmentForEntity,
} from "@/lib/data/attachments";

type ManuscriptImportFormProps = {
  disabled?: boolean;
  disabledReason?: string;
  uid: string;
  projectId: string;
  onSuccess: (aiSessionId: string) => void;
};

type ManuscriptImportFormValues = {
  title: string;
  purpose: string;
  guidance: string;
  importMode: "single_book" | "series";
};

const EMPTY_VALUES: ManuscriptImportFormValues = {
  title: "",
  purpose: "",
  guidance: "",
  importMode: "single_book",
};

const MAX_FILES = 10;

export function ManuscriptImportForm({
  disabled = false,
  disabledReason = "",
  uid,
  projectId,
  onSuccess,
}: ManuscriptImportFormProps) {
  const [values, setValues] = useState<ManuscriptImportFormValues>(EMPTY_VALUES);
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSeries = values.importMode === "series";
  const fileSummary = useMemo(
    () =>
      files.map((file) => ({
        name: file.name,
        sizeLabel: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
      })),
    [files]
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (disabled) {
      return;
    }

    const title = values.title.trim();

    if (!title) {
      setError("Session title is required.");
      return;
    }

    if (files.length === 0) {
      setError("Upload at least one manuscript file.");
      return;
    }

    if (files.length > MAX_FILES) {
      setError(`Upload at most ${MAX_FILES} manuscript files per import session.`);
      return;
    }

    if (values.importMode === "single_book" && files.length !== 1) {
      setError("Single-book import accepts exactly one manuscript file.");
      return;
    }

    for (const file of files) {
      if (
        !ATTACHMENT_DOCUMENT_ALLOWED_MIME_TYPES.includes(
          file.type as (typeof ATTACHMENT_DOCUMENT_ALLOWED_MIME_TYPES)[number]
        )
      ) {
        setError("Only TXT and DOCX manuscript files are supported.");
        return;
      }

      if (file.size > ATTACHMENT_DOCUMENT_MAX_FILE_SIZE_BYTES) {
        setError("Each manuscript file must be 25 MB or smaller.");
        return;
      }
    }

    setSubmitting(true);
    setError(null);

    try {
      const createResponse = await fetch("/api/ai-sessions/manuscript-import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          projectId,
          title,
          purpose: values.purpose,
          guidance: values.guidance,
          importMode: values.importMode,
        }),
      });
      const createPayload = (await createResponse.json().catch(() => null)) as
        | { aiSessionId?: string; error?: string }
        | null;

      if (!createResponse.ok || !createPayload?.aiSessionId) {
        throw new Error(createPayload?.error || "Unable to create the manuscript import session.");
      }

      const aiSessionId = createPayload.aiSessionId;

      for (const file of files) {
        await uploadDocumentAttachmentForEntity(uid, projectId, "ai_sessions", aiSessionId, file);
      }

      const prepareResponse = await fetch(
        `/api/ai-sessions/${aiSessionId}/manuscript-import-prepare`,
        {
          method: "POST",
        }
      );
      const preparePayload = (await prepareResponse.json().catch(() => null)) as
        | { error?: string }
        | null;

      if (!prepareResponse.ok) {
        throw new Error(
          preparePayload?.error || "Unable to prepare the uploaded manuscript files."
        );
      }

      onSuccess(aiSessionId);
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Unable to start the manuscript import workflow."
      );
    } finally {
      setSubmitting(false);
    }
  }

  function handleFilesChange(event: ChangeEvent<HTMLInputElement>) {
    const nextFiles = Array.from(event.target.files ?? []);
    setFiles(nextFiles);
    setError(null);
  }

  function updateField<Key extends keyof ManuscriptImportFormValues>(
    key: Key,
    value: ManuscriptImportFormValues[Key]
  ) {
    setValues((current) => ({
      ...current,
      [key]: value,
    }));
    setError(null);
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      {disabled && disabledReason ? (
        <div className="rounded-2xl border border-zinc-300 bg-zinc-100 px-4 py-3 text-sm text-zinc-600">
          {disabledReason}
        </div>
      ) : null}

      <fieldset
        disabled={disabled}
        className={`space-y-6 border-0 p-0 ${disabled ? "opacity-50" : ""}`}
      >
        <section className="grid gap-4 lg:grid-cols-2">
          <Field
            label="Session title"
            value={values.title}
            onChange={(value) => updateField("title", value)}
            placeholder="Book one manuscript import"
            required
          />
          <Field
            label="Purpose"
            value={values.purpose}
            onChange={(value) => updateField("purpose", value)}
            placeholder="Break existing draft chapters and canon details into reviewable slices."
          />
        </section>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
          <TextareaField
            label="AI guidance"
            value={values.guidance}
            onChange={(value) => updateField("guidance", value)}
            placeholder="Optional: be conservative with character merges, keep chapter titles close to the source, prefer evidence-heavy summaries."
            rows={5}
            hint="Optional. Use this to bias the extraction while keeping the review gate in place."
          />

          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
            <p className="text-sm font-medium text-zinc-900">Import mode</p>
            <div className="mt-3 space-y-3">
              <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-zinc-200 bg-white p-3">
                <input
                  type="radio"
                  name="import-mode"
                  checked={values.importMode === "single_book"}
                  onChange={() => updateField("importMode", "single_book")}
                  className="mt-1"
                />
                <div>
                  <p className="text-sm font-medium text-zinc-900">Single book</p>
                  <p className="mt-1 text-xs leading-5 text-zinc-500">
                    One TXT or DOCX file mapped into one book.
                  </p>
                </div>
              </label>
              <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-zinc-200 bg-white p-3">
                <input
                  type="radio"
                  name="import-mode"
                  checked={values.importMode === "series"}
                  onChange={() => updateField("importMode", "series")}
                  className="mt-1"
                />
                <div>
                  <p className="text-sm font-medium text-zinc-900">Series</p>
                  <p className="mt-1 text-xs leading-5 text-zinc-500">
                    Multiple files handled inside one review workspace.
                  </p>
                </div>
              </label>
            </div>
          </div>
        </div>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-zinc-700">
            Manuscript files *
          </span>
          <input
            type="file"
            accept=".txt,.docx,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            multiple={isSeries}
            onChange={handleFilesChange}
            className="block w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-950"
          />
          <span className="mt-2 block text-xs text-zinc-500">
            V1 supports TXT and DOCX only. Maximum {MAX_FILES} files per import, 25 MB per file.
          </span>
        </label>

        {fileSummary.length > 0 ? (
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
              Selected files
            </p>
            <div className="mt-3 grid gap-2">
              {fileSummary.map((file) => (
                <div
                  key={file.name}
                  className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 ring-1 ring-zinc-200"
                >
                  <span className="text-sm text-zinc-900">{file.name}</span>
                  <span className="text-xs text-zinc-500">{file.sizeLabel}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={submitting}
          className="inline-flex h-12 items-center justify-center rounded-full bg-zinc-950 px-5 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-300"
        >
          {submitting ? "Preparing manuscript import..." : "Create manuscript import"}
        </button>
      </fieldset>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-zinc-700">
        {label}
        {required ? " *" : ""}
      </span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
        className="h-12 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-sm text-zinc-950 outline-none transition focus:border-zinc-400"
      />
    </label>
  );
}

function TextareaField({
  label,
  value,
  onChange,
  placeholder,
  rows,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  rows: number;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-zinc-700">{label}</span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-950 outline-none transition focus:border-zinc-400"
      />
      {hint ? <span className="mt-2 block text-xs text-zinc-500">{hint}</span> : null}
    </label>
  );
}
