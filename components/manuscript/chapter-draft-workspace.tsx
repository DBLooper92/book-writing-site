"use client";

import { createPortal } from "react-dom";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { createEmptyChapterFormValues, normalizeChapterFormValues, type Chapter } from "@/types/chapter";
import { useBooks } from "@/hooks/use-books";
import { useChapters } from "@/hooks/use-chapters";
import { useAppSettings } from "@/hooks/use-app-settings";
import { useScrollLock } from "@/hooks/use-scroll-lock";
import { createChapterForProject, saveChapterDraftForProject } from "@/lib/data/chapters";
import { updateBookPenNameForProject } from "@/lib/data/books";
import { formatManuscriptHeaderTitle } from "@/lib/manuscript/workspace";

type ChapterDraftWorkspaceProps = {
  activeProjectId: string;
  layoutMode?: "standalone" | "embedded";
  onCloseEmbedded?: () => void;
  scrollContainerRef?: RefObject<HTMLDivElement | null>;
  uid: string;
};

type ChapterCreateModalState = {
  bookId: string;
  suggestedChapterNumber: number;
};

const PAGE_WIDTH = 816;
const PAGE_HEIGHT = 1056;
const PAGE_GAP = 24;
const PAGE_MARGIN_X = 96;
const PAGE_MARGIN_Y = 96;
const PAGE_CONTENT_WIDTH = PAGE_WIDTH - PAGE_MARGIN_X * 2;
const PAGE_CONTENT_HEIGHT = PAGE_HEIGHT - PAGE_MARGIN_Y * 2;
const PAGE_FONT_SIZE = 16;
const PAGE_LINE_HEIGHT = 32;
const PAGE_PARAGRAPH_INDENT = 48;
const CHAPTER_HEADING_TOP_BLANK_LINES = 3;
const CHAPTER_HEADING_BOTTOM_BLANK_LINES = 2;
const CHAPTER_HEADING_RESERVED_LINES =
  CHAPTER_HEADING_TOP_BLANK_LINES + 2 + CHAPTER_HEADING_BOTTOM_BLANK_LINES;
const PAGE_LINES_PER_PAGE = Math.max(1, Math.floor(PAGE_CONTENT_HEIGHT / PAGE_LINE_HEIGHT));
const PAGE_FONT_FAMILY = '"Times New Roman", Times, serif';
const PAGE_WIDTH_CLASS = "w-[min(100%,51rem)]";

