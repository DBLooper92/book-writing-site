"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { useOpenAiConfig } from "@/hooks/use-openai-config";
import type {
  AiTimelineCreateDraftState,
  BrainDumpEntitySuggestion,
  BrainDumpPreviewResult,
  BrainDumpResolution,
  TimelineBrainDumpInsertionContext,
  TimelineBrainDumpProjectContext,
} from "@/types/ai-brain-dump";
import type { TimelineEventFormValues } from "@/types/timeline-event";

type TimelineCreateModeLightboxProps = {
  initialMode?: "aiMulti" | "aiSingle" | "chooser" | "manual";
  initialValues: TimelineEventFormValues;
  insertionContext?: TimelineBrainDumpInsertionContext | null;
  open: boolean;
  onClose: () => void;
  onManual: (initialValues: TimelineEventFormValues) => void;
  onMultiJobStarted?: (jobId: string) => void;
  onUseAiDraft: (draftState: AiTimelineCreateDraftState, initialValues: TimelineEventFormValues) => void;
};

type LightboxStep = "chooser" | "multiInput" | "singleInput" | "singleReview";

type ReviewResolutionState = {
  action: "" | "create" | "ignore" | "link";
  linkedId: string;
  touched: boolean;
};

export function TimelineCreateModeLightbox({
  initialMode = "chooser",
  initialValues,
  insertionContext = null,
  open,
  onClose,
  onManual,
  onMultiJobStarted,
  onUseAiDraft,
}: TimelineCreateModeLightboxProps) {
  const { config, loading: configLoading } = useOpenAiConfig();
  const [step, setStep] = useState<LightboxStep>("chooser");
  const [singleBrainDumpText, setSingleBrainDumpText] = useState("");
  const [multiBrainDumpText, setMultiBrainDumpText] = useState("");
  const [preview, setPreview] = useState<BrainDumpPreviewResult | null>(null);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resolutionState, setResolutionState] = useState<Record<string, ReviewResolutionState>>({});
  const autoModeHandledRef = useRef(false);

  const reviewSuggestions = preview?.entitySuggestions ?? [];
  const canUseAi = !configLoading && Boolean(config?.configured);
  const insertionContextEvents = insertionContext?.surroundingEvents ?? [];

  useEffect(() => {
    if (!open) {
      autoModeHandledRef.current = false;
      return;
    }

    if (autoModeHandledRef.current) {
      return;
    }

    autoModeHandledRef.current = true;
    setError(null);

    if (initialMode === "manual") {
      onManual(initialValues);
      return;
    }

    if (initialMode === "aiSingle") {
      setStep("singleInput");
      return;
    }

    if (initialMode === "aiMulti") {
      setStep("multiInput");
      return;
    }

    setStep("chooser");
  }, [initialMode, initialValues, onManual, open]);

  const unresolvedCount = useMemo(() => {
    return reviewSuggestions.reduce((count, suggestion) => {
      const state = resolutionState[suggestion.id];

      if (!state) {
        return count + 1;
      }

      if (!state.action) {
        return count + 1;
      }

      if (state.action === "link" && !state.linkedId) {
        return count + 1;
      }

      if ((suggestion.suggestedAction === "ambiguous" || suggestion.suggestedAction === "unresolved") && !state.touched) {
        return count + 1;
      }

      return count;
    }, 0);
  }, [resolutionState, reviewSuggestions]);

  function renderInsertionContextSummary() {
    if (insertionContextEvents.length === 0) {
      return null;
    }

    return (
      <div className="mt-5 rounded-3xl border border-zinc-200 bg-zinc-50 px-4 py-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
          Insertion context
        </p>
        <p className="mt-2 text-sm leading-6 text-zinc-700">
          The AI will read the nearby timeline window around this gap before drafting anything.
        </p>
        <div className="mt-4 space-y-2">
          {insertionContextEvents.map((event) => (
            <div
              key={`${event.relation}-${event.id}`}
              className="rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700"
            >
              <span className="font-medium text-zinc-950">
                {event.relation === "before" ? "Before" : "After"} {event.position}:
              </span>{" "}
              {event.title}
              <span className="ml-2 text-xs uppercase tracking-[0.16em] text-zinc-500">
                {event.chronologyLabel}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!open) {
    return null;
  }

  async function handleGenerateSingle() {
    const normalized = singleBrainDumpText.trim();

    if (!normalized) {
      setError("Enter a brain dump before generating.");
      return;
    }

    setWorking(true);
    setError(null);

    try {
      const nextPreview = await window.bookBible.ai.previewTimelineBrainDump({
        brainDumpText: normalized,
        projectContext: buildTimelineBrainDumpProjectContext(
          initialValues,
          insertionContext
        ),
      });
      setPreview(nextPreview);
      setResolutionState(buildInitialResolutionState(nextPreview.entitySuggestions));
      setStep("singleReview");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to generate preview.");
    } finally {
      setWorking(false);
    }
  }

  async function handleStartMultiJob() {
    const normalized = multiBrainDumpText.trim();

    if (!normalized) {
      setError("Enter a brain dump before starting.");
      return;
    }

    setWorking(true);
    setError(null);

    try {
      const result = await window.bookBible.ai.startMultiEventTimelineBrainDumpJob({
        brainDumpText: normalized,
        projectContext: buildTimelineBrainDumpProjectContext(
          initialValues,
          insertionContext
        ),
      });
      onClose();
      onMultiJobStarted?.(result.jobId);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to start multi-event job.");
    } finally {
      setWorking(false);
    }
  }

  function handleApproveAndContinue() {
    if (!preview) {
      return;
    }

    const resolutions = preview.entitySuggestions.map((suggestion) => {
      const state = resolutionState[suggestion.id];

      if (!state || !state.action) {
        return null;
      }

      const resolution: BrainDumpResolution = {
        action: state.action,
        suggestionId: suggestion.id,
        target: suggestion.target,
      };

      if (state.action === "link") {
        resolution.linkedId = state.linkedId;
      }

      return resolution;
    });

    if (resolutions.some((resolution) => !resolution)) {
      setError("Resolve each suggested entity before continuing.");
      return;
    }

    const draftState: AiTimelineCreateDraftState = {
      approvedAt: new Date().toISOString(),
      brainDumpText: singleBrainDumpText.trim(),
      preview,
      resolutions: resolutions.filter(Boolean) as BrainDumpResolution[],
    };

    const prefilledValues = {
      ...initialValues,
      ...preview.prefill,
      predecessorEventIds:
        preview.prefill.predecessorEventIds.length > 0
          ? preview.prefill.predecessorEventIds
          : initialValues.predecessorEventIds,
      successorEventIds:
        preview.prefill.successorEventIds.length > 0
          ? preview.prefill.successorEventIds
          : initialValues.successorEventIds,
    };
    onUseAiDraft(draftState, prefilledValues);
  }

  return (
    <div className="fixed inset-0 z-[65] flex items-center justify-center bg-zinc-950/45 px-4 py-6 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />
      <section className="relative z-10 w-full max-w-3xl rounded-4xl border border-zinc-200 bg-[#fffdf9] p-6 shadow-2xl">
        {step === "chooser" ? (
          <>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">Create timeline event</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950">Choose creation mode</h2>
            <p className="mt-3 text-sm leading-6 text-zinc-600">
              Manual opens the editor directly. AI Single-Event drafts one timeline event. AI Multi-Event starts a background job for large dumps and sends you to review queue.
            </p>
            {renderInsertionContextSummary()}
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <button
                type="button"
                onClick={() => onManual(initialValues)}
                className="inline-flex h-12 items-center justify-center rounded-full border border-zinc-200 bg-white px-5 text-sm font-medium text-zinc-800 transition hover:bg-zinc-50"
              >
                Manual
              </button>
              <button
                type="button"
                onClick={() => setStep("singleInput")}
                disabled={!canUseAi}
                className="inline-flex h-12 items-center justify-center rounded-full bg-zinc-950 px-5 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-300"
              >
                AI Single-Event
              </button>
              <button
                type="button"
                onClick={() => setStep("multiInput")}
                disabled={!canUseAi}
                className="inline-flex h-12 items-center justify-center rounded-full bg-zinc-800 px-5 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:bg-zinc-300"
              >
                AI Multi-Event
              </button>
            </div>
            {!canUseAi ? (
              <p className="mt-3 text-xs text-zinc-600">
                Add an OpenAI API key in{" "}
                <Link href="/profile" className="underline">
                  Profile
                </Link>{" "}
                to enable AI BrainDump.
              </p>
            ) : null}
          </>
        ) : null}

        {step === "singleInput" ? (
          <>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">AI Single-Event BrainDump</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950">Paste raw event brain dump</h2>
            <p className="mt-3 text-sm leading-6 text-zinc-600">
              The draft should fit between the surrounding timeline events shown above. If the notes wander, keep the result local to this gap.
            </p>
            {renderInsertionContextSummary()}
            <textarea
              value={singleBrainDumpText}
              onChange={(event) => setSingleBrainDumpText(event.target.value)}
              className="mt-4 min-h-[18rem] w-full rounded-3xl border border-zinc-200 bg-white p-4 font-mono text-sm leading-6 text-zinc-900 outline-none transition focus:border-zinc-400"
              placeholder="Dump your raw notes for one event here..."
              spellCheck={false}
            />
            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setStep("chooser")}
                className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-200 px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => void handleGenerateSingle()}
                disabled={working}
                className="inline-flex h-11 items-center justify-center rounded-full bg-zinc-950 px-4 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-300"
              >
                {working ? "Generating..." : "Generate AI Draft"}
              </button>
            </div>
          </>
        ) : null}

        {step === "multiInput" ? (
          <>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">AI Multi-Event BrainDump</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950">Paste large timeline brain dump</h2>
            <p className="mt-3 text-sm leading-6 text-zinc-600">
              This mode can split one dump into multiple events, but every extracted event should stay between the before/after anchors in the insertion context.
            </p>
            {renderInsertionContextSummary()}
            <textarea
              value={multiBrainDumpText}
              onChange={(event) => setMultiBrainDumpText(event.target.value)}
              className="mt-4 min-h-[18rem] w-full rounded-3xl border border-zinc-200 bg-white p-4 font-mono text-sm leading-6 text-zinc-900 outline-none transition focus:border-zinc-400"
              placeholder="Paste a long dump with multiple events. This will run in a background AI job."
              spellCheck={false}
            />
            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setStep("chooser")}
                className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-200 px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => void handleStartMultiJob()}
                disabled={working}
                className="inline-flex h-11 items-center justify-center rounded-full bg-zinc-950 px-4 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-300"
              >
                {working ? "Starting..." : "Start Background Job"}
              </button>
            </div>
          </>
        ) : null}

        {step === "singleReview" && preview ? (
          <>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">AI Review</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950">Review extracted draft</h2>
            <div className="mt-4 rounded-3xl border border-zinc-200 bg-white p-4 text-sm text-zinc-700">
              <p><span className="font-medium">Title:</span> {preview.prefill.title || "Untitled draft"}</p>
              <p className="mt-2"><span className="font-medium">Summary:</span> {preview.prefill.summary || "None"}</p>
              <p className="mt-2"><span className="font-medium">Event type:</span> {preview.prefill.eventType}</p>
            </div>
            <div className="mt-4 max-h-[16rem] space-y-3 overflow-y-auto pr-1">
              {reviewSuggestions.length === 0 ? (
                <p className="rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-600">No linked entity suggestions were extracted.</p>
              ) : (
                reviewSuggestions.map((suggestion) => (
                  <SuggestionCard
                    key={suggestion.id}
                    state={resolutionState[suggestion.id]}
                    suggestion={suggestion}
                    onChange={(nextState) =>
                      setResolutionState((current) => ({
                        ...current,
                        [suggestion.id]: nextState,
                      }))
                    }
                  />
                ))
              )}
            </div>
            {preview.warnings.length > 0 ? (
              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                {preview.warnings.join(" ")}
              </div>
            ) : null}
            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setStep("singleInput")}
                className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-200 px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleApproveAndContinue}
                disabled={unresolvedCount > 0}
                className="inline-flex h-11 items-center justify-center rounded-full bg-zinc-950 px-4 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-300"
              >
                Approve & Continue
              </button>
              {unresolvedCount > 0 ? (
                <p className="self-center text-xs text-zinc-600">Resolve {unresolvedCount} remaining suggestion(s).</p>
              ) : null}
            </div>
          </>
        ) : null}

        {error ? (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        ) : null}
      </section>
    </div>
  );
}

