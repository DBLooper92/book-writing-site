"use client";

import Link from "next/link";

import { useAiSessions } from "@/hooks/use-ai-sessions";
import { useAttachments } from "@/hooks/use-attachments";
import { useBooks } from "@/hooks/use-books";
import { useChapters } from "@/hooks/use-chapters";
import { useCharacters } from "@/hooks/use-characters";
import { useCultures } from "@/hooks/use-cultures";
import { useEras } from "@/hooks/use-eras";
import { useFactions } from "@/hooks/use-factions";
import { useGlossaryTerms } from "@/hooks/use-glossary-terms";
import { useGovernments } from "@/hooks/use-governments";
import { useItems } from "@/hooks/use-items";
import { useLanguages } from "@/hooks/use-languages";
import { useLocations } from "@/hooks/use-locations";
import { useNotes } from "@/hooks/use-notes";
import { useOrganizations } from "@/hooks/use-organizations";
import { useOutlines } from "@/hooks/use-outlines";
import { usePlotThreads } from "@/hooks/use-plot-threads";
import { useRelationships } from "@/hooks/use-relationships";
import { useReligions } from "@/hooks/use-religions";
import { useRetcons } from "@/hooks/use-retcons";
import { useScenes } from "@/hooks/use-scenes";
import { useSpecies } from "@/hooks/use-species";
import { useTechnologies } from "@/hooks/use-technologies";
import { useThemes } from "@/hooks/use-themes";
import { useTimelineEvents } from "@/hooks/use-timeline-events";
import type { UserProject } from "@/lib/data/projects";
import type { AiSession } from "@/types/ai-session";
import type { Attachment } from "@/types/attachment";
import type { Book } from "@/types/book";
import type { Chapter } from "@/types/chapter";
import type { Character } from "@/types/character";
import type { Culture } from "@/types/culture";
import type { Era } from "@/types/era";
import type { Faction } from "@/types/faction";
import type { GlossaryTerm } from "@/types/glossary-term";
import type { Government } from "@/types/government";
import type { Item } from "@/types/item";
import type { Language } from "@/types/language";
import type { Location } from "@/types/location";
import type { Note } from "@/types/note";
import type { Organization } from "@/types/organization";
import type { Outline } from "@/types/outline";
import type { PlotThread } from "@/types/plot-thread";
import type { Relationship } from "@/types/relationship";
import type { Religion } from "@/types/religion";
import type { Retcon } from "@/types/retcon";
import type { Scene } from "@/types/scene";
import type { Species } from "@/types/species";
import type { Technology } from "@/types/technology";
import type { Theme } from "@/types/theme";
import type { TimelineEvent } from "@/types/timeline-event";

type SliceSidebarContentProps = {
  pathname: string;
};

type SliceSidebarContentComponent = (props: SliceSidebarContentProps) => React.JSX.Element;

type SliceNavigationConfig = {
  key: string;
  label: string;
  href: string;
  matchPath: (pathname: string) => boolean;
  renderContent: SliceSidebarContentComponent;
};

type SharedListHookResult = {
  loading: boolean;
  error: string | null;
  user: unknown;
  activeProjectId: string | null;
  activeProject: UserProject | null;
};

type SliceSidebarListItem = {
  id: string;
  href: string;
  isActive: boolean;
  label: string;
};

export function getActiveSliceNavigationConfig(pathname: string | null) {
  if (!pathname) {
    return null;
  }

  return SLICE_NAVIGATION_CONFIG.find((config) => config.matchPath(pathname)) ?? null;
}

