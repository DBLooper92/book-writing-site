"use client";

import { useEffect, useMemo, useState } from "react";

import { TimelineBookmarkCollectionPicker } from "@/components/timeline/timeline-bookmark-collection-picker";
import { createTimelineEventForProject, setTimelineEventBookmarkedForProject } from "@/lib/data/timeline-events";
import { applyAiDraftResolutionsToTimelineValues } from "@/lib/timeline/ai-draft-apply";
import {
  clearBrainDumpComposerSession,
  createBrainDumpComposerCard,
  createEmptyBrainDumpComposerSession,
  loadBrainDumpComposerSession,
  saveBrainDumpComposerSession,
} from "@/lib/timeline/braindump-composer-session";
import { uniqueValues } from "@/lib/timeline/collection-utils";
import {
  createTimelineBookmarkCollection,
  normalizeTimelineBookmarkCollectionColor,
  useTimelineBookmarkCollections,
} from "@/lib/timeline/bookmark-collections";
import type {
  AiTimelineCreateDraftState,
  BrainDumpEntitySuggestion,
  BrainDumpResolution,
  BrainDumpPreviewResult,
  TimelineBrainDumpComposerCard,
  TimelineBrainDumpComposerSession,
  TimelineBrainDumpInsertionContext,
  TimelineBrainDumpProjectContext,
  TimelineBrainDumpReferenceCard,
  TimelineBrainDumpReferenceContext,
} from "@/types/ai-brain-dump";
import {
  createEmptyTimelineEventFormValues,
  normalizeTimelineEventFormValues,
  type TimelineEventFormValues,
} from "@/types/timeline-event";
import type { TimelineEvent } from "@/types/timeline-event";

type TimelineBrainDumpSessionComposerProps = {
  activeProjectId: string;
  initialValues: TimelineEventFormValues;
  insertionContext?: TimelineBrainDumpInsertionContext | null;
  insertionItemId?: string | null;
  onClose: () => void;
  onPublished: () => Promise<void> | void;
  timelineEvents: TimelineEvent[];
  uid: string;
};

type BookmarkPickerState = {
  cardId: string;
  collectionId: string | null;
} | null;

