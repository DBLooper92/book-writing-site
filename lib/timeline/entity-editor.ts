"use client";

import type { ComponentType } from "react";

import { AttachmentForm } from "@/components/attachments/attachment-form";
import { BookForm } from "@/components/books/book-form";
import { ChapterForm } from "@/components/chapters/chapter-form";
import { CharacterForm } from "@/components/characters/character-form";
import { CultureForm } from "@/components/cultures/culture-form";
import { EraForm } from "@/components/eras/era-form";
import { FactionForm } from "@/components/factions/faction-form";
import { GlossaryTermForm } from "@/components/glossary-terms/glossary-term-form";
import { GovernmentForm } from "@/components/governments/government-form";
import { ItemForm } from "@/components/items/item-form";
import { LanguageForm } from "@/components/languages/language-form";
import { LocationForm } from "@/components/locations/location-form";
import { NoteForm } from "@/components/notes/note-form";
import { OrganizationForm } from "@/components/organizations/organization-form";
import { OutlineForm } from "@/components/outlines/outline-form";
import { PlotThreadForm } from "@/components/plot-threads/plot-thread-form";
import { RelationshipForm } from "@/components/relationships/relationship-form";
import { ReligionForm } from "@/components/religions/religion-form";
import { RetconForm } from "@/components/retcons/retcon-form";
import { SceneForm } from "@/components/scenes/scene-form";
import { SpeciesForm } from "@/components/species/species-form";
import { TechnologyForm } from "@/components/technologies/technology-form";
import { ThemeForm } from "@/components/themes/theme-form";
import { createAttachmentForProject } from "@/lib/data/attachments";
import { createBookForProject } from "@/lib/data/books";
import { createChapterForProject } from "@/lib/data/chapters";
import { createCharacterForProject } from "@/lib/data/characters";
import { createCultureForProject } from "@/lib/data/cultures";
import { createEraForProject } from "@/lib/data/eras";
import { createFactionForProject } from "@/lib/data/factions";
import { createGlossaryTermForProject } from "@/lib/data/glossary-terms";
import { createGovernmentForProject } from "@/lib/data/governments";
import { createItemForProject } from "@/lib/data/items";
import { createLanguageForProject } from "@/lib/data/languages";
import { createLocationForProject } from "@/lib/data/locations";
import { createNoteForProject } from "@/lib/data/notes";
import { createOrganizationForProject } from "@/lib/data/organizations";
import { createOutlineForProject } from "@/lib/data/outlines";
import { createPlotThreadForProject } from "@/lib/data/plot-threads";
import { createRelationshipForProject } from "@/lib/data/relationships";
import { createReligionForProject } from "@/lib/data/religions";
import { createRetconForProject } from "@/lib/data/retcons";
import { createSceneForProject } from "@/lib/data/scenes";
import { createSpeciesForProject } from "@/lib/data/species";
import { createTechnologyForProject } from "@/lib/data/technologies";
import { createThemeForProject } from "@/lib/data/themes";
import type { NormalizedAttachmentFormValues } from "@/types/attachment";
import { createEmptyAttachmentFormValues } from "@/types/attachment";
import type { NormalizedBookFormValues } from "@/types/book";
import { createEmptyBookFormValues } from "@/types/book";
import type { NormalizedChapterFormValues } from "@/types/chapter";
import { createEmptyChapterFormValues } from "@/types/chapter";
import type { NormalizedCharacterFormValues } from "@/types/character";
import { createEmptyCharacterFormValues } from "@/types/character";
import type { NormalizedCultureFormValues } from "@/types/culture";
import { createEmptyCultureFormValues } from "@/types/culture";
import type { NormalizedEraFormValues } from "@/types/era";
import { createEmptyEraFormValues } from "@/types/era";
import type { NormalizedFactionFormValues } from "@/types/faction";
import { createEmptyFactionFormValues } from "@/types/faction";
import type { NormalizedGlossaryTermFormValues } from "@/types/glossary-term";
import { createEmptyGlossaryTermFormValues } from "@/types/glossary-term";
import type { NormalizedGovernmentFormValues } from "@/types/government";
import { createEmptyGovernmentFormValues } from "@/types/government";
import type { NormalizedItemFormValues } from "@/types/item";
import { createEmptyItemFormValues } from "@/types/item";
import type { NormalizedLanguageFormValues } from "@/types/language";
import { createEmptyLanguageFormValues } from "@/types/language";
import type { NormalizedLocationFormValues } from "@/types/location";
import { createEmptyLocationFormValues } from "@/types/location";
import type { NormalizedNoteFormValues } from "@/types/note";
import { createEmptyNoteFormValues } from "@/types/note";
import type { NormalizedOrganizationFormValues } from "@/types/organization";
import { createEmptyOrganizationFormValues } from "@/types/organization";
import type { NormalizedOutlineFormValues } from "@/types/outline";
import { createEmptyOutlineFormValues } from "@/types/outline";
import type { NormalizedPlotThreadFormValues } from "@/types/plot-thread";
import { createEmptyPlotThreadFormValues } from "@/types/plot-thread";
import type { NormalizedRelationshipFormValues } from "@/types/relationship";
import { createEmptyRelationshipFormValues } from "@/types/relationship";
import type { NormalizedReligionFormValues } from "@/types/religion";
import { createEmptyReligionFormValues } from "@/types/religion";
import type { NormalizedRetconFormValues } from "@/types/retcon";
import { createEmptyRetconFormValues } from "@/types/retcon";
import type { NormalizedSceneFormValues } from "@/types/scene";
import { createEmptySceneFormValues } from "@/types/scene";
import type { NormalizedSpeciesFormValues } from "@/types/species";
import { createEmptySpeciesFormValues } from "@/types/species";
import type { NormalizedTechnologyFormValues } from "@/types/technology";
import { createEmptyTechnologyFormValues } from "@/types/technology";
import type { NormalizedThemeFormValues } from "@/types/theme";
import { createEmptyThemeFormValues } from "@/types/theme";

