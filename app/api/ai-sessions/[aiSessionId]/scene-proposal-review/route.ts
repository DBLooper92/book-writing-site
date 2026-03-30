import { NextResponse } from "next/server";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  BRAIN_DUMP_PROPOSAL_REVIEW_STATUS_VALUES,
  BRAIN_DUMP_PROPOSAL_SUGGESTED_ACTION_VALUES,
  normalizeBrainDumpExtractionResult,
  selectBrainDumpMatchedRecord,
  type BrainDumpProposalReviewStatus,
  type BrainDumpProposalSuggestedAction,
} from "@/types/ai-brain-dump";
import type { Json } from "@/types/database";

type RouteContext = {
  params: Promise<{
    aiSessionId: string;
  }>;
};

type SceneProposalReviewUpdateInput = {
  proposalIndex: number;
  reviewStatus: BrainDumpProposalReviewStatus;
  suggestedAction: BrainDumpProposalSuggestedAction;
  matchedRecordId: string | null;
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

  let payload: SceneProposalReviewUpdateInput;

  try {
    payload = normalizeSceneProposalReviewUpdateInput(await request.json());
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Invalid scene proposal review update.",
      },
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

  const proposal = extractionResult.scenes[payload.proposalIndex];

  if (!proposal) {
    return NextResponse.json({ error: "Scene proposal not found." }, { status: 404 });
  }

  const matchedRecord = selectBrainDumpMatchedRecord(proposal.review, payload.matchedRecordId);

  if (payload.matchedRecordId && !matchedRecord) {
    return NextResponse.json({ error: "Selected scene match is no longer available." }, { status: 400 });
  }

  const updatedProposal = {
    ...proposal,
    review: {
      ...proposal.review,
      reviewStatus: payload.reviewStatus,
      suggestedAction: payload.suggestedAction,
      matchedRecord,
    },
  };

  const updatedExtractionResult = {
    ...extractionResult,
    scenes: extractionResult.scenes.map((sceneProposal, index) =>
      index === payload.proposalIndex ? updatedProposal : sceneProposal
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
    sceneProposal: updatedProposal,
  });
}

function normalizeSceneProposalReviewUpdateInput(
  value: unknown
): SceneProposalReviewUpdateInput {
  if (!isRecord(value)) {
    throw new Error("A JSON body is required.");
  }

  const proposalIndex = readProposalIndex(value.proposalIndex);

  if (proposalIndex === null) {
    throw new Error("A valid scene proposal index is required.");
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