export function TimelineBrainDumpSessionComposer({
  activeProjectId,
  initialValues,
  insertionContext = null,
  insertionItemId = null,
  onClose,
  onPublished,
  timelineEvents,
  uid,
}: TimelineBrainDumpSessionComposerProps) {
  const bookmarkCollections = useTimelineBookmarkCollections(activeProjectId);
  const [session, setSession] = useState<TimelineBrainDumpComposerSession>(() =>
    createEmptyBrainDumpComposerSession(activeProjectId, insertionItemId)
  );
  const [processing, setProcessing] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bookmarkPickerState, setBookmarkPickerState] = useState<BookmarkPickerState>(null);
  const loadedSessionKey = useMemo(
    () => `${activeProjectId}:${String(insertionItemId ?? "root")}`,
    [activeProjectId, insertionItemId]
  );

  useEffect(() => {
    const loaded = loadBrainDumpComposerSession(activeProjectId, insertionItemId);
    setSession(loaded ?? createEmptyBrainDumpComposerSession(activeProjectId, insertionItemId));
    setError(null);
    setBookmarkPickerState(null);
  }, [activeProjectId, insertionItemId, loadedSessionKey]);

  useEffect(() => {
    saveBrainDumpComposerSession(session);
  }, [session]);

  function updateCard(
    cardId: string,
    updater: (current: TimelineBrainDumpComposerCard) => TimelineBrainDumpComposerCard
  ) {
    setSession((current) => ({
      ...current,
      cards: current.cards.map((card) => (card.cardId === cardId ? updater(card) : card)),
      updatedAt: new Date().toISOString(),
    }));
  }

  function addCard(type: "ai" | "manual") {
    setSession((current) => ({
      ...current,
      cards: [...current.cards, createBrainDumpComposerCard(type)],
      updatedAt: new Date().toISOString(),
    }));
  }

  function duplicateCard(cardId: string) {
    setSession((current) => {
      const index = current.cards.findIndex((card) => card.cardId === cardId);
      if (index < 0) {
        return current;
      }

      const source = current.cards[index];
      const duplicate = createBrainDumpComposerCard(source.type);
      duplicate.text = source.text;
      duplicate.bookmarked = source.bookmarked;
      duplicate.bookmarkCollectionId = source.bookmarkCollectionId;

      const nextCards = [...current.cards];
      nextCards.splice(index + 1, 0, duplicate);

      return {
        ...current,
        cards: nextCards,
        updatedAt: new Date().toISOString(),
      };
    });
  }

  function deleteCard(cardId: string) {
    setSession((current) => {
      if (current.cards.length <= 1) {
        return current;
      }

      return {
        ...current,
        cards: current.cards.filter((card) => card.cardId !== cardId),
        updatedAt: new Date().toISOString(),
      };
    });
  }

  function resetSession() {
    clearBrainDumpComposerSession(activeProjectId, insertionItemId);
    setSession(createEmptyBrainDumpComposerSession(activeProjectId, insertionItemId));
    setError(null);
  }

  async function handleProcessSession() {
    setProcessing(true);
    setError(null);

    try {
      const nextCards = await processCards({
        activeProjectId,
        initialValues,
        insertionContext,
        session,
        timelineEvents,
        uid,
      });

      setSession((current) => ({
        ...current,
        cards: nextCards,
        updatedAt: new Date().toISOString(),
      }));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to process cards.");
    } finally {
      setProcessing(false);
    }
  }

  async function handleProcessSingleCard(cardId: string, index: number) {
    setProcessing(true);
    setError(null);

    try {
      const currentCard = session.cards[index];

      if (!currentCard || currentCard.cardId !== cardId) {
        throw new Error("The selected card could not be processed.");
      }

      const nextCard = await processSingleCard({
        activeProjectId,
        card: currentCard,
        index,
        initialValues,
        insertionContext,
        timelineEvents,
        uid,
        cardsBefore: session.cards.slice(0, index),
      });

      setSession((current) => ({
        ...current,
        cards: current.cards.map((card) => (card.cardId === cardId ? nextCard : card)),
        updatedAt: new Date().toISOString(),
      }));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to process card.");
    } finally {
      setProcessing(false);
    }
  }

  async function handlePublishSession() {
    setPublishing(true);
    setError(null);

    try {
      const nextCards = await processCards({
        activeProjectId,
        initialValues,
        insertionContext,
        session,
        timelineEvents,
        uid,
      });

      const boundaryPredecessors = uniqueValues(initialValues.predecessorEventIds);
      const boundarySuccessors = uniqueValues(initialValues.successorEventIds);
      const createdEventIds: string[] = [];

      for (let index = 0; index < nextCards.length; index += 1) {
        const card = nextCards[index];
        const previousCreatedEventId = createdEventIds[createdEventIds.length - 1] ?? null;
        const isFirstPublishedCard = index === 0;
        const isLastPublishedCard = index === nextCards.length - 1;

        if (!card.text.trim()) {
          throw new Error(`Card ${index + 1} is empty.`);
        }

        const values = await buildTimelineEventValuesForPublish({
          activeProjectId,
          card,
          initialValues,
          previousCreatedEventId,
          uid,
        });

        values.predecessorEventIds = uniqueValues([
          ...values.predecessorEventIds,
          ...(isFirstPublishedCard ? boundaryPredecessors : []),
          ...(previousCreatedEventId ? [previousCreatedEventId] : []),
        ]);
        values.successorEventIds = uniqueValues([
          ...values.successorEventIds,
          ...(isLastPublishedCard ? boundarySuccessors : []),
        ]);

        const createdTimelineEventId = await createTimelineEventForProject(
          uid,
          activeProjectId,
          values,
          {
            creationSource: card.type === "manual" ? "manual" : "ai_single",
            sourceBrainDumpText: card.text.trim(),
            sourceInsertionItemId: insertionItemId ?? null,
            sourceJobId: null,
          }
        );

        if (card.bookmarked) {
          await setTimelineEventBookmarkedForProject(
            uid,
            activeProjectId,
            createdTimelineEventId,
            true,
            card.bookmarkCollectionId
          );
        }

        createdEventIds.push(createdTimelineEventId);
      }

      clearBrainDumpComposerSession(activeProjectId, insertionItemId);
      await onPublished();
      onClose();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to publish cards.");
    } finally {
      setPublishing(false);
    }
  }

  async function handleBookmarkSave(
    selection: { mode: "existing"; collectionId: string } | { mode: "new"; collectionColor: string; collectionName: string }
  ) {
    if (!bookmarkPickerState) {
      return;
    }

    const collectionId =
      selection.mode === "existing"
        ? selection.collectionId
        : createTimelineBookmarkCollection(activeProjectId, {
            color: normalizeTimelineBookmarkCollectionColor(selection.collectionColor),
            name: selection.collectionName,
          }).id;

    updateCard(bookmarkPickerState.cardId, (current) => ({
      ...current,
      bookmarked: true,
      bookmarkCollectionId: collectionId,
      updatedAt: new Date().toISOString(),
    }));
    setBookmarkPickerState(null);
  }

  const readyCount = session.cards.filter((card) => card.status === "ready" || card.type === "manual").length;
  const aiCount = session.cards.filter((card) => card.type === "ai").length;

  return (
    <section className="space-y-4">
      <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-[0_20px_45px_-38px_rgba(24,24,27,0.4)]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
              Multi-event composer
            </p>
            <h3 className="mt-2 text-lg font-semibold tracking-tight text-zinc-950">
              Build one card per event
            </h3>
            <p className="mt-2 text-sm leading-6 text-zinc-600">
              AI cards process one at a time. Manual cards stay manual-only, but their text still
              feeds continuity for the next cards.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => addCard("ai")}
              className="inline-flex h-10 items-center justify-center rounded-full border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
            >
              Add AI card
            </button>
            <button
              type="button"
              onClick={() => addCard("manual")}
              className="inline-flex h-10 items-center justify-center rounded-full border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
            >
              Add manual card
            </button>
            <button
              type="button"
              onClick={() => void handleProcessSession()}
              disabled={processing || publishing}
              className="inline-flex h-10 items-center justify-center rounded-full bg-zinc-950 px-4 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-300"
            >
              {processing ? "Processing..." : "Process cards"}
            </button>
            <button
              type="button"
              onClick={() => void handlePublishSession()}
              disabled={publishing}
              className="inline-flex h-10 items-center justify-center rounded-full bg-amber-500 px-4 text-sm font-medium text-white transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:bg-zinc-300"
            >
              {publishing ? "Publishing..." : "Publish"}
            </button>
            <button
              type="button"
              onClick={resetSession}
              className="inline-flex h-10 items-center justify-center rounded-full border border-zinc-200 px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
            >
              Reset
            </button>
          </div>
        </div>

        <p className="mt-3 text-xs text-zinc-500">
          Ready cards: {readyCount} / {aiCount + session.cards.filter((card) => card.type === "manual").length}
        </p>

        {error ? (
          <p className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}
      </div>

      <div className="space-y-4">
        {session.cards.map((card, index) => (
          <article
            key={card.cardId}
            className="rounded-3xl border border-zinc-200 bg-[#fffdf9] p-5 shadow-[0_20px_45px_-38px_rgba(24,24,27,0.42)]"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                  {card.type === "ai" ? "Brain dump event" : "Manual event"} {index + 1}
                </p>
                <p className="mt-2 text-sm text-zinc-600">
                  {card.type === "ai"
                    ? "This card will be processed as a single AI event."
                    : "This card stays manual-only and publishes as-is."}
                </p>
              </div>

              <details className="relative">
                <summary className="list-none cursor-pointer rounded-full border border-zinc-200 bg-white px-3 py-2 text-xl leading-none text-zinc-700 transition hover:bg-zinc-50">
                  ...
                </summary>
                <div className="absolute right-0 z-20 mt-2 w-56 rounded-3xl border border-zinc-200 bg-white p-2 shadow-2xl">
                  <button
                    type="button"
                    onClick={() => setBookmarkPickerState({ cardId: card.cardId, collectionId: card.bookmarkCollectionId })}
                    className="block w-full rounded-2xl px-3 py-2 text-left text-sm text-zinc-700 transition hover:bg-zinc-50"
                  >
                    {card.bookmarked ? "Edit bookmark" : "Bookmark"}
                  </button>
                  {card.bookmarked ? (
                    <button
                      type="button"
                      onClick={() =>
                        updateCard(card.cardId, (current) => ({
                          ...current,
                          bookmarked: false,
                          bookmarkCollectionId: null,
                          updatedAt: new Date().toISOString(),
                        }))
                      }
                      className="block w-full rounded-2xl px-3 py-2 text-left text-sm text-zinc-700 transition hover:bg-zinc-50"
                    >
                      Remove bookmark
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => duplicateCard(card.cardId)}
                    className="block w-full rounded-2xl px-3 py-2 text-left text-sm text-zinc-700 transition hover:bg-zinc-50"
                  >
                    Duplicate below
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteCard(card.cardId)}
                    disabled={session.cards.length <= 1}
                    className="block w-full rounded-2xl px-3 py-2 text-left text-sm text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:text-zinc-400"
                  >
                    Delete card
                  </button>
                </div>
              </details>
            </div>

            <label className="mt-4 block">
              <span className="mb-2 block text-xs font-medium uppercase tracking-[0.14em] text-zinc-500">
                Card text
              </span>
              <textarea
                value={card.text}
                onChange={(event) =>
                  updateCard(card.cardId, (current) => ({
                    ...current,
                    aiDraft: null,
                    error: null,
                    status: current.type === "manual" ? "idle" : "idle",
                    text: event.target.value,
                    updatedAt: new Date().toISOString(),
                  }))
                }
                className="min-h-44 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm leading-6 text-zinc-900 outline-none transition focus:border-zinc-400"
                placeholder="Paste a brain dump or write a manual event here."
              />
            </label>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-zinc-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-600">
                  {card.type}
                </span>
                <span className="rounded-full bg-zinc-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-600">
                  {card.status}
                </span>
                {card.bookmarked ? (
                  <span className="rounded-full bg-amber-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-900">
                    bookmarked
                  </span>
                ) : null}
              </div>

              {card.type === "ai" ? (
                <button
                  type="button"
                  onClick={() => void handleProcessSingleCard(card.cardId, index)}
                  disabled={processing || publishing}
                  className="inline-flex h-10 items-center justify-center rounded-full bg-zinc-950 px-4 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-300"
                >
                  Process card
                </button>
              ) : null}
            </div>

            {card.aiDraft ? (
              <div className="mt-4 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-4 text-sm text-zinc-700">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                  AI draft
                </p>
                <p className="mt-2 font-medium text-zinc-950">
                  {card.aiDraft.preview.prefill.title || "Untitled draft"}
                </p>
                <p className="mt-2 leading-6">
                  {card.aiDraft.preview.prefill.summary || "No summary extracted yet."}
                </p>
                <p className="mt-3 text-xs text-zinc-500">
                  {card.aiDraft.preview.entitySuggestions.length} entity suggestion(s)
                </p>
              </div>
            ) : null}

            {card.error ? (
              <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {card.error}
              </p>
            ) : null}
          </article>
        ))}
      </div>

      {bookmarkPickerState ? (
        <TimelineBookmarkCollectionPicker
          collections={bookmarkCollections}
          initialCollectionId={bookmarkPickerState.collectionId}
          open
          onClose={() => setBookmarkPickerState(null)}
          onSave={handleBookmarkSave}
        />
      ) : null}
    </section>
  );
}

