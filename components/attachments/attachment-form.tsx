"use client";

import { AiSummaryGenerator } from "@/components/ai/ai-summary-generator";
import { useEffect, useState, type FormEvent } from "react";

import {
  ATTACHMENT_STATUS_OPTIONS,
  ATTACHMENT_STORAGE_STATUS_OPTIONS,
  ATTACHMENT_TYPE_OPTIONS,
  createEmptyAttachmentFormValues,
  normalizeAttachmentFormValues,
  type AttachmentFormValues,
  type NormalizedAttachmentFormValues,
} from "@/types/attachment";

type AttachmentFormProps = {
  initialValues?: AttachmentFormValues;
  submitLabel: string;
  lockedStorageFields?: boolean;
  onSubmit: (values: NormalizedAttachmentFormValues) => Promise<void>;
};

export function AttachmentForm({
  initialValues,
  submitLabel,
  lockedStorageFields = false,
  onSubmit,
}: AttachmentFormProps) {
  const [values, setValues] = useState<AttachmentFormValues>(() =>
    initialValues ?? createEmptyAttachmentFormValues()
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialValues) {
      setValues(initialValues);
    }
  }, [initialValues]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedValues = normalizeAttachmentFormValues(values);

    if (!normalizedValues.title) {
      setError("Attachment title is required.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await onSubmit(normalizedValues);
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError.message : "Unable to save this attachment."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Field
          label="Title"
          value={values.title}
          onChange={(value) => updateField("title", value)}
          placeholder="Greyfen map placeholder"
          required
        />
        <SelectField
          label="Status"
          value={values.status}
          onChange={(value) => updateField("status", value)}
          options={ATTACHMENT_STATUS_OPTIONS}
        />
        <SelectField
          label="Attachment type"
          value={values.attachmentType}
          onChange={(value) => updateField("attachmentType", value)}
          options={ATTACHMENT_TYPE_OPTIONS}
        />
        <SelectField
          label="Storage status"
          value={values.storageStatus}
          onChange={(value) => updateField("storageStatus", value)}
          options={ATTACHMENT_STORAGE_STATUS_OPTIONS}
          disabled={lockedStorageFields}
        />
        <Field
          label="File name"
          value={values.fileName}
          onChange={(value) => updateField("fileName", value)}
          placeholder="greyfen-map-placeholder.txt"
          disabled={lockedStorageFields}
        />
        <Field
          label="MIME type"
          value={values.mimeType}
          onChange={(value) => updateField("mimeType", value)}
          placeholder="text/plain"
          disabled={lockedStorageFields}
        />
      </section>

      {lockedStorageFields ? (
        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
          This attachment is backed by Supabase Storage. File name, MIME type, URL, and storage
          status stay locked to the uploaded file metadata.
        </div>
      ) : null}

      <TextareaField
        label="Summary"
        value={values.summary}
        onChange={(value) => updateField("summary", value)}
        placeholder="Short overview for attachment list views."
        rows={3}
      />

      <AiSummaryGenerator
        description={values.description}
        entityType="Attachment"
        summary={values.summary}
        onApply={(nextSummary) => updateField("summary", nextSummary)}
      />

      <TextareaField
        label="Description"
        value={values.description}
        onChange={(value) => updateField("description", value)}
        placeholder="Longer internal description for the file metadata and intended use."
        rows={4}
      />

      <TextareaField
        label="Source note"
        value={values.sourceNote}
        onChange={(value) => updateField("sourceNote", value)}
        placeholder="Context about where this file came from or how it should be replaced later."
        rows={4}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Field
          label="URL"
          value={values.url}
          onChange={(value) => updateField("url", value)}
          placeholder="https://example.com/greyfen-map"
          hint="Optional for external-link attachments."
          disabled={lockedStorageFields}
        />
        <Field
          label="Linked entity type"
          value={values.linkedEntityType}
          onChange={(value) => updateField("linkedEntityType", value)}
          placeholder="locations"
          hint="Raw collection-style label for the primary linked record."
        />
        <Field
          label="Linked entity ID"
          value={values.linkedEntityId}
          onChange={(value) => updateField("linkedEntityId", value)}
          placeholder="loc_001"
          hint="Primary linked document ID inside the active project."
        />
        <TextareaField
          label="Linked note IDs"
          value={values.linkedNoteIds}
          onChange={(value) => updateField("linkedNoteIds", value)}
          placeholder="note_001"
          rows={3}
          hint="Comma-separated note IDs."
        />
        <TextareaField
          label="Linked outline IDs"
          value={values.linkedOutlineIds}
          onChange={(value) => updateField("linkedOutlineIds", value)}
          placeholder="outline_001"
          rows={3}
          hint="Comma-separated outline IDs."
        />
      </div>

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
        {submitting ? "Saving..." : submitLabel}
      </button>
    </form>
  );

  function updateField<Key extends keyof AttachmentFormValues>(
    key: Key,
    value: AttachmentFormValues[Key]
  ) {
    if (error) {
      setError(null);
    }

    setValues((current) => ({
      ...current,
      [key]: value,
    }));
  }
}

function SelectField<Value extends string>({
  label,
  value,
  onChange,
  options,
  disabled = false,
}: {
  label: string;
  value: Value;
  onChange: (value: Value) => void;
  options: ReadonlyArray<{ value: Value; label: string }>;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-zinc-700">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as Value)}
        disabled={disabled}
        className="h-12 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-sm text-zinc-950 outline-none transition focus:border-zinc-400"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  required = false,
  hint,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  required?: boolean;
  hint?: string;
  disabled?: boolean;
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
        disabled={disabled}
        className="h-12 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-sm text-zinc-950 outline-none transition focus:border-zinc-400 disabled:cursor-not-allowed disabled:bg-zinc-100"
      />
      {hint ? <span className="mt-2 block text-xs text-zinc-500">{hint}</span> : null}
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
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  rows: number;
  hint?: string;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-zinc-700">{label}</span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={rows}
        disabled={disabled}
        className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-950 outline-none transition focus:border-zinc-400 disabled:cursor-not-allowed disabled:bg-zinc-100"
      />
      {hint ? <span className="mt-2 block text-xs text-zinc-500">{hint}</span> : null}
    </label>
  );
}
