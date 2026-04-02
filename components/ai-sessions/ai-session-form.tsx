"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";

import {
  AI_SESSION_STATUS_OPTIONS,
  AI_SESSION_TYPE_OPTIONS,
  createEmptyAiSessionFormValues,
  normalizeAiSessionFormValues,
  type AiSessionFormValues,
  type NormalizedAiSessionFormValues,
} from "@/types/ai-session";

type AiSessionFormProps = {
  initialValues?: AiSessionFormValues;
  submitLabel: string;
  onSubmit: (values: NormalizedAiSessionFormValues) => Promise<void>;
};

export function AiSessionForm({
  initialValues,
  submitLabel,
  onSubmit,
}: AiSessionFormProps) {
  const [values, setValues] = useState<AiSessionFormValues>(() =>
    initialValues ?? createEmptyAiSessionFormValues()
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isWorkflowManagedSessionType =
    values.sessionType === "brain_dump" || values.sessionType === "manuscript_import";
  const sessionTypeOptions = useMemo(
    () =>
      AI_SESSION_TYPE_OPTIONS.filter((option) =>
        isWorkflowManagedSessionType
          ? option.value === values.sessionType
          : option.value !== "brain_dump" && option.value !== "manuscript_import"
      ),
    [isWorkflowManagedSessionType, values.sessionType]
  );

  useEffect(() => {
    if (initialValues) {
      setValues(initialValues);
    }
  }, [initialValues]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedValues = normalizeAiSessionFormValues(values);

    if (!normalizedValues.title) {
      setError("AI session title is required.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await onSubmit(normalizedValues);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to save this AI session.");
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
          placeholder="Initial story bible seeding session"
          required
        />
        <SelectField
          label="Status"
          value={values.status}
          onChange={(value) => updateField("status", value)}
          options={AI_SESSION_STATUS_OPTIONS}
        />
        <SelectField
          label="Session type"
          value={values.sessionType}
          onChange={(value) => updateField("sessionType", value)}
          options={sessionTypeOptions}
          disabled={isWorkflowManagedSessionType}
          hint={
            isWorkflowManagedSessionType
              ? "This workflow type is managed from its dedicated AI Sessions page."
              : "Brain dump and manuscript import use dedicated workflow pages instead of the generic metadata form."
          }
        />
        <Field
          label="Provider"
          value={values.provider}
          onChange={(value) => updateField("provider", value)}
          placeholder="manual-dev-init"
        />
        <Field
          label="Model"
          value={values.model}
          onChange={(value) => updateField("model", value)}
          placeholder="gpt-5"
        />
        <Field
          label="Messages count"
          value={values.messagesCount}
          onChange={(value) => updateField("messagesCount", value)}
          placeholder="1"
          hint="Optional integer count for the tracked exchange."
        />
      </section>

      <TextareaField
        label="Summary"
        value={values.summary}
        onChange={(value) => updateField("summary", value)}
        placeholder="One-paragraph overview for list views."
        rows={3}
      />

      <TextareaField
        label="Description"
        value={values.description}
        onChange={(value) => updateField("description", value)}
        placeholder="Longer internal description of what happened in this session."
        rows={4}
      />

      <TextareaField
        label="Purpose"
        value={values.purpose}
        onChange={(value) => updateField("purpose", value)}
        placeholder="What the AI session was meant to accomplish."
        rows={3}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <TextareaField
          label="Prompt excerpt"
          value={values.promptExcerpt}
          onChange={(value) => updateField("promptExcerpt", value)}
          placeholder="Short representative excerpt of the prompt or request."
          rows={6}
        />
        <TextareaField
          label="Output summary"
          value={values.outputSummary}
          onChange={(value) => updateField("outputSummary", value)}
          placeholder="Short summary of the output or outcome."
          rows={6}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <TextareaField
          label="Linked entity types"
          value={values.linkedEntityTypes}
          onChange={(value) => updateField("linkedEntityTypes", value)}
          placeholder="projects, books, characters, timeline_events"
          rows={3}
          hint="Comma-separated collection names."
        />
        <TextareaField
          label="Linked entity IDs"
          value={values.linkedEntityIds}
          onChange={(value) => updateField("linkedEntityIds", value)}
          placeholder="default-story-bible, book_001, char_001, event_001"
          rows={3}
          hint="Comma-separated document IDs under the active project."
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

  function updateField<Key extends keyof AiSessionFormValues>(
    key: Key,
    value: AiSessionFormValues[Key]
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
  hint,
}: {
  label: string;
  value: Value;
  onChange: (value: Value) => void;
  options: ReadonlyArray<{ value: Value; label: string }>;
  disabled?: boolean;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-zinc-700">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as Value)}
        disabled={disabled}
        className="h-12 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-sm text-zinc-950 outline-none transition focus:border-zinc-400 disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-500"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {hint ? <span className="mt-2 block text-xs text-zinc-500">{hint}</span> : null}
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
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  required?: boolean;
  hint?: string;
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
