"use client";

import { AiSummaryGenerator } from "@/components/ai/ai-summary-generator";
import { useEffect, useState, type FormEvent } from "react";

import {
  createEmptyItemFormValues,
  ITEM_STATUS_OPTIONS,
  normalizeItemFormValues,
  type ItemFormValues,
  type NormalizedItemFormValues,
} from "@/types/item";

type ItemFormProps = {
  initialValues?: ItemFormValues;
  submitLabel: string;
  onSubmit: (values: NormalizedItemFormValues) => Promise<void>;
};

export function ItemForm({ initialValues, submitLabel, onSubmit }: ItemFormProps) {
  const [values, setValues] = useState<ItemFormValues>(() =>
    initialValues ?? createEmptyItemFormValues()
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

    const normalizedValues = normalizeItemFormValues(values);

    if (!normalizedValues.name) {
      setError("Item name is required.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await onSubmit(normalizedValues);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to save this item.");
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
          placeholder="Ember Compass"
          required
        />
        <SelectField
          label="Status"
          value={values.status}
          onChange={(value) => updateField("status", value)}
          options={ITEM_STATUS_OPTIONS}
        />
        <Field
          label="Item type"
          value={values.itemType}
          onChange={(value) => updateField("itemType", value)}
          placeholder="artifact"
        />
        <Field
          label="Created year"
          value={values.createdYear}
          onChange={(value) => updateField("createdYear", value)}
          placeholder="401"
        />
      </section>

      <TextareaField
        label="Summary"
        value={values.summary}
        onChange={(value) => updateField("summary", value)}
        placeholder="Short overview for list views and quick browsing."
        rows={3}
      />

      <AiSummaryGenerator
        description={values.description}
        entityType="Item"
        summary={values.summary}
        onApply={(nextSummary) => updateField("summary", nextSummary)}
      />

      <TextareaField
        label="Description"
        value={values.description}
        onChange={(value) => updateField("description", value)}
        placeholder="Longer internal description covering history, usage, and role in canon."
        rows={5}
      />

      <section className="grid gap-4 md:grid-cols-2">
        <Field
          label="Owner character IDs"
          value={values.ownerCharacterIds}
          onChange={(value) => updateField("ownerCharacterIds", value)}
          placeholder="char_lyra_vale"
          hint="Comma separated"
        />
        <Field
          label="Location IDs"
          value={values.locationIds}
          onChange={(value) => updateField("locationIds", value)}
          placeholder="loc_greyfen"
          hint="Comma separated"
        />
        <Field
          label="Faction IDs"
          value={values.factionIds}
          onChange={(value) => updateField("factionIds", value)}
          placeholder="faction_ember_wardens"
          hint="Comma separated"
        />
        <Field
          label="Timeline event IDs"
          value={values.timelineEventIds}
          onChange={(value) => updateField("timelineEventIds", value)}
          placeholder="event_north_gate_theft"
          hint="Comma separated"
        />
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Field
          label="Material"
          value={values.material}
          onChange={(value) => updateField("material", value)}
          placeholder="Brass, smoked glass, ember filament"
        />
        <Field
          label="Abilities"
          value={values.abilities}
          onChange={(value) => updateField("abilities", value)}
          placeholder="Tracks unstable ember signatures"
          hint="Comma separated"
        />
        <Field
          label="Limitations"
          value={values.limitations}
          onChange={(value) => updateField("limitations", value)}
          placeholder="Needs intact ember lines to work"
          hint="Comma separated"
        />
      </section>

      <TextareaField
        label="Symbolic meaning"
        value={values.symbolicMeaning}
        onChange={(value) => updateField("symbolicMeaning", value)}
        placeholder="Optional thematic or personal meaning carried by the item."
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

  function updateField<Key extends keyof ItemFormValues>(key: Key, value: ItemFormValues[Key]) {
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
