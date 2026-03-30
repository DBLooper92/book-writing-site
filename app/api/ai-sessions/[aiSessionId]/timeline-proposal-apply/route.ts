import { NextResponse } from "next/server";

import { buildBrainDumpMatchCandidates, type BrainDumpMatchRecord } from "@/lib/ai/brain-dump-matching";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  normalizeBrainDumpExtractionResult,
  type BrainDumpExtractionResult,
} from "@/types/ai-brain-dump";
import type { Database } from "@/types/database";
import {
  buildTimelineEventDocument,
  coerceTimelineEventType,
  slugifyTimelineEventTitle,
  validateNormalizedTimelineEventFormValues,
  type NormalizedTimelineEventFormValues,
} from "@/types/timeline-event";

type RouteContext = {
  params: Promise<{
    aiSessionId: string;
  }>;
};

type ApplyInput = {
  proposalIndex: number;
};

type TimelineEventWriteRow = Pick<
  Database["public"]["Tables"]["timeline_events"]["Row"],
  | "id"
  | "title"
  | "summary"
  | "description"
  | "status"
  | "event_type"
  | "year_start"
  | "month_start"
  | "day_start"
  | "year_end"
  | "month_end"
  | "day_end"
  | "chronology_order"
  | "time_of_day_label"
  | "display_date_label"
  | "era_id"
  | "book_ids"
  | "chapter_ids"
  | "scene_ids"
  | "character_ids"
  | "location_ids"
  | "faction_ids"
  | "culture_ids"
  | "technology_ids"
  | "religion_ids"
  | "plot_thread_ids"
  | "theme_ids"
  | "causes"
  | "consequences"
  | "predecessor_event_ids"
  | "successor_event_ids"
  | "public_wiki_summary"
>;

type CharacterMatchRow = Pick<
  Database["public"]["Tables"]["characters"]["Row"],
  "id" | "name" | "aliases"
>;

type ChapterMatchRow = Pick<
  Database["public"]["Tables"]["chapters"]["Row"],
  "id" | "title"
>;

type SceneMatchRow = Pick<
  Database["public"]["Tables"]["scenes"]["Row"],
  "id" | "title"
>;

type LocationMatchRow = Pick<
  Database["public"]["Tables"]["locations"]["Row"],
  "id" | "name"
>;

