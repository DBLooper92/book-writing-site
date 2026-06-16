"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";

import { TimelineEventDetailView } from "@/components/timeline-events/timeline-event-detail-view";
import { useScrollLock } from "@/hooks/use-scroll-lock";
import { useBook } from "@/hooks/use-book";
import { useChapter } from "@/hooks/use-chapter";
import { useCharacter } from "@/hooks/use-character";
import { useCulture } from "@/hooks/use-culture";
import { useEra } from "@/hooks/use-era";
import { useFaction } from "@/hooks/use-faction";
import { useLocation } from "@/hooks/use-location";
import { usePlotThread } from "@/hooks/use-plot-thread";
import { useReligion } from "@/hooks/use-religion";
import { useScene } from "@/hooks/use-scene";
import { useTechnology } from "@/hooks/use-technology";
import { useTheme } from "@/hooks/use-theme";
import { useTimelineEvent } from "@/hooks/use-timeline-event";
import {
  type TimelineLinkedReferenceItem,
  type TimelineReferenceMaps,
  type TimelineReferenceSets,
} from "@/lib/timeline/references";
import { formatTimelineEnumValue, getTimelineEventChronologyLabel } from "@/lib/timeline/workspace";

type TimelineLinkedRecordLightboxProps = {
  item: TimelineLinkedReferenceItem;
  onClose: () => void;
  referenceMaps: TimelineReferenceMaps;
  referenceSets: TimelineReferenceSets;
};

export function TimelineLinkedRecordLightbox({
  item,
  onClose,
  referenceMaps,
  referenceSets,
}: TimelineLinkedRecordLightboxProps) {
  const [nestedItem, setNestedItem] = useState<TimelineLinkedReferenceItem | null>(null);
  useScrollLock(true);

  return (
    <>
      <div className="fixed inset-0 z-60 flex items-center justify-center overscroll-contain bg-zinc-950/45 px-4 py-6 backdrop-blur-sm">
        <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />
        <div className="relative z-10 max-h-full w-full max-w-5xl overflow-hidden rounded-4xl border border-zinc-200 bg-[#fffdf9] shadow-2xl">
          {renderLinkedRecordPanel(item, onClose, setNestedItem, referenceMaps, referenceSets)}
        </div>
      </div>

      {nestedItem ? (
        <TimelineLinkedRecordLightbox
          item={nestedItem}
          onClose={() => setNestedItem(null)}
          referenceMaps={referenceMaps}
          referenceSets={referenceSets}
        />
      ) : null}
    </>
  );
}

function LinkedRecordFrame({
  children,
  editHref,
  eyebrow,
  onClose,
  subtitle,
  title,
}: {
  children: ReactNode;
  editHref?: string;
  eyebrow: string;
  onClose: () => void;
  subtitle?: string;
  title: string;
}) {
  return (
    <div className="flex max-h-full flex-col">
      <div className="border-b border-zinc-200 bg-white px-6 py-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
              {eyebrow}
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950">{title}</h2>
            {subtitle ? <p className="mt-2 text-sm leading-6 text-zinc-600">{subtitle}</p> : null}
          </div>

          <div className="flex flex-wrap gap-3">
            {editHref ? (
              <Link
                href={editHref}
                className="inline-flex h-11 items-center justify-center rounded-full bg-zinc-950 px-4 text-sm font-medium text-white transition hover:bg-zinc-800"
              >
                Edit
              </Link>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-200 px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-6">
        <div className="space-y-6">{children}</div>
      </div>
    </div>
  );
}

function RecordState({
  message,
  tone,
}: {
  message: string;
  tone: "neutral" | "error";
}) {
  const className =
    tone === "error"
      ? "border-red-200 bg-red-50 text-red-700"
      : "border-zinc-300 bg-zinc-50 text-zinc-600";

  return <section className={`rounded-3xl border p-6 text-sm leading-6 ${className}`}>{message}</section>;
}

function DetailSection({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) {
  return (
    <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
      <h3 className="text-lg font-semibold tracking-tight text-zinc-950">{title}</h3>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function DetailGrid({ children }: { children: ReactNode }) {
  return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{children}</div>;
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">{label}</p>
      <p className="mt-2 wrap-break-word text-sm font-medium text-zinc-900">{value}</p>
    </div>
  );
}

function TextBlock({ value }: { value: string }) {
  return <p className="whitespace-pre-wrap text-sm leading-6 text-zinc-700">{value}</p>;
}

function ListBlock({ label, values }: { label: string; values: string[] }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">{label}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {values.length > 0 ? (
          values.map((value) => (
            <span
              key={`${label}-${value}`}
              className="rounded-full bg-white px-3 py-1 text-sm text-zinc-700 ring-1 ring-zinc-200"
            >
              {value}
            </span>
          ))
        ) : (
          <span className="text-sm text-zinc-500">None</span>
        )}
      </div>
    </div>
  );
}

function ListishTextBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">{label}</p>
      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-zinc-700">
        {value || "None"}
      </p>
    </div>
  );
}

