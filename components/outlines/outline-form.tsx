"use client";

import { useEffect, useState, type FormEvent } from "react";

import {
  createEmptyOutlineFormValues,
  normalizeOutlineFormValues,
  OUTLINE_STATUS_OPTIONS,
  type NormalizedOutlineFormValues,
  type OutlineFormValues,
} from "@/types/outline";

type OutlineFormProps = {
  initialValues?: OutlineFormValues;
  submitLabel: string;
  onSubmit: (values: NormalizedOutlineFormValues) => Promise<void>;
};

export function OutlineForm({
  initialValues,
  submitLabel,
  onSubmit,
}: OutlineFormProps) {
  const [values, setValues] = useState<OutlineFormValues>(() =>
    initialValues ?? createEmptyOutlineFormValues()
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

    const normalizedValues = normalizeOutlineFormValues(values);

    if (!normalizedValues.title) {
      setError("Outline title is required.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await onSubmit(normalizedValues);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to save this outline.");
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
          placeholder="Series Spine"
          required
        />
        <SelectField
          label="Status"
          value={values.status}
          onChange={(value) => updateField("status", value)}
          options={OUTLINE_STATUS_OPTIONS}
        />
        <Field
          label="Outline type"
          value={values.outlineType}
          onChange={(value) => updateField("outlineType", value)}
          placeholder="series"
        />
        <Field
          label="Scope"
          value={values.scope}
          onChange={(value) => updateField("scope", value)}
          placeholder="Books one through three"
        />
      </section>

      <TextareaField
        label="Summary"
        value={values.summary}
        onChange={(value) => updateField("summary", value)}
        placeholder="Short overview for index cards and quick browsing."
        rows={3}
      />

      <TextareaField
        label="Description"
        value={values.description}
        onChange={(value) => updateField("description", value)}
        placeholder="Longer internal description for planning context."
        rows={5}
      />

      <section className="grid gap-4 md:grid-cols-2">
        <Field
          label="Book IDs"
          value={values.bookIds}
          onChange={(value) => updateField("bookIds", value)}
          placeholder="book_001"
          hint="Comma separated"
        />
        <Field
          label="Plot thread IDs"
          value={values.threadIds}
          onChange={(value) => updateField("threadIds", value)}
          placeholder="thread_001"
          hint="Comma separated"
        />
        <Field
          label="Note IDs"
          value={values.noteIds}
          onChange={(value) => updateField("noteIds", value)}
          placeholder="note_001"
          hint="Comma separated"
        />
      </section>

      <TextareaField
        label="Act structure"
        value={values.actStructure}
        onChange={(value) => updateField("actStructure", value)}
        placeholder="Book one exposes the false ledger"
        rows={4}
        hint="Comma separated"
      />

      <TextareaField
        label="Milestones"
        value={values.milestones}
        onChange={(value) => updateField("milestones", value)}
        placeholder="Lyra links the theft to a restricted archive map"
        rows={4}
        hint="Comma separated"
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

  function updateField<Key extends keyof OutlineFormValues>(
    key: Key,
    value: OutlineFormValues[Key]
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
