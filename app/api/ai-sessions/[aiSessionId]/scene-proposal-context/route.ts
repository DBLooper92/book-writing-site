import { NextResponse } from "next/server";

import {
  buildBrainDumpMatchCandidates,
  type BrainDumpMatchRecord,
} from "@/lib/ai/brain-dump-matching";
import { enforceProfileAiCapability } from "@/lib/server/profile-ai-capabilities";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { normalizeBrainDumpExtractionResult } from "@/types/ai-brain-dump";
import type {
  BrainDumpContextRecordSummary,
  BrainDumpSceneProposalContext,
} from "@/types/ai-brain-dump-context";
import type { Database } from "@/types/database";

type RouteContext = {
  params: Promise<{
    aiSessionId: string;
  }>;
};

type SceneContextRow = Pick<
  Database["public"]["Tables"]["scenes"]["Row"],
  | "id"
  | "title"
  | "summary"
  | "scene_type"
  | "scene_number"
  | "point_of_view_character_id"
  | "goal"
  | "conflict"
  | "outcome"
  | "timeline_event_ids"
  | "chapter_id"
>;

type CharacterContextRow = Pick<
  Database["public"]["Tables"]["characters"]["Row"],
  "id" | "name" | "summary" | "character_type" | "importance_level"
>;

type TimelineEventContextRow = Pick<
  Database["public"]["Tables"]["timeline_events"]["Row"],
  "id" | "title" | "summary" | "display_date_label" | "event_type"
>;

type ChapterContextRow = Pick<
  Database["public"]["Tables"]["chapters"]["Row"],
  "id" | "title" | "summary" | "purpose" | "chapter_number"
>;