function formatValue(value: string) {
  return formatTimelineEnumValue(value);
}

function formatNumber(value: number | null) {
  return typeof value === "number" ? String(value) : "None";
}

function formatRange(start: number | null, end: number | null) {
  if (typeof start === "number" && typeof end === "number") {
    return start === end ? String(start) : `${start}-${end}`;
  }

  if (typeof start === "number") {
    return `From ${start}`;
  }

  if (typeof end === "number") {
    return `Until ${end}`;
  }

  return "None";
}

function renderLinkedRecordPanel(
  item: TimelineLinkedReferenceItem,
  onClose: () => void,
  onOpenLinkedRecord: (item: TimelineLinkedReferenceItem) => void,
  referenceMaps: TimelineReferenceMaps,
  referenceSets: TimelineReferenceSets
) {
  switch (item.entityType) {
    case "book":
      return <BookRecordPanel bookId={item.id} onClose={onClose} />;
    case "chapter":
      return <ChapterRecordPanel chapterId={item.id} onClose={onClose} />;
    case "scene":
      return <SceneRecordPanel sceneId={item.id} onClose={onClose} />;
    case "character":
      return <CharacterRecordPanel characterId={item.id} onClose={onClose} />;
    case "location":
      return <LocationRecordPanel locationId={item.id} onClose={onClose} />;
    case "era":
      return <EraRecordPanel eraId={item.id} onClose={onClose} />;
    case "faction":
      return <FactionRecordPanel factionId={item.id} onClose={onClose} />;
    case "culture":
      return <CultureRecordPanel cultureId={item.id} onClose={onClose} />;
    case "religion":
      return <ReligionRecordPanel religionId={item.id} onClose={onClose} />;
    case "technology":
      return <TechnologyRecordPanel technologyId={item.id} onClose={onClose} />;
    case "plotThread":
      return <PlotThreadRecordPanel plotThreadId={item.id} onClose={onClose} />;
    case "theme":
      return <ThemeRecordPanel themeId={item.id} onClose={onClose} />;
    case "timelineEvent":
      return (
        <TimelineEventRecordPanel
          onClose={onClose}
          onOpenLinkedRecord={onOpenLinkedRecord}
          referenceMaps={referenceMaps}
          referenceSets={referenceSets}
          timelineEventId={item.id}
        />
      );
  }
}

