"use client";

import { useEffect, useState, type FormEvent } from "react";

import {
  createEmptyGovernmentFormValues,
  GOVERNMENT_STATUS_OPTIONS,
  GOVERNMENT_TYPE_OPTIONS,
  normalizeGovernmentFormValues,
  type GovernmentFormValues,
  type NormalizedGovernmentFormValues,
} from "@/types/government";

type GovernmentFormProps = {
  initialValues?: GovernmentFormValues;
  submitLabel: string;
  onSubmit: (values: NormalizedGovernmentFormValues) => Promise<void>;
};

export function GovernmentForm({
  initialValues,
  submitLabel,
  onSubmit,
}: GovernmentFormProps) {
  const [values, setValues] = useState<GovernmentFormValues>(() =>
    initialValues ?? createEmptyGovernmentFormValues()
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

    const normalizedValues = normalizeGovernmentFormValues(values);

    if (!normalizedValues.name) {
      setError("Government name is required.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await onSubmit(normalizedValues);
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError.message : "Unable to save this government."
      );
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
          placeholder="Greyfen Council"
          required
        />
        <Field
          label="Seat location ID"
          value={values.seatLocationId}
          onChange={(value) => updateField("seatLocationId", value)}
          placeholder="loc_001"
        />
        <SelectField
          label="Status"
          value={values.status}
          onChange={(value) => updateField("status", value)}
          options={GOVERNMENT_STATUS_OPTIONS}
        />
        <SelectField
          label="Government type"
          value={values.governmentType}
          onChange={(value) => updateField("governmentType", value)}
          options={GOVERNMENT_TYPE_OPTIONS}
        />
      </section>

      <TextareaField
        label="Summary"
        value={values.summary}
        onChange={(value) => updateField("summary", value)}
        placeholder="One-paragraph overview for government list views."
        rows={3}
      />

      <TextareaField
        label="Description"
        value={values.description}
        onChange={(value) => updateField("description", value)}
        placeholder="Longer internal description for government structure, role, and history."
        rows={5}
      />

      <section className="grid gap-4 lg:grid-cols-2">
        <Field
          label="Leader titles"
          value={values.leaderTitles}
          onChange={(value) => updateField("leaderTitles", value)}
          placeholder="First Speaker, Harbor Warden"
          hint="Comma separated"
        />
        <Field
          label="Faction IDs"
          value={values.factionIds}
          onChange={(value) => updateField("factionIds", value)}
          placeholder="faction_001"
          hint="Comma separated"
        />
        <Field
          label="Organization IDs"
          value={values.organizationIds}
          onChange={(value) => updateField("organizationIds", value)}
          placeholder="organization_001"
          hint="Comma separated"
        />
        <Field
          label="Law priorities"
          value={values.lawPriorities}
          onChange={(value) => updateField("lawPriorities", value)}
          placeholder="Maintain ward infrastructure, Preserve public order"
          hint="Comma separated"
        />
      </section>

      <TextareaField
        label="Jurisdiction notes"
        value={values.jurisdictionNotes}
        onChange={(value) => updateField("jurisdictionNotes", value)}
        placeholder="Scope of authority, geographic reach, and boundary notes."
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

  function updateField<Key extends keyof GovernmentFormValues>(
    key: Key,
    value: GovernmentFormValues[Key]
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
