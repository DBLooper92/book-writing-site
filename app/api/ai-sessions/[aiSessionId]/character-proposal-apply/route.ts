import { NextResponse } from "next/server";

import { buildBrainDumpMatchCandidates, type BrainDumpMatchRecord } from "@/lib/ai/brain-dump-matching";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  normalizeBrainDumpExtractionResult,
  type BrainDumpExtractionResult,
} from "@/types/ai-brain-dump";
import type { Database } from "@/types/database";
import {
  buildCharacterDocument,
  coerceCharacterImportanceLevel,
  coerceCharacterType,
  slugifyCharacterName,
  type NormalizedCharacterFormValues,
} from "@/types/character";

type RouteContext = {
  params: Promise<{
    aiSessionId: string;
  }>;
};

type ApplyInput = {
  proposalIndex: number;
};

type CharacterWriteRow = Database["public"]["Tables"]["characters"]["Row"];

type SceneMatchRow = Pick<
  Database["public"]["Tables"]["scenes"]["Row"],
  "id" | "title" | "book_id" | "chapter_id" | "character_ids"
>;

type ChapterCharacterLinkRow = Pick<
  Database["public"]["Tables"]["chapters"]["Row"],
  "id" | "character_ids"
>;

export async function POST(request: Request, context: RouteContext) {
  const { aiSessionId } = await context.params;
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Sign in before applying a character proposal." }, { status: 401 });
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

  const proposal = extractionResult.characters[input.proposalIndex];

  if (!proposal) {
    return NextResponse.json({ error: "Character proposal not found." }, { status: 404 });
  }

  if (proposal.review.reviewStatus === "applied") {
    return NextResponse.json(
      { error: "This character proposal has already been applied. Save a new review state before applying it again." },
      { status: 400 }
    );
  }

  if (proposal.review.reviewStatus !== "reviewed") {
    return NextResponse.json(
      { error: "Mark this character proposal as reviewed before applying it." },
      { status: 400 }
    );
  }

  if (proposal.review.suggestedAction === "ignore") {
    return NextResponse.json(
      { error: "Ignored proposals are saved through review state only and do not apply canon writes." },
      { status: 400 }
    );
  }

  const targetCharacterId = resolveTargetCharacterId(proposal);

  if (
    (proposal.review.suggestedAction === "update" || proposal.review.suggestedAction === "merge") &&
    !targetCharacterId
  ) {
    return NextResponse.json(
      { error: "Update or merge requires a matched existing character." },
      { status: 400 }
    );
  }

  const [targetCharacterResult, scenesResult, existingCharacterIdsResult] = await Promise.all([
    targetCharacterId
      ? supabase
          .from("characters")
          .select("*")
          .eq("user_id", user.id)
          .eq("project_id", aiSession.project_id)
          .eq("id", targetCharacterId)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    proposal.relatedSceneTitles.length > 0
      ? supabase
          .from("scenes")
          .select("id, title, book_id, chapter_id, character_ids")
          .eq("user_id", user.id)
          .eq("project_id", aiSession.project_id)
      : Promise.resolve({ data: [], error: null }),
    proposal.review.suggestedAction === "create"
      ? supabase
          .from("characters")
          .select("id")
          .eq("user_id", user.id)
          .eq("project_id", aiSession.project_id)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (targetCharacterResult.error) {
    return NextResponse.json({ error: targetCharacterResult.error.message }, { status: 500 });
  }

  if (scenesResult.error) {
    return NextResponse.json({ error: scenesResult.error.message }, { status: 500 });
  }

  if (existingCharacterIdsResult.error) {
    return NextResponse.json({ error: existingCharacterIdsResult.error.message }, { status: 500 });
  }

  const targetCharacter = (targetCharacterResult.data ?? null) as CharacterWriteRow | null;
  const sceneRows = (scenesResult.data ?? []) as SceneMatchRow[];
  const matchedScenes = resolveMatchedScenes(proposal.relatedSceneTitles, sceneRows);

  const normalizedValues = buildNormalizedCharacterValues({
    proposal,
    targetCharacter,
  });
  const relatedSceneIds = matchedScenes.map((scene) => scene.id);
  const relatedChapterIds = uniqueIds(
    matchedScenes.map((scene) => scene.chapter_id).filter((value): value is string => Boolean(value))
  );
  const relatedBookIds = uniqueIds(
    matchedScenes.map((scene) => scene.book_id).filter((value): value is string => Boolean(value))
  );

  if (!normalizedValues.name.trim()) {
    return NextResponse.json({ error: "Character name is required." }, { status: 400 });
  }

  const now = new Date().toISOString();
  let appliedCharacterId = targetCharacter?.id ?? "";

  if (proposal.review.suggestedAction === "create") {
    appliedCharacterId = getAvailableCharacterId(
      proposal.name,
      (existingCharacterIdsResult.data ?? []).map((row) => row.id)
    );
    const characterDocument = buildCharacterDocument({
      id: appliedCharacterId,
      projectId: aiSession.project_id,
      values: normalizedValues,
    });

    const { error: insertError } = await supabase.from("characters").insert({
      user_id: user.id,
      project_id: aiSession.project_id,
      id: appliedCharacterId,
      name: characterDocument.name,
      slug: characterDocument.slug,
      summary: characterDocument.summary,
      description: characterDocument.description,
      status: characterDocument.status,
      tags: characterDocument.tags,
      is_archived: characterDocument.isArchived,
      canon_level: characterDocument.canonLevel,
      confidence: characterDocument.confidence,
      aliases: characterDocument.aliases,
      character_type: characterDocument.characterType,
      importance_level: characterDocument.importanceLevel,
      birth_year: characterDocument.birthYear,
      death_year: characterDocument.deathYear,
      apparent_age: characterDocument.apparentAge,
      actual_age: characterDocument.actualAge,
      species_id: characterDocument.speciesId,
      culture_ids: characterDocument.cultureIds,
      faction_ids: characterDocument.factionIds,
      religion_ids: characterDocument.religionIds,
      language_ids: characterDocument.languageIds,
      home_location_id: characterDocument.homeLocationId,
      current_location_id: characterDocument.currentLocationId,
      occupation: characterDocument.occupation,
      skills: characterDocument.skills,
      traits: characterDocument.traits,
      flaws: characterDocument.flaws,
      motivations: characterDocument.motivations,
      fears: characterDocument.fears,
      secrets: characterDocument.secrets,
      beliefs: characterDocument.beliefs,
      appearance: characterDocument.appearance,
      voice_profile: characterDocument.voiceProfile,
      arc_summary: characterDocument.arcSummary,
      arc_start_state: characterDocument.arcStartState,
      arc_end_state: characterDocument.arcEndState,
      key_relationship_ids: characterDocument.keyRelationshipIds,
      timeline_event_ids: characterDocument.timelineEventIds,
      book_ids: relatedBookIds,
      chapter_ids: relatedChapterIds,
      scene_ids: relatedSceneIds,
      important_items: characterDocument.importantItems,
      public_wiki_summary: characterDocument.publicWikiSummary,
      created_at: now,
      updated_at: now,
    });

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }
  } else {
    if (!targetCharacter) {
      return NextResponse.json({ error: "Matched character not found." }, { status: 404 });
    }

    const mergedAliases = uniqueIds([
      ...(targetCharacter.aliases ?? []),
      ...normalizedValues.aliases,
      targetCharacter.name !== normalizedValues.name ? normalizedValues.name : "",
    ]);

    const { error: updateError } = await supabase
      .from("characters")
      .update({
        name: normalizedValues.name,
        slug: slugifyCharacterName(normalizedValues.name),
        summary: normalizedValues.summary,
        description: normalizedValues.description,
        status: normalizedValues.status,
        is_archived: normalizedValues.status === "archived",
        aliases: mergedAliases,
        character_type: normalizedValues.characterType,
        importance_level: normalizedValues.importanceLevel,
        birth_year: normalizedValues.birthYear,
        home_location_id: normalizedValues.homeLocationId,
        current_location_id: normalizedValues.homeLocationId ?? targetCharacter.current_location_id,
        occupation: uniqueIds([...(targetCharacter.occupation ?? []), ...normalizedValues.occupation]),
        traits: uniqueIds([...(targetCharacter.traits ?? []), ...normalizedValues.traits]),
        flaws: targetCharacter.flaws ?? [],
        motivations: uniqueIds([...(targetCharacter.motivations ?? []), ...normalizedValues.motivations]),
        timeline_event_ids: targetCharacter.timeline_event_ids ?? [],
        book_ids: uniqueIds([...(targetCharacter.book_ids ?? []), ...relatedBookIds]),
        chapter_ids: uniqueIds([...(targetCharacter.chapter_ids ?? []), ...relatedChapterIds]),
        scene_ids: uniqueIds([...(targetCharacter.scene_ids ?? []), ...relatedSceneIds]),
        public_wiki_summary: normalizedValues.publicWikiSummary,
        updated_at: now,
      })
      .eq("user_id", user.id)
      .eq("project_id", aiSession.project_id)
      .eq("id", appliedCharacterId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }
  }

  try {
    await syncCharacterIntoScenesAndChapters({
      supabase,
      uid: user.id,
      projectId: aiSession.project_id,
      characterId: appliedCharacterId,
      matchedScenes,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to sync the applied character into related scenes and chapters.",
      },
      { status: 500 }
    );
  }

  const updatedProposal = {
    ...proposal,
    review: {
      ...proposal.review,
      reviewStatus: "applied" as const,
      matchedRecord: {
        entityType: "characters",
        recordId: appliedCharacterId,
        recordLabel: normalizedValues.name,
        matchReason:
          proposal.review.suggestedAction === "create"
            ? "Applied new character"
            : "Applied to existing character",
        score: proposal.review.matchedRecord?.score ?? null,
      },
    },
  };

  const updatedExtractionResult = {
    ...extractionResult,
    characters: extractionResult.characters.map((characterProposal, index) =>
      index === input.proposalIndex ? updatedProposal : characterProposal
    ),
  } satisfies BrainDumpExtractionResult;
  const linkedEntityIds = uniqueIds([...(aiSession.linked_entity_ids ?? []), appliedCharacterId]);
  const linkedEntityTypes = uniqueIds([...(aiSession.linked_entity_types ?? []), "characters"]);

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
    characterProposal: updatedProposal,
    appliedCharacter: {
      id: appliedCharacterId,
      name: normalizedValues.name,
      action: proposal.review.suggestedAction,
    },
  });
}

