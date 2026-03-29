import "client-only";

import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { Database } from "@/types/database";
import {
  buildAiSessionIdFromTitle,
  buildAiSessionDocument,
  coerceAiSessionCanonLevel,
  coerceAiSessionConfidence,
  coerceAiSessionExtractionStatus,
  coerceAiSessionStatus,
  coerceAiSessionType,
  normalizeAiSessionExtractionResult,
  slugifyAiSessionTitle,
  type AiSession,
  type NormalizedAiSessionFormValues,
} from "@/types/ai-session";

type AiSessionRow = Database["public"]["Tables"]["ai_sessions"]["Row"];

export async function getAiSessionsForProject(uid: string, projectId: string) {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("ai_sessions")
    .select("*")
    .eq("user_id", uid)
    .eq("project_id", projectId);

  if (error) {
    throw error;
  }

  return (data ?? [])
    .map((row) => normalizeAiSessionRow(row as AiSessionRow))
    .sort(compareAiSessions);
}

export async function getAiSessionById(uid: string, projectId: string, aiSessionId: string) {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("ai_sessions")
    .select("*")
    .eq("user_id", uid)
    .eq("project_id", projectId)
    .eq("id", aiSessionId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? normalizeAiSessionRow(data as AiSessionRow) : null;
}

export async function createAiSessionForProject(
  uid: string,
  projectId: string,
  values: NormalizedAiSessionFormValues
) {
  const title = values.title.trim();

  if (!title) {
    throw new Error("AI session title is required.");
  }

  const aiSessionId = await getAvailableAiSessionId(uid, projectId, title);
  const supabase = getSupabaseBrowserClient();
  const now = new Date().toISOString();
  const aiSessionDocument = buildAiSessionDocument({
    id: aiSessionId,
    projectId,
    values,
  });

  const { error } = await supabase.from("ai_sessions").insert({
    user_id: uid,
    project_id: projectId,
    id: aiSessionId,
    title: aiSessionDocument.title,
    slug: aiSessionDocument.slug,
    summary: aiSessionDocument.summary,
    description: aiSessionDocument.description,
    status: aiSessionDocument.status,
    tags: aiSessionDocument.tags,
    is_archived: aiSessionDocument.isArchived,
    canon_level: aiSessionDocument.canonLevel,
    confidence: aiSessionDocument.confidence,
    session_type: aiSessionDocument.sessionType,
    provider: aiSessionDocument.provider,
    model: aiSessionDocument.model,
    purpose: aiSessionDocument.purpose,
    prompt_excerpt: aiSessionDocument.promptExcerpt,
    output_summary: aiSessionDocument.outputSummary,
    source_text: aiSessionDocument.sourceText,
    source_guidance: aiSessionDocument.sourceGuidance,
    extraction_status: aiSessionDocument.extractionStatus,
    extraction_error: aiSessionDocument.extractionError,
    extraction_model: aiSessionDocument.extractionModel,
    extraction_result: aiSessionDocument.extractionResult,
    linked_entity_types: aiSessionDocument.linkedEntityTypes,
    linked_entity_ids: aiSessionDocument.linkedEntityIds,
    messages_count: aiSessionDocument.messagesCount,
    created_at: now,
    updated_at: now,
  });

  if (error) {
    throw error;
  }

  return aiSessionId;
}

export async function updateAiSessionForProject(
  uid: string,
  projectId: string,
  aiSessionId: string,
  values: NormalizedAiSessionFormValues
) {
  const title = values.title.trim();

  if (!title) {
    throw new Error("AI session title is required.");
  }

  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase
    .from("ai_sessions")
    .update({
      title,
      slug: slugifyAiSessionTitle(title),
      summary: values.summary,
      description: values.description,
      status: values.status,
      is_archived: values.status === "archived",
      session_type: values.sessionType,
      provider: values.provider,
      model: values.model,
      purpose: values.purpose,
      prompt_excerpt: values.promptExcerpt,
      output_summary: values.outputSummary,
      linked_entity_types: values.linkedEntityTypes,
      linked_entity_ids: values.linkedEntityIds,
      messages_count: values.messagesCount,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", uid)
    .eq("project_id", projectId)
    .eq("id", aiSessionId);

  if (error) {
    throw error;
  }
}

async function getAvailableAiSessionId(uid: string, projectId: string, title: string) {
  const baseId = buildAiSessionId(title);
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("ai_sessions")
    .select("id")
    .eq("user_id", uid)
    .eq("project_id", projectId);

  if (error) {
    throw error;
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

function normalizeAiSessionRow(row: AiSessionRow): AiSession {
  const status = coerceAiSessionStatus(row.status);

  return {
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    slug: row.slug || slugifyAiSessionTitle(row.title),
    summary: row.summary || "",
    description: row.description || "",
    status,
    tags: row.tags ?? [],
    isArchived: row.is_archived ?? status === "archived",
    canonLevel: coerceAiSessionCanonLevel(row.canon_level),
    confidence: coerceAiSessionConfidence(row.confidence),
    sessionType: coerceAiSessionType(row.session_type),
    provider: row.provider || "",
    model: row.model || "",
    purpose: row.purpose || "",
    promptExcerpt: row.prompt_excerpt || "",
    outputSummary: row.output_summary || "",
    sourceText: row.source_text || "",
    sourceGuidance: row.source_guidance || "",
    extractionStatus: coerceAiSessionExtractionStatus(row.extraction_status),
    extractionError: row.extraction_error || "",
    extractionModel: row.extraction_model || "",
    extractionResult: normalizeAiSessionExtractionResult(row.extraction_result),
    linkedEntityTypes: row.linked_entity_types ?? [],
    linkedEntityIds: row.linked_entity_ids ?? [],
    messagesCount: row.messages_count,
    createdAt: readDateOrNull(row.created_at),
    updatedAt: readDateOrNull(row.updated_at),
  };
}

function buildAiSessionId(title: string) {
  return buildAiSessionIdFromTitle(title);
}

function compareAiSessions(left: AiSession, right: AiSession) {
  return left.title.localeCompare(right.title);
}

function readDateOrNull(value: string | null) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
