"use client";

import { useEffect, useState, type FormEvent } from "react";

import {
  createEmptyReligionFormValues,
  normalizeReligionFormValues,
  RELIGION_STATUS_OPTIONS,
  type NormalizedReligionFormValues,
  type ReligionFormValues,
} from "@/types/religion";

type ReligionFormProps = {
  initialValues?: ReligionFormValues;
  submitLabel: string;
  onSubmit: (values: NormalizedReligionFormValues) => Promise<void>;
};

export function ReligionForm({
  initialValues,
  submitLabel,
  onSubmit,
}: ReligionFormProps) {
  const [values, setValues] = useState<ReligionFormValues>(() =>
    initialValues ?? createEmptyReligionFormValues()
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

    const normalizedValues = normalizeReligionFormValues(values);

    if (!normalizedValues.name) {
      setError("Religion name is required.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await onSubmit(normalizedValues);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to save this religion.");
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
          placeholder="Church of the First Flame"
          required
        />
        <SelectField
          label="Status"
          value={values.status}
          onChange={(value) => updateField("status", value)}
          options={RELIGION_STATUS_OPTIONS}
        />
        <Field
          label="Deity or focus"
          value={values.deityOrFocus}
          onChange={(value) => updateField("deityOrFocus", value)}
          placeholder="The first ordered flame that teaches remembrance"
        />
        <Field
          label="Belief system type"
          value={values.beliefSystemType}
          onChange={(value) => updateField("beliefSystemType", value)}
          placeholder="State-adjacent religion"
        />
      </section>

      <TextareaField
        label="Summary"
        value={values.summary}
        onChange={(value) => updateField("summary", value)}
        placeholder="One-paragraph overview for religion list views."
        rows={3}
      />

      <TextareaField
        label="Description"
        value={values.description}
        onChange={(value) => updateField("description", value)}
        placeholder="Longer internal description for doctrine, history, and civic role."
        rows={5}
      />

      <section className="grid gap-4 lg:grid-cols-2">
        <Field
          label="Core beliefs"
          value={values.coreBeliefs}
          onChange={(value) => updateField("coreBeliefs", value)}
          placeholder="Memory is sacred labor, Fire reveals truth when tended honestly"
          hint="Comma separated"
        />
        <Field
          label="Rituals"
          value={values.rituals}
          onChange={(value) => updateField("rituals", value)}
          placeholder="Lantern vigils, Ash blessings"
          hint="Comma separated"
        />
        <Field
          label="Holy site IDs"
          value={values.holySites}
          onChange={(value) => updateField("holySites", value)}
          placeholder="loc_001"
          hint="Comma separated"
        />
        <Field
          label="Associated culture IDs"
          value={values.associatedCultures}
          onChange={(value) => updateField("associatedCultures", value)}
          placeholder="culture_001"
          hint="Comma separated"
        />
        <Field
          label="Associated organization IDs"
          value={values.associatedOrganizations}
          onChange={(value) => updateField("associatedOrganizations", value)}
          placeholder="organization_001"
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

  function updateField<Key extends keyof ReligionFormValues>(
    key: Key,
    value: ReligionFormValues[Key]
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
