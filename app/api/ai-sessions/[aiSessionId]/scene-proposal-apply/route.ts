import { NextResponse } from "next/server";

import { buildBrainDumpMatchCandidates, type BrainDumpMatchRecord } from "@/lib/ai/brain-dump-matching";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  normalizeBrainDumpExtractionResult,
  type BrainDumpExtractionResult,
} from "@/types/ai-brain-dump";
import type { Database } from "@/types/database";
import {
  buildSceneDocument,
  coerceSceneStatus,
  coerceSceneType,
  slugifySceneTitle,
  type NormalizedSceneFormValues,
} from "@/types/scene";

type RouteContext = {
  params: Promise<{
    aiSessionId: string;
  }>;
};

type ApplyInput = {
  proposalIndex: number;
};

type SceneWriteRow = Database["public"]["Tables"]["scenes"]["Row"];

type CharacterMatchRow = Pick<
  Database["public"]["Tables"]["characters"]["Row"],
  "id" | "name"
>;

type TimelineEventMatchRow = Pick<
  Database["public"]["Tables"]["timeline_events"]["Row"],
  "id" | "title"
>;

type ChapterLinkRow = Pick<
  Database["public"]["Tables"]["chapters"]["Row"],
  "id" | "book_id" | "scene_ids"
>;