function BookRecordPanel({ bookId, onClose }: { bookId: string; onClose: () => void }) {
  const { book, error, loading } = useBook(bookId);

  return (
    <LinkedRecordFrame
      eyebrow="Book"
      editHref={`/books/${bookId}/edit`}
      onClose={onClose}
      subtitle={book ? `${formatValue(book.status)} • ${formatValue(book.draftStage)}` : undefined}
      title={book?.title ?? "Book"}
    >
      {loading ? (
        <RecordState message="Loading book details..." tone="neutral" />
      ) : error || !book ? (
        <RecordState message={error ?? "Book not found in the active project."} tone="error" />
      ) : (
        <>
          <DetailSection title="Summary">
            <TextBlock value={book.summary || book.description || "No summary yet."} />
          </DetailSection>
          <DetailSection title="Book details">
            <DetailGrid>
              <DetailItem label="Status" value={formatValue(book.status)} />
              <DetailItem label="Draft stage" value={formatValue(book.draftStage)} />
              <DetailItem label="Series order" value={formatNumber(book.seriesOrder)} />
              <DetailItem
                label="Chronology span"
                value={formatRange(book.internalChronologyStart, book.internalChronologyEnd)}
              />
              <DetailItem label="Word count target" value={formatNumber(book.wordCountTarget)} />
              <DetailItem label="Word count current" value={String(book.wordCountCurrent)} />
              <DetailItem label="Canon level" value={formatValue(book.canonLevel)} />
              <DetailItem label="Confidence" value={formatValue(book.confidence)} />
              <DetailItem label="Slug" value={book.slug} />
            </DetailGrid>
          </DetailSection>
          <DetailSection title="Premise">
            <TextBlock value={book.premise || "No premise yet."} />
          </DetailSection>
        </>
      )}
    </LinkedRecordFrame>
  );
}

function ChapterRecordPanel({ chapterId, onClose }: { chapterId: string; onClose: () => void }) {
  const { chapter, error, loading } = useChapter(chapterId);

  return (
    <LinkedRecordFrame
      eyebrow="Chapter"
      editHref={`/chapters/${chapterId}/edit`}
      onClose={onClose}
      subtitle={chapter ? `${formatValue(chapter.status)} • ${formatNumber(chapter.chapterNumber)}` : undefined}
      title={chapter?.title ?? "Chapter"}
    >
      {loading ? (
        <RecordState message="Loading chapter details..." tone="neutral" />
      ) : error || !chapter ? (
        <RecordState message={error ?? "Chapter not found in the active project."} tone="error" />
      ) : (
        <>
          <DetailSection title="Summary">
            <TextBlock value={chapter.summary || chapter.description || "No summary yet."} />
          </DetailSection>
          <DetailSection title="Chapter details">
            <DetailGrid>
              <DetailItem label="Status" value={formatValue(chapter.status)} />
              <DetailItem label="Book ID" value={chapter.bookId ?? "None"} />
              <DetailItem label="Chapter number" value={formatNumber(chapter.chapterNumber)} />
              <DetailItem label="POV character ID" value={chapter.pointOfViewCharacterId ?? "None"} />
              <DetailItem label="Canon level" value={formatValue(chapter.canonLevel)} />
              <DetailItem label="Confidence" value={formatValue(chapter.confidence)} />
            </DetailGrid>
          </DetailSection>
          <DetailSection title="Purpose">
            <TextBlock value={chapter.purpose || "No purpose yet."} />
          </DetailSection>
        </>
      )}
    </LinkedRecordFrame>
  );
}

