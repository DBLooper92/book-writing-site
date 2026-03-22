import "client-only";

import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { Database } from "@/types/database";
import { buildAiSessionDocument, createEmptyAiSessionFormValues, normalizeAiSessionFormValues } from "@/types/ai-session";
import { buildAttachmentDocument, createEmptyAttachmentFormValues, normalizeAttachmentFormValues } from "@/types/attachment";
import { buildBookDocument, createEmptyBookFormValues, normalizeBookFormValues } from "@/types/book";
import { buildChapterDocument, createEmptyChapterFormValues, normalizeChapterFormValues } from "@/types/chapter";
import { buildCharacterDocument, createEmptyCharacterFormValues, normalizeCharacterFormValues } from "@/types/character";
import { buildCultureDocument, createEmptyCultureFormValues, normalizeCultureFormValues } from "@/types/culture";
import { buildEraDocument, createEmptyEraFormValues, normalizeEraFormValues } from "@/types/era";
import { buildFactionDocument, createEmptyFactionFormValues, normalizeFactionFormValues } from "@/types/faction";
import { buildGlossaryTermDocument, createEmptyGlossaryTermFormValues, normalizeGlossaryTermFormValues } from "@/types/glossary-term";
import { buildGovernmentDocument, createEmptyGovernmentFormValues, normalizeGovernmentFormValues } from "@/types/government";
import { buildItemDocument, createEmptyItemFormValues, normalizeItemFormValues } from "@/types/item";
import { buildLanguageDocument, createEmptyLanguageFormValues, normalizeLanguageFormValues } from "@/types/language";
import { buildLocationDocument, createEmptyLocationFormValues, normalizeLocationFormValues } from "@/types/location";
import { buildNoteDocument, createEmptyNoteFormValues, normalizeNoteFormValues } from "@/types/note";
import { buildOrganizationDocument, createEmptyOrganizationFormValues, normalizeOrganizationFormValues } from "@/types/organization";
import { buildOutlineDocument, createEmptyOutlineFormValues, normalizeOutlineFormValues } from "@/types/outline";
import { buildPlotThreadDocument, createEmptyPlotThreadFormValues, normalizePlotThreadFormValues } from "@/types/plot-thread";
import { buildRelationshipDocument, createEmptyRelationshipFormValues, normalizeRelationshipFormValues } from "@/types/relationship";
import { buildReligionDocument, createEmptyReligionFormValues, normalizeReligionFormValues } from "@/types/religion";
import { buildRetconDocument, createEmptyRetconFormValues, normalizeRetconFormValues } from "@/types/retcon";
import { buildSceneDocument, createEmptySceneFormValues, normalizeSceneFormValues } from "@/types/scene";
import { buildSpeciesDocument, createEmptySpeciesFormValues, normalizeSpeciesFormValues } from "@/types/species";
import { buildTechnologyDocument, createEmptyTechnologyFormValues, normalizeTechnologyFormValues } from "@/types/technology";
import { buildThemeDocument, createEmptyThemeFormValues, normalizeThemeFormValues } from "@/types/theme";
import { buildTimelineEventDocument, createEmptyTimelineEventFormValues, normalizeTimelineEventFormValues } from "@/types/timeline-event";

export const DEFAULT_PROJECT_ID = "default-story-bible";

const seedDocKeys = [
  ["books", "book_001"],
  ["chapters", "chapter_001"],
  ["scenes", "scene_001"],
  ["characters", "char_001"],
  ["locations", "loc_001"],
  ["factions", "faction_001"],
  ["species", "species_001"],
  ["items", "item_001"],
  ["timeline_events", "event_001"],
  ["plot_threads", "thread_001"],
  ["notes", "note_001"],
  ["retcons", "retcon_001"],
  ["cultures", "culture_001"],
  ["relationships", "relationship_001"],
  ["themes", "theme_001"],
  ["eras", "era_001"],
  ["technologies", "technology_001"],
  ["religions", "religion_001"],
  ["governments", "government_001"],
  ["languages", "language_001"],
  ["organizations", "organization_001"],
  ["outlines", "outline_001"],
  ["glossary_terms", "term_001"],
  ["attachments", "attachment_001"],
  ["ai_sessions", "session_001"],
] as const;

type SeedCollectionName = (typeof seedDocKeys)[number][0];

export const STORY_BIBLE_STRUCTURE_PATHS = [
  "users/{uid}",
  `users/{uid}/projects/${DEFAULT_PROJECT_ID}`,
  ...seedDocKeys.map(
    ([collectionName, documentId]) =>
      `users/{uid}/projects/${DEFAULT_PROJECT_ID}/${collectionName}/${documentId}`
  ),
] as const;

