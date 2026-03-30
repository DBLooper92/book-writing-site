import type {
  BrainDumpChapterOutlineProposal,
  BrainDumpCharacterProposal,
  BrainDumpProposalDuplicateCandidate,
  BrainDumpExtractionResult,
  BrainDumpProposalMatchCandidate,
  BrainDumpSceneProposal,
  BrainDumpTimelineEventProposal,
} from "@/types/ai-brain-dump";

const STRONG_MATCH_SCORE = 0.95;
const CANDIDATE_MATCH_SCORE = 0.65;
const STRONG_DUPLICATE_SCORE = 0.95;
const MAX_MATCH_CANDIDATES = 3;
const MAX_DUPLICATE_CANDIDATES = 3;
const MIN_PARTIAL_MATCH_LENGTH = 12;
const MIN_PARTIAL_MATCH_RATIO = 0.72;
const MIN_SHARED_TOKEN_OVERLAP = 0.75;
const MATCH_STOPWORDS = new Set([
  "a",
  "an",
  "and",
  "after",
  "at",
  "before",
  "for",
  "from",
  "in",
  "into",
  "of",
  "on",
  "or",
  "the",
  "to",
  "with",
  "without",
]);

type BrainDumpMatchEntityType = "characters" | "timeline_events" | "chapters" | "scenes";

export type BrainDumpMatchRecord = {
  entityType: BrainDumpMatchEntityType;
  recordId: string;
  recordLabel: string;
  alternateLabels?: string[];
};

type ScoredMatchCandidate = BrainDumpProposalMatchCandidate & {
  score: number;
};

export type BrainDumpCheapMatchingInput = {
  extractionResult: BrainDumpExtractionResult;
  existingCharacters: BrainDumpMatchRecord[];
  existingTimelineEvents: BrainDumpMatchRecord[];
  existingChapters: BrainDumpMatchRecord[];
  existingScenes: BrainDumpMatchRecord[];
};

type DuplicateCandidateInput = {
  proposalIndex: number;
  proposalLabel: string;
};

export function applyCheapBrainDumpMatching({
  extractionResult,
  existingCharacters,
  existingTimelineEvents,
  existingChapters,
  existingScenes,
}: BrainDumpCheapMatchingInput): BrainDumpExtractionResult {
  const characterDuplicates = buildDuplicateCandidates(
    extractionResult.characters.map((proposal, index) => ({
      proposalIndex: index,
      proposalLabel: proposal.name,
    }))
  );
  const timelineDuplicates = buildDuplicateCandidates(
    extractionResult.timelineEvents.map((proposal, index) => ({
      proposalIndex: index,
      proposalLabel: proposal.title,
    }))
  );
  const chapterDuplicates = buildDuplicateCandidates(
    extractionResult.chapterOutlines.map((proposal, index) => ({
      proposalIndex: index,
      proposalLabel: proposal.title,
    }))
  );
  const sceneDuplicates = buildDuplicateCandidates(
    extractionResult.scenes.map((proposal, index) => ({
      proposalIndex: index,
      proposalLabel: proposal.title,
    }))
  );

  return {
    ...extractionResult,
    characters: extractionResult.characters.map((proposal, index) =>
      applyProposalMatchReview(
        proposal,
        buildMatchCandidates(proposal.name, existingCharacters),
        characterDuplicates[index] ?? []
      )
    ),
    timelineEvents: extractionResult.timelineEvents.map((proposal, index) =>
      applyTimelineProposalMatchReview(
        proposal,
        buildMatchCandidates(proposal.title, existingTimelineEvents),
        timelineDuplicates[index] ?? []
      )
    ),
    chapterOutlines: extractionResult.chapterOutlines.map((proposal, index) =>
      applyProposalMatchReview(
        proposal,
        buildMatchCandidates(proposal.title, existingChapters),
        chapterDuplicates[index] ?? []
      )
    ),
    scenes: extractionResult.scenes.map((proposal, index) =>
      applyProposalMatchReview(
        proposal,
        buildMatchCandidates(proposal.title, existingScenes),
        sceneDuplicates[index] ?? []
      )
    ),
  };
}

export function buildBrainDumpMatchCandidates(
  label: string,
  records: BrainDumpMatchRecord[]
) {
  return buildMatchCandidates(label, records);
}

function applyProposalMatchReview<
  Proposal extends
    | BrainDumpCharacterProposal
    | BrainDumpChapterOutlineProposal
    | BrainDumpSceneProposal,
>(
  proposal: Proposal,
  candidates: BrainDumpProposalMatchCandidate[],
  duplicateCandidates: BrainDumpProposalDuplicateCandidate[]
): Proposal {
  const matchedRecord = chooseMatchedRecord(candidates);
  const suggestedAction = resolveSuggestedAction(matchedRecord, duplicateCandidates);

  return {
    ...proposal,
    review: {
      ...proposal.review,
      suggestedAction,
      matchedRecord,
      matchCandidates: candidates,
      duplicateCandidates,
    },
  };
}

