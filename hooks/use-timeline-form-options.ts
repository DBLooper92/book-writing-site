"use client";

import { useBooks } from "@/hooks/use-books";
import { useCharacters } from "@/hooks/use-characters";
import { useChapters } from "@/hooks/use-chapters";
import { useCultures } from "@/hooks/use-cultures";
import { useEras } from "@/hooks/use-eras";
import { useFactions } from "@/hooks/use-factions";
import { useLocations } from "@/hooks/use-locations";
import { usePlotThreads } from "@/hooks/use-plot-threads";
import { useReligions } from "@/hooks/use-religions";
import { useScenes } from "@/hooks/use-scenes";
import { useTechnologies } from "@/hooks/use-technologies";
import { useThemes } from "@/hooks/use-themes";
import { useTimelineEvents } from "@/hooks/use-timeline-events";
import {
  buildTimelineReferenceMap,
  buildTimelineReferenceSet,
  type TimelineReferenceMaps,
  type TimelineReferenceOption,
  type TimelineReferenceSets,
} from "@/lib/timeline/references";
import { getTimelineEventChronologyLabel } from "@/lib/timeline/workspace";

export type TimelineFormOptionsResult = {
  loading: boolean;
  error: string | null;
  bookOptions: TimelineReferenceOption[];
  chapterOptions: TimelineReferenceOption[];
  sceneOptions: TimelineReferenceOption[];
  characterOptions: TimelineReferenceOption[];
  locationOptions: TimelineReferenceOption[];
  eraOptions: TimelineReferenceOption[];
  factionOptions: TimelineReferenceOption[];
  cultureOptions: TimelineReferenceOption[];
  religionOptions: TimelineReferenceOption[];
  technologyOptions: TimelineReferenceOption[];
  plotThreadOptions: TimelineReferenceOption[];
  themeOptions: TimelineReferenceOption[];
  timelineEventOptions: TimelineReferenceOption[];
  referenceSets: TimelineReferenceSets;
  referenceMaps: TimelineReferenceMaps;
};

