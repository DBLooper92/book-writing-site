import { NextResponse } from "next/server";

import { buildBrainDumpMatchCandidates, type BrainDumpMatchRecord } from "@/lib/ai/brain-dump-matching";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  normalizeBrainDumpExtractionResult,
  type BrainDumpExtractionResult,
} from "@/types/ai-brain-dump";
import type { Database } from "@/types/database";
import {
  buildChapterDocument,
  coerceChapterStatus,
  type NormalizedChapterFormValues,
  slugifyChapterTitle,
} from "@/types/chapter";

type RouteContext = {
  params: Promise<{
    aiSessionId: string;
  }>;
};

type ApplyInput = {
  proposalIndex: number;
};

type ChapterWriteRow = Database["public"]["Tables"]["chapters"]["Row"];

type CharacterMatchRow = Pick<
  Database["public"]["Tables"]["characters"]["Row"],
  "id" | "name"
>;

type SceneMatchRow = Pick<
  Database["public"]["Tables"]["scenes"]["Row"],
  "id" | "title" | "book_id" | "chapter_id"
>;

export async function POST(request: Request, context: RouteContext) {
  const { aiSessionId } = await context.params;
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Sign in before applying a chapter proposal." }, { status: 401 });
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

  const proposal = extractionResult.chapterOutlines[input.proposalIndex];

  if (!proposal) {
    return NextResponse.json({ error: "Chapter proposal not found." }, { status: 404 });
  }

  if (proposal.review.reviewStatus === "applied") {
    return NextResponse.json(
      { error: "This chapter proposal has already been applied. Save a new review state before applying it again." },
      { status: 400 }
    );
  }

  if (proposal.review.reviewStatus !== "reviewed") {
    return NextResponse.json(
      { error: "Mark this chapter proposal as reviewed before applying it." },
      { status: 400 }
    );
  }

  if (proposal.review.suggestedAction === "ignore") {
    return NextResponse.json(
      { error: "Ignored proposals are saved through review state only and do not apply canon writes." },
      { status: 400 }
    );
  }

  const targetChapterId = resolveTargetChapterId(proposal);

  if (
    (proposal.review.suggestedAction === "update" || proposal.review.suggestedAction === "merge") &&
    !targetChapterId
  ) {
    return NextResponse.json(
      { error: "Update or merge requires a matched existing chapter." },
      { status: 400 }
    );
  }

  const [targetChapterResult, charactersResult, scenesResult, existingChapterIdsResult] =
    await Promise.all([
      targetChapterId
        ? supabase
            .from("chapters")
            .select("*")
            .eq("user_id", user.id)
            .eq("project_id", aiSession.project_id)
            .eq("id", targetChapterId)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      proposal.pointOfViewCharacterName.trim()
        ? supabase
            .from("characters")
            .select("id, name")
            .eq("user_id", user.id)
            .eq("project_id", aiSession.project_id)
        : Promise.resolve({ data: [], error: null }),
      proposal.sceneTitles.length > 0
        ? supabase
            .from("scenes")
            .select("id, title, book_id, chapter_id")
            .eq("user_id", user.id)
            .eq("project_id", aiSession.project_id)
        : Promise.resolve({ data: [], error: null }),
      proposal.review.suggestedAction === "create"
        ? supabase
            .from("chapters")
            .select("id")
            .eq("user_id", user.id)
            .eq("project_id", aiSession.project_id)
        : Promise.resolve({ data: [], error: null }),
    ]);

  if (targetChapterResult.error) {
    return NextResponse.json({ error: targetChapterResult.error.message }, { status: 500 });
  }

  if (charactersResult.error) {
    return NextResponse.json({ error: charactersResult.error.message }, { status: 500 });
  }

  if (scenesResult.error) {
    return NextResponse.json({ error: scenesResult.error.message }, { status: 500 });
  }

  if (existingChapterIdsResult.error) {
    return NextResponse.json({ error: existingChapterIdsResult.error.message }, { status: 500 });
  }

  const targetChapter = (targetChapterResult.data ?? null) as ChapterWriteRow | null;
  const allCharacters = (charactersResult.data ?? []) as CharacterMatchRow[];
  const allScenes = (scenesResult.data ?? []) as SceneMatchRow[];
  const pointOfViewCharacterId = resolveMatchedCharacterId(
    proposal.pointOfViewCharacterName,
    allCharacters
  );
  const matchedScenes = resolveMatchedScenes(proposal.sceneTitles, allScenes);
  const inferredBookIds = uniqueIds(
    matchedScenes.map((scene) => scene.book_id).filter((value): value is string => Boolean(value))
  );

  const normalizedValues = buildNormalizedChapterValues({
    proposal,
    targetChapter,
    pointOfViewCharacterId,
    inferredBookIds,
  });

  if (!normalizedValues.title.trim()) {
    return NextResponse.json({ error: "Chapter title is required." }, { status: 400 });
  }

  const now = new Date().toISOString();
  let appliedChapterId = targetChapter?.id ?? "";

  if (proposal.review.suggestedAction === "create") {
    appliedChapterId = getAvailableChapterId(
      proposal.title,
      (existingChapterIdsResult.data ?? []).map((row) => row.id)
    );
    const chapterDocument = buildChapterDocument({
      id: appliedChapterId,
      projectId: aiSession.project_id,
      values: normalizedValues,
    });

    const { error: insertError } = await supabase.from("chapters").insert({
      user_id: user.id,
      project_id: aiSession.project_id,
      id: appliedChapterId,
      title: chapterDocument.title,
      slug: chapterDocument.slug,
      summary: chapterDocument.summary,
      description: chapterDocument.description,
      status: chapterDocument.status,
      tags: chapterDocument.tags,
      is_archived: chapterDocument.isArchived,
      canon_level: chapterDocument.canonLevel,
      confidence: chapterDocument.confidence,
      book_id: chapterDocument.bookId,
      chapter_number: chapterDocument.chapterNumber,
      purpose: chapterDocument.purpose,
      point_of_view_character_id: chapterDocument.pointOfViewCharacterId,
      timeline_event_ids: chapterDocument.timelineEventIds,
      scene_ids: [],
      location_ids: chapterDocument.locationIds,
      character_ids: uniqueIds([
        ...chapterDocument.characterIds,
        pointOfViewCharacterId ?? "",
      ]),
      plot_thread_ids: chapterDocument.plotThreadIds,
      foreshadows: chapterDocument.foreshadows,
      payoffs: chapterDocument.payoffs,
      created_at: now,
      updated_at: now,
    });

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }
  } else {
    if (!targetChapter) {
      return NextResponse.json({ error: "Matched chapter not found." }, { status: 404 });
    }

    const { error: updateError } = await supabase
      .from("chapters")
      .update({
        title: normalizedValues.title,
        slug: slugifyChapterTitle(normalizedValues.title),
        summary: normalizedValues.summary,
        description: normalizedValues.description,
        status: normalizedValues.status,
        is_archived: normalizedValues.status === "archived",
        book_id: normalizedValues.bookId,
        chapter_number: normalizedValues.chapterNumber,
        purpose: normalizedValues.purpose,
        point_of_view_character_id:
          normalizedValues.pointOfViewCharacterId ?? targetChapter.point_of_view_character_id,
        character_ids: uniqueIds([
          ...(targetChapter.character_ids ?? []),
          normalizedValues.pointOfViewCharacterId ?? "",
        ]),
        updated_at: now,
      })
      .eq("user_id", user.id)
      .eq("project_id", aiSession.project_id)
      .eq("id", appliedChapterId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }
  }

  let syncedSceneIds: string[] = [];

  try {
    syncedSceneIds = await syncScenesToChapter({
      supabase,
      uid: user.id,
      projectId: aiSession.project_id,
      chapterId: appliedChapterId,
      chapterBookId: normalizedValues.bookId,
      matchedScenes,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to sync matched scenes to the applied chapter.",
      },
      { status: 500 }
    );
  }

  const chapterSceneIds = uniqueIds([...(targetChapter?.scene_ids ?? []), ...syncedSceneIds]);

  const { error: chapterSceneLinkError } = await supabase
    .from("chapters")
    .update({
      scene_ids: chapterSceneIds,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user.id)
    .eq("project_id", aiSession.project_id)
    .eq("id", appliedChapterId);

  if (chapterSceneLinkError) {
    return NextResponse.json({ error: chapterSceneLinkError.message }, { status: 500 });
  }

  const updatedProposal = {
    ...proposal,
    review: {
      ...proposal.review,
      reviewStatus: "applied" as const,
      matchedRecord: {
        entityType: "chapters",
        recordId: appliedChapterId,
        recordLabel: normalizedValues.title,
        matchReason:
          proposal.review.suggestedAction === "create"
            ? "Applied new chapter"
            : "Applied to existing chapter",
        score: proposal.review.matchedRecord?.score ?? null,
      },
    },
  };

  const updatedExtractionResult = {
    ...extractionResult,
    chapterOutlines: extractionResult.chapterOutlines.map((chapterProposal, index) =>
      index === input.proposalIndex ? updatedProposal : chapterProposal
    ),
  } satisfies BrainDumpExtractionResult;
  const linkedEntityIds = uniqueIds([...(aiSession.linked_entity_ids ?? []), appliedChapterId]);
  const linkedEntityTypes = uniqueIds([...(aiSession.linked_entity_types ?? []), "chapters"]);

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
    chapterProposal: updatedProposal,
    appliedChapter: {
      id: appliedChapterId,
      title: normalizedValues.title,
      action: proposal.review.suggestedAction,
    },
  });
}