function applyTimelineProposalMatchReview(
  proposal: BrainDumpTimelineEventProposal,
  candidates: BrainDumpProposalMatchCandidate[],
  duplicateCandidates: BrainDumpProposalDuplicateCandidate[]
): BrainDumpTimelineEventProposal {
  const matchedRecord = chooseMatchedRecord(candidates);
  const suggestedAction = resolveSuggestedAction(matchedRecord, duplicateCandidates);

  return {
    ...proposal,
    review: {
      ...proposal.review,
      suggestedAction,
      matchedRecord,
      matchCandidates: candidates,
      duplicateCandidates,
    },
    placementSuggestion: matchedRecord
      ? {
          ...proposal.placementSuggestion,
          referenceEventIds: [matchedRecord.recordId],
          referenceEventTitles: [matchedRecord.recordLabel],
          reasoning:
            proposal.placementSuggestion.reasoning ||
            "Cheap matching found a likely existing timeline event to review as an update.",
        }
      : proposal.placementSuggestion,
  };
}

function resolveSuggestedAction(
  matchedRecord: BrainDumpProposalMatchCandidate | null,
  duplicateCandidates: BrainDumpProposalDuplicateCandidate[]
) {
  if (matchedRecord) {
    return "update" as const;
  }

  if (hasStrongDuplicate(duplicateCandidates)) {
    return "merge" as const;
  }

  return "create" as const;
}

function chooseMatchedRecord(candidates: BrainDumpProposalMatchCandidate[]) {
  const [topCandidate, secondCandidate] = candidates;

  if (!topCandidate || typeof topCandidate.score !== "number") {
    return null;
  }

  if (topCandidate.score < STRONG_MATCH_SCORE) {
    return null;
  }

  if (
    secondCandidate &&
    typeof secondCandidate.score === "number" &&
    secondCandidate.score >= STRONG_MATCH_SCORE
  ) {
    return null;
  }

  return topCandidate;
}

function buildMatchCandidates(label: string, records: BrainDumpMatchRecord[]) {
  const normalizedLabel = normalizeForMatch(label);

  if (!normalizedLabel) {
    return [];
  }

  return records
    .map((record) => scoreRecordMatch(label, normalizedLabel, record))
    .filter((candidate): candidate is ScoredMatchCandidate => candidate !== null)
    .sort(compareMatchCandidates)
    .slice(0, MAX_MATCH_CANDIDATES)
    .map((candidate) => ({
      entityType: candidate.entityType,
      recordId: candidate.recordId,
      recordLabel: candidate.recordLabel,
      matchReason: candidate.matchReason,
      score: candidate.score,
    }));
}

function buildDuplicateCandidates(inputs: DuplicateCandidateInput[][] | DuplicateCandidateInput[]) {
  const proposals = Array.isArray(inputs[0]) ? [] : (inputs as DuplicateCandidateInput[]);
  const duplicateMap = proposals.map(() => [] as BrainDumpProposalDuplicateCandidate[]);

  for (let leftIndex = 0; leftIndex < proposals.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < proposals.length; rightIndex += 1) {
      const duplicateScore = scoreDuplicateProposalPair(
        proposals[leftIndex].proposalLabel,
        proposals[rightIndex].proposalLabel
      );

      if (!duplicateScore) {
        continue;
      }

      duplicateMap[leftIndex].push({
        proposalIndex: proposals[rightIndex].proposalIndex,
        proposalLabel: proposals[rightIndex].proposalLabel,
        duplicateReason: duplicateScore.duplicateReason,
        score: duplicateScore.score,
      });

      duplicateMap[rightIndex].push({
        proposalIndex: proposals[leftIndex].proposalIndex,
        proposalLabel: proposals[leftIndex].proposalLabel,
        duplicateReason: duplicateScore.duplicateReason,
        score: duplicateScore.score,
      });
    }
  }

  return duplicateMap.map((candidates) =>
    candidates
      .sort(compareDuplicateCandidates)
      .slice(0, MAX_DUPLICATE_CANDIDATES)
  );
}

function scoreRecordMatch(
  label: string,
  normalizedLabel: string,
  record: BrainDumpMatchRecord
): ScoredMatchCandidate | null {
  const rawLabel = normalizeWhitespace(label);
  let bestMatch: ScoredMatchCandidate | null = null;

  for (const candidateLabel of buildCandidateLabels(record)) {
    const nextMatch = scoreCandidateLabel(rawLabel, normalizedLabel, record, candidateLabel);

    if (!nextMatch) {
      continue;
    }

    if (!bestMatch || nextMatch.score > bestMatch.score) {
      bestMatch = nextMatch;
    }
  }

  return bestMatch && bestMatch.score >= CANDIDATE_MATCH_SCORE ? bestMatch : null;
}

