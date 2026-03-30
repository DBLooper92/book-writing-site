import { NextResponse } from "next/server";

import {
  buildBrainDumpMatchCandidates,
  type BrainDumpMatchRecord,
} from "@/lib/ai/brain-dump-matching";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  normalizeBrainDumpExtractionResult,
  type BrainDumpTimelineEventProposal,
} from "@/types/ai-brain-dump";
import type {
  BrainDumpContextRecordSummary,
  BrainDumpTimelineProposalContext,
} from "@/types/ai-brain-dump-context";
import type { Database } from "@/types/database";

type RouteContext = {
  params: Promise<{
    aiSessionId: string;
  }>;
};

type TimelineContextRow = Pick<
  Database["public"]["Tables"]["timeline_events"]["Row"],
  | "id"
  | "title"
  | "summary"
  | "event_type"
  | "display_date_label"
  | "year_start"
  | "month_start"
  | "day_start"
  | "year_end"
  | "month_end"
  | "day_end"
  | "chronology_order"
  | "character_ids"
  | "chapter_ids"
  | "scene_ids"
>;

export async function GET(request: Request, context: RouteContext) {
  const { aiSessionId } = await context.params;
  const proposalIndex = readProposalIndex(request);

  if (proposalIndex === null) {
    return NextResponse.json({ error: "A valid timeline proposal index is required." }, { status: 400 });
  }

  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Sign in before loading proposal context." }, { status: 401 });
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
  const proposal = extractionResult?.timelineEvents[proposalIndex] ?? null;

  if (!proposal) {
    return NextResponse.json({ error: "Timeline proposal not found in this AI session." }, { status: 404 });
  }

  try {
    const contextPayload = await buildTimelineProposalContext({
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
            : "Unable to load timeline proposal context.",
      },
      { status: 500 }
    );
  }
}

