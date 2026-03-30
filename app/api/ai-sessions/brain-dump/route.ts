import { NextResponse } from "next/server";

import {
  applyCheapBrainDumpMatching,
  type BrainDumpMatchRecord,
} from "@/lib/ai/brain-dump-matching";
import {
  buildBrainDumpModelInput,
  deriveLinkedEntityIdsFromBrainDump,
  buildBrainDumpOutputSummary,
  buildPromptExcerpt,
  deriveLinkedEntityTypesFromBrainDump,
  normalizeBrainDumpRequestInput,
  validateBrainDumpRequestInput,
} from "@/lib/ai/brain-dump";
import { decryptProfileSecret } from "@/lib/security/profile-secrets";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  BRAIN_DUMP_RESPONSE_SCHEMA,
  normalizeBrainDumpExtractionResult,
} from "@/types/ai-brain-dump";
import { buildAiSessionIdFromTitle, slugifyAiSessionTitle } from "@/types/ai-session";
import type { Database } from "@/types/database";

const DEFAULT_BRAIN_DUMP_MODEL = "gpt-5-mini";
const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const BRAIN_DUMP_INSTRUCTIONS = [
  "You are helping a fiction author turn a freeform brain dump into structured planning proposals.",
  "Do not invent canon when the text is ambiguous.",
  "Prefer conservative extraction over confident fabrication.",
  "If chronology, identity, or causality is uncertain, place that uncertainty in continuityWarnings or unresolvedQuestions.",
  "Produce planning-ready proposals for characters, timeline events, chapter outlines, and scenes.",
  "Keep summaries concise and useful for later manual review.",
].join(" ");

type AiSessionInsert = Database["public"]["Tables"]["ai_sessions"]["Insert"];