function buildNormalizedCharacterValues({
  proposal,
  targetCharacter,
}: {
  proposal: NonNullable<ReturnType<typeof normalizeBrainDumpExtractionResult>>["characters"][number];
  targetCharacter: CharacterWriteRow | null;
}): NormalizedCharacterFormValues {
  return {
    name: proposal.name.trim(),
    summary: proposal.summary.trim(),
    description: buildCharacterDescription(proposal.evidence, targetCharacter?.description ?? ""),
    status: targetCharacter?.status === "archived" ? "archived" : "active",
    characterType: coerceCharacterType(proposal.characterType),
    importanceLevel: coerceCharacterImportanceLevel(proposal.importanceLevel),
    aliases: targetCharacter?.aliases ?? [],
    occupation: targetCharacter?.occupation ?? [],
    traits: uniqueIds([...(targetCharacter?.traits ?? []), ...proposal.traits]),
    flaws: targetCharacter?.flaws ?? [],
    motivations: uniqueIds([...(targetCharacter?.motivations ?? []), ...proposal.motivations]),
    publicWikiSummary: proposal.summary.trim() || targetCharacter?.public_wiki_summary || "",
    birthYear: targetCharacter?.birth_year ?? null,
    homeLocationId: targetCharacter?.home_location_id ?? null,
  };
}

