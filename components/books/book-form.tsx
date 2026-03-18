"use client";

import { useEffect, useState, type FormEvent, type HTMLAttributes } from "react";

import {
  BOOK_DRAFT_STAGE_OPTIONS,
  BOOK_STATUS_OPTIONS,
  createEmptyBookFormValues,
  normalizeBookFormValues,
  type BookFormValues,
  type NormalizedBookFormValues,
} from "@/types/book";

type BookFormProps = {
  initialValues?: BookFormValues;
  submitLabel: string;
  onSubmit: (values: NormalizedBookFormValues) => Promise<void>;
};

export function BookForm({ initialValues, submitLabel, onSubmit }: BookFormProps) {
  const [values, setValues] = useState<BookFormValues>(() =>
    initialValues ?? createEmptyBookFormValues()
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

    const normalizedValues = normalizeBookFormValues(values);

    if (!normalizedValues.title) {
      setError("Book title is required.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await onSubmit(normalizedValues);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to save this book.");
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
          placeholder="Ashes of Dawn"
          required
        />
        <Field
          label="Series order"
          value={values.seriesOrder}
          onChange={(value) => updateField("seriesOrder", value)}
          placeholder="1"
          inputMode="numeric"
        />
        <SelectField
          label="Status"
          value={values.status}
          onChange={(value) => updateField("status", value)}
          options={BOOK_STATUS_OPTIONS}
        />
        <SelectField
          label="Draft stage"
          value={values.draftStage}
          onChange={(value) => updateField("draftStage", value)}
          options={BOOK_DRAFT_STAGE_OPTIONS}
        />
        <Field
          label="Word count target"
          value={values.wordCountTarget}
          onChange={(value) => updateField("wordCountTarget", value)}
          placeholder="95000"
          inputMode="numeric"
        />
        <Field
          label="Chronology start year"
          value={values.internalChronologyStart}
          onChange={(value) => updateField("internalChronologyStart", value)}
          placeholder="412"
          inputMode="numeric"
        />
        <Field
          label="Chronology end year"
          value={values.internalChronologyEnd}
          onChange={(value) => updateField("internalChronologyEnd", value)}
          placeholder="413"
          inputMode="numeric"
        />
      </section>

      <TextareaField
        label="Summary"
        value={values.summary}
        onChange={(value) => updateField("summary", value)}
        placeholder="One-paragraph quick summary for list views."
        rows={3}
      />

      <TextareaField
        label="Description"
        value={values.description}
        onChange={(value) => updateField("description", value)}
        placeholder="Longer internal description for story-bible and manuscript planning use."
        rows={5}
      />

      <TextareaField
        label="Premise"
        value={values.premise}
        onChange={(value) => updateField("premise", value)}
        placeholder="Core dramatic premise for the book."
        rows={4}
      />

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

  function updateField<Key extends keyof BookFormValues>(key: Key, value: BookFormValues[Key]) {
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
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  required?: boolean;
  inputMode?: HTMLAttributes<HTMLInputElement>["inputMode"];
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
        inputMode={inputMode}
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
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  rows: number;
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
    </label>
  );
}
