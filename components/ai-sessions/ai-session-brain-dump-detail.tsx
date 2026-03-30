"use client";

import { useEffect, useState } from "react";

import { AiSessionDetailSection } from "@/components/ai-sessions/ai-session-detail-section";
import type { AiSession } from "@/types/ai-session";
import type {
  BrainDumpExtractionResult,
  BrainDumpProposalDuplicateCandidate,
  BrainDumpProposalMatchCandidate,
  BrainDumpProposalReview,
  BrainDumpProposalReviewStatus,
  BrainDumpProposalSuggestedAction,
  BrainDumpTimelinePlacement,
  BrainDumpTimelinePlacementSuggestion,
} from "@/types/ai-brain-dump";
import {
  normalizeBrainDumpCharacterProposalContext,
  normalizeBrainDumpChapterProposalContext,
  normalizeBrainDumpSceneProposalContext,
  normalizeBrainDumpTimelineProposalContext,
  type BrainDumpCharacterProposalContext,
  type BrainDumpChapterProposalContext,
  type BrainDumpContextRecordSummary,
  type BrainDumpSceneProposalContext,
  type BrainDumpTimelineProposalContext,
} from "@/types/ai-brain-dump-context";

type AiSessionBrainDumpDetailProps = {
  aiSession: AiSession;
};

export function AiSessionBrainDumpDetail({ aiSession }: AiSessionBrainDumpDetailProps) {
  const [extractionResult, setExtractionResult] = useState(aiSession.extractionResult);

  return (
    <>
      <AiSessionDetailSection title="Brain dump source">
        <div className="space-y-4">
          <TextPanel label="AI guidance" value={aiSession.sourceGuidance} fallback="No additional guidance." />
          <TextPanel label="Source text" value={aiSession.sourceText} fallback="No source text saved." />
        </div>
      </AiSessionDetailSection>

      <AiSessionDetailSection title="Extraction status">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <DetailItem label="Extraction status" value={formatEnumLabel(aiSession.extractionStatus)} />
          <DetailItem label="Extraction model" value={aiSession.extractionModel || aiSession.model || "None"} />
          <DetailItem label="Provider" value={aiSession.provider || "None"} />
          <DetailItem label="Messages count" value={String(aiSession.messagesCount ?? "Unknown")} />
        </div>
        {aiSession.extractionError ? (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {aiSession.extractionError}
          </div>
        ) : null}
      </AiSessionDetailSection>

      {extractionResult ? (
        <>
          <AiSessionDetailSection title="Extraction overview">
            <div className="space-y-4">
              <TextPanel
                label="Summary"
                value={extractionResult.summary || aiSession.summary}
                fallback="No extraction summary."
              />
              <ListPanel
                label="Continuity warnings"
                values={extractionResult.continuityWarnings}
                fallback="No continuity warnings."
              />
              <ListPanel
                label="Unresolved questions"
                values={extractionResult.unresolvedQuestions}
                fallback="No unresolved questions."
              />
              <ListPanel
                label="Suggested next actions"
                values={extractionResult.suggestedNextActions}
                fallback="No suggested next actions."
              />
            </div>
          </AiSessionDetailSection>

          <ProposalSection
            title="Character proposals"
            emptyMessage="No character proposals were extracted."
            items={extractionResult.characters.map((proposal, proposalIndex) => ({
              title: proposal.name,
              badges: buildProposalBadges(proposal.review),
              fields: [
                { label: "Summary", value: proposal.summary },
                {
                  label: "Type",
                  value: compactList([proposal.characterType, proposal.importanceLevel]),
                },
                { label: "Matched record", value: formatMatchedRecord(proposal.review.matchedRecord) },
                {
                  label: "Candidate matches",
                  value: formatMatchCandidates(proposal.review.matchCandidates),
                },
                {
                  label: "Possible duplicate proposals",
                  value: formatDuplicateCandidates(proposal.review.duplicateCandidates),
                },
                { label: "Traits", value: compactList(proposal.traits) },
                { label: "Motivations", value: compactList(proposal.motivations) },
                { label: "Related scenes", value: compactList(proposal.relatedSceneTitles) },
                { label: "Evidence", value: proposal.evidence },
                { label: "Confidence", value: formatEnumLabel(proposal.confidence) },
              ],
              extra: (
                <div className="space-y-4">
                  <CharacterProposalReviewPanel
                    aiSessionId={aiSession.id}
                    proposalIndex={proposalIndex}
                    review={proposal.review}
                    onUpdatedProposal={(updatedProposal) => {
                      setExtractionResult((current) =>
                        replaceCharacterProposal(current, proposalIndex, updatedProposal)
                      );
                    }}
                  />
                  <CharacterProposalContextPanel
                    aiSessionId={aiSession.id}
                    proposalIndex={proposalIndex}
                  />
                </div>
              ),
            }))}
          />

          <ProposalSection
            title="Timeline event proposals"
            emptyMessage="No timeline event proposals were extracted."
            items={extractionResult.timelineEvents.map((proposal, proposalIndex) => ({
              title: proposal.title,
              badges: buildProposalBadges(proposal.review, proposal.placementSuggestion),
              fields: [
                { label: "Summary", value: proposal.summary },
                {
                  label: "Placement",
                  value: compactList([formatEnumLabel(proposal.eventType), proposal.dateLabel]),
                },
                {
                  label: "Suggested placement",
                  value: formatPlacementSuggestion(proposal.placementSuggestion),
                },
                { label: "Matched record", value: formatMatchedRecord(proposal.review.matchedRecord) },
                {
                  label: "Candidate matches",
                  value: formatMatchCandidates(proposal.review.matchCandidates),
                },
                {
                  label: "Possible duplicate proposals",
                  value: formatDuplicateCandidates(proposal.review.duplicateCandidates),
                },
                { label: "Characters", value: compactList(proposal.linkedCharacterNames) },
                { label: "Locations", value: compactList(proposal.linkedLocationNames) },
                { label: "Chapters", value: compactList(proposal.linkedChapterTitles) },
                { label: "Scenes", value: compactList(proposal.linkedSceneTitles) },
                { label: "Evidence", value: proposal.evidence },
                { label: "Confidence", value: formatEnumLabel(proposal.confidence) },
              ],
              extra: (
                <div className="space-y-4">
                  <TimelineProposalReviewPanel
                    aiSessionId={aiSession.id}
                    proposalIndex={proposalIndex}
                    review={proposal.review}
                    placementSuggestion={proposal.placementSuggestion}
                    onUpdatedProposal={(updatedProposal) => {
                      setExtractionResult((current) =>
                        replaceTimelineProposal(current, proposalIndex, updatedProposal)
                      );
                    }}
                  />
                  <TimelineProposalContextPanel
                    aiSessionId={aiSession.id}
                    proposalIndex={proposalIndex}
                  />
                </div>
              ),
            }))}
          />

          <ProposalSection
            title="Chapter outline proposals"
            emptyMessage="No chapter outline proposals were extracted."
            items={extractionResult.chapterOutlines.map((proposal, proposalIndex) => ({
              title: proposal.title,
              badges: buildProposalBadges(proposal.review),
              fields: [
                { label: "Summary", value: proposal.summary },
                { label: "Matched record", value: formatMatchedRecord(proposal.review.matchedRecord) },
                {
                  label: "Candidate matches",
                  value: formatMatchCandidates(proposal.review.matchCandidates),
                },
                {
                  label: "Possible duplicate proposals",
                  value: formatDuplicateCandidates(proposal.review.duplicateCandidates),
                },
                { label: "Purpose", value: proposal.purpose },
                { label: "POV", value: proposal.pointOfViewCharacterName },
                { label: "Estimated chapter number", value: proposal.estimatedChapterNumber },
                { label: "Scene titles", value: compactList(proposal.sceneTitles) },
                { label: "Evidence", value: proposal.evidence },
                { label: "Confidence", value: formatEnumLabel(proposal.confidence) },
              ],
              extra: (
                <div className="space-y-4">
                  <ChapterProposalReviewPanel
                    aiSessionId={aiSession.id}
                    proposalIndex={proposalIndex}
                    review={proposal.review}
                    onUpdatedProposal={(updatedProposal) => {
                      setExtractionResult((current) =>
                        replaceChapterProposal(current, proposalIndex, updatedProposal)
                      );
                    }}
                  />
                  <ChapterProposalContextPanel
                    aiSessionId={aiSession.id}
                    proposalIndex={proposalIndex}
                  />
                </div>
              ),
            }))}
          />

          <ProposalSection
            title="Scene proposals"
            emptyMessage="No scene proposals were extracted."
            items={extractionResult.scenes.map((proposal, proposalIndex) => ({
              title: proposal.title,
              badges: buildProposalBadges(proposal.review),
              fields: [
                { label: "Summary", value: proposal.summary },
                {
                  label: "Type and POV",
                  value: compactList([
                    formatEnumLabel(proposal.sceneType),
                    proposal.pointOfViewCharacterName,
                  ]),
                },
                { label: "Matched record", value: formatMatchedRecord(proposal.review.matchedRecord) },
                {
                  label: "Candidate matches",
                  value: formatMatchCandidates(proposal.review.matchCandidates),
                },
                {
                  label: "Possible duplicate proposals",
                  value: formatDuplicateCandidates(proposal.review.duplicateCandidates),
                },
                { label: "Goal", value: proposal.goal },
                { label: "Conflict", value: proposal.conflict },
                { label: "Outcome", value: proposal.outcome },
                {
                  label: "Linked timeline events",
                  value: compactList(proposal.linkedTimelineEventTitles),
                },
                { label: "Evidence", value: proposal.evidence },
                { label: "Confidence", value: formatEnumLabel(proposal.confidence) },
              ],
              extra: (
                <div className="space-y-4">
                  <SceneProposalReviewPanel
                    aiSessionId={aiSession.id}
                    proposalIndex={proposalIndex}
                    review={proposal.review}
                    onUpdatedProposal={(updatedProposal) => {
                      setExtractionResult((current) =>
                        replaceSceneProposal(current, proposalIndex, updatedProposal)
                      );
                    }}
                  />
                  <SceneProposalContextPanel
                    aiSessionId={aiSession.id}
                    proposalIndex={proposalIndex}
                  />
                </div>
              ),
            }))}
          />
        </>
      ) : null}
    </>
  );
}

