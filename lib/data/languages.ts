import "client-only";

import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { Database } from "@/types/database";
import {
  buildLanguageDocument,
  coerceLanguageCanonLevel,
  coerceLanguageConfidence,
  coerceLanguageStatus,
  slugifyLanguageName,
  type Language,
  type NormalizedLanguageFormValues,
} from "@/types/language";

type LanguageRow = Database["public"]["Tables"]["languages"]["Row"];

export async function getLanguagesForProject(uid: string, projectId: string) {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("languages")
    .select("*")
    .eq("user_id", uid)
    .eq("project_id", projectId);

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => normalizeLanguageRow(row as LanguageRow)).sort(compareLanguages);
}

export async function getLanguageById(uid: string, projectId: string, languageId: string) {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("languages")
    .select("*")
    .eq("user_id", uid)
    .eq("project_id", projectId)
    .eq("id", languageId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? normalizeLanguageRow(data as LanguageRow) : null;
}

export async function createLanguageForProject(
  uid: string,
  projectId: string,
  values: NormalizedLanguageFormValues
) {
  const name = values.name.trim();

  if (!name) {
    throw new Error("Language name is required.");
  }

  const languageId = await getAvailableLanguageId(uid, projectId, name);
  const supabase = getSupabaseBrowserClient();
  const now = new Date().toISOString();
  const languageDocument = buildLanguageDocument({
    id: languageId,
    projectId,
    values,
  });

  const { error } = await supabase.from("languages").insert({
    user_id: uid,
    project_id: projectId,
    id: languageId,
    name: languageDocument.name,
    slug: languageDocument.slug,
    summary: languageDocument.summary,
    description: languageDocument.description,
    status: languageDocument.status,
    tags: languageDocument.tags,
    is_archived: languageDocument.isArchived,
    canon_level: languageDocument.canonLevel,
    confidence: languageDocument.confidence,
    language_family: languageDocument.languageFamily,
    writing_system: languageDocument.writingSystem,
    primary_regions: languageDocument.primaryRegions,
    dialects: languageDocument.dialects,
    loan_sources: languageDocument.loanSources,
    public_wiki_summary: languageDocument.publicWikiSummary,
    created_at: now,
    updated_at: now,
  });

  if (error) {
    throw error;
  }

  return languageId;
}

export async function updateLanguageForProject(
  uid: string,
  projectId: string,
  languageId: string,
  values: NormalizedLanguageFormValues
) {
  const name = values.name.trim();

  if (!name) {
    throw new Error("Language name is required.");
  }

  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase
    .from("languages")
    .update({
      name,
      slug: slugifyLanguageName(name),
      summary: values.summary,
      description: values.description,
      status: values.status,
      is_archived: values.status === "archived",
      language_family: values.languageFamily,
      writing_system: values.writingSystem,
      primary_regions: values.primaryRegions,
      dialects: values.dialects,
      loan_sources: values.loanSources,
      public_wiki_summary: values.publicWikiSummary,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", uid)
    .eq("project_id", projectId)
    .eq("id", languageId);

  if (error) {
    throw error;
  }
}

async function getAvailableLanguageId(uid: string, projectId: string, name: string) {
  const baseId = buildLanguageId(name);
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("languages")
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

function normalizeLanguageRow(row: LanguageRow): Language {
  const status = coerceLanguageStatus(row.status);

  return {
    id: row.id,
    projectId: row.project_id,
    name: row.name,
    slug: row.slug || slugifyLanguageName(row.name),
    summary: row.summary || "",
    description: row.description || "",
    status,
    tags: row.tags ?? [],
    isArchived: row.is_archived ?? status === "archived",
    canonLevel: coerceLanguageCanonLevel(row.canon_level),
    confidence: coerceLanguageConfidence(row.confidence),
    languageFamily: row.language_family || "",
    writingSystem: row.writing_system || "",
    primaryRegions: row.primary_regions ?? [],
    dialects: row.dialects ?? [],
    loanSources: row.loan_sources ?? [],
    publicWikiSummary: row.public_wiki_summary || "",
    createdAt: readDateOrNull(row.created_at),
    updatedAt: readDateOrNull(row.updated_at),
  };
}

function buildLanguageId(name: string) {
  const normalized = slugifyLanguageName(name).replace(/-/g, "_");
  return `language_${normalized || "language"}`;
}

function compareLanguages(left: Language, right: Language) {
  return left.name.localeCompare(right.name);
}

function readDateOrNull(value: string | null) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
