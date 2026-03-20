import type { TimelineEvent } from "@/types/timeline-event";

export type TimelineReferenceOption = {
  value: string;
  label: string;
  meta?: string;
};

export type TimelineReferenceSets = {
  bookIds: ReadonlySet<string>;
  chapterIds: ReadonlySet<string>;
  sceneIds: ReadonlySet<string>;
  characterIds: ReadonlySet<string>;
  locationIds: ReadonlySet<string>;
  eraIds: ReadonlySet<string>;
  factionIds: ReadonlySet<string>;
  cultureIds: ReadonlySet<string>;
  religionIds: ReadonlySet<string>;
  technologyIds: ReadonlySet<string>;
  plotThreadIds: ReadonlySet<string>;
  themeIds: ReadonlySet<string>;
  timelineEventIds: ReadonlySet<string>;
};

export type TimelineReferenceMaps = {
  bookIds: ReadonlyMap<string, TimelineReferenceOption>;
  chapterIds: ReadonlyMap<string, TimelineReferenceOption>;
  sceneIds: ReadonlyMap<string, TimelineReferenceOption>;
  characterIds: ReadonlyMap<string, TimelineReferenceOption>;
  locationIds: ReadonlyMap<string, TimelineReferenceOption>;
  eraIds: ReadonlyMap<string, TimelineReferenceOption>;
  factionIds: ReadonlyMap<string, TimelineReferenceOption>;
  cultureIds: ReadonlyMap<string, TimelineReferenceOption>;
  religionIds: ReadonlyMap<string, TimelineReferenceOption>;
  technologyIds: ReadonlyMap<string, TimelineReferenceOption>;
  plotThreadIds: ReadonlyMap<string, TimelineReferenceOption>;
  themeIds: ReadonlyMap<string, TimelineReferenceOption>;
  timelineEventIds: ReadonlyMap<string, TimelineReferenceOption>;
};

export type TimelineLinkedReferenceItem = {
  id: string;
  label: string;
  href: string;
  missing: boolean;
  meta?: string;
};

export type TimelineLinkedReferenceGroup = {
  label: string;
  items: TimelineLinkedReferenceItem[];
};

export type TimelineReferenceSelection = {
  eraId: string | null;
  bookIds: string[];
  chapterIds: string[];
  sceneIds: string[];
  characterIds: string[];
  locationIds: string[];
  factionIds: string[];
  cultureIds: string[];
  religionIds: string[];
  technologyIds: string[];
  plotThreadIds: string[];
  themeIds: string[];
  predecessorEventIds: string[];
  successorEventIds: string[];
};

type ReferenceListConfig = {
  eventIds: string[];
  label: string;
  basePath: string;
  knownIds: ReadonlySet<string>;
  optionMap: ReadonlyMap<string, TimelineReferenceOption>;
};

export function buildTimelineReferenceSet(options: TimelineReferenceOption[]) {
  return new Set(options.map((option) => option.value));
}

export function buildTimelineReferenceMap(options: TimelineReferenceOption[]) {
  return new Map(options.map((option) => [option.value, option] as const));
}

export function getTimelineReferenceIssues(
  timelineEvent: TimelineEvent,
  referenceSets: TimelineReferenceSets
) {
  return getTimelineReferenceSelectionIssues(
    {
      eraId: timelineEvent.eraId,
      bookIds: timelineEvent.bookIds,
      chapterIds: timelineEvent.chapterIds,
      sceneIds: timelineEvent.sceneIds,
      characterIds: timelineEvent.characterIds,
      locationIds: timelineEvent.locationIds,
      factionIds: timelineEvent.factionIds,
      cultureIds: timelineEvent.cultureIds,
      religionIds: timelineEvent.religionIds,
      technologyIds: timelineEvent.technologyIds,
      plotThreadIds: timelineEvent.plotThreadIds,
      themeIds: timelineEvent.themeIds,
      predecessorEventIds: timelineEvent.predecessorEventIds,
      successorEventIds: timelineEvent.successorEventIds,
    },
    referenceSets
  );
}

export function getTimelineReferenceSelectionIssues(
  selection: TimelineReferenceSelection,
  referenceSets: TimelineReferenceSets
) {
  const issues: string[] = [];

  const referenceChecks = [
    buildMissingReferenceMessage("book links", selection.bookIds, referenceSets.bookIds),
    buildMissingReferenceMessage(
      "chapter links",
      selection.chapterIds,
      referenceSets.chapterIds
    ),
    buildMissingReferenceMessage("scene links", selection.sceneIds, referenceSets.sceneIds),
    buildMissingReferenceMessage(
      "character links",
      selection.characterIds,
      referenceSets.characterIds
    ),
    buildMissingReferenceMessage(
      "location links",
      selection.locationIds,
      referenceSets.locationIds
    ),
    buildMissingReferenceMessage(
      "faction links",
      selection.factionIds,
      referenceSets.factionIds
    ),
    buildMissingReferenceMessage(
      "culture links",
      selection.cultureIds,
      referenceSets.cultureIds
    ),
    buildMissingReferenceMessage(
      "religion links",
      selection.religionIds,
      referenceSets.religionIds
    ),
    buildMissingReferenceMessage(
      "technology links",
      selection.technologyIds,
      referenceSets.technologyIds
    ),
    buildMissingReferenceMessage(
      "plot thread links",
      selection.plotThreadIds,
      referenceSets.plotThreadIds
    ),
    buildMissingReferenceMessage("theme links", selection.themeIds, referenceSets.themeIds),
    buildMissingReferenceMessage(
      "predecessor links",
      selection.predecessorEventIds,
      referenceSets.timelineEventIds
    ),
    buildMissingReferenceMessage(
      "successor links",
      selection.successorEventIds,
      referenceSets.timelineEventIds
    ),
  ];

  referenceChecks.forEach((message) => {
    if (message) {
      issues.push(message);
    }
  });

  if (selection.eraId && !referenceSets.eraIds.has(selection.eraId)) {
    issues.push(`Missing era link: ${selection.eraId}.`);
  }

  return issues;
}