export type StoryBibleInitUser = {
  uid: string;
  email: string | null;
  displayName: string | null;
};

type SeedDocument = {
  collectionName: SeedCollectionName;
  documentId: string;
  row: Database["public"]["Tables"][SeedCollectionName]["Insert"];
};

export type StoryBibleInitSummary = {
  userPath: string;
  projectPath: string;
  projectId: string;
  createdPaths: string[];
  updatedPaths: string[];
  skippedPaths: string[];
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
};

export async function initializeStoryBibleDevData(
  user: StoryBibleInitUser
): Promise<StoryBibleInitSummary> {
  if (!user.uid) {
    throw new Error("A signed-in user is required to initialize story-bible data.");
  }

  const supabase = getSupabaseBrowserClient();
  const now = new Date().toISOString();
  const userPath = `users/${user.uid}`;
  const projectPath = `${userPath}/projects/${DEFAULT_PROJECT_ID}`;
  const createdPaths: string[] = [];
  const updatedPaths: string[] = [];
  const skippedPaths: string[] = [];

  const { data: existingProfile, error: profileReadError } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.uid)
    .maybeSingle();

  if (profileReadError) {
    throw profileReadError;
  }

  const { error: profileUpsertError } = await supabase.from("profiles").upsert({
    id: user.uid,
    email: user.email,
    display_name: user.displayName,
    role: "owner",
    plan: "personal",
    status: "active",
    active_project_id: DEFAULT_PROJECT_ID,
    created_at: existingProfile ? undefined : now,
    updated_at: now,
    last_login_at: now,
  });

  if (profileUpsertError) {
    throw profileUpsertError;
  }

  if (existingProfile) {
    updatedPaths.push(userPath);
  } else {
    createdPaths.push(userPath);
  }

  const { data: existingProject, error: projectReadError } = await supabase
    .from("projects")
    .select("id")
    .eq("user_id", user.uid)
    .eq("id", DEFAULT_PROJECT_ID)
    .maybeSingle();

  if (projectReadError) {
    throw projectReadError;
  }

  const { error: projectUpsertError } = await supabase.from("projects").upsert({
    id: DEFAULT_PROJECT_ID,
    user_id: user.uid,
    owner_id: user.uid,
    title: "The Last Ember",
    slug: "the-last-ember",
    summary: "Development seed project for the default story-bible workspace.",
    description:
      "Deterministic starter project used to seed a full set of story-bible entity records for local development.",
    genre: "Epic fantasy",
    tone: "Reflective, tense, and mythic",
    themes: ["memory", "duty", "truth"],
    timeline_start_year: 412,
    timeline_end_year: 418,
    default_calendar_system_id: "calendar_standard_solar",
    primary_point_of_view_style: "Close third person",
    writing_status: "planning",
    book_order_mode: "series-order",
    notes_root_id: "note_001",
    settings: {
      allowPublicWiki: false,
      allowAIWriting: true,
      allowAIEditing: true,
      defaultTimelineScale: "year",
      defaultLanguageId: "language_001",
      spoilerPolicy: "internal-only",
    },
    status: "active",
    created_at: existingProject ? undefined : now,
    updated_at: now,
  });

  if (projectUpsertError) {
    throw projectUpsertError;
  }

  if (existingProject) {
    updatedPaths.push(projectPath);
  } else {
    createdPaths.push(projectPath);
  }

  const starterDocs = buildStarterDocs(user.uid, DEFAULT_PROJECT_ID, now);

  for (const seed of starterDocs) {
    const { data: existingSeed, error: seedReadError } = await supabase
      .from(seed.collectionName)
      .select("id")
      .eq("user_id", user.uid)
      .eq("project_id", DEFAULT_PROJECT_ID)
      .eq("id", seed.documentId)
      .maybeSingle();

    if (seedReadError) {
      throw seedReadError;
    }

    const seedPath = `${projectPath}/${seed.collectionName}/${seed.documentId}`;

    if (existingSeed) {
      skippedPaths.push(seedPath);
      continue;
    }

    const { error: insertError } = await supabase
      .from(seed.collectionName)
      .insert(seed.row as never);

    if (insertError) {
      throw insertError;
    }

    createdPaths.push(seedPath);
  }

  return {
    userPath,
    projectPath,
    projectId: DEFAULT_PROJECT_ID,
    createdPaths,
    updatedPaths,
    skippedPaths,
    createdCount: createdPaths.length,
    updatedCount: updatedPaths.length,
    skippedCount: skippedPaths.length,
  };
}