function SceneRecordPanel({ onClose, sceneId }: { onClose: () => void; sceneId: string }) {
  const { error, loading, scene } = useScene(sceneId);

  return (
    <LinkedRecordFrame
      eyebrow="Scene"
      editHref={`/scenes/${sceneId}/edit`}
      onClose={onClose}
      subtitle={scene ? `${formatValue(scene.status)} • ${formatValue(scene.sceneType)}` : undefined}
      title={scene?.title ?? "Scene"}
    >
      {loading ? (
        <RecordState message="Loading scene details..." tone="neutral" />
      ) : error || !scene ? (
        <RecordState message={error ?? "Scene not found in the active project."} tone="error" />
      ) : (
        <>
          <DetailSection title="Summary">
            <TextBlock value={scene.summary || scene.description || "No summary yet."} />
          </DetailSection>
          <DetailSection title="Scene details">
            <DetailGrid>
              <DetailItem label="Status" value={formatValue(scene.status)} />
              <DetailItem label="Scene type" value={formatValue(scene.sceneType)} />
              <DetailItem label="Book ID" value={scene.bookId ?? "None"} />
              <DetailItem label="Chapter ID" value={scene.chapterId ?? "None"} />
              <DetailItem label="Scene number" value={formatNumber(scene.sceneNumber)} />
              <DetailItem label="POV character ID" value={scene.pointOfViewCharacterId ?? "None"} />
            </DetailGrid>
          </DetailSection>
          <DetailSection title="Dramatic function">
            <div className="grid gap-4 lg:grid-cols-3">
              <ListishTextBlock label="Goal" value={scene.goal} />
              <ListishTextBlock label="Conflict" value={scene.conflict} />
              <ListishTextBlock label="Outcome" value={scene.outcome} />
            </div>
          </DetailSection>
        </>
      )}
    </LinkedRecordFrame>
  );
}

function CharacterRecordPanel({
  characterId,
  onClose,
}: {
  characterId: string;
  onClose: () => void;
}) {
  const { character, error, loading } = useCharacter(characterId);

  return (
    <LinkedRecordFrame
      eyebrow="Character"
      editHref={`/characters/${characterId}/edit`}
      onClose={onClose}
      subtitle={
        character
          ? `${formatValue(character.status)} • ${formatValue(character.characterType)}`
          : undefined
      }
      title={character?.name ?? "Character"}
    >
      {loading ? (
        <RecordState message="Loading character details..." tone="neutral" />
      ) : error || !character ? (
        <RecordState
          message={error ?? "Character not found in the active project."}
          tone="error"
        />
      ) : (
        <>
          <DetailSection title="Summary">
            <TextBlock value={character.summary || character.description || "No summary yet."} />
          </DetailSection>
          <DetailSection title="Character details">
            <DetailGrid>
              <DetailItem label="Status" value={formatValue(character.status)} />
              <DetailItem label="Type" value={formatValue(character.characterType)} />
              <DetailItem label="Importance" value={formatValue(character.importanceLevel)} />
              <DetailItem label="Birth year" value={formatNumber(character.birthYear)} />
              <DetailItem label="Home location ID" value={character.homeLocationId ?? "None"} />
              <DetailItem label="Canon level" value={formatValue(character.canonLevel)} />
            </DetailGrid>
          </DetailSection>
          <DetailSection title="Traits and motivations">
            <div className="grid gap-4 lg:grid-cols-2">
              <ListBlock label="Aliases" values={character.aliases} />
              <ListBlock label="Occupation" values={character.occupation} />
              <ListBlock label="Traits" values={character.traits} />
              <ListBlock label="Flaws" values={character.flaws} />
              <ListBlock label="Motivations" values={character.motivations} />
            </div>
          </DetailSection>
        </>
      )}
    </LinkedRecordFrame>
  );
}

function LocationRecordPanel({
  locationId,
  onClose,
}: {
  locationId: string;
  onClose: () => void;
}) {
  const { error, loading, location } = useLocation(locationId);

  return (
    <LinkedRecordFrame
      eyebrow="Location"
      editHref={`/locations/${locationId}/edit`}
      onClose={onClose}
      subtitle={location ? `${formatValue(location.status)} • ${location.locationType}` : undefined}
      title={location?.name ?? "Location"}
    >
      {loading ? (
        <RecordState message="Loading location details..." tone="neutral" />
      ) : error || !location ? (
        <RecordState message={error ?? "Location not found in the active project."} tone="error" />
      ) : (
        <>
          <DetailSection title="Summary">
            <TextBlock value={location.summary || location.description || "No summary yet."} />
          </DetailSection>
          <DetailSection title="Location details">
            <DetailGrid>
              <DetailItem label="Status" value={formatValue(location.status)} />
              <DetailItem label="Type" value={location.locationType} />
              <DetailItem label="Parent location ID" value={location.parentLocationId ?? "None"} />
              <DetailItem label="Climate" value={location.climate || "None"} />
              <DetailItem label="Danger level" value={location.dangerLevel || "None"} />
              <DetailItem label="Canon level" value={formatValue(location.canonLevel)} />
            </DetailGrid>
          </DetailSection>
          <DetailSection title="Place details">
            <div className="grid gap-4 lg:grid-cols-2">
              <ListishTextBlock label="Geography" value={location.geography} />
              <ListishTextBlock label="Architecture" value={location.architecture} />
              <ListBlock label="Customs" values={location.customs} />
              <ListBlock label="Notable features" values={location.notableFeatures} />
            </div>
          </DetailSection>
        </>
      )}
    </LinkedRecordFrame>
  );
}