async function processCards({
  activeProjectId,
  initialValues,
  insertionContext,
  session,
  timelineEvents,
  uid,
}: {
  activeProjectId: string;
  initialValues: TimelineEventFormValues;
  insertionContext: TimelineBrainDumpInsertionContext | null;
  session: TimelineBrainDumpComposerSession;
  timelineEvents: TimelineEvent[];
  uid: string;
}): Promise<TimelineBrainDumpComposerCard[]> {
  const nextCards = session.cards.map((card) => ({ ...card }));

  for (let index = 0; index < nextCards.length; index += 1) {
    const card = nextCards[index];

    if (card.type !== "ai") {
      continue;
    }

    const nextCard = await processSingleCard({
      activeProjectId,
      card,
      index,
      initialValues,
      insertionContext,
      timelineEvents,
      uid,
      cardsBefore: nextCards.slice(0, index),
    });

    nextCards[index] = nextCard;
  }

  return nextCards;
}

async function processSingleCard({
  activeProjectId,
  card,
  index,
  initialValues,
  insertionContext,
  timelineEvents,
  uid,
  cardsBefore,
}: {
  activeProjectId: string;
  card: TimelineBrainDumpComposerCard;
  index: number;
  initialValues: TimelineEventFormValues;
  insertionContext: TimelineBrainDumpInsertionContext | null;
  timelineEvents: TimelineEvent[];
  uid: string;
  cardsBefore: TimelineBrainDumpComposerCard[];
}): Promise<TimelineBrainDumpComposerCard> {
  if (card.type !== "ai") {
    return card;
  }

  const normalizedText = card.text.trim();

  if (!normalizedText) {
    return {
      ...card,
      error: "Enter a brain dump before processing.",
      status: "failed" as const,
      updatedAt: new Date().toISOString(),
    } as TimelineBrainDumpComposerCard;
  }

  const referenceContext = buildReferenceContext({
    cards: cardsBefore,
    timelineEvents,
  });

  const preview = await window.bookBible.ai.previewTimelineBrainDump({
    brainDumpText: normalizedText,
    projectContext: buildProjectContext(initialValues, insertionContext, referenceContext),
  });

  const draftState = buildAutoDraftState(preview, normalizedText);
  return {
    ...card,
    aiDraft: draftState,
    error: null,
    status: "ready",
    updatedAt: new Date().toISOString(),
  };
}