function buildTimelineBrainDumpProjectContext(
  initialValues: TimelineEventFormValues,
  insertionContext: TimelineBrainDumpInsertionContext | null
): TimelineBrainDumpProjectContext {
  return {
    insertionContext: insertionContext ?? undefined,
    predecessorEventIds: initialValues.predecessorEventIds,
    successorEventIds: initialValues.successorEventIds,
    yearEnd: initialValues.yearEnd,
    yearStart: initialValues.yearStart,
  };
}

function buildInitialResolutionState(suggestions: BrainDumpEntitySuggestion[]) {
  return Object.fromEntries(
    suggestions.map((suggestion) => {
      if (suggestion.suggestedAction === "link" && suggestion.candidates.length === 1) {
        return [
          suggestion.id,
          {
            action: "link",
            linkedId: suggestion.candidates[0].id,
            touched: true,
          } satisfies ReviewResolutionState,
        ];
      }

      if (suggestion.suggestedAction === "create") {
        return [
          suggestion.id,
          {
            action: "create",
            linkedId: "",
            touched: true,
          } satisfies ReviewResolutionState,
        ];
      }

      if (suggestion.suggestedAction === "ignore") {
        return [
          suggestion.id,
          {
            action: "ignore",
            linkedId: "",
            touched: true,
          } satisfies ReviewResolutionState,
        ];
      }

      return [
        suggestion.id,
        {
          action: "",
          linkedId: "",
          touched: false,
        } satisfies ReviewResolutionState,
      ];
    })
  );
}