export async function GET(request: Request, context: RouteContext) {
  const { aiSessionId } = await context.params;
  const proposalIndex = readProposalIndex(request);

  if (proposalIndex === null) {
    return NextResponse.json({ error: "A valid scene proposal index is required." }, { status: 400 });
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
  const proposal = extractionResult?.scenes[proposalIndex] ?? null;

  if (!proposal) {
    return NextResponse.json({ error: "Scene proposal not found in this AI session." }, { status: 404 });
  }

  try {
    const contextPayload = await buildSceneProposalContext({
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
            : "Unable to load scene proposal context.",
      },
      { status: 500 }
    );
  }
}

async function buildSceneProposalContext({
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
  proposal: NonNullable<ReturnType<typeof normalizeBrainDumpExtractionResult>>["scenes"][number];
}) {
  const matchedSceneId =
    proposal.review.matchedRecord?.entityType === "scenes"
      ? proposal.review.matchedRecord.recordId
      : null;
  const candidateSceneId =
    !matchedSceneId && proposal.review.matchCandidates[0]?.entityType === "scenes"
      ? proposal.review.matchCandidates[0].recordId
      : null;
  const targetSceneId = matchedSceneId || candidateSceneId;

  const [
    targetSceneResult,
    charactersResult,
    timelineEventsResult,
    chaptersResult,
  ] = await Promise.all([
    targetSceneId
      ? supabase
          .from("scenes")
          .select(
            "id, title, summary, scene_type, scene_number, point_of_view_character_id, goal, conflict, outcome, timeline_event_ids, chapter_id"
          )
          .eq("user_id", uid)
          .eq("project_id", projectId)
          .eq("id", targetSceneId)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    proposal.pointOfViewCharacterName.trim() || targetSceneId
      ? supabase
          .from("characters")
          .select("id, name, summary, character_type, importance_level")
          .eq("user_id", uid)
          .eq("project_id", projectId)
      : Promise.resolve({ data: [], error: null }),
    proposal.linkedTimelineEventTitles.length > 0 || targetSceneId
      ? supabase
          .from("timeline_events")
          .select("id, title, summary, display_date_label, event_type")
          .eq("user_id", uid)
          .eq("project_id", projectId)
      : Promise.resolve({ data: [], error: null }),
    targetSceneId
      ? supabase
          .from("chapters")
          .select("id, title, summary, purpose, chapter_number")
          .eq("user_id", uid)
          .eq("project_id", projectId)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (targetSceneResult.error) {
    throw new Error(targetSceneResult.error.message);
  }

  if (charactersResult.error) {
    throw new Error(charactersResult.error.message);
  }

  if (timelineEventsResult.error) {
    throw new Error(timelineEventsResult.error.message);
  }

  if (chaptersResult.error) {
    throw new Error(chaptersResult.error.message);
  }

  const targetScene = (targetSceneResult.data ?? null) as SceneContextRow | null;
  const allCharacters = (charactersResult.data ?? []) as CharacterContextRow[];
  const allTimelineEvents = (timelineEventsResult.data ?? []) as TimelineEventContextRow[];
  const allChapters = (chaptersResult.data ?? []) as ChapterContextRow[];

  const matchedSceneSummary =
    matchedSceneId && targetScene ? buildSceneSummary(targetScene, "Strong project match") : null;
  const candidateSceneSummary =
    candidateSceneId && targetScene ? buildSceneSummary(targetScene, "Top scene candidate") : null;
  const parentChapter =
    targetScene?.chapter_id
      ? buildParentChapterContext(targetScene.chapter_id, allChapters)
      : null;
  const pointOfViewCharacter = buildPointOfViewCharacterContext({
    proposalPointOfViewCharacterName: proposal.pointOfViewCharacterName,
    targetScene,
    allCharacters,
  });
  const linkedTimelineEventContext = buildLinkedTimelineEventContext({
    proposalTimelineEventTitles: proposal.linkedTimelineEventTitles,
    targetScene,
    allTimelineEvents,
  });

  const continuityWarnings: string[] = [];
  const notes: string[] = [];

  if (matchedSceneSummary) {
    notes.push(
      "Loaded the strongest matched scene record plus its current parent chapter, point-of-view, and timeline context."
    );
  } else if (candidateSceneSummary) {
    notes.push("No strong scene match was found, so context is anchored on the top candidate scene.");
  } else {
    notes.push("No current scene anchor was found, so this first pass only returns matched POV and timeline context.");
  }

  if (proposal.pointOfViewCharacterName.trim() && !pointOfViewCharacter) {
    continuityWarnings.push(
      "The proposal names a point-of-view character, but no scoped character summary matched that label."
    );
  }

  if (
    proposal.linkedTimelineEventTitles.length > 0 &&
    linkedTimelineEventContext.matchedProposalEventIds.length === 0
  ) {
    continuityWarnings.push(
      "The proposal references timeline events, but no scoped timeline-event summaries matched those titles."
    );
  }

  if (targetScene?.point_of_view_character_id && pointOfViewCharacter) {
    if (targetScene.point_of_view_character_id !== pointOfViewCharacter.id) {
      continuityWarnings.push(
        `Scene "${targetScene.title}" currently points to a different POV character than the one matched from this proposal.`
      );
    }
  }

  if (targetScene && linkedTimelineEventContext.matchedProposalEventIds.length > 0) {
    const missingTimelineLinks = linkedTimelineEventContext.linkedTimelineEvents.filter(
      (timelineEvent) =>
        linkedTimelineEventContext.matchedProposalEventIds.includes(timelineEvent.id) &&
        !(targetScene.timeline_event_ids ?? []).includes(timelineEvent.id)
    );

    if (missingTimelineLinks.length > 0) {
      continuityWarnings.push(
        `Scene "${targetScene.title}" does not currently link timeline events matched from this proposal: ${missingTimelineLinks
          .map((timelineEvent) => timelineEvent.label)
          .join(", ")}.`
      );
    }
  }

  if (targetScene?.chapter_id && !parentChapter) {
    continuityWarnings.push(
      `Scene "${targetScene.title}" currently references a parent chapter that could not be loaded for review context.`
    );
  }

  if (targetScene && linkedTimelineEventContext.linkedTimelineEvents.length === 0) {
    continuityWarnings.push(
      `Scene "${targetScene.title}" does not currently have linked timeline events to support this proposal's continuity review.`
    );
  }

  return {
    proposalIndex,
    matchedScene: matchedSceneSummary,
    candidateScene: candidateSceneSummary,
    parentChapter,
    pointOfViewCharacter,
    linkedTimelineEvents: linkedTimelineEventContext.linkedTimelineEvents,
    continuityWarnings,
    notes,
  } satisfies BrainDumpSceneProposalContext;
}

function buildSceneSummary(scene: SceneContextRow, matchedBy: string): BrainDumpContextRecordSummary {
  return {
    entityType: "scene",
    id: scene.id,
    label: scene.title,
    summary: scene.summary || "",
    meta: [
      scene.scene_type,
      typeof scene.scene_number === "number" ? `Scene ${scene.scene_number}` : "",
      buildSceneMeta(scene.goal, scene.conflict, scene.outcome),
    ]
      .filter(Boolean)
      .join(" | "),
    matchedBy,
  };
}

function buildParentChapterContext(chapterId: string, allChapters: ChapterContextRow[]) {
  const chapter = allChapters.find((row) => row.id === chapterId);

  if (!chapter) {
    return null;
  }

  return {
    entityType: "chapter" as const,
    id: chapter.id,
    label: chapter.title,
    summary: chapter.summary || chapter.purpose || "",
    meta: [
      typeof chapter.chapter_number === "number" ? `Chapter ${chapter.chapter_number}` : "",
      chapter.purpose ? `Purpose: ${chapter.purpose}` : "",
    ]
      .filter(Boolean)
      .join(" | "),
    matchedBy: "Existing scene chapter link",
  };
}

function buildPointOfViewCharacterContext({
  proposalPointOfViewCharacterName,
  targetScene,
  allCharacters,
}: {
  proposalPointOfViewCharacterName: string;
  targetScene: SceneContextRow | null;
  allCharacters: CharacterContextRow[];
}) {
  const characterRecords = allCharacters.map((row) => createMatchRecord("characters", row.id, row.name));
  const candidate = proposalPointOfViewCharacterName.trim()
    ? buildBrainDumpMatchCandidates(proposalPointOfViewCharacterName, characterRecords)[0]
    : null;

  const targetCharacter =
    allCharacters.find(
      (row) =>
        row.id === (candidate?.recordId || targetScene?.point_of_view_character_id || "__missing__")
    ) ?? null;

  if (!targetCharacter) {
    return null;
  }

  return {
    entityType: "character" as const,
    id: targetCharacter.id,
    label: targetCharacter.name,
    summary: targetCharacter.summary || "",
    meta: [targetCharacter.character_type, targetCharacter.importance_level]
      .filter(Boolean)
      .join(" | "),
    matchedBy:
      candidate?.matchReason ||
      (targetScene?.point_of_view_character_id === targetCharacter.id
        ? "Existing scene POV link"
        : "Matched POV character"),
  };
}

function buildLinkedTimelineEventContext({
  proposalTimelineEventTitles,
  targetScene,
  allTimelineEvents,
}: {
  proposalTimelineEventTitles: string[];
  targetScene: SceneContextRow | null;
  allTimelineEvents: TimelineEventContextRow[];
}) {
  const linkedTimelineEvents: BrainDumpContextRecordSummary[] = [];
  const matchedProposalEventIds: string[] = [];
  const seenIds = new Set<string>();
  const timelineEventRecords = allTimelineEvents.map((row) =>
    createMatchRecord("timeline_events", row.id, row.title)
  );

  for (const eventId of targetScene?.timeline_event_ids ?? []) {
    const timelineEvent = allTimelineEvents.find((row) => row.id === eventId);

    if (!timelineEvent || seenIds.has(timelineEvent.id)) {
      continue;
    }

    seenIds.add(timelineEvent.id);
    linkedTimelineEvents.push({
      entityType: "timeline_event",
      id: timelineEvent.id,
      label: timelineEvent.title,
      summary: timelineEvent.summary || "",
      meta: timelineEvent.display_date_label || timelineEvent.event_type,
      matchedBy: "Existing scene timeline link",
    });
  }

  for (const eventTitle of proposalTimelineEventTitles) {
    const candidate = buildBrainDumpMatchCandidates(eventTitle, timelineEventRecords)[0];

    if (!candidate?.recordId) {
      continue;
    }

    const timelineEvent = allTimelineEvents.find((row) => row.id === candidate.recordId);

    if (!timelineEvent) {
      continue;
    }

    matchedProposalEventIds.push(timelineEvent.id);

    if (seenIds.has(timelineEvent.id)) {
      continue;
    }

    seenIds.add(timelineEvent.id);
    linkedTimelineEvents.push({
      entityType: "timeline_event",
      id: timelineEvent.id,
      label: timelineEvent.title,
      summary: timelineEvent.summary || "",
      meta: timelineEvent.display_date_label || timelineEvent.event_type,
      matchedBy: candidate.matchReason || "Matched timeline event title",
    });
  }

  return {
    linkedTimelineEvents,
    matchedProposalEventIds,
  };
}

function buildSceneMeta(goal: string, conflict: string, outcome: string) {
  return [goal, conflict, outcome].filter(Boolean).join(" | ") || "Scene";
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
