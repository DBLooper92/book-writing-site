import type { Book } from "@/types/book";
import type { Chapter } from "@/types/chapter";

export type ManuscriptRecord = {
  id: string;
  bookId: string;
  chapterNumber: number;
  chapterId: string | null;
  chapterTitle: string;
  bodyText: string;
  createdAt: string;
  updatedAt: string;
};

export type ManuscriptChapterSlot = {
  chapterId: string | null;
  chapterNumber: number;
  chapterTitle: string;
  bodyText: string;
  isExistingChapter: boolean;
  isEditable: boolean;
  isFilteredOut: boolean;
  manuscriptId: string;
};

export type ManuscriptBookSection = {
  book: Book;
  chapterSlots: ManuscriptChapterSlot[];
};

export type ManuscriptChapterSelections = Record<string, string[]>;

export function getManuscriptRecordId(bookId: string, chapterNumber: number) {
  return `manuscript_${bookId}_${chapterNumber}`;
}

export function formatManuscriptHeaderTitle(bookTitle: string | null | undefined) {
  return normalizeManuscriptHeaderPart(bookTitle).toUpperCase();
}

export function formatManuscriptRunningHeader(
  lastName: string | null | undefined,
  bookTitle: string | null | undefined,
  pageNumber: number
) {
  const normalizedLastName = normalizeManuscriptHeaderPart(lastName);
  const normalizedTitle = formatManuscriptHeaderTitle(bookTitle);
  const normalizedPageNumber =
    Number.isFinite(pageNumber) && pageNumber > 0 ? String(Math.floor(pageNumber)) : "1";

  return [normalizedLastName, normalizedTitle, normalizedPageNumber].filter(Boolean).join(" / ");
}

export function formatManuscriptChapterTitle(chapterNumber: number, chapterName: string) {
  const normalizedName = chapterName.trim();

  if (!normalizedName) {
    return `Chapter ${chapterNumber}`;
  }

  return `Chapter ${chapterNumber}: ${normalizedName}`;
}

export function buildManuscriptBookSections({
  books,
  chapters,
  manuscriptRecords,
  selectedBookId,
  selectedChapterIdsByBook,
}: {
  books: Book[];
  chapters: Chapter[];
  manuscriptRecords: ManuscriptRecord[];
  selectedBookId: string | null;
  selectedChapterIdsByBook: ManuscriptChapterSelections;
}) {
  if (!selectedBookId) {
    return [];
  }

  const booksById = new Map(books.map((book) => [book.id, book] as const));
  const chaptersByBookId = groupChaptersByBook(chapters);
  const manuscriptById = new Map(manuscriptRecords.map((record) => [record.id, record] as const));

  const book = booksById.get(selectedBookId) ?? null;

  if (!book) {
    return [];
  }

  const chapterRows = chaptersByBookId.get(book.id) ?? [];
  const numberedChapterRows = chapterRows.filter(
    (chapter) => typeof chapter.chapterNumber === "number" && chapter.chapterNumber > 0
  );
  const highestChapterNumber = Math.max(
    1,
    numberedChapterRows.reduce((highest, chapter) => Math.max(highest, chapter.chapterNumber ?? 0), 0)
  );
  const visibleChapterIds = new Set(selectedChapterIdsByBook[book.id] ?? []);
  const chapterSelectionEnabled = visibleChapterIds.size > 0;
  const chapterByNumber = new Map(
    numberedChapterRows.map((chapter) => [chapter.chapterNumber as number, chapter] as const)
  );

  const chapterSlots = Array.from({ length: highestChapterNumber }, (_value, index) => {
    const chapterNumber = index + 1;
    const chapter = chapterByNumber.get(chapterNumber) ?? null;
    const manuscriptId = getManuscriptRecordId(book.id, chapterNumber);
    const manuscriptRecord = manuscriptById.get(manuscriptId) ?? null;
    const isExistingChapter = Boolean(chapter);
    const isEditable = !chapterSelectionEnabled || !chapter || visibleChapterIds.has(chapter.id);
    const isFilteredOut = Boolean(chapter) && !isEditable;

    return {
      chapterId: chapter?.id ?? null,
      chapterNumber,
      chapterTitle: chapter
        ? formatManuscriptChapterTitle(chapterNumber, chapter.title)
        : `Chapter ${chapterNumber}`,
      bodyText: manuscriptRecord?.bodyText ?? "",
      isExistingChapter,
      isEditable,
      isFilteredOut,
      manuscriptId,
    } satisfies ManuscriptChapterSlot;
  });

  return [
    {
      book,
      chapterSlots,
    } satisfies ManuscriptBookSection,
  ];
}