export async function POST(request: Request) {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Sign in before using brain dump extraction." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const input = normalizeBrainDumpRequestInput(body);
  const projectId = typeof body?.projectId === "string" ? body.projectId.trim() : "";

  try {
    validateBrainDumpRequestInput(input);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid brain dump request." },
      { status: 400 }
    );
  }

  if (!projectId) {
    return NextResponse.json({ error: "Active project context is required." }, { status: 400 });
  }

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id, title")
    .eq("user_id", user.id)
    .eq("id", projectId)
    .maybeSingle();

  if (projectError) {
    return NextResponse.json({ error: projectError.message }, { status: 500 });
  }

  if (!project) {
    return NextResponse.json(
      { error: "Active project could not be loaded for this brain dump request." },
      { status: 404 }
    );
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("openai_api_key_encrypted")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  if (!profile?.openai_api_key_encrypted) {
    return NextResponse.json(
      { error: "Save your OpenAI API key in Profile before using brain dump extraction." },
      { status: 400 }
    );
  }

  let openAiApiKey: string;

  try {
    openAiApiKey = decryptProfileSecret(profile.openai_api_key_encrypted);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Your saved OpenAI API key could not be read.",
      },
      { status: 500 }
    );
  }

  const model = DEFAULT_BRAIN_DUMP_MODEL;
  const aiSessionId = await getAvailableAiSessionId(supabase, user.id, project.id, input.title);
  const now = new Date().toISOString();

  const initialInsert: AiSessionInsert = {
    user_id: user.id,
    project_id: project.id,
    id: aiSessionId,
    title: input.title,
    slug: slugifyAiSessionTitle(input.title),
    summary: "Brain dump submitted for AI extraction.",
    description: input.purpose || "AI-assisted brain dump extraction session.",
    status: "in_progress",
    tags: [],
    is_archived: false,
    canon_level: "working",
    confidence: "medium",
    session_type: "brain_dump",
    provider: "openai",
    model,
    purpose: input.purpose,
    prompt_excerpt: buildPromptExcerpt(input.sourceText),
    output_summary: "",
    source_text: input.sourceText,
    source_guidance: input.guidance,
    extraction_status: "processing",
    extraction_error: "",
    extraction_model: model,
    extraction_result: null,
    linked_entity_types: [],
    linked_entity_ids: [],
    messages_count: null,
    created_at: now,
    updated_at: now,
  };

  const { error: insertError } = await supabase.from("ai_sessions").insert(initialInsert);

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  try {
    const response = await fetch(OPENAI_RESPONSES_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openAiApiKey}`,
      },
      body: JSON.stringify({
        model,
        store: false,
        instructions: BRAIN_DUMP_INSTRUCTIONS,
        input: buildBrainDumpModelInput({
          projectTitle: project.title,
          purpose: input.purpose,
          guidance: input.guidance,
          sourceText: input.sourceText,
        }),
        max_output_tokens: 6000,
        text: {
          format: {
            type: "json_schema",
            name: "brain_dump_extraction",
            strict: true,
            schema: BRAIN_DUMP_RESPONSE_SCHEMA,
          },
        },
      }),
      signal: AbortSignal.timeout(90000),
    });

    const responseJson = await response.json().catch(() => null);

    if (!response.ok) {
      const errorMessage = readOpenAiError(responseJson) || "OpenAI brain dump extraction failed.";
      throw new Error(errorMessage);
    }

    const outputText =
      typeof responseJson?.output_text === "string" ? responseJson.output_text : "";

    if (!outputText) {
      throw new Error("OpenAI returned no structured brain dump output.");
    }

    const extractionResult = normalizeBrainDumpExtractionResult(JSON.parse(outputText));

    if (!extractionResult) {
      throw new Error("OpenAI returned invalid structured brain dump output.");
    }

    const extractionResultWithMatches = applyCheapBrainDumpMatching({
      extractionResult,
      ...(await loadExistingMatchRecords({
        supabase,
        uid: user.id,
        projectId: project.id,
        extractionResult,
      })),
    });
    const outputSummary = buildBrainDumpOutputSummary(extractionResultWithMatches);
    const linkedEntityTypes = deriveLinkedEntityTypesFromBrainDump(extractionResultWithMatches);
    const linkedEntityIds = deriveLinkedEntityIdsFromBrainDump(extractionResultWithMatches);

    const { error: updateError } = await supabase
      .from("ai_sessions")
      .update({
        summary: extractionResultWithMatches.summary || "Brain dump extraction completed.",
        description:
          input.purpose ||
          "AI-generated planning proposals extracted from a freeform project brain dump.",
        status: "completed",
        prompt_excerpt: buildPromptExcerpt(input.sourceText),
        output_summary: outputSummary,
        source_guidance: input.guidance,
        extraction_status: "succeeded",
        extraction_error: "",
        extraction_model: model,
        extraction_result: extractionResultWithMatches,
        linked_entity_types: linkedEntityTypes,
        linked_entity_ids: linkedEntityIds,
        messages_count: 2,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id)
      .eq("project_id", project.id)
      .eq("id", aiSessionId);

    if (updateError) {
      throw new Error(updateError.message);
    }

    return NextResponse.json({ aiSessionId });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unable to complete brain dump extraction.";

    await supabase
      .from("ai_sessions")
      .update({
        status: "completed",
        output_summary: "Brain dump extraction failed.",
        extraction_status: "failed",
        extraction_error: errorMessage,
        extraction_model: model,
        messages_count: 1,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id)
      .eq("project_id", project.id)
      .eq("id", aiSessionId);

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

async function getAvailableAiSessionId(
  supabase: Awaited<ReturnType<typeof getSupabaseServerClient>>,
  uid: string,
  projectId: string,
  title: string
) {
  const baseId = buildAiSessionIdFromTitle(title);
  const { data, error } = await supabase
    .from("ai_sessions")
    .select("id")
    .eq("user_id", uid)
    .eq("project_id", projectId);

  if (error) {
    throw new Error(error.message);
  }

  const existingIds = new Set((data ?? []).map((row) => row.id));
  let candidateId = baseId;
  let suffix = 2;

  while (existingIds.has(candidateId)) {
    candidateId = `${baseId}-${suffix}`;
    suffix += 1;
  }

  return candidateId;
}

function readOpenAiError(value: unknown) {
  if (typeof value !== "object" || value === null || !("error" in value)) {
    return null;
  }

  const error = (value as { error?: { message?: unknown } }).error;
  return typeof error?.message === "string" ? error.message : null;
}

async function loadExistingMatchRecords({
  supabase,
  uid,
  projectId,
  extractionResult,
}: {
  supabase: Awaited<ReturnType<typeof getSupabaseServerClient>>;
  uid: string;
  projectId: string;
  extractionResult: NonNullable<ReturnType<typeof normalizeBrainDumpExtractionResult>>;
}) {
  const [
    characterResult,
    timelineEventResult,
    chapterResult,
    sceneResult,
  ] = await Promise.all([
    extractionResult.characters.length > 0
      ? supabase
          .from("characters")
          .select("id, name, aliases")
          .eq("user_id", uid)
          .eq("project_id", projectId)
      : Promise.resolve({ data: [], error: null }),
    extractionResult.timelineEvents.length > 0
      ? supabase
          .from("timeline_events")
          .select("id, title")
          .eq("user_id", uid)
          .eq("project_id", projectId)
      : Promise.resolve({ data: [], error: null }),
    extractionResult.chapterOutlines.length > 0
      ? supabase
          .from("chapters")
          .select("id, title")
          .eq("user_id", uid)
          .eq("project_id", projectId)
      : Promise.resolve({ data: [], error: null }),
    extractionResult.scenes.length > 0
      ? supabase
          .from("scenes")
          .select("id, title")
          .eq("user_id", uid)
          .eq("project_id", projectId)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (characterResult.error) {
    throw new Error(characterResult.error.message);
  }

  if (timelineEventResult.error) {
    throw new Error(timelineEventResult.error.message);
  }

  if (chapterResult.error) {
    throw new Error(chapterResult.error.message);
  }

  if (sceneResult.error) {
    throw new Error(sceneResult.error.message);
  }

  return {
    existingCharacters: (characterResult.data ?? []).map((row) =>
      createMatchRecord("characters", row.id, row.name, row.aliases ?? [])
    ),
    existingTimelineEvents: (timelineEventResult.data ?? []).map((row) =>
      createMatchRecord("timeline_events", row.id, row.title)
    ),
    existingChapters: (chapterResult.data ?? []).map((row) =>
      createMatchRecord("chapters", row.id, row.title)
    ),
    existingScenes: (sceneResult.data ?? []).map((row) =>
      createMatchRecord("scenes", row.id, row.title)
    ),
  };
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
