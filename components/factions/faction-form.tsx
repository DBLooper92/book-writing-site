"use client";

import { AiSummaryGenerator } from "@/components/ai/ai-summary-generator";
import {
  useEffect,
  useState,
  type FormEvent,
  type HTMLAttributes,
} from "react";

import {
  FACTION_STATUS_OPTIONS,
  FACTION_TYPE_OPTIONS,
  createEmptyFactionFormValues,
  normalizeFactionFormValues,
  type FactionFormValues,
  type NormalizedFactionFormValues,
} from "@/types/faction";

type FactionFormProps = {
  initialValues?: FactionFormValues;
  submitLabel: string;
  onSubmit: (values: NormalizedFactionFormValues) => Promise<void>;
};

export function FactionForm({
  initialValues,
  submitLabel,
  onSubmit,
}: FactionFormProps) {
  const [values, setValues] = useState<FactionFormValues>(() =>
    initialValues ?? createEmptyFactionFormValues()
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

    const normalizedValues = normalizeFactionFormValues(values);

    if (!normalizedValues.name) {
      setError("Faction name is required.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await onSubmit(normalizedValues);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to save this faction.");
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
          placeholder="Ember Wardens"
          required
        />
        <Field
          label="Government ID"
          value={values.governmentId}
          onChange={(value) => updateField("governmentId", value)}
          placeholder="government_001"
        />
        <SelectField
          label="Status"
          value={values.status}
          onChange={(value) => updateField("status", value)}
          options={FACTION_STATUS_OPTIONS}
        />
        <SelectField
          label="Faction type"
          value={values.factionType}
          onChange={(value) => updateField("factionType", value)}
          options={FACTION_TYPE_OPTIONS}
        />
        <Field
          label="Founded year"
          value={values.foundedYear}
          onChange={(value) => updateField("foundedYear", value)}
          placeholder="356"
          inputMode="numeric"
        />
        <Field
          label="Ended year"
          value={values.endedYear}
          onChange={(value) => updateField("endedYear", value)}
          placeholder="Optional"
          inputMode="numeric"
        />
      </section>

      <TextareaField
        label="Summary"
        value={values.summary}
        onChange={(value) => updateField("summary", value)}
        placeholder="One-paragraph overview for the faction list."
        rows={3}
      />

      <AiSummaryGenerator
        description={values.description}
        entityType="Faction"
        summary={values.summary}
        onApply={(nextSummary) => updateField("summary", nextSummary)}
      />

      <TextareaField
        label="Description"
        value={values.description}
        onChange={(value) => updateField("description", value)}
        placeholder="Longer internal description for story-bible use."
        rows={5}
      />

      <section className="grid gap-4 md:grid-cols-2">
        <Field
          label="Leader character IDs"
          value={values.leaderCharacterIds}
          onChange={(value) => updateField("leaderCharacterIds", value)}
          placeholder="char_warden, char_captain"
          hint="Comma separated"
        />
        <Field
          label="Base location IDs"
          value={values.baseLocationIds}
          onChange={(value) => updateField("baseLocationIds", value)}
          placeholder="loc_001, loc_gatehouse"
          hint="Comma separated"
        />
        <Field
          label="Goals"
          value={values.goals}
          onChange={(value) => updateField("goals", value)}
          placeholder="Preserve the ward network, prevent panic"
          hint="Comma separated"
        />
        <Field
          label="Resources"
          value={values.resources}
          onChange={(value) => updateField("resources", value)}
          placeholder="Signal towers, gatehouse crews"
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

  function updateField<Key extends keyof FactionFormValues>(
    key: Key,
    value: FactionFormValues[Key]
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
