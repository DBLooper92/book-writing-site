"use client";

import { useEffect, useState, type FormEvent } from "react";

import {
  createEmptyThemeFormValues,
  normalizeThemeFormValues,
  THEME_STATUS_OPTIONS,
  type NormalizedThemeFormValues,
  type ThemeFormValues,
} from "@/types/theme";

type ThemeFormProps = {
  initialValues?: ThemeFormValues;
  submitLabel: string;
  onSubmit: (values: NormalizedThemeFormValues) => Promise<void>;
};

export function ThemeForm({ initialValues, submitLabel, onSubmit }: ThemeFormProps) {
  const [values, setValues] = useState<ThemeFormValues>(() =>
    initialValues ?? createEmptyThemeFormValues()
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

    const normalizedValues = normalizeThemeFormValues(values);

    if (!normalizedValues.name) {
      setError("Theme name is required.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await onSubmit(normalizedValues);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to save this theme.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <section className="grid gap-4 md:grid-cols-2">
        <Field
          label="Name"
          value={values.name}
          onChange={(value) => updateField("name", value)}
          placeholder="Memory vs Myth"
          required
        />
        <SelectField
          label="Status"
          value={values.status}
          onChange={(value) => updateField("status", value)}
          options={THEME_STATUS_OPTIONS}
        />
      </section>

      <TextareaField
        label="Summary"
        value={values.summary}
        onChange={(value) => updateField("summary", value)}
        placeholder="One-paragraph overview for theme list views."
        rows={3}
      />

      <TextareaField
        label="Description"
        value={values.description}
        onChange={(value) => updateField("description", value)}
        placeholder="Longer internal description for how this theme operates across the project."
        rows={5}
      />

      <TextareaField
        label="Central question"
        value={values.centralQuestion}
        onChange={(value) => updateField("centralQuestion", value)}
        placeholder="What happens when the stories protecting a city become more useful than the truth?"
        rows={3}
      />

      <section className="grid gap-4 lg:grid-cols-2">
        <Field
          label="Associated book IDs"
          value={values.associatedBookIds}
          onChange={(value) => updateField("associatedBookIds", value)}
          placeholder="book_001"
          hint="Comma separated"
        />
        <Field
          label="Associated character IDs"
          value={values.associatedCharacterIds}
          onChange={(value) => updateField("associatedCharacterIds", value)}
          placeholder="char_001"
          hint="Comma separated"
        />
        <Field
          label="Associated timeline event IDs"
          value={values.associatedTimelineEventIds}
          onChange={(value) => updateField("associatedTimelineEventIds", value)}
          placeholder="event_001"
          hint="Comma separated"
        />
        <Field
          label="Associated era IDs"
          value={values.associatedEraIds}
          onChange={(value) => updateField("associatedEraIds", value)}
          placeholder="era_001"
          hint="Comma separated"
        />
        <Field
          label="Associated plot thread IDs"
          value={values.associatedPlotThreadIds}
          onChange={(value) => updateField("associatedPlotThreadIds", value)}
          placeholder="thread_001"
          hint="Comma separated"
        />
        <Field
          label="Motifs"
          value={values.motifs}
          onChange={(value) => updateField("motifs", value)}
          placeholder="embers, archives, lantern smoke"
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

  function updateField<Key extends keyof ThemeFormValues>(key: Key, value: ThemeFormValues[Key]) {
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
