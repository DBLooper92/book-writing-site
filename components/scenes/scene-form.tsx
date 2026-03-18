"use client";

import { useEffect, useState, type FormEvent } from "react";

import {
  createEmptySceneFormValues,
  normalizeSceneFormValues,
  SCENE_STATUS_OPTIONS,
  SCENE_TYPE_OPTIONS,
  type NormalizedSceneFormValues,
  type SceneFormValues,
} from "@/types/scene";

type SceneFormProps = {
  initialValues?: SceneFormValues;
  submitLabel: string;
  onSubmit: (values: NormalizedSceneFormValues) => Promise<void>;
};

export function SceneForm({ initialValues, submitLabel, onSubmit }: SceneFormProps) {
  const [values, setValues] = useState<SceneFormValues>(() =>
    initialValues ?? createEmptySceneFormValues()
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

    const normalizedValues = normalizeSceneFormValues(values);

    if (!normalizedValues.title) {
      setError("Scene title is required.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await onSubmit(normalizedValues);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to save this scene.");
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
          placeholder="Scene 1: Embers at the Gate"
          required
        />
        <Field
          label="Book ID"
          value={values.bookId}
          onChange={(value) => updateField("bookId", value)}
          placeholder="book_ashes_of_dawn"
          hint="Raw book document ID for now."
        />
        <Field
          label="Chapter ID"
          value={values.chapterId}
          onChange={(value) => updateField("chapterId", value)}
          placeholder="chapter_1_smoke_over_greyfen"
          hint="Raw chapter document ID for now."
        />
        <Field
          label="Scene number"
          value={values.sceneNumber}
          onChange={(value) => updateField("sceneNumber", value)}
          placeholder="1"
          inputMode="numeric"
        />
        <SelectField
          label="Status"
          value={values.status}
          onChange={(value) => updateField("status", value)}
          options={SCENE_STATUS_OPTIONS}
        />
        <SelectField
          label="Scene type"
          value={values.sceneType}
          onChange={(value) => updateField("sceneType", value)}
          options={SCENE_TYPE_OPTIONS}
        />
        <Field
          label="POV character ID"
          value={values.pointOfViewCharacterId}
          onChange={(value) => updateField("pointOfViewCharacterId", value)}
          placeholder="char_001"
          hint="Optional character reference."
        />
      </section>

      <TextareaField
        label="Summary"
        value={values.summary}
        onChange={(value) => updateField("summary", value)}
        placeholder="One-paragraph summary for list views."
        rows={3}
      />

      <TextareaField
        label="Description"
        value={values.description}
        onChange={(value) => updateField("description", value)}
        placeholder="Longer planning description for this scene."
        rows={5}
      />

      <section className="grid gap-4 lg:grid-cols-3">
        <TextareaField
          label="Goal"
          value={values.goal}
          onChange={(value) => updateField("goal", value)}
          placeholder="What the viewpoint character wants in this scene."
          rows={4}
        />
        <TextareaField
          label="Conflict"
          value={values.conflict}
          onChange={(value) => updateField("conflict", value)}
          placeholder="What opposes that goal inside the scene."
          rows={4}
        />
        <TextareaField
          label="Outcome"
          value={values.outcome}
          onChange={(value) => updateField("outcome", value)}
          placeholder="How the scene lands and what changes."
          rows={4}
        />
      </section>

      <TextareaField
        label="Draft text"
        value={values.textDraft}
        onChange={(value) => updateField("textDraft", value)}
        placeholder="Optional draft excerpt or placeholder text for the scene."
        rows={8}
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

  function updateField<Key extends keyof SceneFormValues>(key: Key, value: SceneFormValues[Key]) {
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
