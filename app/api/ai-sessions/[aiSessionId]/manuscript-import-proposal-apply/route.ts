import { NextResponse } from "next/server";

import { buildBrainDumpMatchCandidates, type BrainDumpMatchRecord } from "@/lib/ai/brain-dump-matching";
import { markManuscriptImportProposalApplied } from "@/lib/ai/manuscript-import-workflow";
import { enforceProfileAiCapability } from "@/lib/server/profile-ai-capabilities";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type {
  ManuscriptImportCharacterProposal,
  ManuscriptImportChapterProposal,
  ManuscriptImportLocationProposal,
  ManuscriptImportPlotThreadProposal,
  ManuscriptImportProposalByType,
  ManuscriptImportProposalType,
  ManuscriptImportSceneProposal,
  ManuscriptImportTimelineEventProposal,
  ManuscriptImportWorkflowState,
} from "@/types/ai-manuscript-import";
import { normalizeManuscriptImportWorkflowState } from "@/types/ai-manuscript-import";
import type { Database, Json } from "@/types/database";
import {
  buildCharacterDocument,
  coerceCharacterImportanceLevel,
  coerceCharacterType,
  slugifyCharacterName,
  type NormalizedCharacterFormValues,
} from "@/types/character";
import {
  buildLocationDocument,
  slugifyLocationName,
  type NormalizedLocationFormValues,
} from "@/types/location";
import {
  buildPlotThreadDocument,
  coercePlotThreadType,
  slugifyPlotThreadTitle,
  type NormalizedPlotThreadFormValues,
} from "@/types/plot-thread";
import {
  buildTimelineEventDocument,
  coerceTimelineEventType,
  slugifyTimelineEventTitle,
  validateNormalizedTimelineEventFormValues,
  type NormalizedTimelineEventFormValues,
} from "@/types/timeline-event";
import {
  buildChapterDocument,
  coerceChapterStatus,
  slugifyChapterTitle,
  type NormalizedChapterFormValues,
} from "@/types/chapter";
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
  proposalType: ManuscriptImportProposalType;
  proposalId: string;
};

type CharacterRow = Database["public"]["Tables"]["characters"]["Row"];
type LocationRow = Database["public"]["Tables"]["locations"]["Row"];
type PlotThreadRow = Database["public"]["Tables"]["plot_threads"]["Row"];
type TimelineEventRow = Database["public"]["Tables"]["timeline_events"]["Row"];
type ChapterRow = Database["public"]["Tables"]["chapters"]["Row"];
type SceneRow = Database["public"]["Tables"]["scenes"]["Row"];
type BookRow = Database["public"]["Tables"]["books"]["Row"];
type CharacterMatchRow = Pick<CharacterRow, "id" | "name" | "aliases">;
type LocationMatchRow = Pick<LocationRow, "id" | "name">;
type TimelineEventMatchRow = Pick<TimelineEventRow, "id" | "title">;
type SceneCharacterLinkRow = Pick<
  SceneRow,
  "id" | "title" | "book_id" | "chapter_id" | "character_ids"
>;
type SceneChapterLinkRow = Pick<
  SceneRow,
  "id" | "title" | "book_id" | "chapter_id"
>;

type ApplyResult = {
  entityId: string;
  entityType: string;
  entityLabel: string;
};

export async function POST(request: Request, context: RouteContext) {
  const { aiSessionId } = await context.params;
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { error: "Sign in before applying a manuscript import proposal." },
      { status: 401 }
    );
  }

  const capabilityErrorResponse = await enforceProfileAiCapability(
    supabase,
    user.id,
    "organizational"
  );

  if (capabilityErrorResponse) {
    return capabilityErrorResponse;
  }

  let input: ApplyInput;

  try {
    input = normalizeApplyInput(await request.json());
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Invalid manuscript import apply request.",
      },
      { status: 400 }
    );
  }

  const { data: aiSession, error: aiSessionError } = await supabase
    .from("ai_sessions")
    .select("id, project_id, session_type, workflow_state, linked_entity_ids, linked_entity_types")
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

  const proposal = workflowState.proposals[input.proposalType].find(
    (entry) => entry.proposalId === input.proposalId
  );

  if (!proposal) {
    return NextResponse.json({ error: "Proposal not found." }, { status: 404 });
  }

  const guardReason = getProposalApplyGuardReason({
    proposalType: input.proposalType,
    proposal,
  });

  if (guardReason) {
    return NextResponse.json({ error: guardReason }, { status: 400 });
  }

  try {
    const applyResult = await applyProposal({
      supabase,
      uid: user.id,
      projectId: aiSession.project_id,
      workflowState,
      proposalType: input.proposalType,
      proposal,
    });

    const nextWorkflowState = markManuscriptImportProposalApplied(
      workflowState,
      input.proposalType,
      input.proposalId,
      {
        entityType: applyResult.entityType,
        recordId: applyResult.entityId,
        recordLabel: applyResult.entityLabel,
        matchReason:
          proposal.review.suggestedAction === "create"
            ? `Applied new ${formatEntityLabel(applyResult.entityType)}`
            : `Applied to existing ${formatEntityLabel(applyResult.entityType)}`,
        score: proposal.review.matchedRecord?.score ?? null,
      }
    );
    const linkedEntityIds = uniqueStrings([
      ...(aiSession.linked_entity_ids ?? []),
      applyResult.entityId,
    ]);
    const linkedEntityTypes = uniqueStrings([
      ...(aiSession.linked_entity_types ?? []),
      applyResult.entityType,
    ]);

    const { error: updateError } = await supabase
      .from("ai_sessions")
      .update({
        workflow_state: nextWorkflowState as Json,
        linked_entity_ids: linkedEntityIds,
        linked_entity_types: linkedEntityTypes,
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
      appliedRecord: {
        id: applyResult.entityId,
        label: applyResult.entityLabel,
        entityType: applyResult.entityType,
        action: proposal.review.suggestedAction,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to apply this manuscript import proposal.",
      },
      { status: 500 }
    );
  }
}

async function applyProposal({
  supabase,
  uid,
  projectId,
  workflowState,
  proposalType,
  proposal,
}: {
  supabase: Awaited<ReturnType<typeof getSupabaseServerClient>>;
  uid: string;
  projectId: string;
  workflowState: ManuscriptImportWorkflowState;
  proposalType: ManuscriptImportProposalType;
  proposal: ManuscriptImportProposalByType<ManuscriptImportProposalType>;
}): Promise<ApplyResult> {
  switch (proposalType) {
    case "characters":
      return applyCharacterProposal({
        supabase,
        uid,
        projectId,
        workflowState,
        proposal: proposal as ManuscriptImportCharacterProposal,
      });
    case "locations":
      return applyLocationProposal({
        supabase,
        uid,
        projectId,
        workflowState,
        proposal: proposal as ManuscriptImportLocationProposal,
      });
    case "plotThreads":
      return applyPlotThreadProposal({
        supabase,
        uid,
        projectId,
        workflowState,
        proposal: proposal as ManuscriptImportPlotThreadProposal,
      });
    case "timelineEvents":
      return applyTimelineEventProposal({
        supabase,
        uid,
        projectId,
        workflowState,
        proposal: proposal as ManuscriptImportTimelineEventProposal,
      });
    case "chapters":
      return applyChapterProposal({
        supabase,
        uid,
        projectId,
        workflowState,
        proposal: proposal as ManuscriptImportChapterProposal,
      });
    case "scenes":
      return applySceneProposal({
        supabase,
        uid,
        projectId,
        workflowState,
        proposal: proposal as ManuscriptImportSceneProposal,
      });
  }
}

async function loadExistingIds(
  supabase: Awaited<ReturnType<typeof getSupabaseServerClient>>,
  uid: string,
  projectId: string,
  table:
    | "characters"
    | "locations"
    | "plot_threads"
    | "timeline_events"
    | "chapters"
    | "scenes"
) {
  const { data, error } = await supabase
    .from(table)
    .select("id")
    .eq("user_id", uid)
    .eq("project_id", projectId);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => row.id);
}

