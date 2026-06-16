import { describe, expect, it } from "vitest";

import type { Book } from "../../types/book";
import type { Chapter } from "../../types/chapter";
import {
  buildManuscriptBookSections,
  formatManuscriptChapterTitle,
  formatManuscriptHeaderTitle,
  formatManuscriptRunningHeader,
  getManuscriptRecordId,
  pruneManuscriptChapterSelections,
  toggleManuscriptBookId,
  toggleManuscriptChapterId,
} from "./workspace";

function buildBook(overrides: Partial<Book> = {}): Book {
  return {
    id: "book_a",
    projectId: "project_a",
    title: "Book A",
    slug: "book-a",
    penName: null,
    summary: "",
    description: "",
    status: "planning",
    tags: [],
    isArchived: false,
    canonLevel: "working",
    confidence: "medium",
    seriesOrder: 1,
    internalChronologyStart: null,
    internalChronologyEnd: null,
    premise: "",
    draftStage: "outline",
    wordCountTarget: null,
    wordCountCurrent: 0,
    primaryThemes: [],
    mainCharacters: [],
    keyLocations: [],
    relatedPlotThreads: [],
    chapterIds: [],
    sceneIds: [],
    timelineEventIds: [],
    publicWikiSummary: "",
    createdAt: null as never,
    updatedAt: null as never,
    ...overrides,
  };
}

function buildChapter(overrides: Partial<Chapter> = {}): Chapter {
  return {
    id: "chapter_1",
    projectId: "project_a",
    title: "Opening",
    slug: "opening",
    summary: "",
    description: "",
    status: "drafting",
    tags: [],
    isArchived: false,
    canonLevel: "working",
    confidence: "medium",
    draftText: "",
    draftAttachmentId: null,
    bookId: "book_a",
    chapterNumber: 1,
    purpose: "",
    pointOfViewCharacterId: null,
    timelineEventIds: [],
    sceneIds: [],
    locationIds: [],
    characterIds: [],
    plotThreadIds: [],
    foreshadows: [],
    payoffs: [],
    createdAt: null as never,
    updatedAt: null as never,
    ...overrides,
  };
}