function buildAutoDraftState(
  preview: BrainDumpPreviewResult,
  brainDumpText: string
): AiTimelineCreateDraftState {
  return {
    approvedAt: new Date().toISOString(),
    brainDumpText,
    preview,
    resolutions: buildAutoResolutions(preview.entitySuggestions),
  };
}

function buildAutoResolutions(suggestions: BrainDumpEntitySuggestion[]): BrainDumpResolution[] {
  return suggestions
    .map((suggestion) => {
      const exactCandidate = suggestion.candidates[0] ?? null;

      if (suggestion.suggestedAction === "ignore") {
        return null;
      }

      const action =
        suggestion.suggestedAction === "link" && exactCandidate
          ? "link"
          : suggestion.suggestedAction === "create"
            ? "create"
            : exactCandidate
              ? "link"
              : suggestion.confidence === "high" || suggestion.confidence === "confirmed"
                ? "create"
                : "ignore";

      if (action === "ignore") {
        return null;
      }

      const resolution: BrainDumpResolution = {
        action,
        suggestionId: suggestion.id,
        target: suggestion.target,
      };

      if (action === "link" && exactCandidate) {
        resolution.linkedId = exactCandidate.id;
      }

      return resolution;
    })
    .filter(Boolean) as BrainDumpResolution[];
}