function ProposalSection({
  title,
  items,
  emptyMessage,
}: {
  title: string;
  items: Array<{
    title: string;
    badges?: string[];
    fields: Array<{ label: string; value: string }>;
    extra?: React.ReactNode;
  }>;
  emptyMessage: string;
}) {
  return (
    <AiSessionDetailSection title={title}>
      {items.length > 0 ? (
        <div className="grid gap-4">
          {items.map((item, index) => (
            <article
              key={`${title}-${item.title}-${index}`}
              className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4"
            >
              <h3 className="text-base font-semibold tracking-tight text-zinc-950">{item.title}</h3>
              {item.badges?.length ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {item.badges.map((badge) => (
                    <span
                      key={`${item.title}-${badge}`}
                      className="rounded-full bg-white px-3 py-1 text-xs font-medium text-zinc-600 ring-1 ring-zinc-200"
                    >
                      {badge}
                    </span>
                  ))}
                </div>
              ) : null}
              <div className="mt-4 grid gap-3 lg:grid-cols-2">
                {item.fields.map((field) => (
                  <div key={`${item.title}-${field.label}`}>
                    <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
                      {field.label}
                    </p>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-700">
                      {field.value || "None"}
                    </p>
                  </div>
                ))}
              </div>
              {item.extra ? <div className="mt-4">{item.extra}</div> : null}
            </article>
          ))}
        </div>
      ) : (
        <p className="text-sm text-zinc-500">{emptyMessage}</p>
      )}
    </AiSessionDetailSection>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">{label}</p>
      <p className="mt-2 wrap-break-word text-sm font-medium text-zinc-900">{value}</p>
    </div>
  );
}