async function buildTimelineProposalContext({
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
  proposal: NonNullable<ReturnType<typeof normalizeBrainDumpExtractionResult>>["timelineEvents"][number];
}) {
  const matchedTimelineEventId =
    proposal.review.matchedRecord?.entityType === "timeline_events"
      ? proposal.review.matchedRecord.recordId
      : null;
  const candidateTimelineEventId =
    !matchedTimelineEventId && proposal.review.matchCandidates[0]?.entityType === "timeline_events"
      ? proposal.review.matchCandidates[0].recordId
      : null;
  const targetTimelineEventId = matchedTimelineEventId || candidateTimelineEventId;

  const [
    targetTimelineEventResult,
    timelineEventsResult,
    charactersResult,
    chaptersResult,
    scenesResult,
  ] = await Promise.all([
    targetTimelineEventId
      ? supabase
          .from("timeline_events")
          .select(
            "id, title, summary, event_type, display_date_label, year_start, month_start, day_start, year_end, month_end, day_end, chronology_order, character_ids, chapter_ids, scene_ids"
          )
          .eq("user_id", uid)
          .eq("project_id", projectId)
          .eq("id", targetTimelineEventId)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    targetTimelineEventId
      ? supabase
          .from("timeline_events")
          .select(
            "id, title, summary, event_type, display_date_label, year_start, month_start, day_start, year_end, month_end, day_end, chronology_order, character_ids, chapter_ids, scene_ids"
          )
          .eq("user_id", uid)
          .eq("project_id", projectId)
      : Promise.resolve({ data: [], error: null }),
    proposal.linkedCharacterNames.length > 0
      ? supabase
          .from("characters")
          .select("id, name, summary, aliases")
          .eq("user_id", uid)
          .eq("project_id", projectId)
      : Promise.resolve({ data: [], error: null }),
    proposal.linkedChapterTitles.length > 0
      ? supabase
          .from("chapters")
          .select("id, title, summary, purpose")
          .eq("user_id", uid)
          .eq("project_id", projectId)
      : Promise.resolve({ data: [], error: null }),
    proposal.linkedSceneTitles.length > 0
      ? supabase
          .from("scenes")
          .select("id, title, summary, goal, conflict, outcome")
          .eq("user_id", uid)
          .eq("project_id", projectId)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (targetTimelineEventResult.error) {
    throw new Error(targetTimelineEventResult.error.message);
  }

  if (timelineEventsResult.error) {
    throw new Error(timelineEventsResult.error.message);
  }

  if (charactersResult.error) {
    throw new Error(charactersResult.error.message);
  }

  if (chaptersResult.error) {
    throw new Error(chaptersResult.error.message);
  }

  if (scenesResult.error) {
    throw new Error(scenesResult.error.message);
  }

  const targetTimelineEvent = (targetTimelineEventResult.data ?? null) as TimelineContextRow | null;
  const allTimelineEvents = (timelineEventsResult.data ?? []) as TimelineContextRow[];
  const neighboringTimelineEvents = targetTimelineEvent
    ? buildNeighboringTimelineContext(allTimelineEvents, targetTimelineEvent.id)
    : { before: [], after: [] };

  const matchedTimelineEventSummary =
    matchedTimelineEventId && targetTimelineEvent
      ? buildTimelineEventSummary(targetTimelineEvent, "Strong project match")
      : null;
  const candidateTimelineEventSummary =
    candidateTimelineEventId && targetTimelineEvent
      ? buildTimelineEventSummary(targetTimelineEvent, "Top timeline candidate")
      : null;

  const linkedCharacters = buildLinkedContextSummaries(
    proposal.linkedCharacterNames,
    (charactersResult.data ?? []).map((row) =>
      createMatchRecord("characters", row.id, row.name, row.aliases ?? [])
    ),
    (recordId) => {
      const row = (charactersResult.data ?? []).find((item) => item.id === recordId);
      return row
        ? {
            entityType: "character" as const,
            id: row.id,
            label: row.name,
            summary: row.summary || "",
            meta: "Character",
            matchedBy: "Linked name match",
          }
        : null;
    }
  );
  const linkedChapters = buildLinkedContextSummaries(
    proposal.linkedChapterTitles,
    (chaptersResult.data ?? []).map((row) => createMatchRecord("chapters", row.id, row.title)),
    (recordId) => {
      const row = (chaptersResult.data ?? []).find((item) => item.id === recordId);
      return row
        ? {
            entityType: "chapter" as const,
            id: row.id,
            label: row.title,
            summary: row.summary || row.purpose || "",
            meta: row.purpose ? `Purpose: ${row.purpose}` : "Chapter",
            matchedBy: "Linked title match",
          }
        : null;
    }
  );
  const linkedScenes = buildLinkedContextSummaries(
    proposal.linkedSceneTitles,
    (scenesResult.data ?? []).map((row) => createMatchRecord("scenes", row.id, row.title)),
    (recordId) => {
      const row = (scenesResult.data ?? []).find((item) => item.id === recordId);
      return row
        ? {
            entityType: "scene" as const,
            id: row.id,
            label: row.title,
            summary: row.summary || "",
            meta: buildSceneMeta(row.goal, row.conflict, row.outcome),
            matchedBy: "Linked title match",
          }
        : null;
    }
  );

  const notes: string[] = [];
  const continuityWarnings: string[] = [];

  if (matchedTimelineEventSummary) {
    notes.push("Loaded the strongest matched timeline event plus nearby chronology context.");
  } else if (candidateTimelineEventSummary) {
    notes.push("No strong timeline match was found, so context is anchored on the top candidate event.");
  } else {
    notes.push("No timeline match is available yet, so chronology neighbors are not loaded in this first targeted-context pass.");
  }

  if (linkedCharacters.length === 0 && linkedChapters.length === 0 && linkedScenes.length === 0) {
    notes.push("No linked character, chapter, or scene summaries were found from the proposal labels.");
  }

  if (proposal.linkedCharacterNames.length > 0 && linkedCharacters.length === 0) {
    continuityWarnings.push(
      "The proposal references characters by name, but no scoped character summaries matched those labels."
    );
  }

  if (proposal.linkedChapterTitles.length > 0 && linkedChapters.length === 0) {
    continuityWarnings.push(
      "The proposal references chapters, but no scoped chapter summaries matched those titles."
    );
  }

  if (proposal.linkedSceneTitles.length > 0 && linkedScenes.length === 0) {
    continuityWarnings.push(
      "The proposal references scenes, but no scoped scene summaries matched those titles."
    );
  }

  if (targetTimelineEvent) {
    appendAnchorLinkContinuityWarnings({
      continuityWarnings,
      anchorEvent: targetTimelineEvent,
      anchorLabel:
        matchedTimelineEventSummary?.label ||
        candidateTimelineEventSummary?.label ||
        targetTimelineEvent.title,
      linkedCharacters,
      linkedChapters,
      linkedScenes,
    });
  }

  if (!matchedTimelineEventSummary && !candidateTimelineEventSummary && allTimelineEvents.length > 0) {
    continuityWarnings.push(
      "No current timeline anchor was found, so chronology placement will still need manual review."
    );
  }

  const placementRecommendation = buildPlacementRecommendation({
    proposal,
    matchedTimelineEvent: matchedTimelineEventSummary,
    candidateTimelineEvent: candidateTimelineEventSummary,
    neighboringTimelineEvents,
    hasExistingTimeline: allTimelineEvents.length > 0,
  });

  return {
    proposalIndex,
    matchedTimelineEvent: matchedTimelineEventSummary,
    candidateTimelineEvent: candidateTimelineEventSummary,
    placementRecommendation,
    neighboringTimelineEvents,
    linkedCharacters,
    linkedChapters,
    linkedScenes,
    continuityWarnings,
    notes,
  } satisfies BrainDumpTimelineProposalContext;
}

function buildLinkedContextSummaries(
  labels: string[],
  records: BrainDumpMatchRecord[],
  buildSummary: (recordId: string) => BrainDumpContextRecordSummary | null
) {
  const summaries: BrainDumpContextRecordSummary[] = [];
  const seenIds = new Set<string>();

  for (const label of labels) {
    const candidate = buildBrainDumpMatchCandidates(label, records)[0];

    if (!candidate?.recordId || seenIds.has(candidate.recordId)) {
      continue;
    }

    const summary = buildSummary(candidate.recordId);

    if (!summary) {
      continue;
    }

    seenIds.add(candidate.recordId);
    summaries.push({
      ...summary,
      matchedBy: candidate.matchReason || summary.matchedBy,
    });
  }

  return summaries;
}

function buildNeighboringTimelineContext(
  timelineEvents: TimelineContextRow[],
  targetTimelineEventId: string
) {
  const sortedTimelineEvents = [...timelineEvents].sort(compareTimelineContextRows);
  const targetIndex = sortedTimelineEvents.findIndex((timelineEvent) => timelineEvent.id === targetTimelineEventId);

  if (targetIndex === -1) {
    return {
      before: [],
      after: [],
    };
  }

  return {
    before: sortedTimelineEvents
      .slice(Math.max(0, targetIndex - 2), targetIndex)
      .map((timelineEvent) => buildTimelineEventSummary(timelineEvent, "Earlier chronology context")),
    after: sortedTimelineEvents
      .slice(targetIndex + 1, targetIndex + 3)
      .map((timelineEvent) => buildTimelineEventSummary(timelineEvent, "Later chronology context")),
  };
}

function buildTimelineEventSummary(
  timelineEvent: TimelineContextRow,
  matchedBy: string
): BrainDumpContextRecordSummary {
  return {
    entityType: "timeline_event",
    id: timelineEvent.id,
    label: timelineEvent.title,
    summary: timelineEvent.summary || "",
    meta:
      timelineEvent.display_date_label ||
      buildTimelineDateMeta(
        timelineEvent.year_start,
        timelineEvent.month_start,
        timelineEvent.day_start,
        timelineEvent.year_end,
        timelineEvent.month_end,
        timelineEvent.day_end
      ) ||
      timelineEvent.event_type,
    matchedBy,
  };
}

function compareTimelineContextRows(left: TimelineContextRow, right: TimelineContextRow) {
  const leftAnchorYear = getAnchorYear(left);
  const rightAnchorYear = getAnchorYear(right);

  if (typeof leftAnchorYear === "number" && typeof rightAnchorYear === "number") {
    if (leftAnchorYear !== rightAnchorYear) {
      return leftAnchorYear - rightAnchorYear;
    }
  } else if (typeof leftAnchorYear === "number") {
    return -1;
  } else if (typeof rightAnchorYear === "number") {
    return 1;
  }

  const precisionComparison = compareNullableNumber(left.month_start, right.month_start)
    || compareNullableNumber(left.day_start, right.day_start)
    || compareNullableNumber(left.chronology_order, right.chronology_order)
    || compareNullableNumber(left.year_end, right.year_end)
    || compareNullableNumber(left.month_end, right.month_end)
    || compareNullableNumber(left.day_end, right.day_end);

  if (precisionComparison !== 0) {
    return precisionComparison;
  }

  return left.title.localeCompare(right.title);
}

function getAnchorYear(timelineEvent: TimelineContextRow) {
  return typeof timelineEvent.year_start === "number"
    ? timelineEvent.year_start
    : timelineEvent.year_end;
}

function compareNullableNumber(left: number | null, right: number | null) {
  if (typeof left === "number" && typeof right === "number") {
    return left - right;
  }

  if (typeof left === "number") {
    return 1;
  }

  if (typeof right === "number") {
    return -1;
  }

  return 0;
}

function buildTimelineDateMeta(
  yearStart: number | null,
  monthStart: number | null,
  dayStart: number | null,
  yearEnd: number | null,
  monthEnd: number | null,
  dayEnd: number | null
) {
  const start = formatPartialDate(yearStart, monthStart, dayStart);
  const end = formatPartialDate(yearEnd, monthEnd, dayEnd);

  if (start && end) {
    return start === end ? start : `${start} to ${end}`;
  }

  return start || end || "";
}

function formatPartialDate(year: number | null, month: number | null, day: number | null) {
  if (typeof year !== "number") {
    return "";
  }

  if (typeof month !== "number") {
    return String(year);
  }

  if (typeof day !== "number") {
    return `${year}-${String(month).padStart(2, "0")}`;
  }

  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function buildSceneMeta(goal: string, conflict: string, outcome: string) {
  return [goal, conflict, outcome].filter(Boolean).join(" | ") || "Scene";
}

function appendAnchorLinkContinuityWarnings({
  continuityWarnings,
  anchorEvent,
  anchorLabel,
  linkedCharacters,
  linkedChapters,
  linkedScenes,
}: {
  continuityWarnings: string[];
  anchorEvent: TimelineContextRow;
  anchorLabel: string;
  linkedCharacters: BrainDumpContextRecordSummary[];
  linkedChapters: BrainDumpContextRecordSummary[];
  linkedScenes: BrainDumpContextRecordSummary[];
}) {
  const missingCharacterLinks = linkedCharacters.filter(
    (record) => !(anchorEvent.character_ids ?? []).includes(record.id)
  );
  const missingChapterLinks = linkedChapters.filter(
    (record) => !(anchorEvent.chapter_ids ?? []).includes(record.id)
  );
  const missingSceneLinks = linkedScenes.filter(
    (record) => !(anchorEvent.scene_ids ?? []).includes(record.id)
  );

  if (missingCharacterLinks.length > 0) {
    continuityWarnings.push(
      `Anchor event "${anchorLabel}" does not currently link character records matched from this proposal: ${missingCharacterLinks
        .map((record) => record.label)
        .join(", ")}.`
    );
  }

  if (missingChapterLinks.length > 0) {
    continuityWarnings.push(
      `Anchor event "${anchorLabel}" does not currently link chapter records matched from this proposal: ${missingChapterLinks
        .map((record) => record.label)
        .join(", ")}.`
    );
  }

  if (missingSceneLinks.length > 0) {
    continuityWarnings.push(
      `Anchor event "${anchorLabel}" does not currently link scene records matched from this proposal: ${missingSceneLinks
        .map((record) => record.label)
        .join(", ")}.`
    );
  }
}

function buildPlacementRecommendation({
  proposal,
  matchedTimelineEvent,
  candidateTimelineEvent,
  neighboringTimelineEvents,
  hasExistingTimeline,
}: {
  proposal: BrainDumpTimelineEventProposal;
  matchedTimelineEvent: BrainDumpContextRecordSummary | null;
  candidateTimelineEvent: BrainDumpContextRecordSummary | null;
  neighboringTimelineEvents: {
    before: BrainDumpContextRecordSummary[];
    after: BrainDumpContextRecordSummary[];
  };
  hasExistingTimeline: boolean;
}) {
  if (matchedTimelineEvent) {
    return {
      placement: "unspecified" as const,
      referenceEventIds: [matchedTimelineEvent.id],
      referenceEventTitles: [matchedTimelineEvent.label],
      reasoning:
        "A strong existing timeline match was found, so this proposal currently reads more like an update than a new placement.",
    };
  }

  const placementCue = inferPlacementCue(proposal);
  const beforeAnchor =
    neighboringTimelineEvents.before[neighboringTimelineEvents.before.length - 1] ?? null;
  const afterAnchor = neighboringTimelineEvents.after[0] ?? null;
  const anchor = candidateTimelineEvent ?? afterAnchor ?? beforeAnchor;

  if (!hasExistingTimeline) {
    return {
      placement: "beginning" as const,
      referenceEventIds: [],
      referenceEventTitles: [],
      reasoning: "This project has no existing timeline events yet, so the proposal would begin the chronology.",
    };
  }

  if (placementCue === "beginning") {
    return {
      placement: "beginning" as const,
      referenceEventIds: beforeAnchor ? [beforeAnchor.id] : [],
      referenceEventTitles: beforeAnchor ? [beforeAnchor.label] : [],
      reasoning: "The proposal text suggests an early or opening placement in the chronology.",
    };
  }

  if (placementCue === "end") {
    return {
      placement: "end" as const,
      referenceEventIds: afterAnchor ? [afterAnchor.id] : [],
      referenceEventTitles: afterAnchor ? [afterAnchor.label] : [],
      reasoning: "The proposal text suggests a late or ending placement in the chronology.",
    };
  }

  if (placementCue === "between" && beforeAnchor && afterAnchor) {
    return {
      placement: "between" as const,
      referenceEventIds: [beforeAnchor.id, afterAnchor.id],
      referenceEventTitles: [beforeAnchor.label, afterAnchor.label],
      reasoning: "Targeted chronology context found neighboring events on both sides, so this proposal likely belongs between them.",
    };
  }

  if (placementCue === "before" && anchor) {
    return {
      placement: "before" as const,
      referenceEventIds: [anchor.id],
      referenceEventTitles: [anchor.label],
      reasoning: "The proposal language suggests it should land before the closest current timeline anchor.",
    };
  }

  if (placementCue === "after" && anchor) {
    return {
      placement: "after" as const,
      referenceEventIds: [anchor.id],
      referenceEventTitles: [anchor.label],
      reasoning: "The proposal language suggests it should land after the closest current timeline anchor.",
    };
  }

  if (beforeAnchor && afterAnchor) {
    return {
      placement: "between" as const,
      referenceEventIds: [beforeAnchor.id, afterAnchor.id],
      referenceEventTitles: [beforeAnchor.label, afterAnchor.label],
      reasoning:
        "A likely anchor event plus neighboring chronology context were found, so the safest first-pass recommendation is to review this proposal between the nearest surrounding events.",
    };
  }

  if (candidateTimelineEvent) {
    return {
      placement: "after" as const,
      referenceEventIds: [candidateTimelineEvent.id],
      referenceEventTitles: [candidateTimelineEvent.label],
      reasoning:
        "A top candidate timeline event was found, so the proposal is currently anchored just after that closest chronology match for manual review.",
    };
  }

  if (afterAnchor) {
    return {
      placement: "before" as const,
      referenceEventIds: [afterAnchor.id],
      referenceEventTitles: [afterAnchor.label],
      reasoning: "No stronger anchor was found, so this proposal is currently best reviewed just before the earliest nearby event.",
    };
  }

  if (beforeAnchor) {
    return {
      placement: "after" as const,
      referenceEventIds: [beforeAnchor.id],
      referenceEventTitles: [beforeAnchor.label],
      reasoning: "No stronger anchor was found, so this proposal is currently best reviewed just after the latest nearby event.",
    };
  }

  return {
    placement: "unspecified" as const,
    referenceEventIds: [],
    referenceEventTitles: [],
    reasoning:
      "Targeted context did not find enough chronology anchors to make a reliable placement recommendation yet.",
  };
}

function inferPlacementCue(proposal: BrainDumpTimelineEventProposal) {
  const searchableText = [
    proposal.dateLabel,
    proposal.summary,
    proposal.evidence,
  ]
    .join(" ")
    .toLowerCase();

  if (/\b(beginning|opening|start|earliest|first)\b/.test(searchableText)) {
    return "beginning" as const;
  }

  if (/\b(end|ending|final|last|late)\b/.test(searchableText)) {
    return "end" as const;
  }

  if (/\bbetween\b/.test(searchableText)) {
    return "between" as const;
  }

  if (/\b(before|prior|previously|earlier than)\b/.test(searchableText)) {
    return "before" as const;
  }

  if (/\b(after|following|later than|afterward|subsequently)\b/.test(searchableText)) {
    return "after" as const;
  }

  return null;
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
