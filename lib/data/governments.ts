import "client-only";

import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { Database } from "@/types/database";
import {
  buildGovernmentDocument,
  coerceGovernmentCanonLevel,
  coerceGovernmentConfidence,
  coerceGovernmentStatus,
  coerceGovernmentType,
  slugifyGovernmentName,
  type Government,
  type NormalizedGovernmentFormValues,
} from "@/types/government";

type GovernmentRow = Database["public"]["Tables"]["governments"]["Row"];

export async function getGovernmentsForProject(uid: string, projectId: string) {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("governments")
    .select("*")
    .eq("user_id", uid)
    .eq("project_id", projectId);

  if (error) {
    throw error;
  }

  return (data ?? [])
    .map((row) => normalizeGovernmentRow(row as GovernmentRow))
    .sort(compareGovernments);
}

export async function getGovernmentById(
  uid: string,
  projectId: string,
  governmentId: string
) {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("governments")
    .select("*")
    .eq("user_id", uid)
    .eq("project_id", projectId)
    .eq("id", governmentId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? normalizeGovernmentRow(data as GovernmentRow) : null;
}

export async function createGovernmentForProject(
  uid: string,
  projectId: string,
  values: NormalizedGovernmentFormValues
) {
  const name = values.name.trim();

  if (!name) {
    throw new Error("Government name is required.");
  }

  const governmentId = await getAvailableGovernmentId(uid, projectId, name);
  const supabase = getSupabaseBrowserClient();
  const now = new Date().toISOString();
  const governmentDocument = buildGovernmentDocument({
    id: governmentId,
    projectId,
    values,
  });

  const { error } = await supabase.from("governments").insert({
    user_id: uid,
    project_id: projectId,
    id: governmentId,
    name: governmentDocument.name,
    slug: governmentDocument.slug,
    summary: governmentDocument.summary,
    description: governmentDocument.description,
    status: governmentDocument.status,
    tags: governmentDocument.tags,
    is_archived: governmentDocument.isArchived,
    canon_level: governmentDocument.canonLevel,
    confidence: governmentDocument.confidence,
    government_type: governmentDocument.governmentType,
    seat_location_id: governmentDocument.seatLocationId,
    leader_titles: governmentDocument.leaderTitles,
    jurisdiction_notes: governmentDocument.jurisdictionNotes,
    faction_ids: governmentDocument.factionIds,
    organization_ids: governmentDocument.organizationIds,
    law_priorities: governmentDocument.lawPriorities,
    public_wiki_summary: governmentDocument.publicWikiSummary,
    created_at: now,
    updated_at: now,
  });

  if (error) {
    throw error;
  }

  return governmentId;
}

export async function updateGovernmentForProject(
  uid: string,
  projectId: string,
  governmentId: string,
  values: NormalizedGovernmentFormValues
) {
  const name = values.name.trim();

  if (!name) {
    throw new Error("Government name is required.");
  }

  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase
    .from("governments")
    .update({
      name,
      slug: slugifyGovernmentName(name),
      summary: values.summary,
      description: values.description,
      status: values.status,
      is_archived: values.status === "archived",
      government_type: values.governmentType,
      seat_location_id: values.seatLocationId,
      leader_titles: values.leaderTitles,
      jurisdiction_notes: values.jurisdictionNotes,
      faction_ids: values.factionIds,
      organization_ids: values.organizationIds,
      law_priorities: values.lawPriorities,
      public_wiki_summary: values.publicWikiSummary,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", uid)
    .eq("project_id", projectId)
    .eq("id", governmentId);

  if (error) {
    throw error;
  }
}

async function getAvailableGovernmentId(uid: string, projectId: string, name: string) {
  const baseId = buildGovernmentId(name);
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("governments")
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

function normalizeGovernmentRow(row: GovernmentRow): Government {
  const status = coerceGovernmentStatus(row.status);

  return {
    id: row.id,
    projectId: row.project_id,
    name: row.name,
    slug: row.slug || slugifyGovernmentName(row.name),
    summary: row.summary || "",
    description: row.description || "",
    status,
    tags: row.tags ?? [],
    isArchived: row.is_archived ?? status === "archived",
    canonLevel: coerceGovernmentCanonLevel(row.canon_level),
    confidence: coerceGovernmentConfidence(row.confidence),
    governmentType: coerceGovernmentType(row.government_type),
    seatLocationId: row.seat_location_id,
    leaderTitles: row.leader_titles ?? [],
    jurisdictionNotes: row.jurisdiction_notes || "",
    factionIds: row.faction_ids ?? [],
    organizationIds: row.organization_ids ?? [],
    lawPriorities: row.law_priorities ?? [],
    publicWikiSummary: row.public_wiki_summary || "",
    createdAt: readDateOrNull(row.created_at),
    updatedAt: readDateOrNull(row.updated_at),
  };
}

function buildGovernmentId(name: string) {
  const normalized = slugifyGovernmentName(name).replace(/-/g, "_");
  return `government_${normalized || "government"}`;
}

function compareGovernments(left: Government, right: Government) {
  return left.name.localeCompare(right.name);
}

function readDateOrNull(value: string | null) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
