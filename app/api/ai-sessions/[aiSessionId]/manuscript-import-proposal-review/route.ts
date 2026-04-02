import { NextResponse } from "next/server";

import {
  BRAIN_DUMP_PROPOSAL_REVIEW_STATUS_VALUES,
  BRAIN_DUMP_PROPOSAL_SUGGESTED_ACTION_VALUES,
  BRAIN_DUMP_TIMELINE_PLACEMENT_VALUES,
  selectBrainDumpMatchedRecord,
} from "@/types/ai-brain-dump";
import { enforceProfileAiCapability } from "@/lib/server/profile-ai-capabilities";
import { normalizeManuscriptImportWorkflowState } from "@/types/ai-manuscript-import";
import type { Json } from "@/types/database";
import { getSupabaseServerClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{
    aiSessionId: string;
  }>;
};

type ReviewInput = {
  proposalType: "characters" | "locations" | "plotThreads" | "timelineEvents" | "chapters" | "scenes";
  proposalId: string;
  reviewStatus: "pending" | "reviewed" | "applied";
  suggestedAction: "create" | "update" | "merge" | "ignore";
  matchedRecordId: string | null;
  placement: "unspecified" | "beginning" | "end" | "before" | "after" | "between";
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

  const capabilityErrorResponse = await enforceProfileAiCapability(
    supabase,
    user.id,
    "organizational"
  );

  if (capabilityErrorResponse) {
    return capabilityErrorResponse;
  }

  let input: ReviewInput;

  try {
    input = normalizeReviewInput(await request.json());
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Invalid manuscript import proposal review update.",
      },
      { status: 400 }
    );
  }

  if (
    typeof input.yearStart === "number" &&
    typeof input.yearEnd === "number" &&
    input.yearEnd < input.yearStart
  ) {
    return NextResponse.json(
      { error: "End year cannot be earlier than start year." },
      { status: 400 }
    );
  }

  const { data: aiSession, error: aiSessionError } = await supabase
    .from("ai_sessions")
    .select("id, project_id, session_type, workflow_state")
    .eq("user_id", user.id)
    .eq("id", aiSessionId)
    .maybeSingle();

  if (aiSessionError) {
    return NextResponse.json({ error: aiSessionError.message }, { status: 500 });
  }

  if (!aiSession || aiSession.session_type !== "manuscript_import") {
    return NextResponse.json({ error: "Manuscript import session not found." }, { status: 404 });
  }

  const workflowState = normalizeManuscriptImportWorkflowState(aiSession.workflow_state);

  if (!workflowState) {
    return NextResponse.json(
      { error: "This AI session does not contain manuscript import workflow state." },
      { status: 400 }
    );
  }

  const proposals = workflowState.proposals[input.proposalType];
  const proposal = proposals.find((entry) => entry.proposalId === input.proposalId);

  if (!proposal) {
    return NextResponse.json({ error: "Proposal not found." }, { status: 404 });
  }

  const matchedRecord = selectBrainDumpMatchedRecord(proposal.review, input.matchedRecordId);

  if (input.matchedRecordId && !matchedRecord) {
    return NextResponse.json(
      { error: "Selected match candidate is no longer available." },
      { status: 400 }
    );
  }

  const nextWorkflowState = {
    ...workflowState,
    proposals: {
      ...workflowState.proposals,
      [input.proposalType]: proposals.map((entry) => {
        if (entry.proposalId !== input.proposalId) {
          return entry;
        }

        const baseProposal = {
          ...entry,
          review: {
            ...entry.review,
            reviewStatus: input.reviewStatus,
            suggestedAction: input.suggestedAction,
            matchedRecord,
          },
        };

        if (input.proposalType !== "timelineEvents" || !("placementSuggestion" in entry)) {
          return baseProposal;
        }

        return {
          ...baseProposal,
          placementSuggestion: {
            ...entry.placementSuggestion,
            placement: input.placement,
            yearStart: input.yearStart,
            yearEnd: input.yearEnd,
            displayDateLabel: input.displayDateLabel,
          },
        };
      }),
    },
  };

  const { error: updateError } = await supabase
    .from("ai_sessions")
    .update({
      workflow_state: nextWorkflowState as Json,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user.id)
    .eq("project_id", aiSession.project_id)
    .eq("id", aiSessionId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({
    proposalType: input.proposalType,
    proposal:
      nextWorkflowState.proposals[input.proposalType].find(
        (entry) => entry.proposalId === input.proposalId
      ) ?? null,
  });
}

function normalizeReviewInput(value: unknown): ReviewInput {
  if (!isRecord(value)) {
    throw new Error("A JSON body is required.");
  }

  const proposalType = readProposalType(value.proposalType);
  const proposalId = typeof value.proposalId === "string" ? value.proposalId.trim() : "";

  if (!proposalId) {
    throw new Error("Proposal ID is required.");
  }

  return {
    proposalType,
    proposalId,
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

function readProposalType(value: unknown): ReviewInput["proposalType"] {
  return value === "characters" ||
    value === "locations" ||
    value === "plotThreads" ||
    value === "timelineEvents" ||
    value === "chapters" ||
    value === "scenes"
    ? value
    : "characters";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
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