function SuggestionCard({
  suggestion,
  state,
  onChange,
}: {
  suggestion: BrainDumpEntitySuggestion;
  state: ReviewResolutionState | undefined;
  onChange: (nextState: ReviewResolutionState) => void;
}) {
  const currentState = state ?? {
    action: "",
    linkedId: "",
    touched: false,
  };

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">{suggestion.target}</p>
      <p className="mt-1 text-sm font-medium text-zinc-900">{suggestion.mention || suggestion.suggestedCreateFields.titleOrName}</p>
      <p className="mt-1 text-xs text-zinc-600">{suggestion.reason}</p>
      {(suggestion.suggestedAction === "ambiguous" || suggestion.suggestedAction === "unresolved") ? (
        <p className="mt-1 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] text-amber-900">
          AI could not resolve this mention confidently. Choose link/create/ignore explicitly.
        </p>
      ) : null}
      <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,11rem)_minmax(0,1fr)]">
        <select
          value={currentState.action}
          onChange={(event) =>
            onChange({
              ...currentState,
              action: event.target.value as ReviewResolutionState["action"],
              touched: true,
            })
          }
          className="h-10 rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-sm text-zinc-900 outline-none transition focus:border-zinc-400"
        >
          <option value="">Choose action</option>
          <option value="link">Link existing</option>
          <option value="create">Create new</option>
          <option value="ignore">Ignore</option>
        </select>
        {currentState.action === "link" ? (
          <select
            value={currentState.linkedId}
            onChange={(event) =>
              onChange({
                ...currentState,
                linkedId: event.target.value,
                touched: true,
              })
            }
            className="h-10 rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-sm text-zinc-900 outline-none transition focus:border-zinc-400"
          >
            <option value="">Choose existing record</option>
            {suggestion.candidates.map((candidate) => (
              <option key={candidate.id} value={candidate.id}>
                {candidate.meta ? `${candidate.label} - ${candidate.meta}` : candidate.label}
              </option>
            ))}
          </select>
        ) : (
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-600">
            {currentState.action === "create"
              ? `Create: ${suggestion.suggestedCreateFields.titleOrName}`
              : currentState.action === "ignore"
                ? "Ignored"
                : `${suggestion.candidates.length} matching candidate(s)`}
          </div>
        )}
      </div>
    </section>
  );
}
