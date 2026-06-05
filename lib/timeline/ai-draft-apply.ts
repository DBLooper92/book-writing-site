import { createBookForProject } from "@/lib/data/books";
import { createChapterForProject } from "@/lib/data/chapters";
import { createCharacterForProject } from "@/lib/data/characters";
import { createCultureForProject } from "@/lib/data/cultures";
import { createEraForProject } from "@/lib/data/eras";
import { createFactionForProject } from "@/lib/data/factions";
import { createLocationForProject } from "@/lib/data/locations";
import { createPlotThreadForProject } from "@/lib/data/plot-threads";
import { createReligionForProject } from "@/lib/data/religions";
import { createSceneForProject } from "@/lib/data/scenes";
import { createTechnologyForProject } from "@/lib/data/technologies";
import { createThemeForProject } from "@/lib/data/themes";
import type { AiTimelineCreateDraftState, BrainDumpEntitySuggestion } from "@/types/ai-brain-dump";
import { createEmptyBookFormValues, normalizeBookFormValues } from "@/types/book";
import { createEmptyChapterFormValues, normalizeChapterFormValues } from "@/types/chapter";
import { createEmptyCharacterFormValues, normalizeCharacterFormValues } from "@/types/character";
import { createEmptyCultureFormValues, normalizeCultureFormValues } from "@/types/culture";
import { createEmptyEraFormValues, normalizeEraFormValues } from "@/types/era";
import { createEmptyFactionFormValues, normalizeFactionFormValues } from "@/types/faction";
import { createEmptyLocationFormValues, normalizeLocationFormValues } from "@/types/location";
import { createEmptyPlotThreadFormValues, normalizePlotThreadFormValues } from "@/types/plot-thread";
import { createEmptyReligionFormValues, normalizeReligionFormValues } from "@/types/religion";
import { createEmptySceneFormValues, normalizeSceneFormValues } from "@/types/scene";
import { createEmptyTechnologyFormValues, normalizeTechnologyFormValues } from "@/types/technology";
import { createEmptyThemeFormValues, normalizeThemeFormValues } from "@/types/theme";
import type { NormalizedTimelineEventFormValues } from "@/types/timeline-event";

export async function applyAiDraftResolutionsToTimelineValues({
  activeProjectId,
  aiDraftState,
  uid,
  values,
}: {
  activeProjectId: string;
  aiDraftState: AiTimelineCreateDraftState;
  uid: string;
  values: NormalizedTimelineEventFormValues;
}) {
  const suggestionMap = new Map(
    aiDraftState.preview.entitySuggestions.map((suggestion) => [suggestion.id, suggestion] as const)
  );
  const createdRecordIdsByKey = new Map<string, string>();
  const nextValues: NormalizedTimelineEventFormValues = {
    ...values,
    bookIds: [...values.bookIds],
    chapterIds: [...values.chapterIds],
    sceneIds: [...values.sceneIds],
    characterIds: [...values.characterIds],
    locationIds: [...values.locationIds],
    factionIds: [...values.factionIds],
    cultureIds: [...values.cultureIds],
    technologyIds: [...values.technologyIds],
    religionIds: [...values.religionIds],
    plotThreadIds: [...values.plotThreadIds],
    themeIds: [...values.themeIds],
  };

  for (const resolution of aiDraftState.resolutions) {
    const suggestion = suggestionMap.get(resolution.suggestionId);

    if (!suggestion) {
      continue;
    }

    if (resolution.action === "ignore") {
      continue;
    }

    let linkedId = resolution.linkedId ?? "";

    if (resolution.action === "create") {
      const creationKey = getSuggestionCreationKey(suggestion);
      const existingCreatedId = createdRecordIdsByKey.get(creationKey);

      if (existingCreatedId) {
        linkedId = existingCreatedId;
      } else {
        linkedId = await createRecordFromSuggestion(uid, activeProjectId, suggestion);
        createdRecordIdsByKey.set(creationKey, linkedId);
      }
    }

    if (!linkedId) {
      throw new Error(`Missing linked record for ${suggestion.target}:${suggestion.mention}.`);
    }

    applyLinkedId(nextValues, suggestion.target, linkedId);
  }

  nextValues.bookIds = unique(nextValues.bookIds);
  nextValues.chapterIds = unique(nextValues.chapterIds);
  nextValues.sceneIds = unique(nextValues.sceneIds);
  nextValues.characterIds = unique(nextValues.characterIds);
  nextValues.locationIds = unique(nextValues.locationIds);
  nextValues.factionIds = unique(nextValues.factionIds);
  nextValues.cultureIds = unique(nextValues.cultureIds);
  nextValues.technologyIds = unique(nextValues.technologyIds);
  nextValues.religionIds = unique(nextValues.religionIds);
  nextValues.plotThreadIds = unique(nextValues.plotThreadIds);
  nextValues.themeIds = unique(nextValues.themeIds);

  return nextValues;
}

