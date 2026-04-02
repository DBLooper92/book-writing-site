import { NextResponse } from "next/server";

import {
  buildBrainDumpMatchCandidates,
  type BrainDumpMatchRecord,
} from "@/lib/ai/brain-dump-matching";
import { enforceProfileAiCapability } from "@/lib/server/profile-ai-capabilities";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { normalizeBrainDumpExtractionResult } from "@/types/ai-brain-dump";
import type {
  BrainDumpCharacterProposalContext,
  BrainDumpContextRecordSummary,
} from "@/types/ai-brain-dump-context";
import type { Database } from "@/types/database";

type RouteContext = {
  params: Promise<{
    aiSessionId: string;
  }>;
};

type CharacterContextRow = Pick<
  Database["public"]["Tables"]["characters"]["Row"],
  | "id"
  | "name"
  | "summary"
  | "character_type"
  | "importance_level"
  | "aliases"
  | "traits"
  | "motivations"
  | "arc_summary"
  | "timeline_event_ids"
  | "scene_ids"
>;

type TimelineEventContextRow = Pick<
  Database["public"]["Tables"]["timeline_events"]["Row"],
  "id" | "title" | "summary" | "display_date_label" | "event_type"
>;

type SceneContextRow = Pick<
  Database["public"]["Tables"]["scenes"]["Row"],
  "id" | "title" | "summary" | "goal" | "conflict" | "outcome"
>;

export async function GET(request: Request, context: RouteContext) {
  const { aiSessionId } = await context.params;
  const proposalIndex = readProposalIndex(request);

  if (proposalIndex === null) {
    return NextResponse.json({ error: "A valid character proposal index is required." }, { status: 400 });
  }

  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Sign in before loading proposal context." }, { status: 401 });
  }

  const capabilityErrorResponse = await enforceProfileAiCapability(
    supabase,
    user.id,
    "creative"
  );

  if (capabilityErrorResponse) {
    return capabilityErrorResponse;
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
  const proposal = extractionResult?.characters[proposalIndex] ?? null;

  if (!proposal) {
    return NextResponse.json({ error: "Character proposal not found in this AI session." }, { status: 404 });
  }

  try {
    const contextPayload = await buildCharacterProposalContext({
      supabase,
      uid: user.id,
      projectId: aiSession.project_id,
      proposalIndex,
      proposal,
    });

    return NextResponse.json({ context: contextPayload });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to load character proposal context.",
      },
      { status: 500 }
    );
  }
}