function buildProjectContext(
  initialValues: TimelineEventFormValues,
  insertionContext: TimelineBrainDumpInsertionContext | null,
  referenceContext: TimelineBrainDumpReferenceContext
): TimelineBrainDumpProjectContext {
  return {
    insertionContext: insertionContext ?? undefined,
    predecessorEventIds: initialValues.predecessorEventIds,
    referenceContext,
    successorEventIds: initialValues.successorEventIds,
    yearEnd: initialValues.yearEnd,
    yearStart: initialValues.yearStart,
  };
}

function buildReferenceContext({
  cards,
  timelineEvents,
}: {
  cards: TimelineBrainDumpComposerCard[];
  timelineEvents: TimelineEvent[];
}): TimelineBrainDumpReferenceContext {
  const referenceCards: TimelineBrainDumpReferenceCard[] = cards.map((card) => ({
    bookmarked: card.bookmarked,
    cardId: card.cardId,
    cardType: card.type,
    publishedTimelineEventId: card.publishedTimelineEventId,
    status: card.status,
    summary: getCardSummary(card.text),
    text: card.text.trim(),
    title: getCardTitle(card.text),
  }));

  const relatedEvents = new Map<string, TimelineBrainDumpReferenceContext["relatedEvents"][number]>();

  for (const card of cards) {
    if (!card.aiDraft || card.type !== "ai") {
      continue;
    }

    for (const resolution of card.aiDraft.resolutions) {
      if (resolution.action === "ignore" || !resolution.linkedId) {
        continue;
      }

      const suggestion = card.aiDraft.preview.entitySuggestions.find(
        (entry) => entry.id === resolution.suggestionId
      );

      if (!suggestion) {
        continue;
      }

      const matchingEvents = findEventsForSuggestion(timelineEvents, suggestion, resolution.linkedId);

      for (const event of matchingEvents) {
        const key = `${event.id}:${suggestion.target}:${suggestion.mention}`;

        if (relatedEvents.has(key)) {
          continue;
        }

        const relation = shouldIncludeDescription(suggestion, event) ? "description" : "summary";
        relatedEvents.set(key, {
          bookmarkCollectionId: getBookmarkCollectionId(event),
          bookmarked: event.tags.includes("bookmarked"),
          description: relation === "description" ? event.description : "",
          eventId: event.id,
          relation,
          summary: event.summary,
          title: event.title,
        });
      }
    }
  }

  return {
    cards: referenceCards,
    relatedEvents: Array.from(relatedEvents.values()).slice(0, 16),
  };
}