function buildStarterDocs(uid: string, projectId: string, now: string): SeedDocument[] {
  const rows: SeedDocument[] = [];

  rows.push(
    createSeedDocument(uid, projectId, now, "books", "book_001", buildSeedDocument({
      id: "book_001",
      projectId,
      createEmpty: createEmptyBookFormValues,
      normalize: normalizeBookFormValues,
      build: buildBookDocument,
      labelField: "title",
      labelValue: "Ashes of Dawn",
      overrides: {
        summary: "Starter seeded book.",
        description: "Default seeded book record for development.",
        publicWikiSummary: "Starter seeded book.",
      },
    })),
    createSeedDocument(uid, projectId, now, "chapters", "chapter_001", buildSeedDocument({
      id: "chapter_001",
      projectId,
      createEmpty: createEmptyChapterFormValues,
      normalize: normalizeChapterFormValues,
      build: buildChapterDocument,
      labelField: "title",
      labelValue: "Chapter 1: Smoke Over Greyfen",
      overrides: {
        summary: "Starter seeded chapter.",
        description: "Default seeded chapter record for development.",
        bookId: "book_001",
      },
    })),
    createSeedDocument(uid, projectId, now, "scenes", "scene_001", buildSeedDocument({
      id: "scene_001",
      projectId,
      createEmpty: createEmptySceneFormValues,
      normalize: normalizeSceneFormValues,
      build: buildSceneDocument,
      labelField: "title",
      labelValue: "Scene 1: Embers at the Gate",
      overrides: {
        summary: "Starter seeded scene.",
        description: "Default seeded scene record for development.",
        bookId: "book_001",
        chapterId: "chapter_001",
      },
    })),
    createSeedDocument(uid, projectId, now, "characters", "char_001", buildSeedDocument({
      id: "char_001",
      projectId,
      createEmpty: createEmptyCharacterFormValues,
      normalize: normalizeCharacterFormValues,
      build: buildCharacterDocument,
      labelField: "name",
      labelValue: "Lyra Vale",
      overrides: {
        summary: "Starter seeded character.",
        description: "Default seeded character record for development.",
      },
    })),
    createSeedDocument(uid, projectId, now, "locations", "loc_001", buildSeedDocument({
      id: "loc_001",
      projectId,
      createEmpty: createEmptyLocationFormValues,
      normalize: normalizeLocationFormValues,
      build: buildLocationDocument,
      labelField: "name",
      labelValue: "Greyfen",
      overrides: {
        summary: "Starter seeded location.",
        description: "Default seeded location record for development.",
      },
    })),
    createSeedDocument(uid, projectId, now, "factions", "faction_001", buildSeedDocument({
      id: "faction_001",
      projectId,
      createEmpty: createEmptyFactionFormValues,
      normalize: normalizeFactionFormValues,
      build: buildFactionDocument,
      labelField: "name",
      labelValue: "Ember Wardens",
      overrides: {
        summary: "Starter seeded faction.",
        description: "Default seeded faction record for development.",
      },
    })),
    createSeedDocument(uid, projectId, now, "species", "species_001", buildSeedDocument({
      id: "species_001",
      projectId,
      createEmpty: createEmptySpeciesFormValues,
      normalize: normalizeSpeciesFormValues,
      build: buildSpeciesDocument,
      labelField: "name",
      labelValue: "Humans of Aster",
      overrides: {
        summary: "Starter seeded species.",
        description: "Default seeded species record for development.",
      },
    })),
    createSeedDocument(uid, projectId, now, "items", "item_001", buildSeedDocument({
      id: "item_001",
      projectId,
      createEmpty: createEmptyItemFormValues,
      normalize: normalizeItemFormValues,
      build: buildItemDocument,
      labelField: "name",
      labelValue: "Ember Compass",
      overrides: {
        summary: "Starter seeded item.",
        description: "Default seeded item record for development.",
      },
    })),
    createSeedDocument(uid, projectId, now, "timeline_events", "event_001", buildSeedDocument({
      id: "event_001",
      projectId,
      createEmpty: createEmptyTimelineEventFormValues,
      normalize: normalizeTimelineEventFormValues,
      build: buildTimelineEventDocument,
      labelField: "title",
      labelValue: "The North Gate Ember Theft",
      overrides: {
        summary: "Starter seeded timeline event.",
        description: "Default seeded timeline event record for development.",
        yearStart: "412",
        yearEnd: "412",
        displayDateLabel: "Winter, 412 AE",
      },
    })),
    createSeedDocument(uid, projectId, now, "plot_threads", "thread_001", buildSeedDocument({
      id: "thread_001",
      projectId,
      createEmpty: createEmptyPlotThreadFormValues,
      normalize: normalizePlotThreadFormValues,
      build: buildPlotThreadDocument,
      labelField: "title",
      labelValue: "Mystery of the Last Ember",
      overrides: {
        summary: "Starter seeded plot thread.",
        description: "Default seeded plot-thread record for development.",
      },
    })),
    createSeedDocument(uid, projectId, now, "notes", "note_001", buildSeedDocument({
      id: "note_001",
      projectId,
      createEmpty: createEmptyNoteFormValues,
      normalize: normalizeNoteFormValues,
      build: buildNoteDocument,
      labelField: "title",
      labelValue: "Project Root Note",
      overrides: {
        summary: "Starter seeded note.",
        description: "Default seeded note record for development.",
        content: "Use this starter note for development seeding checks.",
      },
    })),
    createSeedDocument(uid, projectId, now, "retcons", "retcon_001", buildSeedDocument({
      id: "retcon_001",
      projectId,
      createEmpty: createEmptyRetconFormValues,
      normalize: normalizeRetconFormValues,
      build: buildRetconDocument,
      labelField: "title",
      labelValue: "Greyfen District Layout Revision",
      overrides: {
        summary: "Starter seeded retcon.",
        description: "Default seeded retcon record for development.",
      },
    })),
    createSeedDocument(uid, projectId, now, "cultures", "culture_001", buildSeedDocument({
      id: "culture_001",
      projectId,
      createEmpty: createEmptyCultureFormValues,
      normalize: normalizeCultureFormValues,
      build: buildCultureDocument,
      labelField: "name",
      labelValue: "Fenfolk",
      overrides: {
        summary: "Starter seeded culture.",
        description: "Default seeded culture record for development.",
      },
    })),
    createSeedDocument(uid, projectId, now, "relationships", "relationship_001", buildSeedDocument({
      id: "relationship_001",
      projectId,
      createEmpty: createEmptyRelationshipFormValues,
      normalize: normalizeRelationshipFormValues,
      build: buildRelationshipDocument,
      labelField: "title",
      labelValue: "Lyra Vale and the Ember Wardens",
      overrides: {
        summary: "Starter seeded relationship.",
        description: "Default seeded relationship record for development.",
        entityAId: "char_001",
        entityBType: "factions",
        entityBId: "faction_001",
      },
    })),
    createSeedDocument(uid, projectId, now, "themes", "theme_001", buildSeedDocument({
      id: "theme_001",
      projectId,
      createEmpty: createEmptyThemeFormValues,
      normalize: normalizeThemeFormValues,
      build: buildThemeDocument,
      labelField: "name",
      labelValue: "Memory vs Myth",
      overrides: {
        summary: "Starter seeded theme.",
        description: "Default seeded theme record for development.",
      },
    })),
    createSeedDocument(uid, projectId, now, "eras", "era_001", buildSeedDocument({
      id: "era_001",
      projectId,
      createEmpty: createEmptyEraFormValues,
      normalize: normalizeEraFormValues,
      build: buildEraDocument,
      labelField: "name",
      labelValue: "Ashen Recovery",
      overrides: {
        summary: "Starter seeded era.",
        description: "Default seeded era record for development.",
        startYear: "398",
        endYear: "430",
      },
    })),
    createSeedDocument(uid, projectId, now, "technologies", "technology_001", buildSeedDocument({
      id: "technology_001",
      projectId,
      createEmpty: createEmptyTechnologyFormValues,
      normalize: normalizeTechnologyFormValues,
      build: buildTechnologyDocument,
      labelField: "name",
      labelValue: "Ember Relay Network",
      overrides: {
        summary: "Starter seeded technology.",
        description: "Default seeded technology record for development.",
      },
    })),
    createSeedDocument(uid, projectId, now, "religions", "religion_001", buildSeedDocument({
      id: "religion_001",
      projectId,
      createEmpty: createEmptyReligionFormValues,
      normalize: normalizeReligionFormValues,
      build: buildReligionDocument,
      labelField: "name",
      labelValue: "Church of the First Flame",
      overrides: {
        summary: "Starter seeded religion.",
        description: "Default seeded religion record for development.",
      },
    })),
    createSeedDocument(uid, projectId, now, "governments", "government_001", buildSeedDocument({
      id: "government_001",
      projectId,
      createEmpty: createEmptyGovernmentFormValues,
      normalize: normalizeGovernmentFormValues,
      build: buildGovernmentDocument,
      labelField: "name",
      labelValue: "Greyfen Council",
      overrides: {
        summary: "Starter seeded government.",
        description: "Default seeded government record for development.",
      },
    })),
    createSeedDocument(uid, projectId, now, "languages", "language_001", buildSeedDocument({
      id: "language_001",
      projectId,
      createEmpty: createEmptyLanguageFormValues,
      normalize: normalizeLanguageFormValues,
      build: buildLanguageDocument,
      labelField: "name",
      labelValue: "Common Asteric",
      overrides: {
        summary: "Starter seeded language.",
        description: "Default seeded language record for development.",
      },
    })),
    createSeedDocument(uid, projectId, now, "organizations", "organization_001", buildSeedDocument({
      id: "organization_001",
      projectId,
      createEmpty: createEmptyOrganizationFormValues,
      normalize: normalizeOrganizationFormValues,
      build: buildOrganizationDocument,
      labelField: "name",
      labelValue: "Archive of Cinders",
      overrides: {
        summary: "Starter seeded organization.",
        description: "Default seeded organization record for development.",
      },
    })),
    createSeedDocument(uid, projectId, now, "outlines", "outline_001", buildSeedDocument({
      id: "outline_001",
      projectId,
      createEmpty: createEmptyOutlineFormValues,
      normalize: normalizeOutlineFormValues,
      build: buildOutlineDocument,
      labelField: "title",
      labelValue: "Series Spine",
      overrides: {
        summary: "Starter seeded outline.",
        description: "Default seeded outline record for development.",
      },
    })),
    createSeedDocument(uid, projectId, now, "glossary_terms", "term_001", buildSeedDocument({
      id: "term_001",
      projectId,
      createEmpty: createEmptyGlossaryTermFormValues,
      normalize: normalizeGlossaryTermFormValues,
      build: buildGlossaryTermDocument,
      labelField: "title",
      labelValue: "Last Ember",
      overrides: {
        summary: "Starter seeded glossary term.",
        description: "Default seeded glossary record for development.",
      },
    })),
    createSeedDocument(uid, projectId, now, "attachments", "attachment_001", buildSeedDocument({
      id: "attachment_001",
      projectId,
      createEmpty: createEmptyAttachmentFormValues,
      normalize: normalizeAttachmentFormValues,
      build: buildAttachmentDocument,
      labelField: "title",
      labelValue: "Greyfen Map Placeholder",
      overrides: {
        summary: "Starter seeded attachment.",
        description: "Default seeded attachment record for development.",
      },
    })),
    createSeedDocument(uid, projectId, now, "ai_sessions", "session_001", buildSeedDocument({
      id: "session_001",
      projectId,
      createEmpty: createEmptyAiSessionFormValues,
      normalize: normalizeAiSessionFormValues,
      build: buildAiSessionDocument,
      labelField: "title",
      labelValue: "Initial Story Bible Seeding Session",
      overrides: {
        summary: "Starter seeded AI session.",
        description: "Default seeded AI-session record for development.",
      },
    }))
  );

  return rows;
}