async function buildCharacterProposalContext({
  supabase,
  uid,
  projectId,
  proposalIndex,
  proposal,
}: {
  supabase: Awaited<ReturnType<typeof getSupabaseServerClient>>;
  uid: string;
  projectId: string;
  proposalIndex: number;
  proposal: NonNullable<ReturnType<typeof normalizeBrainDumpExtractionResult>>["characters"][number];
}) {
  const matchedCharacterId =
    proposal.review.matchedRecord?.entityType === "characters"
      ? proposal.review.matchedRecord.recordId
      : null;
  const candidateCharacterId =
    !matchedCharacterId && proposal.review.matchCandidates[0]?.entityType === "characters"
      ? proposal.review.matchCandidates[0].recordId
      : null;
  const targetCharacterId = matchedCharacterId || candidateCharacterId;

  const [
    targetCharacterResult,
    timelineEventsResult,
    scenesResult,
  ] = await Promise.all([
    targetCharacterId
      ? supabase
          .from("characters")
          .select(
            "id, name, summary, character_type, importance_level, aliases, traits, motivations, arc_summary, timeline_event_ids, scene_ids"
          )
          .eq("user_id", uid)
          .eq("project_id", projectId)
          .eq("id", targetCharacterId)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    targetCharacterId
      ? supabase
          .from("timeline_events")
          .select("id, title, summary, display_date_label, event_type")
          .eq("user_id", uid)
          .eq("project_id", projectId)
      : Promise.resolve({ data: [], error: null }),
    Promise.all([
      proposal.relatedSceneTitles.length > 0 || targetCharacterId
        ? supabase
            .from("scenes")
            .select("id, title, summary, goal, conflict, outcome")
            .eq("user_id", uid)
            .eq("project_id", projectId)
        : Promise.resolve({ data: [], error: null }),
    ]).then(([result]) => result),
  ]);

  if (targetCharacterResult.error) {
    throw new Error(targetCharacterResult.error.message);
  }

  if (timelineEventsResult.error) {
    throw new Error(timelineEventsResult.error.message);
  }

  if (scenesResult.error) {
    throw new Error(scenesResult.error.message);
  }

  const targetCharacter = (targetCharacterResult.data ?? null) as CharacterContextRow | null;
  const allTimelineEvents = (timelineEventsResult.data ?? []) as TimelineEventContextRow[];
  const allScenes = (scenesResult.data ?? []) as SceneContextRow[];

  const matchedCharacterSummary =
    matchedCharacterId && targetCharacter
      ? buildCharacterSummary(targetCharacter, "Strong project match")
      : null;
  const candidateCharacterSummary =
    candidateCharacterId && targetCharacter
      ? buildCharacterSummary(targetCharacter, "Top character candidate")
      : null;

  const linkedTimelineEvents = targetCharacter
    ? allTimelineEvents
        .filter((row) => (targetCharacter.timeline_event_ids ?? []).includes(row.id))
        .slice(0, 4)
        .map((row) => ({
          entityType: "timeline_event" as const,
          id: row.id,
          label: row.title,
          summary: row.summary || "",
          meta: row.display_date_label || row.event_type,
          matchedBy: "Existing character timeline link",
        }))
    : [];

  const relatedSceneRecords = buildRelatedSceneContext({
    proposalSceneTitles: proposal.relatedSceneTitles,
    allScenes,
  });

  const continuityWarnings: string[] = [];
  const notes: string[] = [];

  if (matchedCharacterSummary) {
    notes.push("Loaded the strongest matched character record plus linked event context from the current character sheet.");
  } else if (candidateCharacterSummary) {
    notes.push("No strong character match was found, so context is anchored on the top candidate character.");
  } else {
    notes.push("No current character anchor was found, so this first pass only returns proposal-linked scene context.");
  }

  if (proposal.relatedSceneTitles.length > 0 && relatedSceneRecords.length === 0) {
    continuityWarnings.push(
      "The proposal references related scenes, but no scoped scene summaries matched those titles."
    );
  }

  if (targetCharacter && linkedTimelineEvents.length === 0) {
    continuityWarnings.push(
      `Character "${targetCharacter.name}" does not currently have linked timeline events to support this proposal's continuity review.`
    );
  }

  if (targetCharacter) {
    const missingSceneLinks = relatedSceneRecords.filter(
      (scene) => !(targetCharacter.scene_ids ?? []).includes(scene.id)
    );

    if (missingSceneLinks.length > 0) {
      continuityWarnings.push(
        `Character "${targetCharacter.name}" does not currently link related scenes matched from this proposal: ${missingSceneLinks
          .map((scene) => scene.label)
          .join(", ")}.`
      );
    }
  }

  return {
    proposalIndex,
    matchedCharacter: matchedCharacterSummary,
    candidateCharacter: candidateCharacterSummary,
    linkedTimelineEvents,
    relatedScenes: relatedSceneRecords,
    continuityWarnings,
    notes,
  } satisfies BrainDumpCharacterProposalContext;
}

function buildCharacterSummary(
  character: CharacterContextRow,
  matchedBy: string
): BrainDumpContextRecordSummary {
  return {
    entityType: "character",
    id: character.id,
    label: character.name,
    summary: character.summary || character.arc_summary || "",
    meta: [
      character.character_type,
      character.importance_level,
      compactList(character.aliases ?? []).trim() ? `Aliases: ${compactList(character.aliases ?? [])}` : "",
    ]
      .filter(Boolean)
      .join(" | "),
    matchedBy,
  };
}

function buildRelatedSceneContext({
  proposalSceneTitles,
  allScenes,
}: {
  proposalSceneTitles: string[];
  allScenes: SceneContextRow[];
}) {
  const sceneRecords = allScenes.map((row) => createMatchRecord("scenes", row.id, row.title));
  const seenIds = new Set<string>();
  const relatedScenes: BrainDumpContextRecordSummary[] = [];

  for (const sceneTitle of proposalSceneTitles) {
    const candidate = buildBrainDumpMatchCandidates(sceneTitle, sceneRecords)[0];

    if (!candidate?.recordId || seenIds.has(candidate.recordId)) {
      continue;
    }

    const scene = allScenes.find((row) => row.id === candidate.recordId);

    if (!scene) {
      continue;
    }

    seenIds.add(scene.id);
    relatedScenes.push({
      entityType: "scene",
      id: scene.id,
      label: scene.title,
      summary: scene.summary || "",
      meta: buildSceneMeta(scene.goal, scene.conflict, scene.outcome),
      matchedBy: candidate.matchReason || "Related scene match",
    });
  }

  return relatedScenes;
}

function buildSceneMeta(goal: string, conflict: string, outcome: string) {
  return [goal, conflict, outcome].filter(Boolean).join(" | ") || "Scene";
}

function compactList(values: string[]) {
  return values.filter(Boolean).join(", ");
}

function createMatchRecord(
  entityType: BrainDumpMatchRecord["entityType"],
  recordId: string,
  recordLabel: string,
  alternateLabels: string[] = []
): BrainDumpMatchRecord {
  return {
    entityType,
    recordId,
    recordLabel,
    alternateLabels,
  };
}

function readProposalIndex(request: Request) {
  const proposalIndex = new URL(request.url).searchParams.get("proposalIndex");

  if (proposalIndex === null) {
    return null;
  }

  const parsed = Number.parseInt(proposalIndex, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}
