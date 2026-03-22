import "client-only";

import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { Database } from "@/types/database";
import {
  buildFactionDocument,
  coerceFactionCanonLevel,
  coerceFactionConfidence,
  coerceFactionStatus,
  coerceFactionType,
  slugifyFactionName,
  type Faction,
  type NormalizedFactionFormValues,
} from "@/types/faction";

type FactionRow = Database["public"]["Tables"]["factions"]["Row"];

export async function getFactionsForProject(uid: string, projectId: string) {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("factions")
    .select("*")
    .eq("user_id", uid)
    .eq("project_id", projectId);

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => normalizeFactionRow(row as FactionRow)).sort(compareFactions);
}

export async function getFactionById(uid: string, projectId: string, factionId: string) {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("factions")
    .select("*")
    .eq("user_id", uid)
    .eq("project_id", projectId)
    .eq("id", factionId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? normalizeFactionRow(data as FactionRow) : null;
}

export async function createFactionForProject(
  uid: string,
  projectId: string,
  values: NormalizedFactionFormValues
) {
  const name = values.name.trim();

  if (!name) {
    throw new Error("Faction name is required.");
  }

  const factionId = await getAvailableFactionId(uid, projectId, name);
  const supabase = getSupabaseBrowserClient();
  const now = new Date().toISOString();
  const factionDocument = buildFactionDocument({
    id: factionId,
    projectId,
    values,
  });

  const { error } = await supabase.from("factions").insert({
    user_id: uid,
    project_id: projectId,
    id: factionId,
    name: factionDocument.name,
    slug: factionDocument.slug,
    summary: factionDocument.summary,
    description: factionDocument.description,
    status: factionDocument.status,
    tags: factionDocument.tags,
    is_archived: factionDocument.isArchived,
    canon_level: factionDocument.canonLevel,
    confidence: factionDocument.confidence,
    faction_type: factionDocument.factionType,
    founded_year: factionDocument.foundedYear,
    ended_year: factionDocument.endedYear,
    leader_character_ids: factionDocument.leaderCharacterIds,
    base_location_ids: factionDocument.baseLocationIds,
    culture_ids: factionDocument.cultureIds,
    religion_ids: factionDocument.religionIds,
    government_id: factionDocument.governmentId,
    goals: factionDocument.goals,
    resources: factionDocument.resources,
    rivals: factionDocument.rivals,
    allies: factionDocument.allies,
    timeline_event_ids: factionDocument.timelineEventIds,
    book_ids: factionDocument.bookIds,
    public_wiki_summary: factionDocument.publicWikiSummary,
    created_at: now,
    updated_at: now,
  });

  if (error) {
    throw error;
  }

  return factionId;
}

export async function updateFactionForProject(
  uid: string,
  projectId: string,
  factionId: string,
  values: NormalizedFactionFormValues
) {
  const name = values.name.trim();

  if (!name) {
    throw new Error("Faction name is required.");
  }

  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase
    .from("factions")
    .update({
      name,
      slug: slugifyFactionName(name),
      summary: values.summary,
      description: values.description,
      status: values.status,
      is_archived: values.status === "archived",
      faction_type: values.factionType,
      founded_year: values.foundedYear,
      ended_year: values.endedYear,
      leader_character_ids: values.leaderCharacterIds,
      base_location_ids: values.baseLocationIds,
      government_id: values.governmentId,
      goals: values.goals,
      resources: values.resources,
      public_wiki_summary: values.publicWikiSummary,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", uid)
    .eq("project_id", projectId)
    .eq("id", factionId);

  if (error) {
    throw error;
  }
}

async function getAvailableFactionId(uid: string, projectId: string, name: string) {
  const baseId = buildFactionId(name);
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("factions")
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

function normalizeFactionRow(row: FactionRow): Faction {
  const status = coerceFactionStatus(row.status);

  return {
    id: row.id,
    projectId: row.project_id,
    name: row.name,
    slug: row.slug || slugifyFactionName(row.name),
    summary: row.summary || "",
    description: row.description || "",
    status,
    tags: row.tags ?? [],
    isArchived: row.is_archived ?? status === "archived",
    canonLevel: coerceFactionCanonLevel(row.canon_level),
    confidence: coerceFactionConfidence(row.confidence),
    factionType: coerceFactionType(row.faction_type),
    foundedYear: row.founded_year,
    endedYear: row.ended_year,
    leaderCharacterIds: row.leader_character_ids ?? [],
    baseLocationIds: row.base_location_ids ?? [],
    cultureIds: row.culture_ids ?? [],
    religionIds: row.religion_ids ?? [],
    governmentId: row.government_id,
    goals: row.goals ?? [],
    resources: row.resources ?? [],
    rivals: row.rivals ?? [],
    allies: row.allies ?? [],
    timelineEventIds: row.timeline_event_ids ?? [],
    bookIds: row.book_ids ?? [],
    publicWikiSummary: row.public_wiki_summary || "",
    createdAt: readDateOrNull(row.created_at),
    updatedAt: readDateOrNull(row.updated_at),
  };
}

function buildFactionId(name: string) {
  const normalized = slugifyFactionName(name).replace(/-/g, "_");
  return `faction_${normalized || "faction"}`;
}

function compareFactions(left: Faction, right: Faction) {
  return left.name.localeCompare(right.name);
}

function readDateOrNull(value: string | null) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