export async function POST(request: Request, context: RouteContext) {
  const { aiSessionId } = await context.params;
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Sign in before applying a timeline proposal." }, { status: 401 });
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

  const proposal = extractionResult.timelineEvents[input.proposalIndex];

  if (!proposal) {
    return NextResponse.json({ error: "Timeline proposal not found." }, { status: 404 });
  }

  if (proposal.review.reviewStatus === "applied") {
    return NextResponse.json(
      { error: "This timeline proposal has already been applied. Save a new review state before applying it again." },
      { status: 400 }
    );
  }

  if (proposal.review.reviewStatus !== "reviewed") {
    return NextResponse.json(
      { error: "Mark this timeline proposal as reviewed before applying it." },
      { status: 400 }
    );
  }

  if (proposal.review.suggestedAction === "ignore") {
    return NextResponse.json(
      { error: "Ignored proposals are saved through review state only and do not apply canon writes." },
      { status: 400 }
    );
  }

  const targetTimelineEventId = resolveTargetTimelineEventId(proposal);

  if (
    (proposal.review.suggestedAction === "update" || proposal.review.suggestedAction === "merge") &&
    !targetTimelineEventId
  ) {
    return NextResponse.json(
      { error: "Update or merge requires a matched existing timeline event." },
      { status: 400 }
    );
  }

  const [
    targetTimelineEventResult,
    charactersResult,
    chaptersResult,
    scenesResult,
    locationsResult,
    existingTimelineIdsResult,
  ] = await Promise.all([
    targetTimelineEventId
      ? supabase
          .from("timeline_events")
          .select(
            "id, title, summary, description, status, event_type, year_start, month_start, day_start, year_end, month_end, day_end, chronology_order, time_of_day_label, display_date_label, era_id, book_ids, chapter_ids, scene_ids, character_ids, location_ids, faction_ids, culture_ids, technology_ids, religion_ids, plot_thread_ids, theme_ids, causes, consequences, predecessor_event_ids, successor_event_ids, public_wiki_summary"
          )
          .eq("user_id", user.id)
          .eq("project_id", aiSession.project_id)
          .eq("id", targetTimelineEventId)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    proposal.linkedCharacterNames.length > 0
      ? supabase
          .from("characters")
          .select("id, name, aliases")
          .eq("user_id", user.id)
          .eq("project_id", aiSession.project_id)
      : Promise.resolve({ data: [], error: null }),
    proposal.linkedChapterTitles.length > 0
      ? supabase
          .from("chapters")
          .select("id, title")
          .eq("user_id", user.id)
          .eq("project_id", aiSession.project_id)
      : Promise.resolve({ data: [], error: null }),
    proposal.linkedSceneTitles.length > 0
      ? supabase
          .from("scenes")
          .select("id, title")
          .eq("user_id", user.id)
          .eq("project_id", aiSession.project_id)
      : Promise.resolve({ data: [], error: null }),
    proposal.linkedLocationNames.length > 0
      ? supabase
          .from("locations")
          .select("id, name")
          .eq("user_id", user.id)
          .eq("project_id", aiSession.project_id)
      : Promise.resolve({ data: [], error: null }),
    proposal.review.suggestedAction === "create"
      ? supabase
          .from("timeline_events")
          .select("id")
          .eq("user_id", user.id)
          .eq("project_id", aiSession.project_id)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (targetTimelineEventResult.error) {
    return NextResponse.json({ error: targetTimelineEventResult.error.message }, { status: 500 });
  }

  if (charactersResult.error || chaptersResult.error || scenesResult.error || locationsResult.error) {
    return NextResponse.json(
      {
        error:
          charactersResult.error?.message ||
          chaptersResult.error?.message ||
          scenesResult.error?.message ||
          locationsResult.error?.message ||
          "Unable to load linked proposal records.",
      },
      { status: 500 }
    );
  }

  if (existingTimelineIdsResult.error) {
    return NextResponse.json({ error: existingTimelineIdsResult.error.message }, { status: 500 });
  }

  const targetTimelineEvent = (targetTimelineEventResult.data ?? null) as TimelineEventWriteRow | null;
  const characterRows = (charactersResult.data ?? []) as CharacterMatchRow[];
  const chapterRows = (chaptersResult.data ?? []) as ChapterMatchRow[];
  const sceneRows = (scenesResult.data ?? []) as SceneMatchRow[];
  const locationRows = (locationsResult.data ?? []) as LocationMatchRow[];

  const normalizedValues = buildNormalizedTimelineEventValues({
    proposal,
    targetTimelineEvent,
    linkedCharacterIds: resolveMatchedIds(
      proposal.linkedCharacterNames,
      characterRows.map((row) => createMatchRecord("characters", row.id, row.name, row.aliases ?? []))
    ),
    linkedChapterIds: resolveMatchedIds(
      proposal.linkedChapterTitles,
      chapterRows.map((row) => createMatchRecord("chapters", row.id, row.title))
    ),
    linkedSceneIds: resolveMatchedIds(
      proposal.linkedSceneTitles,
      sceneRows.map((row) => createMatchRecord("scenes", row.id, row.title))
    ),
    linkedLocationIds: resolveMatchedIds(
      proposal.linkedLocationNames,
      locationRows.map((row) => createMatchRecord("locations" as never, row.id, row.name))
    ),
  });

  const validation = validateNormalizedTimelineEventFormValues(normalizedValues, {
    currentTimelineEventId: targetTimelineEvent?.id ?? null,
  });

  if (validation.errors.length > 0) {
    return NextResponse.json({ error: validation.errors[0] }, { status: 400 });
  }

  const now = new Date().toISOString();
  let appliedTimelineEventId = targetTimelineEvent?.id ?? "";

  if (proposal.review.suggestedAction === "create") {
    appliedTimelineEventId = getAvailableTimelineEventId(
      proposal.title,
      (existingTimelineIdsResult.data ?? []).map((row) => row.id)
    );
    const timelineEventDocument = buildTimelineEventDocument({
      id: appliedTimelineEventId,
      projectId: aiSession.project_id,
      values: normalizedValues,
    });

    const { error: insertError } = await supabase.from("timeline_events").insert({
      user_id: user.id,
      project_id: aiSession.project_id,
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

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }
  } else {
    if (!targetTimelineEvent) {
      return NextResponse.json({ error: "Matched timeline event not found." }, { status: 404 });
    }

    const { error: updateError } = await supabase
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
        public_wiki_summary: normalizedValues.publicWikiSummary,
        updated_at: now,
      })
      .eq("user_id", user.id)
      .eq("project_id", aiSession.project_id)
      .eq("id", appliedTimelineEventId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }
  }

  const updatedProposal = {
    ...proposal,
    review: {
      ...proposal.review,
      reviewStatus: "applied" as const,
      matchedRecord: {
        entityType: "timeline_events",
        recordId: appliedTimelineEventId,
        recordLabel: normalizedValues.title,
        matchReason:
          proposal.review.suggestedAction === "create"
            ? "Applied new timeline event"
            : "Applied to existing timeline event",
        score: proposal.review.matchedRecord?.score ?? null,
      },
    },
    placementSuggestion: {
      ...proposal.placementSuggestion,
      displayDateLabel: normalizedValues.displayDateLabel,
      yearStart: normalizedValues.yearStart,
      yearEnd: normalizedValues.yearEnd,
    },
  };

  const updatedExtractionResult = {
    ...extractionResult,
    timelineEvents: extractionResult.timelineEvents.map((timelineProposal, index) =>
      index === input.proposalIndex ? updatedProposal : timelineProposal
    ),
  } satisfies BrainDumpExtractionResult;
  const linkedEntityIds = uniqueIds([...(aiSession.linked_entity_ids ?? []), appliedTimelineEventId]);
  const linkedEntityTypes = uniqueIds([...(aiSession.linked_entity_types ?? []), "timeline_events"]);

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
    timelineProposal: updatedProposal,
    appliedTimelineEvent: {
      id: appliedTimelineEventId,
      title: normalizedValues.title,
      action: proposal.review.suggestedAction,
    },
  });
}

