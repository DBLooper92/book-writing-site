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
  BRAIN_DUMP_OPENAI_MAX_OUTPUT_TOKENS,
  BRAIN_DUMP_OPENAI_TIMEOUT_MS,
  deriveLinkedEntityTypesFromBrainDump,
  normalizeBrainDumpRequestInput,
  validateBrainDumpRequestInput,
} from "@/lib/ai/brain-dump";
import { decryptProfileSecret } from "@/lib/security/profile-secrets";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type {
  BrainDumpFailureDebugInfo,
  BrainDumpFailureType,
} from "@/types/ai-brain-dump-debug";
import {
  BRAIN_DUMP_RESPONSE_SCHEMA,
  normalizeBrainDumpExtractionResult,
} from "@/types/ai-brain-dump";
import { buildAiSessionIdFromTitle, slugifyAiSessionTitle } from "@/types/ai-session";
import type { Database, Json } from "@/types/database";

const DEFAULT_BRAIN_DUMP_MODEL = "gpt-5-mini";
const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const OPENAI_RAW_RESPONSE_PREVIEW_LIMIT = 20000;
const BRAIN_DUMP_INSTRUCTIONS = [
  "You are helping a fiction author turn a freeform brain dump into structured planning proposals.",
  "Do not invent canon when the text is ambiguous.",
  "Prefer conservative extraction over confident fabrication.",
  "If chronology, identity, or causality is uncertain, place that uncertainty in continuityWarnings or unresolvedQuestions.",
  "Produce planning-ready proposals for characters, timeline events, chapter outlines, and scenes.",
  "Keep summaries concise and useful for later manual review.",
].join(" ");

