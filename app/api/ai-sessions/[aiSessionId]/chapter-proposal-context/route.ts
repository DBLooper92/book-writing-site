import { NextResponse } from "next/server";

import {
  buildBrainDumpMatchCandidates,
  type BrainDumpMatchRecord,
} from "@/lib/ai/brain-dump-matching";
import { enforceProfileAiCapability } from "@/lib/server/profile-ai-capabilities";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { normalizeBrainDumpExtractionResult } from "@/types/ai-brain-dump";
import type {
  BrainDumpChapterProposalContext,
  BrainDumpContextRecordSummary,
} from "@/types/ai-brain-dump-context";
import type { Database } from "@/types/database";

type RouteContext = {
  params: Promise<{
    aiSessionId: string;
  }>;
};

type ChapterContextRow = Pick<
  Database["public"]["Tables"]["chapters"]["Row"],
  | "id"
  | "title"
  | "summary"
  | "purpose"
  | "chapter_number"
  | "point_of_view_character_id"
  | "scene_ids"
>;

type CharacterContextRow = Pick<
  Database["public"]["Tables"]["characters"]["Row"],
  "id" | "name" | "summary" | "character_type" | "importance_level"
>;

type SceneContextRow = Pick<
  Database["public"]["Tables"]["scenes"]["Row"],
  "id" | "title" | "summary" | "goal" | "conflict" | "outcome" | "chapter_id"
>;