function EraRecordPanel({ eraId, onClose }: { eraId: string; onClose: () => void }) {
  const { era, error, loading } = useEra(eraId);

  return (
    <LinkedRecordFrame
      eyebrow="Era"
      editHref={`/eras/${eraId}/edit`}
      onClose={onClose}
      subtitle={era ? `${formatValue(era.status)} • ${formatRange(era.startYear, era.endYear)}` : undefined}
      title={era?.name ?? "Era"}
    >
      {loading ? (
        <RecordState message="Loading era details..." tone="neutral" />
      ) : error || !era ? (
        <RecordState message={error ?? "Era not found in the active project."} tone="error" />
      ) : (
        <>
          <DetailSection title="Summary">
            <TextBlock value={era.summary || era.description || "No summary yet."} />
          </DetailSection>
          <DetailSection title="Era details">
            <DetailGrid>
              <DetailItem label="Status" value={formatValue(era.status)} />
              <DetailItem label="Start year" value={formatNumber(era.startYear)} />
              <DetailItem label="End year" value={formatNumber(era.endYear)} />
              <DetailItem label="Canon level" value={formatValue(era.canonLevel)} />
              <DetailItem label="Confidence" value={formatValue(era.confidence)} />
              <DetailItem label="Slug" value={era.slug} />
            </DetailGrid>
          </DetailSection>
          <DetailSection title="Anchors">
            <div className="grid gap-4 lg:grid-cols-2">
              <ListBlock label="Defining events" values={era.definingEvents} />
              <ListBlock label="Key locations" values={era.keyLocations} />
              <ListBlock label="Key factions" values={era.keyFactions} />
              <ListBlock label="Dominant themes" values={era.dominantThemes} />
            </div>
          </DetailSection>
        </>
      )}
    </LinkedRecordFrame>
  );
}

function FactionRecordPanel({
  factionId,
  onClose,
}: {
  factionId: string;
  onClose: () => void;
}) {
  const { error, faction, loading } = useFaction(factionId);

  return (
    <LinkedRecordFrame
      eyebrow="Faction"
      editHref={`/factions/${factionId}/edit`}
      onClose={onClose}
      subtitle={faction ? `${formatValue(faction.status)} • ${formatValue(faction.factionType)}` : undefined}
      title={faction?.name ?? "Faction"}
    >
      {loading ? (
        <RecordState message="Loading faction details..." tone="neutral" />
      ) : error || !faction ? (
        <RecordState message={error ?? "Faction not found in the active project."} tone="error" />
      ) : (
        <>
          <DetailSection title="Summary">
            <TextBlock value={faction.summary || faction.description || "No summary yet."} />
          </DetailSection>
          <DetailSection title="Faction details">
            <DetailGrid>
              <DetailItem label="Status" value={formatValue(faction.status)} />
              <DetailItem label="Faction type" value={formatValue(faction.factionType)} />
              <DetailItem label="Founded year" value={formatNumber(faction.foundedYear)} />
              <DetailItem label="Ended year" value={formatNumber(faction.endedYear)} />
              <DetailItem label="Government ID" value={faction.governmentId ?? "None"} />
              <DetailItem label="Canon level" value={formatValue(faction.canonLevel)} />
            </DetailGrid>
          </DetailSection>
          <DetailSection title="Leadership and priorities">
            <div className="grid gap-4 lg:grid-cols-2">
              <ListBlock label="Leaders" values={faction.leaderCharacterIds} />
              <ListBlock label="Bases" values={faction.baseLocationIds} />
              <ListBlock label="Goals" values={faction.goals} />
              <ListBlock label="Resources" values={faction.resources} />
            </div>
          </DetailSection>
        </>
      )}
    </LinkedRecordFrame>
  );
}

