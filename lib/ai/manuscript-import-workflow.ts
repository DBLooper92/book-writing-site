import type {
  ManuscriptImportAnyProposal,
  ManuscriptImportChapterProposal,
  ManuscriptImportCharacterProposal,
  ManuscriptImportLocationProposal,
  ManuscriptImportPlotThreadProposal,
  ManuscriptImportProposalByType,
  ManuscriptImportProposalType,
  ManuscriptImportSceneProposal,
  ManuscriptImportTimelineEventProposal,
  ManuscriptImportWorkflowState,
} from "@/types/ai-manuscript-import";
import type {
  BrainDumpProposalMatchCandidate,
  BrainDumpProposalReview,
  BrainDumpTimelinePlacementSuggestion,
} from "@/types/ai-brain-dump";

import type { ManuscriptChunkExtractionResult } from "@/lib/ai/manuscript-import";

export type ManuscriptImportProposalSlice = ManuscriptImportProposalType;

export function createDefaultManuscriptImportProposalReview(): BrainDumpProposalReview {
  return {
    reviewStatus: "pending",
    suggestedAction: "create",
    matchedRecord: null,
    matchCandidates: [],
    duplicateCandidates: [],
  };
}

export function createDefaultManuscriptImportPlacementSuggestion(): BrainDumpTimelinePlacementSuggestion {
  return {
    placement: "unspecified",
    referenceEventIds: [],
    referenceEventTitles: [],
    reasoning: "",
    yearStart: null,
    yearEnd: null,
    displayDateLabel: "",
  };
}