export function buildTimelineLinkedReferenceGroups(
  timelineEvent: TimelineEvent,
  referenceMaps: TimelineReferenceMaps
) {
  return [
    buildReferenceGroup({
      label: "Books",
      eventIds: timelineEvent.bookIds,
      basePath: "/books",
      knownIds: new Set(referenceMaps.bookIds.keys()),
      optionMap: referenceMaps.bookIds,
    }),
    buildReferenceGroup({
      label: "Chapters",
      eventIds: timelineEvent.chapterIds,
      basePath: "/chapters",
      knownIds: new Set(referenceMaps.chapterIds.keys()),
      optionMap: referenceMaps.chapterIds,
    }),
    buildReferenceGroup({
      label: "Scenes",
      eventIds: timelineEvent.sceneIds,
      basePath: "/scenes",
      knownIds: new Set(referenceMaps.sceneIds.keys()),
      optionMap: referenceMaps.sceneIds,
    }),
    buildReferenceGroup({
      label: "Characters",
      eventIds: timelineEvent.characterIds,
      basePath: "/characters",
      knownIds: new Set(referenceMaps.characterIds.keys()),
      optionMap: referenceMaps.characterIds,
    }),
    buildReferenceGroup({
      label: "Locations",
      eventIds: timelineEvent.locationIds,
      basePath: "/locations",
      knownIds: new Set(referenceMaps.locationIds.keys()),
      optionMap: referenceMaps.locationIds,
    }),
    buildReferenceGroup({
      label: "Era",
      eventIds: timelineEvent.eraId ? [timelineEvent.eraId] : [],
      basePath: "/eras",
      knownIds: new Set(referenceMaps.eraIds.keys()),
      optionMap: referenceMaps.eraIds,
    }),
    buildReferenceGroup({
      label: "Factions",
      eventIds: timelineEvent.factionIds,
      basePath: "/factions",
      knownIds: new Set(referenceMaps.factionIds.keys()),
      optionMap: referenceMaps.factionIds,
    }),
    buildReferenceGroup({
      label: "Cultures",
      eventIds: timelineEvent.cultureIds,
      basePath: "/cultures",
      knownIds: new Set(referenceMaps.cultureIds.keys()),
      optionMap: referenceMaps.cultureIds,
    }),
    buildReferenceGroup({
      label: "Religions",
      eventIds: timelineEvent.religionIds,
      basePath: "/religions",
      knownIds: new Set(referenceMaps.religionIds.keys()),
      optionMap: referenceMaps.religionIds,
    }),
    buildReferenceGroup({
      label: "Technologies",
      eventIds: timelineEvent.technologyIds,
      basePath: "/technologies",
      knownIds: new Set(referenceMaps.technologyIds.keys()),
      optionMap: referenceMaps.technologyIds,
    }),
    buildReferenceGroup({
      label: "Plot threads",
      eventIds: timelineEvent.plotThreadIds,
      basePath: "/plot-threads",
      knownIds: new Set(referenceMaps.plotThreadIds.keys()),
      optionMap: referenceMaps.plotThreadIds,
    }),
    buildReferenceGroup({
      label: "Themes",
      eventIds: timelineEvent.themeIds,
      basePath: "/themes",
      knownIds: new Set(referenceMaps.themeIds.keys()),
      optionMap: referenceMaps.themeIds,
    }),
    buildReferenceGroup({
      label: "Predecessors",
      eventIds: timelineEvent.predecessorEventIds,
      basePath: "/timeline-events",
      knownIds: new Set(referenceMaps.timelineEventIds.keys()),
      optionMap: referenceMaps.timelineEventIds,
    }),
    buildReferenceGroup({
      label: "Successors",
      eventIds: timelineEvent.successorEventIds,
      basePath: "/timeline-events",
      knownIds: new Set(referenceMaps.timelineEventIds.keys()),
      optionMap: referenceMaps.timelineEventIds,
    }),
  ].filter((group): group is TimelineLinkedReferenceGroup => group !== null);
}

function buildMissingReferenceMessage(
  label: string,
  ids: string[],
  knownIds: ReadonlySet<string>
) {
  const missingIds = ids.filter((id) => !knownIds.has(id));
  return missingIds.length > 0 ? `Missing ${label}: ${missingIds.join(", ")}.` : null;
}

function buildReferenceGroup(config: ReferenceListConfig) {
  if (config.eventIds.length === 0) {
    return null;
  }

  return {
    label: config.label,
    items: config.eventIds.map((id) => {
      const option = config.optionMap.get(id);

      return {
        id,
        label: option?.label ?? id,
        href: `${config.basePath}/${id}`,
        missing: !config.knownIds.has(id),
        meta: option?.meta,
      };
    }),
  } satisfies TimelineLinkedReferenceGroup;
}