export async function POST(request: Request, context: RouteContext) {
  const { aiSessionId } = await context.params;
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Sign in before applying a scene proposal." }, { status: 401 });
  }

  let input: ApplyInput;

  try {
    input = normalizeApplyInput(await request.json());
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Invalid apply request.",
      },
      { status: 400 }
    );
  }

  const { data: aiSession, error: aiSessionError } = await supabase
    .from("ai_sessions")
    .select("id, project_id, extraction_result, linked_entity_ids, linked_entity_types")
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

  const proposal = extractionResult.scenes[input.proposalIndex];

  if (!proposal) {
    return NextResponse.json({ error: "Scene proposal not found." }, { status: 404 });
  }

  if (proposal.review.reviewStatus === "applied") {
    return NextResponse.json(
      { error: "This scene proposal has already been applied. Save a new review state before applying it again." },
      { status: 400 }
    );
  }

  if (proposal.review.reviewStatus !== "reviewed") {
    return NextResponse.json(
      { error: "Mark this scene proposal as reviewed before applying it." },
      { status: 400 }
    );
  }

  if (proposal.review.suggestedAction === "ignore") {
    return NextResponse.json(
      { error: "Ignored proposals are saved through review state only and do not apply canon writes." },
      { status: 400 }
    );
  }

  const targetSceneId = resolveTargetSceneId(proposal);

  if (
    (proposal.review.suggestedAction === "update" || proposal.review.suggestedAction === "merge") &&
    !targetSceneId
  ) {
    return NextResponse.json(
      { error: "Update or merge requires a matched existing scene." },
      { status: 400 }
    );
  }

  const [targetSceneResult, charactersResult, timelineEventsResult, existingSceneIdsResult] =
    await Promise.all([
      targetSceneId
        ? supabase
            .from("scenes")
            .select("*")
            .eq("user_id", user.id)
            .eq("project_id", aiSession.project_id)
            .eq("id", targetSceneId)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      proposal.pointOfViewCharacterName.trim()
        ? supabase
            .from("characters")
            .select("id, name")
            .eq("user_id", user.id)
            .eq("project_id", aiSession.project_id)
        : Promise.resolve({ data: [], error: null }),
      proposal.linkedTimelineEventTitles.length > 0
        ? supabase
            .from("timeline_events")
            .select("id, title")
            .eq("user_id", user.id)
            .eq("project_id", aiSession.project_id)
        : Promise.resolve({ data: [], error: null }),
      proposal.review.suggestedAction === "create"
        ? supabase
            .from("scenes")
            .select("id")
            .eq("user_id", user.id)
            .eq("project_id", aiSession.project_id)
        : Promise.resolve({ data: [], error: null }),
    ]);

  if (targetSceneResult.error) {
    return NextResponse.json({ error: targetSceneResult.error.message }, { status: 500 });
  }

  if (charactersResult.error) {
    return NextResponse.json({ error: charactersResult.error.message }, { status: 500 });
  }

  if (timelineEventsResult.error) {
    return NextResponse.json({ error: timelineEventsResult.error.message }, { status: 500 });
  }

  if (existingSceneIdsResult.error) {
    return NextResponse.json({ error: existingSceneIdsResult.error.message }, { status: 500 });
  }

  const targetScene = (targetSceneResult.data ?? null) as SceneWriteRow | null;
  const allCharacters = (charactersResult.data ?? []) as CharacterMatchRow[];
  const allTimelineEvents = (timelineEventsResult.data ?? []) as TimelineEventMatchRow[];
  const pointOfViewCharacterId = resolveMatchedCharacterId(
    proposal.pointOfViewCharacterName,
    allCharacters
  );
  const linkedTimelineEventIds = resolveMatchedTimelineEventIds(
    proposal.linkedTimelineEventTitles,
    allTimelineEvents
  );

  const normalizedValues = buildNormalizedSceneValues({
    proposal,
    targetScene,
    pointOfViewCharacterId,
  });
  let targetChapter: ChapterLinkRow | null = null;

  try {
    targetChapter = normalizedValues.chapterId
      ? await loadLinkedChapter({
          supabase,
          uid: user.id,
          projectId: aiSession.project_id,
          chapterId: normalizedValues.chapterId,
        })
      : null;
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to load the linked chapter for this scene.",
      },
      { status: 500 }
    );
  }
  const effectiveValues = {
    ...normalizedValues,
    bookId: normalizedValues.bookId ?? targetChapter?.book_id ?? null,
  } satisfies NormalizedSceneFormValues;

  if (!effectiveValues.title.trim()) {
    return NextResponse.json({ error: "Scene title is required." }, { status: 400 });
  }

  const now = new Date().toISOString();
  let appliedSceneId = targetScene?.id ?? "";

  if (proposal.review.suggestedAction === "create") {
    appliedSceneId = getAvailableSceneId(
      proposal.title,
      (existingSceneIdsResult.data ?? []).map((row) => row.id)
    );
    const sceneDocument = buildSceneDocument({
      id: appliedSceneId,
      projectId: aiSession.project_id,
      values: effectiveValues,
    });

    const { error: insertError } = await supabase.from("scenes").insert({
      user_id: user.id,
      project_id: aiSession.project_id,
      id: appliedSceneId,
      title: sceneDocument.title,
      slug: sceneDocument.slug,
      summary: sceneDocument.summary,
      description: sceneDocument.description,
      status: sceneDocument.status,
      tags: sceneDocument.tags,
      is_archived: sceneDocument.isArchived,
      canon_level: sceneDocument.canonLevel,
      confidence: sceneDocument.confidence,
      book_id: sceneDocument.bookId,
      chapter_id: sceneDocument.chapterId,
      scene_number: sceneDocument.sceneNumber,
      scene_type: sceneDocument.sceneType,
      point_of_view_character_id: sceneDocument.pointOfViewCharacterId,
      goal: sceneDocument.goal,
      conflict: sceneDocument.conflict,
      outcome: sceneDocument.outcome,
      text_draft: sceneDocument.textDraft,
      timeline_event_ids: linkedTimelineEventIds,
      character_ids: uniqueIds([
        ...sceneDocument.characterIds,
        pointOfViewCharacterId ?? "",
      ]),
      location_ids: sceneDocument.locationIds,
      plot_thread_ids: sceneDocument.plotThreadIds,
      created_at: now,
      updated_at: now,
    });

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }
  } else {
    if (!targetScene) {
      return NextResponse.json({ error: "Matched scene not found." }, { status: 404 });
    }

    const { error: updateError } = await supabase
      .from("scenes")
      .update({
        title: effectiveValues.title,
        slug: slugifySceneTitle(effectiveValues.title),
        summary: effectiveValues.summary,
        description: effectiveValues.description,
        status: effectiveValues.status,
        is_archived: effectiveValues.status === "archived",
        book_id: effectiveValues.bookId,
        chapter_id: effectiveValues.chapterId,
        scene_number: effectiveValues.sceneNumber,
        scene_type: effectiveValues.sceneType,
        point_of_view_character_id:
          effectiveValues.pointOfViewCharacterId ?? targetScene.point_of_view_character_id,
        goal: effectiveValues.goal,
        conflict: effectiveValues.conflict,
        outcome: effectiveValues.outcome,
        text_draft: effectiveValues.textDraft,
        timeline_event_ids: uniqueIds([
          ...(targetScene.timeline_event_ids ?? []),
          ...linkedTimelineEventIds,
        ]),
        character_ids: uniqueIds([
          ...(targetScene.character_ids ?? []),
          effectiveValues.pointOfViewCharacterId ?? "",
        ]),
        updated_at: now,
      })
      .eq("user_id", user.id)
      .eq("project_id", aiSession.project_id)
      .eq("id", appliedSceneId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }
  }

  if (effectiveValues.chapterId) {
    try {
      await syncSceneIntoChapter({
        supabase,
        uid: user.id,
        projectId: aiSession.project_id,
        chapter: targetChapter,
        sceneId: appliedSceneId,
      });
    } catch (error) {
      return NextResponse.json(
        {
          error:
            error instanceof Error ? error.message : "Failed to sync the applied scene to its linked chapter.",
        },
        { status: 500 }
      );
    }
  }

  const updatedProposal = {
    ...proposal,
    review: {
      ...proposal.review,
      reviewStatus: "applied" as const,
      matchedRecord: {
        entityType: "scenes",
        recordId: appliedSceneId,
        recordLabel: effectiveValues.title,
        matchReason:
          proposal.review.suggestedAction === "create"
            ? "Applied new scene"
            : "Applied to existing scene",
        score: proposal.review.matchedRecord?.score ?? null,
      },
    },
  };

  const updatedExtractionResult = {
    ...extractionResult,
    scenes: extractionResult.scenes.map((sceneProposal, index) =>
      index === input.proposalIndex ? updatedProposal : sceneProposal
    ),
  } satisfies BrainDumpExtractionResult;
  const linkedEntityIds = uniqueIds([...(aiSession.linked_entity_ids ?? []), appliedSceneId]);
  const linkedEntityTypes = uniqueIds([...(aiSession.linked_entity_types ?? []), "scenes"]);

  const { error: aiSessionUpdateError } = await supabase
    .from("ai_sessions")
    .update({
      extraction_result: updatedExtractionResult,
      linked_entity_ids: linkedEntityIds,
      linked_entity_types: linkedEntityTypes,
      updated_at: now,
    })
    .eq("user_id", user.id)
    .eq("project_id", aiSession.project_id)
    .eq("id", aiSessionId);

  if (aiSessionUpdateError) {
    return NextResponse.json({ error: aiSessionUpdateError.message }, { status: 500 });
  }

  return NextResponse.json({
    sceneProposal: updatedProposal,
    appliedScene: {
      id: appliedSceneId,
      title: effectiveValues.title,
      action: proposal.review.suggestedAction,
    },
  });
}