export function SliceSidebar({ pathname }: { pathname: string }) {
  const activeConfig = getActiveSliceNavigationConfig(pathname);

  if (!activeConfig) {
    return <></>;
  }

  return (
    <aside className="min-w-0 xl:sticky xl:top-28 xl:h-fit">
      <div className="overflow-hidden border-b border-zinc-200 bg-[#fafaf8] xl:border xl:border-zinc-200 xl:shadow-[20px_0_40px_-32px_rgba(24,24,27,0.55)]">
        <div className="max-h-[calc(100vh-10rem)] overflow-y-auto">
          <div className="border-b border-zinc-200 px-5 py-5 sm:px-6">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-zinc-400">
              Navigation
            </p>
            <p className="mt-3 text-sm leading-6 text-zinc-600">
              The rail stays in the same place as timeline. Only the links inside it change.
            </p>
          </div>

          <nav>
            {SLICE_NAVIGATION_CONFIG.map((config, index) => {
              const isActive = config.key === activeConfig.key;
              const ActiveSliceContent = config.renderContent;

              return (
                <div
                  key={config.key}
                  className={index === 0 ? undefined : "border-t border-zinc-200"}
                >
                  <div className="px-5 py-4 sm:px-6">
                    <Link
                      href={config.href}
                      aria-current={isActive ? "page" : undefined}
                      className={`inline-flex text-sm leading-6 underline-offset-4 transition ${
                        isActive
                          ? "font-semibold text-zinc-950 underline decoration-zinc-950"
                          : "text-zinc-600 decoration-zinc-300 hover:text-zinc-950 hover:underline"
                      }`}
                    >
                      {config.label}
                    </Link>

                    {isActive ? <ActiveSliceContent pathname={pathname} /> : null}
                  </div>
                </div>
              );
            })}
          </nav>
        </div>
      </div>
    </aside>
  );
}

function createSliceSidebarContent<
  Result extends SharedListHookResult,
  Entity extends { id: string },
>({
  detailHref,
  emptyMessage,
  getItemLabel,
  selectItems,
  useList,
}: {
  detailHref: (id: string) => string;
  emptyMessage: string;
  getItemLabel: (entity: Entity) => string;
  selectItems: (result: Result) => Entity[];
  useList: () => Result;
}): SliceSidebarContentComponent {
  return function SliceSidebarContent({ pathname }: SliceSidebarContentProps) {
    const result = useList();
    const items = selectItems(result).map((entity) => {
      const href = detailHref(entity.id);

      return {
        id: entity.id,
        href,
        isActive: pathname === href || pathname.startsWith(`${href}/`),
        label: getSidebarLabel(getItemLabel(entity), entity.id),
      };
    });

    return (
      <SliceSidebarRecordList
        activeProject={result.activeProject}
        activeProjectId={result.activeProjectId}
        emptyMessage={emptyMessage}
        error={result.error}
        items={items}
        loading={result.loading}
        user={result.user}
      />
    );
  };
}