export function appendChunkExtractionToWorkflowState({
  workflowState,
  importBookId,
  attachmentId,
  chunkId,
  targetBookId,
  extractionResult,
}: {
  workflowState: ManuscriptImportWorkflowState;
  importBookId: string;
  attachmentId: string;
  chunkId: string;
  targetBookId: string | null;
  extractionResult: ManuscriptChunkExtractionResult;
}) {
  return {
    ...workflowState,
    summary: extractionResult.summary || workflowState.summary,
    continuityWarnings: uniqueStrings([
      ...workflowState.continuityWarnings,
      ...extractionResult.continuityWarnings,
    ]),
    unresolvedQuestions: uniqueStrings([
      ...workflowState.unresolvedQuestions,
      ...extractionResult.unresolvedQuestions,
    ]),
    suggestedNextActions: uniqueStrings([
      ...workflowState.suggestedNextActions,
      ...extractionResult.suggestedNextActions,
    ]),
    proposals: {
      characters: [
        ...workflowState.proposals.characters,
        ...extractionResult.characters.map((proposal, index) => ({
          proposalId: buildProposalId(importBookId, chunkId, "character", index),
          sourceBookIds: [importBookId],
          sourceAttachmentIds: [attachmentId],
          sourceChunkIds: [chunkId],
          evidence: proposal.evidence,
          confidence: proposal.confidence,
          review: createDefaultManuscriptImportProposalReview(),
          name: proposal.name,
          summary: proposal.summary,
          characterType: proposal.characterType,
          importanceLevel: proposal.importanceLevel,
          traits: proposal.traits,
          motivations: proposal.motivations,
          relatedSceneTitles: proposal.relatedSceneTitles,
        })),
      ],
      locations: [
        ...workflowState.proposals.locations,
        ...extractionResult.locations.map((proposal, index) => ({
          proposalId: buildProposalId(importBookId, chunkId, "location", index),
          sourceBookIds: [importBookId],
          sourceAttachmentIds: [attachmentId],
          sourceChunkIds: [chunkId],
          evidence: proposal.evidence,
          confidence: proposal.confidence,
          review: createDefaultManuscriptImportProposalReview(),
          name: proposal.name,
          summary: proposal.summary,
          locationType: proposal.locationType,
          notableFeatures: proposal.notableFeatures,
          linkedSceneTitles: proposal.linkedSceneTitles,
        })),
      ],
      plotThreads: [
        ...workflowState.proposals.plotThreads,
        ...extractionResult.plotThreads.map((proposal, index) => ({
          proposalId: buildProposalId(importBookId, chunkId, "plot_thread", index),
          sourceBookIds: [importBookId],
          sourceAttachmentIds: [attachmentId],
          sourceChunkIds: [chunkId],
          evidence: proposal.evidence,
          confidence: proposal.confidence,
          review: createDefaultManuscriptImportProposalReview(),
          title: proposal.title,
          summary: proposal.summary,
          threadType: proposal.threadType,
          setupNotes: proposal.setupNotes,
          payoffNotes: proposal.payoffNotes,
          linkedCharacterNames: proposal.linkedCharacterNames,
          linkedChapterTitles: proposal.linkedChapterTitles,
          linkedSceneTitles: proposal.linkedSceneTitles,
        })),
      ],
      timelineEvents: [
        ...workflowState.proposals.timelineEvents,
        ...extractionResult.timelineEvents.map((proposal, index) => ({
          proposalId: buildProposalId(importBookId, chunkId, "timeline", index),
          sourceBookIds: [importBookId],
          sourceAttachmentIds: [attachmentId],
          sourceChunkIds: [chunkId],
          evidence: proposal.evidence,
          confidence: proposal.confidence,
          review: createDefaultManuscriptImportProposalReview(),
          title: proposal.title,
          summary: proposal.summary,
          eventType: proposal.eventType,
          dateLabel: proposal.dateLabel,
          linkedCharacterNames: proposal.linkedCharacterNames,
          linkedLocationNames: proposal.linkedLocationNames,
          linkedChapterTitles: proposal.linkedChapterTitles,
          linkedSceneTitles: proposal.linkedSceneTitles,
          placementSuggestion: createDefaultManuscriptImportPlacementSuggestion(),
        })),
      ],
      chapters: [
        ...workflowState.proposals.chapters,
        ...extractionResult.chapters.map((proposal, index) => ({
          proposalId: buildProposalId(importBookId, chunkId, "chapter", index),
          sourceBookIds: [importBookId],
          sourceAttachmentIds: [attachmentId],
          sourceChunkIds: [chunkId],
          evidence: proposal.evidence,
          confidence: proposal.confidence,
          review: createDefaultManuscriptImportProposalReview(),
          title: proposal.title,
          summary: proposal.summary,
          purpose: proposal.purpose,
          pointOfViewCharacterName: proposal.pointOfViewCharacterName,
          estimatedChapterNumber: proposal.estimatedChapterNumber,
          sceneTitles: proposal.sceneTitles,
          targetBookId,
        })),
      ],
      scenes: [
        ...workflowState.proposals.scenes,
        ...extractionResult.scenes.map((proposal, index) => ({
          proposalId: buildProposalId(importBookId, chunkId, "scene", index),
          sourceBookIds: [importBookId],
          sourceAttachmentIds: [attachmentId],
          sourceChunkIds: [chunkId],
          evidence: proposal.evidence,
          confidence: proposal.confidence,
          review: createDefaultManuscriptImportProposalReview(),
          title: proposal.title,
          summary: proposal.summary,
          sceneType: proposal.sceneType,
          pointOfViewCharacterName: proposal.pointOfViewCharacterName,
          goal: proposal.goal,
          conflict: proposal.conflict,
          outcome: proposal.outcome,
          linkedTimelineEventTitles: proposal.linkedTimelineEventTitles,
          targetBookId,
        })),
      ],
    },
  } satisfies ManuscriptImportWorkflowState;
}

export function consolidateManuscriptImportWorkflowState(
  workflowState: ManuscriptImportWorkflowState
) {
  return {
    ...workflowState,
    proposals: {
      characters: mergeCharacterProposals(workflowState.proposals.characters),
      locations: mergeLocationProposals(workflowState.proposals.locations),
      plotThreads: mergePlotThreadProposals(workflowState.proposals.plotThreads),
      timelineEvents: mergeTimelineEventProposals(workflowState.proposals.timelineEvents),
      chapters: mergeChapterProposals(workflowState.proposals.chapters),
      scenes: mergeSceneProposals(workflowState.proposals.scenes),
    },
  } satisfies ManuscriptImportWorkflowState;
}

export function updateManuscriptImportProposalReview<
  Slice extends ManuscriptImportProposalSlice,
>(
  workflowState: ManuscriptImportWorkflowState,
  slice: Slice,
  proposalId: string,
  review: BrainDumpProposalReview
) {
  return {
    ...workflowState,
    proposals: {
      ...workflowState.proposals,
      [slice]: workflowState.proposals[slice].map((proposal) =>
        proposal.proposalId === proposalId ? { ...proposal, review } : proposal
      ),
    },
  } satisfies ManuscriptImportWorkflowState;
}

