"use client";

import { AiSummaryGenerator } from "@/components/ai/ai-summary-generator";
import { useEffect, useState, type FormEvent } from "react";

import {
  createEmptySpeciesFormValues,
  normalizeSpeciesFormValues,
  SPECIES_STATUS_OPTIONS,
  type NormalizedSpeciesFormValues,
  type SpeciesFormValues,
} from "@/types/species";

type SpeciesFormProps = {
  initialValues?: SpeciesFormValues;
  submitLabel: string;
  onSubmit: (values: NormalizedSpeciesFormValues) => Promise<void>;
};

export function SpeciesForm({
  initialValues,
  submitLabel,
  onSubmit,
}: SpeciesFormProps) {
  const [values, setValues] = useState<SpeciesFormValues>(() =>
    initialValues ?? createEmptySpeciesFormValues()
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

    const normalizedValues = normalizeSpeciesFormValues(values);

    if (!normalizedValues.name) {
      setError("Species name is required.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await onSubmit(normalizedValues);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to save this species.");
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
          placeholder="Humans of Aster"
          required
        />
        <SelectField
          label="Status"
          value={values.status}
          onChange={(value) => updateField("status", value)}
          options={SPECIES_STATUS_OPTIONS}
        />
        <Field
          label="Origin"
          value={values.origin}
          onChange={(value) => updateField("origin", value)}
          placeholder="Native peoples of the Aster basin."
        />
        <Field
          label="Lifespan"
          value={values.lifespan}
          onChange={(value) => updateField("lifespan", value)}
          placeholder="Roughly 60 to 90 years."
        />
      </section>

      <TextareaField
        label="Summary"
        value={values.summary}
        onChange={(value) => updateField("summary", value)}
        placeholder="One-paragraph overview for species list views."
        rows={3}
      />

      <AiSummaryGenerator
        description={values.description}
        entityType="Species"
        summary={values.summary}
        onApply={(nextSummary) => updateField("summary", nextSummary)}
      />

      <TextareaField
        label="Description"
        value={values.description}
        onChange={(value) => updateField("description", value)}
        placeholder="Longer internal species description for worldbuilding reference."
        rows={5}
      />

      <section className="grid gap-4 md:grid-cols-2">
        <TextareaField
          label="Appearance"
          value={values.appearance}
          onChange={(value) => updateField("appearance", value)}
          placeholder="Broad appearance notes and recurring visual markers."
          rows={4}
        />
        <TextareaField
          label="Biology"
          value={values.biology}
          onChange={(value) => updateField("biology", value)}
          placeholder="Baseline physiology and body-system notes."
          rows={4}
        />
        <TextareaField
          label="Reproduction"
          value={values.reproduction}
          onChange={(value) => updateField("reproduction", value)}
          placeholder="Reproduction notes and family-line considerations."
          rows={4}
        />
        <TextareaField
          label="Diet"
          value={values.diet}
          onChange={(value) => updateField("diet", value)}
          placeholder="Typical food sources and dietary constraints."
          rows={4}
        />
        <TextareaField
          label="Psychology"
          value={values.psychology}
          onChange={(value) => updateField("psychology", value)}
          placeholder="Behavioral tendencies and cognition notes."
          rows={4}
        />
        <TextareaField
          label="Social structure"
          value={values.socialStructure}
          onChange={(value) => updateField("socialStructure", value)}
          placeholder="Households, castes, kinship systems, or civic structure."
          rows={4}
        />
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Field
          label="Abilities"
          value={values.abilities}
          onChange={(value) => updateField("abilities", value)}
          placeholder="Adaptive learning, tool use"
          hint="Comma separated"
        />
        <Field
          label="Limitations"
          value={values.limitations}
          onChange={(value) => updateField("limitations", value)}
          placeholder="No natural ember resistance"
          hint="Comma separated"
        />
        <Field
          label="Notable subgroups"
          value={values.notableSubgroups}
          onChange={(value) => updateField("notableSubgroups", value)}
          placeholder="Fenfolk, Highbank clans"
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

  function updateField<Key extends keyof SpeciesFormValues>(
    key: Key,
    value: SpeciesFormValues[Key]
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
