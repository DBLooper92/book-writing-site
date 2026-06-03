"use client";

import { AiSummaryGenerator } from "@/components/ai/ai-summary-generator";
import { useEffect, useState, type FormEvent } from "react";

import {
  createEmptyPlotThreadFormValues,
  normalizePlotThreadFormValues,
  PLOT_THREAD_STATUS_OPTIONS,
  PLOT_THREAD_TYPE_OPTIONS,
  type NormalizedPlotThreadFormValues,
  type PlotThreadFormValues,
} from "@/types/plot-thread";

type PlotThreadFormProps = {
  initialValues?: PlotThreadFormValues;
  submitLabel: string;
  onSubmit: (values: NormalizedPlotThreadFormValues) => Promise<void>;
};

export function PlotThreadForm({
  initialValues,
  submitLabel,
  onSubmit,
}: PlotThreadFormProps) {
  const [values, setValues] = useState<PlotThreadFormValues>(() =>
    initialValues ?? createEmptyPlotThreadFormValues()
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

    const normalizedValues = normalizePlotThreadFormValues(values);

    if (!normalizedValues.title) {
      setError("Plot thread title is required.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await onSubmit(normalizedValues);
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError.message : "Unable to save this plot thread."
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
          placeholder="Mystery of the Last Ember"
          required
        />
        <SelectField
          label="Status"
          value={values.status}
          onChange={(value) => updateField("status", value)}
          options={PLOT_THREAD_STATUS_OPTIONS}
        />
        <SelectField
          label="Thread type"
          value={values.threadType}
          onChange={(value) => updateField("threadType", value)}
          options={PLOT_THREAD_TYPE_OPTIONS}
        />
        <Field
          label="Introduced in book ID"
          value={values.introducedInBookId}
          onChange={(value) => updateField("introducedInBookId", value)}
          placeholder="book_001"
        />
        <Field
          label="Resolved in book ID"
          value={values.resolvedInBookId}
          onChange={(value) => updateField("resolvedInBookId", value)}
          placeholder="Optional"
        />
      </section>

      <TextareaField
        label="Summary"
        value={values.summary}
        onChange={(value) => updateField("summary", value)}
        placeholder="One-paragraph overview for plot-thread list views."
        rows={3}
      />

      <AiSummaryGenerator
        description={values.description}
        entityType="Plot thread"
        summary={values.summary}
        onApply={(nextSummary) => updateField("summary", nextSummary)}
      />

      <TextareaField
        label="Description"
        value={values.description}
        onChange={(value) => updateField("description", value)}
        placeholder="Longer internal description for how this thread develops through the project."
        rows={5}
      />

      <section className="grid gap-4 lg:grid-cols-2">
        <Field
          label="Book IDs"
          value={values.bookIds}
          onChange={(value) => updateField("bookIds", value)}
          placeholder="book_001"
          hint="Comma separated"
        />
        <Field
          label="Chapter IDs"
          value={values.chapterIds}
          onChange={(value) => updateField("chapterIds", value)}
          placeholder="chapter_001"
          hint="Comma separated"
        />
        <Field
          label="Character IDs"
          value={values.characterIds}
          onChange={(value) => updateField("characterIds", value)}
          placeholder="char_001"
          hint="Comma separated"
        />
        <Field
          label="Timeline event IDs"
          value={values.timelineEventIds}
          onChange={(value) => updateField("timelineEventIds", value)}
          placeholder="event_001"
          hint="Comma separated"
        />
        <Field
          label="Setup notes"
          value={values.setupNotes}
          onChange={(value) => updateField("setupNotes", value)}
          placeholder="The stolen key matches a hidden diagram."
          hint="Comma separated"
        />
        <Field
          label="Payoff notes"
          value={values.payoffNotes}
          onChange={(value) => updateField("payoffNotes", value)}
          placeholder="The city's official canon is publicly disproved."
          hint="Comma separated"
        />
      </section>

      <TextareaField
        label="Open questions"
        value={values.openQuestions}
        onChange={(value) => updateField("openQuestions", value)}
        placeholder="Who commissioned the theft?, Why is the last keeper missing?"
        rows={4}
        hint="Comma separated"
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

  function updateField<Key extends keyof PlotThreadFormValues>(
    key: Key,
    value: PlotThreadFormValues[Key]
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