function buildNormalizedTimelineEventValues({
  proposal,
  targetTimelineEvent,
  linkedCharacterIds,
  linkedChapterIds,
  linkedSceneIds,
  linkedLocationIds,
}: {
  proposal: NonNullable<ReturnType<typeof normalizeBrainDumpExtractionResult>>["timelineEvents"][number];
  targetTimelineEvent: TimelineEventWriteRow | null;
  linkedCharacterIds: string[];
  linkedChapterIds: string[];
  linkedSceneIds: string[];
  linkedLocationIds: string[];
}): NormalizedTimelineEventFormValues {
  const reviewedYearStart = proposal.placementSuggestion.yearStart;
  const reviewedYearEnd = proposal.placementSuggestion.yearEnd;
  const hasReviewedStart = typeof reviewedYearStart === "number";
  const hasReviewedEnd = typeof reviewedYearEnd === "number";
  const placementLinks = derivePlacementLinks(
    proposal.placementSuggestion.placement,
    proposal.placementSuggestion.referenceEventIds
  );

  return {
    title: proposal.title.trim(),
    summary: proposal.summary.trim(),
    description: buildTimelineDescription(proposal.evidence, targetTimelineEvent?.description ?? ""),
    status: targetTimelineEvent?.status === "archived" ? "archived" : "active",
    eventType: coerceTimelineEventType(proposal.eventType),
    yearStart: hasReviewedStart ? reviewedYearStart : targetTimelineEvent?.year_start ?? null,
    monthStart: hasReviewedStart ? null : targetTimelineEvent?.month_start ?? null,
    dayStart: hasReviewedStart ? null : targetTimelineEvent?.day_start ?? null,
    yearEnd: hasReviewedEnd ? reviewedYearEnd : targetTimelineEvent?.year_end ?? null,
    monthEnd: hasReviewedEnd ? null : targetTimelineEvent?.month_end ?? null,
    dayEnd: hasReviewedEnd ? null : targetTimelineEvent?.day_end ?? null,
    chronologyOrder: targetTimelineEvent?.chronology_order ?? null,
    timeOfDayLabel: targetTimelineEvent?.time_of_day_label ?? "",
    displayDateLabel:
      proposal.placementSuggestion.displayDateLabel.trim() ||
      proposal.dateLabel.trim() ||
      targetTimelineEvent?.display_date_label ||
      "",
    eraId: targetTimelineEvent?.era_id ?? null,
    bookIds: targetTimelineEvent?.book_ids ?? [],
    chapterIds: uniqueIds([...(targetTimelineEvent?.chapter_ids ?? []), ...linkedChapterIds]),
    sceneIds: uniqueIds([...(targetTimelineEvent?.scene_ids ?? []), ...linkedSceneIds]),
    characterIds: uniqueIds([...(targetTimelineEvent?.character_ids ?? []), ...linkedCharacterIds]),
    locationIds: uniqueIds([...(targetTimelineEvent?.location_ids ?? []), ...linkedLocationIds]),
    factionIds: targetTimelineEvent?.faction_ids ?? [],
    cultureIds: targetTimelineEvent?.culture_ids ?? [],
    technologyIds: targetTimelineEvent?.technology_ids ?? [],
    religionIds: targetTimelineEvent?.religion_ids ?? [],
    plotThreadIds: targetTimelineEvent?.plot_thread_ids ?? [],
    themeIds: targetTimelineEvent?.theme_ids ?? [],
    causes: targetTimelineEvent?.causes ?? [],
    consequences: targetTimelineEvent?.consequences ?? [],
    predecessorEventIds: uniqueIds([
      ...(targetTimelineEvent?.predecessor_event_ids ?? []),
      ...placementLinks.predecessorEventIds,
    ]),
    successorEventIds: uniqueIds([
      ...(targetTimelineEvent?.successor_event_ids ?? []),
      ...placementLinks.successorEventIds,
    ]),
    publicWikiSummary:
      proposal.summary.trim() || targetTimelineEvent?.public_wiki_summary || "",
  };
}