function scoreCandidateLabel(
  rawLabel: string,
  normalizedLabel: string,
  record: BrainDumpMatchRecord,
  candidateLabel: string
): ScoredMatchCandidate | null {
  const normalizedCandidateLabel = normalizeForMatch(candidateLabel);

  if (!normalizedCandidateLabel) {
    return null;
  }

  if (rawLabel.localeCompare(normalizeWhitespace(candidateLabel), undefined, { sensitivity: "accent" }) === 0) {
    return buildScoredCandidate(record, "Exact title match", 1);
  }

  if (normalizedLabel === normalizedCandidateLabel) {
    const reason =
      candidateLabel === record.recordLabel ? "Normalized title match" : "Alias match";
    return buildScoredCandidate(record, reason, candidateLabel === record.recordLabel ? 0.97 : 0.96);
  }

  if (isStrongPartialMatch(normalizedLabel, normalizedCandidateLabel)) {
    return buildScoredCandidate(record, "Strong partial title match", 0.75);
  }

  const tokenScore = scoreSharedTokenMatch(normalizedLabel, normalizedCandidateLabel);

  if (tokenScore >= CANDIDATE_MATCH_SCORE) {
    return buildScoredCandidate(record, "Shared title wording", tokenScore);
  }

  return null;
}

function buildScoredCandidate(
  record: BrainDumpMatchRecord,
  matchReason: string,
  score: number
): ScoredMatchCandidate {
  return {
    entityType: record.entityType,
    recordId: record.recordId,
    recordLabel: record.recordLabel,
    matchReason,
    score,
  };
}

function buildCandidateLabels(record: BrainDumpMatchRecord) {
  return Array.from(new Set([record.recordLabel, ...(record.alternateLabels ?? [])].map(normalizeWhitespace).filter(Boolean)));
}

function normalizeWhitespace(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function normalizeForMatch(value: string) {
  return normalizeWhitespace(value)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isStrongPartialMatch(left: string, right: string) {
  if (left.length < MIN_PARTIAL_MATCH_LENGTH || right.length < MIN_PARTIAL_MATCH_LENGTH) {
    return false;
  }

  const shorter = left.length <= right.length ? left : right;
  const longer = shorter === left ? right : left;

  if (!longer.includes(shorter)) {
    return false;
  }

  if (!hasMultipleSignificantTokens(shorter) || !hasMultipleSignificantTokens(longer)) {
    return false;
  }

  return shorter.length / longer.length >= MIN_PARTIAL_MATCH_RATIO;
}

function scoreSharedTokenMatch(left: string, right: string) {
  const leftTokens = buildMatchTokens(left);
  const rightTokens = buildMatchTokens(right);

  if (leftTokens.length === 0 || rightTokens.length === 0) {
    return 0;
  }

  const sharedTokens = leftTokens.filter((token) => rightTokens.includes(token));

  if (sharedTokens.length < 2) {
    return 0;
  }

  const overlap = sharedTokens.length / Math.max(leftTokens.length, rightTokens.length);
  return overlap >= MIN_SHARED_TOKEN_OVERLAP ? 0.7 : 0;
}

function scoreDuplicateProposalPair(leftLabel: string, rightLabel: string) {
  const rawLeft = normalizeWhitespace(leftLabel);
  const rawRight = normalizeWhitespace(rightLabel);
  const normalizedLeft = normalizeForMatch(leftLabel);
  const normalizedRight = normalizeForMatch(rightLabel);

  if (!normalizedLeft || !normalizedRight) {
    return null;
  }

  if (rawLeft.localeCompare(rawRight, undefined, { sensitivity: "accent" }) === 0) {
    return { duplicateReason: "Exact duplicate proposal title", score: 1 };
  }

  if (normalizedLeft === normalizedRight) {
    return { duplicateReason: "Normalized duplicate proposal title", score: 0.97 };
  }

  if (isStrongPartialMatch(normalizedLeft, normalizedRight)) {
    return { duplicateReason: "Strong partial duplicate title", score: 0.78 };
  }

  const tokenScore = scoreSharedTokenMatch(normalizedLeft, normalizedRight);

  if (tokenScore >= CANDIDATE_MATCH_SCORE) {
    return { duplicateReason: "Shared proposal wording", score: tokenScore };
  }

  return null;
}

function hasStrongDuplicate(duplicateCandidates: BrainDumpProposalDuplicateCandidate[]) {
  return duplicateCandidates.some(
    (candidate) => typeof candidate.score === "number" && candidate.score >= STRONG_DUPLICATE_SCORE
  );
}

function buildMatchTokens(value: string) {
  return Array.from(
    new Set(
      value
        .split(" ")
        .map((token) => token.trim())
        .filter((token) => token.length >= 3 && !MATCH_STOPWORDS.has(token))
    )
  );
}

function hasMultipleSignificantTokens(value: string) {
  return buildMatchTokens(value).length >= 2;
}

function compareMatchCandidates(
  left: ScoredMatchCandidate,
  right: ScoredMatchCandidate
) {
  if (right.score !== left.score) {
    return right.score - left.score;
  }

  return left.recordLabel.localeCompare(right.recordLabel);
}

function compareDuplicateCandidates(
  left: BrainDumpProposalDuplicateCandidate,
  right: BrainDumpProposalDuplicateCandidate
) {
  const leftScore = typeof left.score === "number" ? left.score : -1;
  const rightScore = typeof right.score === "number" ? right.score : -1;

  if (rightScore !== leftScore) {
    return rightScore - leftScore;
  }

  return left.proposalLabel.localeCompare(right.proposalLabel);
}
