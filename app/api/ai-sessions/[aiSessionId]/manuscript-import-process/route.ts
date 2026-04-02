import { NextResponse } from "next/server";

import {
  buildManuscriptImportModelInput,
  MANUSCRIPT_IMPORT_OPENAI_MAX_OUTPUT_TOKENS,
  MANUSCRIPT_IMPORT_OPENAI_TIMEOUT_MS,
  normalizeManuscriptChunkExtractionResult,
  MANUSCRIPT_IMPORT_RESPONSE_SCHEMA,
  parseManuscriptTextFromBuffer,
  sliceChunkText,
} from "@/lib/ai/manuscript-import";
import { applyManuscriptImportMatching, createMatchRecord } from "@/lib/ai/manuscript-import-matching";
import {
  appendChunkExtractionToWorkflowState,
  consolidateManuscriptImportWorkflowState,
} from "@/lib/ai/manuscript-import-workflow";
import { decryptProfileSecret } from "@/lib/security/profile-secrets";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  normalizeManuscriptImportWorkflowState,
  type ManuscriptImportWorkflowState,
} from "@/types/ai-manuscript-import";

const DEFAULT_MANUSCRIPT_IMPORT_MODEL = "gpt-5-mini";
const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const MANUSCRIPT_IMPORT_INSTRUCTIONS = [
  "You are helping a fiction author turn imported manuscript text into reviewable canon proposals.",
  "Do not invent canon when the imported text is ambiguous.",
  "Prefer conservative extraction and explicit uncertainty.",
  "Extract only what is grounded in the provided chunk.",
  "Return review-ready proposals for characters, locations, plot threads, timeline events, chapters, and scenes.",
].join(" ");

type RouteContext = {
  params: Promise<{
    aiSessionId: string;
  }>;
};

type ProcessInput = {
  importBookId: string;
};

