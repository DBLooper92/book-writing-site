import "client-only";

import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { Database } from "@/types/database";
import {
  buildCultureDocument,
  coerceCultureCanonLevel,
  coerceCultureConfidence,
  coerceCultureStatus,
  slugifyCultureName,
  type Culture,
  type NormalizedCultureFormValues,
} from "@/types/culture";

type CultureRow = Database["public"]["Tables"]["cultures"]["Row"];

export async function getCulturesForProject(uid: string, projectId: string) {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("cultures")
    .select("*")
    .eq("user_id", uid)
    .eq("project_id", projectId);

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => normalizeCultureRow(row as CultureRow)).sort(compareCultures);
}

export async function getCultureById(uid: string, projectId: string, cultureId: string) {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("cultures")
    .select("*")
    .eq("user_id", uid)
    .eq("project_id", projectId)
    .eq("id", cultureId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? normalizeCultureRow(data as CultureRow) : null;
}

export async function createCultureForProject(
  uid: string,
  projectId: string,
  values: NormalizedCultureFormValues
) {
  const name = values.name.trim();

  if (!name) {
    throw new Error("Culture name is required.");
  }

  const cultureId = await getAvailableCultureId(uid, projectId, name);
  const supabase = getSupabaseBrowserClient();
  const now = new Date().toISOString();
  const cultureDocument = buildCultureDocument({
    id: cultureId,
    projectId,
    values,
  });

  const { error } = await supabase.from("cultures").insert({
    user_id: uid,
    project_id: projectId,
    id: cultureId,
    name: cultureDocument.name,
    slug: cultureDocument.slug,
    summary: cultureDocument.summary,
    description: cultureDocument.description,
    status: cultureDocument.status,
    tags: cultureDocument.tags,
    is_archived: cultureDocument.isArchived,
    canon_level: cultureDocument.canonLevel,
    confidence: cultureDocument.confidence,
    core_values: cultureDocument.coreValues,
    traditions: cultureDocument.traditions,
    associated_location_ids: cultureDocument.associatedLocationIds,
    language_ids: cultureDocument.languageIds,
    religion_ids: cultureDocument.religionIds,
    faction_ids: cultureDocument.factionIds,
    era_ids: cultureDocument.eraIds,
    public_wiki_summary: cultureDocument.publicWikiSummary,
    created_at: now,
    updated_at: now,
  });

  if (error) {
    throw error;
  }

  return cultureId;
}

export async function updateCultureForProject(
  uid: string,
  projectId: string,
  cultureId: string,
  values: NormalizedCultureFormValues
) {
  const name = values.name.trim();

  if (!name) {
    throw new Error("Culture name is required.");
  }

  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase
    .from("cultures")
    .update({
      name,
      slug: slugifyCultureName(name),
      summary: values.summary,
      description: values.description,
      status: values.status,
      is_archived: values.status === "archived",
      core_values: values.coreValues,
      traditions: values.traditions,
      associated_location_ids: values.associatedLocationIds,
      language_ids: values.languageIds,
      public_wiki_summary: values.publicWikiSummary,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", uid)
    .eq("project_id", projectId)
    .eq("id", cultureId);

  if (error) {
    throw error;
  }
}

async function getAvailableCultureId(uid: string, projectId: string, name: string) {
  const baseId = buildCultureId(name);
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("cultures")
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

function normalizeCultureRow(row: CultureRow): Culture {
  const status = coerceCultureStatus(row.status);

  return {
    id: row.id,
    projectId: row.project_id,
    name: row.name,
    slug: row.slug || slugifyCultureName(row.name),
    summary: row.summary || "",
    description: row.description || "",
    status,
    tags: row.tags ?? [],
    isArchived: row.is_archived ?? status === "archived",
    canonLevel: coerceCultureCanonLevel(row.canon_level),
    confidence: coerceCultureConfidence(row.confidence),
    coreValues: row.core_values ?? [],
    traditions: row.traditions ?? [],
    associatedLocationIds: row.associated_location_ids ?? [],
    languageIds: row.language_ids ?? [],
    religionIds: row.religion_ids ?? [],
    factionIds: row.faction_ids ?? [],
    eraIds: row.era_ids ?? [],
    publicWikiSummary: row.public_wiki_summary || "",
    createdAt: readDateOrNull(row.created_at),
    updatedAt: readDateOrNull(row.updated_at),
  };
}

function buildCultureId(name: string) {
  const normalized = slugifyCultureName(name).replace(/-/g, "_");
  return `culture_${normalized || "culture"}`;
}

function compareCultures(left: Culture, right: Culture) {
  return left.name.localeCompare(right.name);
}

function readDateOrNull(value: string | null) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
