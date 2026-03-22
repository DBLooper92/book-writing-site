import "client-only";

import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { Database } from "@/types/database";
import {
  buildGlossaryTermDocument,
  coerceGlossaryTermCanonLevel,
  coerceGlossaryTermConfidence,
  coerceGlossaryTermStatus,
  slugifyGlossaryTermTitle,
  type GlossaryTerm,
  type NormalizedGlossaryTermFormValues,
} from "@/types/glossary-term";

type GlossaryTermRow = Database["public"]["Tables"]["glossary_terms"]["Row"];

export async function getGlossaryTermsForProject(uid: string, projectId: string) {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("glossary_terms")
    .select("*")
    .eq("user_id", uid)
    .eq("project_id", projectId);

  if (error) {
    throw error;
  }

  return (data ?? [])
    .map((row) => normalizeGlossaryTermRow(row as GlossaryTermRow))
    .sort(compareGlossaryTerms);
}

export async function getGlossaryTermById(
  uid: string,
  projectId: string,
  glossaryTermId: string
) {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("glossary_terms")
    .select("*")
    .eq("user_id", uid)
    .eq("project_id", projectId)
    .eq("id", glossaryTermId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? normalizeGlossaryTermRow(data as GlossaryTermRow) : null;
}

export async function createGlossaryTermForProject(
  uid: string,
  projectId: string,
  values: NormalizedGlossaryTermFormValues
) {
  const title = values.title.trim();

  if (!title) {
    throw new Error("Glossary term title is required.");
  }

  const glossaryTermId = await getAvailableGlossaryTermId(uid, projectId, title);
  const supabase = getSupabaseBrowserClient();
  const now = new Date().toISOString();
  const glossaryTermDocument = buildGlossaryTermDocument({
    id: glossaryTermId,
    projectId,
    values,
  });

  const { error } = await supabase.from("glossary_terms").insert({
    user_id: uid,
    project_id: projectId,
    id: glossaryTermId,
    title: glossaryTermDocument.title,
    slug: glossaryTermDocument.slug,
    summary: glossaryTermDocument.summary,
    description: glossaryTermDocument.description,
    status: glossaryTermDocument.status,
    tags: glossaryTermDocument.tags,
    is_archived: glossaryTermDocument.isArchived,
    canon_level: glossaryTermDocument.canonLevel,
    confidence: glossaryTermDocument.confidence,
    term: glossaryTermDocument.term,
    definition: glossaryTermDocument.definition,
    category: glossaryTermDocument.category,
    related_entity_types: glossaryTermDocument.relatedEntityTypes,
    related_entity_ids: glossaryTermDocument.relatedEntityIds,
    public_wiki_summary: glossaryTermDocument.publicWikiSummary,
    created_at: now,
    updated_at: now,
  });

  if (error) {
    throw error;
  }

  return glossaryTermId;
}

export async function updateGlossaryTermForProject(
  uid: string,
  projectId: string,
  glossaryTermId: string,
  values: NormalizedGlossaryTermFormValues
) {
  const title = values.title.trim();

  if (!title) {
    throw new Error("Glossary term title is required.");
  }

  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase
    .from("glossary_terms")
    .update({
      title,
      slug: slugifyGlossaryTermTitle(title),
      summary: values.summary,
      description: values.description,
      status: values.status,
      is_archived: values.status === "archived",
      term: values.term,
      definition: values.definition,
      category: values.category,
      related_entity_types: values.relatedEntityTypes,
      related_entity_ids: values.relatedEntityIds,
      public_wiki_summary: values.publicWikiSummary,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", uid)
    .eq("project_id", projectId)
    .eq("id", glossaryTermId);

  if (error) {
    throw error;
  }
}

async function getAvailableGlossaryTermId(uid: string, projectId: string, title: string) {
  const baseId = buildGlossaryTermId(title);
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("glossary_terms")
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

function normalizeGlossaryTermRow(row: GlossaryTermRow): GlossaryTerm {
  const status = coerceGlossaryTermStatus(row.status);
  const title = row.title;
  const term = row.term || title;

  return {
    id: row.id,
    projectId: row.project_id,
    title,
    slug: row.slug || slugifyGlossaryTermTitle(title),
    summary: row.summary || "",
    description: row.description || "",
    status,
    tags: row.tags ?? [],
    isArchived: row.is_archived ?? status === "archived",
    canonLevel: coerceGlossaryTermCanonLevel(row.canon_level),
    confidence: coerceGlossaryTermConfidence(row.confidence),
    term,
    definition: row.definition || "",
    category: row.category || "",
    relatedEntityTypes: row.related_entity_types ?? [],
    relatedEntityIds: row.related_entity_ids ?? [],
    publicWikiSummary: row.public_wiki_summary || "",
    createdAt: readDateOrNull(row.created_at),
    updatedAt: readDateOrNull(row.updated_at),
  };
}

function buildGlossaryTermId(title: string) {
  const normalized = slugifyGlossaryTermTitle(title).replace(/-/g, "_");
  return `term_${normalized || "term"}`;
}

function compareGlossaryTerms(left: GlossaryTerm, right: GlossaryTerm) {
  return left.title.localeCompare(right.title);
}

function readDateOrNull(value: string | null) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