function findEventsForSuggestion(
  timelineEvents: TimelineEvent[],
  suggestion: BrainDumpEntitySuggestion,
  linkedId: string
) {
  return timelineEvents.filter((event) => {
    if (suggestion.target === "era") {
      return event.eraId === linkedId;
    }

    if (suggestion.target === "book") {
      return event.bookIds.includes(linkedId);
    }

    if (suggestion.target === "chapter") {
      return event.chapterIds.includes(linkedId);
    }

    if (suggestion.target === "scene") {
      return event.sceneIds.includes(linkedId);
    }

    if (suggestion.target === "character") {
      return event.characterIds.includes(linkedId);
    }

    if (suggestion.target === "location") {
      return event.locationIds.includes(linkedId);
    }

    if (suggestion.target === "faction") {
      return event.factionIds.includes(linkedId);
    }

    if (suggestion.target === "culture") {
      return event.cultureIds.includes(linkedId);
    }

    if (suggestion.target === "religion") {
      return event.religionIds.includes(linkedId);
    }

    if (suggestion.target === "technology") {
      return event.technologyIds.includes(linkedId);
    }

    if (suggestion.target === "plotThread") {
      return event.plotThreadIds.includes(linkedId);
    }

    if (suggestion.target === "theme") {
      return event.themeIds.includes(linkedId);
    }

    return false;
  });
}

function shouldIncludeDescription(
  suggestion: BrainDumpEntitySuggestion,
  event: TimelineEvent
) {
  const title = normalizeText(event.title);
  const summary = normalizeText(event.summary);
  const mention = normalizeText(suggestion.mention);

  return (
    event.description.trim().length > 0 &&
    event.description.trim().length <= 2000 &&
    (suggestion.confidence === "confirmed" ||
      suggestion.confidence === "high" ||
      title.includes(mention) ||
      summary.includes(mention))
  );
}

function getBookmarkCollectionId(event: TimelineEvent) {
  const tag = event.tags.find((entry) => entry.startsWith("bookmark:"));
  return tag ? tag.slice("bookmark:".length) : null;
}

function getCardTitle(text: string) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean)
    ?.slice(0, 72)
    || "Untitled card";
}

function getCardSummary(text: string) {
  return text
    .split(/\n{2,}/g)
    .map((paragraph) => paragraph.trim())
    .find(Boolean)
    ?.slice(0, 280)
    || "";
}

function normalizeText(value: string) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function createEmptyManualValues(initialValues: TimelineEventFormValues) {
  const values = createEmptyTimelineEventFormValues();
  values.status = initialValues.status;
  values.eventType = initialValues.eventType;
  values.yearStart = initialValues.yearStart;
  values.monthStart = initialValues.monthStart;
  values.dayStart = initialValues.dayStart;
  values.yearEnd = initialValues.yearEnd;
  values.monthEnd = initialValues.monthEnd;
  values.dayEnd = initialValues.dayEnd;
  values.chronologyOrder = initialValues.chronologyOrder;
  values.timeOfDayLabel = initialValues.timeOfDayLabel;
  values.displayDateLabel = initialValues.displayDateLabel;
  values.eraId = initialValues.eraId;
  values.predecessorEventIds = [...initialValues.predecessorEventIds];
  values.successorEventIds = [...initialValues.successorEventIds];
  values.publicWikiSummary = initialValues.publicWikiSummary;
  return values;
}

async function buildTimelineEventValuesForPublish({
  activeProjectId,
  card,
  initialValues,
  previousCreatedEventId,
  uid,
}: {
  activeProjectId: string;
  card: TimelineBrainDumpComposerCard;
  initialValues: TimelineEventFormValues;
  previousCreatedEventId: string | null;
  uid: string;
}) {
  if (card.type === "manual") {
    const values = createEmptyManualValues(initialValues);
    values.title = getCardTitle(card.text);
    values.summary = getCardSummary(card.text) || values.title;
    values.description = card.text.trim();
    return normalizeTimelineEventFormValues(values);
  }

  if (!card.aiDraft) {
    throw new Error(`AI card "${getCardTitle(card.text)}" has not been processed yet.`);
  }

  const baseValues = {
    ...card.aiDraft.preview.prefill,
    predecessorEventIds: [...card.aiDraft.preview.prefill.predecessorEventIds],
    successorEventIds: [...card.aiDraft.preview.prefill.successorEventIds],
  } as TimelineEventFormValues;

  const normalizedValues = normalizeTimelineEventFormValues(baseValues);
  return applyAiDraftResolutionsToTimelineValues({
    activeProjectId,
    aiDraftState: card.aiDraft,
    uid,
    values: normalizedValues,
  });
}