describe("manuscript workspace helpers", () => {
  it("formats chapter titles with optional names", () => {
    expect(formatManuscriptChapterTitle(1, "")).toBe("Chapter 1");
    expect(formatManuscriptChapterTitle(2, "A Name")).toBe("Chapter 2: A Name");
  });

  it("formats manuscript running headers from profile, book, and page number", () => {
    expect(formatManuscriptHeaderTitle("My Book Title")).toBe("MY BOOK TITLE");
    expect(formatManuscriptRunningHeader("Smith", "My Book Title", 12)).toBe(
      "Smith / MY BOOK TITLE / 12"
    );
    expect(formatManuscriptRunningHeader(null, "My Book Title", 12)).toBe("MY BOOK TITLE / 12");
  });

  it("returns no sections when no books are selected", () => {
    const sections = buildManuscriptBookSections({
      books: [buildBook()],
      chapters: [buildChapter()],
      manuscriptRecords: [],
      selectedBookId: null,
      selectedChapterIdsByBook: {},
    });

    expect(sections).toEqual([]);
  });

  it("builds dense chapter slots through the highest existing chapter", () => {
    const sections = buildManuscriptBookSections({
      books: [buildBook()],
      chapters: [
        buildChapter({ id: "chapter_1", chapterNumber: 1, title: "Start" }),
        buildChapter({ id: "chapter_5", chapterNumber: 5, title: "Midpoint" }),
        buildChapter({ id: "chapter_98", chapterNumber: 98, title: "Endgame" }),
      ],
      manuscriptRecords: [
        {
          id: getManuscriptRecordId("book_a", 5),
          bookId: "book_a",
          chapterNumber: 5,
          chapterId: "chapter_5",
          chapterTitle: "Chapter 5: Midpoint",
          bodyText: "Draft text",
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      ],
      selectedBookId: "book_a",
      selectedChapterIdsByBook: {},
    });

    expect(sections).toHaveLength(1);
    expect(sections[0]?.chapterSlots).toHaveLength(98);
    expect(sections[0]?.chapterSlots[0]).toMatchObject({
      chapterNumber: 1,
      chapterTitle: "Chapter 1: Start",
      isExistingChapter: true,
      isEditable: true,
    });
    expect(sections[0]?.chapterSlots[1]).toMatchObject({
      chapterNumber: 2,
      chapterTitle: "Chapter 2",
      isExistingChapter: false,
      isEditable: true,
    });
    expect(sections[0]?.chapterSlots[4]).toMatchObject({
      chapterNumber: 5,
      chapterTitle: "Chapter 5: Midpoint",
      isExistingChapter: true,
      bodyText: "Draft text",
    });
    expect(sections[0]?.chapterSlots[97]).toMatchObject({
      chapterNumber: 98,
      chapterTitle: "Chapter 98: Endgame",
      isExistingChapter: true,
    });
  });

  it("filters chapters within a selected book and keeps blank slots editable", () => {
    const sections = buildManuscriptBookSections({
      books: [buildBook()],
      chapters: [
        buildChapter({ id: "chapter_1", chapterNumber: 1, title: "Start" }),
        buildChapter({ id: "chapter_2", chapterNumber: 2, title: "Middle" }),
        buildChapter({ id: "chapter_4", chapterNumber: 4, title: "Finish" }),
      ],
      manuscriptRecords: [],
      selectedBookId: "book_a",
      selectedChapterIdsByBook: { book_a: ["chapter_2"] },
    });

    expect(sections[0]?.chapterSlots[0]).toMatchObject({
      chapterNumber: 1,
      isExistingChapter: true,
      isEditable: false,
      isFilteredOut: true,
    });
    expect(sections[0]?.chapterSlots[1]).toMatchObject({
      chapterNumber: 2,
      isExistingChapter: true,
      isEditable: true,
      isFilteredOut: false,
    });
    expect(sections[0]?.chapterSlots[2]).toMatchObject({
      chapterNumber: 3,
      isExistingChapter: false,
      isEditable: true,
      isFilteredOut: false,
    });
    expect(sections[0]?.chapterSlots[3]).toMatchObject({
      chapterNumber: 4,
      isExistingChapter: true,
      isEditable: false,
      isFilteredOut: true,
    });
  });

  it("keeps chapter selection limited to the selected book", () => {
    const sections = buildManuscriptBookSections({
      books: [buildBook(), buildBook({ id: "book_b", title: "Book B" })],
      chapters: [
        buildChapter({ id: "chapter_1", chapterNumber: 1, title: "Book A One" }),
        buildChapter({
          id: "chapter_b1",
          bookId: "book_b",
          chapterNumber: 1,
          title: "Book B One",
        }),
        buildChapter({
          id: "chapter_b2",
          bookId: "book_b",
          chapterNumber: 2,
          title: "Book B Two",
        }),
      ],
      manuscriptRecords: [],
      selectedBookId: "book_b",
      selectedChapterIdsByBook: { book_a: ["chapter_1"] },
    });

    expect(sections).toHaveLength(1);
    expect(sections[0]?.book.id).toBe("book_b");
    expect(sections[0]?.chapterSlots[0]).toMatchObject({
      chapterNumber: 1,
      isEditable: true,
      isFilteredOut: false,
    });
    expect(sections[0]?.chapterSlots[1]).toMatchObject({
      chapterNumber: 2,
      isEditable: true,
      isFilteredOut: false,
    });
  });

  it("marks selected chapter ids as editable and prunes removed books", () => {
    const selectedBookId = toggleManuscriptBookId(null, "book_a");
    const chapterSelections = toggleManuscriptChapterId({}, "book_a", "chapter_1");
    const pruned = pruneManuscriptChapterSelections(selectedBookId, chapterSelections);

    expect(selectedBookId).toBe("book_a");
    expect(chapterSelections).toEqual({ book_a: ["chapter_1"] });
    expect(pruned).toEqual({ book_a: ["chapter_1"] });
  });
});
