"use client";

import { AiSummaryGenerator } from "@/components/ai/ai-summary-generator";
import { useEffect, useState, type FormEvent } from "react";

import {
  createEmptyEraFormValues,
  ERA_STATUS_OPTIONS,
  normalizeEraFormValues,
  type EraFormValues,
  type NormalizedEraFormValues,
} from "@/types/era";

type EraFormProps = {
  initialValues?: EraFormValues;
  submitLabel: string;
  onSubmit: (values: NormalizedEraFormValues) => Promise<void>;
};

export function EraForm({ initialValues, submitLabel, onSubmit }: EraFormProps) {
  const [values, setValues] = useState<EraFormValues>(() =>
    initialValues ?? createEmptyEraFormValues()
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

    const normalizedValues = normalizeEraFormValues(values);

    if (!normalizedValues.name) {
      setError("Era name is required.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await onSubmit(normalizedValues);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to save this era.");
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
          placeholder="Ashen Recovery"
          required
        />
        <SelectField
          label="Status"
          value={values.status}
          onChange={(value) => updateField("status", value)}
          options={ERA_STATUS_OPTIONS}
        />
        <Field
          label="Start year"
          value={values.startYear}
          onChange={(value) => updateField("startYear", value)}
          placeholder="398"
          inputMode="numeric"
        />
        <Field
          label="End year"
          value={values.endYear}
          onChange={(value) => updateField("endYear", value)}
          placeholder="430"
          inputMode="numeric"
        />
      </section>

      <TextareaField
        label="Summary"
        value={values.summary}
        onChange={(value) => updateField("summary", value)}
        placeholder="Short historical overview for era list views."
        rows={3}
      />

      <AiSummaryGenerator
        description={values.description}
        entityType="Era"
        summary={values.summary}
        onApply={(nextSummary) => updateField("summary", nextSummary)}
      />

      <TextareaField
        label="Description"
        value={values.description}
        onChange={(value) => updateField("description", value)}
        placeholder="Longer internal description of what defines this era."
        rows={5}
      />

      <section className="grid gap-4 lg:grid-cols-2">
        <TextareaField
          label="Defining events"
          value={values.definingEvents}
          onChange={(value) => updateField("definingEvents", value)}
          placeholder="Postwar rebuilding of the ward network, Expansion of archive authority"
          rows={4}
          hint="Comma separated. Keep each item short."
        />
        <Field
          label="Key location IDs"
          value={values.keyLocations}
          onChange={(value) => updateField("keyLocations", value)}
          placeholder="loc_001, loc_archive_of_cinders"
          hint="Comma separated"
        />
        <Field
          label="Key faction IDs"
          value={values.keyFactions}
          onChange={(value) => updateField("keyFactions", value)}
          placeholder="faction_001"
          hint="Comma separated"
        />
        <Field
          label="Dominant theme IDs"
          value={values.dominantThemes}
          onChange={(value) => updateField("dominantThemes", value)}
          placeholder="theme_001"
          hint="Comma separated"
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

  function updateField<Key extends keyof EraFormValues>(key: Key, value: EraFormValues[Key]) {
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