function buildNormalizedChapterValues({
  proposal,
  targetChapter,
  pointOfViewCharacterId,
  inferredBookIds,
}: {
  proposal: NonNullable<ReturnType<typeof normalizeBrainDumpExtractionResult>>["chapterOutlines"][number];
  targetChapter: ChapterWriteRow | null;
  pointOfViewCharacterId: string | null;
  inferredBookIds: string[];
}): NormalizedChapterFormValues {
  return {
    title: proposal.title.trim(),
    summary: proposal.summary.trim(),
    description: buildChapterDescription(proposal.evidence, targetChapter?.description ?? ""),
    status: coerceChapterStatus(targetChapter?.status ?? "outline"),
    bookId: targetChapter?.book_id ?? inferredBookIds[0] ?? null,
    chapterNumber:
      parseEstimatedChapterNumber(proposal.estimatedChapterNumber) ?? targetChapter?.chapter_number ?? null,
    purpose: proposal.purpose.trim(),
    pointOfViewCharacterId: pointOfViewCharacterId ?? targetChapter?.point_of_view_character_id ?? null,
  };
}

function resolveTargetChapterId(
  proposal: NonNullable<ReturnType<typeof normalizeBrainDumpExtractionResult>>["chapterOutlines"][number]
) {
  return proposal.review.matchedRecord?.entityType === "chapters"
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

function resolveMatchedScenes(proposalSceneTitles: string[], scenes: SceneMatchRow[]) {
  const sceneRecords = scenes.map((row) => createMatchRecord("scenes", row.id, row.title));
  const matchedScenes: SceneMatchRow[] = [];
  const seenIds = new Set<string>();

  for (const sceneTitle of proposalSceneTitles) {
    const candidate = buildBrainDumpMatchCandidates(sceneTitle, sceneRecords)[0];

    if (!candidate?.recordId || seenIds.has(candidate.recordId)) {
      continue;
    }

    const scene = scenes.find((row) => row.id === candidate.recordId);

    if (!scene) {
      continue;
    }

    seenIds.add(scene.id);
    matchedScenes.push(scene);
  }

  return matchedScenes;
}

function buildChapterDescription(evidence: string, existingDescription: string) {
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

function parseEstimatedChapterNumber(value: string) {
  const match = value.match(/-?\d+/);

  if (!match) {
    return null;
  }

  const parsed = Number.parseInt(match[0], 10);
  return Number.isFinite(parsed) ? parsed : null;
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
    throw new Error("A valid chapter proposal index is required.");
  }

  return { proposalIndex };
}

function getAvailableChapterId(title: string, existingIds: string[]) {
  const baseId = buildChapterId(title);
  const usedIds = new Set(existingIds);
  let candidateId = baseId;
  let suffix = 2;

  while (usedIds.has(candidateId)) {
    candidateId = `${baseId}-${suffix}`;
    suffix += 1;
  }

  return candidateId;
}

function buildChapterId(title: string) {
  const normalized = slugifyChapterTitle(title).replace(/-/g, "_");
  return `chapter_${normalized || "chapter"}`;
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

async function syncScenesToChapter({
  supabase,
  uid,
  projectId,
  chapterId,
  chapterBookId,
  matchedScenes,
}: {
  supabase: Awaited<ReturnType<typeof getSupabaseServerClient>>;
  uid: string;
  projectId: string;
  chapterId: string;
  chapterBookId: string | null;
  matchedScenes: SceneMatchRow[];
}) {
  const syncedSceneIds: string[] = [];

  for (const scene of matchedScenes) {
    if (scene.chapter_id && scene.chapter_id !== chapterId) {
      continue;
    }

    if (chapterBookId && scene.book_id && scene.book_id !== chapterBookId) {
      continue;
    }

    const nextBookId = scene.book_id || chapterBookId;
    const { error } = await supabase
      .from("scenes")
      .update({
        chapter_id: chapterId,
        book_id: nextBookId,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", uid)
      .eq("project_id", projectId)
      .eq("id", scene.id);

    if (error) {
      throw new Error(error.message);
    }

    syncedSceneIds.push(scene.id);
  }

  return syncedSceneIds;
}