export async function GET(request: Request, context: RouteContext) {
  const { aiSessionId } = await context.params;
  const proposalIndex = readProposalIndex(request);

  if (proposalIndex === null) {
    return NextResponse.json({ error: "A valid chapter proposal index is required." }, { status: 400 });
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
  const proposal = extractionResult?.chapterOutlines[proposalIndex] ?? null;

  if (!proposal) {
    return NextResponse.json({ error: "Chapter proposal not found in this AI session." }, { status: 404 });
  }

  try {
    const contextPayload = await buildChapterProposalContext({
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
            : "Unable to load chapter proposal context.",
      },
      { status: 500 }
    );
  }
}

async function buildChapterProposalContext({
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
  proposal: NonNullable<ReturnType<typeof normalizeBrainDumpExtractionResult>>["chapterOutlines"][number];
}) {
  const matchedChapterId =
    proposal.review.matchedRecord?.entityType === "chapters"
      ? proposal.review.matchedRecord.recordId
      : null;
  const candidateChapterId =
    !matchedChapterId && proposal.review.matchCandidates[0]?.entityType === "chapters"
      ? proposal.review.matchCandidates[0].recordId
      : null;
  const targetChapterId = matchedChapterId || candidateChapterId;

  const [
    targetChapterResult,
    charactersResult,
    scenesResult,
  ] = await Promise.all([
    targetChapterId
      ? supabase
          .from("chapters")
          .select(
            "id, title, summary, purpose, chapter_number, point_of_view_character_id, scene_ids"
          )
          .eq("user_id", uid)
          .eq("project_id", projectId)
          .eq("id", targetChapterId)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    proposal.pointOfViewCharacterName.trim()
      ? supabase
          .from("characters")
          .select("id, name, summary, character_type, importance_level")
          .eq("user_id", uid)
          .eq("project_id", projectId)
      : Promise.resolve({ data: [], error: null }),
    proposal.sceneTitles.length > 0 || targetChapterId
      ? supabase
          .from("scenes")
          .select("id, title, summary, goal, conflict, outcome, chapter_id")
          .eq("user_id", uid)
          .eq("project_id", projectId)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (targetChapterResult.error) {
    throw new Error(targetChapterResult.error.message);
  }

  if (charactersResult.error) {
    throw new Error(charactersResult.error.message);
  }

  if (scenesResult.error) {
    throw new Error(scenesResult.error.message);
  }

  const targetChapter = (targetChapterResult.data ?? null) as ChapterContextRow | null;
  const allCharacters = (charactersResult.data ?? []) as CharacterContextRow[];
  const allScenes = (scenesResult.data ?? []) as SceneContextRow[];

  const matchedChapterSummary =
    matchedChapterId && targetChapter
      ? buildChapterSummary(targetChapter, "Strong project match")
      : null;
  const candidateChapterSummary =
    candidateChapterId && targetChapter
      ? buildChapterSummary(targetChapter, "Top chapter candidate")
      : null;

  const pointOfViewCharacter = buildPointOfViewCharacterContext({
    proposalPointOfViewCharacterName: proposal.pointOfViewCharacterName,
    targetChapter,
    allCharacters,
  });
  const linkedScenes = buildChapterLinkedSceneContext({
    proposalSceneTitles: proposal.sceneTitles,
    targetChapter,
    allScenes,
  });

  const continuityWarnings: string[] = [];
  const notes: string[] = [];

  if (matchedChapterSummary) {
    notes.push("Loaded the strongest matched chapter record plus its current point-of-view and scene context.");
  } else if (candidateChapterSummary) {
    notes.push("No strong chapter match was found, so context is anchored on the top candidate chapter.");
  } else {
    notes.push("No current chapter anchor was found, so this first pass only returns matched POV and scene context.");
  }

  if (proposal.pointOfViewCharacterName.trim() && !pointOfViewCharacter) {
    continuityWarnings.push(
      "The proposal names a point-of-view character, but no scoped character summary matched that label."
    );
  }

  if (proposal.sceneTitles.length > 0 && linkedScenes.length === 0) {
    continuityWarnings.push(
      "The proposal references scene titles, but no scoped scene summaries matched those labels."
    );
  }

  if (targetChapter?.point_of_view_character_id && pointOfViewCharacter) {
    if (targetChapter.point_of_view_character_id !== pointOfViewCharacter.id) {
      continuityWarnings.push(
        `Chapter "${targetChapter.title}" currently points to a different POV character than the one matched from this proposal.`
      );
    }
  }

  if (targetChapter) {
    const missingSceneLinks = linkedScenes.filter(
      (scene) => !(targetChapter.scene_ids ?? []).includes(scene.id)
    );

    if (missingSceneLinks.length > 0) {
      continuityWarnings.push(
        `Chapter "${targetChapter.title}" does not currently link scene records matched from this proposal: ${missingSceneLinks
          .map((scene) => scene.label)
          .join(", ")}.`
      );
    }
  }

  return {
    proposalIndex,
    matchedChapter: matchedChapterSummary,
    candidateChapter: candidateChapterSummary,
    pointOfViewCharacter,
    linkedScenes,
    continuityWarnings,
    notes,
  } satisfies BrainDumpChapterProposalContext;
}

function buildChapterSummary(
  chapter: ChapterContextRow,
  matchedBy: string
): BrainDumpContextRecordSummary {
  return {
    entityType: "chapter",
    id: chapter.id,
    label: chapter.title,
    summary: chapter.summary || chapter.purpose || "",
    meta: [
      typeof chapter.chapter_number === "number" ? `Chapter ${chapter.chapter_number}` : "",
      chapter.purpose ? `Purpose: ${chapter.purpose}` : "",
    ]
      .filter(Boolean)
      .join(" | "),
    matchedBy,
  };
}

function buildPointOfViewCharacterContext({
  proposalPointOfViewCharacterName,
  targetChapter,
  allCharacters,
}: {
  proposalPointOfViewCharacterName: string;
  targetChapter: ChapterContextRow | null;
  allCharacters: CharacterContextRow[];
}) {
  const characterRecords = allCharacters.map((row) => createMatchRecord("characters", row.id, row.name));
  const candidate = proposalPointOfViewCharacterName.trim()
    ? buildBrainDumpMatchCandidates(proposalPointOfViewCharacterName, characterRecords)[0]
    : null;

  const targetCharacter =
    allCharacters.find(
      (row) =>
        row.id === (candidate?.recordId || targetChapter?.point_of_view_character_id || "__missing__")
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
      (targetChapter?.point_of_view_character_id === targetCharacter.id
        ? "Existing chapter POV link"
        : "Matched POV character"),
  };
}

function buildChapterLinkedSceneContext({
  proposalSceneTitles,
  targetChapter,
  allScenes,
}: {
  proposalSceneTitles: string[];
  targetChapter: ChapterContextRow | null;
  allScenes: SceneContextRow[];
}) {
  const sceneRecords = allScenes.map((row) => createMatchRecord("scenes", row.id, row.title));
  const seenIds = new Set<string>();
  const linkedScenes: BrainDumpContextRecordSummary[] = [];

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
    linkedScenes.push({
      entityType: "scene",
      id: scene.id,
      label: scene.title,
      summary: scene.summary || "",
      meta: buildSceneMeta(scene.goal, scene.conflict, scene.outcome),
      matchedBy:
        candidate.matchReason ||
        (targetChapter?.scene_ids?.includes(scene.id)
          ? "Existing chapter scene link"
          : "Matched scene title"),
    });
  }

  return linkedScenes;
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
