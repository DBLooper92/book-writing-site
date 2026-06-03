"use client";

import { AiSummaryGenerator } from "@/components/ai/ai-summary-generator";
import { useEffect, useState, type FormEvent } from "react";

import {
  createEmptyGlossaryTermFormValues,
  GLOSSARY_TERM_STATUS_OPTIONS,
  normalizeGlossaryTermFormValues,
  type GlossaryTermFormValues,
  type NormalizedGlossaryTermFormValues,
} from "@/types/glossary-term";

type GlossaryTermFormProps = {
  initialValues?: GlossaryTermFormValues;
  submitLabel: string;
  onSubmit: (values: NormalizedGlossaryTermFormValues) => Promise<void>;
};

export function GlossaryTermForm({
  initialValues,
  submitLabel,
  onSubmit,
}: GlossaryTermFormProps) {
  const [values, setValues] = useState<GlossaryTermFormValues>(() =>
    initialValues ?? createEmptyGlossaryTermFormValues()
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

    const normalizedValues = normalizeGlossaryTermFormValues(values);

    if (!normalizedValues.title) {
      setError("Glossary term title is required.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await onSubmit(normalizedValues);
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError.message : "Unable to save this glossary term."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <section className="grid gap-4 md:grid-cols-2">
        <Field
          label="Title"
          value={values.title}
          onChange={(value) => updateField("title", value)}
          placeholder="Last Ember"
          required
        />
        <SelectField
          label="Status"
          value={values.status}
          onChange={(value) => updateField("status", value)}
          options={GLOSSARY_TERM_STATUS_OPTIONS}
        />
        <Field
          label="Term"
          value={values.term}
          onChange={(value) => updateField("term", value)}
          placeholder="Last Ember"
        />
        <Field
          label="Category"
          value={values.category}
          onChange={(value) => updateField("category", value)}
          placeholder="mythic object"
        />
      </section>

      <TextareaField
        label="Summary"
        value={values.summary}
        onChange={(value) => updateField("summary", value)}
        placeholder="Short overview for index cards and quick browsing."
        rows={3}
      />

      <AiSummaryGenerator
        description={values.description}
        entityType="Glossary term"
        summary={values.summary}
        onApply={(nextSummary) => updateField("summary", nextSummary)}
      />

      <TextareaField
        label="Description"
        value={values.description}
        onChange={(value) => updateField("description", value)}
        placeholder="Longer internal description for canon context."
        rows={5}
      />

      <TextareaField
        label="Definition"
        value={values.definition}
        onChange={(value) => updateField("definition", value)}
        placeholder="A semi-mythic ember said to preserve the truest possible record..."
        rows={4}
      />

      <section className="grid gap-4 md:grid-cols-2">
        <Field
          label="Related entity types"
          value={values.relatedEntityTypes}
          onChange={(value) => updateField("relatedEntityTypes", value)}
          placeholder="items, themes, timeline_events"
          hint="Comma separated"
        />
        <Field
          label="Related entity IDs"
          value={values.relatedEntityIds}
          onChange={(value) => updateField("relatedEntityIds", value)}
          placeholder="item_001, theme_001, event_001"
          hint="Comma separated"
        />
      </section>

      <TextareaField
        label="Public wiki summary"
        value={values.publicWikiSummary}
        onChange={(value) => updateField("publicWikiSummary", value)}
        placeholder="Optional outward-facing summary."
        rows={4}
      />

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

  function updateField<Key extends keyof GlossaryTermFormValues>(
    key: Key,
    value: GlossaryTermFormValues[Key]
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
}: {
  label: string;
  value: Value;
  onChange: (value: Value) => void;
  options: ReadonlyArray<{ value: Value; label: string }>;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-zinc-700">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as Value)}
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
