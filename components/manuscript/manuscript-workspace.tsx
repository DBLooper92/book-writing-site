"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";

import {
  getManuscriptsForProject,
  upsertManuscriptForProject,
} from "@/lib/data/manuscripts";
import {
  buildManuscriptBookSections,
  getManuscriptBookSelectionSummary,
  getManuscriptChapterSelectionSummary,
  pruneManuscriptChapterSelections,
  toggleManuscriptBookId,
  toggleManuscriptChapterId,
  type ManuscriptBookSection,
  type ManuscriptChapterSelections,
  type ManuscriptChapterSlot,
  type ManuscriptRecord,
} from "@/lib/manuscript/workspace";
import { useBooks } from "@/hooks/use-books";
import { useChapters } from "@/hooks/use-chapters";
type ManuscriptWorkspaceProps = {
  activeProjectId: string;
  layoutMode?: "standalone" | "embedded";
  onCloseEmbedded?: () => void;
  scrollContainerRef?: RefObject<HTMLDivElement | null>;
  uid: string;
};

type LoadState = {
  error: string | null;
  manuscripts: ManuscriptRecord[];
  loadedProjectKey: string | null;
};

export function ManuscriptWorkspace({
  activeProjectId,
  layoutMode: _layoutMode = "standalone",
  onCloseEmbedded: _onCloseEmbedded,
  scrollContainerRef,
  uid,
}: ManuscriptWorkspaceProps) {
  const booksState = useBooks();
  const chaptersState = useChapters();
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [selectedChapterIdsByBook, setSelectedChapterIdsByBook] =
    useState<ManuscriptChapterSelections>({});
  const [recordsState, setRecordsState] = useState<LoadState>({
    error: null,
    manuscripts: [],
    loadedProjectKey: null,
  });
  const toolbarRef = useRef<HTMLDivElement | null>(null);
  const [openPicker, setOpenPicker] = useState<"books" | "chapters" | null>(null);
  const currentProjectKey = `${uid}:${activeProjectId}`;

  useEffect(() => {
    let cancelled = false;

    async function loadManuscripts() {
      try {
        const nextRecords = await getManuscriptsForProject(uid, activeProjectId);

        if (cancelled) {
          return;
        }

        setRecordsState({
          error: null,
          manuscripts: nextRecords,
          loadedProjectKey: currentProjectKey,
        });
      } catch (error) {
        if (cancelled) {
          return;
        }

        setRecordsState({
          error: error instanceof Error ? error.message : "Unable to load manuscript text.",
          manuscripts: [],
          loadedProjectKey: currentProjectKey,
        });
      }
    }

    void loadManuscripts();

    return () => {
      cancelled = true;
    };
  }, [activeProjectId, currentProjectKey, uid]);

  useEffect(() => {
    if (!openPicker) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;

      if (!(target instanceof Node)) {
        setOpenPicker(null);
        return;
      }

      if (toolbarRef.current?.contains(target)) {
        return;
      }

      setOpenPicker(null);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenPicker(null);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [openPicker]);

  const availableBookIds = useMemo(
    () => new Set(booksState.books.map((book) => book.id)),
    [booksState.books]
  );
  const visibleSelectedBookId = useMemo(
    () => (selectedBookId && availableBookIds.has(selectedBookId) ? selectedBookId : null),
    [availableBookIds, selectedBookId]
  );
  const visibleSelectedChapterIdsByBook = useMemo(
    () => pruneManuscriptChapterSelections(visibleSelectedBookId, selectedChapterIdsByBook),
    [selectedChapterIdsByBook, visibleSelectedBookId]
  );
  const visibleSections = useMemo(
    () =>
      buildManuscriptBookSections({
        books: booksState.books,
        chapters: chaptersState.chapters,
        manuscriptRecords: recordsState.manuscripts,
        selectedBookId: visibleSelectedBookId,
        selectedChapterIdsByBook: visibleSelectedChapterIdsByBook,
      }),
    [
      booksState.books,
      chaptersState.chapters,
      recordsState.manuscripts,
      visibleSelectedBookId,
      visibleSelectedChapterIdsByBook,
    ]
  );

  const bookSummary = getManuscriptBookSelectionSummary(visibleSelectedBookId, booksState.books);
  const chapterSummary = getManuscriptChapterSelectionSummary(
    visibleSelectedBookId,
    visibleSelectedChapterIdsByBook,
    chaptersState.chapters
  );
  const isLoading =
    booksState.loading ||
    chaptersState.loading ||
    recordsState.loadedProjectKey !== currentProjectKey;
  const hasError = Boolean(booksState.error || chaptersState.error || recordsState.error);

  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[linear-gradient(180deg,#f7f5ef_0%,#ece6dc_100%)]">
      <div className="sticky top-0 z-20 border-b border-zinc-200/80 bg-white/90 backdrop-blur">
        <div className="flex flex-wrap items-center gap-3 px-4 py-4 sm:px-6 xl:px-8">
          <div ref={toolbarRef} className="flex flex-wrap items-start gap-3">
            <MenuField
              label="Books"
              open={openPicker === "books"}
              onToggleOpen={() =>
                setOpenPicker((current) => (current === "books" ? null : "books"))
              }
              summary={bookSummary}
            >
              {booksState.books.length === 0 ? (
                <EmptyMenuState message="No books are available for this project yet." />
              ) : (
                <div className="space-y-1">
                  {booksState.books.map((book) => {
                    const selected = visibleSelectedBookId === book.id;

                    return (
                      <MenuCheckboxRow
                        key={book.id}
                        checked={selected}
                        label={book.title}
                        meta={book.summary || book.id}
                        onClick={() => {
                          setSelectedBookId((current) => {
                            const next = toggleManuscriptBookId(current, book.id);
                            setSelectedChapterIdsByBook((chapterCurrent) =>
                              pruneManuscriptChapterSelections(next, chapterCurrent)
                            );
                            return next;
                          });
                        }}
                      />
                    );
                  })}
                </div>
              )}
            </MenuField>

            <MenuField
              label="Chapters"
              open={openPicker === "chapters"}
              onToggleOpen={() =>
                setOpenPicker((current) => (current === "chapters" ? null : "chapters"))
              }
              summary={chapterSummary}
              disabled={visibleSelectedBookId === null}
            >
              {visibleSelectedBookId === null ? (
                <EmptyMenuState message="Select one book first." />
              ) : (
                <div className="space-y-2">
                  {(() => {
                    const book =
                      booksState.books.find((candidate) => candidate.id === visibleSelectedBookId) ??
                      null;
                    const bookChapters = chaptersState.chapters.filter(
                      (chapter) =>
                        chapter.bookId === visibleSelectedBookId &&
                        typeof chapter.chapterNumber === "number"
                    );

                    if (!book) {
                      return null;
                    }

                    return (
                      <div className="space-y-2">
                        <div className="px-3 pt-2">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                            {book.title}
                          </p>
                          <p className="mt-1 text-xs text-zinc-500">
                            Leave every checkbox empty to show all chapters for this book.
                          </p>
                        </div>

                        {bookChapters.length > 0 ? (
                          <div className="space-y-1">
                            {bookChapters.map((chapter) => {
                              const checked = (selectedChapterIdsByBook[book.id] ?? []).includes(
                                chapter.id
                              );

                              return (
                                <MenuCheckboxRow
                                  key={chapter.id}
                                  checked={checked}
                                  label={
                                    typeof chapter.chapterNumber === "number"
                                      ? `Chapter ${chapter.chapterNumber}`
                                      : chapter.title
                                  }
                                  meta={chapter.title}
                                  onClick={() =>
                                    setSelectedChapterIdsByBook((current) =>
                                      toggleManuscriptChapterId(current, book.id, chapter.id)
                                    )
                                  }
                                />
                              );
                            })}
                          </div>
                        ) : (
                          <EmptyMenuState message="No numbered chapters exist yet for this book." />
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}
            </MenuField>
          </div>

          <div className="ml-auto flex items-center gap-3">
            <div className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm text-zinc-600">
              {isLoading ? "Loading manuscript..." : hasError ? "Check the error banner" : "Autosave enabled"}
            </div>

          </div>
        </div>

        <div className="border-t border-zinc-200/70 bg-zinc-50/80 px-4 py-2 sm:px-6 xl:px-8">
          <DocumentToolbar />
        </div>

        <div className="border-t border-zinc-200/60 bg-white/70 px-4 py-2 sm:px-6 xl:px-8">
          <DocumentRuler />
        </div>
      </div>

      <div
        ref={scrollContainerRef}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-6 sm:px-6 sm:py-8 xl:px-8"
      >
        {booksState.error || chaptersState.error || recordsState.error ? (
          <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">
            {booksState.error || chaptersState.error || recordsState.error}
          </div>
        ) : null}

        <div className="mx-auto w-full max-w-[9.25in]">
          <div className="min-h-[calc(100vh-18rem)] rounded-none border border-zinc-200 bg-white shadow-[0_20px_70px_-52px_rgba(24,24,27,0.5)]">
            {visibleSelectedBookId === null ? (
              <div className="px-8 py-12 text-sm leading-7 text-zinc-500">
                Select one book from the toolbar above to start the manuscript.
              </div>
            ) : visibleSections.length === 0 ? (
              <div className="px-8 py-12 text-sm leading-7 text-zinc-500">
                No manuscript chapters are available for the current selection.
              </div>
            ) : (
              <div className="px-8 py-10">
                <div className="space-y-10">
                  {visibleSections.map((section) => (
                    <ManuscriptBookSectionView
                      key={section.book.id}
                      section={section}
                      onSaved={async (slot, bodyText) => {
                        const saved = await upsertManuscriptForProject(uid, activeProjectId, {
                          bodyText,
                          bookId: section.book.id,
                          chapterId: slot.chapterId,
                          chapterNumber: slot.chapterNumber,
                          chapterTitle: slot.chapterTitle,
                        });

                        setRecordsState((current) => {
                          const next = current.manuscripts.filter((record) => record.id !== saved.id);
                          next.push(saved);
                          next.sort(compareManuscriptRecords);
                          return {
                            ...current,
                            manuscripts: next,
                          };
                        });
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function ManuscriptBookSectionView({
  onSaved,
  section,
}: {
  onSaved: (slot: ManuscriptChapterSlot, bodyText: string) => Promise<void>;
  section: ManuscriptBookSection;
}) {
  return (
    <section className="space-y-6">
      <div className="border-b border-zinc-100 pb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-zinc-500">
              Book
            </p>
            <h3 className="mt-2 text-xl font-semibold tracking-tight text-zinc-950">
              {section.book.title}
            </h3>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-600">
              {section.book.summary || "No book summary yet."}
            </p>
          </div>

          <div className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
            {section.chapterSlots.length} chapter{section.chapterSlots.length === 1 ? "" : "s"}
          </div>
        </div>
      </div>

      <div className="space-y-8">
        {section.chapterSlots.map((slot) => (
          <ManuscriptChapterCard
            key={slot.manuscriptId}
            onSave={onSaved}
            slot={slot}
          />
        ))}
      </div>
    </section>
  );
}

function ManuscriptChapterCard({
  onSave,
  slot,
}: {
  onSave: (slot: ManuscriptChapterSlot, bodyText: string) => Promise<void>;
  slot: ManuscriptChapterSlot;
}) {
  const [bodyText, setBodyText] = useState(slot.bodyText);
  const [savedText, setSavedText] = useState(slot.bodyText);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const onSaveRef = useRef(onSave);
  const saveTokenRef = useRef(0);

  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  /* eslint-disable react-hooks/set-state-in-effect */
  // Sync text when an external reload updates the stored chapter body.
  useEffect(() => {
    setBodyText(slot.bodyText);
    setSavedText(slot.bodyText);
    setSaving(false);
    setSaveError(null);
  }, [slot.bodyText, slot.manuscriptId]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!slot.isEditable || bodyText === savedText) {
      return;
    }

    const saveToken = ++saveTokenRef.current;
    const timer = window.setTimeout(() => {
      setSaving(true);
      setSaveError(null);

      void onSaveRef.current(slot, bodyText)
        .then(() => {
          if (saveToken !== saveTokenRef.current) {
            return;
          }

          setSavedText(bodyText);
          setSaving(false);
        })
        .catch((error) => {
          if (saveToken !== saveTokenRef.current) {
            return;
          }

          setSaving(false);
          setSaveError(error instanceof Error ? error.message : "Unable to save chapter text.");
        });
    }, 550);

    return () => {
      window.clearTimeout(timer);
    };
  }, [bodyText, savedText, slot]);

  const statusLabel = slot.isEditable
    ? saving
      ? "Saving"
      : bodyText !== savedText
        ? "Unsaved"
        : saveError
          ? "Error"
          : "Saved"
    : slot.isFilteredOut
      ? "Filtered out"
      : "Locked";

  return (
    <article className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-400">
            {slot.isExistingChapter ? "Chapter" : "Blank chapter slot"}
          </p>
          <h4 className="mt-2 text-[1.15rem] font-semibold tracking-tight text-zinc-950">
            {slot.chapterTitle}
          </h4>
          <p className="mt-2 text-sm leading-6 text-zinc-500">
            {slot.isExistingChapter
              ? "Stored chapter metadata is present for this slot."
              : "This slot does not have a chapter row yet, but the manuscript text still persists."}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
            {statusLabel}
          </span>
          <span className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
            {slot.manuscriptId}
          </span>
        </div>
      </div>

      {slot.isEditable ? (
        <textarea
          data-skip-auto-correct="true"
          value={bodyText}
          onChange={(event) => setBodyText(event.target.value)}
          placeholder="Start writing this chapter..."
          className="min-h-[24rem] w-full resize-none border-0 bg-transparent p-0 font-[var(--font-geist-sans)] text-[15px] leading-8 text-zinc-950 outline-none placeholder:text-zinc-400"
        />
      ) : (
        <div className="rounded-[1.2rem] border border-dashed border-zinc-200 bg-zinc-50 px-5 py-8 text-sm leading-6 text-zinc-600">
          This chapter is filtered out. Check the chapter filter above to edit it.
        </div>
      )}

      {saveError ? (
        <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {saveError}
        </p>
      ) : null}
    </article>
  );
}

function DocumentToolbar() {
  return (
    <div className="flex flex-wrap items-center gap-2 text-zinc-600">
      <ToolbarButton label="Undo" icon="Undo" wide />
      <ToolbarButton label="Redo" icon="Redo" wide />
      <ToolbarDivider />
      <ToolbarButton label="Zoom" icon="100%" wide />
      <ToolbarButton label="Style" icon="Normal text" wide />
      <ToolbarButton label="Font" icon="Arial" wide />
      <ToolbarButton label="Size" icon="11" narrow />
      <ToolbarDivider />
      <ToolbarButton label="Bold" icon="B" strong />
      <ToolbarButton label="Italic" icon="I" italic />
      <ToolbarButton label="Underline" icon="U" underline />
      <ToolbarDivider />
      <ToolbarButton label="Insert" icon="Insert" wide />
    </div>
  );
}

function ToolbarButton({
  icon,
  label,
  narrow = false,
  italic = false,
  strong = false,
  underline = false,
  wide = false,
}: {
  icon: string;
  label: string;
  narrow?: boolean;
  italic?: boolean;
  strong?: boolean;
  underline?: boolean;
  wide?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      className={`inline-flex h-9 items-center justify-center rounded-md border border-transparent bg-transparent px-3 text-xs transition hover:bg-white hover:text-zinc-950 ${
        narrow ? "min-w-[3rem]" : wide ? "min-w-[5rem]" : "min-w-[2.5rem]"
      } ${strong ? "font-semibold" : ""} ${italic ? "italic" : ""} ${
        underline ? "underline decoration-1 underline-offset-2" : ""
      }`}
    >
      {icon}
    </button>
  );
}

function ToolbarDivider() {
  return <span className="mx-1 h-5 w-px bg-zinc-200" aria-hidden="true" />;
}

function DocumentRuler() {
  return (
    <div className="mx-auto flex w-full max-w-[9.25in] items-end gap-0 overflow-hidden">
      {Array.from({ length: 18 }).map((_, index) => (
        <div
          key={index}
          className={`border-l border-zinc-300/80 ${
            index % 2 === 0 ? "h-4" : index % 3 === 0 ? "h-3" : "h-2"
          } w-[1.111%] min-w-[0.5rem]`}
        />
      ))}
    </div>
  );
}

function MenuField({
  children,
  disabled = false,
  label,
  onToggleOpen,
  open,
  summary,
}: {
  children: ReactNode;
  disabled?: boolean;
  label: string;
  onToggleOpen: () => void;
  open: boolean;
  summary: string;
}) {
  return (
    <div className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={onToggleOpen}
        className="flex h-11 min-w-[12rem] items-center justify-between gap-3 rounded-full border border-zinc-200 bg-white px-4 text-left text-sm text-zinc-950 outline-none transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-70"
      >
        <span className="min-w-0 truncate">
          <span className="mr-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
            {label}
          </span>
          {summary}
        </span>
        <ChevronIcon open={open} />
      </button>

      {open ? (
        <div className="absolute left-0 top-[calc(100%+0.5rem)] z-[60] w-[24rem] overflow-hidden rounded-[1.6rem] border border-zinc-200 bg-white shadow-[0_18px_40px_-24px_rgba(24,24,27,0.45)]">
          <div className="border-b border-zinc-200 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
              {label}
            </p>
          </div>
          <div className="max-h-80 overflow-y-auto p-2">{children}</div>
        </div>
      ) : null}
    </div>
  );
}

function MenuCheckboxRow({
  checked,
  label,
  meta,
  onClick,
}: {
  checked: boolean;
  label: string;
  meta?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-start gap-3 rounded-2xl px-3 py-3 text-left text-sm transition ${
        checked ? "bg-zinc-950 text-white" : "text-zinc-700 hover:bg-zinc-100"
      }`}
    >
      <SelectionMark checked={checked} />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{label}</span>
        {meta ? (
          <span className={`mt-1 block truncate text-xs ${checked ? "text-white/65" : "text-zinc-500"}`}>
            {meta}
          </span>
        ) : null}
      </span>
    </button>
  );
}

function EmptyMenuState({ message }: { message: string }) {
  return <div className="rounded-2xl px-3 py-4 text-sm leading-6 text-zinc-500">{message}</div>;
}

function SelectionMark({ checked }: { checked: boolean }) {
  return (
    <span
      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
        checked ? "border-white bg-white text-zinc-950" : "border-zinc-300 bg-white text-transparent"
      }`}
      aria-hidden="true"
    >
      <CheckIcon />
    </span>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      className={`h-4 w-4 shrink-0 transition ${open ? "rotate-180" : ""}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 6l4 4 4-4" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      className="h-3.5 w-3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3.5 8l2.5 2.5 6-6" />
    </svg>
  );
}

function compareManuscriptRecords(left: ManuscriptRecord, right: ManuscriptRecord) {
  if (left.bookId !== right.bookId) {
    return left.bookId.localeCompare(right.bookId);
  }

  return left.chapterNumber - right.chapterNumber;
}
