import "client-only";

import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { Database } from "@/types/database";
import {
  buildCharacterDocument,
  coerceCharacterCanonLevel,
  coerceCharacterConfidence,
  coerceCharacterImportanceLevel,
  coerceCharacterStatus,
  coerceCharacterType,
  slugifyCharacterName,
  type Character,
  type NormalizedCharacterFormValues,
} from "@/types/character";

type CharacterRow = Database["public"]["Tables"]["characters"]["Row"];

export async function getCharactersForProject(uid: string, projectId: string) {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("characters")
    .select("*")
    .eq("user_id", uid)
    .eq("project_id", projectId);

  if (error) {
    throw error;
  }

  return (data ?? [])
    .map((row) => normalizeCharacterRow(row as CharacterRow))
    .sort(compareCharacters);
}

export async function getCharacterById(uid: string, projectId: string, characterId: string) {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("characters")
    .select("*")
    .eq("user_id", uid)
    .eq("project_id", projectId)
    .eq("id", characterId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? normalizeCharacterRow(data as CharacterRow) : null;
}

export async function createCharacterForProject(
  uid: string,
  projectId: string,
  values: NormalizedCharacterFormValues
) {
  const name = values.name.trim();

  if (!name) {
    throw new Error("Character name is required.");
  }

  const characterId = await getAvailableCharacterId(uid, projectId, name);
  const supabase = getSupabaseBrowserClient();
  const now = new Date().toISOString();
  const characterDocument = buildCharacterDocument({
    id: characterId,
    projectId,
    values,
  });

  const { error } = await supabase.from("characters").insert({
    user_id: uid,
    project_id: projectId,
    id: characterId,
    name: characterDocument.name,
    slug: characterDocument.slug,
    summary: characterDocument.summary,
    description: characterDocument.description,
    status: characterDocument.status,
    tags: characterDocument.tags,
    is_archived: characterDocument.isArchived,
    canon_level: characterDocument.canonLevel,
    confidence: characterDocument.confidence,
    aliases: characterDocument.aliases,
    character_type: characterDocument.characterType,
    importance_level: characterDocument.importanceLevel,
    birth_year: characterDocument.birthYear,
    death_year: characterDocument.deathYear,
    apparent_age: characterDocument.apparentAge,
    actual_age: characterDocument.actualAge,
    species_id: characterDocument.speciesId,
    culture_ids: characterDocument.cultureIds,
    faction_ids: characterDocument.factionIds,
    religion_ids: characterDocument.religionIds,
    language_ids: characterDocument.languageIds,
    home_location_id: characterDocument.homeLocationId,
    current_location_id: characterDocument.currentLocationId,
    occupation: characterDocument.occupation,
    skills: characterDocument.skills,
    traits: characterDocument.traits,
    flaws: characterDocument.flaws,
    motivations: characterDocument.motivations,
    fears: characterDocument.fears,
    secrets: characterDocument.secrets,
    beliefs: characterDocument.beliefs,
    appearance: characterDocument.appearance,
    voice_profile: characterDocument.voiceProfile,
    arc_summary: characterDocument.arcSummary,
    arc_start_state: characterDocument.arcStartState,
    arc_end_state: characterDocument.arcEndState,
    key_relationship_ids: characterDocument.keyRelationshipIds,
    timeline_event_ids: characterDocument.timelineEventIds,
    book_ids: characterDocument.bookIds,
    chapter_ids: characterDocument.chapterIds,
    scene_ids: characterDocument.sceneIds,
    important_items: characterDocument.importantItems,
    public_wiki_summary: characterDocument.publicWikiSummary,
    created_at: now,
    updated_at: now,
  });

  if (error) {
    throw error;
  }

  return characterId;
}

export async function updateCharacterForProject(
  uid: string,
  projectId: string,
  characterId: string,
  values: NormalizedCharacterFormValues
) {
  const name = values.name.trim();

  if (!name) {
    throw new Error("Character name is required.");
  }

  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase
    .from("characters")
    .update({
      name,
      slug: slugifyCharacterName(name),
      summary: values.summary,
      description: values.description,
      status: values.status,
      is_archived: values.status === "archived",
      aliases: values.aliases,
      character_type: values.characterType,
      importance_level: values.importanceLevel,
      birth_year: values.birthYear,
      home_location_id: values.homeLocationId,
      current_location_id: values.homeLocationId,
      occupation: values.occupation,
      traits: values.traits,
      flaws: values.flaws,
      motivations: values.motivations,
      public_wiki_summary: values.publicWikiSummary,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", uid)
    .eq("project_id", projectId)
    .eq("id", characterId);

  if (error) {
    throw error;
  }
}

async function getAvailableCharacterId(uid: string, projectId: string, name: string) {
  const baseId = buildCharacterId(name);
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("characters")
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

function normalizeCharacterRow(row: CharacterRow): Character {
  const status = coerceCharacterStatus(row.status);

  return {
    id: row.id,
    projectId: row.project_id,
    name: row.name,
    slug: row.slug || slugifyCharacterName(row.name),
    summary: row.summary || "",
    description: row.description || "",
    status,
    tags: row.tags ?? [],
    isArchived: row.is_archived ?? status === "archived",
    canonLevel: coerceCharacterCanonLevel(row.canon_level),
    confidence: coerceCharacterConfidence(row.confidence),
    aliases: row.aliases ?? [],
    characterType: coerceCharacterType(row.character_type),
    importanceLevel: coerceCharacterImportanceLevel(row.importance_level),
    birthYear: row.birth_year,
    deathYear: row.death_year,
    apparentAge: row.apparent_age || "",
    actualAge: row.actual_age || "",
    speciesId: row.species_id,
    cultureIds: row.culture_ids ?? [],
    factionIds: row.faction_ids ?? [],
    religionIds: row.religion_ids ?? [],
    languageIds: row.language_ids ?? [],
    homeLocationId: row.home_location_id,
    currentLocationId: row.current_location_id ?? row.home_location_id,
    occupation: row.occupation ?? [],
    skills: row.skills ?? [],
    traits: row.traits ?? [],
    flaws: row.flaws ?? [],
    motivations: row.motivations ?? [],
    fears: row.fears ?? [],
    secrets: row.secrets ?? [],
    beliefs: row.beliefs ?? [],
    appearance: row.appearance || "",
    voiceProfile: row.voice_profile || "",
    arcSummary: row.arc_summary || "",
    arcStartState: row.arc_start_state || "",
    arcEndState: row.arc_end_state || "",
    keyRelationshipIds: row.key_relationship_ids ?? [],
    timelineEventIds: row.timeline_event_ids ?? [],
    bookIds: row.book_ids ?? [],
    chapterIds: row.chapter_ids ?? [],
    sceneIds: row.scene_ids ?? [],
    importantItems: row.important_items ?? [],
    publicWikiSummary: row.public_wiki_summary || "",
    createdAt: readDateOrNull(row.created_at),
    updatedAt: readDateOrNull(row.updated_at),
  };
}

function buildCharacterId(name: string) {
  const normalized = slugifyCharacterName(name).replace(/-/g, "_");
  return `char_${normalized || "character"}`;
}

function compareCharacters(left: Character, right: Character) {
  return left.name.localeCompare(right.name);
}

function readDateOrNull(value: string | null) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