function resolveTargetCharacterId(
  proposal: NonNullable<ReturnType<typeof normalizeBrainDumpExtractionResult>>["characters"][number]
) {
  return proposal.review.matchedRecord?.entityType === "characters"
    ? proposal.review.matchedRecord.recordId
    : null;
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

function buildCharacterDescription(evidence: string, existingDescription: string) {
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
    throw new Error("A valid character proposal index is required.");
  }

  return { proposalIndex };
}

function getAvailableCharacterId(name: string, existingIds: string[]) {
  const baseId = buildCharacterId(name);
  const usedIds = new Set(existingIds);
  let candidateId = baseId;
  let suffix = 2;

  while (usedIds.has(candidateId)) {
    candidateId = `${baseId}-${suffix}`;
    suffix += 1;
  }

  return candidateId;
}

function buildCharacterId(name: string) {
  const normalized = slugifyCharacterName(name).replace(/-/g, "_");
  return `char_${normalized || "character"}`;
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

async function syncCharacterIntoScenesAndChapters({
  supabase,
  uid,
  projectId,
  characterId,
  matchedScenes,
}: {
  supabase: Awaited<ReturnType<typeof getSupabaseServerClient>>;
  uid: string;
  projectId: string;
  characterId: string;
  matchedScenes: SceneMatchRow[];
}) {
  for (const scene of matchedScenes) {
    const nextCharacterIds = uniqueIds([...(scene.character_ids ?? []), characterId]);

    const { error } = await supabase
      .from("scenes")
      .update({
        character_ids: nextCharacterIds,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", uid)
      .eq("project_id", projectId)
      .eq("id", scene.id);

    if (error) {
      throw new Error(error.message);
    }
  }

  const chapterIds = uniqueIds(
    matchedScenes.map((scene) => scene.chapter_id).filter((value): value is string => Boolean(value))
  );

  if (chapterIds.length === 0) {
    return;
  }

  const { data, error } = await supabase
    .from("chapters")
    .select("id, character_ids")
    .eq("user_id", uid)
    .eq("project_id", projectId)
    .in("id", chapterIds);

  if (error) {
    throw new Error(error.message);
  }

  const chapterRows = (data ?? []) as ChapterCharacterLinkRow[];

  for (const chapter of chapterRows) {
    const nextCharacterIds = uniqueIds([...(chapter.character_ids ?? []), characterId]);

    const { error: updateError } = await supabase
      .from("chapters")
      .update({
        character_ids: nextCharacterIds,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", uid)
      .eq("project_id", projectId)
      .eq("id", chapter.id);

    if (updateError) {
      throw new Error(updateError.message);
    }
  }
}