function SliceSidebarRecordList({
  activeProject,
  activeProjectId,
  emptyMessage,
  error,
  items,
  loading,
  user,
}: {
  activeProject: UserProject | null;
  activeProjectId: string | null;
  emptyMessage: string;
  error: string | null;
  items: SliceSidebarListItem[];
  loading: boolean;
  user: unknown;
}) {
  return (
    <div className="mt-3 pl-3">
      {!user ? (
        <SliceSidebarState>Sign in to load this slice.</SliceSidebarState>
      ) : loading ? (
        <SliceSidebarState>Loading records...</SliceSidebarState>
      ) : !activeProjectId || !activeProject ? (
        <SliceSidebarState>No active project selected.</SliceSidebarState>
      ) : error ? (
        <SliceSidebarState tone="error">{error}</SliceSidebarState>
      ) : items.length === 0 ? (
        <SliceSidebarState>{emptyMessage}</SliceSidebarState>
      ) : (
        <div className="max-h-80 space-y-1 overflow-y-auto pr-1">
          {items.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              aria-current={item.isActive ? "page" : undefined}
              className={`block text-sm leading-6 underline-offset-4 transition ${
                item.isActive
                  ? "font-medium text-zinc-950 underline decoration-zinc-950"
                  : "text-zinc-600 decoration-zinc-300 hover:text-zinc-950 hover:underline"
              }`}
            >
              <span className="block truncate">{item.label}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function SliceSidebarState({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "error";
}) {
  return (
    <div
      className={`text-xs leading-5 ${
        tone === "error" ? "text-red-700" : "text-zinc-500"
      }`}
    >
      {children}
    </div>
  );
}

function getSidebarLabel(label: string, fallbackId: string) {
  const normalized = label.trim();
  return normalized || fallbackId;
}

function matchesSlicePath(basePath: string) {
  return (pathname: string) => pathname === basePath || pathname.startsWith(`${basePath}/`);
}

function ProjectOverviewSidebarContent() {
  return <div className="mt-3" />;
}

const BooksSliceContent = createSliceSidebarContent({
  useList: useBooks,
  selectItems: (result) => result.books,
  getItemLabel: (book: Book) => book.title,
  detailHref: (id) => `/books/${id}`,
  emptyMessage: "No books exist in the active project yet.",
});

const ChaptersSliceContent = createSliceSidebarContent({
  useList: useChapters,
  selectItems: (result) => result.chapters,
  getItemLabel: (chapter: Chapter) => chapter.title,
  detailHref: (id) => `/chapters/${id}`,
  emptyMessage: "No chapters exist in the active project yet.",
});

const ScenesSliceContent = createSliceSidebarContent({
  useList: useScenes,
  selectItems: (result) => result.scenes,
  getItemLabel: (scene: Scene) => scene.title,
  detailHref: (id) => `/scenes/${id}`,
  emptyMessage: "No scenes exist in the active project yet.",
});

const CharactersSliceContent = createSliceSidebarContent({
  useList: useCharacters,
  selectItems: (result) => result.characters,
  getItemLabel: (character: Character) => character.name,
  detailHref: (id) => `/characters/${id}`,
  emptyMessage: "No characters exist in the active project yet.",
});

const RelationshipsSliceContent = createSliceSidebarContent({
  useList: useRelationships,
  selectItems: (result) => result.relationships,
  getItemLabel: (relationship: Relationship) => relationship.title,
  detailHref: (id) => `/relationships/${id}`,
  emptyMessage: "No relationships exist in the active project yet.",
});

const FactionsSliceContent = createSliceSidebarContent({
  useList: useFactions,
  selectItems: (result) => result.factions,
  getItemLabel: (faction: Faction) => faction.name,
  detailHref: (id) => `/factions/${id}`,
  emptyMessage: "No factions exist in the active project yet.",
});

const CulturesSliceContent = createSliceSidebarContent({
  useList: useCultures,
  selectItems: (result) => result.cultures,
  getItemLabel: (culture: Culture) => culture.name,
  detailHref: (id) => `/cultures/${id}`,
  emptyMessage: "No cultures exist in the active project yet.",
});

const ReligionsSliceContent = createSliceSidebarContent({
  useList: useReligions,
  selectItems: (result) => result.religions,
  getItemLabel: (religion: Religion) => religion.name,
  detailHref: (id) => `/religions/${id}`,
  emptyMessage: "No religions exist in the active project yet.",
});

const GovernmentsSliceContent = createSliceSidebarContent({
  useList: useGovernments,
  selectItems: (result) => result.governments,
  getItemLabel: (government: Government) => government.name,
  detailHref: (id) => `/governments/${id}`,
  emptyMessage: "No governments exist in the active project yet.",
});

const OrganizationsSliceContent = createSliceSidebarContent({
  useList: useOrganizations,
  selectItems: (result) => result.organizations,
  getItemLabel: (organization: Organization) => organization.name,
  detailHref: (id) => `/organizations/${id}`,
  emptyMessage: "No organizations exist in the active project yet.",
});

const PlotThreadsSliceContent = createSliceSidebarContent({
  useList: usePlotThreads,
  selectItems: (result) => result.plotThreads,
  getItemLabel: (plotThread: PlotThread) => plotThread.title,
  detailHref: (id) => `/plot-threads/${id}`,
  emptyMessage: "No plot threads exist in the active project yet.",
});

const OutlinesSliceContent = createSliceSidebarContent({
  useList: useOutlines,
  selectItems: (result) => result.outlines,
  getItemLabel: (outline: Outline) => outline.title,
  detailHref: (id) => `/outlines/${id}`,
  emptyMessage: "No outlines exist in the active project yet.",
});

const GlossaryTermsSliceContent = createSliceSidebarContent({
  useList: useGlossaryTerms,
  selectItems: (result) => result.glossaryTerms,
  getItemLabel: (glossaryTerm: GlossaryTerm) => glossaryTerm.term || glossaryTerm.title,
  detailHref: (id) => `/glossary-terms/${id}`,
  emptyMessage: "No glossary terms exist in the active project yet.",
});

const ErasSliceContent = createSliceSidebarContent({
  useList: useEras,
  selectItems: (result) => result.eras,
  getItemLabel: (era: Era) => era.name,
  detailHref: (id) => `/eras/${id}`,
  emptyMessage: "No eras exist in the active project yet.",
});

const ThemesSliceContent = createSliceSidebarContent({
  useList: useThemes,
  selectItems: (result) => result.themes,
  getItemLabel: (theme: Theme) => theme.name,
  detailHref: (id) => `/themes/${id}`,
  emptyMessage: "No themes exist in the active project yet.",
});

const LanguagesSliceContent = createSliceSidebarContent({
  useList: useLanguages,
  selectItems: (result) => result.languages,
  getItemLabel: (language: Language) => language.name,
  detailHref: (id) => `/languages/${id}`,
  emptyMessage: "No languages exist in the active project yet.",
});

const SpeciesSliceContent = createSliceSidebarContent({
  useList: useSpecies,
  selectItems: (result) => result.speciesEntries,
  getItemLabel: (species: Species) => species.name,
  detailHref: (id) => `/species/${id}`,
  emptyMessage: "No species records exist in the active project yet.",
});

const ItemsSliceContent = createSliceSidebarContent({
  useList: useItems,
  selectItems: (result) => result.items,
  getItemLabel: (item: Item) => item.name,
  detailHref: (id) => `/items/${id}`,
  emptyMessage: "No items exist in the active project yet.",
});

const TechnologiesSliceContent = createSliceSidebarContent({
  useList: useTechnologies,
  selectItems: (result) => result.technologies,
  getItemLabel: (technology: Technology) => technology.name,
  detailHref: (id) => `/technologies/${id}`,
  emptyMessage: "No technologies exist in the active project yet.",
});

const LocationsSliceContent = createSliceSidebarContent({
  useList: useLocations,
  selectItems: (result) => result.locations,
  getItemLabel: (location: Location) => location.name,
  detailHref: (id) => `/locations/${id}`,
  emptyMessage: "No locations exist in the active project yet.",
});

const TimelineEventsSliceContent = createSliceSidebarContent({
  useList: useTimelineEvents,
  selectItems: (result) => result.timelineEvents,
  getItemLabel: (timelineEvent: TimelineEvent) => timelineEvent.title,
  detailHref: (id) => `/timeline-events/${id}`,
  emptyMessage: "No timeline events exist in the active project yet.",
});

const NotesSliceContent = createSliceSidebarContent({
  useList: useNotes,
  selectItems: (result) => result.notes,
  getItemLabel: (note: Note) => note.title,
  detailHref: (id) => `/notes/${id}`,
  emptyMessage: "No notes exist in the active project yet.",
});

const RetconsSliceContent = createSliceSidebarContent({
  useList: useRetcons,
  selectItems: (result) => result.retcons,
  getItemLabel: (retcon: Retcon) => retcon.title,
  detailHref: (id) => `/retcons/${id}`,
  emptyMessage: "No retcons exist in the active project yet.",
});

const AttachmentsSliceContent = createSliceSidebarContent({
  useList: useAttachments,
  selectItems: (result) => result.attachments,
  getItemLabel: (attachment: Attachment) => attachment.title || attachment.fileName,
  detailHref: (id) => `/attachments/${id}`,
  emptyMessage: "No attachments exist in the active project yet.",
});

const AiSessionsSliceContent = createSliceSidebarContent({
  useList: useAiSessions,
  selectItems: (result) => result.aiSessions,
  getItemLabel: (aiSession: AiSession) => aiSession.title,
  detailHref: (id) => `/ai-sessions/${id}`,
  emptyMessage: "No AI sessions exist in the active project yet.",
});

const SLICE_NAVIGATION_CONFIG: SliceNavigationConfig[] = [
  {
    key: "project-overview",
    label: "Project Overview",
    href: "/project-overview",
    matchPath: matchesSlicePath("/project-overview"),
    renderContent: ProjectOverviewSidebarContent,
  },
  {
    key: "books",
    label: "Books",
    href: "/books/new",
    matchPath: matchesSlicePath("/books"),
    renderContent: BooksSliceContent,
  },
  {
    key: "chapters",
    label: "Chapters",
    href: "/chapters/new",
    matchPath: matchesSlicePath("/chapters"),
    renderContent: ChaptersSliceContent,
  },
  {
    key: "scenes",
    label: "Scenes",
    href: "/scenes/new",
    matchPath: matchesSlicePath("/scenes"),
    renderContent: ScenesSliceContent,
  },
  {
    key: "characters",
    label: "Characters",
    href: "/characters/new",
    matchPath: matchesSlicePath("/characters"),
    renderContent: CharactersSliceContent,
  },
  {
    key: "relationships",
    label: "Relationships",
    href: "/relationships/new",
    matchPath: matchesSlicePath("/relationships"),
    renderContent: RelationshipsSliceContent,
  },
  {
    key: "factions",
    label: "Factions",
    href: "/factions/new",
    matchPath: matchesSlicePath("/factions"),
    renderContent: FactionsSliceContent,
  },
  {
    key: "cultures",
    label: "Cultures",
    href: "/cultures/new",
    matchPath: matchesSlicePath("/cultures"),
    renderContent: CulturesSliceContent,
  },
  {
    key: "religions",
    label: "Religions",
    href: "/religions/new",
    matchPath: matchesSlicePath("/religions"),
    renderContent: ReligionsSliceContent,
  },
  {
    key: "governments",
    label: "Governments",
    href: "/governments/new",
    matchPath: matchesSlicePath("/governments"),
    renderContent: GovernmentsSliceContent,
  },
  {
    key: "organizations",
    label: "Organizations",
    href: "/organizations/new",
    matchPath: matchesSlicePath("/organizations"),
    renderContent: OrganizationsSliceContent,
  },
  {
    key: "plot-threads",
    label: "Plot Threads",
    href: "/plot-threads/new",
    matchPath: matchesSlicePath("/plot-threads"),
    renderContent: PlotThreadsSliceContent,
  },
  {
    key: "outlines",
    label: "Outlines",
    href: "/outlines/new",
    matchPath: matchesSlicePath("/outlines"),
    renderContent: OutlinesSliceContent,
  },
  {
    key: "glossary-terms",
    label: "Glossary Terms",
    href: "/glossary-terms/new",
    matchPath: matchesSlicePath("/glossary-terms"),
    renderContent: GlossaryTermsSliceContent,
  },
  {
    key: "eras",
    label: "Eras",
    href: "/eras/new",
    matchPath: matchesSlicePath("/eras"),
    renderContent: ErasSliceContent,
  },
  {
    key: "themes",
    label: "Themes",
    href: "/themes/new",
    matchPath: matchesSlicePath("/themes"),
    renderContent: ThemesSliceContent,
  },
  {
    key: "languages",
    label: "Languages",
    href: "/languages/new",
    matchPath: matchesSlicePath("/languages"),
    renderContent: LanguagesSliceContent,
  },
  {
    key: "species",
    label: "Species",
    href: "/species/new",
    matchPath: matchesSlicePath("/species"),
    renderContent: SpeciesSliceContent,
  },
  {
    key: "items",
    label: "Items",
    href: "/items/new",
    matchPath: matchesSlicePath("/items"),
    renderContent: ItemsSliceContent,
  },
  {
    key: "technologies",
    label: "Technologies",
    href: "/technologies/new",
    matchPath: matchesSlicePath("/technologies"),
    renderContent: TechnologiesSliceContent,
  },
  {
    key: "locations",
    label: "Locations",
    href: "/locations/new",
    matchPath: matchesSlicePath("/locations"),
    renderContent: LocationsSliceContent,
  },
  {
    key: "timeline-events",
    label: "Timeline Events",
    href: "/timeline",
    matchPath: matchesSlicePath("/timeline-events"),
    renderContent: TimelineEventsSliceContent,
  },
  {
    key: "notes",
    label: "Notes",
    href: "/notes/new",
    matchPath: matchesSlicePath("/notes"),
    renderContent: NotesSliceContent,
  },
  {
    key: "retcons",
    label: "Retcons",
    href: "/retcons/new",
    matchPath: matchesSlicePath("/retcons"),
    renderContent: RetconsSliceContent,
  },
  {
    key: "attachments",
    label: "Attachments",
    href: "/attachments/new",
    matchPath: matchesSlicePath("/attachments"),
    renderContent: AttachmentsSliceContent,
  },
  {
    key: "ai-sessions",
    label: "AI Sessions",
    href: "/ai-sessions/new",
    matchPath: matchesSlicePath("/ai-sessions"),
    renderContent: AiSessionsSliceContent,
  },
];