function buildNormalizedSceneValues({
  proposal,
  targetScene,
  pointOfViewCharacterId,
}: {
  proposal: NonNullable<ReturnType<typeof normalizeBrainDumpExtractionResult>>["scenes"][number];
  targetScene: SceneWriteRow | null;
  pointOfViewCharacterId: string | null;
}): NormalizedSceneFormValues {
  return {
    title: proposal.title.trim(),
    summary: proposal.summary.trim(),
    description: buildSceneDescription(proposal.evidence, targetScene?.description ?? ""),
    status: coerceSceneStatus(targetScene?.status ?? "outline"),
    bookId: targetScene?.book_id ?? null,
    chapterId: targetScene?.chapter_id ?? null,
    sceneNumber: targetScene?.scene_number ?? null,
    sceneType: coerceSceneType(proposal.sceneType),
    pointOfViewCharacterId: pointOfViewCharacterId ?? targetScene?.point_of_view_character_id ?? null,
    goal: proposal.goal.trim(),
    conflict: proposal.conflict.trim(),
    outcome: proposal.outcome.trim(),
    textDraft: targetScene?.text_draft ?? "",
  };
}

async function loadLinkedChapter({
  supabase,
  uid,
  projectId,
  chapterId,
}: {
  supabase: Awaited<ReturnType<typeof getSupabaseServerClient>>;
  uid: string;
  projectId: string;
  chapterId: string;
}) {
  const { data, error } = await supabase
    .from("chapters")
    .select("id, book_id, scene_ids")
    .eq("user_id", uid)
    .eq("project_id", projectId)
    .eq("id", chapterId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? null) as ChapterLinkRow | null;
}