export function ChapterDraftWorkspace({
  activeProjectId,
  layoutMode = "standalone",
  onCloseEmbedded,
  scrollContainerRef,
  uid,
}: ChapterDraftWorkspaceProps) {
  const booksState = useBooks();
  const chaptersState = useChapters();
  const { addPenName, settings: appSettings } = useAppSettings();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const chapterIdFromQuery = searchParams.get("chapterId");
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [focusedChapterId, setFocusedChapterId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [notice, setNotice] = useState<{ message: string; tone: "success" | "error" } | null>(
    null
  );
  const [chapterCreateModalState, setChapterCreateModalState] =
    useState<ChapterCreateModalState | null>(null);
  const [penNameLightboxOpen, setPenNameLightboxOpen] = useState(false);
  const [settingsMenuOpen, setSettingsMenuOpen] = useState(false);
  const [pageCountsByChapterId, setPageCountsByChapterId] = useState<Record<string, number>>({});
  const chapterRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());
  const settingsMenuRef = useRef<HTMLDivElement | null>(null);
  const draftScrollContainerNodeRef = useRef<HTMLDivElement | null>(null);

  const orderedBooks = booksState.books;
  const chapterFromQuery = useMemo(
    () =>
      chapterIdFromQuery
        ? chaptersState.chapters.find((chapter) => chapter.id === chapterIdFromQuery) ?? null
        : null,
    [chapterIdFromQuery, chaptersState.chapters]
  );
  const visibleSelectedBookId = useMemo(() => {
    if (chapterFromQuery?.bookId) {
      return chapterFromQuery.bookId;
    }

    if (selectedBookId && orderedBooks.some((book) => book.id === selectedBookId)) {
      return selectedBookId;
    }

    return orderedBooks[0]?.id ?? null;
  }, [chapterFromQuery, orderedBooks, selectedBookId]);
  const selectedBook = visibleSelectedBookId
    ? orderedBooks.find((book) => book.id === visibleSelectedBookId) ?? null
    : null;
  const bookChapters = useMemo(
    () => getChaptersForBook(chaptersState.chapters, visibleSelectedBookId),
    [chaptersState.chapters, visibleSelectedBookId]
  );
  const profileDefaultPenName = appSettings?.profile.defaultPenName ?? null;
  const selectedBookPenName = selectedBook?.penName ?? null;
  const effectivePenName = selectedBookPenName ?? profileDefaultPenName;
  const searchMatches = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    if (!normalizedQuery) {
      return [];
    }

    return bookChapters.filter((chapter) => {
      const searchableText = `${chapter.title}\n${chapter.summary}\n${chapter.description}\n${chapter.draftText}`
        .toLowerCase();
      return searchableText.includes(normalizedQuery);
    });
  }, [bookChapters, searchQuery]);
  const visiblePenNames = useMemo(() => {
    const nextNames: string[] = [];

    const savedPenNames = appSettings?.profile.penNames ?? [];

    for (const penName of savedPenNames) {
      const normalizedPenName = penName.trim();

      if (!normalizedPenName) {
        continue;
      }

      if (nextNames.some((candidate) => candidate.toLowerCase() === normalizedPenName.toLowerCase())) {
        continue;
      }

      nextNames.push(normalizedPenName);
    }

    return nextNames;
  }, [appSettings?.profile.penNames]);
  const visibleFocusedChapterId = chapterFromQuery?.id ?? focusedChapterId;
  const focusedChapter = useMemo(
    () => bookChapters.find((chapter) => chapter.id === visibleFocusedChapterId) ?? null,
    [bookChapters, visibleFocusedChapterId]
  );
  const chapterPageOffsets = useMemo(() => {
    const offsets = new Map<string, number>();
    let runningPageNumber = 1;

    for (const chapter of bookChapters) {
      offsets.set(chapter.id, runningPageNumber);
      runningPageNumber +=
        pageCountsByChapterId[chapter.id] ?? getManuscriptPageCount(chapter.draftText);
    }

    return offsets;
  }, [bookChapters, pageCountsByChapterId]);
  const hasChapterDrafts = bookChapters.length > 0;

  useEffect(() => {
    if (!settingsMenuOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;

      if (!(target instanceof Node)) {
        setSettingsMenuOpen(false);
        return;
      }

      if (settingsMenuRef.current?.contains(target)) {
        return;
      }

      setSettingsMenuOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSettingsMenuOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [settingsMenuOpen]);

  useEffect(() => {
    if (!notice) {
      return;
    }

    const timer = window.setTimeout(() => {
      setNotice(null);
    }, 3500);

    return () => {
      window.clearTimeout(timer);
    };
  }, [notice]);

  useEffect(() => {
    if (!visibleFocusedChapterId) {
      return;
    }

    const node = chapterRefs.current.get(visibleFocusedChapterId);

    if (!node) {
      return;
    }

    node.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, [bookChapters, visibleFocusedChapterId]);

  useLayoutEffect(() => {
    if (layoutMode !== "embedded") {
      return;
    }

    const scrollContainer = draftScrollContainerNodeRef.current;

    if (!scrollContainer) {
      return;
    }

    const storageKey = `bookBible.chapterDraftScrollTop.${activeProjectId}`;
    const storedScrollTop = window.sessionStorage.getItem(storageKey);
    const nextScrollTop = storedScrollTop ? Number(storedScrollTop) : 0;

    if (Number.isFinite(nextScrollTop)) {
      scrollContainer.scrollTop = nextScrollTop;
    }
  }, [activeProjectId, layoutMode]);

  async function handleCreateChapterFromModal(
    values: {
      chapterNumber: number;
      title: string;
    },
    nextState: ChapterCreateModalState
  ) {
    if (!uid || !activeProjectId) {
      throw new Error("Select an active project before creating a chapter.");
    }

    const formValues = createEmptyChapterFormValues();
    formValues.title = values.title;
    formValues.bookId = nextState.bookId;
    formValues.chapterNumber = String(values.chapterNumber);
    formValues.status = "drafting";

    try {
      const normalizedValues = normalizeChapterFormValues(formValues);

      const chapterId = await createChapterForProject(uid, activeProjectId, normalizedValues);

      chaptersState.reload();
      setFocusedChapterId(chapterId);
      setChapterCreateModalState(null);
      setNotice({
        message: `Created Chapter ${normalizedValues.chapterNumber ?? "?"}: ${normalizedValues.title}`,
        tone: "success",
      });

      const nextSearchParams = new URLSearchParams(searchParams.toString());
      nextSearchParams.set("chapterId", chapterId);
      const nextUrl =
        nextSearchParams.toString().length > 0 ? `${pathname}?${nextSearchParams}` : pathname;
      router.replace(nextUrl, { scroll: false });
    } catch (error) {
      throw error;
    }
  }

  function openCreateChapterModal(afterChapter: Chapter | null = null) {
    if (!selectedBook) {
      return;
    }

    setChapterCreateModalState({
      bookId: selectedBook.id,
      suggestedChapterNumber: getSuggestedChapterNumber(bookChapters, afterChapter),
    });
  }

  function handleBookChange(nextBookId: string) {
    setSelectedBookId(nextBookId);
    setFocusedChapterId(null);
    setSearchQuery("");
    setNotice(null);
    setSettingsMenuOpen(false);
  }

  async function handleCreatePenNameFromLightbox(penName: string) {
    if (!selectedBook) {
      throw new Error("Select a book before adding a pen name.");
    }

    await addPenName(penName);
    await updateBookPenNameForProject(uid, activeProjectId, selectedBook.id, penName);
    booksState.reload();
    setPenNameLightboxOpen(false);
    setNotice({
      message:
        visiblePenNames.length === 0
          ? `${penName} was added as your profile default and ${selectedBook.title}'s pen name.`
          : `${selectedBook.title} will use ${penName}.`,
      tone: "success",
    });
  }

  function handleSearchSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const match = searchMatches[0];

    if (!match) {
      return;
    }

    setFocusedChapterId(match.id);

    const nextSearchParams = new URLSearchParams(searchParams.toString());
    nextSearchParams.set("chapterId", match.id);
    const nextUrl =
      nextSearchParams.toString().length > 0 ? `${pathname}?${nextSearchParams}` : pathname;
    router.replace(nextUrl, { scroll: false });
  }

  const surfaceClassName =
    layoutMode === "embedded"
      ? "min-h-0 flex-1 overflow-hidden bg-[linear-gradient(180deg,#f8f5ee_0%,#efe6d7_100%)]"
      : "min-h-[calc(100vh-6rem)] flex-1 overflow-hidden bg-[linear-gradient(180deg,#fcfbf7_0%,#f4efe6_100%)]";

  return (
    <section className={`flex ${surfaceClassName}`}>
      <div className="flex min-h-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 border-b border-zinc-200/80 bg-white/90 backdrop-blur">
          <div className="flex flex-wrap items-center gap-3 px-4 py-4 sm:px-6 xl:px-8">
            <div className="flex min-w-0 items-center gap-2">
              <div ref={settingsMenuRef} className="relative">
                <button
                  type="button"
                  onClick={() => setSettingsMenuOpen((current) => !current)}
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-600 transition hover:bg-zinc-50 hover:text-zinc-950"
                  aria-label="Manuscript settings"
                  aria-haspopup="menu"
                  aria-expanded={settingsMenuOpen}
                >
                  <SettingsGearIcon />
                </button>

                {settingsMenuOpen ? (
                  <div
                    role="menu"
                    aria-label="Manuscript settings"
                    className="absolute left-0 top-full z-40 mt-2 w-56 rounded-2xl border border-zinc-200 bg-white p-1 shadow-[0_24px_60px_-30px_rgba(24,24,27,0.35)]"
                  >
                    <button
                      type="button"
                      role="menuitem"
                      onClick={async () => {
                        if (!selectedBook) {
                          return;
                        }

                        if (selectedBookPenName === null) {
                          setSettingsMenuOpen(false);
                          return;
                        }

                        try {
                          await updateBookPenNameForProject(
                            uid,
                            activeProjectId,
                            selectedBook.id,
                            null
                          );
                          booksState.reload();
                          setNotice({
                            message: `${selectedBook.title} will use the profile default pen name.`,
                            tone: "success",
                          });
                          setSettingsMenuOpen(false);
                        } catch (error) {
                          setNotice({
                            message:
                              error instanceof Error
                                ? error.message
                                : "Unable to update this book's pen name.",
                            tone: "error",
                          });
                        }
                      }}
                      className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition ${
                        selectedBookPenName === null
                          ? "cursor-default bg-zinc-50 text-zinc-900"
                          : "text-zinc-700 hover:bg-zinc-50"
                      }`}
                    >
                      <span>Use profile default</span>
                      {selectedBookPenName === null ? (
                        <span className="rounded-full bg-zinc-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                          Book
                        </span>
                      ) : null}
                    </button>

                    <div className="group/pen relative">
                      <button
                        type="button"
                        className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm text-zinc-700 transition hover:bg-zinc-50"
                        aria-haspopup="menu"
                      >
                        <span>Pen Name</span>
                        <span className="text-zinc-400" aria-hidden="true">
                          ▸
                        </span>
                      </button>

                      <div className="absolute left-full top-0 z-50 hidden pl-2 group-hover/pen:block group-focus-within/pen:block">
                        <div className="w-60 rounded-2xl border border-zinc-200 bg-white p-1 shadow-[0_24px_60px_-30px_rgba(24,24,27,0.35)]">
                          {visiblePenNames.length > 0 ? (
                            visiblePenNames.map((penName) => {
                              const isCurrentBookSelection = selectedBookPenName === penName;

                              return (
                                <button
                                  key={penName}
                                  type="button"
                                  role="menuitem"
                                  onClick={async () => {
                                    if (!selectedBook) {
                                      return;
                                    }

                                    if (isCurrentBookSelection) {
                                      setSettingsMenuOpen(false);
                                      return;
                                    }

                                    try {
                                      await updateBookPenNameForProject(
                                        uid,
                                        activeProjectId,
                                        selectedBook.id,
                                        penName
                                      );
                                      booksState.reload();
                                      setNotice({
                                        message: `${selectedBook.title} will use ${penName}.`,
                                        tone: "success",
                                      });
                                      setSettingsMenuOpen(false);
                                    } catch (error) {
                                      setNotice({
                                        message:
                                          error instanceof Error
                                            ? error.message
                                            : "Unable to update this book's pen name.",
                                        tone: "error",
                                      });
                                    }
                                  }}
                                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition ${
                                    isCurrentBookSelection
                                      ? "cursor-default bg-zinc-50 text-zinc-900"
                                      : "text-zinc-700 hover:bg-zinc-50"
                                  }`}
                                >
                                  <span>{penName}</span>
                                  {isCurrentBookSelection ? (
                                    <span className="rounded-full bg-zinc-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                                      Book
                                    </span>
                                  ) : null}
                                </button>
                              );
                            })
                          ) : (
                            <div className="rounded-xl px-3 py-2.5 text-sm text-zinc-400">
                              No pen names saved
                            </div>
                          )}

                          <div className="my-1 border-t border-zinc-100" />

                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => {
                              setSettingsMenuOpen(false);
                              setPenNameLightboxOpen(true);
                            }}
                            disabled={!selectedBook}
                            className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-zinc-900 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:text-zinc-400"
                          >
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-950 text-[0.95rem] leading-none text-white">
                              +
                            </span>
                            <span>Add pen name</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>

              <select
                value={selectedBook?.id ?? ""}
                onChange={(event) => handleBookChange(event.target.value)}
                disabled={orderedBooks.length === 0}
                className="h-11 min-w-[16rem] max-w-[24rem] rounded-full border border-zinc-200 bg-white px-4 text-sm text-zinc-950 outline-none transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {orderedBooks.length === 0 ? (
                  <option value="">No books available</option>
                ) : (
                  <option value="" disabled>
                    Select book
                  </option>
                )}
                {orderedBooks.map((book) => (
                  <option key={book.id} value={book.id}>
                    {book.title}
                  </option>
                ))}
              </select>

            </div>

            <form className="flex min-w-[18rem] flex-1 items-center gap-2" onSubmit={handleSearchSubmit}>
              <label className="sr-only" htmlFor="chapter-draft-search">
                Search chapter text
              </label>
              <div className="flex h-11 flex-1 items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 text-zinc-500">
                <SearchIcon />
                <input
                  id="chapter-draft-search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search chapter text"
                  className="h-full w-full bg-transparent text-sm text-zinc-950 outline-none placeholder:text-zinc-400"
                />
                {searchQuery.trim() ? (
                  <span className="rounded-full bg-zinc-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                    {searchMatches.length}
                  </span>
                ) : null}
              </div>
            </form>

            <div className="ml-auto flex flex-wrap items-center gap-3">
              {layoutMode === "embedded" && onCloseEmbedded ? (
                <button
                  type="button"
                  onClick={onCloseEmbedded}
                  className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-900 transition hover:bg-zinc-50"
                >
                  Close split screen
                </button>
              ) : null}

            </div>
          </div>

          <div className="border-t border-zinc-200/70 bg-zinc-50/80 px-4 py-2 sm:px-6 xl:px-8" />
        </header>

        {notice ? (
          <div className="px-4 pt-4 sm:px-6 xl:px-8">
            <div
              role="status"
              aria-live="polite"
              className={`rounded-2xl border px-4 py-3 text-sm leading-6 shadow-sm ${
                notice.tone === "error"
                  ? "border-red-200 bg-red-50 text-red-700"
                  : "border-emerald-200 bg-emerald-50 text-emerald-800"
              }`}
            >
              {notice.message}
            </div>
          </div>
        ) : null}

        <div
          ref={(node) => {
            draftScrollContainerNodeRef.current = node;

            if (scrollContainerRef) {
              scrollContainerRef.current = node;
            }
          }}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-6 sm:py-6 xl:px-8"
          onScroll={(event) => {
            if (layoutMode !== "embedded") {
              return;
            }

            const storageKey = `bookBible.chapterDraftScrollTop.${activeProjectId}`;
            window.sessionStorage.setItem(storageKey, String(event.currentTarget.scrollTop));
          }}
        >
          {booksState.error || chaptersState.error ? (
            <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">
              {booksState.error || chaptersState.error}
            </div>
          ) : null}

          {!selectedBook ? (
            <StateCard tone="neutral">
              No books are available for this project yet.
            </StateCard>
          ) : !hasChapterDrafts ? (
            <div className="mx-auto flex w-full justify-center pt-2">
              <BlankChapterPage
                onStartNewChapter={() => openCreateChapterModal(null)}
                pageCount={1}
              />
            </div>
          ) : (
            <div className="space-y-8">
              {bookChapters.map((chapter, index) => (
              <ChapterDraftBlock
                  key={chapter.id}
                  activeProjectId={activeProjectId}
                  chapter={chapter}
                  chapterRef={(node) => {
                    chapterRefs.current.set(chapter.id, node);
                  }}
                  isFocused={chapter.id === focusedChapter?.id}
                  isLastChapter={index === bookChapters.length - 1}
                  bookTitle={selectedBook.title}
                  pageNumberOffset={chapterPageOffsets.get(chapter.id) ?? 1}
                  onPageCountChange={(chapterId, pageCount) => {
                    setPageCountsByChapterId((current) =>
                      current[chapterId] === pageCount ? current : { ...current, [chapterId]: pageCount }
                    );
                  }}
                  profileName={effectivePenName}
                  onCreateNextChapter={() => openCreateChapterModal(chapter)}
                  uid={uid}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {chapterCreateModalState ? (
        <ChapterCreateLightbox
          initialChapterNumber={chapterCreateModalState.suggestedChapterNumber}
          initialBookId={chapterCreateModalState.bookId}
          onClose={() => setChapterCreateModalState(null)}
          onCreate={async (values) => handleCreateChapterFromModal(values, chapterCreateModalState)}
        />
      ) : null}

      {penNameLightboxOpen ? (
        <PenNameCreateLightbox
          bookTitle={selectedBook?.title ?? "this book"}
          hasSavedPenNames={visiblePenNames.length > 0}
          onClose={() => setPenNameLightboxOpen(false)}
          onCreate={handleCreatePenNameFromLightbox}
        />
      ) : null}
    </section>
  );
}

function ChapterDraftBlock({
  activeProjectId,
  bookTitle,
  chapter,
  chapterRef,
  isFocused,
  isLastChapter,
  onPageCountChange,
  pageNumberOffset,
  onCreateNextChapter,
  profileName,
  uid,
}: {
  activeProjectId: string;
  bookTitle: string;
  chapter: Chapter;
  chapterRef: (node: HTMLDivElement | null) => void;
  isFocused: boolean;
  isLastChapter: boolean;
  onPageCountChange: (chapterId: string, pageCount: number) => void;
  onCreateNextChapter: () => void;
  pageNumberOffset: number;
  profileName: string | null;
  uid: string;
}) {
  const [draftText, setDraftText] = useState(chapter.draftText ?? "");
  const [savedText, setSavedText] = useState(chapter.draftText ?? "");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [editorSelection, setEditorSelection] = useState({ start: 0, end: 0 });
  const [isEditorFocused, setIsEditorFocused] = useState(false);
  const [documentScale, setDocumentScale] = useState(1);
  const documentFrameRef = useRef<HTMLDivElement | null>(null);
  const saveTokenRef = useRef(0);
  const manuscriptPages = useMemo(
    () => paginateManuscriptText(draftText, CHAPTER_HEADING_RESERVED_LINES),
    [draftText]
  );
  const visibleManuscriptPages = useMemo(
    () => (manuscriptPages.length > 0 ? manuscriptPages : [{ lines: [] as ManuscriptLine[] }]),
    [manuscriptPages]
  );
  const hasDraftContent = draftText.trim().length > 0;
  const hasNewChapterActionPage = isLastChapter && hasDraftContent;
  const manuscriptPageCount = visibleManuscriptPages.length;
  const visiblePageCount = manuscriptPageCount + (hasNewChapterActionPage ? 1 : 0);
  const visibleDocumentHeight =
    visiblePageCount * PAGE_HEIGHT + Math.max(0, visiblePageCount - 1) * PAGE_GAP;
  const scaledDocumentHeight = visibleDocumentHeight * documentScale;
  const caretGeometry = useMemo(() => {
    if (!isEditorFocused || editorSelection.start !== editorSelection.end) {
      return null;
    }

    return getManuscriptCaretGeometry(manuscriptPages, editorSelection.start);
  }, [editorSelection.end, editorSelection.start, isEditorFocused, manuscriptPages]);
  const chapterHeadingNumber =
    typeof chapter.chapterNumber === "number" ? `CHAPTER ${chapter.chapterNumber}` : "";
  const chapterHeadingTitle = chapter.title.trim();
  const syncEditorSelection = (target: HTMLTextAreaElement) => {
    setEditorSelection({
      start: target.selectionStart ?? 0,
      end: target.selectionEnd ?? 0,
    });
  };

  useLayoutEffect(() => {
    const node = documentFrameRef.current;

    if (!node || typeof ResizeObserver === "undefined") {
      return;
    }

    const updateDocumentScale = (nextWidth: number) => {
      if (!Number.isFinite(nextWidth) || nextWidth <= 0) {
        return;
      }

      const nextScale = Math.min(1, Math.max(0.1, nextWidth / PAGE_WIDTH));
      setDocumentScale((currentScale) =>
        Math.abs(currentScale - nextScale) < 0.001 ? currentScale : nextScale
      );
    };

    updateDocumentScale(node.clientWidth);

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];

      if (!entry) {
        return;
      }

      updateDocumentScale(entry.contentRect.width);
    });

    resizeObserver.observe(node);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  useEffect(() => {
    onPageCountChange(chapter.id, manuscriptPageCount);
  }, [chapter.id, manuscriptPageCount, onPageCountChange]);

  useEffect(() => {
    if (draftText === savedText) {
      return;
    }

    const saveToken = ++saveTokenRef.current;
    const timer = window.setTimeout(() => {
      setSaving(true);
      setSaveError(null);

      void saveChapterDraftForProject(uid, activeProjectId, chapter.id, draftText)
        .then(() => {
          if (saveToken !== saveTokenRef.current) {
            return;
          }

          setSavedText(draftText);
          setSaving(false);
        })
        .catch((error) => {
          if (saveToken !== saveTokenRef.current) {
            return;
          }

          setSaving(false);
          setSaveError(error instanceof Error ? error.message : "Unable to save this chapter.");
        });
    }, 550);

    return () => {
      window.clearTimeout(timer);
    };
  }, [activeProjectId, chapter.id, draftText, savedText, uid]);

  return (
    <article
      ref={chapterRef}
      className={`mx-auto w-full ${PAGE_WIDTH_CLASS} ${isFocused ? "ring-1 ring-zinc-300" : ""}`}
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-zinc-500">
            Chapter {typeof chapter.chapterNumber === "number" ? chapter.chapterNumber : "?"}
          </p>
          <h2 className="mt-1.5 text-xl font-semibold tracking-tight text-zinc-950">
            {chapter.title}
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
            {saving ? "Saving" : draftText !== savedText ? "Unsaved" : "Saved"}
          </span>
          {chapter.draftAttachmentId ? (
            <span className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
              DOCX attached
            </span>
          ) : (
            <span className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
              DOCX pending
            </span>
          )}
        </div>
      </div>

      <div
        ref={documentFrameRef}
        className="relative mx-auto w-full"
        style={{
          height: `${scaledDocumentHeight}px`,
          maxWidth: `${PAGE_WIDTH}px`,
        }}
      >
        <div
          className="absolute left-1/2 top-0"
          style={{
            height: `${visibleDocumentHeight}px`,
            transform: "translateX(-50%)",
            width: `${PAGE_WIDTH}px`,
          }}
        >
          <div
            className="relative"
            style={{
              height: `${visibleDocumentHeight}px`,
              transform: `scale(${documentScale})`,
              transformOrigin: "top center",
              width: `${PAGE_WIDTH}px`,
            }}
          >
            <textarea
              data-skip-auto-correct="true"
              value={draftText}
              onChange={(event) => {
                if (saveError) {
                  setSaveError(null);
                }

                setDraftText(event.target.value);
                syncEditorSelection(event.currentTarget);
              }}
              onFocus={(event) => {
                setIsEditorFocused(true);
                syncEditorSelection(event.currentTarget);
              }}
              onBlur={() => {
                setIsEditorFocused(false);
              }}
              onSelect={(event) => {
                syncEditorSelection(event.currentTarget);
              }}
              onKeyUp={(event) => {
                syncEditorSelection(event.currentTarget);
              }}
              onKeyDown={(event) => {
                if (event.nativeEvent.isComposing) {
                  return;
                }

                if (
                  event.key === "Enter" &&
                  !event.shiftKey &&
                  !event.altKey &&
                  !event.ctrlKey &&
                  !event.metaKey
                ) {
                  event.preventDefault();

                  const target = event.currentTarget;
                  const selectionStart = target.selectionStart ?? draftText.length;
                  const selectionEnd = target.selectionEnd ?? draftText.length;
                  const paragraphIndentPrefix = getManuscriptParagraphIndentPrefix();
                  const insertion = `\n${paragraphIndentPrefix}`;

                  target.setRangeText(insertion, selectionStart, selectionEnd, "end");

                  if (saveError) {
                    setSaveError(null);
                  }

                  setDraftText(target.value);
                  syncEditorSelection(target);
                  return;
                }

                if (
                  (event.key === " " || event.code === "Space") &&
                  !event.altKey &&
                  !event.ctrlKey &&
                  !event.metaKey
                ) {
                  const target = event.currentTarget;
                  const selectionStart = target.selectionStart;
                  const selectionEnd = target.selectionEnd;

                  if (
                    selectionStart !== null &&
                    selectionEnd !== null &&
                    selectionStart === selectionEnd &&
                    shouldSuppressSentenceSpaceInsertion(target.value, selectionStart)
                  ) {
                    event.preventDefault();
                  }
                }
              }}
              aria-label={`Chapter ${chapter.chapterNumber ?? "?"} manuscript text`}
              spellCheck={false}
              className="manuscript-editor absolute left-0 top-0 z-10 w-full border-0 bg-transparent outline-none"
              style={{
                boxSizing: "border-box",
                paddingLeft: `${PAGE_MARGIN_X}px`,
                paddingRight: `${PAGE_MARGIN_X}px`,
                paddingTop: `${PAGE_MARGIN_Y + PAGE_LINE_HEIGHT * CHAPTER_HEADING_RESERVED_LINES}px`,
                paddingBottom: `${PAGE_MARGIN_Y}px`,
                height: `${visibleDocumentHeight}px`,
                maxWidth: `${PAGE_WIDTH}px`,
                color: "transparent",
                caretColor: "transparent",
                fontFamily: PAGE_FONT_FAMILY,
                fontSize: `${PAGE_FONT_SIZE}px`,
                lineHeight: `${PAGE_LINE_HEIGHT}px`,
                whiteSpace: "pre-wrap",
                overflowWrap: "break-word",
                wordBreak: "normal",
                fontVariantLigatures: "none",
                tabSize: 4,
                resize: "none",
                overflow: "hidden",
                appearance: "none",
              }}
            />
            {visibleManuscriptPages.map((page, index) => {
              return (
                <section
                  key={`${chapter.id}-page-${index}`}
                  className="pointer-events-none absolute left-0 right-0 overflow-hidden border border-zinc-200 bg-[#fffdf9] shadow-[0_14px_44px_-32px_rgba(24,24,27,0.42)]"
                  style={{
                    height: `${PAGE_HEIGHT}px`,
                    top: `${index * (PAGE_HEIGHT + PAGE_GAP)}px`,
                  }}
                >
                  <ManuscriptRunningHeader
                    bookTitle={bookTitle}
                    authorName={profileName}
                    pageNumber={pageNumberOffset + index}
                  />

                  <div
                    aria-hidden="true"
                    className="h-full px-24 text-zinc-950"
                    style={{
                      boxSizing: "border-box",
                      paddingTop:
                        index === 0
                          ? `${PAGE_MARGIN_Y + PAGE_LINE_HEIGHT * CHAPTER_HEADING_TOP_BLANK_LINES}px`
                          : `${PAGE_MARGIN_Y}px`,
                      paddingBottom: `${PAGE_MARGIN_Y}px`,
                      fontFamily: PAGE_FONT_FAMILY,
                      fontSize: `${PAGE_FONT_SIZE}px`,
                      lineHeight: `${PAGE_LINE_HEIGHT}px`,
                      textAlign: "left",
                      whiteSpace: "pre-wrap",
                      overflowWrap: "break-word",
                      wordBreak: "normal",
                      fontVariantLigatures: "none",
                      tabSize: 4,
                    }}
                  >
                    {index === 0 ? (
                      <div
                        className="flex flex-col items-center text-center"
                        style={{
                          marginBottom: `${PAGE_LINE_HEIGHT * CHAPTER_HEADING_BOTTOM_BLANK_LINES}px`,
                        }}
                      >
                        <p
                          style={{
                            margin: 0,
                            minHeight: `${PAGE_LINE_HEIGHT}px`,
                            fontSize: `${PAGE_FONT_SIZE - 1}px`,
                            fontWeight: 600,
                            letterSpacing: "0.18em",
                            lineHeight: `${PAGE_LINE_HEIGHT}px`,
                            textTransform: "uppercase",
                          }}
                        >
                          {chapterHeadingNumber}
                        </p>
                        <p
                          style={{
                            margin: 0,
                            minHeight: `${PAGE_LINE_HEIGHT}px`,
                            fontSize: `${PAGE_FONT_SIZE}px`,
                            fontWeight: 400,
                            lineHeight: `${PAGE_LINE_HEIGHT}px`,
                          }}
                        >
                          {chapterHeadingTitle || "\u00A0"}
                        </p>
                      </div>
                    ) : null}

                    {page.lines.map((line, lineIndex) => {
                      const shouldIndentParagraph =
                        line.isParagraphStart &&
                        !line.isChapterOpeningParagraph &&
                        !/^\s/.test(line.text);

                      return (
                        <div
                          key={`${chapter.id}-page-${index}-line-${lineIndex}`}
                          style={{
                            margin: 0,
                            minHeight: `${PAGE_LINE_HEIGHT}px`,
                            textIndent: shouldIndentParagraph ? `${PAGE_PARAGRAPH_INDENT}px` : 0,
                          }}
                        >
                          {line.text || "\u00A0"}
                        </div>
                      );
                    })}
                  </div>

                  {caretGeometry && caretGeometry.pageIndex === index ? (
                    <span
                      aria-hidden="true"
                      className="manuscript-caret absolute z-20 rounded-full bg-zinc-950 shadow-[0_0_0_1px_rgba(255,253,249,0.72)]"
                      style={{
                        left: `${caretGeometry.left}px`,
                        top: `${caretGeometry.top}px`,
                        width: "1.5px",
                        height: `${caretGeometry.height}px`,
                      }}
                    />
                  ) : null}
                </section>
              );
            })}
            {hasNewChapterActionPage ? (
              <section
                key={`${chapter.id}-new-chapter-action-page`}
                className="pointer-events-none absolute left-0 right-0 overflow-hidden border border-zinc-200 bg-[#fffdf9] shadow-[0_14px_44px_-32px_rgba(24,24,27,0.42)]"
                style={{
                  height: `${PAGE_HEIGHT}px`,
                  top: `${manuscriptPageCount * (PAGE_HEIGHT + PAGE_GAP)}px`,
                }}
              >
                <button
                  type="button"
                  onClick={onCreateNextChapter}
                  aria-label="Start a new chapter"
                  className="pointer-events-auto absolute left-1/2 top-6 z-20 inline-flex -translate-x-1/2 items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-900 shadow-[0_10px_24px_-18px_rgba(24,24,27,0.45)] transition hover:bg-zinc-50"
                >
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-950 text-[0.95rem] leading-none text-white">
                    +
                  </span>
                  <span>Start a New Chapter</span>
                </button>
              </section>
            ) : null}
          </div>
        </div>
      </div>

      {saveError ? (
        <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {saveError}
        </p>
      ) : null}
    </article>
  );
}

function ManuscriptRunningHeader({
  bookTitle,
  authorName,
  pageNumber,
}: {
  bookTitle: string;
  authorName: string | null;
  pageNumber: number;
}) {
  const shortTitle = formatManuscriptHeaderTitle(bookTitle);
  const hasAuthorName = Boolean(authorName?.trim());
  const hasShortTitle = Boolean(shortTitle);
  const hasPrefix = hasAuthorName || hasShortTitle;

  return (
    <div className="pointer-events-none absolute right-24 top-8 z-20 flex max-w-[calc(100%-12rem)] items-center justify-end whitespace-nowrap text-[11px] font-semibold tracking-[0.18em] text-zinc-500">
      {hasAuthorName ? <span className="shrink-0">{authorName}</span> : null}
      {hasAuthorName && hasShortTitle ? <span className="shrink-0 px-1">/</span> : null}
      {hasShortTitle ? (
        <span className="min-w-0 truncate text-right">{shortTitle}</span>
      ) : null}
      {hasPrefix ? <span className="shrink-0 px-1">/</span> : null}
      <span className="shrink-0 normal-case tracking-[0.16em]">{pageNumber}</span>
    </div>
  );
}

function BlankChapterPage({
  onStartNewChapter,
  pageCount,
}: {
  onStartNewChapter: () => void;
  pageCount: number;
}) {
  return (
    <div className={PAGE_WIDTH_CLASS}>
      <div
        className="relative"
        style={{
          height: `${pageCount * PAGE_HEIGHT + Math.max(0, pageCount - 1) * PAGE_GAP}px`,
        }}
      >
        {Array.from({ length: pageCount }).map((_value, index) => {
          const isTrailingBlankPage = index === pageCount - 1;

          return (
            <div
              key={`blank-page-${index}`}
              className="absolute left-0 right-0 overflow-hidden border border-zinc-200 bg-[#fffdf9] shadow-[0_14px_44px_-32px_rgba(24,24,27,0.42)]"
              style={{
                height: `${PAGE_HEIGHT}px`,
                top: `${index * (PAGE_HEIGHT + PAGE_GAP)}px`,
              }}
            >
              {isTrailingBlankPage ? (
                <button
                  type="button"
                  onClick={onStartNewChapter}
                  aria-label="Start a new chapter"
                  className="absolute left-1/2 top-6 z-20 inline-flex -translate-x-1/2 items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-900 shadow-[0_10px_24px_-18px_rgba(24,24,27,0.45)] transition hover:bg-zinc-50"
                >
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-950 text-[0.95rem] leading-none text-white">
                    +
                  </span>
                  <span>Start a New Chapter</span>
                </button>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function getManuscriptPageCount(text: string) {
  const manuscriptPages = paginateManuscriptText(text, CHAPTER_HEADING_RESERVED_LINES);
  return manuscriptPages.length > 0 ? manuscriptPages.length : 1;
}

function PenNameCreateLightbox({
  bookTitle,
  hasSavedPenNames,
  onClose,
  onCreate,
}: {
  bookTitle: string;
  hasSavedPenNames: boolean;
  onClose: () => void;
  onCreate: (penName: string) => Promise<void>;
}) {
  const [penName, setPenName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const penNameInputRef = useRef<HTMLInputElement | null>(null);

  useScrollLock(true);

  useEffect(() => {
    penNameInputRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedPenName = penName.trim();

    if (!normalizedPenName) {
      setError("Enter a pen name first.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await onCreate(normalizedPenName);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to add this pen name.");
    } finally {
      setSaving(false);
    }
  }

  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[80] overflow-y-auto overscroll-contain bg-zinc-950/55 px-4 py-6 backdrop-blur-[8px]">
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />

      <div className="relative z-10 mx-auto w-full max-w-xl rounded-[2rem] border border-zinc-200 bg-white shadow-[0_30px_90px_-45px_rgba(24,24,27,0.55)]">
        <div className="flex items-start justify-between gap-4 border-b border-zinc-200 px-6 py-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">
              Pen Name
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950">
              Add pen name
            </h2>
            <p className="mt-3 text-sm leading-6 text-zinc-600">
              {hasSavedPenNames
                ? `This will be saved to your profile and used by ${bookTitle}. Your profile default will stay the same.`
                : `This will be saved as your profile default and used by ${bookTitle}.`}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-zinc-200 text-lg text-zinc-700 transition hover:bg-zinc-50"
            aria-label="Close pen name dialog"
          >
            x
          </button>
        </div>

        <form onSubmit={(event) => void handleSubmit(event)} className="space-y-5 px-6 py-5">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-zinc-700">Pen name</span>
            <input
              ref={penNameInputRef}
              value={penName}
              onChange={(event) => setPenName(event.target.value)}
              placeholder="Author name, alias, or imprint"
              className="h-12 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-sm text-zinc-950 outline-none transition focus:border-zinc-400"
            />
          </label>

          {error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <div className="flex flex-wrap justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-200 px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex h-11 items-center justify-center rounded-full bg-zinc-950 px-4 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-300"
            >
              {saving ? "Adding..." : "Add pen name"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

function ChapterCreateLightbox({
  initialBookId,
  initialChapterNumber,
  onClose,
  onCreate,
}: {
  initialBookId: string;
  initialChapterNumber: number;
  onClose: () => void;
  onCreate: (values: { chapterNumber: number; title: string }) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [chapterNumber, setChapterNumber] = useState(String(initialChapterNumber));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const titleInputRef = useRef<HTMLInputElement | null>(null);

  useScrollLock(true);

  useEffect(() => {
    titleInputRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedTitle = title.trim();
    const parsedNumber = Number.parseInt(chapterNumber.trim(), 10);

    if (!normalizedTitle) {
      setError("Chapter title is required.");
      return;
    }

    if (!Number.isFinite(parsedNumber) || parsedNumber <= 0) {
      setError("Chapter number must be a positive number.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await onCreate({
        chapterNumber: parsedNumber,
        title: normalizedTitle,
      });
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to create this chapter.");
    } finally {
      setSaving(false);
    }
  }

  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[80] overflow-y-auto overscroll-contain bg-zinc-950/55 px-4 py-6 backdrop-blur-[8px]">
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />

      <div className="relative z-10 mx-auto w-full max-w-2xl rounded-[2rem] border border-zinc-200 bg-white shadow-[0_30px_90px_-45px_rgba(24,24,27,0.55)]">
        <div className="flex items-start justify-between gap-4 border-b border-zinc-200 px-6 py-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">
              New Chapter
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950">
              Create chapter
            </h2>
            <p className="mt-3 text-sm leading-6 text-zinc-600">
              Chapters can be created out of order. The suggested number starts at{" "}
              {initialChapterNumber}, and you can change it now.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-zinc-200 text-lg text-zinc-700 transition hover:bg-zinc-50"
            aria-label="Close chapter creation dialog"
          >
            x
          </button>
        </div>

        <form onSubmit={(event) => void handleSubmit(event)} className="space-y-5 px-6 py-5">
          <input type="hidden" value={initialBookId} readOnly />

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-zinc-700">Chapter title</span>
            <input
              ref={titleInputRef}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Chapter title"
              className="h-12 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-sm text-zinc-950 outline-none transition focus:border-zinc-400"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-zinc-700">Chapter number</span>
            <input
              value={chapterNumber}
              onChange={(event) => setChapterNumber(event.target.value)}
              inputMode="numeric"
              className="h-12 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-sm text-zinc-950 outline-none transition focus:border-zinc-400"
            />
          </label>

          {error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <div className="flex flex-wrap justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-200 px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex h-11 items-center justify-center rounded-full bg-zinc-950 px-4 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-300"
            >
              {saving ? "Creating..." : "Create chapter"}
            </button>
          </div>
        </form>
      </div>
    </div>
  , document.body);
}

function StateCard({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "error";
}) {
  return (
    <section
      className={`rounded-3xl border p-6 text-sm leading-6 ${
        tone === "error"
          ? "border-red-200 bg-red-50 text-red-700"
          : "border-zinc-300 bg-zinc-50 text-zinc-600"
      }`}
    >
      {children}
    </section>
  );
}

function SearchIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      className="h-4 w-4 shrink-0 text-zinc-400"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="7" cy="7" r="4.5" />
      <path d="m10.5 10.5 2.8 2.8" />
    </svg>
  );
}

function SettingsGearIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="currentColor"
      fillRule="evenodd"
      clipRule="evenodd"
    >
      <path d="M10.2 2.5a.75.75 0 0 1 .75-.75h2.1a.75.75 0 0 1 .75.75v1.03c.62.15 1.22.4 1.77.73l.9-.52a.75.75 0 0 1 .97.15l1.49 1.49a.75.75 0 0 1 .15.97l-.52.9c.33.55.58 1.15.73 1.77h1.03a.75.75 0 0 1 .75.75v2.1a.75.75 0 0 1-.75.75h-1.03c-.15.62-.4 1.22-.73 1.77l.52.9a.75.75 0 0 1-.15.97l-1.49 1.49a.75.75 0 0 1-.97.15l-.9-.52c-.55.33-1.15.58-1.77.73v1.03a.75.75 0 0 1-.75.75h-2.1a.75.75 0 0 1-.75-.75v-1.03c-.62-.15-1.22-.4-1.77-.73l-.9.52a.75.75 0 0 1-.97-.15l-1.49-1.49a.75.75 0 0 1-.15-.97l.52-.9c-.33-.55-.58-1.15-.73-1.77H2.5a.75.75 0 0 1-.75-.75v-2.1a.75.75 0 0 1 .75-.75h1.03c.15-.62.4-1.22.73-1.77l-.52-.9a.75.75 0 0 1 .15-.97l1.49-1.49a.75.75 0 0 1 .97-.15l.9.52c.55-.33 1.15-.58 1.77-.73V2.5Zm1.8 14.25a4.25 4.25 0 1 0 0-8.5 4.25 4.25 0 0 0 0 8.5Z" />
    </svg>
  );
}

type ManuscriptLine = {
  text: string;
  isParagraphStart: boolean;
  isChapterOpeningParagraph: boolean;
  startIndex: number;
  endIndex: number;
};

type ManuscriptPage = {
  lines: ManuscriptLine[];
};

type ManuscriptCaretGeometry = {
  height: number;
  left: number;
  pageIndex: number;
  top: number;
};

let manuscriptMeasureContext: CanvasRenderingContext2D | null = null;
let manuscriptParagraphIndentPrefix: string | null = null;

function paginateManuscriptText(
  text: string,
  firstPageReservedLines = 0
): ManuscriptPage[] {
  const lines = layoutManuscriptLines(text);

  if (lines.length === 0) {
    return [];
  }

  const pages: ManuscriptPage[] = [];
  const firstPageCapacity = Math.max(1, PAGE_LINES_PER_PAGE - Math.max(0, firstPageReservedLines));

  pages.push({
    lines: lines.slice(0, firstPageCapacity),
  });

  for (let index = firstPageCapacity; index < lines.length; index += PAGE_LINES_PER_PAGE) {
    pages.push({
      lines: lines.slice(index, index + PAGE_LINES_PER_PAGE),
    });
  }

  return pages;
}

function getManuscriptCaretGeometry(
  pages: ManuscriptPage[],
  selectionIndex: number
): ManuscriptCaretGeometry {
  const normalizedSelectionIndex = Math.max(0, selectionIndex);

  if (pages.length === 0) {
    return {
      height: PAGE_LINE_HEIGHT,
      left: PAGE_MARGIN_X,
      pageIndex: 0,
      top: PAGE_MARGIN_Y + PAGE_LINE_HEIGHT * CHAPTER_HEADING_RESERVED_LINES,
    };
  }

  const fallbackPageIndex = pages.length - 1;
  const fallbackPage = pages[fallbackPageIndex];
  const fallbackPageTop =
    fallbackPageIndex === 0
      ? PAGE_MARGIN_Y + PAGE_LINE_HEIGHT * CHAPTER_HEADING_RESERVED_LINES
      : PAGE_MARGIN_Y;
  const fallbackLineIndex = Math.max(0, fallbackPage.lines.length - 1);
  const fallbackLine = fallbackPage.lines[fallbackLineIndex];

  if (!fallbackLine) {
    return {
      height: PAGE_LINE_HEIGHT,
      left: PAGE_MARGIN_X,
      pageIndex: 0,
      top: PAGE_MARGIN_Y + PAGE_LINE_HEIGHT * CHAPTER_HEADING_RESERVED_LINES,
    };
  }

  for (let pageIndex = 0; pageIndex < pages.length; pageIndex += 1) {
    const page = pages[pageIndex];
    const pageTop =
      pageIndex === 0
        ? PAGE_MARGIN_Y + PAGE_LINE_HEIGHT * CHAPTER_HEADING_RESERVED_LINES
        : PAGE_MARGIN_Y;

    for (let lineIndex = 0; lineIndex < page.lines.length; lineIndex += 1) {
      const line = page.lines[lineIndex];
      const lineEndIndex = Math.max(line.startIndex, line.endIndex);

      if (normalizedSelectionIndex > lineEndIndex) {
        continue;
      }

      const isIndentedParagraph =
        line.isParagraphStart &&
        !line.isChapterOpeningParagraph &&
        !/^\s/.test(line.text);
      const localOffset = Math.max(
        0,
        Math.min(normalizedSelectionIndex - line.startIndex, line.text.length)
      );
      const prefixWidth = measureManuscriptText(line.text.slice(0, localOffset));

      return {
        height: PAGE_LINE_HEIGHT,
        left: PAGE_MARGIN_X + (isIndentedParagraph ? PAGE_PARAGRAPH_INDENT : 0) + prefixWidth,
        pageIndex,
        top: pageTop + lineIndex * PAGE_LINE_HEIGHT,
      };
    }
  }

  const isIndentedParagraph =
    fallbackLine.isParagraphStart &&
    !fallbackLine.isChapterOpeningParagraph &&
    !/^\s/.test(fallbackLine.text);

  return {
    height: PAGE_LINE_HEIGHT,
    left:
      PAGE_MARGIN_X +
      (isIndentedParagraph ? PAGE_PARAGRAPH_INDENT : 0) +
      measureManuscriptText(fallbackLine.text),
    pageIndex: fallbackPageIndex,
    top: fallbackPageTop + fallbackLineIndex * PAGE_LINE_HEIGHT,
  };
}

function layoutManuscriptLines(text: string): ManuscriptLine[] {
  const normalizedText = text.replace(/\r\n?/g, "\n");

  if (!normalizedText) {
    return [];
  }

  if (/^\n+$/.test(normalizedText)) {
    return Array.from({ length: normalizedText.length }, (_value, index) => ({
      text: "",
      isParagraphStart: true,
      isChapterOpeningParagraph: false,
      startIndex: index,
      endIndex: index,
    }));
  }

  const lines: ManuscriptLine[] = [];

  const paragraphs = normalizedText.split("\n");
  const firstContentParagraphIndex = paragraphs.findIndex((paragraph) => paragraph.trim().length > 0);
  let paragraphStartIndex = 0;

  for (let index = 0; index < paragraphs.length; index += 1) {
    const paragraph = paragraphs[index] ?? "";
    lines.push(
      ...wrapParagraphLines(
        paragraph,
        paragraphStartIndex,
        index === firstContentParagraphIndex
      )
    );

    paragraphStartIndex += paragraph.length;

    if (index < paragraphs.length - 1) {
      paragraphStartIndex += 1;
    }
  }

  return lines;
}

function wrapParagraphLines(
  paragraph: string,
  paragraphStartIndex: number,
  isChapterOpeningParagraph: boolean
): ManuscriptLine[] {
  if (!paragraph.trim()) {
    return [
      {
        text: "",
        isParagraphStart: true,
        isChapterOpeningParagraph,
        startIndex: paragraphStartIndex,
        endIndex: paragraphStartIndex,
      },
    ];
  }

  const leadingWhitespace = paragraph.match(/^\s+/)?.[0] ?? "";
  const paragraphBody = paragraph.slice(leadingWhitespace.length);
  const words = Array.from(paragraphBody.matchAll(/\S+\s*/g));
  const lines: ManuscriptLine[] = [];
  let currentLine = leadingWhitespace;
  let currentLineHasBody = false;
  let currentLineIsParagraphStart = true;
  let currentLineStartIndex = paragraphStartIndex;
  let currentLineEndIndex = paragraphStartIndex + leadingWhitespace.length;
  const paragraphIndentWidth =
    leadingWhitespace.length > 0 || isChapterOpeningParagraph ? 0 : PAGE_PARAGRAPH_INDENT;

  const emitCurrentLine = () => {
    if (!currentLine) {
      return;
    }

    lines.push({
      text: currentLine,
      isParagraphStart: currentLineIsParagraphStart,
      isChapterOpeningParagraph,
      startIndex: currentLineStartIndex,
      endIndex: currentLineEndIndex,
    });
    currentLine = "";
    currentLineHasBody = false;
    currentLineIsParagraphStart = false;
  };

  const currentLineWidth = () =>
    Math.max(
      1,
      currentLineIsParagraphStart ? PAGE_CONTENT_WIDTH - paragraphIndentWidth : PAGE_CONTENT_WIDTH
    );

  for (const wordMatch of words) {
    const word = wordMatch[0];
    const wordStartIndex = (wordMatch.index ?? 0) + paragraphStartIndex + leadingWhitespace.length;
    const wordEndIndex = wordStartIndex + word.length;

    if (!currentLineHasBody) {
      currentLine += word;
      currentLineHasBody = true;
      currentLineStartIndex = paragraphStartIndex;
      currentLineEndIndex = wordEndIndex;

      if (measureManuscriptText(currentLine) <= currentLineWidth()) {
        continue;
      }

      const brokenPieces = splitTextToFitWidth(
        currentLine,
        currentLineStartIndex === paragraphStartIndex,
        paragraphIndentWidth
      );
      let pieceOffset = 0;

      brokenPieces.forEach((piece, pieceIndex) => {
        const pieceStartIndex = currentLineStartIndex + pieceOffset;
        const pieceEndIndex = pieceStartIndex + piece.length;
        lines.push({
          text: piece,
          isParagraphStart: pieceIndex === 0 && currentLineIsParagraphStart,
          isChapterOpeningParagraph,
          startIndex: pieceStartIndex,
          endIndex: pieceEndIndex,
        });
        pieceOffset += piece.length;
      });

      currentLine = "";
      currentLineHasBody = false;
      currentLineIsParagraphStart = false;
      continue;
    }

    const candidate = `${currentLine}${word}`;

    if (measureManuscriptText(candidate) <= currentLineWidth()) {
      currentLine = candidate;
      currentLineEndIndex = wordEndIndex;
      continue;
    }

    emitCurrentLine();
    currentLine = word;
    currentLineHasBody = true;
    currentLineIsParagraphStart = false;
    currentLineStartIndex = wordStartIndex;
    currentLineEndIndex = wordEndIndex;

    if (measureManuscriptText(currentLine) <= currentLineWidth()) {
      continue;
    }

    const brokenPieces = splitTextToFitWidth(currentLine, false, 0);
    let pieceOffset = 0;

    brokenPieces.forEach((piece) => {
      const pieceStartIndex = currentLineStartIndex + pieceOffset;
      const pieceEndIndex = pieceStartIndex + piece.length;
      lines.push({
        text: piece,
        isParagraphStart: false,
        isChapterOpeningParagraph,
        startIndex: pieceStartIndex,
        endIndex: pieceEndIndex,
      });
      pieceOffset += piece.length;
    });
    currentLine = "";
  }

  emitCurrentLine();

  return lines;
}

function splitTextToFitWidth(
  text: string,
  isParagraphStart: boolean,
  paragraphIndentWidth = PAGE_PARAGRAPH_INDENT
): string[] {
  const characters = Array.from(text);
  const pieces: string[] = [];
  let remainingCharacters = characters;
  let isFirstPiece = isParagraphStart;

  while (remainingCharacters.length > 0) {
    const maxWidth = Math.max(
      1,
      isFirstPiece ? PAGE_CONTENT_WIDTH - paragraphIndentWidth : PAGE_CONTENT_WIDTH
    );
    const pieceLength = fitCharacterCount(remainingCharacters, maxWidth);

    if (pieceLength <= 0) {
      pieces.push(remainingCharacters[0]);
      remainingCharacters = remainingCharacters.slice(1);
      isFirstPiece = false;
      continue;
    }

    pieces.push(remainingCharacters.slice(0, pieceLength).join(""));
    remainingCharacters = remainingCharacters.slice(pieceLength);
    isFirstPiece = false;
  }

  return pieces;
}

function fitCharacterCount(characters: string[], maxWidth: number) {
  let low = 1;
  let high = characters.length;
  let best = 0;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const candidate = characters.slice(0, mid).join("");
    const width = measureManuscriptText(candidate);

    if (width <= maxWidth) {
      best = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  return best;
}

function measureManuscriptText(text: string) {
  const context = getManuscriptMeasureContext();

  if (!context) {
    return text.length * PAGE_FONT_SIZE * 0.58;
  }

  context.font = `${PAGE_FONT_SIZE}px ${PAGE_FONT_FAMILY}`;
  return context.measureText(text).width;
}

function getManuscriptMeasureContext() {
  if (typeof document === "undefined") {
    return null;
  }

  if (!manuscriptMeasureContext) {
    const canvas = document.createElement("canvas");
    manuscriptMeasureContext = canvas.getContext("2d");
  }

  return manuscriptMeasureContext;
}

function getManuscriptParagraphIndentPrefix() {
  if (manuscriptParagraphIndentPrefix !== null) {
    return manuscriptParagraphIndentPrefix;
  }

  const spaceWidth = Math.max(1, measureManuscriptText(" "));
  const spaceCount = Math.max(1, Math.round(PAGE_PARAGRAPH_INDENT / spaceWidth));
  manuscriptParagraphIndentPrefix = " ".repeat(spaceCount);
  return manuscriptParagraphIndentPrefix;
}

function shouldSuppressSentenceSpaceInsertion(value: string, selectionStart: number) {
  if (selectionStart <= 0) {
    return false;
  }

  const beforeCursor = value.slice(0, selectionStart);

  if (!/\s$/.test(beforeCursor)) {
    return false;
  }

  const trimmedBeforeCursor = beforeCursor.replace(/\s+$/, "");

  if (!trimmedBeforeCursor) {
    return false;
  }

  return /[.?!][)"'\]]*$/.test(trimmedBeforeCursor);
}

function getChaptersForBook(chapters: Chapter[], bookId: string | null) {
  if (!bookId) {
    return [];
  }

  return chapters
    .filter((chapter) => chapter.bookId === bookId)
    .slice()
    .sort(compareChapters);
}

function getSuggestedChapterNumber(chapters: Chapter[], chapter: Chapter | null) {
  if (chapter && typeof chapter.chapterNumber === "number") {
    return chapter.chapterNumber + 1;
  }

  const highestChapterNumber = chapters.reduce((highest, candidate) => {
    if (typeof candidate.chapterNumber !== "number") {
      return highest;
    }

    return Math.max(highest, candidate.chapterNumber);
  }, 0);

  return highestChapterNumber > 0 ? highestChapterNumber + 1 : 1;
}

function compareChapters(left: Chapter, right: Chapter) {
  if (typeof left.chapterNumber === "number" && typeof right.chapterNumber === "number") {
    if (left.chapterNumber !== right.chapterNumber) {
      return left.chapterNumber - right.chapterNumber;
    }
  } else if (typeof left.chapterNumber === "number") {
    return -1;
  } else if (typeof right.chapterNumber === "number") {
    return 1;
  }

  return left.title.localeCompare(right.title);
}
