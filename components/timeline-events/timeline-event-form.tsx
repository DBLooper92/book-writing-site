"use client";

import { useEffect, useState, type FormEvent } from "react";

import {
  createEmptyTimelineEventFormValues,
  normalizeTimelineEventFormValues,
  TIMELINE_EVENT_STATUS_OPTIONS,
  TIMELINE_EVENT_TYPE_OPTIONS,
  type NormalizedTimelineEventFormValues,
  type TimelineEventFormValues,
} from "@/types/timeline-event";

type TimelineEventFormProps = {
  initialValues?: TimelineEventFormValues;
  submitLabel: string;
  onSubmit: (values: NormalizedTimelineEventFormValues) => Promise<void>;
};

export function TimelineEventForm({
  initialValues,
  submitLabel,
  onSubmit,
}: TimelineEventFormProps) {
  const [values, setValues] = useState<TimelineEventFormValues>(() =>
    initialValues ?? createEmptyTimelineEventFormValues()
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

    const normalizedValues = normalizeTimelineEventFormValues(values);

    if (!normalizedValues.title) {
      setError("Timeline event title is required.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await onSubmit(normalizedValues);
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError.message : "Unable to save this timeline event."
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
          placeholder="The North Gate Ember Theft"
          required
        />
        <Field
          label="Display date label"
          value={values.displayDateLabel}
          onChange={(value) => updateField("displayDateLabel", value)}
          placeholder="Winter, 412 AE"
          hint="Human-readable chronology label for lists and detail views."
        />
        <SelectField
          label="Status"
          value={values.status}
          onChange={(value) => updateField("status", value)}
          options={TIMELINE_EVENT_STATUS_OPTIONS}
        />
        <SelectField
          label="Event type"
          value={values.eventType}
          onChange={(value) => updateField("eventType", value)}
          options={TIMELINE_EVENT_TYPE_OPTIONS}
        />
        <Field
          label="Start year"
          value={values.yearStart}
          onChange={(value) => updateField("yearStart", value)}
          placeholder="412"
          inputMode="numeric"
        />
        <Field
          label="End year"
          value={values.yearEnd}
          onChange={(value) => updateField("yearEnd", value)}
          placeholder="412"
          inputMode="numeric"
        />
        <Field
          label="Era ID"
          value={values.eraId}
          onChange={(value) => updateField("eraId", value)}
          placeholder="era_001"
          hint="Optional direct era reference."
        />
      </section>

      <TextareaField
        label="Summary"
        value={values.summary}
        onChange={(value) => updateField("summary", value)}
        placeholder="Short chronology summary for list views."
        rows={3}
      />

      <TextareaField
        label="Description"
        value={values.description}
        onChange={(value) => updateField("description", value)}
        placeholder="Longer explanation of what happens during this event."
        rows={5}
      />

      <section className="grid gap-4 lg:grid-cols-2">
        <Field
          label="Book IDs"
          value={values.bookIds}
          onChange={(value) => updateField("bookIds", value)}
          placeholder="book_001, book_ashes_of_dawn"
          hint="Comma-separated for now."
        />
        <Field
          label="Chapter IDs"
          value={values.chapterIds}
          onChange={(value) => updateField("chapterIds", value)}
          placeholder="chapter_001"
          hint="Comma-separated for now."
        />
        <Field
          label="Scene IDs"
          value={values.sceneIds}
          onChange={(value) => updateField("sceneIds", value)}
          placeholder="scene_001"
          hint="Comma-separated for now."
        />
        <Field
          label="Character IDs"
          value={values.characterIds}
          onChange={(value) => updateField("characterIds", value)}
          placeholder="char_001, char_lyra_vale"
          hint="Comma-separated for now."
        />
        <Field
          label="Location IDs"
          value={values.locationIds}
          onChange={(value) => updateField("locationIds", value)}
          placeholder="loc_001"
          hint="Comma-separated for now."
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <TextareaField
          label="Causes"
          value={values.causes}
          onChange={(value) => updateField("causes", value)}
          placeholder="Neglected relay maintenance, covert buyer pressure"
          rows={4}
          hint="Comma-separated. Keep each item short."
        />
        <TextareaField
          label="Consequences"
          value={values.consequences}
          onChange={(value) => updateField("consequences", value)}
          placeholder="North Gate loses a stable ward flame, investigation begins"
          rows={4}
          hint="Comma-separated. Keep each item short."
        />
      </section>

      <TextareaField
        label="Public wiki summary"
        value={values.publicWikiSummary}
        onChange={(value) => updateField("publicWikiSummary", value)}
        placeholder="Optional outward-facing encyclopedia summary."
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

  function updateField<Key extends keyof TimelineEventFormValues>(
    key: Key,
    value: TimelineEventFormValues[Key]
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
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  required?: boolean;
  hint?: string;
  inputMode?: "numeric";
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
        inputMode={inputMode}
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