function CultureRecordPanel({
  cultureId,
  onClose,
}: {
  cultureId: string;
  onClose: () => void;
}) {
  const { culture, error, loading } = useCulture(cultureId);

  return (
    <LinkedRecordFrame
      eyebrow="Culture"
      editHref={`/cultures/${cultureId}/edit`}
      onClose={onClose}
      subtitle={culture ? formatValue(culture.status) : undefined}
      title={culture?.name ?? "Culture"}
    >
      {loading ? (
        <RecordState message="Loading culture details..." tone="neutral" />
      ) : error || !culture ? (
        <RecordState message={error ?? "Culture not found in the active project."} tone="error" />
      ) : (
        <>
          <DetailSection title="Summary">
            <TextBlock value={culture.summary || culture.description || "No summary yet."} />
          </DetailSection>
          <DetailSection title="Culture details">
            <DetailGrid>
              <DetailItem label="Status" value={formatValue(culture.status)} />
              <DetailItem label="Canon level" value={formatValue(culture.canonLevel)} />
              <DetailItem label="Confidence" value={formatValue(culture.confidence)} />
              <DetailItem label="Slug" value={culture.slug} />
            </DetailGrid>
          </DetailSection>
          <DetailSection title="Traditions and links">
            <div className="grid gap-4 lg:grid-cols-2">
              <ListBlock label="Core values" values={culture.coreValues} />
              <ListBlock label="Traditions" values={culture.traditions} />
              <ListBlock label="Associated locations" values={culture.associatedLocationIds} />
              <ListBlock label="Languages" values={culture.languageIds} />
            </div>
          </DetailSection>
        </>
      )}
    </LinkedRecordFrame>
  );
}

function ReligionRecordPanel({
  onClose,
  religionId,
}: {
  onClose: () => void;
  religionId: string;
}) {
  const { error, loading, religion } = useReligion(religionId);

  return (
    <LinkedRecordFrame
      eyebrow="Religion"
      editHref={`/religions/${religionId}/edit`}
      onClose={onClose}
      subtitle={religion ? `${formatValue(religion.status)} • ${religion.deityOrFocus || "No focus"}` : undefined}
      title={religion?.name ?? "Religion"}
    >
      {loading ? (
        <RecordState message="Loading religion details..." tone="neutral" />
      ) : error || !religion ? (
        <RecordState message={error ?? "Religion not found in the active project."} tone="error" />
      ) : (
        <>
          <DetailSection title="Summary">
            <TextBlock value={religion.summary || religion.description || "No summary yet."} />
          </DetailSection>
          <DetailSection title="Religion details">
            <DetailGrid>
              <DetailItem label="Status" value={formatValue(religion.status)} />
              <DetailItem label="Deity or focus" value={religion.deityOrFocus || "None"} />
              <DetailItem label="Belief system type" value={religion.beliefSystemType || "None"} />
              <DetailItem label="Canon level" value={formatValue(religion.canonLevel)} />
              <DetailItem label="Confidence" value={formatValue(religion.confidence)} />
              <DetailItem label="Slug" value={religion.slug} />
            </DetailGrid>
          </DetailSection>
          <DetailSection title="Practices and links">
            <div className="grid gap-4 lg:grid-cols-2">
              <ListBlock label="Core beliefs" values={religion.coreBeliefs} />
              <ListBlock label="Rituals" values={religion.rituals} />
              <ListBlock label="Holy sites" values={religion.holySites} />
              <ListBlock label="Associated cultures" values={religion.associatedCultures} />
            </div>
          </DetailSection>
        </>
      )}
    </LinkedRecordFrame>
  );
}