export function useTimelineFormOptions(currentTimelineEventId?: string | null) {
  const booksState = useBooks();
  const chaptersState = useChapters();
  const scenesState = useScenes();
  const charactersState = useCharacters();
  const locationsState = useLocations();
  const erasState = useEras();
  const factionsState = useFactions();
  const culturesState = useCultures();
  const religionsState = useReligions();
  const technologiesState = useTechnologies();
  const plotThreadsState = usePlotThreads();
  const themesState = useThemes();
  const timelineEventsState = useTimelineEvents();
  const bookOptions = booksState.books.map((book) => ({
    value: book.id,
    label: book.title,
    meta: book.summary || book.id,
  }));
  const chapterOptions = chaptersState.chapters.map((chapter) => ({
    value: chapter.id,
    label: chapter.title,
    meta: chapter.bookId ? `Book: ${chapter.bookId}` : chapter.id,
  }));
  const sceneOptions = scenesState.scenes.map((scene) => ({
    value: scene.id,
    label: scene.title,
    meta: scene.chapterId || scene.bookId || scene.id,
  }));
  const characterOptions = charactersState.characters.map((character) => ({
    value: character.id,
    label: character.name,
    meta: character.summary || character.id,
  }));
  const locationOptions = locationsState.locations.map((location) => ({
    value: location.id,
    label: location.name,
    meta: location.locationType || location.id,
  }));
  const eraOptions = erasState.eras.map((era) => ({
    value: era.id,
    label: era.name,
    meta: buildYearMeta(era.startYear, era.endYear),
  }));
  const factionOptions = factionsState.factions.map((faction) => ({
    value: faction.id,
    label: faction.name,
    meta: faction.factionType,
  }));
  const cultureOptions = culturesState.cultures.map((culture) => ({
    value: culture.id,
    label: culture.name,
    meta: culture.summary || culture.id,
  }));
  const religionOptions = religionsState.religions.map((religion) => ({
    value: religion.id,
    label: religion.name,
    meta: religion.deityOrFocus || religion.id,
  }));
  const technologyOptions = technologiesState.technologies.map((technology) => ({
    value: technology.id,
    label: technology.name,
    meta: technology.technologyType || technology.id,
  }));
  const plotThreadOptions = plotThreadsState.plotThreads.map((plotThread) => ({
    value: plotThread.id,
    label: plotThread.title,
    meta: plotThread.threadType,
  }));
  const themeOptions = themesState.themes.map((theme) => ({
    value: theme.id,
    label: theme.name,
    meta: theme.centralQuestion || theme.id,
  }));
  const timelineEventOptions = timelineEventsState.timelineEvents
    .filter((timelineEvent) => timelineEvent.id !== currentTimelineEventId)
    .map((timelineEvent) => ({
      value: timelineEvent.id,
      label: timelineEvent.title,
      meta: getTimelineEventChronologyLabel(timelineEvent),
    }));

  return {
    loading:
      booksState.loading ||
      chaptersState.loading ||
      scenesState.loading ||
      charactersState.loading ||
      locationsState.loading ||
      erasState.loading ||
      factionsState.loading ||
      culturesState.loading ||
      religionsState.loading ||
      technologiesState.loading ||
      plotThreadsState.loading ||
      themesState.loading ||
      timelineEventsState.loading,
    error:
      booksState.error ||
      chaptersState.error ||
      scenesState.error ||
      charactersState.error ||
      locationsState.error ||
      erasState.error ||
      factionsState.error ||
      culturesState.error ||
      religionsState.error ||
      technologiesState.error ||
      plotThreadsState.error ||
      themesState.error ||
      timelineEventsState.error,
    bookOptions,
    chapterOptions,
    sceneOptions,
    characterOptions,
    locationOptions,
    eraOptions,
    factionOptions,
    cultureOptions,
    religionOptions,
    technologyOptions,
    plotThreadOptions,
    themeOptions,
    timelineEventOptions,
    referenceSets: {
      bookIds: buildTimelineReferenceSet(bookOptions),
      chapterIds: buildTimelineReferenceSet(chapterOptions),
      sceneIds: buildTimelineReferenceSet(sceneOptions),
      characterIds: buildTimelineReferenceSet(characterOptions),
      locationIds: buildTimelineReferenceSet(locationOptions),
      eraIds: buildTimelineReferenceSet(eraOptions),
      factionIds: buildTimelineReferenceSet(factionOptions),
      cultureIds: buildTimelineReferenceSet(cultureOptions),
      religionIds: buildTimelineReferenceSet(religionOptions),
      technologyIds: buildTimelineReferenceSet(technologyOptions),
      plotThreadIds: buildTimelineReferenceSet(plotThreadOptions),
      themeIds: buildTimelineReferenceSet(themeOptions),
      timelineEventIds: buildTimelineReferenceSet(timelineEventOptions),
    },
    referenceMaps: {
      bookIds: buildTimelineReferenceMap(bookOptions),
      chapterIds: buildTimelineReferenceMap(chapterOptions),
      sceneIds: buildTimelineReferenceMap(sceneOptions),
      characterIds: buildTimelineReferenceMap(characterOptions),
      locationIds: buildTimelineReferenceMap(locationOptions),
      eraIds: buildTimelineReferenceMap(eraOptions),
      factionIds: buildTimelineReferenceMap(factionOptions),
      cultureIds: buildTimelineReferenceMap(cultureOptions),
      religionIds: buildTimelineReferenceMap(religionOptions),
      technologyIds: buildTimelineReferenceMap(technologyOptions),
      plotThreadIds: buildTimelineReferenceMap(plotThreadOptions),
      themeIds: buildTimelineReferenceMap(themeOptions),
      timelineEventIds: buildTimelineReferenceMap(timelineEventOptions),
    },
  } satisfies TimelineFormOptionsResult;
}

function buildYearMeta(startYear: number | null, endYear: number | null) {
  if (typeof startYear === "number" && typeof endYear === "number") {
    return startYear === endYear ? String(startYear) : `${startYear}-${endYear}`;
  }

  if (typeof startYear === "number") {
    return `From ${startYear}`;
  }

  if (typeof endYear === "number") {
    return `Until ${endYear}`;
  }

  return undefined;
}