export function pruneManuscriptChapterSelections(
  selectedBookId: string | null,
  selectedChapterIdsByBook: ManuscriptChapterSelections
) {
  const nextSelections: ManuscriptChapterSelections = {};

  for (const [bookId, chapterIds] of Object.entries(selectedChapterIdsByBook)) {
    if (bookId !== selectedBookId || chapterIds.length === 0) {
      continue;
    }

    nextSelections[bookId] = [...chapterIds];
  }

  return nextSelections;
}

export function toggleManuscriptBookId(selectedBookId: string | null, bookId: string) {
  return selectedBookId === bookId ? null : bookId;
}

export function toggleManuscriptChapterId(
  selectedChapterIdsByBook: ManuscriptChapterSelections,
  bookId: string,
  chapterId: string
) {
  const current = selectedChapterIdsByBook[bookId] ?? [];
  const next = current.includes(chapterId)
    ? current.filter((selectedChapterId) => selectedChapterId !== chapterId)
    : [...current, chapterId];

  if (next.length === 0) {
    const nextSelections = { ...selectedChapterIdsByBook };
    delete nextSelections[bookId];
    return nextSelections;
  }

  return {
    ...selectedChapterIdsByBook,
    [bookId]: next,
  };
}

export function getManuscriptBookSelectionSummary(selectedBookId: string | null, books: Book[]) {
  if (!selectedBookId) {
    return "No books selected";
  }

  const labelsById = new Map(books.map((book) => [book.id, book.title] as const));
  return labelsById.get(selectedBookId) ?? selectedBookId;
}

export function getManuscriptChapterSelectionSummary(
  selectedBookId: string | null,
  selectedChapterIdsByBook: ManuscriptChapterSelections,
  chapters: Chapter[]
) {
  if (!selectedBookId) {
    return "Select a book first";
  }

  const chapterById = new Map(chapters.map((chapter) => [chapter.id, chapter] as const));
  const selectedChapterIds = selectedChapterIdsByBook[selectedBookId] ?? [];

  if (selectedChapterIds.length === 0) {
    return "All chapters";
  }

  const selectedLabels = selectedChapterIds
    .map((chapterId) => chapterById.get(chapterId))
    .filter((chapter): chapter is Chapter => Boolean(chapter))
    .map((chapter) =>
      typeof chapter.chapterNumber === "number"
        ? formatManuscriptChapterTitle(chapter.chapterNumber, chapter.title)
        : chapter.title
    );

  if (selectedLabels.length === 0) {
    return `${selectedChapterIds.length} selected`;
  }

  return selectedLabels.length <= 2
    ? selectedLabels.join(", ")
    : `${selectedLabels.slice(0, 2).join(", ")} +${selectedLabels.length - 2}`;
}

function groupChaptersByBook(chapters: Chapter[]) {
  const chaptersByBookId = new Map<string, Chapter[]>();

  for (const chapter of chapters) {
    if (!chapter.bookId) {
      continue;
    }

    const current = chaptersByBookId.get(chapter.bookId) ?? [];
    current.push(chapter);
    chaptersByBookId.set(chapter.bookId, current);
  }

  for (const chapterList of chaptersByBookId.values()) {
    chapterList.sort(compareChapters);
  }

  return chaptersByBookId;
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

function normalizeManuscriptHeaderPart(value: string | null | undefined) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}