export type TimelineEntitySliceType =
  | "attachment"
  | "book"
  | "chapter"
  | "character"
  | "culture"
  | "era"
  | "faction"
  | "glossaryTerm"
  | "government"
  | "item"
  | "language"
  | "location"
  | "note"
  | "organization"
  | "outline"
  | "plotThread"
  | "relationship"
  | "religion"
  | "retcon"
  | "scene"
  | "species"
  | "technology"
  | "theme";

export type TimelineEntityEditorConfig = {
  createEntity: (uid: string, projectId: string, values: unknown) => Promise<string>;
  createInitialValues: () => unknown;
  formComponent: ComponentType<any>;
  indexLabel: string;
  indexRoute: string;
  sliceType: TimelineEntitySliceType;
  title: string;
};

export const TIMELINE_ENTITY_EDITOR_ORDER: TimelineEntitySliceType[] = [
  "book",
  "chapter",
  "scene",
  "character",
  "location",
  "item",
  "organization",
  "faction",
  "culture",
  "species",
  "technology",
  "religion",
  "government",
  "plotThread",
  "theme",
  "relationship",
  "era",
  "retcon",
  "attachment",
  "note",
  "glossaryTerm",
  "outline",
  "language",
];

export const TIMELINE_ENTITY_EDITOR_CONFIG: Record<TimelineEntitySliceType, TimelineEntityEditorConfig> = {
  attachment: {
    createEntity: (uid, projectId, values) =>
      createAttachmentForProject(uid, projectId, values as NormalizedAttachmentFormValues),
    createInitialValues: createEmptyAttachmentFormValues,
    formComponent: AttachmentForm,
    indexLabel: "Attachments",
    indexRoute: "/attachments",
    sliceType: "attachment",
    title: "Attachment",
  },
  book: {
    createEntity: (uid, projectId, values) =>
      createBookForProject(uid, projectId, values as NormalizedBookFormValues),
    createInitialValues: createEmptyBookFormValues,
    formComponent: BookForm,
    indexLabel: "Books",
    indexRoute: "/books",
    sliceType: "book",
    title: "Book",
  },
  chapter: {
    createEntity: (uid, projectId, values) =>
      createChapterForProject(uid, projectId, values as NormalizedChapterFormValues),
    createInitialValues: createEmptyChapterFormValues,
    formComponent: ChapterForm,
    indexLabel: "Chapters",
    indexRoute: "/chapters",
    sliceType: "chapter",
    title: "Chapter",
  },
  character: {
    createEntity: (uid, projectId, values) =>
      createCharacterForProject(uid, projectId, values as NormalizedCharacterFormValues),
    createInitialValues: createEmptyCharacterFormValues,
    formComponent: CharacterForm,
    indexLabel: "Characters",
    indexRoute: "/characters",
    sliceType: "character",
    title: "Character",
  },
  culture: {
    createEntity: (uid, projectId, values) =>
      createCultureForProject(uid, projectId, values as NormalizedCultureFormValues),
    createInitialValues: createEmptyCultureFormValues,
    formComponent: CultureForm,
    indexLabel: "Cultures",
    indexRoute: "/cultures",
    sliceType: "culture",
    title: "Culture",
  },
  era: {
    createEntity: (uid, projectId, values) =>
      createEraForProject(uid, projectId, values as NormalizedEraFormValues),
    createInitialValues: createEmptyEraFormValues,
    formComponent: EraForm,
    indexLabel: "Eras",
    indexRoute: "/eras",
    sliceType: "era",
    title: "Era",
  },
  faction: {
    createEntity: (uid, projectId, values) =>
      createFactionForProject(uid, projectId, values as NormalizedFactionFormValues),
    createInitialValues: createEmptyFactionFormValues,
    formComponent: FactionForm,
    indexLabel: "Factions",
    indexRoute: "/factions",
    sliceType: "faction",
    title: "Faction",
  },
  glossaryTerm: {
    createEntity: (uid, projectId, values) =>
      createGlossaryTermForProject(uid, projectId, values as NormalizedGlossaryTermFormValues),
    createInitialValues: createEmptyGlossaryTermFormValues,
    formComponent: GlossaryTermForm,
    indexLabel: "Glossary terms",
    indexRoute: "/glossary-terms",
    sliceType: "glossaryTerm",
    title: "Glossary term",
  },
  government: {
    createEntity: (uid, projectId, values) =>
      createGovernmentForProject(uid, projectId, values as NormalizedGovernmentFormValues),
    createInitialValues: createEmptyGovernmentFormValues,
    formComponent: GovernmentForm,
    indexLabel: "Governments",
    indexRoute: "/governments",
    sliceType: "government",
    title: "Government",
  },
  item: {
    createEntity: (uid, projectId, values) =>
      createItemForProject(uid, projectId, values as NormalizedItemFormValues),
    createInitialValues: createEmptyItemFormValues,
    formComponent: ItemForm,
    indexLabel: "Items",
    indexRoute: "/items",
    sliceType: "item",
    title: "Item",
  },
  language: {
    createEntity: (uid, projectId, values) =>
      createLanguageForProject(uid, projectId, values as NormalizedLanguageFormValues),
    createInitialValues: createEmptyLanguageFormValues,
    formComponent: LanguageForm,
    indexLabel: "Languages",
    indexRoute: "/languages",
    sliceType: "language",
    title: "Language",
  },
  location: {
    createEntity: (uid, projectId, values) =>
      createLocationForProject(uid, projectId, values as NormalizedLocationFormValues),
    createInitialValues: createEmptyLocationFormValues,
    formComponent: LocationForm,
    indexLabel: "Locations",
    indexRoute: "/locations",
    sliceType: "location",
    title: "Location",
  },
  note: {
    createEntity: (uid, projectId, values) =>
      createNoteForProject(uid, projectId, values as NormalizedNoteFormValues),
    createInitialValues: createEmptyNoteFormValues,
    formComponent: NoteForm,
    indexLabel: "Notes",
    indexRoute: "/notes",
    sliceType: "note",
    title: "Note",
  },
  organization: {
    createEntity: (uid, projectId, values) =>
      createOrganizationForProject(uid, projectId, values as NormalizedOrganizationFormValues),
    createInitialValues: createEmptyOrganizationFormValues,
    formComponent: OrganizationForm,
    indexLabel: "Organizations",
    indexRoute: "/organizations",
    sliceType: "organization",
    title: "Organization",
  },
  outline: {
    createEntity: (uid, projectId, values) =>
      createOutlineForProject(uid, projectId, values as NormalizedOutlineFormValues),
    createInitialValues: createEmptyOutlineFormValues,
    formComponent: OutlineForm,
    indexLabel: "Outlines",
    indexRoute: "/outlines",
    sliceType: "outline",
    title: "Outline",
  },
  plotThread: {
    createEntity: (uid, projectId, values) =>
      createPlotThreadForProject(uid, projectId, values as NormalizedPlotThreadFormValues),
    createInitialValues: createEmptyPlotThreadFormValues,
    formComponent: PlotThreadForm,
    indexLabel: "Plot threads",
    indexRoute: "/plot-threads",
    sliceType: "plotThread",
    title: "Plot thread",
  },
  relationship: {
    createEntity: (uid, projectId, values) =>
      createRelationshipForProject(uid, projectId, values as NormalizedRelationshipFormValues),
    createInitialValues: createEmptyRelationshipFormValues,
    formComponent: RelationshipForm,
    indexLabel: "Relationships",
    indexRoute: "/relationships",
    sliceType: "relationship",
    title: "Relationship",
  },
  religion: {
    createEntity: (uid, projectId, values) =>
      createReligionForProject(uid, projectId, values as NormalizedReligionFormValues),
    createInitialValues: createEmptyReligionFormValues,
    formComponent: ReligionForm,
    indexLabel: "Religions",
    indexRoute: "/religions",
    sliceType: "religion",
    title: "Religion",
  },
  retcon: {
    createEntity: (uid, projectId, values) =>
      createRetconForProject(uid, projectId, values as NormalizedRetconFormValues),
    createInitialValues: createEmptyRetconFormValues,
    formComponent: RetconForm,
    indexLabel: "Retcons",
    indexRoute: "/retcons",
    sliceType: "retcon",
    title: "Retcon",
  },
  scene: {
    createEntity: (uid, projectId, values) =>
      createSceneForProject(uid, projectId, values as NormalizedSceneFormValues),
    createInitialValues: createEmptySceneFormValues,
    formComponent: SceneForm,
    indexLabel: "Scenes",
    indexRoute: "/scenes",
    sliceType: "scene",
    title: "Scene",
  },
  species: {
    createEntity: (uid, projectId, values) =>
      createSpeciesForProject(uid, projectId, values as NormalizedSpeciesFormValues),
    createInitialValues: createEmptySpeciesFormValues,
    formComponent: SpeciesForm,
    indexLabel: "Species",
    indexRoute: "/species",
    sliceType: "species",
    title: "Species",
  },
  technology: {
    createEntity: (uid, projectId, values) =>
      createTechnologyForProject(uid, projectId, values as NormalizedTechnologyFormValues),
    createInitialValues: createEmptyTechnologyFormValues,
    formComponent: TechnologyForm,
    indexLabel: "Technologies",
    indexRoute: "/technologies",
    sliceType: "technology",
    title: "Technology",
  },
  theme: {
    createEntity: (uid, projectId, values) =>
      createThemeForProject(uid, projectId, values as NormalizedThemeFormValues),
    createInitialValues: createEmptyThemeFormValues,
    formComponent: ThemeForm,
    indexLabel: "Themes",
    indexRoute: "/themes",
    sliceType: "theme",
    title: "Theme",
  },
};