export function markManuscriptImportProposalApplied<
  Slice extends ManuscriptImportProposalSlice,
>(
  workflowState: ManuscriptImportWorkflowState,
  slice: Slice,
  proposalId: string,
  matchedRecord: BrainDumpProposalMatchCandidate | null
) {
  const proposal = findManuscriptImportProposal(workflowState, slice, proposalId);

  return updateManuscriptImportProposalReview(workflowState, slice, proposalId, {
    ...proposal?.review,
    reviewStatus: "applied",
    matchedRecord,
    suggestedAction: proposal?.review.suggestedAction ?? "create",
    matchCandidates: proposal?.review.matchCandidates ?? [],
    duplicateCandidates: proposal?.review.duplicateCandidates ?? [],
  });
}

export function findManuscriptImportProposal<
  Slice extends ManuscriptImportProposalSlice,
>(
  workflowState: ManuscriptImportWorkflowState,
  slice: Slice,
  proposalId: string
): ManuscriptImportProposalByType<Slice> | null {
  return workflowState.proposals[slice].find((proposal) => proposal.proposalId === proposalId) ?? null;
}

function buildProposalId(
  importBookId: string,
  chunkId: string,
  prefix: string,
  index: number
) {
  return `${importBookId}_${chunkId}_${prefix}_${index + 1}`;
}

function mergeCharacterProposals(proposals: ManuscriptImportCharacterProposal[]) {
  return mergeProposalsByKey(proposals, (proposal) => normalizeLabel(proposal.name), (current, next) => ({
    ...current,
    sourceBookIds: uniqueStrings([...current.sourceBookIds, ...next.sourceBookIds]),
    sourceAttachmentIds: uniqueStrings([
      ...current.sourceAttachmentIds,
      ...next.sourceAttachmentIds,
    ]),
    sourceChunkIds: uniqueStrings([...current.sourceChunkIds, ...next.sourceChunkIds]),
    evidence: joinEvidence(current.evidence, next.evidence),
    traits: uniqueStrings([...current.traits, ...next.traits]),
    motivations: uniqueStrings([...current.motivations, ...next.motivations]),
    relatedSceneTitles: uniqueStrings([
      ...current.relatedSceneTitles,
      ...next.relatedSceneTitles,
    ]),
  }));
}

function mergeLocationProposals(proposals: ManuscriptImportLocationProposal[]) {
  return mergeProposalsByKey(proposals, (proposal) => normalizeLabel(proposal.name), (current, next) => ({
    ...current,
    sourceBookIds: uniqueStrings([...current.sourceBookIds, ...next.sourceBookIds]),
    sourceAttachmentIds: uniqueStrings([
      ...current.sourceAttachmentIds,
      ...next.sourceAttachmentIds,
    ]),
    sourceChunkIds: uniqueStrings([...current.sourceChunkIds, ...next.sourceChunkIds]),
    evidence: joinEvidence(current.evidence, next.evidence),
    notableFeatures: uniqueStrings([
      ...current.notableFeatures,
      ...next.notableFeatures,
    ]),
    linkedSceneTitles: uniqueStrings([
      ...current.linkedSceneTitles,
      ...next.linkedSceneTitles,
    ]),
  }));
}

function mergePlotThreadProposals(proposals: ManuscriptImportPlotThreadProposal[]) {
  return mergeProposalsByKey(proposals, (proposal) => normalizeLabel(proposal.title), (current, next) => ({
    ...current,
    sourceBookIds: uniqueStrings([...current.sourceBookIds, ...next.sourceBookIds]),
    sourceAttachmentIds: uniqueStrings([
      ...current.sourceAttachmentIds,
      ...next.sourceAttachmentIds,
    ]),
    sourceChunkIds: uniqueStrings([...current.sourceChunkIds, ...next.sourceChunkIds]),
    evidence: joinEvidence(current.evidence, next.evidence),
    setupNotes: uniqueStrings([...current.setupNotes, ...next.setupNotes]),
    payoffNotes: uniqueStrings([...current.payoffNotes, ...next.payoffNotes]),
    linkedCharacterNames: uniqueStrings([
      ...current.linkedCharacterNames,
      ...next.linkedCharacterNames,
    ]),
    linkedChapterTitles: uniqueStrings([
      ...current.linkedChapterTitles,
      ...next.linkedChapterTitles,
    ]),
    linkedSceneTitles: uniqueStrings([
      ...current.linkedSceneTitles,
      ...next.linkedSceneTitles,
    ]),
  }));
}

