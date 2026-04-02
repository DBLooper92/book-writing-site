import { buildBrainDumpMatchCandidates, type BrainDumpMatchRecord } from "@/lib/ai/brain-dump-matching";
import type {
  ManuscriptImportTimelineEventProposal,
  ManuscriptImportWorkflowState,
} from "@/types/ai-manuscript-import";
import type {
  BrainDumpProposalMatchCandidate,
  BrainDumpProposalReview,
} from "@/types/ai-brain-dump";

type ScopedMatchRecord = BrainDumpMatchRecord & {
  bookId?: string | null;
};

export type ManuscriptImportExistingMatchRecords = {
  books: BrainDumpMatchRecord[];
  characters: BrainDumpMatchRecord[];
  locations: BrainDumpMatchRecord[];
  plotThreads: BrainDumpMatchRecord[];
  timelineEvents: BrainDumpMatchRecord[];
  chapters: ScopedMatchRecord[];
  scenes: ScopedMatchRecord[];
};

export function createMatchRecord(
  entityType: BrainDumpMatchRecord["entityType"],
  recordId: string,
  recordLabel: string,
  alternateLabels: string[] = [],
  extras: Pick<ScopedMatchRecord, "bookId"> = {}
): ScopedMatchRecord {
  return {
    entityType,
    recordId,
    recordLabel,
    alternateLabels,
    ...extras,
  };
}

export function applyManuscriptImportMatching(
  workflowState: ManuscriptImportWorkflowState,
  existing: ManuscriptImportExistingMatchRecords
) {
  return {
    ...workflowState,
    books: workflowState.books.map((book) => {
      const candidates = buildBrainDumpMatchCandidates(book.title, existing.books);
      const matchedRecord = chooseMatchedRecord(candidates);

      return {
        ...book,
        mapping: {
          ...book.mapping,
          suggestedAction: matchedRecord ? "update" : book.mapping.suggestedAction,
          matchedRecord,
          matchCandidates: candidates,
        },
      };
    }),
    proposals: {
      characters: workflowState.proposals.characters.map((proposal) =>
        applyProposalMatches(proposal, existing.characters, proposal.name)
      ),
      locations: workflowState.proposals.locations.map((proposal) =>
        applyProposalMatches(proposal, existing.locations, proposal.name)
      ),
      plotThreads: workflowState.proposals.plotThreads.map((proposal) =>
        applyProposalMatches(proposal, existing.plotThreads, proposal.title)
      ),
      timelineEvents: workflowState.proposals.timelineEvents.map((proposal) =>
        applyTimelineProposalMatches(proposal, existing.timelineEvents)
      ),
      chapters: workflowState.proposals.chapters.map((proposal) =>
        applyProposalMatches(
          proposal,
          proposal.targetBookId
            ? existing.chapters.filter((record) => record.bookId === proposal.targetBookId)
            : existing.chapters,
          proposal.title
        )
      ),
      scenes: workflowState.proposals.scenes.map((proposal) =>
        applyProposalMatches(
          proposal,
          proposal.targetBookId
            ? existing.scenes.filter((record) => record.bookId === proposal.targetBookId)
            : existing.scenes,
          proposal.title
        )
      ),
    },
  } satisfies ManuscriptImportWorkflowState;
}

function applyProposalMatches<Proposal extends { review: BrainDumpProposalReview }>(
  proposal: Proposal,
  records: BrainDumpMatchRecord[],
  label: string
): Proposal {
  const matchCandidates = buildBrainDumpMatchCandidates(label, records);
  const matchedRecord = chooseMatchedRecord(matchCandidates);

  if (proposal.review.reviewStatus !== "pending") {
    return {
      ...proposal,
      review: {
        ...proposal.review,
        matchCandidates,
      },
    };
  }

  return {
    ...proposal,
    review: {
      ...proposal.review,
      suggestedAction: matchedRecord ? "update" : "create",
      matchedRecord,
      matchCandidates,
    },
  };
}

function applyTimelineProposalMatches(
  proposal: ManuscriptImportTimelineEventProposal,
  records: BrainDumpMatchRecord[]
): ManuscriptImportTimelineEventProposal {
  const updated = applyProposalMatches(proposal, records, proposal.title);
  const matchedRecord = updated.review.matchedRecord;

  return {
    ...updated,
    placementSuggestion: matchedRecord
      ? {
          ...updated.placementSuggestion,
          referenceEventIds: [matchedRecord.recordId],
          referenceEventTitles: [matchedRecord.recordLabel],
          reasoning:
            updated.placementSuggestion.reasoning ||
            "A likely existing timeline event was matched for review.",
        }
      : updated.placementSuggestion,
  };
}

function chooseMatchedRecord(
  candidates: ReturnType<typeof buildBrainDumpMatchCandidates>
): BrainDumpProposalMatchCandidate | null {
  const [topCandidate, secondCandidate] = candidates;

  if (!topCandidate || typeof topCandidate.score !== "number" || topCandidate.score < 0.95) {
    return null;
  }

  if (
    secondCandidate &&
    typeof secondCandidate.score === "number" &&
    secondCandidate.score >= 0.95
  ) {
    return null;
  }

  return topCandidate;
}
