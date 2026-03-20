"use client";

import { useState, type FormEvent } from "react";

import {
  useTimelineFormOptions,
  type TimelineFormOptionsResult,
} from "@/hooks/use-timeline-form-options";
import {
  getTimelineReferenceSelectionIssues,
  type TimelineReferenceOption,
} from "@/lib/timeline/references";
import {
  createEmptyTimelineEventFormValues,
  normalizeTimelineEventFormValues,
  TIMELINE_EVENT_STATUS_OPTIONS,
  TIMELINE_EVENT_TYPE_OPTIONS,
  type NormalizedTimelineEventFormValues,
  type TimelineEventFormValues,
  validateNormalizedTimelineEventFormValues,
} from "@/types/timeline-event";

type TimelineEventFormProps = {
  currentTimelineEventId?: string | null;
  initialValues?: TimelineEventFormValues;
  onCancel?: () => void;
  pickerData?: TimelineFormOptionsResult;
  submitLabel: string;
  onSubmit: (values: NormalizedTimelineEventFormValues) => Promise<void>;
};

export function TimelineEventForm({
  currentTimelineEventId,
  initialValues,
  onCancel,
  pickerData,
  submitLabel,
  onSubmit,
}: TimelineEventFormProps) {
  const [values, setValues] = useState<TimelineEventFormValues>(
    initialValues ?? createEmptyTimelineEventFormValues()
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hookFormOptions = useTimelineFormOptions(currentTimelineEventId);
  const formOptions = pickerData ?? hookFormOptions;
  const referenceIssues =
    !formOptions.loading && !formOptions.error
      ? getTimelineReferenceSelectionIssues(
          {
            eraId: values.eraId.trim() || null,
            bookIds: values.bookIds,
            chapterIds: values.chapterIds,
            sceneIds: values.sceneIds,
            characterIds: values.characterIds,
            locationIds: values.locationIds,
            factionIds: values.factionIds,
            cultureIds: values.cultureIds,
            religionIds: values.religionIds,
            technologyIds: values.technologyIds,
            plotThreadIds: values.plotThreadIds,
            themeIds: values.themeIds,
            predecessorEventIds: values.predecessorEventIds,
            successorEventIds: values.successorEventIds,
          },
          formOptions.referenceSets
        )
      : [];

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedValues = normalizeTimelineEventFormValues(values);
    const validationResult = validateNormalizedTimelineEventFormValues(normalizedValues, {
      currentTimelineEventId,
    });

    if (validationResult.errors.length > 0) {
      setError(validationResult.errors[0]);
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
    <form className="space-y-8" onSubmit={handleSubmit}>
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
        <SelectField
          label="Era"
          value={values.eraId}
          onChange={(value) => updateField("eraId", value)}
          options={formOptions.eraOptions}
          includeEmptyOption
          emptyLabel="No era linked"
          hint="Optional historical anchor for the event."
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

      <section className="space-y-4">
        <SectionHeader
          title="Manuscript links"
          description="Connect this event to the relevant book structure."
        />
        <div className="grid gap-4 lg:grid-cols-3">
          <MultiPickerField
            label="Books"
            values={values.bookIds}
            options={formOptions.bookOptions}
            onChange={(nextValues) => updateField("bookIds", nextValues)}
            hint="Select one or more books tied to this event."
            loading={formOptions.loading}
          />
          <MultiPickerField
            label="Chapters"
            values={values.chapterIds}
            options={formOptions.chapterOptions}
            onChange={(nextValues) => updateField("chapterIds", nextValues)}
            hint="Useful when the chronology maps closely to chapter structure."
            loading={formOptions.loading}
          />
          <MultiPickerField
            label="Scenes"
            values={values.sceneIds}
            options={formOptions.sceneOptions}
            onChange={(nextValues) => updateField("sceneIds", nextValues)}
            hint="Attach scenes that directly depict this event."
            loading={formOptions.loading}
          />
        </div>
      </section>

      <section className="space-y-4">
        <SectionHeader
          title="People and places"
          description="Connect the event to the characters and locations already in the project."
        />
        <div className="grid gap-4 lg:grid-cols-2">
          <MultiPickerField
            label="Characters"
            values={values.characterIds}
            options={formOptions.characterOptions}
            onChange={(nextValues) => updateField("characterIds", nextValues)}
            loading={formOptions.loading}
          />
          <MultiPickerField
            label="Locations"
            values={values.locationIds}
            options={formOptions.locationOptions}
            onChange={(nextValues) => updateField("locationIds", nextValues)}
            loading={formOptions.loading}
          />
        </div>
      </section>

      <section className="space-y-4">
        <SectionHeader
          title="Worldbuilding links"
          description="Add the world-level slices involved in the event."
        />
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          <MultiPickerField
            label="Factions"
            values={values.factionIds}
            options={formOptions.factionOptions}
            onChange={(nextValues) => updateField("factionIds", nextValues)}
            loading={formOptions.loading}
          />
          <MultiPickerField
            label="Cultures"
            values={values.cultureIds}
            options={formOptions.cultureOptions}
            onChange={(nextValues) => updateField("cultureIds", nextValues)}
            loading={formOptions.loading}
          />
          <MultiPickerField
            label="Religions"
            values={values.religionIds}
            options={formOptions.religionOptions}
            onChange={(nextValues) => updateField("religionIds", nextValues)}
            loading={formOptions.loading}
          />
          <MultiPickerField
            label="Technologies"
            values={values.technologyIds}
            options={formOptions.technologyOptions}
            onChange={(nextValues) => updateField("technologyIds", nextValues)}
            loading={formOptions.loading}
          />
          <MultiPickerField
            label="Plot threads"
            values={values.plotThreadIds}
            options={formOptions.plotThreadOptions}
            onChange={(nextValues) => updateField("plotThreadIds", nextValues)}
            loading={formOptions.loading}
          />
          <MultiPickerField
            label="Themes"
            values={values.themeIds}
            options={formOptions.themeOptions}
            onChange={(nextValues) => updateField("themeIds", nextValues)}
            loading={formOptions.loading}
          />
        </div>
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

      <section className="space-y-4">
        <SectionHeader
          title="Continuity links"
          description="Define what leads into this event and what follows from it."
        />
        <div className="grid gap-4 lg:grid-cols-2">
          <MultiPickerField
            label="Predecessor events"
            values={values.predecessorEventIds}
            options={formOptions.timelineEventOptions}
            onChange={(nextValues) => updateField("predecessorEventIds", nextValues)}
            hint="Events that feed into this one."
            loading={formOptions.loading}
          />
          <MultiPickerField
            label="Successor events"
            values={values.successorEventIds}
            options={formOptions.timelineEventOptions}
            onChange={(nextValues) => updateField("successorEventIds", nextValues)}
            hint="Events that happen because of this one."
            loading={formOptions.loading}
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

      {formOptions.error ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Some picker data could not be loaded. You can still write the rest of the event.
        </div>
      ) : null}

      {referenceIssues.length > 0 ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="font-medium">Some stored links no longer match current project records.</p>
          <div className="mt-2 space-y-1">
            {referenceIssues.map((issue) => (
              <p key={issue}>{issue}</p>
            ))}
          </div>
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex h-12 items-center justify-center rounded-full bg-zinc-950 px-5 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-300"
        >
          {submitting ? "Saving..." : submitLabel}
        </button>
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex h-12 items-center justify-center rounded-full border border-zinc-200 px-5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
          >
            Cancel
          </button>
        ) : null}
      </div>
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

function SectionHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div>
      <h3 className="text-lg font-semibold tracking-tight text-zinc-950">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-zinc-600">{description}</p>
    </div>
  );
}