function resolveTargetSceneId(
  proposal: NonNullable<ReturnType<typeof normalizeBrainDumpExtractionResult>>["scenes"][number]
) {
  return proposal.review.matchedRecord?.entityType === "scenes"
    ? proposal.review.matchedRecord.recordId
    : null;
}

function resolveMatchedCharacterId(characterName: string, characters: CharacterMatchRow[]) {
  if (!characterName.trim()) {
    return null;
  }

  const characterRecords = characters.map((row) => createMatchRecord("characters", row.id, row.name));
  const candidate = buildBrainDumpMatchCandidates(characterName, characterRecords)[0];
  return candidate?.recordId ?? null;
}

function resolveMatchedTimelineEventIds(
  linkedTimelineEventTitles: string[],
  timelineEvents: TimelineEventMatchRow[]
) {
  const timelineEventRecords = timelineEvents.map((row) =>
    createMatchRecord("timeline_events", row.id, row.title)
  );
  const ids: string[] = [];
  const seenIds = new Set<string>();

  for (const title of linkedTimelineEventTitles) {
    const candidate = buildBrainDumpMatchCandidates(title, timelineEventRecords)[0];

    if (!candidate?.recordId || seenIds.has(candidate.recordId)) {
      continue;
    }

    seenIds.add(candidate.recordId);
    ids.push(candidate.recordId);
  }

  return ids;
}

function buildSceneDescription(evidence: string, existingDescription: string) {
  const trimmedEvidence = evidence.trim();
  const trimmedExistingDescription = existingDescription.trim();

  if (trimmedExistingDescription && trimmedEvidence) {
    return trimmedExistingDescription.includes(trimmedEvidence)
      ? trimmedExistingDescription
      : `${trimmedExistingDescription}\n\nBrain dump evidence:\n${trimmedEvidence}`;
  }

  if (trimmedExistingDescription) {
    return trimmedExistingDescription;
  }

  return trimmedEvidence ? `Brain dump evidence:\n${trimmedEvidence}` : "";
}

function normalizeApplyInput(value: unknown): ApplyInput {
  if (!isRecord(value)) {
    throw new Error("A JSON body is required.");
  }

  const proposalIndex =
    typeof value.proposalIndex === "number" && Number.isFinite(value.proposalIndex)
      ? Math.trunc(value.proposalIndex)
      : -1;

  if (proposalIndex < 0) {
    throw new Error("A valid scene proposal index is required.");
  }

  return { proposalIndex };
}

function getAvailableSceneId(title: string, existingIds: string[]) {
  const baseId = buildSceneId(title);
  const usedIds = new Set(existingIds);
  let candidateId = baseId;
  let suffix = 2;

  while (usedIds.has(candidateId)) {
    candidateId = `${baseId}-${suffix}`;
    suffix += 1;
  }

  return candidateId;
}

function buildSceneId(title: string) {
  const normalized = slugifySceneTitle(title).replace(/-/g, "_");
  return `scene_${normalized || "scene"}`;
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

function uniqueIds(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function syncSceneIntoChapter({
  supabase,
  uid,
  projectId,
  chapter,
  sceneId,
}: {
  supabase: Awaited<ReturnType<typeof getSupabaseServerClient>>;
  uid: string;
  projectId: string;
  chapter: ChapterLinkRow | null;
  sceneId: string;
}) {
  if (!chapter) {
    return;
  }

  const nextSceneIds = uniqueIds([...(chapter.scene_ids ?? []), sceneId]);

  const { error } = await supabase
    .from("chapters")
    .update({
      scene_ids: nextSceneIds,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", uid)
    .eq("project_id", projectId)
    .eq("id", chapter.id);

  if (error) {
    throw new Error(error.message);
  }
}
