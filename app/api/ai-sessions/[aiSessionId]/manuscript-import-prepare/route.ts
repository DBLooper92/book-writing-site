import { NextResponse } from "next/server";

import { buildBrainDumpMatchCandidates } from "@/lib/ai/brain-dump-matching";
import {
  buildChunkPlan,
  buildImportBookId,
  MANUSCRIPT_IMPORT_MAX_FILES,
  parseManuscriptTextFromBuffer,
} from "@/lib/ai/manuscript-import";
import { enforceProfileAiCapability } from "@/lib/server/profile-ai-capabilities";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { normalizeManuscriptImportWorkflowState } from "@/types/ai-manuscript-import";

type RouteContext = {
  params: Promise<{
    aiSessionId: string;
  }>;
};

type AttachmentRow = {
  id: string;
  file_name: string;
  mime_type: string;
  storage_bucket: string | null;
  storage_path: string | null;
  file_size_bytes: number | null;
  created_at: string | null;
};

export async function POST(_request: Request, context: RouteContext) {
  const { aiSessionId } = await context.params;
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { error: "Sign in before preparing a manuscript import." },
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

  const { data: aiSession, error: aiSessionError } = await supabase
    .from("ai_sessions")
    .select("id, project_id, session_type, workflow_state")
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

  const { data: attachmentRows, error: attachmentError } = await supabase
    .from("attachments")
    .select("id, file_name, mime_type, storage_bucket, storage_path, file_size_bytes, created_at")
    .eq("user_id", user.id)
    .eq("project_id", aiSession.project_id)
    .eq("attachment_type", "document")
    .eq("linked_entity_type", "ai_sessions")
    .eq("linked_entity_id", aiSessionId)
    .order("created_at", { ascending: true });

  if (attachmentError) {
    return NextResponse.json({ error: attachmentError.message }, { status: 500 });
  }

  const attachments = (attachmentRows ?? []) as AttachmentRow[];

  if (attachments.length === 0) {
    return NextResponse.json(
      { error: "Upload at least one manuscript file before preparing the import." },
      { status: 400 }
    );
  }

  if (attachments.length > MANUSCRIPT_IMPORT_MAX_FILES) {
    return NextResponse.json(
      { error: `You can upload at most ${MANUSCRIPT_IMPORT_MAX_FILES} files at a time.` },
      { status: 400 }
    );
  }

  const { data: existingBooks, error: booksError } = await supabase
    .from("books")
    .select("id, title")
    .eq("user_id", user.id)
    .eq("project_id", aiSession.project_id);

  if (booksError) {
    return NextResponse.json({ error: booksError.message }, { status: 500 });
  }

  const files = [];
  const books = [];
  const parseErrors: string[] = [];

  for (let index = 0; index < attachments.length; index += 1) {
    const attachment = attachments[index];
    const importBookId = buildImportBookId(attachment.file_name, index);
    const fileBase = attachment.file_name.replace(/\.[^/.]+$/, "").trim();
    const title =
      fileBase.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim() || `Imported book ${index + 1}`;

    if (!attachment.storage_bucket || !attachment.storage_path) {
      const parseError = "Storage metadata is missing for this manuscript file.";
      parseErrors.push(parseError);
      files.push({
        attachmentId: attachment.id,
        fileName: attachment.file_name,
        mimeType: attachment.mime_type,
        fileSizeBytes: attachment.file_size_bytes ?? 0,
        parseStatus: "failed" as const,
        parseError,
        plainTextLength: 0,
        importBookId,
      });
      books.push({
        importBookId,
        attachmentId: attachment.id,
        fileName: attachment.file_name,
        title,
        status: "failed" as const,
        parseStatus: "failed" as const,
        parseError,
        plainTextLength: 0,
        processedChunkCount: 0,
        chunkCount: 0,
        lastError: parseError,
        mapping: {
          mappingStatus: "pending" as const,
          suggestedAction: "create" as const,
          targetBookId: null,
          targetBookTitle: title,
          matchedRecord: null,
          matchCandidates: [],
        },
        chunks: [],
      });
      continue;
    }

    try {
      const { data: blob, error: downloadError } = await supabase.storage
        .from(attachment.storage_bucket)
        .download(attachment.storage_path);

      if (downloadError || !blob) {
        throw new Error(downloadError?.message || "Unable to read uploaded manuscript file.");
      }

      const plainText = await parseManuscriptTextFromBuffer({
        arrayBuffer: await blob.arrayBuffer(),
        mimeType: attachment.mime_type,
        fileName: attachment.file_name,
      });

      if (!plainText) {
        throw new Error("The uploaded manuscript file did not contain usable text.");
      }

      const chunks = buildChunkPlan(plainText, importBookId);
      const matchCandidates = buildBrainDumpMatchCandidates(
        title,
        (existingBooks ?? []).map((row) => ({
          entityType: "books" as const,
          recordId: row.id,
          recordLabel: row.title,
          alternateLabels: [],
        }))
      );
      const matchedRecord = chooseMatchedRecord(matchCandidates);

      files.push({
        attachmentId: attachment.id,
        fileName: attachment.file_name,
        mimeType: attachment.mime_type,
        fileSizeBytes: attachment.file_size_bytes ?? 0,
        parseStatus: "parsed" as const,
        parseError: "",
        plainTextLength: plainText.length,
        importBookId,
      });
      books.push({
        importBookId,
        attachmentId: attachment.id,
        fileName: attachment.file_name,
        title,
        status: "pending_mapping" as const,
        parseStatus: "parsed" as const,
        parseError: "",
        plainTextLength: plainText.length,
        processedChunkCount: 0,
        chunkCount: chunks.length,
        lastError: "",
        mapping: {
          mappingStatus: "pending" as const,
          suggestedAction: matchedRecord ? "update" : "create",
          targetBookId: matchedRecord?.recordId ?? null,
          targetBookTitle: matchedRecord?.recordLabel ?? title,
          matchedRecord,
          matchCandidates,
        },
        chunks: chunks.map((chunk) => ({
          chunkId: chunk.chunkId,
          index: chunk.index,
          startOffset: chunk.startOffset,
          endOffset: chunk.endOffset,
          heading: chunk.heading,
          excerpt: chunk.excerpt,
          chapterTitle: chunk.chapterTitle,
          chapterIndex: chunk.chapterIndex,
          chapterChunkIndex: chunk.chapterChunkIndex,
          chapterChunkCount: chunk.chapterChunkCount,
          status: "pending" as const,
          error: "",
        })),
      });
    } catch (error) {
      const parseError =
        error instanceof Error ? error.message : "Unable to parse this manuscript file.";
      parseErrors.push(parseError);
      files.push({
        attachmentId: attachment.id,
        fileName: attachment.file_name,
        mimeType: attachment.mime_type,
        fileSizeBytes: attachment.file_size_bytes ?? 0,
        parseStatus: "failed" as const,
        parseError,
        plainTextLength: 0,
        importBookId,
      });
      books.push({
        importBookId,
        attachmentId: attachment.id,
        fileName: attachment.file_name,
        title,
        status: "failed" as const,
        parseStatus: "failed" as const,
        parseError,
        plainTextLength: 0,
        processedChunkCount: 0,
        chunkCount: 0,
        lastError: parseError,
        mapping: {
          mappingStatus: "pending" as const,
          suggestedAction: "create" as const,
          targetBookId: null,
          targetBookTitle: title,
          matchedRecord: null,
          matchCandidates: [],
        },
        chunks: [],
      });
    }
  }

  const nextWorkflowState = {
    ...workflowState,
    stage: books.some((book) => book.parseStatus === "parsed") ? "mapping" : "failed",
    lastError: parseErrors[0] ?? "",
    files,
    books,
    proposals: workflowState.proposals,
  };

  const { error: updateError } = await supabase
    .from("ai_sessions")
    .update({
      workflow_state: nextWorkflowState,
      output_summary: `${books.filter((book) => book.parseStatus === "parsed").length} books ready for mapping`,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user.id)
    .eq("project_id", aiSession.project_id)
    .eq("id", aiSessionId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({
    workflowState: nextWorkflowState,
  });
}

function chooseMatchedRecord(
  candidates: ReturnType<typeof buildBrainDumpMatchCandidates>
) {
  const [topCandidate, secondCandidate] = candidates;

  if (!topCandidate || typeof topCandidate.score !== "number" || topCandidate.score < 0.95) {
    return null;
  }

  if (
    secondCandidate &&
    typeof secondCandidate.score === "number" &&
    secondCandidate.score >= 0.95
  ) {
    return null;
  }

  return topCandidate;
}