function SelectField<Value extends string>({
  label,
  value,
  onChange,
  options,
  includeEmptyOption = false,
  emptyLabel = "None",
  hint,
}: {
  label: string;
  value: Value;
  onChange: (value: Value) => void;
  options: ReadonlyArray<{ value: Value; label: string; meta?: string }>;
  includeEmptyOption?: boolean;
  emptyLabel?: string;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-zinc-700">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as Value)}
        className="h-12 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-sm text-zinc-950 outline-none transition focus:border-zinc-400"
      >
        {includeEmptyOption ? <option value="">{emptyLabel}</option> : null}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {hint ? <span className="mt-2 block text-xs text-zinc-500">{hint}</span> : null}
    </label>
  );
}

function MultiPickerField({
  label,
  values,
  options,
  onChange,
  loading,
  hint,
}: {
  label: string;
  values: string[];
  options: TimelineReferenceOption[];
  onChange: (values: string[]) => void;
  loading: boolean;
  hint?: string;
}) {
  const [pendingValue, setPendingValue] = useState("");
  const selectedOptionMap = new Map(options.map((option) => [option.value, option]));
  const availableOptions = options.filter((option) => !values.includes(option.value));

  function handleAdd(nextValue: string) {
    if (!nextValue) {
      return;
    }

    onChange([...values, nextValue]);
    setPendingValue("");
  }

  function handleRemove(valueToRemove: string) {
    onChange(values.filter((value) => value !== valueToRemove));
  }

  return (
    <div className="rounded-3xl border border-zinc-200 bg-zinc-50 p-4">
      <p className="text-sm font-medium text-zinc-700">{label}</p>

      <div className="mt-3 flex min-h-11 flex-wrap gap-2">
        {values.length > 0 ? (
          values.map((selectedValue) => {
            const selectedOption = selectedOptionMap.get(selectedValue);

            return (
              <button
                key={selectedValue}
                type="button"
                onClick={() => handleRemove(selectedValue)}
                className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-sm text-zinc-700 ring-1 ring-zinc-200 transition hover:bg-zinc-100"
              >
                <span>{selectedOption?.label ?? selectedValue}</span>
                <span className="text-zinc-400">x</span>
              </button>
            );
          })
        ) : (
          <span className="text-sm text-zinc-500">Nothing linked yet.</span>
        )}
      </div>

      <div className="mt-4">
        <select
          value={pendingValue}
          onChange={(event) => handleAdd(event.target.value)}
          disabled={loading || availableOptions.length === 0}
          className="h-11 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-sm text-zinc-950 outline-none transition focus:border-zinc-400 disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-400"
        >
          <option value="">
            {loading
              ? `Loading ${label.toLowerCase()}...`
              : availableOptions.length > 0
                ? `Add ${label.toLowerCase().replace(/s$/, "")}`
                : `No more ${label.toLowerCase()} available`}
          </option>
          {availableOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.meta ? `${option.label} - ${option.meta}` : option.label}
            </option>
          ))}
        </select>
      </div>

      {hint ? <p className="mt-3 text-xs text-zinc-500">{hint}</p> : null}
    </div>
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