type AttachmentRow = {
  id: string;
  file_name: string;
  mime_type: string;
  storage_bucket: string | null;
  storage_path: string | null;
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
      { error: "Sign in before processing a manuscript import." },
      { status: 401 }
    );
  }

  let input: ProcessInput;

  try {
    input = normalizeProcessInput(await request.json());
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Invalid manuscript processing request.",
      },
      { status: 400 }
    );
  }

  const { data: aiSession, error: aiSessionError } = await supabase
    .from("ai_sessions")
    .select("id, project_id, title, purpose, source_guidance, session_type, workflow_state")
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

  const importBook = workflowState.books.find((entry) => entry.importBookId === input.importBookId);
  const hasUnmappedParsedBooks = workflowState.books.some(
    (entry) => entry.parseStatus === "parsed" && entry.mapping.mappingStatus !== "saved"
  );

  if (!importBook) {
    return NextResponse.json({ error: "Imported book not found." }, { status: 404 });
  }

  if (hasUnmappedParsedBooks) {
    return NextResponse.json(
      { error: "Map every parsed manuscript file to a target book before processing begins." },
      { status: 400 }
    );
  }

  if (importBook.mapping.mappingStatus !== "saved" || !importBook.mapping.targetBookId) {
    return NextResponse.json(
      { error: "Map this manuscript to a target book before processing it." },
      { status: 400 }
    );
  }

  const nextChunk = importBook.chunks.find(
    (chunk) => chunk.status === "pending" || chunk.status === "failed"
  );

  if (!nextChunk) {
    const completedState = finalizeBookState(workflowState, input.importBookId);
    return NextResponse.json({ workflowState: completedState, complete: true });
  }

  const [{ data: project }, { data: profile }, { data: attachment, error: attachmentError }] =
    await Promise.all([
      supabase
        .from("projects")
        .select("title")
        .eq("user_id", user.id)
        .eq("id", aiSession.project_id)
        .maybeSingle(),
      supabase
        .from("profiles")
        .select("openai_api_key_encrypted")
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("attachments")
        .select("id, file_name, mime_type, storage_bucket, storage_path")
        .eq("user_id", user.id)
        .eq("project_id", aiSession.project_id)
        .eq("id", importBook.attachmentId)
        .maybeSingle(),
    ]);

  if (attachmentError) {
    return NextResponse.json({ error: attachmentError.message }, { status: 500 });
  }

  if (!profile?.openai_api_key_encrypted) {
    return NextResponse.json(
      { error: "Save your OpenAI API key in Profile before processing manuscript imports." },
      { status: 400 }
    );
  }

  if (!attachment) {
    return NextResponse.json({ error: "Linked manuscript attachment not found." }, { status: 404 });
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

  try {
    const chunkText = await loadChunkText({
      supabase,
      attachment: attachment as AttachmentRow,
      chunk: nextChunk,
    });
    const response = await fetch(OPENAI_RESPONSES_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openAiApiKey}`,
      },
      body: JSON.stringify({
        model: DEFAULT_MANUSCRIPT_IMPORT_MODEL,
        store: false,
        instructions: MANUSCRIPT_IMPORT_INSTRUCTIONS,
        input: buildManuscriptImportModelInput({
          projectTitle: project?.title || "Untitled project",
          bookTitle: importBook.title,
          purpose: aiSession.purpose || "",
          guidance: aiSession.source_guidance || "",
          chunkHeading: nextChunk.heading,
          sourceText: chunkText,
        }),
        max_output_tokens: MANUSCRIPT_IMPORT_OPENAI_MAX_OUTPUT_TOKENS,
        text: {
          format: {
            type: "json_schema",
            name: "manuscript_import_chunk_extraction",
            strict: true,
            schema: MANUSCRIPT_IMPORT_RESPONSE_SCHEMA,
          },
        },
      }),
      signal: AbortSignal.timeout(MANUSCRIPT_IMPORT_OPENAI_TIMEOUT_MS),
    });

    const responseText = await response.text().catch(() => null);
    const responseJson = parseJsonString(responseText);

    if (!response.ok) {
      return await handleChunkFailure({
        supabase,
        uid: user.id,
        aiSessionId,
        projectId: aiSession.project_id,
        workflowState,
        importBookId: input.importBookId,
        chunkId: nextChunk.chunkId,
        errorMessage:
          readOpenAiError(responseJson) ||
          `OpenAI manuscript import failed with status ${response.status}.`,
      });
    }

    const structuredOutput = extractStructuredOutput(responseJson);
    const extractionResult = normalizeManuscriptChunkExtractionResult(structuredOutput);

    if (!extractionResult) {
      return await handleChunkFailure({
        supabase,
        uid: user.id,
        aiSessionId,
        projectId: aiSession.project_id,
        workflowState,
        importBookId: input.importBookId,
        chunkId: nextChunk.chunkId,
        errorMessage:
          readOpenAiIncompleteReason(responseJson) === "max_output_tokens"
            ? "OpenAI stopped before finishing the structured manuscript chunk output."
            : "OpenAI returned no structured manuscript chunk output.",
      });
    }

    let nextWorkflowState = appendChunkExtractionToWorkflowState({
      workflowState,
      importBookId: input.importBookId,
      attachmentId: importBook.attachmentId,
      chunkId: nextChunk.chunkId,
      targetBookId: importBook.mapping.targetBookId,
      extractionResult,
    });

    nextWorkflowState = {
      ...nextWorkflowState,
      books: nextWorkflowState.books.map((entry) =>
        entry.importBookId === input.importBookId
          ? {
              ...entry,
              status:
                entry.processedChunkCount + 1 >= entry.chunkCount
                  ? ("ready_for_review" as const)
                  : ("processing" as const),
              processedChunkCount: Math.min(entry.processedChunkCount + 1, entry.chunkCount),
              lastError: "",
              chunks: entry.chunks.map((chunk) =>
                chunk.chunkId === nextChunk.chunkId
                  ? { ...chunk, status: "processed" as const, error: "" }
                  : chunk
              ),
            }
          : entry
      ),
    };
    nextWorkflowState = consolidateManuscriptImportWorkflowState(nextWorkflowState);
    nextWorkflowState = applyManuscriptImportMatching(
      nextWorkflowState,
      await loadExistingMatchRecords({
        supabase,
        uid: user.id,
        projectId: aiSession.project_id,
      })
    );
    nextWorkflowState = finalizeBookState(nextWorkflowState, input.importBookId);

    const { error: updateError } = await supabase
      .from("ai_sessions")
      .update({
        workflow_state: nextWorkflowState,
        output_summary: buildOutputSummary(nextWorkflowState),
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id)
      .eq("project_id", aiSession.project_id)
      .eq("id", aiSessionId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    const updatedBook = nextWorkflowState.books.find((entry) => entry.importBookId === input.importBookId);

    return NextResponse.json({
      workflowState: nextWorkflowState,
      complete: updatedBook?.status === "ready_for_review",
    });
  } catch (error) {
    return await handleChunkFailure({
      supabase,
      uid: user.id,
      aiSessionId,
      projectId: aiSession.project_id,
      workflowState,
      importBookId: input.importBookId,
      chunkId: nextChunk.chunkId,
      errorMessage:
        error instanceof Error ? error.message : "Unable to process this manuscript chunk.",
    });
  }
}

function normalizeProcessInput(value: unknown): ProcessInput {
  if (!isRecord(value)) {
    throw new Error("A JSON body is required.");
  }

  const importBookId =
    typeof value.importBookId === "string" ? value.importBookId.trim() : "";

  if (!importBookId) {
    throw new Error("Imported book ID is required.");
  }

  return { importBookId };
}

async function loadChunkText({
  supabase,
  attachment,
  chunk,
}: {
  supabase: Awaited<ReturnType<typeof getSupabaseServerClient>>;
  attachment: AttachmentRow;
  chunk: {
    startOffset: number;
    endOffset: number;
  };
}) {
  if (!attachment.storage_bucket || !attachment.storage_path) {
    throw new Error("Storage metadata is missing for this manuscript attachment.");
  }

  const { data: blob, error } = await supabase.storage
    .from(attachment.storage_bucket)
    .download(attachment.storage_path);

  if (error || !blob) {
    throw new Error(error?.message || "Unable to download manuscript attachment.");
  }

  const plainText = await parseManuscriptTextFromBuffer({
    arrayBuffer: await blob.arrayBuffer(),
    mimeType: attachment.mime_type,
    fileName: attachment.file_name,
  });

  const chunkText = sliceChunkText(plainText, chunk);

  if (!chunkText) {
    throw new Error("The selected manuscript chunk is empty.");
  }

  return chunkText;
}

async function loadExistingMatchRecords({
  supabase,
  uid,
  projectId,
}: {
  supabase: Awaited<ReturnType<typeof getSupabaseServerClient>>;
  uid: string;
  projectId: string;
}) {
  const [
    booksResult,
    charactersResult,
    locationsResult,
    plotThreadsResult,
    timelineEventsResult,
    chaptersResult,
    scenesResult,
  ] = await Promise.all([
    supabase.from("books").select("id, title").eq("user_id", uid).eq("project_id", projectId),
    supabase
      .from("characters")
      .select("id, name, aliases")
      .eq("user_id", uid)
      .eq("project_id", projectId),
    supabase.from("locations").select("id, name").eq("user_id", uid).eq("project_id", projectId),
    supabase
      .from("plot_threads")
      .select("id, title")
      .eq("user_id", uid)
      .eq("project_id", projectId),
    supabase
      .from("timeline_events")
      .select("id, title")
      .eq("user_id", uid)
      .eq("project_id", projectId),
    supabase
      .from("chapters")
      .select("id, title, book_id")
      .eq("user_id", uid)
      .eq("project_id", projectId),
    supabase
      .from("scenes")
      .select("id, title, book_id")
      .eq("user_id", uid)
      .eq("project_id", projectId),
  ]);

  for (const result of [
    booksResult,
    charactersResult,
    locationsResult,
    plotThreadsResult,
    timelineEventsResult,
    chaptersResult,
    scenesResult,
  ]) {
    if (result.error) {
      throw new Error(result.error.message);
    }
  }

  return {
    books: (booksResult.data ?? []).map((row) => createMatchRecord("books", row.id, row.title)),
    characters: (charactersResult.data ?? []).map((row) =>
      createMatchRecord("characters", row.id, row.name, row.aliases ?? [])
    ),
    locations: (locationsResult.data ?? []).map((row) =>
      createMatchRecord("locations", row.id, row.name)
    ),
    plotThreads: (plotThreadsResult.data ?? []).map((row) =>
      createMatchRecord("plot_threads", row.id, row.title)
    ),
    timelineEvents: (timelineEventsResult.data ?? []).map((row) =>
      createMatchRecord("timeline_events", row.id, row.title)
    ),
    chapters: (chaptersResult.data ?? []).map((row) =>
      createMatchRecord("chapters", row.id, row.title, [], { bookId: row.book_id })
    ),
    scenes: (scenesResult.data ?? []).map((row) =>
      createMatchRecord("scenes", row.id, row.title, [], { bookId: row.book_id })
    ),
  };
}

function finalizeBookState(
  workflowState: ManuscriptImportWorkflowState,
  importBookId: string
) {
  const nextBooks = workflowState.books.map((entry) => {
    if (entry.importBookId !== importBookId) {
      return entry;
    }

    const hasPendingChunks = entry.chunks.some(
      (chunk) => chunk.status === "pending" || chunk.status === "failed"
    );

    return {
      ...entry,
      status: hasPendingChunks ? entry.status : ("ready_for_review" as const),
    };
  });
  const hasPendingMappings = nextBooks.some(
    (entry) => entry.parseStatus === "parsed" && entry.mapping.mappingStatus !== "saved"
  );
  const hasProcessableBooks = nextBooks.some(
    (entry) =>
      entry.mapping.mappingStatus === "saved" &&
      entry.chunks.some((chunk) => chunk.status === "pending" || chunk.status === "failed")
  );
  const nextStage: ManuscriptImportWorkflowState["stage"] = hasPendingMappings
    ? "mapping"
    : hasProcessableBooks
      ? "ready_to_process"
      : "review";

  return {
    ...workflowState,
    stage: nextStage,
    books: nextBooks,
  };
}

async function handleChunkFailure({
  supabase,
  uid,
  aiSessionId,
  projectId,
  workflowState,
  importBookId,
  chunkId,
  errorMessage,
}: {
  supabase: Awaited<ReturnType<typeof getSupabaseServerClient>>;
  uid: string;
  aiSessionId: string;
  projectId: string;
  workflowState: ManuscriptImportWorkflowState;
  importBookId: string;
  chunkId: string;
  errorMessage: string;
}) {
  const nextWorkflowState = {
    ...workflowState,
    stage: "failed" as const,
    lastError: errorMessage,
    books: workflowState.books.map((entry) =>
      entry.importBookId === importBookId
        ? {
            ...entry,
            status: "failed" as const,
            lastError: errorMessage,
            chunks: entry.chunks.map((chunk) =>
              chunk.chunkId === chunkId ? { ...chunk, status: "failed" as const, error: errorMessage } : chunk
            ),
          }
        : entry
    ),
  };

  await supabase
    .from("ai_sessions")
    .update({
      workflow_state: nextWorkflowState,
      extraction_error: errorMessage,
      output_summary: errorMessage,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", uid)
    .eq("project_id", projectId)
    .eq("id", aiSessionId);

  return NextResponse.json({ error: errorMessage }, { status: 500 });
}

function buildOutputSummary(
  workflowState: ManuscriptImportWorkflowState
) {
  return [
    `${workflowState.proposals.characters.length} characters`,
    `${workflowState.proposals.locations.length} locations`,
    `${workflowState.proposals.plotThreads.length} plot threads`,
    `${workflowState.proposals.timelineEvents.length} timeline events`,
    `${workflowState.proposals.chapters.length} chapters`,
    `${workflowState.proposals.scenes.length} scenes`,
  ].join(", ");
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

function extractStructuredOutput(value: unknown) {
  if (!isRecord(value)) {
    return null;
  }

  if (isRecord(value.output_parsed)) {
    return value.output_parsed;
  }

  const textCandidates = new Set<string>();

  if (typeof value.output_text === "string" && value.output_text.trim()) {
    textCandidates.add(value.output_text);
  }

  if (Array.isArray(value.output)) {
    for (const outputItem of value.output) {
      if (!isRecord(outputItem) || !Array.isArray(outputItem.content)) {
        continue;
      }

      for (const contentItem of outputItem.content) {
        if (!isRecord(contentItem)) {
          continue;
        }

        if (isRecord(contentItem.parsed)) {
          return contentItem.parsed;
        }

        if (typeof contentItem.text === "string" && contentItem.text.trim()) {
          textCandidates.add(contentItem.text);
        }
      }
    }
  }

  for (const candidate of textCandidates) {
    try {
      const parsed = JSON.parse(candidate);
      if (isRecord(parsed)) {
        return parsed;
      }
    } catch {
      continue;
    }
  }

  return null;
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