function buildSeedDocument<FormValues extends Record<string, unknown>, NormalizedValues, Document>({
  id,
  projectId,
  createEmpty,
  normalize,
  build,
  labelField,
  labelValue,
  overrides,
}: {
  id: string;
  projectId: string;
  createEmpty: () => FormValues;
  normalize: (values: FormValues) => NormalizedValues;
  build: (input: { id: string; projectId: string; values: NormalizedValues }) => Document;
  labelField: keyof FormValues;
  labelValue: string;
  overrides?: Partial<FormValues>;
}) {
  const formValues = {
    ...createEmpty(),
    ...(overrides ?? {}),
    [labelField]: labelValue,
  } as FormValues;

  return build({
    id,
    projectId,
    values: normalize(formValues),
  });
}

function createSeedDocument(
  uid: string,
  projectId: string,
  now: string,
  collectionName: SeedCollectionName,
  documentId: string,
  document: Record<string, unknown>
): SeedDocument {
  return {
    collectionName,
    documentId,
    row: {
      user_id: uid,
      ...toSnakeCaseRecord(document),
      project_id: projectId,
      created_at: now,
      updated_at: now,
    } as Database["public"]["Tables"][SeedCollectionName]["Insert"],
  };
}

function toSnakeCaseRecord(value: Record<string, unknown>) {
  const entries = Object.entries(value)
    .filter(([, entryValue]) => entryValue !== undefined)
    .map(([key, entryValue]) => [toSnakeCase(key), entryValue] as const);

  return Object.fromEntries(entries);
}

function toSnakeCase(value: string) {
  return value.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase();
}