async function loadSceneRows<TScene>({
  supabase,
  uid,
  projectId,
  selectFields,
  bookIds,
}: {
  supabase: Awaited<ReturnType<typeof getSupabaseServerClient>>;
  uid: string;
  projectId: string;
  selectFields: string;
  bookIds: string[];
}) {
  let query = supabase
    .from("scenes")
    .select(selectFields)
    .eq("user_id", uid)
    .eq("project_id", projectId);

  if (bookIds.length > 0) {
    query = query.in("book_id", bookIds);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as TScene[];
}

async function loadChapterRows<TChapter>({
  supabase,
  uid,
  projectId,
  selectFields,
  bookIds,
}: {
  supabase: Awaited<ReturnType<typeof getSupabaseServerClient>>;
  uid: string;
  projectId: string;
  selectFields: string;
  bookIds: string[];
}) {
  let query = supabase
    .from("chapters")
    .select(selectFields)
    .eq("user_id", uid)
    .eq("project_id", projectId);

  if (bookIds.length > 0) {
    query = query.in("book_id", bookIds);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as TChapter[];
}

async function loadBookLinkRow({
  supabase,
  uid,
  projectId,
  bookId,
}: {
  supabase: Awaited<ReturnType<typeof getSupabaseServerClient>>;
  uid: string;
  projectId: string;
  bookId: string;
}) {
  const { data, error } = await supabase
    .from("books")
    .select("id, chapter_ids, scene_ids, timeline_event_ids")
    .eq("user_id", uid)
    .eq("project_id", projectId)
    .eq("id", bookId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? null) as Pick<
    BookRow,
    "id" | "chapter_ids" | "scene_ids" | "timeline_event_ids"
  > | null;
}

function buildNormalizedCharacterValues({
  proposal,
  targetCharacter,
}: {
  proposal: ManuscriptImportCharacterProposal;
  targetCharacter: CharacterRow | null;
}): NormalizedCharacterFormValues {
  return {
    name: proposal.name.trim(),
    summary: proposal.summary.trim(),
    description: buildEvidenceDescription(
      proposal.evidence,
      targetCharacter?.description ?? "",
      "Manuscript import evidence"
    ),
    status: targetCharacter?.status === "archived" ? "archived" : "active",
    characterType: coerceCharacterType(proposal.characterType),
    importanceLevel: coerceCharacterImportanceLevel(proposal.importanceLevel),
    aliases: targetCharacter?.aliases ?? [],
    occupation: targetCharacter?.occupation ?? [],
    traits: uniqueStrings([...(targetCharacter?.traits ?? []), ...proposal.traits]),
    flaws: targetCharacter?.flaws ?? [],
    motivations: uniqueStrings([
      ...(targetCharacter?.motivations ?? []),
      ...proposal.motivations,
    ]),
    publicWikiSummary: proposal.summary.trim() || targetCharacter?.public_wiki_summary || "",
    birthYear: targetCharacter?.birth_year ?? null,
    homeLocationId: targetCharacter?.home_location_id ?? null,
  };
}

function buildNormalizedLocationValues({
  proposal,
  targetLocation,
}: {
  proposal: ManuscriptImportLocationProposal;
  targetLocation: LocationRow | null;
}): NormalizedLocationFormValues {
  return {
    name: proposal.name.trim(),
    summary: proposal.summary.trim(),
    description: buildEvidenceDescription(
      proposal.evidence,
      targetLocation?.description ?? "",
      "Manuscript import evidence"
    ),
    status: targetLocation?.status === "archived" ? "archived" : "active",
    locationType: proposal.locationType.trim() || targetLocation?.location_type || "settlement",
    parentLocationId: targetLocation?.parent_location_id ?? null,
    climate: targetLocation?.climate ?? "",
    geography: targetLocation?.geography ?? "",
    architecture: targetLocation?.architecture ?? "",
    customs: targetLocation?.customs ?? [],
    dangerLevel: targetLocation?.danger_level || "moderate",
    notableFeatures: uniqueStrings([
      ...(targetLocation?.notable_features ?? []),
      ...proposal.notableFeatures,
    ]),
    publicWikiSummary: proposal.summary.trim() || targetLocation?.public_wiki_summary || "",
  };
}

async function applyCharacterProposal({
  supabase,
  uid,
  projectId,
  workflowState,
  proposal,
}: {
  supabase: Awaited<ReturnType<typeof getSupabaseServerClient>>;
  uid: string;
  projectId: string;
  workflowState: ManuscriptImportWorkflowState;
  proposal: ManuscriptImportCharacterProposal;
}): Promise<ApplyResult> {
  const targetCharacterId = getTargetRecordId(proposal.review.matchedRecord, "characters");
  const mappedBookIds = resolveMappedBookIds(workflowState, proposal.sourceBookIds);
  const [targetCharacterResult, scenes, existingIds] = await Promise.all([
    targetCharacterId
      ? supabase
          .from("characters")
          .select("*")
          .eq("user_id", uid)
          .eq("project_id", projectId)
          .eq("id", targetCharacterId)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    proposal.relatedSceneTitles.length > 0
      ? loadSceneRows<SceneCharacterLinkRow>({
          supabase,
          uid,
          projectId,
          selectFields: "id, title, book_id, chapter_id, character_ids",
          bookIds: mappedBookIds,
        })
      : Promise.resolve([]),
    proposal.review.suggestedAction === "create"
      ? loadExistingIds(supabase, uid, projectId, "characters")
      : Promise.resolve([]),
  ]);
  const targetCharacter = targetCharacterResult.error
    ? (() => {
        throw new Error(targetCharacterResult.error.message);
      })()
    : ((targetCharacterResult.data ?? null) as CharacterRow | null);
  const matchedScenes = resolveMatchedRows(
    proposal.relatedSceneTitles,
    scenes,
    (scene) => createMatchRecord("scenes", scene.id, scene.title)
  );
  const relatedSceneIds = matchedScenes.map((scene) => scene.id);
  const relatedChapterIds = uniqueStrings(
    matchedScenes.map((scene) => scene.chapter_id).filter(isNonEmptyString)
  );
  const normalizedValues = buildNormalizedCharacterValues({ proposal, targetCharacter });
  const now = new Date().toISOString();
  let appliedCharacterId = targetCharacter?.id ?? "";

  if (!normalizedValues.name) {
    throw new Error("Character name is required.");
  }

  if (proposal.review.suggestedAction === "create") {
    appliedCharacterId = getAvailablePrefixedId(
      "char",
      normalizedValues.name,
      existingIds,
      slugifyCharacterName
    );
    const characterDocument = buildCharacterDocument({
      id: appliedCharacterId,
      projectId,
      values: normalizedValues,
    });
    const { error } = await supabase.from("characters").insert({
      user_id: uid,
      project_id: projectId,
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
      book_ids: mappedBookIds,
      chapter_ids: relatedChapterIds,
      scene_ids: relatedSceneIds,
      important_items: characterDocument.importantItems,
      public_wiki_summary: characterDocument.publicWikiSummary,
      created_at: now,
      updated_at: now,
    });

    if (error) {
      throw new Error(error.message);
    }
  } else {
    if (!targetCharacter) {
      throw new Error("Matched character not found.");
    }

    const { error } = await supabase
      .from("characters")
      .update({
        name: normalizedValues.name,
        slug: slugifyCharacterName(normalizedValues.name),
        summary: normalizedValues.summary,
        description: normalizedValues.description,
        status: normalizedValues.status,
        is_archived: normalizedValues.status === "archived",
        aliases: uniqueStrings([
          ...(targetCharacter.aliases ?? []),
          ...normalizedValues.aliases,
          targetCharacter.name !== normalizedValues.name ? normalizedValues.name : "",
        ]),
        character_type: normalizedValues.characterType,
        importance_level: normalizedValues.importanceLevel,
        birth_year: normalizedValues.birthYear,
        home_location_id: normalizedValues.homeLocationId,
        current_location_id:
          normalizedValues.homeLocationId ?? targetCharacter.current_location_id,
        occupation: uniqueStrings([...(targetCharacter.occupation ?? []), ...normalizedValues.occupation]),
        traits: uniqueStrings([...(targetCharacter.traits ?? []), ...normalizedValues.traits]),
        motivations: uniqueStrings([
          ...(targetCharacter.motivations ?? []),
          ...normalizedValues.motivations,
        ]),
        book_ids: uniqueStrings([...(targetCharacter.book_ids ?? []), ...mappedBookIds]),
        chapter_ids: uniqueStrings([...(targetCharacter.chapter_ids ?? []), ...relatedChapterIds]),
        scene_ids: uniqueStrings([...(targetCharacter.scene_ids ?? []), ...relatedSceneIds]),
        public_wiki_summary:
          normalizedValues.publicWikiSummary || targetCharacter.public_wiki_summary || "",
        updated_at: now,
      })
      .eq("user_id", uid)
      .eq("project_id", projectId)
      .eq("id", targetCharacter.id);

    if (error) {
      throw new Error(error.message);
    }
  }

  return {
    entityId: appliedCharacterId,
    entityType: "characters",
    entityLabel: normalizedValues.name,
  };
}

async function applyLocationProposal({
  supabase,
  uid,
  projectId,
  workflowState,
  proposal,
}: {
  supabase: Awaited<ReturnType<typeof getSupabaseServerClient>>;
  uid: string;
  projectId: string;
  workflowState: ManuscriptImportWorkflowState;
  proposal: ManuscriptImportLocationProposal;
}): Promise<ApplyResult> {
  const targetLocationId = getTargetRecordId(proposal.review.matchedRecord, "locations");
  const mappedBookIds = resolveMappedBookIds(workflowState, proposal.sourceBookIds);
  const [targetLocationResult, existingIds] = await Promise.all([
    targetLocationId
      ? supabase
          .from("locations")
          .select("*")
          .eq("user_id", uid)
          .eq("project_id", projectId)
          .eq("id", targetLocationId)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    proposal.review.suggestedAction === "create"
      ? loadExistingIds(supabase, uid, projectId, "locations")
      : Promise.resolve([]),
  ]);
  const targetLocation = targetLocationResult.error
    ? (() => {
        throw new Error(targetLocationResult.error.message);
      })()
    : ((targetLocationResult.data ?? null) as LocationRow | null);
  const normalizedValues = buildNormalizedLocationValues({ proposal, targetLocation });
  const now = new Date().toISOString();
  let appliedLocationId = targetLocation?.id ?? "";

  if (!normalizedValues.name) {
    throw new Error("Location name is required.");
  }

  if (proposal.review.suggestedAction === "create") {
    appliedLocationId = getAvailablePrefixedId(
      "location",
      normalizedValues.name,
      existingIds,
      slugifyLocationName
    );
    const locationDocument = buildLocationDocument({
      id: appliedLocationId,
      projectId,
      values: normalizedValues,
    });
    const { error } = await supabase.from("locations").insert({
      user_id: uid,
      project_id: projectId,
      id: appliedLocationId,
      name: locationDocument.name,
      slug: locationDocument.slug,
      summary: locationDocument.summary,
      description: locationDocument.description,
      status: locationDocument.status,
      tags: locationDocument.tags,
      is_archived: locationDocument.isArchived,
      canon_level: locationDocument.canonLevel,
      confidence: locationDocument.confidence,
      location_type: locationDocument.locationType,
      parent_location_id: locationDocument.parentLocationId,
      child_location_ids: locationDocument.childLocationIds,
      era_ids: locationDocument.eraIds,
      culture_ids: locationDocument.cultureIds,
      faction_ids: locationDocument.factionIds,
      population_notes: locationDocument.populationNotes,
      climate: locationDocument.climate,
      geography: locationDocument.geography,
      architecture: locationDocument.architecture,
      economy: locationDocument.economy,
      customs: locationDocument.customs,
      danger_level: locationDocument.dangerLevel,
      notable_features: locationDocument.notableFeatures,
      timeline_event_ids: locationDocument.timelineEventIds,
      book_ids: mappedBookIds,
      character_ids: locationDocument.characterIds,
      public_wiki_summary: locationDocument.publicWikiSummary,
      created_at: now,
      updated_at: now,
    });

    if (error) {
      throw new Error(error.message);
    }
  } else {
    if (!targetLocation) {
      throw new Error("Matched location not found.");
    }

    const { error } = await supabase
      .from("locations")
      .update({
        name: normalizedValues.name,
        slug: slugifyLocationName(normalizedValues.name),
        summary: normalizedValues.summary,
        description: normalizedValues.description,
        status: normalizedValues.status,
        is_archived: normalizedValues.status === "archived",
        location_type: normalizedValues.locationType,
        customs: uniqueStrings([...(targetLocation.customs ?? []), ...normalizedValues.customs]),
        notable_features: uniqueStrings([
          ...(targetLocation.notable_features ?? []),
          ...normalizedValues.notableFeatures,
        ]),
        book_ids: uniqueStrings([...(targetLocation.book_ids ?? []), ...mappedBookIds]),
        public_wiki_summary:
          normalizedValues.publicWikiSummary || targetLocation.public_wiki_summary || "",
        updated_at: now,
      })
      .eq("user_id", uid)
      .eq("project_id", projectId)
      .eq("id", targetLocation.id);

    if (error) {
      throw new Error(error.message);
    }
  }

  return {
    entityId: appliedLocationId,
    entityType: "locations",
    entityLabel: normalizedValues.name,
  };
}

function buildNormalizedPlotThreadValues({
  proposal,
  targetPlotThread,
  mappedBookIds,
  matchedCharacterIds,
  matchedChapterIds,
}: {
  proposal: ManuscriptImportPlotThreadProposal;
  targetPlotThread: PlotThreadRow | null;
  mappedBookIds: string[];
  matchedCharacterIds: string[];
  matchedChapterIds: string[];
}): NormalizedPlotThreadFormValues {
  return {
    title: proposal.title.trim(),
    summary: proposal.summary.trim(),
    description: buildEvidenceDescription(
      proposal.evidence,
      targetPlotThread?.description ?? "",
      "Manuscript import evidence"
    ),
    status: targetPlotThread?.status === "archived" ? "archived" : "active",
    threadType: coercePlotThreadType(proposal.threadType),
    introducedInBookId:
      targetPlotThread?.introduced_in_book_id ?? mappedBookIds[0] ?? null,
    resolvedInBookId: targetPlotThread?.resolved_in_book_id ?? null,
    characterIds: uniqueStrings([
      ...(targetPlotThread?.character_ids ?? []),
      ...matchedCharacterIds,
    ]),
    timelineEventIds: targetPlotThread?.timeline_event_ids ?? [],
    bookIds: uniqueStrings([...(targetPlotThread?.book_ids ?? []), ...mappedBookIds]),
    chapterIds: uniqueStrings([
      ...(targetPlotThread?.chapter_ids ?? []),
      ...matchedChapterIds,
    ]),
    setupNotes: uniqueStrings([...(targetPlotThread?.setup_notes ?? []), ...proposal.setupNotes]),
    payoffNotes: uniqueStrings([
      ...(targetPlotThread?.payoff_notes ?? []),
      ...proposal.payoffNotes,
    ]),
    openQuestions: targetPlotThread?.open_questions ?? [],
    publicWikiSummary: proposal.summary.trim() || targetPlotThread?.public_wiki_summary || "",
  };
}

function buildNormalizedTimelineEventValues({
  proposal,
  targetTimelineEvent,
  mappedBookIds,
  linkedCharacterIds,
  linkedChapterIds,
  linkedSceneIds,
  linkedLocationIds,
}: {
  proposal: ManuscriptImportTimelineEventProposal;
  targetTimelineEvent: TimelineEventRow | null;
  mappedBookIds: string[];
  linkedCharacterIds: string[];
  linkedChapterIds: string[];
  linkedSceneIds: string[];
  linkedLocationIds: string[];
}): NormalizedTimelineEventFormValues {
  const placementLinks = derivePlacementLinks(
    proposal.placementSuggestion.placement,
    proposal.placementSuggestion.referenceEventIds
  );

  return {
    title: proposal.title.trim(),
    summary: proposal.summary.trim(),
    description: buildEvidenceDescription(
      proposal.evidence,
      targetTimelineEvent?.description ?? "",
      "Manuscript import evidence"
    ),
    status: targetTimelineEvent?.status === "archived" ? "archived" : "active",
    eventType: coerceTimelineEventType(proposal.eventType),
    yearStart:
      proposal.placementSuggestion.yearStart ?? targetTimelineEvent?.year_start ?? null,
    monthStart:
      proposal.placementSuggestion.yearStart !== null
        ? null
        : targetTimelineEvent?.month_start ?? null,
    dayStart:
      proposal.placementSuggestion.yearStart !== null
        ? null
        : targetTimelineEvent?.day_start ?? null,
    yearEnd: proposal.placementSuggestion.yearEnd ?? targetTimelineEvent?.year_end ?? null,
    monthEnd:
      proposal.placementSuggestion.yearEnd !== null
        ? null
        : targetTimelineEvent?.month_end ?? null,
    dayEnd:
      proposal.placementSuggestion.yearEnd !== null
        ? null
        : targetTimelineEvent?.day_end ?? null,
    chronologyOrder: targetTimelineEvent?.chronology_order ?? null,
    timeOfDayLabel: targetTimelineEvent?.time_of_day_label ?? "",
    displayDateLabel:
      proposal.placementSuggestion.displayDateLabel.trim() ||
      proposal.dateLabel.trim() ||
      targetTimelineEvent?.display_date_label ||
      "",
    eraId: targetTimelineEvent?.era_id ?? null,
    bookIds: uniqueStrings([...(targetTimelineEvent?.book_ids ?? []), ...mappedBookIds]),
    chapterIds: uniqueStrings([...(targetTimelineEvent?.chapter_ids ?? []), ...linkedChapterIds]),
    sceneIds: uniqueStrings([...(targetTimelineEvent?.scene_ids ?? []), ...linkedSceneIds]),
    characterIds: uniqueStrings([
      ...(targetTimelineEvent?.character_ids ?? []),
      ...linkedCharacterIds,
    ]),
    locationIds: uniqueStrings([
      ...(targetTimelineEvent?.location_ids ?? []),
      ...linkedLocationIds,
    ]),
    factionIds: targetTimelineEvent?.faction_ids ?? [],
    cultureIds: targetTimelineEvent?.culture_ids ?? [],
    technologyIds: targetTimelineEvent?.technology_ids ?? [],
    religionIds: targetTimelineEvent?.religion_ids ?? [],
    plotThreadIds: targetTimelineEvent?.plot_thread_ids ?? [],
    themeIds: targetTimelineEvent?.theme_ids ?? [],
    causes: targetTimelineEvent?.causes ?? [],
    consequences: targetTimelineEvent?.consequences ?? [],
    predecessorEventIds: uniqueStrings([
      ...(targetTimelineEvent?.predecessor_event_ids ?? []),
      ...placementLinks.predecessorEventIds,
    ]),
    successorEventIds: uniqueStrings([
      ...(targetTimelineEvent?.successor_event_ids ?? []),
      ...placementLinks.successorEventIds,
    ]),
    publicWikiSummary:
      proposal.summary.trim() || targetTimelineEvent?.public_wiki_summary || "",
  };
}

async function applyPlotThreadProposal({
  supabase,
  uid,
  projectId,
  workflowState,
  proposal,
}: {
  supabase: Awaited<ReturnType<typeof getSupabaseServerClient>>;
  uid: string;
  projectId: string;
  workflowState: ManuscriptImportWorkflowState;
  proposal: ManuscriptImportPlotThreadProposal;
}): Promise<ApplyResult> {
  const targetPlotThreadId = getTargetRecordId(proposal.review.matchedRecord, "plot_threads");
  const mappedBookIds = resolveMappedBookIds(workflowState, proposal.sourceBookIds);
  const [targetPlotThreadResult, charactersResult, chapters, scenes, existingIds] =
    await Promise.all([
      targetPlotThreadId
        ? supabase
            .from("plot_threads")
            .select("*")
            .eq("user_id", uid)
            .eq("project_id", projectId)
            .eq("id", targetPlotThreadId)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      proposal.linkedCharacterNames.length > 0
        ? supabase
            .from("characters")
            .select("id, name, aliases")
            .eq("user_id", uid)
            .eq("project_id", projectId)
        : Promise.resolve({ data: [], error: null }),
      proposal.linkedChapterTitles.length > 0
        ? loadChapterRows<Array<Pick<ChapterRow, "id" | "title" | "book_id">>[number]>({
            supabase,
            uid,
            projectId,
            selectFields: "id, title, book_id",
            bookIds: mappedBookIds,
          })
        : Promise.resolve([]),
      proposal.linkedSceneTitles.length > 0
        ? loadSceneRows<Array<Pick<SceneRow, "id" | "title" | "book_id">>[number]>({
            supabase,
            uid,
            projectId,
            selectFields: "id, title, book_id",
            bookIds: mappedBookIds,
          })
        : Promise.resolve([]),
      proposal.review.suggestedAction === "create"
        ? loadExistingIds(supabase, uid, projectId, "plot_threads")
        : Promise.resolve([]),
    ]);
  const targetPlotThread = targetPlotThreadResult.error
    ? (() => {
        throw new Error(targetPlotThreadResult.error.message);
      })()
    : ((targetPlotThreadResult.data ?? null) as PlotThreadRow | null);
  const characterRows = charactersResult.error
    ? (() => {
        throw new Error(charactersResult.error.message);
      })()
    : ((charactersResult.data ?? []) as CharacterMatchRow[]);
  const matchedCharacterIds = resolveMatchedIds(
    proposal.linkedCharacterNames,
    characterRows,
    (character) =>
      createMatchRecord("characters", character.id, character.name, character.aliases ?? [])
  );
  const matchedChapterIds = resolveMatchedIds(
    proposal.linkedChapterTitles,
    chapters,
    (chapter) => createMatchRecord("chapters", chapter.id, chapter.title)
  );
  const matchedSceneIds = resolveMatchedIds(
    proposal.linkedSceneTitles,
    scenes,
    (scene) => createMatchRecord("scenes", scene.id, scene.title)
  );
  const normalizedValues = buildNormalizedPlotThreadValues({
    proposal,
    targetPlotThread,
    mappedBookIds,
    matchedCharacterIds,
    matchedChapterIds,
  });
  const now = new Date().toISOString();
  let appliedPlotThreadId = targetPlotThread?.id ?? "";

  if (!normalizedValues.title) {
    throw new Error("Plot thread title is required.");
  }

  if (proposal.review.suggestedAction === "create") {
    appliedPlotThreadId = getAvailablePrefixedId(
      "plot_thread",
      normalizedValues.title,
      existingIds,
      slugifyPlotThreadTitle
    );
    const plotThreadDocument = buildPlotThreadDocument({
      id: appliedPlotThreadId,
      projectId,
      values: normalizedValues,
    });
    const { error } = await supabase.from("plot_threads").insert({
      user_id: uid,
      project_id: projectId,
      id: appliedPlotThreadId,
      title: plotThreadDocument.title,
      slug: plotThreadDocument.slug,
      summary: plotThreadDocument.summary,
      description: plotThreadDocument.description,
      status: plotThreadDocument.status,
      tags: plotThreadDocument.tags,
      is_archived: plotThreadDocument.isArchived,
      canon_level: plotThreadDocument.canonLevel,
      confidence: plotThreadDocument.confidence,
      thread_type: plotThreadDocument.threadType,
      introduced_in_book_id: plotThreadDocument.introducedInBookId,
      resolved_in_book_id: plotThreadDocument.resolvedInBookId,
      character_ids: plotThreadDocument.characterIds,
      timeline_event_ids: plotThreadDocument.timelineEventIds,
      book_ids: plotThreadDocument.bookIds,
      chapter_ids: plotThreadDocument.chapterIds,
      scene_ids: matchedSceneIds,
      theme_ids: plotThreadDocument.themeIds,
      note_ids: plotThreadDocument.noteIds,
      setup_notes: plotThreadDocument.setupNotes,
      payoff_notes: plotThreadDocument.payoffNotes,
      open_questions: plotThreadDocument.openQuestions,
      public_wiki_summary: plotThreadDocument.publicWikiSummary,
      created_at: now,
      updated_at: now,
    });

    if (error) {
      throw new Error(error.message);
    }
  } else {
    if (!targetPlotThread) {
      throw new Error("Matched plot thread not found.");
    }

    const { error } = await supabase
      .from("plot_threads")
      .update({
        title: normalizedValues.title,
        slug: slugifyPlotThreadTitle(normalizedValues.title),
        summary: normalizedValues.summary,
        description: normalizedValues.description,
        status: normalizedValues.status,
        is_archived: normalizedValues.status === "archived",
        thread_type: normalizedValues.threadType,
        introduced_in_book_id:
          normalizedValues.introducedInBookId ?? targetPlotThread.introduced_in_book_id,
        resolved_in_book_id:
          normalizedValues.resolvedInBookId ?? targetPlotThread.resolved_in_book_id,
        character_ids: uniqueStrings([
          ...(targetPlotThread.character_ids ?? []),
          ...matchedCharacterIds,
        ]),
        book_ids: uniqueStrings([...(targetPlotThread.book_ids ?? []), ...mappedBookIds]),
        chapter_ids: uniqueStrings([...(targetPlotThread.chapter_ids ?? []), ...matchedChapterIds]),
        scene_ids: uniqueStrings([...(targetPlotThread.scene_ids ?? []), ...matchedSceneIds]),
        setup_notes: uniqueStrings([...(targetPlotThread.setup_notes ?? []), ...normalizedValues.setupNotes]),
        payoff_notes: uniqueStrings([...(targetPlotThread.payoff_notes ?? []), ...normalizedValues.payoffNotes]),
        public_wiki_summary:
          normalizedValues.publicWikiSummary || targetPlotThread.public_wiki_summary || "",
        updated_at: now,
      })
      .eq("user_id", uid)
      .eq("project_id", projectId)
      .eq("id", targetPlotThread.id);

    if (error) {
      throw new Error(error.message);
    }
  }

  return {
    entityId: appliedPlotThreadId,
    entityType: "plot_threads",
    entityLabel: normalizedValues.title,
  };
}

async function applyTimelineEventProposal({
  supabase,
  uid,
  projectId,
  workflowState,
  proposal,
}: {
  supabase: Awaited<ReturnType<typeof getSupabaseServerClient>>;
  uid: string;
  projectId: string;
  workflowState: ManuscriptImportWorkflowState;
  proposal: ManuscriptImportTimelineEventProposal;
}): Promise<ApplyResult> {
  const targetTimelineEventId = getTargetRecordId(
    proposal.review.matchedRecord,
    "timeline_events"
  );
  const mappedBookIds = resolveMappedBookIds(workflowState, proposal.sourceBookIds);
  const [targetTimelineEventResult, charactersResult, chapters, scenes, locationsResult, existingIds] =
    await Promise.all([
      targetTimelineEventId
        ? supabase
            .from("timeline_events")
            .select("*")
            .eq("user_id", uid)
            .eq("project_id", projectId)
            .eq("id", targetTimelineEventId)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      proposal.linkedCharacterNames.length > 0
        ? supabase
            .from("characters")
            .select("id, name, aliases")
            .eq("user_id", uid)
            .eq("project_id", projectId)
        : Promise.resolve({ data: [], error: null }),
      proposal.linkedChapterTitles.length > 0
        ? loadChapterRows<Array<Pick<ChapterRow, "id" | "title" | "book_id">>[number]>({
            supabase,
            uid,
            projectId,
            selectFields: "id, title, book_id",
            bookIds: mappedBookIds,
          })
        : Promise.resolve([]),
      proposal.linkedSceneTitles.length > 0
        ? loadSceneRows<Array<Pick<SceneRow, "id" | "title" | "book_id">>[number]>({
            supabase,
            uid,
            projectId,
            selectFields: "id, title, book_id",
            bookIds: mappedBookIds,
          })
        : Promise.resolve([]),
      proposal.linkedLocationNames.length > 0
        ? supabase
            .from("locations")
            .select("id, name")
            .eq("user_id", uid)
            .eq("project_id", projectId)
        : Promise.resolve({ data: [], error: null }),
      proposal.review.suggestedAction === "create"
        ? loadExistingIds(supabase, uid, projectId, "timeline_events")
        : Promise.resolve([]),
    ]);
  const targetTimelineEvent = targetTimelineEventResult.error
    ? (() => {
        throw new Error(targetTimelineEventResult.error.message);
      })()
    : ((targetTimelineEventResult.data ?? null) as TimelineEventRow | null);
  const characterRows = charactersResult.error
    ? (() => {
        throw new Error(charactersResult.error.message);
      })()
    : ((charactersResult.data ?? []) as CharacterMatchRow[]);
  const locationRows = locationsResult.error
    ? (() => {
        throw new Error(locationsResult.error.message);
      })()
    : ((locationsResult.data ?? []) as LocationMatchRow[]);
  const normalizedValues = buildNormalizedTimelineEventValues({
    proposal,
    targetTimelineEvent,
    mappedBookIds,
    linkedCharacterIds: resolveMatchedIds(
      proposal.linkedCharacterNames,
      characterRows,
      (character) =>
        createMatchRecord("characters", character.id, character.name, character.aliases ?? [])
    ),
    linkedChapterIds: resolveMatchedIds(
      proposal.linkedChapterTitles,
      chapters,
      (chapter) => createMatchRecord("chapters", chapter.id, chapter.title)
    ),
    linkedSceneIds: resolveMatchedIds(
      proposal.linkedSceneTitles,
      scenes,
      (scene) => createMatchRecord("scenes", scene.id, scene.title)
    ),
    linkedLocationIds: resolveMatchedIds(
      proposal.linkedLocationNames,
      locationRows,
      (location) => createMatchRecord("locations", location.id, location.name)
    ),
  });
  const validation = validateNormalizedTimelineEventFormValues(normalizedValues, {
    currentTimelineEventId: targetTimelineEvent?.id ?? null,
  });
  const now = new Date().toISOString();
  let appliedTimelineEventId = targetTimelineEvent?.id ?? "";

  if (!normalizedValues.title) {
    throw new Error("Timeline event title is required.");
  }

  if (validation.errors.length > 0) {
    throw new Error(validation.errors[0]);
  }

  if (proposal.review.suggestedAction === "create") {
    appliedTimelineEventId = getAvailablePrefixedId(
      "event",
      normalizedValues.title,
      existingIds,
      slugifyTimelineEventTitle
    );
    const timelineEventDocument = buildTimelineEventDocument({
      id: appliedTimelineEventId,
      projectId,
      values: normalizedValues,
    });
    const { error } = await supabase.from("timeline_events").insert({
      user_id: uid,
      project_id: projectId,
      id: appliedTimelineEventId,
      title: timelineEventDocument.title,
      slug: timelineEventDocument.slug,
      summary: timelineEventDocument.summary,
      description: timelineEventDocument.description,
      status: timelineEventDocument.status,
      tags: timelineEventDocument.tags,
      is_archived: timelineEventDocument.isArchived,
      canon_level: timelineEventDocument.canonLevel,
      confidence: timelineEventDocument.confidence,
      event_type: timelineEventDocument.eventType,
      year_start: timelineEventDocument.yearStart,
      month_start: timelineEventDocument.monthStart,
      day_start: timelineEventDocument.dayStart,
      year_end: timelineEventDocument.yearEnd,
      month_end: timelineEventDocument.monthEnd,
      day_end: timelineEventDocument.dayEnd,
      chronology_order: timelineEventDocument.chronologyOrder,
      time_of_day_label: timelineEventDocument.timeOfDayLabel,
      display_date_label: timelineEventDocument.displayDateLabel,
      era_id: timelineEventDocument.eraId,
      book_ids: timelineEventDocument.bookIds,
      chapter_ids: timelineEventDocument.chapterIds,
      scene_ids: timelineEventDocument.sceneIds,
      character_ids: timelineEventDocument.characterIds,
      location_ids: timelineEventDocument.locationIds,
      faction_ids: timelineEventDocument.factionIds,
      culture_ids: timelineEventDocument.cultureIds,
      technology_ids: timelineEventDocument.technologyIds,
      religion_ids: timelineEventDocument.religionIds,
      plot_thread_ids: timelineEventDocument.plotThreadIds,
      theme_ids: timelineEventDocument.themeIds,
      causes: timelineEventDocument.causes,
      consequences: timelineEventDocument.consequences,
      predecessor_event_ids: timelineEventDocument.predecessorEventIds,
      successor_event_ids: timelineEventDocument.successorEventIds,
      public_wiki_summary: timelineEventDocument.publicWikiSummary,
      created_at: now,
      updated_at: now,
    });

    if (error) {
      throw new Error(error.message);
    }
  } else {
    if (!targetTimelineEvent) {
      throw new Error("Matched timeline event not found.");
    }

    const { error } = await supabase
      .from("timeline_events")
      .update({
        title: normalizedValues.title,
        slug: slugifyTimelineEventTitle(normalizedValues.title),
        summary: normalizedValues.summary,
        description: normalizedValues.description,
        status: normalizedValues.status,
        is_archived: normalizedValues.status === "archived",
        event_type: normalizedValues.eventType,
        year_start: normalizedValues.yearStart,
        month_start: normalizedValues.monthStart,
        day_start: normalizedValues.dayStart,
        year_end: normalizedValues.yearEnd,
        month_end: normalizedValues.monthEnd,
        day_end: normalizedValues.dayEnd,
        chronology_order: normalizedValues.chronologyOrder,
        time_of_day_label: normalizedValues.timeOfDayLabel,
        display_date_label: normalizedValues.displayDateLabel,
        era_id: normalizedValues.eraId,
        book_ids: normalizedValues.bookIds,
        chapter_ids: normalizedValues.chapterIds,
        scene_ids: normalizedValues.sceneIds,
        character_ids: normalizedValues.characterIds,
        location_ids: normalizedValues.locationIds,
        faction_ids: normalizedValues.factionIds,
        culture_ids: normalizedValues.cultureIds,
        technology_ids: normalizedValues.technologyIds,
        religion_ids: normalizedValues.religionIds,
        plot_thread_ids: normalizedValues.plotThreadIds,
        theme_ids: normalizedValues.themeIds,
        causes: normalizedValues.causes,
        consequences: normalizedValues.consequences,
        predecessor_event_ids: normalizedValues.predecessorEventIds,
        successor_event_ids: normalizedValues.successorEventIds,
        public_wiki_summary:
          normalizedValues.publicWikiSummary || targetTimelineEvent.public_wiki_summary || "",
        updated_at: now,
      })
      .eq("user_id", uid)
      .eq("project_id", projectId)
      .eq("id", targetTimelineEvent.id);

    if (error) {
      throw new Error(error.message);
    }
  }

  return {
    entityId: appliedTimelineEventId,
    entityType: "timeline_events",
    entityLabel: normalizedValues.title,
  };
}

function buildNormalizedChapterValues({
  proposal,
  targetChapter,
  pointOfViewCharacterId,
  targetBookId,
}: {
  proposal: ManuscriptImportChapterProposal;
  targetChapter: ChapterRow | null;
  pointOfViewCharacterId: string | null;
  targetBookId: string;
}): NormalizedChapterFormValues {
  return {
    title: proposal.title.trim(),
    summary: proposal.summary.trim(),
    description: buildEvidenceDescription(
      proposal.evidence,
      targetChapter?.description ?? "",
      "Manuscript import evidence"
    ),
    status: coerceChapterStatus(targetChapter?.status ?? "outline"),
    bookId: targetBookId,
    chapterNumber:
      parseEstimatedChapterNumber(proposal.estimatedChapterNumber) ??
      targetChapter?.chapter_number ??
      null,
    purpose: proposal.purpose.trim(),
    pointOfViewCharacterId:
      pointOfViewCharacterId ?? targetChapter?.point_of_view_character_id ?? null,
  };
}

function buildNormalizedSceneValues({
  proposal,
  targetScene,
  pointOfViewCharacterId,
  targetBookId,
}: {
  proposal: ManuscriptImportSceneProposal;
  targetScene: SceneRow | null;
  pointOfViewCharacterId: string | null;
  targetBookId: string | null;
}): NormalizedSceneFormValues {
  return {
    title: proposal.title.trim(),
    summary: proposal.summary.trim(),
    description: buildEvidenceDescription(
      proposal.evidence,
      targetScene?.description ?? "",
      "Manuscript import evidence"
    ),
    status: coerceSceneStatus(targetScene?.status ?? "outline"),
    bookId: targetBookId ?? targetScene?.book_id ?? null,
    chapterId: targetScene?.chapter_id ?? null,
    sceneNumber: targetScene?.scene_number ?? null,
    sceneType: coerceSceneType(proposal.sceneType),
    pointOfViewCharacterId:
      pointOfViewCharacterId ?? targetScene?.point_of_view_character_id ?? null,
    goal: proposal.goal.trim(),
    conflict: proposal.conflict.trim(),
    outcome: proposal.outcome.trim(),
    textDraft: targetScene?.text_draft ?? "",
  };
}

async function applyChapterProposal({
  supabase,
  uid,
  projectId,
  workflowState,
  proposal,
}: {
  supabase: Awaited<ReturnType<typeof getSupabaseServerClient>>;
  uid: string;
  projectId: string;
  workflowState: ManuscriptImportWorkflowState;
  proposal: ManuscriptImportChapterProposal;
}): Promise<ApplyResult> {
  const targetChapterId = getTargetRecordId(proposal.review.matchedRecord, "chapters");
  const targetBookId =
    proposal.targetBookId ?? resolveMappedBookIds(workflowState, proposal.sourceBookIds)[0] ?? null;

  if (!targetBookId) {
    throw new Error("Map this imported book to a target book before applying chapter proposals.");
  }

  const [targetChapterResult, charactersResult, scenes, existingIds] = await Promise.all([
    targetChapterId
      ? supabase
          .from("chapters")
          .select("*")
          .eq("user_id", uid)
          .eq("project_id", projectId)
          .eq("id", targetChapterId)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    proposal.pointOfViewCharacterName.trim()
      ? supabase
          .from("characters")
          .select("id, name, aliases")
          .eq("user_id", uid)
          .eq("project_id", projectId)
      : Promise.resolve({ data: [], error: null }),
    proposal.sceneTitles.length > 0
      ? loadSceneRows<SceneChapterLinkRow>({
          supabase,
          uid,
          projectId,
          selectFields: "id, title, book_id, chapter_id",
          bookIds: [targetBookId],
        })
      : Promise.resolve([]),
    proposal.review.suggestedAction === "create"
      ? loadExistingIds(supabase, uid, projectId, "chapters")
      : Promise.resolve([]),
  ]);
  const targetChapter = targetChapterResult.error
    ? (() => {
        throw new Error(targetChapterResult.error.message);
      })()
    : ((targetChapterResult.data ?? null) as ChapterRow | null);
  const characterRows = charactersResult.error
    ? (() => {
        throw new Error(charactersResult.error.message);
      })()
    : ((charactersResult.data ?? []) as CharacterMatchRow[]);
  const pointOfViewCharacterId = resolveSingleMatchedId(
    proposal.pointOfViewCharacterName,
    characterRows,
    (character) =>
      createMatchRecord("characters", character.id, character.name, character.aliases ?? [])
  );
  const matchedScenes = resolveMatchedRows(
    proposal.sceneTitles,
    scenes,
    (scene) => createMatchRecord("scenes", scene.id, scene.title)
  );
  const normalizedValues = buildNormalizedChapterValues({
    proposal,
    targetChapter,
    pointOfViewCharacterId,
    targetBookId,
  });
  const now = new Date().toISOString();
  let appliedChapterId = targetChapter?.id ?? "";

  if (!normalizedValues.title) {
    throw new Error("Chapter title is required.");
  }

  if (proposal.review.suggestedAction === "create") {
    appliedChapterId = getAvailablePrefixedId(
      "chapter",
      normalizedValues.title,
      existingIds,
      slugifyChapterTitle
    );
    const chapterDocument = buildChapterDocument({
      id: appliedChapterId,
      projectId,
      values: normalizedValues,
    });
    const { error } = await supabase.from("chapters").insert({
      user_id: uid,
      project_id: projectId,
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
      character_ids: uniqueStrings([pointOfViewCharacterId ?? ""]),
      plot_thread_ids: chapterDocument.plotThreadIds,
      foreshadows: chapterDocument.foreshadows,
      payoffs: chapterDocument.payoffs,
      created_at: now,
      updated_at: now,
    });

    if (error) {
      throw new Error(error.message);
    }
  } else {
    if (!targetChapter) {
      throw new Error("Matched chapter not found.");
    }

    const { error } = await supabase
      .from("chapters")
      .update({
        title: normalizedValues.title,
        slug: slugifyChapterTitle(normalizedValues.title),
        summary: normalizedValues.summary,
        description: normalizedValues.description,
        status: normalizedValues.status,
        is_archived: normalizedValues.status === "archived",
        book_id: targetBookId,
        chapter_number: normalizedValues.chapterNumber,
        purpose: normalizedValues.purpose,
        point_of_view_character_id:
          normalizedValues.pointOfViewCharacterId ?? targetChapter.point_of_view_character_id,
        character_ids: uniqueStrings([
          ...(targetChapter.character_ids ?? []),
          normalizedValues.pointOfViewCharacterId ?? "",
        ]),
        updated_at: now,
      })
      .eq("user_id", uid)
      .eq("project_id", projectId)
      .eq("id", targetChapter.id);

    if (error) {
      throw new Error(error.message);
    }
  }

  const syncedSceneIds = await syncScenesToChapter({
    supabase,
    uid,
    projectId,
    chapterId: appliedChapterId,
    chapterBookId: targetBookId,
    matchedScenes,
  });
  const existingSceneIds = targetChapter?.scene_ids ?? [];
  const { error: chapterSceneError } = await supabase
    .from("chapters")
    .update({
      scene_ids: uniqueStrings([...existingSceneIds, ...syncedSceneIds]),
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", uid)
    .eq("project_id", projectId)
    .eq("id", appliedChapterId);

  if (chapterSceneError) {
    throw new Error(chapterSceneError.message);
  }

  await syncChapterIntoBook({ supabase, uid, projectId, bookId: targetBookId, chapterId: appliedChapterId });

  return {
    entityId: appliedChapterId,
    entityType: "chapters",
    entityLabel: normalizedValues.title,
  };
}

async function applySceneProposal({
  supabase,
  uid,
  projectId,
  workflowState,
  proposal,
}: {
  supabase: Awaited<ReturnType<typeof getSupabaseServerClient>>;
  uid: string;
  projectId: string;
  workflowState: ManuscriptImportWorkflowState;
  proposal: ManuscriptImportSceneProposal;
}): Promise<ApplyResult> {
  const targetSceneId = getTargetRecordId(proposal.review.matchedRecord, "scenes");
  const targetBookId =
    proposal.targetBookId ?? resolveMappedBookIds(workflowState, proposal.sourceBookIds)[0] ?? null;
  const [targetSceneResult, charactersResult, timelineEventsResult, existingIds] =
    await Promise.all([
      targetSceneId
        ? supabase
            .from("scenes")
            .select("*")
            .eq("user_id", uid)
            .eq("project_id", projectId)
            .eq("id", targetSceneId)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      proposal.pointOfViewCharacterName.trim()
        ? supabase
            .from("characters")
            .select("id, name, aliases")
            .eq("user_id", uid)
            .eq("project_id", projectId)
        : Promise.resolve({ data: [], error: null }),
      proposal.linkedTimelineEventTitles.length > 0
        ? supabase
            .from("timeline_events")
            .select("id, title")
            .eq("user_id", uid)
            .eq("project_id", projectId)
        : Promise.resolve({ data: [], error: null }),
      proposal.review.suggestedAction === "create"
        ? loadExistingIds(supabase, uid, projectId, "scenes")
        : Promise.resolve([]),
    ]);
  const targetScene = targetSceneResult.error
    ? (() => {
        throw new Error(targetSceneResult.error.message);
      })()
    : ((targetSceneResult.data ?? null) as SceneRow | null);
  const characterRows = charactersResult.error
    ? (() => {
        throw new Error(charactersResult.error.message);
      })()
    : ((charactersResult.data ?? []) as CharacterMatchRow[]);
  const timelineRows = timelineEventsResult.error
    ? (() => {
        throw new Error(timelineEventsResult.error.message);
      })()
    : ((timelineEventsResult.data ?? []) as TimelineEventMatchRow[]);
  const pointOfViewCharacterId = resolveSingleMatchedId(
    proposal.pointOfViewCharacterName,
    characterRows,
    (character) =>
      createMatchRecord("characters", character.id, character.name, character.aliases ?? [])
  );
  const linkedTimelineEventIds = resolveMatchedIds(
    proposal.linkedTimelineEventTitles,
    timelineRows,
    (event) => createMatchRecord("timeline_events", event.id, event.title)
  );
  const normalizedValues = buildNormalizedSceneValues({
    proposal,
    targetScene,
    pointOfViewCharacterId,
    targetBookId,
  });
  const now = new Date().toISOString();
  let appliedSceneId = targetScene?.id ?? "";

  if (!normalizedValues.title) {
    throw new Error("Scene title is required.");
  }

  if (proposal.review.suggestedAction === "create" && !normalizedValues.bookId) {
    throw new Error("Map this imported book to a target book before applying scene proposals.");
  }

  if (proposal.review.suggestedAction === "create") {
    appliedSceneId = getAvailablePrefixedId(
      "scene",
      normalizedValues.title,
      existingIds,
      slugifySceneTitle
    );
    const sceneDocument = buildSceneDocument({
      id: appliedSceneId,
      projectId,
      values: normalizedValues,
    });
    const { error } = await supabase.from("scenes").insert({
      user_id: uid,
      project_id: projectId,
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
      character_ids: uniqueStrings([pointOfViewCharacterId ?? ""]),
      location_ids: sceneDocument.locationIds,
      plot_thread_ids: sceneDocument.plotThreadIds,
      created_at: now,
      updated_at: now,
    });

    if (error) {
      throw new Error(error.message);
    }
  } else {
    if (!targetScene) {
      throw new Error("Matched scene not found.");
    }

    const { error } = await supabase
      .from("scenes")
      .update({
        title: normalizedValues.title,
        slug: slugifySceneTitle(normalizedValues.title),
        summary: normalizedValues.summary,
        description: normalizedValues.description,
        status: normalizedValues.status,
        is_archived: normalizedValues.status === "archived",
        book_id: normalizedValues.bookId,
        chapter_id: normalizedValues.chapterId,
        scene_number: normalizedValues.sceneNumber,
        scene_type: normalizedValues.sceneType,
        point_of_view_character_id:
          normalizedValues.pointOfViewCharacterId ?? targetScene.point_of_view_character_id,
        goal: normalizedValues.goal,
        conflict: normalizedValues.conflict,
        outcome: normalizedValues.outcome,
        text_draft: normalizedValues.textDraft,
        timeline_event_ids: uniqueStrings([
          ...(targetScene.timeline_event_ids ?? []),
          ...linkedTimelineEventIds,
        ]),
        character_ids: uniqueStrings([
          ...(targetScene.character_ids ?? []),
          normalizedValues.pointOfViewCharacterId ?? "",
        ]),
        updated_at: now,
      })
      .eq("user_id", uid)
      .eq("project_id", projectId)
      .eq("id", targetScene.id);

    if (error) {
      throw new Error(error.message);
    }
  }

  if (normalizedValues.bookId) {
    await syncSceneIntoBook({ supabase, uid, projectId, bookId: normalizedValues.bookId, sceneId: appliedSceneId });
  }

  return {
    entityId: appliedSceneId,
    entityType: "scenes",
    entityLabel: normalizedValues.title,
  };
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
  matchedScenes: SceneChapterLinkRow[];
}) {
  const syncedSceneIds: string[] = [];

  for (const scene of matchedScenes) {
    if (scene.chapter_id && scene.chapter_id !== chapterId) {
      continue;
    }

    if (chapterBookId && scene.book_id && scene.book_id !== chapterBookId) {
      continue;
    }

    const { error } = await supabase
      .from("scenes")
      .update({
        chapter_id: chapterId,
        book_id: scene.book_id || chapterBookId,
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

async function syncChapterIntoBook({
  supabase,
  uid,
  projectId,
  bookId,
  chapterId,
}: {
  supabase: Awaited<ReturnType<typeof getSupabaseServerClient>>;
  uid: string;
  projectId: string;
  bookId: string;
  chapterId: string;
}) {
  const book = await loadBookLinkRow({ supabase, uid, projectId, bookId });

  if (!book) {
    return;
  }

  const { error } = await supabase
    .from("books")
    .update({
      chapter_ids: uniqueStrings([...(book.chapter_ids ?? []), chapterId]),
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", uid)
    .eq("project_id", projectId)
    .eq("id", bookId);

  if (error) {
    throw new Error(error.message);
  }
}

async function syncSceneIntoBook({
  supabase,
  uid,
  projectId,
  bookId,
  sceneId,
}: {
  supabase: Awaited<ReturnType<typeof getSupabaseServerClient>>;
  uid: string;
  projectId: string;
  bookId: string;
  sceneId: string;
}) {
  const book = await loadBookLinkRow({ supabase, uid, projectId, bookId });

  if (!book) {
    return;
  }

  const { error } = await supabase
    .from("books")
    .update({
      scene_ids: uniqueStrings([...(book.scene_ids ?? []), sceneId]),
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", uid)
    .eq("project_id", projectId)
    .eq("id", bookId);

  if (error) {
    throw new Error(error.message);
  }
}

function normalizeApplyInput(value: unknown): ApplyInput {
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
  };
}

function readProposalType(value: unknown): ManuscriptImportProposalType {
  return value === "characters" ||
    value === "locations" ||
    value === "plotThreads" ||
    value === "timelineEvents" ||
    value === "chapters" ||
    value === "scenes"
    ? value
    : "characters";
}

function getProposalApplyGuardReason({
  proposalType,
  proposal,
}: {
  proposalType: ManuscriptImportProposalType;
  proposal: ManuscriptImportProposalByType<ManuscriptImportProposalType>;
}) {
  if (proposal.review.suggestedAction === "ignore") {
    return "Ignored proposals do not apply canon writes.";
  }

  if (proposal.review.reviewStatus === "applied") {
    return "This proposal has already been applied. Save a new review state before applying it again.";
  }

  if (proposal.review.reviewStatus !== "reviewed") {
    return "Mark this proposal as reviewed before applying it.";
  }

  if (
    (proposal.review.suggestedAction === "update" || proposal.review.suggestedAction === "merge") &&
    !getTargetRecordId(proposal.review.matchedRecord, getEntityTypeForProposalType(proposalType))
  ) {
    return "Update and merge require a matched existing record.";
  }

  return null;
}

function getEntityTypeForProposalType(proposalType: ManuscriptImportProposalType) {
  if (proposalType === "plotThreads") {
    return "plot_threads";
  }

  if (proposalType === "timelineEvents") {
    return "timeline_events";
  }

  return proposalType;
}

function getTargetRecordId(
  matchedRecord: { entityType: string; recordId: string } | null,
  entityType: string
) {
  return matchedRecord?.entityType === entityType ? matchedRecord.recordId : null;
}

function resolveMappedBookIds(
  workflowState: ManuscriptImportWorkflowState,
  importBookIds: string[]
) {
  return uniqueStrings(
    importBookIds
      .map((importBookId) =>
        workflowState.books.find((entry) => entry.importBookId === importBookId)?.mapping
          .targetBookId
      )
      .filter(isNonEmptyString)
  );
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

function resolveMatchedRows<RowType>(
  labels: string[],
  rows: RowType[],
  createRecord: (row: RowType) => BrainDumpMatchRecord
) {
  const records = rows.map((row) => ({
    row,
    matchRecord: createRecord(row),
  }));
  const matchedRows: RowType[] = [];
  const seenIds = new Set<string>();

  for (const label of labels) {
    const candidate = buildBrainDumpMatchCandidates(
      label,
      records.map((record) => record.matchRecord)
    )[0];

    if (!candidate?.recordId || seenIds.has(candidate.recordId)) {
      continue;
    }

    const matched = records.find((record) => record.matchRecord.recordId === candidate.recordId);

    if (!matched) {
      continue;
    }

    seenIds.add(candidate.recordId);
    matchedRows.push(matched.row);
  }

  return matchedRows;
}

function resolveMatchedIds<RowType>(
  labels: string[],
  rows: RowType[],
  createRecord: (row: RowType) => BrainDumpMatchRecord
) {
  return resolveMatchedRows(labels, rows, createRecord).map((row) => createRecord(row).recordId);
}

function resolveSingleMatchedId<RowType>(
  label: string,
  rows: RowType[],
  createRecord: (row: RowType) => BrainDumpMatchRecord
) {
  if (!label.trim()) {
    return null;
  }

  return resolveMatchedIds([label], rows, createRecord)[0] ?? null;
}

function buildEvidenceDescription(
  evidence: string,
  existingDescription: string,
  evidenceLabel: string
) {
  const trimmedEvidence = evidence.trim();
  const trimmedExisting = existingDescription.trim();

  if (trimmedExisting && trimmedEvidence) {
    return trimmedExisting.includes(trimmedEvidence)
      ? trimmedExisting
      : `${trimmedExisting}\n\n${evidenceLabel}:\n${trimmedEvidence}`;
  }

  if (trimmedExisting) {
    return trimmedExisting;
  }

  return trimmedEvidence ? `${evidenceLabel}:\n${trimmedEvidence}` : "";
}

function derivePlacementLinks(placement: string, referenceEventIds: string[]) {
  const anchors = uniqueStrings(referenceEventIds);

  if (placement === "before") {
    return { predecessorEventIds: [], successorEventIds: anchors.slice(0, 1) };
  }

  if (placement === "after") {
    return { predecessorEventIds: anchors.slice(0, 1), successorEventIds: [] };
  }

  if (placement === "between") {
    return {
      predecessorEventIds: anchors.slice(0, 1),
      successorEventIds: anchors.slice(1, 2),
    };
  }

  if (placement === "beginning") {
    return { predecessorEventIds: [], successorEventIds: anchors.slice(0, 1) };
  }

  if (placement === "end") {
    return { predecessorEventIds: anchors.slice(-1), successorEventIds: [] };
  }

  return { predecessorEventIds: [], successorEventIds: [] };
}

function parseEstimatedChapterNumber(value: string) {
  const match = value.match(/-?\d+/);

  if (!match) {
    return null;
  }

  const parsed = Number.parseInt(match[0], 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function getAvailablePrefixedId(
  prefix: string,
  label: string,
  existingIds: string[],
  slugify: (value: string) => string
) {
  const baseId = `${prefix}_${slugify(label).replace(/-/g, "_") || prefix}`;
  const usedIds = new Set(existingIds);
  let candidateId = baseId;
  let suffix = 2;

  while (usedIds.has(candidateId)) {
    candidateId = `${baseId}-${suffix}`;
    suffix += 1;
  }

  return candidateId;
}

function uniqueStrings(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function formatEntityLabel(entityType: string) {
  return entityType.replace(/_/g, " ");
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
