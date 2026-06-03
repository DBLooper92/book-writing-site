import "client-only";

import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { Database } from "@/types/database";
import {
  buildItemDocument,
  coerceItemCanonLevel,
  coerceItemConfidence,
  coerceItemStatus,
  slugifyItemName,
  type Item,
  type NormalizedItemFormValues,
} from "@/types/item";

type ItemRow = Database["public"]["Tables"]["items"]["Row"];

export async function getItemsForProject(uid: string, projectId: string) {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("items")
    .select("*")
    .eq("user_id", uid)
    .eq("project_id", projectId);

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => normalizeItemRow(row as ItemRow)).sort(compareItems);
}

export async function getItemById(uid: string, projectId: string, itemId: string) {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("items")
    .select("*")
    .eq("user_id", uid)
    .eq("project_id", projectId)
    .eq("id", itemId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? normalizeItemRow(data as ItemRow) : null;
}

export async function createItemForProject(
  uid: string,
  projectId: string,
  values: NormalizedItemFormValues
) {
  const name = values.name.trim();

  if (!name) {
    throw new Error("Item name is required.");
  }

  const itemId = await getAvailableItemId(uid, projectId, name);
  const supabase = getSupabaseBrowserClient();
  const now = new Date().toISOString();
  const itemDocument = buildItemDocument({
    id: itemId,
    projectId,
    values,
  });

  const { error } = await supabase.from("items").insert({
    user_id: uid,
    project_id: projectId,
    id: itemId,
    name: itemDocument.name,
    slug: itemDocument.slug,
    summary: itemDocument.summary,
    description: itemDocument.description,
    status: itemDocument.status,
    tags: itemDocument.tags,
    is_archived: itemDocument.isArchived,
    canon_level: itemDocument.canonLevel,
    confidence: itemDocument.confidence,
    item_type: itemDocument.itemType,
    owner_character_ids: itemDocument.ownerCharacterIds,
    location_ids: itemDocument.locationIds,
    faction_ids: itemDocument.factionIds,
    created_year: itemDocument.createdYear,
    material: itemDocument.material,
    abilities: itemDocument.abilities,
    limitations: itemDocument.limitations,
    symbolic_meaning: itemDocument.symbolicMeaning,
    timeline_event_ids: itemDocument.timelineEventIds,
    public_wiki_summary: itemDocument.publicWikiSummary,
    created_at: now,
    updated_at: now,
  });

  if (error) {
    throw error;
  }

  return itemId;
}

export async function updateItemForProject(
  uid: string,
  projectId: string,
  itemId: string,
  values: NormalizedItemFormValues
) {
  const name = values.name.trim();

  if (!name) {
    throw new Error("Item name is required.");
  }

  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase
    .from("items")
    .update({
      name,
      slug: slugifyItemName(name),
      summary: values.summary,
      description: values.description,
      status: values.status,
      is_archived: values.status === "archived",
      item_type: values.itemType,
      owner_character_ids: values.ownerCharacterIds,
      location_ids: values.locationIds,
      faction_ids: values.factionIds,
      created_year: values.createdYear,
      material: values.material,
      abilities: values.abilities,
      limitations: values.limitations,
      symbolic_meaning: values.symbolicMeaning,
      timeline_event_ids: values.timelineEventIds,
      public_wiki_summary: values.publicWikiSummary,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", uid)
    .eq("project_id", projectId)
    .eq("id", itemId);

  if (error) {
    throw error;
  }
}

async function getAvailableItemId(uid: string, projectId: string, name: string) {
  const baseId = buildItemId(name);
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("items")
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

function normalizeItemRow(row: ItemRow): Item {
  const status = coerceItemStatus(row.status);

  return {
    id: row.id,
    projectId: row.project_id,
    name: row.name,
    slug: row.slug || slugifyItemName(row.name),
    summary: row.summary || "",
    description: row.description || "",
    status,
    tags: row.tags ?? [],
    isArchived: row.is_archived ?? status === "archived",
    canonLevel: coerceItemCanonLevel(row.canon_level),
    confidence: coerceItemConfidence(row.confidence),
    itemType: row.item_type || "artifact",
    ownerCharacterIds: row.owner_character_ids ?? [],
    locationIds: row.location_ids ?? [],
    factionIds: row.faction_ids ?? [],
    createdYear: row.created_year,
    material: row.material || "",
    abilities: row.abilities ?? [],
    limitations: row.limitations ?? [],
    symbolicMeaning: row.symbolic_meaning || "",
    timelineEventIds: row.timeline_event_ids ?? [],
    publicWikiSummary: row.public_wiki_summary || "",
    createdAt: readDateOrNull(row.created_at),
    updatedAt: readDateOrNull(row.updated_at),
  };
}

function buildItemId(name: string) {
  const normalized = slugifyItemName(name).replace(/-/g, "_");
  return `item_${normalized || "item"}`;
}

function compareItems(left: Item, right: Item) {
  return left.name.localeCompare(right.name);
}

function readDateOrNull(value: string | null) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
