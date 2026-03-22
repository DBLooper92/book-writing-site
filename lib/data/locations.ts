import "client-only";

import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { Database } from "@/types/database";
import {
  buildLocationDocument,
  coerceLocationCanonLevel,
  coerceLocationConfidence,
  coerceLocationStatus,
  slugifyLocationName,
  type Location,
  type NormalizedLocationFormValues,
} from "@/types/location";

type LocationRow = Database["public"]["Tables"]["locations"]["Row"];

export async function getLocationsForProject(uid: string, projectId: string) {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("locations")
    .select("*")
    .eq("user_id", uid)
    .eq("project_id", projectId);

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => normalizeLocationRow(row as LocationRow)).sort(compareLocations);
}

export async function getLocationById(uid: string, projectId: string, locationId: string) {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("locations")
    .select("*")
    .eq("user_id", uid)
    .eq("project_id", projectId)
    .eq("id", locationId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? normalizeLocationRow(data as LocationRow) : null;
}

export async function createLocationForProject(
  uid: string,
  projectId: string,
  values: NormalizedLocationFormValues
) {
  const name = values.name.trim();

  if (!name) {
    throw new Error("Location name is required.");
  }

  const locationId = await getAvailableLocationId(uid, projectId, name);
  const supabase = getSupabaseBrowserClient();
  const now = new Date().toISOString();
  const locationDocument = buildLocationDocument({
    id: locationId,
    projectId,
    values,
  });

  const { error } = await supabase.from("locations").insert({
    user_id: uid,
    project_id: projectId,
    id: locationId,
    name: locationDocument.name,
    slug: locationDocument.slug,
    summary: locationDocument.summary,
    description: locationDocument.description,
    status: locationDocument.status,
    tags: locationDocument.tags,
    is_archived: locationDocument.isArchived,
    canon_level: locationDocument.canonLevel,
    confidence: locationDocument.confidence,
    location_type: locationDocument.locationType,
    parent_location_id: locationDocument.parentLocationId,
    child_location_ids: locationDocument.childLocationIds,
    era_ids: locationDocument.eraIds,
    culture_ids: locationDocument.cultureIds,
    faction_ids: locationDocument.factionIds,
    population_notes: locationDocument.populationNotes,
    climate: locationDocument.climate,
    geography: locationDocument.geography,
    architecture: locationDocument.architecture,
    economy: locationDocument.economy,
    customs: locationDocument.customs,
    danger_level: locationDocument.dangerLevel,
    notable_features: locationDocument.notableFeatures,
    timeline_event_ids: locationDocument.timelineEventIds,
    book_ids: locationDocument.bookIds,
    character_ids: locationDocument.characterIds,
    public_wiki_summary: locationDocument.publicWikiSummary,
    created_at: now,
    updated_at: now,
  });

  if (error) {
    throw error;
  }

  return locationId;
}

export async function updateLocationForProject(
  uid: string,
  projectId: string,
  locationId: string,
  values: NormalizedLocationFormValues
) {
  const name = values.name.trim();

  if (!name) {
    throw new Error("Location name is required.");
  }

  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase
    .from("locations")
    .update({
      name,
      slug: slugifyLocationName(name),
      summary: values.summary,
      description: values.description,
      status: values.status,
      is_archived: values.status === "archived",
      location_type: values.locationType,
      parent_location_id: values.parentLocationId,
      climate: values.climate,
      geography: values.geography,
      architecture: values.architecture,
      customs: values.customs,
      danger_level: values.dangerLevel,
      notable_features: values.notableFeatures,
      public_wiki_summary: values.publicWikiSummary,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", uid)
    .eq("project_id", projectId)
    .eq("id", locationId);

  if (error) {
    throw error;
  }
}

async function getAvailableLocationId(uid: string, projectId: string, name: string) {
  const baseId = buildLocationId(name);
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("locations")
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

function normalizeLocationRow(row: LocationRow): Location {
  const status = coerceLocationStatus(row.status);

  return {
    id: row.id,
    projectId: row.project_id,
    name: row.name,
    slug: row.slug || slugifyLocationName(row.name),
    summary: row.summary || "",
    description: row.description || "",
    status,
    tags: row.tags ?? [],
    isArchived: row.is_archived ?? status === "archived",
    canonLevel: coerceLocationCanonLevel(row.canon_level),
    confidence: coerceLocationConfidence(row.confidence),
    locationType: row.location_type || "settlement",
    parentLocationId: row.parent_location_id,
    childLocationIds: row.child_location_ids ?? [],
    eraIds: row.era_ids ?? [],
    cultureIds: row.culture_ids ?? [],
    factionIds: row.faction_ids ?? [],
    populationNotes: row.population_notes || "",
    climate: row.climate || "",
    geography: row.geography || "",
    architecture: row.architecture || "",
    economy: row.economy || "",
    customs: row.customs ?? [],
    dangerLevel: row.danger_level || "moderate",
    notableFeatures: row.notable_features ?? [],
    timelineEventIds: row.timeline_event_ids ?? [],
    bookIds: row.book_ids ?? [],
    characterIds: row.character_ids ?? [],
    publicWikiSummary: row.public_wiki_summary || "",
    createdAt: readDateOrNull(row.created_at),
    updatedAt: readDateOrNull(row.updated_at),
  };
}

function buildLocationId(name: string) {
  const normalized = slugifyLocationName(name).replace(/-/g, "_");
  return `loc_${normalized || "location"}`;
}

function compareLocations(left: Location, right: Location) {
  return left.name.localeCompare(right.name);
}

function readDateOrNull(value: string | null) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