function mergeTimelineEventProposals(proposals: ManuscriptImportTimelineEventProposal[]) {
  return mergeProposalsByKey(
    proposals,
    (proposal) =>
      `${proposal.sourceBookIds.slice().sort().join("|")}::${normalizeLabel(proposal.title)}`,
    (current, next) => ({
      ...current,
      sourceBookIds: uniqueStrings([...current.sourceBookIds, ...next.sourceBookIds]),
      sourceAttachmentIds: uniqueStrings([
        ...current.sourceAttachmentIds,
        ...next.sourceAttachmentIds,
      ]),
      sourceChunkIds: uniqueStrings([...current.sourceChunkIds, ...next.sourceChunkIds]),
      evidence: joinEvidence(current.evidence, next.evidence),
      linkedCharacterNames: uniqueStrings([
        ...current.linkedCharacterNames,
        ...next.linkedCharacterNames,
      ]),
      linkedLocationNames: uniqueStrings([
        ...current.linkedLocationNames,
        ...next.linkedLocationNames,
      ]),
      linkedChapterTitles: uniqueStrings([
        ...current.linkedChapterTitles,
        ...next.linkedChapterTitles,
      ]),
      linkedSceneTitles: uniqueStrings([
        ...current.linkedSceneTitles,
        ...next.linkedSceneTitles,
      ]),
    })
  );
}

function mergeChapterProposals(proposals: ManuscriptImportChapterProposal[]) {
  return mergeProposalsByKey(
    proposals,
    (proposal) => `${proposal.targetBookId ?? "unmapped"}::${normalizeLabel(proposal.title)}`,
    (current, next) => ({
      ...current,
      sourceBookIds: uniqueStrings([...current.sourceBookIds, ...next.sourceBookIds]),
      sourceAttachmentIds: uniqueStrings([
        ...current.sourceAttachmentIds,
        ...next.sourceAttachmentIds,
      ]),
      sourceChunkIds: uniqueStrings([...current.sourceChunkIds, ...next.sourceChunkIds]),
      evidence: joinEvidence(current.evidence, next.evidence),
      sceneTitles: uniqueStrings([...current.sceneTitles, ...next.sceneTitles]),
    })
  );
}

function mergeSceneProposals(proposals: ManuscriptImportSceneProposal[]) {
  return mergeProposalsByKey(
    proposals,
    (proposal) => `${proposal.targetBookId ?? "unmapped"}::${normalizeLabel(proposal.title)}`,
    (current, next) => ({
      ...current,
      sourceBookIds: uniqueStrings([...current.sourceBookIds, ...next.sourceBookIds]),
      sourceAttachmentIds: uniqueStrings([
        ...current.sourceAttachmentIds,
        ...next.sourceAttachmentIds,
      ]),
      sourceChunkIds: uniqueStrings([...current.sourceChunkIds, ...next.sourceChunkIds]),
      evidence: joinEvidence(current.evidence, next.evidence),
      linkedTimelineEventTitles: uniqueStrings([
        ...current.linkedTimelineEventTitles,
        ...next.linkedTimelineEventTitles,
      ]),
    })
  );
}

function mergeProposalsByKey<Proposal extends ManuscriptImportAnyProposal>(
  proposals: Proposal[],
  getKey: (proposal: Proposal) => string,
  merge: (current: Proposal, next: Proposal) => Proposal
) {
  const map = new Map<string, Proposal>();

  for (const proposal of proposals) {
    const key = getKey(proposal);

    if (!key) {
      map.set(proposal.proposalId, proposal);
      continue;
    }

    const existing = map.get(key);
    map.set(key, existing ? merge(existing, proposal) : proposal);
  }

  return [...map.values()];
}

function normalizeLabel(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, " ");
}

function joinEvidence(left: string, right: string) {
  return uniqueStrings([left, right])
    .filter(Boolean)
    .join("\n\n");
}

function uniqueStrings(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}