function applyLinkedId(
  values: NormalizedTimelineEventFormValues,
  target: BrainDumpEntitySuggestion["target"],
  linkedId: string
) {
  if (target === "era") {
    if (!values.eraId) {
      values.eraId = linkedId;
    }

    return;
  }

  if (target === "book") {
    values.bookIds.push(linkedId);
    return;
  }

  if (target === "chapter") {
    values.chapterIds.push(linkedId);
    return;
  }

  if (target === "scene") {
    values.sceneIds.push(linkedId);
    return;
  }

  if (target === "character") {
    values.characterIds.push(linkedId);
    return;
  }

  if (target === "location") {
    values.locationIds.push(linkedId);
    return;
  }

  if (target === "faction") {
    values.factionIds.push(linkedId);
    return;
  }

  if (target === "culture") {
    values.cultureIds.push(linkedId);
    return;
  }

  if (target === "religion") {
    values.religionIds.push(linkedId);
    return;
  }

  if (target === "technology") {
    values.technologyIds.push(linkedId);
    return;
  }

  if (target === "plotThread") {
    values.plotThreadIds.push(linkedId);
    return;
  }

  if (target === "theme") {
    values.themeIds.push(linkedId);
  }
}

async function createRecordFromSuggestion(
  uid: string,
  activeProjectId: string,
  suggestion: BrainDumpEntitySuggestion
) {
  const titleOrName = suggestion.suggestedCreateFields.titleOrName.trim() || suggestion.mention.trim();
  const summary = suggestion.suggestedCreateFields.summary?.trim() ?? "";
  const description = suggestion.suggestedCreateFields.description?.trim() ?? "";
  const publicWikiSummary = suggestion.suggestedCreateFields.publicWikiSummary?.trim() ?? summary;

  if (suggestion.target === "era") {
    const values = createEmptyEraFormValues();
    values.name = titleOrName;
    values.summary = summary;
    values.description = description;
    values.publicWikiSummary = publicWikiSummary;
    return createEraForProject(uid, activeProjectId, normalizeEraFormValues(values));
  }

  if (suggestion.target === "book") {
    const values = createEmptyBookFormValues();
    values.title = titleOrName;
    values.summary = summary;
    values.description = description;
    values.publicWikiSummary = publicWikiSummary;
    return createBookForProject(uid, activeProjectId, normalizeBookFormValues(values));
  }

  if (suggestion.target === "chapter") {
    const values = createEmptyChapterFormValues();
    values.title = titleOrName;
    values.summary = summary;
    values.description = description;
    return createChapterForProject(uid, activeProjectId, normalizeChapterFormValues(values));
  }

  if (suggestion.target === "scene") {
    const values = createEmptySceneFormValues();
    values.title = titleOrName;
    values.summary = summary;
    values.description = description;
    return createSceneForProject(uid, activeProjectId, normalizeSceneFormValues(values));
  }

  if (suggestion.target === "character") {
    const values = createEmptyCharacterFormValues();
    values.name = titleOrName;
    values.summary = summary;
    values.description = description;
    values.publicWikiSummary = publicWikiSummary;
    return createCharacterForProject(uid, activeProjectId, normalizeCharacterFormValues(values));
  }

  if (suggestion.target === "location") {
    const values = createEmptyLocationFormValues();
    values.name = titleOrName;
    values.summary = summary;
    values.description = description;
    values.publicWikiSummary = publicWikiSummary;
    return createLocationForProject(uid, activeProjectId, normalizeLocationFormValues(values));
  }

  if (suggestion.target === "faction") {
    const values = createEmptyFactionFormValues();
    values.name = titleOrName;
    values.summary = summary;
    values.description = description;
    values.publicWikiSummary = publicWikiSummary;
    return createFactionForProject(uid, activeProjectId, normalizeFactionFormValues(values));
  }

  if (suggestion.target === "culture") {
    const values = createEmptyCultureFormValues();
    values.name = titleOrName;
    values.summary = summary;
    values.description = description;
    values.publicWikiSummary = publicWikiSummary;
    return createCultureForProject(uid, activeProjectId, normalizeCultureFormValues(values));
  }

  if (suggestion.target === "religion") {
    const values = createEmptyReligionFormValues();
    values.name = titleOrName;
    values.summary = summary;
    values.description = description;
    values.publicWikiSummary = publicWikiSummary;
    return createReligionForProject(uid, activeProjectId, normalizeReligionFormValues(values));
  }

  if (suggestion.target === "technology") {
    const values = createEmptyTechnologyFormValues();
    values.name = titleOrName;
    values.summary = summary;
    values.description = description;
    values.publicWikiSummary = publicWikiSummary;
    return createTechnologyForProject(uid, activeProjectId, normalizeTechnologyFormValues(values));
  }

  if (suggestion.target === "plotThread") {
    const values = createEmptyPlotThreadFormValues();
    values.title = titleOrName;
    values.summary = summary;
    values.description = description;
    values.publicWikiSummary = publicWikiSummary;
    return createPlotThreadForProject(uid, activeProjectId, normalizePlotThreadFormValues(values));
  }

  const values = createEmptyThemeFormValues();
  values.name = titleOrName;
  values.summary = summary;
  values.description = description;
  values.publicWikiSummary = publicWikiSummary;
  return createThemeForProject(uid, activeProjectId, normalizeThemeFormValues(values));
}

function unique(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function getSuggestionCreationKey(suggestion: BrainDumpEntitySuggestion) {
  return `${suggestion.target}:${normalizeCreationKey(
    suggestion.suggestedCreateFields.titleOrName || suggestion.mention
  )}`;
}

function normalizeCreationKey(value: string) {
  return String(value ?? "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
