"use client";

import { useEffect, useState, type FormEvent } from "react";

import {
  RETCON_IMPACT_LEVEL_OPTIONS,
  RETCON_STATUS_OPTIONS,
  createEmptyRetconFormValues,
  normalizeRetconFormValues,
  type NormalizedRetconFormValues,
  type RetconFormValues,
} from "@/types/retcon";

type RetconFormProps = {
  initialValues?: RetconFormValues;
  submitLabel: string;
  onSubmit: (values: NormalizedRetconFormValues) => Promise<void>;
};

export function RetconForm({ initialValues, submitLabel, onSubmit }: RetconFormProps) {
  const [values, setValues] = useState<RetconFormValues>(() =>
    initialValues ?? createEmptyRetconFormValues()
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

    const normalizedValues = normalizeRetconFormValues(values);

    if (!normalizedValues.title) {
      setError("Retcon title is required.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await onSubmit(normalizedValues);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to save this retcon.");
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
          placeholder="Greyfen District Layout Revision"
          required
        />
        <SelectField
          label="Status"
          value={values.status}
          onChange={(value) => updateField("status", value)}
          options={RETCON_STATUS_OPTIONS}
        />
        <SelectField
          label="Impact level"
          value={values.impactLevel}
          onChange={(value) => updateField("impactLevel", value)}
          options={RETCON_IMPACT_LEVEL_OPTIONS}
        />
        <CheckboxField
          label="Resolved"
          checked={values.resolved}
          onChange={(checked) => updateField("resolved", checked)}
          hint="Keep this checked when the canon change has been fully accepted, even if the record later becomes archived."
        />
      </section>

      <TextareaField
        label="Summary"
        value={values.summary}
        onChange={(value) => updateField("summary", value)}
        placeholder="Short summary for the list and detail view."
        rows={3}
      />

      <TextareaField
        label="Description"
        value={values.description}
        onChange={(value) => updateField("description", value)}
        placeholder="What changed, why it matters, and any implementation context."
        rows={4}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <TextareaField
          label="Old canon"
          value={values.oldCanon}
          onChange={(value) => updateField("oldCanon", value)}
          placeholder="Describe the prior canon state."
          rows={6}
        />
        <TextareaField
          label="New canon"
          value={values.newCanon}
          onChange={(value) => updateField("newCanon", value)}
          placeholder="Describe the replacement canon state."
          rows={6}
        />
      </div>

      <TextareaField
        label="Reason"
        value={values.reason}
        onChange={(value) => updateField("reason", value)}
        placeholder="Explain why this retcon improves canon, workflow, or downstream story logic."
        rows={4}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <TextareaField
          label="Affected entity types"
          value={values.affectedEntityTypes}
          onChange={(value) => updateField("affectedEntityTypes", value)}
          placeholder="locations, chapters, scenes"
          rows={3}
          hint="Comma-separated collection names. This first pass keeps these as raw normalized IDs instead of adding cross-entity pickers."
        />
        <TextareaField
          label="Affected entity IDs"
          value={values.affectedEntityIds}
          onChange={(value) => updateField("affectedEntityIds", value)}
          placeholder="loc_001, chapter_001, scene_001"
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

  function updateField<Key extends keyof RetconFormValues>(
    key: Key,
    value: RetconFormValues[Key]
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

function CheckboxField({
  label,
  checked,
  onChange,
  hint,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  hint?: string;
}) {
  return (
    <label className="flex min-h-12 flex-col justify-center rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3">
      <span className="flex items-center gap-3 text-sm font-medium text-zinc-700">
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          className="h-4 w-4 rounded border-zinc-300 text-zinc-950 focus:ring-zinc-400"
        />
        {label}
      </span>
      {hint ? <span className="mt-2 text-xs leading-5 text-zinc-500">{hint}</span> : null}
    </label>
  );
}
