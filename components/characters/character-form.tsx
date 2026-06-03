"use client";

import { AiSummaryGenerator } from "@/components/ai/ai-summary-generator";
import {
  useEffect,
  useState,
  type FormEvent,
  type HTMLAttributes,
} from "react";

import {
  CHARACTER_IMPORTANCE_LEVEL_OPTIONS,
  CHARACTER_STATUS_OPTIONS,
  CHARACTER_TYPE_OPTIONS,
  createEmptyCharacterFormValues,
  normalizeCharacterFormValues,
  type CharacterFormValues,
  type NormalizedCharacterFormValues,
} from "@/types/character";

type CharacterFormProps = {
  initialValues?: CharacterFormValues;
  submitLabel: string;
  onSubmit: (values: NormalizedCharacterFormValues) => Promise<void>;
};

export function CharacterForm({
  initialValues,
  submitLabel,
  onSubmit,
}: CharacterFormProps) {
  const [values, setValues] = useState<CharacterFormValues>(() =>
    initialValues ?? createEmptyCharacterFormValues()
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

    const normalizedValues = normalizeCharacterFormValues(values);

    if (!normalizedValues.name) {
      setError("Character name is required.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await onSubmit(normalizedValues);
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError.message : "Unable to save this character."
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
          placeholder="Lyra Vale"
          required
        />
        <Field
          label="Birth year"
          value={values.birthYear}
          onChange={(value) => updateField("birthYear", value)}
          placeholder="394"
          inputMode="numeric"
        />
        <SelectField
          label="Status"
          value={values.status}
          onChange={(value) => updateField("status", value)}
          options={CHARACTER_STATUS_OPTIONS}
        />
        <SelectField
          label="Character type"
          value={values.characterType}
          onChange={(value) => updateField("characterType", value)}
          options={CHARACTER_TYPE_OPTIONS}
        />
        <SelectField
          label="Importance level"
          value={values.importanceLevel}
          onChange={(value) => updateField("importanceLevel", value)}
          options={CHARACTER_IMPORTANCE_LEVEL_OPTIONS}
        />
        <Field
          label="Home location ID"
          value={values.homeLocationId}
          onChange={(value) => updateField("homeLocationId", value)}
          placeholder="loc_001"
        />
      </section>

      <TextareaField
        label="Summary"
        value={values.summary}
        onChange={(value) => updateField("summary", value)}
        placeholder="One-paragraph quick summary for list views."
        rows={3}
      />

      <AiSummaryGenerator
        description={values.description}
        entityType="Character"
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
          label="Aliases"
          value={values.aliases}
          onChange={(value) => updateField("aliases", value)}
          placeholder="Ashkeeper's Daughter, The Quiet Archivist"
          hint="Comma separated"
        />
        <Field
          label="Occupation"
          value={values.occupation}
          onChange={(value) => updateField("occupation", value)}
          placeholder="Archive field registrar, investigator"
          hint="Comma separated"
        />
        <Field
          label="Traits"
          value={values.traits}
          onChange={(value) => updateField("traits", value)}
          placeholder="observant, guarded, persistent"
          hint="Comma separated"
        />
        <Field
          label="Flaws"
          value={values.flaws}
          onChange={(value) => updateField("flaws", value)}
          placeholder="withholds information, overcommits"
          hint="Comma separated"
        />
      </section>

      <TextareaField
        label="Motivations"
        value={values.motivations}
        onChange={(value) => updateField("motivations", value)}
        placeholder="Protect Greyfen, uncover the altered record"
        rows={3}
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

  function updateField<Key extends keyof CharacterFormValues>(
    key: Key,
    value: CharacterFormValues[Key]
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
