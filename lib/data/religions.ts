import "client-only";

import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { Database } from "@/types/database";
import {
  buildReligionDocument,
  coerceReligionCanonLevel,
  coerceReligionConfidence,
  coerceReligionStatus,
  slugifyReligionName,
  type NormalizedReligionFormValues,
  type Religion,
} from "@/types/religion";

type ReligionRow = Database["public"]["Tables"]["religions"]["Row"];

export async function getReligionsForProject(uid: string, projectId: string) {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("religions")
    .select("*")
    .eq("user_id", uid)
    .eq("project_id", projectId);

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => normalizeReligionRow(row as ReligionRow)).sort(compareReligions);
}

export async function getReligionById(uid: string, projectId: string, religionId: string) {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("religions")
    .select("*")
    .eq("user_id", uid)
    .eq("project_id", projectId)
    .eq("id", religionId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? normalizeReligionRow(data as ReligionRow) : null;
}

export async function createReligionForProject(
  uid: string,
  projectId: string,
  values: NormalizedReligionFormValues
) {
  const name = values.name.trim();

  if (!name) {
    throw new Error("Religion name is required.");
  }

  const religionId = await getAvailableReligionId(uid, projectId, name);
  const supabase = getSupabaseBrowserClient();
  const now = new Date().toISOString();
  const religionDocument = buildReligionDocument({
    id: religionId,
    projectId,
    values,
  });

  const { error } = await supabase.from("religions").insert({
    user_id: uid,
    project_id: projectId,
    id: religionId,
    name: religionDocument.name,
    slug: religionDocument.slug,
    summary: religionDocument.summary,
    description: religionDocument.description,
    status: religionDocument.status,
    tags: religionDocument.tags,
    is_archived: religionDocument.isArchived,
    canon_level: religionDocument.canonLevel,
    confidence: religionDocument.confidence,
    deity_or_focus: religionDocument.deityOrFocus,
    belief_system_type: religionDocument.beliefSystemType,
    core_beliefs: religionDocument.coreBeliefs,
    rituals: religionDocument.rituals,
    holy_sites: religionDocument.holySites,
    associated_cultures: religionDocument.associatedCultures,
    associated_organizations: religionDocument.associatedOrganizations,
    public_wiki_summary: religionDocument.publicWikiSummary,
    created_at: now,
    updated_at: now,
  });

  if (error) {
    throw error;
  }

  return religionId;
}

export async function updateReligionForProject(
  uid: string,
  projectId: string,
  religionId: string,
  values: NormalizedReligionFormValues
) {
  const name = values.name.trim();

  if (!name) {
    throw new Error("Religion name is required.");
  }

  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase
    .from("religions")
    .update({
      name,
      slug: slugifyReligionName(name),
      summary: values.summary,
      description: values.description,
      status: values.status,
      is_archived: values.status === "archived",
      deity_or_focus: values.deityOrFocus,
      belief_system_type: values.beliefSystemType,
      core_beliefs: values.coreBeliefs,
      rituals: values.rituals,
      holy_sites: values.holySites,
      associated_cultures: values.associatedCultures,
      associated_organizations: values.associatedOrganizations,
      public_wiki_summary: values.publicWikiSummary,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", uid)
    .eq("project_id", projectId)
    .eq("id", religionId);

  if (error) {
    throw error;
  }
}

async function getAvailableReligionId(uid: string, projectId: string, name: string) {
  const baseId = buildReligionId(name);
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("religions")
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

function normalizeReligionRow(row: ReligionRow): Religion {
  const status = coerceReligionStatus(row.status);

  return {
    id: row.id,
    projectId: row.project_id,
    name: row.name,
    slug: row.slug || slugifyReligionName(row.name),
    summary: row.summary || "",
    description: row.description || "",
    status,
    tags: row.tags ?? [],
    isArchived: row.is_archived ?? status === "archived",
    canonLevel: coerceReligionCanonLevel(row.canon_level),
    confidence: coerceReligionConfidence(row.confidence),
    deityOrFocus: row.deity_or_focus || "",
    beliefSystemType: row.belief_system_type || "",
    coreBeliefs: row.core_beliefs ?? [],
    rituals: row.rituals ?? [],
    holySites: row.holy_sites ?? [],
    associatedCultures: row.associated_cultures ?? [],
    associatedOrganizations: row.associated_organizations ?? [],
    publicWikiSummary: row.public_wiki_summary || "",
    createdAt: readDateOrNull(row.created_at),
    updatedAt: readDateOrNull(row.updated_at),
  };
}

function buildReligionId(name: string) {
  const normalized = slugifyReligionName(name).replace(/-/g, "_");
  return `religion_${normalized || "religion"}`;
}

function compareReligions(left: Religion, right: Religion) {
  return left.name.localeCompare(right.name);
}

function readDateOrNull(value: string | null) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