function CharacterProposalReviewPanel({
  aiSessionId,
  proposalIndex,
  review,
  onUpdatedProposal,
}: {
  aiSessionId: string;
  proposalIndex: number;
  review: BrainDumpProposalReview;
  onUpdatedProposal: (
    updatedProposal: BrainDumpExtractionResult["characters"][number]
  ) => void;
}) {
  const [reviewStatus, setReviewStatus] = useState<BrainDumpProposalReviewStatus>(review.reviewStatus);
  const [suggestedAction, setSuggestedAction] = useState<BrainDumpProposalSuggestedAction>(
    review.suggestedAction
  );
  const [matchedRecordId, setMatchedRecordId] = useState(review.matchedRecord?.recordId ?? "");
  const [saving, setSaving] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const matchOptions = getProposalMatchOptions(review);

  useEffect(() => {
    setReviewStatus(review.reviewStatus);
    setSuggestedAction(review.suggestedAction);
    setMatchedRecordId(review.matchedRecord?.recordId ?? "");
  }, [review.reviewStatus, review.suggestedAction, review.matchedRecord]);

  const isDirty =
    reviewStatus !== review.reviewStatus ||
    suggestedAction !== review.suggestedAction ||
    matchedRecordId !== (review.matchedRecord?.recordId ?? "");
  const applyGuardReason = getProposalApplyGuardReason({
    reviewStatus,
    suggestedAction,
    isDirty,
    matchedRecord: review.matchedRecord,
    requiredEntityType: "characters",
    entityLabel: "character",
  });

  async function handleSaveReview() {
    if (saving || !isDirty) {
      return;
    }

    setSaving(true);
    setError(null);
    setSavedMessage(null);

    try {
      const response = await fetch(`/api/ai-sessions/${aiSessionId}/character-proposal-review`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          proposalIndex,
          reviewStatus,
          suggestedAction,
          matchedRecordId: matchedRecordId || null,
        }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { characterProposal?: BrainDumpExtractionResult["characters"][number]; error?: string }
        | null;

      if (!response.ok || !payload?.characterProposal) {
        throw new Error(payload?.error || "Unable to save character proposal review.");
      }

      onUpdatedProposal(payload.characterProposal);
      setSavedMessage("Review choices saved.");
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError.message : "Unable to save character proposal review."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-amber-800">
            Character review
          </p>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-amber-900/80">
            Save explicit review and action choices for this character proposal before any canon
            write happens.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleSaveReview}
            disabled={saving || applying || !isDirty}
            className="inline-flex h-10 items-center justify-center rounded-full bg-zinc-950 px-4 text-sm font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-50 hover:bg-zinc-800"
          >
            {saving ? "Saving..." : isDirty ? "Save review" : "Saved"}
          </button>
          <button
            type="button"
            onClick={handleApplyProposal}
            disabled={saving || applying || Boolean(applyGuardReason)}
            className="inline-flex h-10 items-center justify-center rounded-full border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-700 transition disabled:cursor-not-allowed disabled:opacity-50 hover:bg-zinc-50"
          >
            {applying ? "Applying..." : "Apply to characters"}
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <label className="block">
          <span className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
            Review status
          </span>
          <select
            value={reviewStatus}
            onChange={(event) => {
              setReviewStatus(event.target.value as BrainDumpProposalReviewStatus);
              setSavedMessage(null);
            }}
            className="mt-2 w-full rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700"
          >
            {BRAIN_DUMP_REVIEW_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
            Review action
          </span>
          <select
            value={suggestedAction}
            onChange={(event) => {
              setSuggestedAction(event.target.value as BrainDumpProposalSuggestedAction);
              setSavedMessage(null);
            }}
            className="mt-2 w-full rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700"
          >
            {BRAIN_DUMP_ACTION_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block lg:col-span-2">
          <span className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
            Target record
          </span>
          <select
            value={matchedRecordId}
            onChange={(event) => {
              setMatchedRecordId(event.target.value);
              setSavedMessage(null);
            }}
            className="mt-2 w-full rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700"
          >
            <option value="">No matched target</option>
            {matchOptions.map((option) => (
              <option key={option.recordId} value={option.recordId}>
                {formatMatchOption(option)}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error ? (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {savedMessage ? (
        <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {savedMessage}
        </div>
      ) : null}

      {applyGuardReason && suggestedAction !== "ignore" ? (
        <div className="mt-4 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-600">
          {applyGuardReason}
        </div>
      ) : null}

      {suggestedAction === "ignore" ? (
        <div className="mt-4 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-600">
          `Ignore` is a saved review decision only. It does not create or update a character.
        </div>
      ) : null}
    </div>
  );

  async function handleApplyProposal() {
    if (saving || applying || suggestedAction === "ignore") {
      return;
    }

    if (applyGuardReason) {
      setError(applyGuardReason);
      setSavedMessage(null);
      return;
    }

    setApplying(true);
    setError(null);
    setSavedMessage(null);

    try {
      const response = await fetch(`/api/ai-sessions/${aiSessionId}/character-proposal-apply`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          proposalIndex,
        }),
      });
      const payload = (await response.json().catch(() => null)) as
        | {
            characterProposal?: BrainDumpExtractionResult["characters"][number];
            appliedCharacter?: { id: string; name: string; action: string };
            error?: string;
          }
        | null;

      if (!response.ok || !payload?.characterProposal || !payload.appliedCharacter) {
        throw new Error(payload?.error || "Unable to apply this character proposal.");
      }

      onUpdatedProposal(payload.characterProposal);
      setSavedMessage(
        `Applied ${formatEnumLabel(payload.appliedCharacter.action)} to ${payload.appliedCharacter.name}.`
      );
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError.message : "Unable to apply this character proposal."
      );
    } finally {
      setApplying(false);
    }
  }
}

function ChapterProposalReviewPanel({
  aiSessionId,
  proposalIndex,
  review,
  onUpdatedProposal,
}: {
  aiSessionId: string;
  proposalIndex: number;
  review: BrainDumpProposalReview;
  onUpdatedProposal: (
    updatedProposal: BrainDumpExtractionResult["chapterOutlines"][number]
  ) => void;
}) {
  const [reviewStatus, setReviewStatus] = useState<BrainDumpProposalReviewStatus>(review.reviewStatus);
  const [suggestedAction, setSuggestedAction] = useState<BrainDumpProposalSuggestedAction>(
    review.suggestedAction
  );
  const [matchedRecordId, setMatchedRecordId] = useState(review.matchedRecord?.recordId ?? "");
  const [saving, setSaving] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const matchOptions = getProposalMatchOptions(review);

  useEffect(() => {
    setReviewStatus(review.reviewStatus);
    setSuggestedAction(review.suggestedAction);
    setMatchedRecordId(review.matchedRecord?.recordId ?? "");
  }, [review.reviewStatus, review.suggestedAction, review.matchedRecord]);

  const isDirty =
    reviewStatus !== review.reviewStatus ||
    suggestedAction !== review.suggestedAction ||
    matchedRecordId !== (review.matchedRecord?.recordId ?? "");
  const applyGuardReason = getProposalApplyGuardReason({
    reviewStatus,
    suggestedAction,
    isDirty,
    matchedRecord: review.matchedRecord,
    requiredEntityType: "chapters",
    entityLabel: "chapter",
  });

  async function handleSaveReview() {
    if (saving || !isDirty) {
      return;
    }

    setSaving(true);
    setError(null);
    setSavedMessage(null);

    try {
      const response = await fetch(`/api/ai-sessions/${aiSessionId}/chapter-proposal-review`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          proposalIndex,
          reviewStatus,
          suggestedAction,
          matchedRecordId: matchedRecordId || null,
        }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { chapterProposal?: BrainDumpExtractionResult["chapterOutlines"][number]; error?: string }
        | null;

      if (!response.ok || !payload?.chapterProposal) {
        throw new Error(payload?.error || "Unable to save chapter proposal review.");
      }

      onUpdatedProposal(payload.chapterProposal);
      setSavedMessage("Review choices saved.");
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError.message : "Unable to save chapter proposal review."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-amber-800">
            Chapter review
          </p>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-amber-900/80">
            Save explicit review and action choices for this chapter proposal before any canon
            write happens.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleSaveReview}
            disabled={saving || applying || !isDirty}
            className="inline-flex h-10 items-center justify-center rounded-full bg-zinc-950 px-4 text-sm font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-50 hover:bg-zinc-800"
          >
            {saving ? "Saving..." : isDirty ? "Save review" : "Saved"}
          </button>
          <button
            type="button"
            onClick={handleApplyProposal}
            disabled={saving || applying || Boolean(applyGuardReason)}
            className="inline-flex h-10 items-center justify-center rounded-full border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-700 transition disabled:cursor-not-allowed disabled:opacity-50 hover:bg-zinc-50"
          >
            {applying ? "Applying..." : "Apply to chapters"}
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <label className="block">
          <span className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
            Review status
          </span>
          <select
            value={reviewStatus}
            onChange={(event) => {
              setReviewStatus(event.target.value as BrainDumpProposalReviewStatus);
              setSavedMessage(null);
            }}
            className="mt-2 w-full rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700"
          >
            {BRAIN_DUMP_REVIEW_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
            Review action
          </span>
          <select
            value={suggestedAction}
            onChange={(event) => {
              setSuggestedAction(event.target.value as BrainDumpProposalSuggestedAction);
              setSavedMessage(null);
            }}
            className="mt-2 w-full rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700"
          >
            {BRAIN_DUMP_ACTION_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block lg:col-span-2">
          <span className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
            Target record
          </span>
          <select
            value={matchedRecordId}
            onChange={(event) => {
              setMatchedRecordId(event.target.value);
              setSavedMessage(null);
            }}
            className="mt-2 w-full rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700"
          >
            <option value="">No matched target</option>
            {matchOptions.map((option) => (
              <option key={option.recordId} value={option.recordId}>
                {formatMatchOption(option)}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error ? (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {savedMessage ? (
        <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {savedMessage}
        </div>
      ) : null}

      {applyGuardReason && suggestedAction !== "ignore" ? (
        <div className="mt-4 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-600">
          {applyGuardReason}
        </div>
      ) : null}

      {suggestedAction === "ignore" ? (
        <div className="mt-4 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-600">
          `Ignore` is a saved review decision only. It does not create or update a chapter.
        </div>
      ) : null}
    </div>
  );

  async function handleApplyProposal() {
    if (saving || applying || suggestedAction === "ignore") {
      return;
    }

    if (applyGuardReason) {
      setError(applyGuardReason);
      setSavedMessage(null);
      return;
    }

    setApplying(true);
    setError(null);
    setSavedMessage(null);

    try {
      const response = await fetch(`/api/ai-sessions/${aiSessionId}/chapter-proposal-apply`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          proposalIndex,
        }),
      });
      const payload = (await response.json().catch(() => null)) as
        | {
            chapterProposal?: BrainDumpExtractionResult["chapterOutlines"][number];
            appliedChapter?: { id: string; title: string; action: string };
            error?: string;
          }
        | null;

      if (!response.ok || !payload?.chapterProposal || !payload.appliedChapter) {
        throw new Error(payload?.error || "Unable to apply this chapter proposal.");
      }

      onUpdatedProposal(payload.chapterProposal);
      setSavedMessage(
        `Applied ${formatEnumLabel(payload.appliedChapter.action)} to ${payload.appliedChapter.title}.`
      );
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError.message : "Unable to apply this chapter proposal."
      );
    } finally {
      setApplying(false);
    }
  }
}

function SceneProposalReviewPanel({
  aiSessionId,
  proposalIndex,
  review,
  onUpdatedProposal,
}: {
  aiSessionId: string;
  proposalIndex: number;
  review: BrainDumpProposalReview;
  onUpdatedProposal: (
    updatedProposal: BrainDumpExtractionResult["scenes"][number]
  ) => void;
}) {
  const [reviewStatus, setReviewStatus] = useState<BrainDumpProposalReviewStatus>(review.reviewStatus);
  const [suggestedAction, setSuggestedAction] = useState<BrainDumpProposalSuggestedAction>(
    review.suggestedAction
  );
  const [matchedRecordId, setMatchedRecordId] = useState(review.matchedRecord?.recordId ?? "");
  const [saving, setSaving] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const matchOptions = getProposalMatchOptions(review);

  useEffect(() => {
    setReviewStatus(review.reviewStatus);
    setSuggestedAction(review.suggestedAction);
    setMatchedRecordId(review.matchedRecord?.recordId ?? "");
  }, [review.reviewStatus, review.suggestedAction, review.matchedRecord]);

  const isDirty =
    reviewStatus !== review.reviewStatus ||
    suggestedAction !== review.suggestedAction ||
    matchedRecordId !== (review.matchedRecord?.recordId ?? "");
  const applyGuardReason = getProposalApplyGuardReason({
    reviewStatus,
    suggestedAction,
    isDirty,
    matchedRecord: review.matchedRecord,
    requiredEntityType: "scenes",
    entityLabel: "scene",
  });

  async function handleSaveReview() {
    if (saving || !isDirty) {
      return;
    }

    setSaving(true);
    setError(null);
    setSavedMessage(null);

    try {
      const response = await fetch(`/api/ai-sessions/${aiSessionId}/scene-proposal-review`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          proposalIndex,
          reviewStatus,
          suggestedAction,
          matchedRecordId: matchedRecordId || null,
        }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { sceneProposal?: BrainDumpExtractionResult["scenes"][number]; error?: string }
        | null;

      if (!response.ok || !payload?.sceneProposal) {
        throw new Error(payload?.error || "Unable to save scene proposal review.");
      }

      onUpdatedProposal(payload.sceneProposal);
      setSavedMessage("Review choices saved.");
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError.message : "Unable to save scene proposal review."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-amber-800">
            Scene review
          </p>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-amber-900/80">
            Save explicit review and action choices for this scene proposal before any canon
            write happens.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleSaveReview}
            disabled={saving || applying || !isDirty}
            className="inline-flex h-10 items-center justify-center rounded-full bg-zinc-950 px-4 text-sm font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-50 hover:bg-zinc-800"
          >
            {saving ? "Saving..." : isDirty ? "Save review" : "Saved"}
          </button>
          <button
            type="button"
            onClick={handleApplyProposal}
            disabled={saving || applying || Boolean(applyGuardReason)}
            className="inline-flex h-10 items-center justify-center rounded-full border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-700 transition disabled:cursor-not-allowed disabled:opacity-50 hover:bg-zinc-50"
          >
            {applying ? "Applying..." : "Apply to scenes"}
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <label className="block">
          <span className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
            Review status
          </span>
          <select
            value={reviewStatus}
            onChange={(event) => {
              setReviewStatus(event.target.value as BrainDumpProposalReviewStatus);
              setSavedMessage(null);
            }}
            className="mt-2 w-full rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700"
          >
            {BRAIN_DUMP_REVIEW_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
            Review action
          </span>
          <select
            value={suggestedAction}
            onChange={(event) => {
              setSuggestedAction(event.target.value as BrainDumpProposalSuggestedAction);
              setSavedMessage(null);
            }}
            className="mt-2 w-full rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700"
          >
            {BRAIN_DUMP_ACTION_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block lg:col-span-2">
          <span className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
            Target record
          </span>
          <select
            value={matchedRecordId}
            onChange={(event) => {
              setMatchedRecordId(event.target.value);
              setSavedMessage(null);
            }}
            className="mt-2 w-full rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700"
          >
            <option value="">No matched target</option>
            {matchOptions.map((option) => (
              <option key={option.recordId} value={option.recordId}>
                {formatMatchOption(option)}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error ? (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {savedMessage ? (
        <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {savedMessage}
        </div>
      ) : null}

      {applyGuardReason && suggestedAction !== "ignore" ? (
        <div className="mt-4 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-600">
          {applyGuardReason}
        </div>
      ) : null}

      {suggestedAction === "ignore" ? (
        <div className="mt-4 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-600">
          `Ignore` is a saved review decision only. It does not create or update a scene.
        </div>
      ) : null}
    </div>
  );

  async function handleApplyProposal() {
    if (saving || applying || suggestedAction === "ignore") {
      return;
    }

    if (applyGuardReason) {
      setError(applyGuardReason);
      setSavedMessage(null);
      return;
    }

    setApplying(true);
    setError(null);
    setSavedMessage(null);

    try {
      const response = await fetch(`/api/ai-sessions/${aiSessionId}/scene-proposal-apply`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          proposalIndex,
        }),
      });
      const payload = (await response.json().catch(() => null)) as
        | {
            sceneProposal?: BrainDumpExtractionResult["scenes"][number];
            appliedScene?: { id: string; title: string; action: string };
            error?: string;
          }
        | null;

      if (!response.ok || !payload?.sceneProposal || !payload.appliedScene) {
        throw new Error(payload?.error || "Unable to apply this scene proposal.");
      }

      onUpdatedProposal(payload.sceneProposal);
      setSavedMessage(
        `Applied ${formatEnumLabel(payload.appliedScene.action)} to ${payload.appliedScene.title}.`
      );
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError.message : "Unable to apply this scene proposal."
      );
    } finally {
      setApplying(false);
    }
  }
}

function TimelineProposalReviewPanel({
  aiSessionId,
  proposalIndex,
  review,
  placementSuggestion,
  onUpdatedProposal,
}: {
  aiSessionId: string;
  proposalIndex: number;
  review: BrainDumpProposalReview;
  placementSuggestion: BrainDumpTimelinePlacementSuggestion;
  onUpdatedProposal: (
    updatedProposal: BrainDumpExtractionResult["timelineEvents"][number]
  ) => void;
}) {
  const [reviewStatus, setReviewStatus] = useState<BrainDumpProposalReviewStatus>(review.reviewStatus);
  const [suggestedAction, setSuggestedAction] = useState<BrainDumpProposalSuggestedAction>(
    review.suggestedAction
  );
  const [matchedRecordId, setMatchedRecordId] = useState(review.matchedRecord?.recordId ?? "");
  const [placement, setPlacement] = useState<BrainDumpTimelinePlacement>(
    placementSuggestion.placement
  );
  const [yearStartInput, setYearStartInput] = useState(
    formatNullableIntegerInput(placementSuggestion.yearStart)
  );
  const [yearEndInput, setYearEndInput] = useState(
    formatNullableIntegerInput(placementSuggestion.yearEnd)
  );
  const [displayDateLabel, setDisplayDateLabel] = useState(placementSuggestion.displayDateLabel);
  const [saving, setSaving] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const matchOptions = getProposalMatchOptions(review);

  useEffect(() => {
    setReviewStatus(review.reviewStatus);
    setSuggestedAction(review.suggestedAction);
    setMatchedRecordId(review.matchedRecord?.recordId ?? "");
  }, [review.reviewStatus, review.suggestedAction, review.matchedRecord]);

  useEffect(() => {
    setPlacement(placementSuggestion.placement);
    setYearStartInput(formatNullableIntegerInput(placementSuggestion.yearStart));
    setYearEndInput(formatNullableIntegerInput(placementSuggestion.yearEnd));
    setDisplayDateLabel(placementSuggestion.displayDateLabel);
  }, [placementSuggestion]);

  const isDirty =
    reviewStatus !== review.reviewStatus ||
    suggestedAction !== review.suggestedAction ||
    matchedRecordId !== (review.matchedRecord?.recordId ?? "") ||
    placement !== placementSuggestion.placement ||
    yearStartInput !== formatNullableIntegerInput(placementSuggestion.yearStart) ||
    yearEndInput !== formatNullableIntegerInput(placementSuggestion.yearEnd) ||
    displayDateLabel !== placementSuggestion.displayDateLabel;
  const applyGuardReason = getProposalApplyGuardReason({
    reviewStatus,
    suggestedAction,
    isDirty,
    matchedRecord: review.matchedRecord,
    requiredEntityType: "timeline_events",
    entityLabel: "timeline event",
  });

  async function handleSaveReview() {
    if (saving) {
      return;
    }

    setSaving(true);
    setError(null);
    setSavedMessage(null);

    const yearStart = parseNullableIntegerInput(yearStartInput);
    const yearEnd = parseNullableIntegerInput(yearEndInput);

    if (
      typeof yearStart === "number" &&
      typeof yearEnd === "number" &&
      yearEnd < yearStart
    ) {
      setError("End year cannot be earlier than start year.");
      setSaving(false);
      return;
    }

    try {
      const response = await fetch(`/api/ai-sessions/${aiSessionId}/timeline-proposal-review`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          proposalIndex,
          reviewStatus,
          suggestedAction,
          matchedRecordId: matchedRecordId || null,
          placement,
          yearStart,
          yearEnd,
          displayDateLabel: displayDateLabel.trim(),
        }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { timelineProposal?: BrainDumpExtractionResult["timelineEvents"][number]; error?: string }
        | null;

      if (!response.ok || !payload?.timelineProposal) {
        throw new Error(payload?.error || "Unable to save timeline proposal review.");
      }

      onUpdatedProposal(payload.timelineProposal);
      setSavedMessage("Review choices saved.");
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError.message : "Unable to save timeline proposal review."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-amber-800">
            Timeline review
          </p>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-amber-900/80">
            Save explicit review choices for this proposal without creating or updating canon rows
            yet.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleSaveReview}
            disabled={saving || applying || !isDirty}
            className="inline-flex h-10 items-center justify-center rounded-full bg-zinc-950 px-4 text-sm font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-50 hover:bg-zinc-800"
          >
            {saving ? "Saving..." : isDirty ? "Save review" : "Saved"}
          </button>
          <button
            type="button"
            onClick={handleApplyProposal}
            disabled={saving || applying || Boolean(applyGuardReason)}
            className="inline-flex h-10 items-center justify-center rounded-full border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-700 transition disabled:cursor-not-allowed disabled:opacity-50 hover:bg-zinc-50"
          >
            {applying ? "Applying..." : "Apply to timeline"}
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <label className="block">
          <span className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
            Review status
          </span>
          <select
            value={reviewStatus}
            onChange={(event) => {
              setReviewStatus(event.target.value as BrainDumpProposalReviewStatus);
              setSavedMessage(null);
            }}
            className="mt-2 w-full rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700"
          >
            {BRAIN_DUMP_REVIEW_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
            Review action
          </span>
          <select
            value={suggestedAction}
            onChange={(event) => {
              setSuggestedAction(event.target.value as BrainDumpProposalSuggestedAction);
              setSavedMessage(null);
            }}
            className="mt-2 w-full rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700"
          >
            {BRAIN_DUMP_ACTION_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block lg:col-span-2">
          <span className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
            Target record
          </span>
          <select
            value={matchedRecordId}
            onChange={(event) => {
              setMatchedRecordId(event.target.value);
              setSavedMessage(null);
            }}
            className="mt-2 w-full rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700"
          >
            <option value="">No matched target</option>
            {matchOptions.map((option) => (
              <option key={option.recordId} value={option.recordId}>
                {formatMatchOption(option)}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
            Placement
          </span>
          <select
            value={placement}
            onChange={(event) => {
              setPlacement(event.target.value as BrainDumpTimelinePlacement);
              setSavedMessage(null);
            }}
            className="mt-2 w-full rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700"
          >
            {BRAIN_DUMP_PLACEMENT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
            Display date label
          </span>
          <input
            type="text"
            value={displayDateLabel}
            onChange={(event) => {
              setDisplayDateLabel(event.target.value);
              setSavedMessage(null);
            }}
            placeholder="Optional review date label"
            className="mt-2 w-full rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 placeholder:text-zinc-400"
          />
        </label>

        <label className="block">
          <span className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
            Start year
          </span>
          <input
            type="number"
            value={yearStartInput}
            onChange={(event) => {
              setYearStartInput(event.target.value);
              setSavedMessage(null);
            }}
            placeholder="Optional"
            className="mt-2 w-full rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 placeholder:text-zinc-400"
          />
        </label>

        <label className="block">
          <span className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
            End year
          </span>
          <input
            type="number"
            value={yearEndInput}
            onChange={(event) => {
              setYearEndInput(event.target.value);
              setSavedMessage(null);
            }}
            placeholder="Optional"
            className="mt-2 w-full rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 placeholder:text-zinc-400"
          />
        </label>
      </div>

      {error ? (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {savedMessage ? (
        <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {savedMessage}
        </div>
      ) : null}

      {applyGuardReason && suggestedAction !== "ignore" ? (
        <div className="mt-4 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-600">
          {applyGuardReason}
        </div>
      ) : null}

      {suggestedAction === "ignore" ? (
        <div className="mt-4 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-600">
          `Ignore` is a saved review decision only. It does not create or update a timeline event.
        </div>
      ) : null}
    </div>
  );

  async function handleApplyProposal() {
    if (saving || applying || suggestedAction === "ignore") {
      return;
    }

    if (applyGuardReason) {
      setError(applyGuardReason);
      setSavedMessage(null);
      return;
    }

    setApplying(true);
    setError(null);
    setSavedMessage(null);

    try {
      const response = await fetch(`/api/ai-sessions/${aiSessionId}/timeline-proposal-apply`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          proposalIndex,
        }),
      });
      const payload = (await response.json().catch(() => null)) as
        | {
            timelineProposal?: BrainDumpExtractionResult["timelineEvents"][number];
            appliedTimelineEvent?: { id: string; title: string; action: string };
            error?: string;
          }
        | null;

      if (!response.ok || !payload?.timelineProposal || !payload.appliedTimelineEvent) {
        throw new Error(payload?.error || "Unable to apply this timeline proposal.");
      }

      onUpdatedProposal(payload.timelineProposal);
      setSavedMessage(
        `Applied ${formatEnumLabel(payload.appliedTimelineEvent.action)} to ${payload.appliedTimelineEvent.title}.`
      );
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError.message : "Unable to apply this timeline proposal."
      );
    } finally {
      setApplying(false);
    }
  }
}

function TimelineProposalContextPanel({
  aiSessionId,
  proposalIndex,
}: {
  aiSessionId: string;
  proposalIndex: number;
}) {
  const [context, setContext] = useState<BrainDumpTimelineProposalContext | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);

  async function handleLoadContext() {
    if (loading) {
      return;
    }

    if (context) {
      setVisible((current) => !current);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/ai-sessions/${aiSessionId}/timeline-proposal-context?proposalIndex=${proposalIndex}`
      );
      const payload = (await response.json().catch(() => null)) as
        | { context?: unknown; error?: string }
        | null;

      if (!response.ok || !payload?.context) {
        throw new Error(payload?.error || "Unable to load targeted context.");
      }

      const normalizedContext = normalizeBrainDumpTimelineProposalContext(
        payload.context as never
      );

      if (!normalizedContext) {
        throw new Error("Targeted context returned an invalid response.");
      }

      setContext(normalizedContext);
      setVisible(true);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to load targeted context.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
            Targeted context
          </p>
          <p className="mt-2 text-sm leading-6 text-zinc-600">
            Load matched event details, nearby chronology records, and linked slice summaries only
            for this proposal.
          </p>
        </div>

        <button
          type="button"
          onClick={handleLoadContext}
          className="inline-flex h-10 items-center justify-center rounded-full border border-zinc-200 px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
        >
          {loading
            ? "Loading..."
            : context
              ? visible
                ? "Hide context"
                : "Show context"
              : "Load targeted context"}
        </button>
      </div>

      {error ? (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {visible && context ? (
        <div className="mt-4 space-y-4">
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
              Placement recommendation
            </p>
            <p className="mt-3 text-sm font-medium text-zinc-900">
              {formatEnumLabel(context.placementRecommendation.placement)}
            </p>
            {context.placementRecommendation.referenceEventTitles.length > 0 ? (
              <p className="mt-2 text-sm text-zinc-600">
                {context.placementRecommendation.referenceEventTitles.join(" | ")}
              </p>
            ) : null}
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-700">
              {context.placementRecommendation.reasoning || "No placement reasoning yet."}
            </p>
          </div>
          <ContextRecordBlock
            label="Matched timeline event"
            value={context.matchedTimelineEvent}
            fallback="No strong matched event loaded."
          />
          <ContextRecordBlock
            label="Top timeline candidate"
            value={context.candidateTimelineEvent}
            fallback="No top timeline candidate loaded."
          />
          <ContextListBlock
            label="Earlier chronology context"
            values={context.neighboringTimelineEvents.before}
            fallback="No earlier neighboring events loaded."
          />
          <ContextListBlock
            label="Later chronology context"
            values={context.neighboringTimelineEvents.after}
            fallback="No later neighboring events loaded."
          />
          <ContextListBlock
            label="Linked characters"
            values={context.linkedCharacters}
            fallback="No linked character summaries found."
          />
          <ContextListBlock
            label="Linked chapters"
            values={context.linkedChapters}
            fallback="No linked chapter summaries found."
          />
          <ContextListBlock
            label="Linked scenes"
            values={context.linkedScenes}
            fallback="No linked scene summaries found."
          />
          <ListPanel
            label="Continuity warnings"
            values={context.continuityWarnings}
            fallback="No targeted continuity warnings."
          />
          <ListPanel
            label="Context notes"
            values={context.notes}
            fallback="No context notes."
          />
        </div>
      ) : null}
    </div>
  );
}

function CharacterProposalContextPanel({
  aiSessionId,
  proposalIndex,
}: {
  aiSessionId: string;
  proposalIndex: number;
}) {
  const [context, setContext] = useState<BrainDumpCharacterProposalContext | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);

  async function handleLoadContext() {
    if (loading) {
      return;
    }

    if (context) {
      setVisible((current) => !current);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/ai-sessions/${aiSessionId}/character-proposal-context?proposalIndex=${proposalIndex}`
      );
      const payload = (await response.json().catch(() => null)) as
        | { context?: unknown; error?: string }
        | null;

      if (!response.ok || !payload?.context) {
        throw new Error(payload?.error || "Unable to load targeted character context.");
      }

      const normalizedContext = normalizeBrainDumpCharacterProposalContext(
        payload.context as never
      );

      if (!normalizedContext) {
        throw new Error("Targeted character context returned an invalid response.");
      }

      setContext(normalizedContext);
      setVisible(true);
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError.message : "Unable to load targeted character context."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
            Targeted character context
          </p>
          <p className="mt-2 text-sm leading-6 text-zinc-600">
            Load matched character-sheet context, linked timeline events, and related scene
            summaries only for this proposal.
          </p>
        </div>

        <button
          type="button"
          onClick={handleLoadContext}
          className="inline-flex h-10 items-center justify-center rounded-full border border-zinc-200 px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
        >
          {loading
            ? "Loading..."
            : context
              ? visible
                ? "Hide context"
                : "Show context"
              : "Load targeted context"}
        </button>
      </div>

      {error ? (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {visible && context ? (
        <div className="mt-4 space-y-4">
          <ContextRecordBlock
            label="Matched character"
            value={context.matchedCharacter}
            fallback="No strong matched character loaded."
          />
          <ContextRecordBlock
            label="Top character candidate"
            value={context.candidateCharacter}
            fallback="No top character candidate loaded."
          />
          <ContextListBlock
            label="Linked timeline events"
            values={context.linkedTimelineEvents}
            fallback="No linked timeline event summaries found."
          />
          <ContextListBlock
            label="Related scenes"
            values={context.relatedScenes}
            fallback="No related scene summaries found."
          />
          <ListPanel
            label="Continuity warnings"
            values={context.continuityWarnings}
            fallback="No targeted continuity warnings."
          />
          <ListPanel
            label="Context notes"
            values={context.notes}
            fallback="No context notes."
          />
        </div>
      ) : null}
    </div>
  );
}

function ChapterProposalContextPanel({
  aiSessionId,
  proposalIndex,
}: {
  aiSessionId: string;
  proposalIndex: number;
}) {
  const [context, setContext] = useState<BrainDumpChapterProposalContext | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);

  async function handleLoadContext() {
    if (loading) {
      return;
    }

    if (context) {
      setVisible((current) => !current);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/ai-sessions/${aiSessionId}/chapter-proposal-context?proposalIndex=${proposalIndex}`
      );
      const payload = (await response.json().catch(() => null)) as
        | { context?: unknown; error?: string }
        | null;

      if (!response.ok || !payload?.context) {
        throw new Error(payload?.error || "Unable to load targeted chapter context.");
      }

      const normalizedContext = normalizeBrainDumpChapterProposalContext(
        payload.context as never
      );

      if (!normalizedContext) {
        throw new Error("Targeted chapter context returned an invalid response.");
      }

      setContext(normalizedContext);
      setVisible(true);
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError.message : "Unable to load targeted chapter context."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
            Targeted chapter context
          </p>
          <p className="mt-2 text-sm leading-6 text-zinc-600">
            Load matched chapter context, point-of-view character context, and related scene
            summaries only for this proposal.
          </p>
        </div>

        <button
          type="button"
          onClick={handleLoadContext}
          className="inline-flex h-10 items-center justify-center rounded-full border border-zinc-200 px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
        >
          {loading
            ? "Loading..."
            : context
              ? visible
                ? "Hide context"
                : "Show context"
              : "Load targeted context"}
        </button>
      </div>

      {error ? (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {visible && context ? (
        <div className="mt-4 space-y-4">
          <ContextRecordBlock
            label="Matched chapter"
            value={context.matchedChapter}
            fallback="No strong matched chapter loaded."
          />
          <ContextRecordBlock
            label="Top chapter candidate"
            value={context.candidateChapter}
            fallback="No top chapter candidate loaded."
          />
          <ContextRecordBlock
            label="Point-of-view character"
            value={context.pointOfViewCharacter}
            fallback="No point-of-view character context found."
          />
          <ContextListBlock
            label="Linked scenes"
            values={context.linkedScenes}
            fallback="No linked scene summaries found."
          />
          <ListPanel
            label="Continuity warnings"
            values={context.continuityWarnings}
            fallback="No targeted continuity warnings."
          />
          <ListPanel
            label="Context notes"
            values={context.notes}
            fallback="No context notes."
          />
        </div>
      ) : null}
    </div>
  );
}

function SceneProposalContextPanel({
  aiSessionId,
  proposalIndex,
}: {
  aiSessionId: string;
  proposalIndex: number;
}) {
  const [context, setContext] = useState<BrainDumpSceneProposalContext | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);

  async function handleLoadContext() {
    if (loading) {
      return;
    }

    if (context) {
      setVisible((current) => !current);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/ai-sessions/${aiSessionId}/scene-proposal-context?proposalIndex=${proposalIndex}`
      );
      const payload = (await response.json().catch(() => null)) as
        | { context?: unknown; error?: string }
        | null;

      if (!response.ok || !payload?.context) {
        throw new Error(payload?.error || "Unable to load targeted scene context.");
      }

      const normalizedContext = normalizeBrainDumpSceneProposalContext(payload.context as never);

      if (!normalizedContext) {
        throw new Error("Targeted scene context returned an invalid response.");
      }

      setContext(normalizedContext);
      setVisible(true);
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError.message : "Unable to load targeted scene context."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
            Targeted scene context
          </p>
          <p className="mt-2 text-sm leading-6 text-zinc-600">
            Load matched scene context, parent chapter context, point-of-view context, and linked
            timeline summaries only for this proposal.
          </p>
        </div>

        <button
          type="button"
          onClick={handleLoadContext}
          className="inline-flex h-10 items-center justify-center rounded-full border border-zinc-200 px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
        >
          {loading
            ? "Loading..."
            : context
              ? visible
                ? "Hide context"
                : "Show context"
              : "Load targeted context"}
        </button>
      </div>

      {error ? (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {visible && context ? (
        <div className="mt-4 space-y-4">
          <ContextRecordBlock
            label="Matched scene"
            value={context.matchedScene}
            fallback="No strong matched scene loaded."
          />
          <ContextRecordBlock
            label="Top scene candidate"
            value={context.candidateScene}
            fallback="No top scene candidate loaded."
          />
          <ContextRecordBlock
            label="Parent chapter"
            value={context.parentChapter}
            fallback="No parent chapter context found."
          />
          <ContextRecordBlock
            label="Point-of-view character"
            value={context.pointOfViewCharacter}
            fallback="No point-of-view character context found."
          />
          <ContextListBlock
            label="Linked timeline events"
            values={context.linkedTimelineEvents}
            fallback="No linked timeline-event summaries found."
          />
          <ListPanel
            label="Continuity warnings"
            values={context.continuityWarnings}
            fallback="No targeted continuity warnings."
          />
          <ListPanel
            label="Context notes"
            values={context.notes}
            fallback="No context notes."
          />
        </div>
      ) : null}
    </div>
  );
}

function ContextRecordBlock({
  label,
  value,
  fallback,
}: {
  label: string;
  value: BrainDumpContextRecordSummary | null;
  fallback: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">{label}</p>
      {value ? (
        <div className="mt-3 space-y-2">
          <p className="text-sm font-medium text-zinc-900">{value.label}</p>
          <p className="text-sm text-zinc-600">
            {[value.meta, value.matchedBy].filter(Boolean).join(" | ")}
          </p>
          <p className="whitespace-pre-wrap text-sm leading-6 text-zinc-700">
            {value.summary || "No summary."}
          </p>
        </div>
      ) : (
        <p className="mt-3 text-sm text-zinc-500">{fallback}</p>
      )}
    </div>
  );
}

function ContextListBlock({
  label,
  values,
  fallback,
}: {
  label: string;
  values: BrainDumpContextRecordSummary[];
  fallback: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">{label}</p>
      {values.length > 0 ? (
        <div className="mt-3 grid gap-3">
          {values.map((value) => (
            <div key={`${label}-${value.id}`} className="rounded-2xl bg-white p-3 ring-1 ring-zinc-200">
              <p className="text-sm font-medium text-zinc-900">{value.label}</p>
              <p className="mt-1 text-sm text-zinc-600">
                {[value.meta, value.matchedBy].filter(Boolean).join(" | ")}
              </p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-700">
                {value.summary || "No summary."}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm text-zinc-500">{fallback}</p>
      )}
    </div>
  );
}

function TextPanel({
  label,
  value,
  fallback,
}: {
  label: string;
  value: string;
  fallback: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">{label}</p>
      <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-zinc-700">
        {value || fallback}
      </p>
    </div>
  );
}

function ListPanel({
  label,
  values,
  fallback,
}: {
  label: string;
  values: string[];
  fallback: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">{label}</p>
      {values.length > 0 ? (
        <ul className="mt-3 space-y-2 text-sm leading-6 text-zinc-700">
          {values.map((value, index) => (
            <li key={`${label}-${index}`}>{value}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-zinc-500">{fallback}</p>
      )}
    </div>
  );
}

const BRAIN_DUMP_REVIEW_STATUS_OPTIONS: Array<{
  value: BrainDumpProposalReviewStatus;
  label: string;
}> = [
  { value: "pending", label: "Pending" },
  { value: "reviewed", label: "Reviewed" },
  { value: "applied", label: "Applied" },
];

const BRAIN_DUMP_ACTION_OPTIONS: Array<{
  value: BrainDumpProposalSuggestedAction;
  label: string;
}> = [
  { value: "create", label: "Create" },
  { value: "update", label: "Update" },
  { value: "merge", label: "Merge" },
  { value: "ignore", label: "Ignore" },
];

const BRAIN_DUMP_PLACEMENT_OPTIONS: Array<{
  value: BrainDumpTimelinePlacement;
  label: string;
}> = [
  { value: "unspecified", label: "Unspecified" },
  { value: "beginning", label: "Beginning" },
  { value: "end", label: "End" },
  { value: "before", label: "Before" },
  { value: "after", label: "After" },
  { value: "between", label: "Between" },
];

function getProposalApplyGuardReason({
  reviewStatus,
  suggestedAction,
  isDirty,
  matchedRecord,
  requiredEntityType,
  entityLabel,
}: {
  reviewStatus: BrainDumpProposalReviewStatus;
  suggestedAction: BrainDumpProposalSuggestedAction;
  isDirty: boolean;
  matchedRecord: BrainDumpProposalMatchCandidate | null;
  requiredEntityType: BrainDumpProposalMatchCandidate["entityType"];
  entityLabel: string;
}) {
  if (suggestedAction === "ignore") {
    return null;
  }

  if (isDirty) {
    return "Save review changes before applying this proposal.";
  }

  if (reviewStatus === "applied") {
    return `This ${entityLabel} proposal has already been applied. Save a new review state before applying it again.`;
  }

  if (reviewStatus !== "reviewed") {
    return `Mark this ${entityLabel} proposal as Reviewed and save that change before applying it.`;
  }

  if (
    (suggestedAction === "update" || suggestedAction === "merge") &&
    matchedRecord?.entityType !== requiredEntityType
  ) {
    return `Update and merge require a matched ${entityLabel} target. Select one from the available matches and save review changes before applying.`;
  }

  return null;
}

function getProposalMatchOptions(review: BrainDumpProposalReview) {
  const options = review.matchedRecord ? [review.matchedRecord, ...review.matchCandidates] : review.matchCandidates;
  const seenIds = new Set<string>();

  return options.filter((option) => {
    if (!option.recordId || seenIds.has(option.recordId)) {
      return false;
    }

    seenIds.add(option.recordId);
    return true;
  });
}

function replaceTimelineProposal(
  extractionResult: BrainDumpExtractionResult | null,
  proposalIndex: number,
  updatedProposal: BrainDumpExtractionResult["timelineEvents"][number]
) {
  if (!extractionResult) {
    return extractionResult;
  }

  return {
    ...extractionResult,
    timelineEvents: extractionResult.timelineEvents.map((proposal, index) =>
      index === proposalIndex ? updatedProposal : proposal
    ),
  };
}

function replaceCharacterProposal(
  extractionResult: BrainDumpExtractionResult | null,
  proposalIndex: number,
  updatedProposal: BrainDumpExtractionResult["characters"][number]
) {
  if (!extractionResult) {
    return extractionResult;
  }

  return {
    ...extractionResult,
    characters: extractionResult.characters.map((proposal, index) =>
      index === proposalIndex ? updatedProposal : proposal
    ),
  };
}

function replaceChapterProposal(
  extractionResult: BrainDumpExtractionResult | null,
  proposalIndex: number,
  updatedProposal: BrainDumpExtractionResult["chapterOutlines"][number]
) {
  if (!extractionResult) {
    return extractionResult;
  }

  return {
    ...extractionResult,
    chapterOutlines: extractionResult.chapterOutlines.map((proposal, index) =>
      index === proposalIndex ? updatedProposal : proposal
    ),
  };
}

function replaceSceneProposal(
  extractionResult: BrainDumpExtractionResult | null,
  proposalIndex: number,
  updatedProposal: BrainDumpExtractionResult["scenes"][number]
) {
  if (!extractionResult) {
    return extractionResult;
  }

  return {
    ...extractionResult,
    scenes: extractionResult.scenes.map((proposal, index) =>
      index === proposalIndex ? updatedProposal : proposal
    ),
  };
}

function parseNullableIntegerInput(value: string) {
  const normalized = value.trim();

  if (!normalized) {
    return null;
  }

  const parsed = Number.parseInt(normalized, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatNullableIntegerInput(value: number | null) {
  return typeof value === "number" ? String(value) : "";
}

function compactList(values: string[]) {
  return values.filter(Boolean).join(", ");
}

function buildProposalBadges(
  review: BrainDumpProposalReview,
  placementSuggestion?: BrainDumpTimelinePlacementSuggestion
) {
  const badges = [
    `Review ${formatEnumLabel(review.reviewStatus)}`,
    `Action ${formatEnumLabel(review.suggestedAction)}`,
    review.matchedRecord
      ? `Matched ${review.matchedRecord.recordLabel || review.matchedRecord.recordId}`
      : review.duplicateCandidates.length > 0
        ? `${review.duplicateCandidates.length} duplicate proposals`
      : review.matchCandidates.length > 0
        ? `${review.matchCandidates.length} candidate matches`
        : "No current match",
  ];

  if (placementSuggestion) {
    badges.push(`Placement ${formatEnumLabel(placementSuggestion.placement)}`);
  }

  return badges;
}

function formatMatchedRecord(value: BrainDumpProposalMatchCandidate | null) {
  if (!value) {
    return "None";
  }

  const score = typeof value.score === "number" ? ` (${Math.round(value.score * 100)}%)` : "";
  const scope = compactList([value.entityType, value.recordId]);
  return compactList([value.recordLabel, scope]).replace(", ", " | ") + score;
}

function formatMatchOption(value: BrainDumpProposalMatchCandidate) {
  const score = typeof value.score === "number" ? ` ${Math.round(value.score * 100)}%` : "";
  const reason = value.matchReason ? ` | ${value.matchReason}` : "";
  return `${value.recordLabel || value.recordId} (${value.recordId})${score}${reason}`;
}

function formatMatchCandidates(values: BrainDumpProposalMatchCandidate[]) {
  if (values.length === 0) {
    return "None";
  }

  return values
    .slice(0, 3)
    .map((value) => {
      const score = typeof value.score === "number" ? ` ${Math.round(value.score * 100)}%` : "";
      const reason = value.matchReason ? `, ${value.matchReason}` : "";
      return `${value.recordLabel || value.recordId} (${value.entityType})${score}${reason}`;
    })
    .join("; ");
}

function formatDuplicateCandidates(values: BrainDumpProposalDuplicateCandidate[]) {
  if (values.length === 0) {
    return "None";
  }

  return values
    .slice(0, 3)
    .map((value) => {
      const score = typeof value.score === "number" ? ` ${Math.round(value.score * 100)}%` : "";
      const reason = value.duplicateReason ? `, ${value.duplicateReason}` : "";
      return `#${value.proposalIndex + 1} ${value.proposalLabel}${score}${reason}`;
    })
    .join("; ");
}

function formatPlacementSuggestion(value: BrainDumpTimelinePlacementSuggestion) {
  const placement = formatEnumLabel(value.placement);
  const anchors = compactList(value.referenceEventTitles);
  const dateFields = compactList([
    value.displayDateLabel,
    formatTimelineYearRange(value.yearStart, value.yearEnd),
  ]);
  const reasoning = value.reasoning.trim();

  if (!anchors && !reasoning && !dateFields) {
    return placement;
  }

  return [placement, anchors, dateFields, reasoning].filter(Boolean).join(" | ");
}

function formatEnumLabel(value: string) {
  return value.replace(/_/g, " ");
}

function formatTimelineYearRange(yearStart: number | null, yearEnd: number | null) {
  if (typeof yearStart === "number" && typeof yearEnd === "number") {
    return yearStart === yearEnd ? `${yearStart}` : `${yearStart} to ${yearEnd}`;
  }

  if (typeof yearStart === "number") {
    return `Starts ${yearStart}`;
  }

  if (typeof yearEnd === "number") {
    return `Ends ${yearEnd}`;
  }

  return "";
}