type AiSessionInsert = Database["public"]["Tables"]["ai_sessions"]["Insert"];
type BrainDumpFailureError = Error & { debugInfo: BrainDumpFailureDebugInfo };
type BrainDumpRequestDebugContext = {
  aiSessionId: string;
  model: string;
  sourceLength: number;
  guidanceLength: number;
  purposeLength: number;
  promptLength: number;
  requestStartedAt: number;
};

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
  const modelInput = buildBrainDumpModelInput({
    projectTitle: project.title,
    purpose: input.purpose,
    guidance: input.guidance,
    sourceText: input.sourceText,
  });
  const requestDebugContext: BrainDumpRequestDebugContext = {
    aiSessionId,
    model,
    sourceLength: input.sourceText.length,
    guidanceLength: input.guidance.length,
    purposeLength: input.purpose.length,
    promptLength: modelInput.length,
    requestStartedAt: Date.now(),
  };

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
        input: modelInput,
        max_output_tokens: BRAIN_DUMP_OPENAI_MAX_OUTPUT_TOKENS,
        text: {
          format: {
            type: "json_schema",
            name: "brain_dump_extraction",
            strict: true,
            schema: BRAIN_DUMP_RESPONSE_SCHEMA,
          },
        },
      }),
      signal: AbortSignal.timeout(BRAIN_DUMP_OPENAI_TIMEOUT_MS),
    });

    const responseText = await response.text().catch(() => null);
    const responseJson = parseJsonString(responseText);

    if (!response.ok) {
      const errorMessage =
        readOpenAiError(responseJson) ||
        `OpenAI brain dump extraction failed with status ${response.status}.`;

      throw createBrainDumpFailureError(
        errorMessage,
        buildBrainDumpFailureDebugInfo({
          context: requestDebugContext,
          failureType: "provider_error",
          errorMessage,
          error: null,
          openAiStatus: response.status,
          openAiRequestId: readOpenAiRequestId(response),
          openAiProcessingMs: response.headers.get("openai-processing-ms"),
          responseJson,
          responseText,
        })
      );
    }

    const structuredOutput = extractStructuredBrainDumpOutput(responseJson);

    if (!structuredOutput) {
      const incompleteReason = readOpenAiIncompleteReason(responseJson);
      const errorMessage =
        incompleteReason === "max_output_tokens"
          ? "OpenAI stopped before finishing the structured brain dump output. Try a smaller dump or split it into multiple passes."
          : "OpenAI returned no structured brain dump output.";

      throw createBrainDumpFailureError(
        errorMessage,
        buildBrainDumpFailureDebugInfo({
          context: requestDebugContext,
          failureType: "missing_structured_output",
          errorMessage,
          error: null,
          openAiStatus: response.status,
          openAiRequestId: readOpenAiRequestId(response),
          openAiProcessingMs: response.headers.get("openai-processing-ms"),
          responseJson,
          responseText,
        })
      );
    }

    const extractionResult = normalizeBrainDumpExtractionResult(structuredOutput as Json);

    if (!extractionResult) {
      const errorMessage = "OpenAI returned invalid structured brain dump output.";

      throw createBrainDumpFailureError(
        errorMessage,
        buildBrainDumpFailureDebugInfo({
          context: requestDebugContext,
          failureType: "invalid_structured_output",
          errorMessage,
          error: null,
          openAiStatus: response.status,
          openAiRequestId: readOpenAiRequestId(response),
          openAiProcessingMs: response.headers.get("openai-processing-ms"),
          responseJson,
          responseText,
        })
      );
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
    const debugInfo = isBrainDumpFailureError(error)
      ? error.debugInfo
      : buildBrainDumpFailureDebugInfo({
          context: requestDebugContext,
          failureType: isTimeoutError(error) ? "timeout" : "unknown",
          errorMessage,
          error,
        });

    console.error("Brain dump extraction failed.", debugInfo);

    await supabase
      .from("ai_sessions")
      .update({
        status: "completed",
        output_summary: buildBrainDumpFailureSummary(debugInfo),
        extraction_status: "failed",
        extraction_error: errorMessage,
        extraction_model: model,
        messages_count: 1,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id)
      .eq("project_id", project.id)
      .eq("id", aiSessionId);

    return NextResponse.json({ error: errorMessage, aiSessionId, debug: debugInfo }, { status: 500 });
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

function readOpenAiIncompleteReason(value: unknown) {
  if (!isRecord(value) || !isRecord(value.incomplete_details)) {
    return null;
  }

  return typeof value.incomplete_details.reason === "string"
    ? value.incomplete_details.reason
    : null;
}

function extractStructuredBrainDumpOutput(value: unknown) {
  if (!isRecord(value)) {
    return null;
  }

  const parsedCandidate = readParsedCandidate(value.output_parsed);

  if (parsedCandidate) {
    return parsedCandidate;
  }

  const textCandidates = new Set<string>();

  if (typeof value.output_text === "string" && value.output_text.trim()) {
    textCandidates.add(value.output_text);
  }

  for (const textCandidate of readStructuredOutputTextCandidates(value.output)) {
    textCandidates.add(textCandidate);
  }

  for (const textCandidate of textCandidates) {
    try {
      const parsed = JSON.parse(textCandidate);
      const parsedCandidateFromText = readParsedCandidate(parsed);

      if (parsedCandidateFromText) {
        return parsedCandidateFromText;
      }
    } catch {
      continue;
    }
  }

  return null;
}

function readStructuredOutputTextCandidates(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const textCandidates: string[] = [];

  for (const outputItem of value) {
    if (!isRecord(outputItem) || !Array.isArray(outputItem.content)) {
      continue;
    }

    for (const contentItem of outputItem.content) {
      if (!isRecord(contentItem)) {
        continue;
      }

      const parsedCandidate = readParsedCandidate(contentItem.parsed);

      if (parsedCandidate) {
        return [JSON.stringify(parsedCandidate)];
      }

      if (typeof contentItem.text === "string" && contentItem.text.trim()) {
        textCandidates.push(contentItem.text);
      }

      if (typeof contentItem.output_text === "string" && contentItem.output_text.trim()) {
        textCandidates.push(contentItem.output_text);
      }
    }
  }

  return textCandidates;
}

function readParsedCandidate(value: unknown) {
  return isRecord(value) ? value : null;
}

function summarizeOpenAiResponse(value: unknown, responseTextLength = 0) {
  if (!isRecord(value)) {
    return {
      id: null,
      status: null,
      incompleteReason: null,
      responseTextLength,
      outputTextLength: 0,
      outputTypes: [],
      contentTypes: [],
    };
  }

  return {
    id: typeof value.id === "string" ? value.id : null,
    status: typeof value.status === "string" ? value.status : null,
    incompleteReason: readOpenAiIncompleteReason(value),
    responseTextLength,
    outputTextLength: typeof value.output_text === "string" ? value.output_text.length : 0,
    outputTypes: Array.isArray(value.output)
      ? value.output
          .map((item) => (isRecord(item) && typeof item.type === "string" ? item.type : null))
          .filter((item): item is string => Boolean(item))
      : [],
    contentTypes: Array.isArray(value.output)
      ? value.output.flatMap((item) =>
          isRecord(item) && Array.isArray(item.content)
            ? item.content
                .map((contentItem) =>
                  isRecord(contentItem) && typeof contentItem.type === "string"
                    ? contentItem.type
                    : null
                )
                .filter((contentType): contentType is string => Boolean(contentType))
            : []
        )
      : [],
  };
}

function buildBrainDumpFailureDebugInfo({
  context,
  failureType,
  errorMessage,
  error,
  openAiStatus = null,
  openAiRequestId = null,
  openAiProcessingMs = null,
  responseJson = null,
  responseText = null,
}: {
  context: BrainDumpRequestDebugContext;
  failureType: BrainDumpFailureType;
  errorMessage: string;
  error: unknown;
  openAiStatus?: number | null;
  openAiRequestId?: string | null;
  openAiProcessingMs?: string | null;
  responseJson?: unknown;
  responseText?: string | null;
}): BrainDumpFailureDebugInfo {
  return {
    aiSessionId: context.aiSessionId,
    model: context.model,
    timeoutMs: BRAIN_DUMP_OPENAI_TIMEOUT_MS,
    maxOutputTokens: BRAIN_DUMP_OPENAI_MAX_OUTPUT_TOKENS,
    sourceLength: context.sourceLength,
    guidanceLength: context.guidanceLength,
    purposeLength: context.purposeLength,
    promptLength: context.promptLength,
    startedAt: new Date(context.requestStartedAt).toISOString(),
    elapsedMs: Math.max(Date.now() - context.requestStartedAt, 0),
    failureType,
    openAiStatus,
    openAiRequestId,
    openAiProcessingMs,
    responseSummary:
      responseJson !== null || responseText
        ? summarizeOpenAiResponse(responseJson, responseText?.length ?? 0)
        : null,
    rawResponsePreview: responseText ? truncateText(responseText, OPENAI_RAW_RESPONSE_PREVIEW_LIMIT) : null,
    errorName: error instanceof Error ? error.name : null,
    errorMessage,
    fixHints: buildBrainDumpFixHints({
      failureType,
      errorMessage,
      sourceLength: context.sourceLength,
      promptLength: context.promptLength,
      responseJson,
    }),
  };
}

function buildBrainDumpFixHints({
  failureType,
  errorMessage,
  sourceLength,
  promptLength,
  responseJson,
}: {
  failureType: BrainDumpFailureType;
  errorMessage: string;
  sourceLength: number;
  promptLength: number;
  responseJson: unknown;
}) {
  const hints: string[] = [];

  if (failureType === "timeout") {
    hints.push(
      `The server aborted the OpenAI call after ${Math.round(BRAIN_DUMP_OPENAI_TIMEOUT_MS / 1000)} seconds without a complete response body.`
    );
  }

  if (readOpenAiIncompleteReason(responseJson) === "max_output_tokens") {
    hints.push(
      `OpenAI reported max_output_tokens exhaustion. The current cap is ${BRAIN_DUMP_OPENAI_MAX_OUTPUT_TOKENS.toLocaleString()} output tokens.`
    );
  }

  if (sourceLength >= 25000 || promptLength >= 30000) {
    hints.push(
      "This dump is large enough that chunking into multiple passes will usually be more reliable than one extraction request."
    );
  }

  if (
    errorMessage.toLowerCase().includes("context") ||
    errorMessage.toLowerCase().includes("maximum context")
  ) {
    hints.push("The combined instructions, guidance, and source text may be too large for a single request.");
  }

  if (hints.length === 0) {
    hints.push("Check the response summary and raw preview below to decide whether the next step is a larger timeout, higher output cap, or chunking.");
  }

  return hints;
}

function buildBrainDumpFailureSummary(debugInfo: BrainDumpFailureDebugInfo) {
  const elapsedSeconds = (debugInfo.elapsedMs / 1000).toFixed(1);

  if (debugInfo.failureType === "timeout") {
    return `Brain dump extraction timed out after ${elapsedSeconds}s.`;
  }

  return `Brain dump extraction failed after ${elapsedSeconds}s (${debugInfo.failureType.replace(/_/g, " ")}).`;
}

function createBrainDumpFailureError(errorMessage: string, debugInfo: BrainDumpFailureDebugInfo) {
  const error = new Error(errorMessage) as BrainDumpFailureError;
  error.debugInfo = debugInfo;
  return error;
}

function isBrainDumpFailureError(error: unknown): error is BrainDumpFailureError {
  return error instanceof Error && "debugInfo" in error;
}

function isTimeoutError(error: unknown) {
  return (
    error instanceof Error &&
    (error.name === "TimeoutError" ||
      error.name === "AbortError" ||
      error.message.toLowerCase().includes("aborted due to timeout"))
  );
}

function parseJsonString(value: string | null) {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function readOpenAiRequestId(response: Response) {
  return (
    response.headers.get("x-request-id") ||
    response.headers.get("request-id") ||
    response.headers.get("openai-request-id")
  );
}

function truncateText(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength)}\n... [truncated ${value.length - maxLength} chars]`;
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