function TechnologyRecordPanel({
  onClose,
  technologyId,
}: {
  onClose: () => void;
  technologyId: string;
}) {
  const { error, loading, technology } = useTechnology(technologyId);

  return (
    <LinkedRecordFrame
      eyebrow="Technology"
      editHref={`/technologies/${technologyId}/edit`}
      onClose={onClose}
      subtitle={technology ? `${formatValue(technology.status)} • ${technology.technologyType}` : undefined}
      title={technology?.name ?? "Technology"}
    >
      {loading ? (
        <RecordState message="Loading technology details..." tone="neutral" />
      ) : error || !technology ? (
        <RecordState
          message={error ?? "Technology not found in the active project."}
          tone="error"
        />
      ) : (
        <>
          <DetailSection title="Summary">
            <TextBlock value={technology.summary || technology.description || "No summary yet."} />
          </DetailSection>
          <DetailSection title="Technology details">
            <DetailGrid>
              <DetailItem label="Status" value={formatValue(technology.status)} />
              <DetailItem label="Type" value={technology.technologyType || "None"} />
              <DetailItem label="Invented year" value={formatNumber(technology.inventedYear)} />
              <DetailItem label="Canon level" value={formatValue(technology.canonLevel)} />
              <DetailItem label="Confidence" value={formatValue(technology.confidence)} />
              <DetailItem label="Slug" value={technology.slug} />
            </DetailGrid>
          </DetailSection>
          <DetailSection title="Operational notes">
            <div className="grid gap-4 lg:grid-cols-2">
              <ListishTextBlock label="Inventor notes" value={technology.inventorNotes} />
              <ListishTextBlock label="Power source" value={technology.powerSource} />
              <ListBlock label="Limitations" values={technology.limitations} />
              <ListBlock label="Associated locations" values={technology.associatedLocationIds} />
            </div>
          </DetailSection>
        </>
      )}
    </LinkedRecordFrame>
  );
}

function PlotThreadRecordPanel({
  onClose,
  plotThreadId,
}: {
  onClose: () => void;
  plotThreadId: string;
}) {
  const { error, loading, plotThread } = usePlotThread(plotThreadId);

  return (
    <LinkedRecordFrame
      eyebrow="Plot thread"
      editHref={`/plot-threads/${plotThreadId}/edit`}
      onClose={onClose}
      subtitle={plotThread ? `${formatValue(plotThread.status)} • ${formatValue(plotThread.threadType)}` : undefined}
      title={plotThread?.title ?? "Plot thread"}
    >
      {loading ? (
        <RecordState message="Loading plot thread details..." tone="neutral" />
      ) : error || !plotThread ? (
        <RecordState
          message={error ?? "Plot thread not found in the active project."}
          tone="error"
        />
      ) : (
        <>
          <DetailSection title="Summary">
            <TextBlock value={plotThread.summary || plotThread.description || "No summary yet."} />
          </DetailSection>
          <DetailSection title="Thread details">
            <DetailGrid>
              <DetailItem label="Status" value={formatValue(plotThread.status)} />
              <DetailItem label="Thread type" value={formatValue(plotThread.threadType)} />
              <DetailItem label="Introduced in book ID" value={plotThread.introducedInBookId ?? "None"} />
              <DetailItem label="Resolved in book ID" value={plotThread.resolvedInBookId ?? "None"} />
              <DetailItem label="Canon level" value={formatValue(plotThread.canonLevel)} />
              <DetailItem label="Confidence" value={formatValue(plotThread.confidence)} />
            </DetailGrid>
          </DetailSection>
          <DetailSection title="Progression">
            <div className="grid gap-4 lg:grid-cols-2">
              <ListBlock label="Book IDs" values={plotThread.bookIds} />
              <ListBlock label="Chapter IDs" values={plotThread.chapterIds} />
              <ListBlock label="Character IDs" values={plotThread.characterIds} />
              <ListBlock label="Open questions" values={plotThread.openQuestions} />
            </div>
          </DetailSection>
        </>
      )}
    </LinkedRecordFrame>
  );
}

