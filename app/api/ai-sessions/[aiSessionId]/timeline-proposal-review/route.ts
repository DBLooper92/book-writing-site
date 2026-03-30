import { NextResponse } from "next/server";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  BRAIN_DUMP_PROPOSAL_REVIEW_STATUS_VALUES,
  BRAIN_DUMP_PROPOSAL_SUGGESTED_ACTION_VALUES,
  BRAIN_DUMP_TIMELINE_PLACEMENT_VALUES,
  normalizeBrainDumpExtractionResult,
  selectBrainDumpMatchedRecord,
  type BrainDumpProposalReviewStatus,
  type BrainDumpProposalSuggestedAction,
  type BrainDumpTimelinePlacement,
} from "@/types/ai-brain-dump";
import type { Json } from "@/types/database";

type RouteContext = {
  params: Promise<{
    aiSessionId: string;
  }>;
};

type TimelineProposalReviewUpdateInput = {
  proposalIndex: number;
  reviewStatus: BrainDumpProposalReviewStatus;
  suggestedAction: BrainDumpProposalSuggestedAction;
  matchedRecordId: string | null;
  placement: BrainDumpTimelinePlacement;
  yearStart: number | null;
  yearEnd: number | null;
  displayDateLabel: string;
};

export async function PATCH(request: Request, context: RouteContext) {
  const { aiSessionId } = await context.params;
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Sign in before updating proposal review." }, { status: 401 });
  }

  let payload: TimelineProposalReviewUpdateInput;

  try {
    payload = normalizeTimelineProposalReviewUpdateInput(await request.json());
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Invalid timeline proposal review update.",
      },
      { status: 400 }
    );
  }

  if (
    typeof payload.yearStart === "number" &&
    typeof payload.yearEnd === "number" &&
    payload.yearEnd < payload.yearStart
  ) {
    return NextResponse.json(
      { error: "End year cannot be earlier than start year." },
      { status: 400 }
    );
  }

  const { data: aiSession, error: aiSessionError } = await supabase
    .from("ai_sessions")
    .select("id, project_id, extraction_result")
    .eq("user_id", user.id)
    .eq("id", aiSessionId)
    .maybeSingle();

  if (aiSessionError) {
    return NextResponse.json({ error: aiSessionError.message }, { status: 500 });
  }

  if (!aiSession) {
    return NextResponse.json({ error: "AI session not found." }, { status: 404 });
  }

  const extractionResult = normalizeBrainDumpExtractionResult(aiSession.extraction_result);

  if (!extractionResult) {
    return NextResponse.json(
      { error: "This AI session does not contain brain-dump extraction data." },
      { status: 400 }
    );
  }

  const proposal = extractionResult.timelineEvents[payload.proposalIndex];

  if (!proposal) {
    return NextResponse.json({ error: "Timeline proposal not found." }, { status: 404 });
  }

  const matchedRecord = selectBrainDumpMatchedRecord(proposal.review, payload.matchedRecordId);

  if (payload.matchedRecordId && !matchedRecord) {
    return NextResponse.json(
      { error: "Selected timeline event match is no longer available." },
      { status: 400 }
    );
  }

  const updatedProposal = {
    ...proposal,
    review: {
      ...proposal.review,
      reviewStatus: payload.reviewStatus,
      suggestedAction: payload.suggestedAction,
      matchedRecord,
    },
    placementSuggestion: {
      ...proposal.placementSuggestion,
      placement: payload.placement,
      yearStart: payload.yearStart,
      yearEnd: payload.yearEnd,
      displayDateLabel: payload.displayDateLabel,
    },
  };

  const updatedExtractionResult = {
    ...extractionResult,
    timelineEvents: extractionResult.timelineEvents.map((timelineProposal, index) =>
      index === payload.proposalIndex ? updatedProposal : timelineProposal
    ),
  };

  const { error: updateError } = await supabase
    .from("ai_sessions")
    .update({
      extraction_result: updatedExtractionResult as Json,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user.id)
    .eq("project_id", aiSession.project_id)
    .eq("id", aiSessionId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({
    timelineProposal: updatedProposal,
  });
}

function normalizeTimelineProposalReviewUpdateInput(value: unknown): TimelineProposalReviewUpdateInput {
  if (!isRecord(value)) {
    throw new Error("A JSON body is required.");
  }

  const proposalIndex = readProposalIndex(value.proposalIndex);

  if (proposalIndex === null) {
    throw new Error("A valid timeline proposal index is required.");
  }

  return {
    proposalIndex,
    reviewStatus: readEnumValue(
      value.reviewStatus,
      BRAIN_DUMP_PROPOSAL_REVIEW_STATUS_VALUES,
      "pending"
    ),
    suggestedAction: readEnumValue(
      value.suggestedAction,
      BRAIN_DUMP_PROPOSAL_SUGGESTED_ACTION_VALUES,
      "create"
    ),
    matchedRecordId: readNullableString(value.matchedRecordId),
    placement: readEnumValue(
      value.placement,
      BRAIN_DUMP_TIMELINE_PLACEMENT_VALUES,
      "unspecified"
    ),
    yearStart: readNullableInteger(value.yearStart),
    yearEnd: readNullableInteger(value.yearEnd),
    displayDateLabel: typeof value.displayDateLabel === "string" ? value.displayDateLabel.trim() : "",
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readProposalIndex(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  const normalized = Math.trunc(value);
  return normalized >= 0 ? normalized : null;
}

function readNullableInteger(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  return typeof value === "number" && Number.isFinite(value) ? Math.trunc(value) : null;
}

function readNullableString(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized || null;
}

function readEnumValue<const Values extends readonly string[]>(
  value: unknown,
  allowedValues: Values,
  fallbackValue: Values[number]
): Values[number] {
  return typeof value === "string" && allowedValues.includes(value) ? value : fallbackValue;
}