function resolveTargetTimelineEventId(
  proposal: NonNullable<ReturnType<typeof normalizeBrainDumpExtractionResult>>["timelineEvents"][number]
) {
  return proposal.review.matchedRecord?.entityType === "timeline_events"
    ? proposal.review.matchedRecord.recordId
    : null;
}

function resolveMatchedIds(labels: string[], records: BrainDumpMatchRecord[]) {
  const ids: string[] = [];
  const seenIds = new Set<string>();

  for (const label of labels) {
    const candidate = buildBrainDumpMatchCandidates(label, records)[0];

    if (!candidate?.recordId || seenIds.has(candidate.recordId)) {
      continue;
    }

    seenIds.add(candidate.recordId);
    ids.push(candidate.recordId);
  }

  return ids;
}

function derivePlacementLinks(placement: string, referenceEventIds: string[]) {
  const anchors = uniqueIds(referenceEventIds);

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

function buildTimelineDescription(evidence: string, existingDescription: string) {
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
    throw new Error("A valid timeline proposal index is required.");
  }

  return { proposalIndex };
}

function getAvailableTimelineEventId(title: string, existingIds: string[]) {
  const baseId = buildTimelineEventId(title);
  const usedIds = new Set(existingIds);
  let candidateId = baseId;
  let suffix = 2;

  while (usedIds.has(candidateId)) {
    candidateId = `${baseId}-${suffix}`;
    suffix += 1;
  }

  return candidateId;
}

function buildTimelineEventId(title: string) {
  const normalized = slugifyTimelineEventTitle(title).replace(/-/g, "_");
  return `event_${normalized || "event"}`;
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