function ThemeRecordPanel({ onClose, themeId }: { onClose: () => void; themeId: string }) {
  const { error, loading, theme } = useTheme(themeId);

  return (
    <LinkedRecordFrame
      eyebrow="Theme"
      editHref={`/themes/${themeId}/edit`}
      onClose={onClose}
      subtitle={theme ? formatValue(theme.status) : undefined}
      title={theme?.name ?? "Theme"}
    >
      {loading ? (
        <RecordState message="Loading theme details..." tone="neutral" />
      ) : error || !theme ? (
        <RecordState message={error ?? "Theme not found in the active project."} tone="error" />
      ) : (
        <>
          <DetailSection title="Summary">
            <TextBlock value={theme.summary || theme.description || "No summary yet."} />
          </DetailSection>
          <DetailSection title="Theme details">
            <DetailGrid>
              <DetailItem label="Status" value={formatValue(theme.status)} />
              <DetailItem label="Central question" value={theme.centralQuestion || "None"} />
              <DetailItem label="Canon level" value={formatValue(theme.canonLevel)} />
              <DetailItem label="Confidence" value={formatValue(theme.confidence)} />
              <DetailItem label="Slug" value={theme.slug} />
            </DetailGrid>
          </DetailSection>
          <DetailSection title="Associations">
            <div className="grid gap-4 lg:grid-cols-2">
              <ListBlock label="Books" values={theme.associatedBookIds} />
              <ListBlock label="Characters" values={theme.associatedCharacterIds} />
              <ListBlock label="Timeline events" values={theme.associatedTimelineEventIds} />
              <ListBlock label="Motifs" values={theme.motifs} />
            </div>
          </DetailSection>
        </>
      )}
    </LinkedRecordFrame>
  );
}

function TimelineEventRecordPanel({
  onClose,
  onOpenLinkedRecord,
  referenceMaps,
  referenceSets,
  timelineEventId,
}: {
  onClose: () => void;
  onOpenLinkedRecord: (item: TimelineLinkedReferenceItem) => void;
  referenceMaps: TimelineReferenceMaps;
  referenceSets: TimelineReferenceSets;
  timelineEventId: string;
}) {
  const { error, loading, timelineEvent } = useTimelineEvent(timelineEventId);
  const knownTimelineEventIds = new Set(referenceMaps.timelineEventIds.keys());
  knownTimelineEventIds.add(timelineEventId);

  return (
    <LinkedRecordFrame
      eyebrow="Timeline event"
      editHref={`/timeline-events/${timelineEventId}/edit`}
      onClose={onClose}
      subtitle={timelineEvent ? getTimelineEventChronologyLabel(timelineEvent) : undefined}
      title={timelineEvent?.title ?? "Timeline event"}
    >
      {loading ? (
        <RecordState message="Loading timeline event details..." tone="neutral" />
      ) : error || !timelineEvent ? (
        <RecordState
          message={error ?? "Timeline event not found in the active project."}
          tone="error"
        />
      ) : (
        <TimelineEventDetailView
          knownTimelineEventIds={knownTimelineEventIds}
          onOpenLinkedRecord={onOpenLinkedRecord}
          referenceMaps={referenceMaps}
          referenceSets={referenceSets}
          timelineEvent={timelineEvent}
        />
      )}
    </LinkedRecordFrame>
  );
}
