"use client";

import { AiSummaryGenerator } from "@/components/ai/ai-summary-generator";
import { useEffect, useState, type FormEvent } from "react";

import {
  createEmptyRelationshipFormValues,
  normalizeRelationshipFormValues,
  RELATIONSHIP_ENTITY_TYPE_OPTIONS,
  RELATIONSHIP_STATUS_OPTIONS,
  RELATIONSHIP_TYPE_OPTIONS,
  type NormalizedRelationshipFormValues,
  type RelationshipFormValues,
} from "@/types/relationship";

type RelationshipFormProps = {
  initialValues?: RelationshipFormValues;
  submitLabel: string;
  onSubmit: (values: NormalizedRelationshipFormValues) => Promise<void>;
};

export function RelationshipForm({
  initialValues,
  submitLabel,
  onSubmit,
}: RelationshipFormProps) {
  const [values, setValues] = useState<RelationshipFormValues>(() =>
    initialValues ?? createEmptyRelationshipFormValues()
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

    const normalizedValues = normalizeRelationshipFormValues(values);

    if (!normalizedValues.title) {
      setError("Relationship title is required.");
      return;
    }

    if (!normalizedValues.entityAId || !normalizedValues.entityBId) {
      setError("Both linked entity IDs are required.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await onSubmit(normalizedValues);
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError.message : "Unable to save this relationship."
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
          placeholder="Lyra Vale and the Ember Wardens"
          required
        />
        <Field
          label="Dynamic status"
          value={values.dynamicStatus}
          onChange={(value) => updateField("dynamicStatus", value)}
          placeholder="Strained loyalty"
          hint="Short phrase describing the current state of the connection."
        />
        <SelectField
          label="Status"
          value={values.status}
          onChange={(value) => updateField("status", value)}
          options={RELATIONSHIP_STATUS_OPTIONS}
        />
        <SelectField
          label="Relationship type"
          value={values.relationshipType}
          onChange={(value) => updateField("relationshipType", value)}
          options={RELATIONSHIP_TYPE_OPTIONS}
        />
      </section>

      <TextareaField
        label="Summary"
        value={values.summary}
        onChange={(value) => updateField("summary", value)}
        placeholder="Short connection summary for list views."
        rows={3}
      />

      <AiSummaryGenerator
        description={values.description}
        entityType="Relationship"
        summary={values.summary}
        onApply={(nextSummary) => updateField("summary", nextSummary)}
      />

      <TextareaField
        label="Description"
        value={values.description}
        onChange={(value) => updateField("description", value)}
        placeholder="Longer internal explanation of the relationship."
        rows={5}
      />

      <section className="grid gap-4 md:grid-cols-2">
        <SelectField
          label="Entity A type"
          value={values.entityAType}
          onChange={(value) => updateField("entityAType", value)}
          options={RELATIONSHIP_ENTITY_TYPE_OPTIONS}
        />
        <Field
          label="Entity A ID"
          value={values.entityAId}
          onChange={(value) => updateField("entityAId", value)}
          placeholder="char_001"
          required
        />
        <SelectField
          label="Entity B type"
          value={values.entityBType}
          onChange={(value) => updateField("entityBType", value)}
          options={RELATIONSHIP_ENTITY_TYPE_OPTIONS}
        />
        <Field
          label="Entity B ID"
          value={values.entityBId}
          onChange={(value) => updateField("entityBId", value)}
          placeholder="faction_001"
          required
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <TextareaField
          label="History"
          value={values.history}
          onChange={(value) => updateField("history", value)}
          placeholder="Background and development of the relationship."
          rows={5}
        />
        <div className="space-y-4">
          <TextareaField
            label="Tensions"
            value={values.tensions}
            onChange={(value) => updateField("tensions", value)}
            placeholder="Ward secrecy, missing ledgers, conflicting duties"
            rows={4}
            hint="Comma-separated. Keep each item short."
          />
          <TextareaField
            label="Strengths"
            value={values.strengths}
            onChange={(value) => updateField("strengths", value)}
            placeholder="Shared duty, crisis familiarity, mutual knowledge"
            rows={4}
            hint="Comma-separated. Keep each item short."
          />
        </div>
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

  function updateField<Key extends keyof RelationshipFormValues>(
    key: Key,
    value: RelationshipFormValues[Key]
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
