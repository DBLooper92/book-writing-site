"use client";

import { useState, type FormEvent, type ReactNode } from "react";

import { BookForm } from "@/components/books/book-form";
import { ChapterForm } from "@/components/chapters/chapter-form";
import { CharacterForm } from "@/components/characters/character-form";
import { CultureForm } from "@/components/cultures/culture-form";
import { EraForm } from "@/components/eras/era-form";
import { FactionForm } from "@/components/factions/faction-form";
import { LocationForm } from "@/components/locations/location-form";
import { PlotThreadForm } from "@/components/plot-threads/plot-thread-form";
import { ReligionForm } from "@/components/religions/religion-form";
import { SceneForm } from "@/components/scenes/scene-form";
import { TechnologyForm } from "@/components/technologies/technology-form";
import { ThemeForm } from "@/components/themes/theme-form";
import {
  useTimelineFormOptions,
  type TimelineFormOptionsResult,
} from "@/hooks/use-timeline-form-options";
import { createCharacterForProject } from "@/lib/data/characters";
import { createChapterForProject } from "@/lib/data/chapters";
import { createCultureForProject } from "@/lib/data/cultures";
import { createEraForProject } from "@/lib/data/eras";
import { createFactionForProject } from "@/lib/data/factions";
import { createLocationForProject } from "@/lib/data/locations";
import { createPlotThreadForProject } from "@/lib/data/plot-threads";
import { createReligionForProject } from "@/lib/data/religions";
import { createSceneForProject } from "@/lib/data/scenes";
import { createTechnologyForProject } from "@/lib/data/technologies";
import { createThemeForProject } from "@/lib/data/themes";
import { createBookForProject } from "@/lib/data/books";
import {
  buildTimelineReferenceMap,
  buildTimelineReferenceSet,
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

type TimelineInlineCreationContext = {
  activeProjectId: string;
  uid: string;
};

type TimelineEventFormProps = {
  currentTimelineEventId?: string | null;
  initialValues?: TimelineEventFormValues;
  inlineCreationContext?: TimelineInlineCreationContext | null;
  onCancel?: () => void;
  pickerData?: TimelineFormOptionsResult;
  submitLabel: string;
  onSubmit: (values: NormalizedTimelineEventFormValues) => Promise<void>;
};

type CreateableTimelineFieldKey =
  | "eraId"
  | "bookIds"
  | "chapterIds"
  | "sceneIds"
  | "characterIds"
  | "locationIds"
  | "factionIds"
  | "cultureIds"
  | "religionIds"
  | "technologyIds"
  | "plotThreadIds"
  | "themeIds";

type TimelineInlineCreateTarget =
  | "era"
  | "book"
  | "chapter"
  | "scene"
  | "character"
  | "location"
  | "faction"
  | "culture"
  | "religion"
  | "technology"
  | "plotThread"
  | "theme";

type TimelineInlineCreateState = {
  description: string;
  fieldKey: CreateableTimelineFieldKey;
  target: TimelineInlineCreateTarget;
  title: string;
};

type TemporaryReferenceOptions = Partial<
  Record<TimelineInlineCreateTarget, TimelineReferenceOption[]>
>;

export function TimelineEventForm({
  currentTimelineEventId,
  initialValues,
  inlineCreationContext,
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
  const [inlineCreateState, setInlineCreateState] =
    useState<TimelineInlineCreateState | null>(null);
  const [temporaryOptionsByTarget, setTemporaryOptionsByTarget] =
    useState<TemporaryReferenceOptions>({});
  const hookFormOptions = useTimelineFormOptions(currentTimelineEventId);
  const formOptions = mergeTimelineFormOptions(
    pickerData ?? hookFormOptions,
    temporaryOptionsByTarget
  );
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
            predecessorEventIds: [],
            successorEventIds: [],
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

  function openInlineCreate(nextState: TimelineInlineCreateState) {
    setInlineCreateState(nextState);
  }

  function handleInlineCreateSuccess(
    fieldKey: CreateableTimelineFieldKey,
    target: TimelineInlineCreateTarget,
    option: TimelineReferenceOption
  ) {
    if (error) {
      setError(null);
    }

    setTemporaryOptionsByTarget((current) => ({
      ...current,
      [target]: mergeReferenceOptions(current[target] ?? [], [option]),
    }));
    setValues((current) => applyCreatedReferenceSelection(current, fieldKey, option.value));
    setInlineCreateState(null);
  }

  return (
    <>
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
          <SelectField
            label="Era"
            value={values.eraId}
            onChange={(value) => updateField("eraId", value)}
            options={formOptions.eraOptions}
            includeEmptyOption
            emptyLabel="No era linked"
            hint="Optional historical anchor for the event."
            action={
              inlineCreationContext ? (
                <InlineCreateButton
                  label="Create era"
                  onClick={() =>
                    openInlineCreate({
                      description: "Add a new era and link it immediately to this event.",
                      fieldKey: "eraId",
                      target: "era",
                      title: "Create era",
                    })
                  }
                />
              ) : null
            }
          />
        </section>

        <section className="space-y-4">
          <SectionHeader
            title="Chronology"
            description="Timeline position now comes from these fields. Editing them will move the block in the visual timeline."
          />
          <div className="grid gap-4 xl:grid-cols-2">
            <ChronologyPanel
              description="Use the earliest known placement for this event. Year drives the main timeline position."
              title="Start date and time"
            >
              <div className="grid gap-4 md:grid-cols-3">
                <Field
                  label="Start year"
                  value={values.yearStart}
                  onChange={(value) => updateChronologyField("yearStart", value)}
                  placeholder="412"
                  inputMode="numeric"
                  hint="Required before month or day can be used."
                />
                <Field
                  label="Start month"
                  value={values.monthStart}
                  onChange={(value) => updateChronologyField("monthStart", value)}
                  placeholder="3"
                  inputMode="numeric"
                  hint="Optional. Use 1-12 for tighter placement."
                />
                <Field
                  label="Start day"
                  value={values.dayStart}
                  onChange={(value) => updateChronologyField("dayStart", value)}
                  placeholder="17"
                  inputMode="numeric"
                  hint="Optional. Requires a month."
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Field
                  label="Sequence within date"
                  value={values.chronologyOrder}
                  onChange={(value) => updateChronologyField("chronologyOrder", value)}
                  placeholder="2"
                  inputMode="numeric"
                  hint="Use this when multiple events share the same dated placement."
                />
                <Field
                  label="Time label"
                  value={values.timeOfDayLabel}
                  onChange={(value) => updateField("timeOfDayLabel", value)}
                  placeholder="Late evening"
                  hint="Optional human-readable time context."
                />
              </div>
            </ChronologyPanel>

            <ChronologyPanel
              description="Use the ending point only when the event spans over time. Leave blank for one-moment events."
              title="End date and time"
            >
              <div className="grid gap-4 md:grid-cols-3">
                <Field
                  label="End year"
                  value={values.yearEnd}
                  onChange={(value) => updateChronologyField("yearEnd", value)}
                  placeholder="412"
                  inputMode="numeric"
                  hint="Optional for instantaneous events."
                />
                <Field
                  label="End month"
                  value={values.monthEnd}
                  onChange={(value) => updateChronologyField("monthEnd", value)}
                  placeholder="3"
                  inputMode="numeric"
                  hint="Optional. Requires an end year."
                />
                <Field
                  label="End day"
                  value={values.dayEnd}
                  onChange={(value) => updateChronologyField("dayEnd", value)}
                  placeholder="18"
                  inputMode="numeric"
                  hint="Optional. Requires an end month."
                />
              </div>
            </ChronologyPanel>
          </div>
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
              addLabel="book"
              createActionLabel="Create book"
              label="Books"
              values={values.bookIds}
              options={formOptions.bookOptions}
              onChange={(nextValues) => updateField("bookIds", nextValues)}
              hint="Select one or more books tied to this event."
              loading={formOptions.loading}
              onCreate={
                inlineCreationContext
                  ? () =>
                      openInlineCreate({
                        description: "Add a book without leaving this timeline event.",
                        fieldKey: "bookIds",
                        target: "book",
                        title: "Create book",
                      })
                  : undefined
              }
            />
            <MultiPickerField
              addLabel="chapter"
              createActionLabel="Create chapter"
              label="Chapters"
              values={values.chapterIds}
              options={formOptions.chapterOptions}
              onChange={(nextValues) => updateField("chapterIds", nextValues)}
              hint="Useful when the chronology maps closely to chapter structure."
              loading={formOptions.loading}
              onCreate={
                inlineCreationContext
                  ? () =>
                      openInlineCreate({
                        description: "Add a chapter and return here with it already selected.",
                        fieldKey: "chapterIds",
                        target: "chapter",
                        title: "Create chapter",
                      })
                  : undefined
              }
            />
            <MultiPickerField
              addLabel="scene"
              createActionLabel="Create scene"
              label="Scenes"
              values={values.sceneIds}
              options={formOptions.sceneOptions}
              onChange={(nextValues) => updateField("sceneIds", nextValues)}
              hint="Attach scenes that directly depict this event."
              loading={formOptions.loading}
              onCreate={
                inlineCreationContext
                  ? () =>
                      openInlineCreate({
                        description: "Add a scene in-place instead of leaving the timeline sheet.",
                        fieldKey: "sceneIds",
                        target: "scene",
                        title: "Create scene",
                      })
                  : undefined
              }
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
              addLabel="character"
              createActionLabel="Create character"
              label="Characters"
              values={values.characterIds}
              options={formOptions.characterOptions}
              onChange={(nextValues) => updateField("characterIds", nextValues)}
              loading={formOptions.loading}
              onCreate={
                inlineCreationContext
                  ? () =>
                      openInlineCreate({
                        description: "Add a character and keep this event editor open.",
                        fieldKey: "characterIds",
                        target: "character",
                        title: "Create character",
                      })
                  : undefined
              }
            />
            <MultiPickerField
              addLabel="location"
              createActionLabel="Create location"
              label="Locations"
              values={values.locationIds}
              options={formOptions.locationOptions}
              onChange={(nextValues) => updateField("locationIds", nextValues)}
              loading={formOptions.loading}
              onCreate={
                inlineCreationContext
                  ? () =>
                      openInlineCreate({
                        description: "Add a location and link it back to this event immediately.",
                        fieldKey: "locationIds",
                        target: "location",
                        title: "Create location",
                      })
                  : undefined
              }
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
              addLabel="faction"
              createActionLabel="Create faction"
              label="Factions"
              values={values.factionIds}
              options={formOptions.factionOptions}
              onChange={(nextValues) => updateField("factionIds", nextValues)}
              loading={formOptions.loading}
              onCreate={
                inlineCreationContext
                  ? () =>
                      openInlineCreate({
                        description: "Add a faction without navigating away from the timeline.",
                        fieldKey: "factionIds",
                        target: "faction",
                        title: "Create faction",
                      })
                  : undefined
              }
            />
            <MultiPickerField
              addLabel="culture"
              createActionLabel="Create culture"
              label="Cultures"
              values={values.cultureIds}
              options={formOptions.cultureOptions}
              onChange={(nextValues) => updateField("cultureIds", nextValues)}
              loading={formOptions.loading}
              onCreate={
                inlineCreationContext
                  ? () =>
                      openInlineCreate({
                        description: "Add a culture and select it back into this event.",
                        fieldKey: "cultureIds",
                        target: "culture",
                        title: "Create culture",
                      })
                  : undefined
              }
            />
            <MultiPickerField
              addLabel="religion"
              createActionLabel="Create religion"
              label="Religions"
              values={values.religionIds}
              options={formOptions.religionOptions}
              onChange={(nextValues) => updateField("religionIds", nextValues)}
              loading={formOptions.loading}
              onCreate={
                inlineCreationContext
                  ? () =>
                      openInlineCreate({
                        description: "Add a religion without interrupting timeline editing.",
                        fieldKey: "religionIds",
                        target: "religion",
                        title: "Create religion",
                      })
                  : undefined
              }
            />
            <MultiPickerField
              addLabel="technology"
              createActionLabel="Create technology"
              label="Technologies"
              values={values.technologyIds}
              options={formOptions.technologyOptions}
              onChange={(nextValues) => updateField("technologyIds", nextValues)}
              loading={formOptions.loading}
              onCreate={
                inlineCreationContext
                  ? () =>
                      openInlineCreate({
                        description: "Add a technology and use it here as soon as it saves.",
                        fieldKey: "technologyIds",
                        target: "technology",
                        title: "Create technology",
                      })
                  : undefined
              }
            />
            <MultiPickerField
              addLabel="plot thread"
              createActionLabel="Create plot thread"
              label="Plot threads"
              values={values.plotThreadIds}
              options={formOptions.plotThreadOptions}
              onChange={(nextValues) => updateField("plotThreadIds", nextValues)}
              loading={formOptions.loading}
              onCreate={
                inlineCreationContext
                  ? () =>
                      openInlineCreate({
                        description: "Add a plot thread and keep working inside this event.",
                        fieldKey: "plotThreadIds",
                        target: "plotThread",
                        title: "Create plot thread",
                      })
                  : undefined
              }
            />
            <MultiPickerField
              addLabel="theme"
              createActionLabel="Create theme"
              label="Themes"
              values={values.themeIds}
              options={formOptions.themeOptions}
              onChange={(nextValues) => updateField("themeIds", nextValues)}
              loading={formOptions.loading}
              onCreate={
                inlineCreationContext
                  ? () =>
                      openInlineCreate({
                        description: "Add a theme without leaving the event editor.",
                        fieldKey: "themeIds",
                        target: "theme",
                        title: "Create theme",
                      })
                  : undefined
              }
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

      {inlineCreateState && inlineCreationContext ? (
        <TimelineInlineCreateLightbox
          activeProjectId={inlineCreationContext.activeProjectId}
          onClose={() => setInlineCreateState(null)}
          onCreated={(option) =>
            handleInlineCreateSuccess(
              inlineCreateState.fieldKey,
              inlineCreateState.target,
              option
            )
          }
          state={inlineCreateState}
          uid={inlineCreationContext.uid}
        />
      ) : null}
    </>
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

  function updateChronologyField(
    key:
      | "yearStart"
      | "monthStart"
      | "dayStart"
      | "yearEnd"
      | "monthEnd"
      | "dayEnd"
      | "chronologyOrder",
    value: string
  ) {
    const sanitizedValue = sanitizeChronologyInput(key, value);

    setValues((current) =>
      applyChronologyFieldUpdate(current, key, sanitizedValue)
    );

    if (error) {
      setError(null);
    }
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
  action,
}: {
  label: string;
  value: Value;
  onChange: (value: Value) => void;
  options: ReadonlyArray<{ value: Value; label: string; meta?: string }>;
  includeEmptyOption?: boolean;
  emptyLabel?: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-zinc-700">{label}</span>
      {action ? (
        <div className="flex items-start gap-2">
          <select
            value={value}
            onChange={(event) => onChange(event.target.value as Value)}
            className="h-12 min-w-0 flex-1 rounded-2xl border border-zinc-200 bg-white px-4 text-sm text-zinc-950 outline-none transition focus:border-zinc-400"
          >
            {includeEmptyOption ? <option value="">{emptyLabel}</option> : null}
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {action}
        </div>
      ) : (
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
      )}
      {hint ? <span className="mt-2 block text-xs text-zinc-500">{hint}</span> : null}
    </label>
  );
}

function MultiPickerField({
  addLabel,
  createActionLabel,
  label,
  values,
  options,
  onChange,
  loading,
  hint,
  onCreate,
}: {
  addLabel: string;
  createActionLabel?: string;
  label: string;
  values: string[];
  options: TimelineReferenceOption[];
  onChange: (values: string[]) => void;
  loading: boolean;
  hint?: string;
  onCreate?: () => void;
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
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-zinc-700">{label}</p>
        {onCreate && createActionLabel ? (
          <InlineCreateButton label={createActionLabel} onClick={onCreate} />
        ) : null}
      </div>

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
                ? `Add ${addLabel}`
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

function ChronologyPanel({
  children,
  description,
  title,
}: {
  children: ReactNode;
  description: string;
  title: string;
}) {
  return (
    <section className="rounded-3xl border border-zinc-200 bg-zinc-50 p-5">
      <h4 className="text-base font-semibold tracking-tight text-zinc-950">{title}</h4>
      <p className="mt-2 text-sm leading-6 text-zinc-600">{description}</p>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
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

function InlineCreateButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-10 shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50"
    >
      {label}
    </button>
  );
}

function TimelineInlineCreateLightbox({
  activeProjectId,
  onClose,
  onCreated,
  state,
  uid,
}: {
  activeProjectId: string;
  onClose: () => void;
  onCreated: (option: TimelineReferenceOption) => void;
  state: TimelineInlineCreateState;
  uid: string;
}) {
  switch (state.target) {
    case "era":
      return (
        <InlineCreateShell description={state.description} onClose={onClose} title={state.title}>
          <EraForm
            submitLabel="Create era"
            onSubmit={async (values) => {
              const eraId = await createEraForProject(uid, activeProjectId, values);
              onCreated({
                value: eraId,
                label: values.name,
                meta: buildYearMeta(values.startYear, values.endYear),
              });
            }}
          />
        </InlineCreateShell>
      );
    case "book":
      return (
        <InlineCreateShell description={state.description} onClose={onClose} title={state.title}>
          <BookForm
            submitLabel="Create book"
            onSubmit={async (values) => {
              const bookId = await createBookForProject(uid, activeProjectId, values);
              onCreated({
                value: bookId,
                label: values.title,
                meta: values.summary || bookId,
              });
            }}
          />
        </InlineCreateShell>
      );
    case "chapter":
      return (
        <InlineCreateShell description={state.description} onClose={onClose} title={state.title}>
          <ChapterForm
            submitLabel="Create chapter"
            onSubmit={async (values) => {
              const chapterId = await createChapterForProject(uid, activeProjectId, values);
              onCreated({
                value: chapterId,
                label: values.title,
                meta: values.bookId ? `Book: ${values.bookId}` : chapterId,
              });
            }}
          />
        </InlineCreateShell>
      );
    case "scene":
      return (
        <InlineCreateShell description={state.description} onClose={onClose} title={state.title}>
          <SceneForm
            submitLabel="Create scene"
            onSubmit={async (values) => {
              const sceneId = await createSceneForProject(uid, activeProjectId, values);
              onCreated({
                value: sceneId,
                label: values.title,
                meta: values.chapterId || values.bookId || sceneId,
              });
            }}
          />
        </InlineCreateShell>
      );
    case "character":
      return (
        <InlineCreateShell description={state.description} onClose={onClose} title={state.title}>
          <CharacterForm
            submitLabel="Create character"
            onSubmit={async (values) => {
              const characterId = await createCharacterForProject(uid, activeProjectId, values);
              onCreated({
                value: characterId,
                label: values.name,
                meta: values.summary || characterId,
              });
            }}
          />
        </InlineCreateShell>
      );
    case "location":
      return (
        <InlineCreateShell description={state.description} onClose={onClose} title={state.title}>
          <LocationForm
            submitLabel="Create location"
            onSubmit={async (values) => {
              const locationId = await createLocationForProject(uid, activeProjectId, values);
              onCreated({
                value: locationId,
                label: values.name,
                meta: values.locationType || locationId,
              });
            }}
          />
        </InlineCreateShell>
      );
    case "faction":
      return (
        <InlineCreateShell description={state.description} onClose={onClose} title={state.title}>
          <FactionForm
            submitLabel="Create faction"
            onSubmit={async (values) => {
              const factionId = await createFactionForProject(uid, activeProjectId, values);
              onCreated({
                value: factionId,
                label: values.name,
                meta: values.factionType,
              });
            }}
          />
        </InlineCreateShell>
      );
    case "culture":
      return (
        <InlineCreateShell description={state.description} onClose={onClose} title={state.title}>
          <CultureForm
            submitLabel="Create culture"
            onSubmit={async (values) => {
              const cultureId = await createCultureForProject(uid, activeProjectId, values);
              onCreated({
                value: cultureId,
                label: values.name,
                meta: values.summary || cultureId,
              });
            }}
          />
        </InlineCreateShell>
      );
    case "religion":
      return (
        <InlineCreateShell description={state.description} onClose={onClose} title={state.title}>
          <ReligionForm
            submitLabel="Create religion"
            onSubmit={async (values) => {
              const religionId = await createReligionForProject(uid, activeProjectId, values);
              onCreated({
                value: religionId,
                label: values.name,
                meta: values.deityOrFocus || religionId,
              });
            }}
          />
        </InlineCreateShell>
      );
    case "technology":
      return (
        <InlineCreateShell description={state.description} onClose={onClose} title={state.title}>
          <TechnologyForm
            submitLabel="Create technology"
            onSubmit={async (values) => {
              const technologyId = await createTechnologyForProject(uid, activeProjectId, values);
              onCreated({
                value: technologyId,
                label: values.name,
                meta: values.technologyType || technologyId,
              });
            }}
          />
        </InlineCreateShell>
      );
    case "plotThread":
      return (
        <InlineCreateShell description={state.description} onClose={onClose} title={state.title}>
          <PlotThreadForm
            submitLabel="Create plot thread"
            onSubmit={async (values) => {
              const plotThreadId = await createPlotThreadForProject(uid, activeProjectId, values);
              onCreated({
                value: plotThreadId,
                label: values.title,
                meta: values.threadType,
              });
            }}
          />
        </InlineCreateShell>
      );
    case "theme":
      return (
        <InlineCreateShell description={state.description} onClose={onClose} title={state.title}>
          <ThemeForm
            submitLabel="Create theme"
            onSubmit={async (values) => {
              const themeId = await createThemeForProject(uid, activeProjectId, values);
              onCreated({
                value: themeId,
                label: values.name,
                meta: values.centralQuestion || themeId,
              });
            }}
          />
        </InlineCreateShell>
      );
  }
}

function InlineCreateShell({
  children,
  description,
  onClose,
  title,
}: {
  children: ReactNode;
  description: string;
  onClose: () => void;
  title: string;
}) {
  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-zinc-950/45 px-4 py-6 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />

      <div className="relative z-10 flex max-h-full w-full max-w-4xl flex-col overflow-hidden rounded-4xl border border-zinc-200 bg-[#fffdf9] shadow-2xl">
        <div className="border-b border-zinc-200 bg-white px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                Inline create
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950">
                {title}
              </h2>
              <p className="mt-3 text-sm leading-6 text-zinc-600">{description}</p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-zinc-200 text-lg text-zinc-700 transition hover:bg-zinc-50"
              aria-label={`Close ${title.toLowerCase()}`}
            >
              x
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">{children}</div>
      </div>
    </div>
  );
}

function mergeTimelineFormOptions(
  base: TimelineFormOptionsResult,
  temporaryOptionsByTarget: TemporaryReferenceOptions
) {
  const bookOptions = mergeReferenceOptions(base.bookOptions, temporaryOptionsByTarget.book);
  const chapterOptions = mergeReferenceOptions(
    base.chapterOptions,
    temporaryOptionsByTarget.chapter
  );
  const sceneOptions = mergeReferenceOptions(base.sceneOptions, temporaryOptionsByTarget.scene);
  const characterOptions = mergeReferenceOptions(
    base.characterOptions,
    temporaryOptionsByTarget.character
  );
  const locationOptions = mergeReferenceOptions(
    base.locationOptions,
    temporaryOptionsByTarget.location
  );
  const eraOptions = mergeReferenceOptions(base.eraOptions, temporaryOptionsByTarget.era);
  const factionOptions = mergeReferenceOptions(
    base.factionOptions,
    temporaryOptionsByTarget.faction
  );
  const cultureOptions = mergeReferenceOptions(
    base.cultureOptions,
    temporaryOptionsByTarget.culture
  );
  const religionOptions = mergeReferenceOptions(
    base.religionOptions,
    temporaryOptionsByTarget.religion
  );
  const technologyOptions = mergeReferenceOptions(
    base.technologyOptions,
    temporaryOptionsByTarget.technology
  );
  const plotThreadOptions = mergeReferenceOptions(
    base.plotThreadOptions,
    temporaryOptionsByTarget.plotThread
  );
  const themeOptions = mergeReferenceOptions(base.themeOptions, temporaryOptionsByTarget.theme);

  return {
    ...base,
    bookOptions,
    chapterOptions,
    sceneOptions,
    characterOptions,
    locationOptions,
    eraOptions,
    factionOptions,
    cultureOptions,
    religionOptions,
    technologyOptions,
    plotThreadOptions,
    themeOptions,
    timelineEventOptions: base.timelineEventOptions,
    referenceSets: {
      bookIds: buildTimelineReferenceSet(bookOptions),
      chapterIds: buildTimelineReferenceSet(chapterOptions),
      sceneIds: buildTimelineReferenceSet(sceneOptions),
      characterIds: buildTimelineReferenceSet(characterOptions),
      locationIds: buildTimelineReferenceSet(locationOptions),
      eraIds: buildTimelineReferenceSet(eraOptions),
      factionIds: buildTimelineReferenceSet(factionOptions),
      cultureIds: buildTimelineReferenceSet(cultureOptions),
      religionIds: buildTimelineReferenceSet(religionOptions),
      technologyIds: buildTimelineReferenceSet(technologyOptions),
      plotThreadIds: buildTimelineReferenceSet(plotThreadOptions),
      themeIds: buildTimelineReferenceSet(themeOptions),
      timelineEventIds: buildTimelineReferenceSet(base.timelineEventOptions),
    },
    referenceMaps: {
      bookIds: buildTimelineReferenceMap(bookOptions),
      chapterIds: buildTimelineReferenceMap(chapterOptions),
      sceneIds: buildTimelineReferenceMap(sceneOptions),
      characterIds: buildTimelineReferenceMap(characterOptions),
      locationIds: buildTimelineReferenceMap(locationOptions),
      eraIds: buildTimelineReferenceMap(eraOptions),
      factionIds: buildTimelineReferenceMap(factionOptions),
      cultureIds: buildTimelineReferenceMap(cultureOptions),
      religionIds: buildTimelineReferenceMap(religionOptions),
      technologyIds: buildTimelineReferenceMap(technologyOptions),
      plotThreadIds: buildTimelineReferenceMap(plotThreadOptions),
      themeIds: buildTimelineReferenceMap(themeOptions),
      timelineEventIds: buildTimelineReferenceMap(base.timelineEventOptions),
    },
  } satisfies TimelineFormOptionsResult;
}

function mergeReferenceOptions(
  existingOptions: TimelineReferenceOption[],
  temporaryOptions?: TimelineReferenceOption[]
) {
  if (!temporaryOptions || temporaryOptions.length === 0) {
    return existingOptions;
  }

  const merged = [...existingOptions];
  const knownValues = new Set(existingOptions.map((option) => option.value));

  for (const option of temporaryOptions) {
    if (knownValues.has(option.value)) {
      continue;
    }

    merged.push(option);
    knownValues.add(option.value);
  }

  return merged;
}

function applyCreatedReferenceSelection(
  current: TimelineEventFormValues,
  fieldKey: CreateableTimelineFieldKey,
  nextValue: string
) {
  if (fieldKey === "eraId") {
    return {
      ...current,
      eraId: nextValue,
    };
  }

  return {
    ...current,
    [fieldKey]: appendUniqueValue(current[fieldKey], nextValue),
  };
}

function appendUniqueValue(values: string[], nextValue: string) {
  return values.includes(nextValue) ? values : [...values, nextValue];
}

function sanitizeChronologyInput(
  key:
    | "yearStart"
    | "monthStart"
    | "dayStart"
    | "yearEnd"
    | "monthEnd"
    | "dayEnd"
    | "chronologyOrder",
  value: string
) {
  if (key === "yearStart" || key === "yearEnd") {
    const trimmedValue = value.trimStart();
    const hasNegativeSign = trimmedValue.startsWith("-");
    const digitsOnly = trimmedValue.replace(/\D/g, "");

    return hasNegativeSign ? `-${digitsOnly}` : digitsOnly;
  }

  return value.replace(/[^0-9]/g, "");
}

function applyChronologyFieldUpdate(
  current: TimelineEventFormValues,
  key:
    | "yearStart"
    | "monthStart"
    | "dayStart"
    | "yearEnd"
    | "monthEnd"
    | "dayEnd"
    | "chronologyOrder",
  value: string
) {
  const next = {
    ...current,
    [key]: value,
  };

  if (key === "yearStart" && !value.trim()) {
    next.monthStart = "";
    next.dayStart = "";
  }

  if (key === "monthStart" && !value.trim()) {
    next.dayStart = "";
  }

  if (key === "yearEnd" && !value.trim()) {
    next.monthEnd = "";
    next.dayEnd = "";
  }

  if (key === "monthEnd" && !value.trim()) {
    next.dayEnd = "";
  }

  return next;
}

function buildYearMeta(startYear: number | null, endYear: number | null) {
  if (typeof startYear === "number" && typeof endYear === "number") {
    return startYear === endYear ? String(startYear) : `${startYear}-${endYear}`;
  }

  if (typeof startYear === "number") {
    return `From ${startYear}`;
  }

  if (typeof endYear === "number") {
    return `Until ${endYear}`;
  }

  return undefined;
}
