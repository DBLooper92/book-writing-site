"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import {
  TIMELINE_BOOKMARK_COLLECTION_UNCATEGORIZED_ID,
  formatTimelineBookmarkCollectionSummary,
  type TimelineBookmarkCollection,
} from "@/lib/timeline/bookmark-collections";
import {
  TIMELINE_ENTITY_EDITOR_CONFIG,
  TIMELINE_ENTITY_EDITOR_ORDER,
  type TimelineEntitySliceType,
} from "@/lib/timeline/entity-editor";
import type { TimelineReferenceOption } from "@/lib/timeline/references";
import type { TimelineWorkspaceFilters } from "@/lib/timeline/workspace";
import { TIMELINE_WORKSPACE_STATUS_OPTIONS, TIMELINE_WORKSPACE_TYPE_OPTIONS } from "@/lib/timeline/workspace";

export type TimelineWorkspaceViewMode = "timeline" | "scroll";

type TimelineWorkspaceControlsProps = {
  bookOptions: TimelineReferenceOption[];
  chapterBookIdById: ReadonlyMap<string, string | null>;
  chapterOptions: TimelineReferenceOption[];
  chronologyRange: string;
  createHref: string;
  bookmarkCollections: TimelineBookmarkCollection[];
  filters: TimelineWorkspaceFilters;
  hasActiveFilters: boolean;
  optionsError: string | null;
  optionsLoading: boolean;
  collapsed: boolean;
  forceExpanded?: boolean;
  splitLayout?: boolean;
  showCollapsedHint: boolean;
  pinned: boolean;
  totalCount: number;
  visibleCount: number;
  viewMode: TimelineWorkspaceViewMode;
  onChange: (updates: Partial<TimelineWorkspaceFilters>) => void;
  onOpenEntityEditor: (sliceType: TimelineEntitySliceType) => void;
  onReset: () => void;
  onToggleCollapsed: () => void;
  onTogglePinned: () => void;
  onViewModeChange: (viewMode: TimelineWorkspaceViewMode) => void;
};

type OpenPicker = "books" | "chapters" | "bookmarks" | null;

export function TimelineWorkspaceControls({
  bookOptions,
  chapterBookIdById,
  chapterOptions,
  chronologyRange,
  createHref,
  bookmarkCollections,
  filters,
  hasActiveFilters,
  optionsError,
  optionsLoading,
  collapsed,
  forceExpanded = false,
  splitLayout = false,
  showCollapsedHint,
  pinned,
  totalCount,
  visibleCount,
  viewMode,
  onChange,
  onOpenEntityEditor,
  onReset,
  onToggleCollapsed,
  onTogglePinned,
  onViewModeChange,
}: TimelineWorkspaceControlsProps) {
  const controlsRef = useRef<HTMLDivElement | null>(null);
  const entityMenuButtonRef = useRef<HTMLButtonElement | null>(null);
  const entityMenuRef = useRef<HTMLDivElement | null>(null);
  const entityMenuCloseTimeoutRef = useRef<number | null>(null);
  const [openPicker, setOpenPicker] = useState<OpenPicker>(null);
  const [entityMenuOpen, setEntityMenuOpen] = useState(false);
  const visibleChapterOptions = useMemo(
    () => filterChapterOptionsBySelectedBooks(chapterOptions, chapterBookIdById, filters.bookIds),
    [chapterBookIdById, chapterOptions, filters.bookIds]
  );
  const bookmarkFilterSummary = useMemo(
    () =>
      filters.bookmarked
        ? formatTimelineBookmarkCollectionSummary(
            filters.bookmarkCollectionIds,
            bookmarkCollections
          )
        : "All bookmarks",
    [bookmarkCollections, filters.bookmarkCollectionIds, filters.bookmarked]
  );

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

      if (controlsRef.current?.contains(target)) {
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

  useEffect(() => {
    if (!entityMenuOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;

      if (!(target instanceof Node)) {
        setEntityMenuOpen(false);
        return;
      }

      if (
        entityMenuRef.current?.contains(target) ||
        entityMenuButtonRef.current?.contains(target) ||
        controlsRef.current?.contains(target)
      ) {
        return;
      }

      setEntityMenuOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setEntityMenuOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [entityMenuOpen]);

  useEffect(() => {
    return () => {
      if (entityMenuCloseTimeoutRef.current !== null) {
        window.clearTimeout(entityMenuCloseTimeoutRef.current);
      }
    };
  }, []);

  function openEntityMenu() {
    if (entityMenuCloseTimeoutRef.current !== null) {
      window.clearTimeout(entityMenuCloseTimeoutRef.current);
      entityMenuCloseTimeoutRef.current = null;
    }

    setEntityMenuOpen(true);
  }

  function closeEntityMenuSoon() {
    if (entityMenuCloseTimeoutRef.current !== null) {
      window.clearTimeout(entityMenuCloseTimeoutRef.current);
    }

    entityMenuCloseTimeoutRef.current = window.setTimeout(() => {
      setEntityMenuOpen(false);
      entityMenuCloseTimeoutRef.current = null;
    }, 300);
  }

  function handleEntityMenuButtonClick() {
    if (entityMenuOpen) {
      setEntityMenuOpen(false);
      return;
    }

    openEntityMenu();
  }

  function handleToggleCollapsed() {
    if (!collapsed) {
      setOpenPicker(null);
      setEntityMenuOpen(false);
    }

    onToggleCollapsed();
  }

  useEffect(() => {
    if (filters.bookIds.length === 0) {
      return;
    }

    const allowedChapterIds = new Set(visibleChapterOptions.map((option) => option.value));
    const nextChapterIds = filters.chapterIds.filter((chapterId) => allowedChapterIds.has(chapterId));

    if (!areStringArraysEqual(nextChapterIds, filters.chapterIds)) {
      onChange({ chapterIds: nextChapterIds });
    }
  }, [filters.bookIds, filters.chapterIds, onChange, visibleChapterOptions]);

  const booksDisabled = optionsLoading || Boolean(optionsError);
  const chaptersDisabled = optionsLoading || Boolean(optionsError);
  const isCollapsed = collapsed && !forceExpanded;

  function renderSplitTopRow() {
    return (
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div
            className="inline-flex rounded-full border border-zinc-200 bg-zinc-100 p-1 shadow-[0_10px_26px_-20px_rgba(24,24,27,0.55)]"
            role="tablist"
            aria-label="Timeline view mode"
          >
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === "timeline"}
              onClick={() => onViewModeChange("timeline")}
              className={`inline-flex h-10 items-center justify-center rounded-full px-4 text-sm font-medium transition ${
                viewMode === "timeline"
                  ? "bg-white text-zinc-950 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-900"
              }`}
            >
              Timeline
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === "scroll"}
              onClick={() => onViewModeChange("scroll")}
              className={`inline-flex h-10 items-center justify-center rounded-full px-4 text-sm font-medium transition ${
                viewMode === "scroll"
                  ? "bg-white text-zinc-950 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-900"
              }`}
            >
              Scroll
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3 lg:flex-nowrap">
          <button
            type="button"
            onClick={onTogglePinned}
            className={`inline-flex h-10 w-10 items-center justify-center rounded-full border transition ${
              pinned
                ? "border-zinc-950 bg-zinc-950 text-white hover:bg-zinc-800"
                : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
            }`}
            aria-label={pinned ? "Unpin filters" : "Pin filters"}
            title={pinned ? "Unpin filters" : "Pin filters"}
          >
            {pinned ? <PinnedIcon /> : <UnpinnedIcon />}
          </button>

          <button
            type="button"
            onClick={onReset}
            disabled={!hasActiveFilters}
            className="inline-flex h-10 items-center justify-center rounded-full border border-zinc-200 px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:border-zinc-100 disabled:text-zinc-400"
          >
            Reset filters
          </button>

          <div className="relative" onMouseEnter={openEntityMenu} onMouseLeave={closeEntityMenuSoon}>
            <button
              ref={entityMenuButtonRef}
              type="button"
              onClick={handleEntityMenuButtonClick}
              onFocus={openEntityMenu}
              aria-expanded={entityMenuOpen}
              aria-haspopup="menu"
              className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-900 transition hover:bg-zinc-50"
            >
              Edit Entity
            </button>

            {entityMenuOpen ? (
              <div
                ref={entityMenuRef}
                className="absolute right-0 top-full z-[60] mt-2 max-h-80 w-72 overflow-y-auto overscroll-contain rounded-3xl border border-zinc-200 bg-white p-2 shadow-[0_16px_40px_-24px_rgba(24,24,27,0.5)]"
                role="menu"
                onMouseEnter={openEntityMenu}
                onMouseLeave={closeEntityMenuSoon}
                onPointerDownCapture={(event) => event.stopPropagation()}
                onWheelCapture={(event) => event.stopPropagation()}
              >
                <div className="px-3 py-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                    Entity slices
                  </p>
                </div>

                <div className="space-y-1 pr-1">
                  {TIMELINE_ENTITY_EDITOR_ORDER.map((sliceType) => {
                    const entityConfig = TIMELINE_ENTITY_EDITOR_CONFIG[sliceType];

                    return (
                      <button
                        key={sliceType}
                        type="button"
                        onClick={() => {
                          setEntityMenuOpen(false);
                          onOpenEntityEditor(sliceType);
                        }}
                        className="flex w-full items-center justify-between rounded-2xl px-3 py-2 text-left text-sm text-zinc-700 transition hover:bg-zinc-50 hover:text-zinc-950"
                        role="menuitem"
                      >
                        <span>{entityConfig.title}</span>
                        <span className="text-[11px] uppercase tracking-[0.18em] text-zinc-400">
                          {entityConfig.indexLabel}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>

          <Link
            href={createHref}
            className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-900 transition hover:bg-zinc-50"
          >
            Create Event
          </Link>
        </div>
      </div>
    );
  }

  if (splitLayout) {
    return (
      <section
        ref={controlsRef}
        className="timeline-controls-shell relative z-30 border-b border-zinc-200 bg-white/92 px-4 py-4 backdrop-blur sm:px-6 sm:py-5 xl:px-8"
      >
        <div className="timeline-collapse-notch" aria-hidden="true" />
        {showCollapsedHint && collapsed ? (
          <div className="timeline-collapse-hint" aria-hidden="true">
            <div className="timeline-collapse-hint-bubble">Filters</div>
            <div className="timeline-collapse-hint-pointer" />
          </div>
        ) : null}
        <button
          type="button"
          onClick={handleToggleCollapsed}
          className="timeline-collapse-toggle"
          aria-label={collapsed ? "Expand filters" : "Collapse filters"}
          title={collapsed ? "Expand filters" : "Collapse filters"}
        >
          <span className="sr-only">{collapsed ? "Expand filters" : "Collapse filters"}</span>
          <CollapseChevron collapsed={collapsed} />
        </button>

        {renderSplitTopRow()}

        {!collapsed ? (
          <>
            {optionsError ? (
              <p className="mt-4 rounded-[1.25rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                {optionsError}
              </p>
            ) : null}

            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <div className="xl:col-start-1">
                <ControlShell label="Search">
                  <div className="relative">
                    <input
                      value={filters.search}
                      onChange={(event) => onChange({ search: event.target.value })}
                      placeholder="Search title, summary, IDs, causes..."
                      className="h-11 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 pr-11 text-sm text-zinc-950 outline-none transition focus:border-zinc-400 focus:bg-white"
                    />
                    {filters.search.length > 0 ? (
                      <button
                        type="button"
                        onClick={() => onChange({ search: "" })}
                        className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-zinc-500 shadow-[0_6px_16px_-10px_rgba(24,24,27,0.6)] transition hover:bg-white hover:text-zinc-950 focus:outline-none focus-visible:shadow-[0_6px_16px_-8px_rgba(24,24,27,0.7)]"
                        aria-label="Clear search"
                        title="Clear search"
                      >
                        <ClearIcon />
                      </button>
                    ) : null}
                  </div>
                </ControlShell>
              </div>

              <div className="xl:col-start-2">
                <SelectField
                  label="Event type"
                  value={filters.eventType}
                  options={TIMELINE_WORKSPACE_TYPE_OPTIONS}
                  onChange={(value) => onChange({ eventType: value })}
                />
              </div>

              <div className="xl:col-start-3">
                <SelectField
                  label="Status"
                  value={filters.status}
                  options={TIMELINE_WORKSPACE_STATUS_OPTIONS}
                  onChange={(value) => onChange({ status: value })}
                />
              </div>

              <div className="xl:col-start-1">
                <MultiSelectField
                  label="Books"
                  disabled={booksDisabled}
                  emptyMessage={
                    optionsLoading
                      ? "Loading books..."
                      : optionsError
                        ? "Books are unavailable right now."
                        : "No books are available for this project."
                  }
                  open={openPicker === "books"}
                  options={bookOptions}
                  selectedIds={filters.bookIds}
                  onClear={() => onChange({ bookIds: [], chapterIds: filters.chapterIds })}
                  onToggleOpen={() =>
                    setOpenPicker((current) => (current === "books" ? null : "books"))
                  }
                  onToggleValue={(bookId) => {
                    const nextBookIds = toggleStringValue(filters.bookIds, bookId);
                    const nextChapterIds = pruneChapterIdsForBooks(
                      filters.chapterIds,
                      nextBookIds,
                      chapterOptions,
                      chapterBookIdById
                    );

                    onChange({
                      bookIds: nextBookIds,
                      chapterIds: nextChapterIds,
                    });
                  }}
                  summary={formatSelectionSummary(filters.bookIds, bookOptions, "All books")}
                />
              </div>

              <div className="xl:col-start-2">
                <MultiSelectField
                  label="Chapters"
                  disabled={chaptersDisabled}
                  emptyMessage={
                    optionsLoading
                      ? "Loading chapters..."
                      : optionsError
                        ? "Chapters are unavailable right now."
                        : filters.bookIds.length > 0 && visibleChapterOptions.length === 0
                          ? "No chapters belong to the selected books."
                          : chapterOptions.length === 0
                            ? "No chapters are available for this project."
                            : "No chapters match the current book selection."
                  }
                  open={openPicker === "chapters"}
                  options={visibleChapterOptions}
                  selectedIds={filters.chapterIds}
                  onClear={() => onChange({ chapterIds: [] })}
                  onToggleOpen={() =>
                    setOpenPicker((current) => (current === "chapters" ? null : "chapters"))
                  }
                  onToggleValue={(chapterId) => {
                    onChange({
                      chapterIds: toggleStringValue(filters.chapterIds, chapterId),
                    });
                  }}
                  summary={formatSelectionSummary(
                    filters.chapterIds,
                    visibleChapterOptions,
                    filters.bookIds.length > 0 ? "All chapters in selected books" : "All chapters"
                  )}
                />
              </div>

              <div className="xl:col-start-3">
                <BookmarkFilterField
                  bookmarkCollections={bookmarkCollections}
                  bookmarked={filters.bookmarked}
                  bookmarkCollectionIds={filters.bookmarkCollectionIds}
                  onChange={(updates) => onChange(updates)}
                  open={openPicker === "bookmarks"}
                  onToggleOpen={() =>
                    setOpenPicker((current) => (current === "bookmarks" ? null : "bookmarks"))
                  }
                  summary={bookmarkFilterSummary}
                />
              </div>
            </div>
          </>
        ) : null}
      </section>
    );
  }

  return (
    <section
      ref={controlsRef}
      className={`timeline-controls-shell relative z-30 border-b border-zinc-200 bg-white/92 backdrop-blur ${
        splitLayout ? "px-4 py-4 sm:px-6 sm:py-5 xl:px-8" : "px-4 py-4 sm:px-6 sm:py-5"
      }`}
    >
      {!forceExpanded ? <div className="timeline-collapse-notch" aria-hidden="true" /> : null}
      {showCollapsedHint && !forceExpanded ? (
        <div className="timeline-collapse-hint" aria-hidden="true">
          <div className="timeline-collapse-hint-bubble">Filters</div>
          <div className="timeline-collapse-hint-pointer" />
        </div>
      ) : null}
      {!forceExpanded ? (
        <button
          type="button"
          onClick={handleToggleCollapsed}
          className="timeline-collapse-toggle"
          aria-label={collapsed ? "Expand filters" : "Collapse filters"}
          title={collapsed ? "Expand filters" : "Collapse filters"}
        >
          <span className="sr-only">{collapsed ? "Expand filters" : "Collapse filters"}</span>
          <CollapseChevron collapsed={collapsed} />
        </button>
      ) : null}

      {isCollapsed ? (
        <div className="mt-[0.4rem] grid gap-x-5 gap-y-2 lg:mt-[0.5rem] lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:grid-rows-[auto_auto] lg:items-center lg:gap-x-8 lg:gap-y-2">
          <div className="min-w-0 max-w-[33rem] lg:col-start-1 lg:row-start-1">
            <div className="relative">
              <input
                value={filters.search}
                onChange={(event) => onChange({ search: event.target.value })}
                placeholder="Search title, summary, IDs, causes..."
                className="h-11 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 pr-11 text-sm text-zinc-950 outline-none transition focus:border-zinc-400 focus:bg-white"
              />
                {filters.search.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => onChange({ search: "" })}
                    className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-zinc-500 shadow-[0_6px_16px_-10px_rgba(24,24,27,0.6)] transition hover:bg-white hover:text-zinc-950 focus:outline-none focus-visible:shadow-[0_6px_16px_-8px_rgba(24,24,27,0.7)]"
                    aria-label="Clear search"
                  title="Clear search"
                  >
                    <ClearIcon />
                  </button>
                ) : null}
            </div>
          </div>

          <div className="flex items-center justify-center lg:col-start-2 lg:row-start-1">
            <div
              className="inline-flex rounded-full border border-zinc-200 bg-zinc-100 p-1 shadow-[0_10px_26px_-20px_rgba(24,24,27,0.55)]"
              role="tablist"
              aria-label="Timeline view mode"
            >
              <button
                type="button"
                role="tab"
                aria-selected={viewMode === "timeline"}
                onClick={() => onViewModeChange("timeline")}
                className={`inline-flex h-10 items-center justify-center rounded-full px-4 text-sm font-medium transition ${
                  viewMode === "timeline"
                    ? "bg-white text-zinc-950 shadow-sm"
                    : "text-zinc-500 hover:text-zinc-900"
                }`}
              >
                Timeline
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={viewMode === "scroll"}
                onClick={() => onViewModeChange("scroll")}
                className={`inline-flex h-10 items-center justify-center rounded-full px-4 text-sm font-medium transition ${
                  viewMode === "scroll"
                    ? "bg-white text-zinc-950 shadow-sm"
                    : "text-zinc-500 hover:text-zinc-900"
                }`}
              >
                Scroll
              </button>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 lg:col-start-3 lg:row-start-1 lg:flex-nowrap lg:justify-self-end">
            <button
              type="button"
              onClick={onTogglePinned}
              className={`inline-flex h-10 w-10 items-center justify-center rounded-full border transition ${
                pinned
                  ? "border-zinc-950 bg-zinc-950 text-white hover:bg-zinc-800"
                  : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
              }`}
              aria-label={pinned ? "Unpin filters" : "Pin filters"}
              title={pinned ? "Unpin filters" : "Pin filters"}
            >
              {pinned ? <PinnedIcon /> : <UnpinnedIcon />}
            </button>

            <div
              className="relative"
              onMouseEnter={openEntityMenu}
              onMouseLeave={closeEntityMenuSoon}
            >
              <button
                ref={entityMenuButtonRef}
                type="button"
                onClick={handleEntityMenuButtonClick}
                onFocus={openEntityMenu}
                aria-expanded={entityMenuOpen}
                aria-haspopup="menu"
                className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-900 transition hover:bg-zinc-50"
              >
                Edit Entity
              </button>

              {entityMenuOpen ? (
                  <div
                    ref={entityMenuRef}
                    className="absolute right-0 top-full z-[60] mt-2 max-h-80 w-72 overflow-y-auto overscroll-contain rounded-3xl border border-zinc-200 bg-white p-2 shadow-[0_16px_40px_-24px_rgba(24,24,27,0.5)]"
                    onMouseEnter={openEntityMenu}
                    onMouseLeave={closeEntityMenuSoon}
                    onPointerDownCapture={(event) => event.stopPropagation()}
                    onWheelCapture={(event) => event.stopPropagation()}
                    role="menu"
                  >
                  <div className="px-3 py-2">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                      Entity slices
                    </p>
                  </div>

                  <div className="space-y-1 pr-1">
                    {TIMELINE_ENTITY_EDITOR_ORDER.map((sliceType) => {
                      const entityConfig = TIMELINE_ENTITY_EDITOR_CONFIG[sliceType];

                      return (
                        <button
                          key={sliceType}
                          type="button"
                          onClick={() => onOpenEntityEditor(sliceType)}
                          className="flex w-full items-center justify-between rounded-2xl px-3 py-2 text-left text-sm text-zinc-700 transition hover:bg-zinc-50 hover:text-zinc-950"
                          role="menuitem"
                        >
                          <span>{entityConfig.title}</span>
                          <span className="text-[11px] uppercase tracking-[0.18em] text-zinc-400">
                            {entityConfig.indexLabel}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>

            <Link
              href={createHref}
              className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-900 transition hover:bg-zinc-50"
            >
              Create Event
            </Link>
          </div>
        </div>
      ) : splitLayout ? (
        <>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <div
                className="inline-flex rounded-full border border-zinc-200 bg-zinc-100 p-1 shadow-[0_10px_26px_-20px_rgba(24,24,27,0.55)]"
                role="tablist"
                aria-label="Timeline view mode"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={viewMode === "timeline"}
                  onClick={() => onViewModeChange("timeline")}
                  className={`inline-flex h-10 items-center justify-center rounded-full px-4 text-sm font-medium transition ${
                    viewMode === "timeline"
                      ? "bg-white text-zinc-950 shadow-sm"
                      : "text-zinc-500 hover:text-zinc-900"
                  }`}
                >
                  Timeline
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={viewMode === "scroll"}
                  onClick={() => onViewModeChange("scroll")}
                  className={`inline-flex h-10 items-center justify-center rounded-full px-4 text-sm font-medium transition ${
                    viewMode === "scroll"
                      ? "bg-white text-zinc-950 shadow-sm"
                      : "text-zinc-500 hover:text-zinc-900"
                  }`}
                >
                  Scroll
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3 lg:flex-nowrap">
              <button
                type="button"
                onClick={onTogglePinned}
                className={`inline-flex h-10 w-10 items-center justify-center rounded-full border transition ${
                  pinned
                    ? "border-zinc-950 bg-zinc-950 text-white hover:bg-zinc-800"
                    : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
                }`}
                aria-label={pinned ? "Unpin filters" : "Pin filters"}
                title={pinned ? "Unpin filters" : "Pin filters"}
              >
                {pinned ? <PinnedIcon /> : <UnpinnedIcon />}
              </button>

              <button
                type="button"
                onClick={onReset}
                disabled={!hasActiveFilters}
                className="inline-flex h-10 items-center justify-center rounded-full border border-zinc-200 px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:border-zinc-100 disabled:text-zinc-400"
              >
                Reset filters
              </button>

              <div
                className="relative"
                onMouseEnter={openEntityMenu}
                onMouseLeave={closeEntityMenuSoon}
              >
                <button
                  ref={entityMenuButtonRef}
                  type="button"
                  onClick={handleEntityMenuButtonClick}
                  onFocus={openEntityMenu}
                  aria-expanded={entityMenuOpen}
                  aria-haspopup="menu"
                  className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-900 transition hover:bg-zinc-50"
                >
                  Edit Entity
                </button>

                {entityMenuOpen ? (
                  <div
                    ref={entityMenuRef}
                    className="absolute right-0 top-full z-[60] mt-2 max-h-80 w-72 overflow-y-auto overscroll-contain rounded-3xl border border-zinc-200 bg-white p-2 shadow-[0_16px_40px_-24px_rgba(24,24,27,0.5)]"
                    role="menu"
                    onMouseEnter={openEntityMenu}
                    onMouseLeave={closeEntityMenuSoon}
                    onPointerDownCapture={(event) => event.stopPropagation()}
                    onWheelCapture={(event) => event.stopPropagation()}
                  >
                    <div className="px-3 py-2">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                        Entity slices
                      </p>
                    </div>

                    <div className="space-y-1 pr-1">
                      {TIMELINE_ENTITY_EDITOR_ORDER.map((sliceType) => {
                        const entityConfig = TIMELINE_ENTITY_EDITOR_CONFIG[sliceType];

                        return (
                          <button
                            key={sliceType}
                            type="button"
                            onClick={() => {
                              setEntityMenuOpen(false);
                              onOpenEntityEditor(sliceType);
                            }}
                            className="flex w-full items-center justify-between rounded-2xl px-3 py-2 text-left text-sm text-zinc-700 transition hover:bg-zinc-50 hover:text-zinc-950"
                            role="menuitem"
                          >
                            <span>{entityConfig.title}</span>
                            <span className="text-[11px] uppercase tracking-[0.18em] text-zinc-400">
                              {entityConfig.indexLabel}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </div>

              <Link
                href={createHref}
                className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-900 transition hover:bg-zinc-50"
              >
                Create Event
              </Link>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:items-center">
            <div className="min-w-0">
              <div className="invisible select-none text-sm leading-6 text-zinc-600" aria-hidden="true">
                <div>Showing {visibleCount} of {totalCount} events from the active project.</div>
                <div>Chronology range</div>
                <div>{chronologyRange}</div>
              </div>
            </div>

            <div className="flex items-center justify-start lg:justify-center">
              <div
                className="inline-flex rounded-full border border-zinc-200 bg-zinc-100 p-1 shadow-[0_10px_26px_-20px_rgba(24,24,27,0.55)]"
                role="tablist"
                aria-label="Timeline view mode"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={viewMode === "timeline"}
                  onClick={() => onViewModeChange("timeline")}
                  className={`inline-flex h-10 items-center justify-center rounded-full px-4 text-sm font-medium transition ${
                    viewMode === "timeline"
                      ? "bg-white text-zinc-950 shadow-sm"
                      : "text-zinc-500 hover:text-zinc-900"
                  }`}
                >
                  Timeline
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={viewMode === "scroll"}
                  onClick={() => onViewModeChange("scroll")}
                  className={`inline-flex h-10 items-center justify-center rounded-full px-4 text-sm font-medium transition ${
                    viewMode === "scroll"
                      ? "bg-white text-zinc-950 shadow-sm"
                      : "text-zinc-500 hover:text-zinc-900"
                  }`}
                >
                  Scroll
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 lg:flex-nowrap lg:justify-self-end">
              <button
                type="button"
                onClick={onTogglePinned}
                className={`inline-flex h-10 w-10 items-center justify-center rounded-full border transition ${
                  pinned
                    ? "border-zinc-950 bg-zinc-950 text-white hover:bg-zinc-800"
                    : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
                }`}
                aria-label={pinned ? "Unpin filters" : "Pin filters"}
                title={pinned ? "Unpin filters" : "Pin filters"}
              >
                {pinned ? <PinnedIcon /> : <UnpinnedIcon />}
              </button>

              <button
                type="button"
                onClick={onReset}
                disabled={!hasActiveFilters}
                className="inline-flex h-10 items-center justify-center rounded-full border border-zinc-200 px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:border-zinc-100 disabled:text-zinc-400"
              >
                Reset filters
              </button>

              <div
                className="relative"
                onMouseEnter={openEntityMenu}
                onMouseLeave={closeEntityMenuSoon}
              >
                <button
                  ref={entityMenuButtonRef}
                  type="button"
                  onClick={handleEntityMenuButtonClick}
                  onFocus={openEntityMenu}
                  aria-expanded={entityMenuOpen}
                  aria-haspopup="menu"
                  className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-900 transition hover:bg-zinc-50"
                >
                  Edit Entity
                </button>

                {entityMenuOpen ? (
                  <div
                    ref={entityMenuRef}
                    className="absolute right-0 top-full z-[60] mt-2 max-h-80 w-72 overflow-y-auto overscroll-contain rounded-3xl border border-zinc-200 bg-white p-2 shadow-[0_16px_40px_-24px_rgba(24,24,27,0.5)]"
                    role="menu"
                    onMouseEnter={openEntityMenu}
                    onMouseLeave={closeEntityMenuSoon}
                    onPointerDownCapture={(event) => event.stopPropagation()}
                    onWheelCapture={(event) => event.stopPropagation()}
                  >
                    <div className="px-3 py-2">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                        Entity slices
                      </p>
                    </div>

                    <div className="space-y-1 pr-1">
                      {TIMELINE_ENTITY_EDITOR_ORDER.map((sliceType) => {
                        const entityConfig = TIMELINE_ENTITY_EDITOR_CONFIG[sliceType];

                        return (
                          <button
                            key={sliceType}
                            type="button"
                            onClick={() => {
                              setEntityMenuOpen(false);
                              onOpenEntityEditor(sliceType);
                            }}
                            className="flex w-full items-center justify-between rounded-2xl px-3 py-2 text-left text-sm text-zinc-700 transition hover:bg-zinc-50 hover:text-zinc-950"
                            role="menuitem"
                          >
                            <span>{entityConfig.title}</span>
                            <span className="text-[11px] uppercase tracking-[0.18em] text-zinc-400">
                              {entityConfig.indexLabel}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </div>

              <Link
                href={createHref}
                className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-900 transition hover:bg-zinc-50"
              >
                Create Event
              </Link>
            </div>
          </div>

          {optionsError ? (
            <p className="mt-4 rounded-[1.25rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              {optionsError}
            </p>
          ) : null}

          <div className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <div className="xl:col-span-2">
              <ControlShell label="Search">
                <div className="relative">
                  <input
                    value={filters.search}
                    onChange={(event) => onChange({ search: event.target.value })}
                    placeholder="Search title, summary, IDs, causes..."
                    className="h-11 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 pr-11 text-sm text-zinc-950 outline-none transition focus:border-zinc-400 focus:bg-white"
                  />
                  {filters.search.length > 0 ? (
                    <button
                      type="button"
                      onClick={() => onChange({ search: "" })}
                      className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-zinc-500 shadow-[0_6px_16px_-10px_rgba(24,24,27,0.6)] transition hover:bg-white hover:text-zinc-950 focus:outline-none focus-visible:shadow-[0_6px_16px_-8px_rgba(24,24,27,0.7)]"
                      aria-label="Clear search"
                      title="Clear search"
                    >
                      <ClearIcon />
                    </button>
                  ) : null}
                </div>
              </ControlShell>
            </div>

            <div className="xl:col-span-2">
              <MultiSelectField
                label="Books"
                disabled={booksDisabled}
                emptyMessage={
                  optionsLoading
                    ? "Loading books..."
                    : optionsError
                      ? "Books are unavailable right now."
                      : "No books are available for this project."
                }
                open={openPicker === "books"}
                options={bookOptions}
                selectedIds={filters.bookIds}
                onClear={() => onChange({ bookIds: [], chapterIds: filters.chapterIds })}
                onToggleOpen={() => setOpenPicker((current) => (current === "books" ? null : "books"))}
                onToggleValue={(bookId) => {
                  const nextBookIds = toggleStringValue(filters.bookIds, bookId);
                  const nextChapterIds = pruneChapterIdsForBooks(
                    filters.chapterIds,
                    nextBookIds,
                    chapterOptions,
                    chapterBookIdById
                  );

                  onChange({
                    bookIds: nextBookIds,
                    chapterIds: nextChapterIds,
                  });
                }}
                summary={formatSelectionSummary(filters.bookIds, bookOptions, "All books")}
              />
            </div>

            <div className="xl:col-span-2">
              <MultiSelectField
                label="Chapters"
                disabled={chaptersDisabled}
                emptyMessage={
                  optionsLoading
                    ? "Loading chapters..."
                    : optionsError
                      ? "Chapters are unavailable right now."
                      : filters.bookIds.length > 0 && visibleChapterOptions.length === 0
                        ? "No chapters belong to the selected books."
                        : chapterOptions.length === 0
                          ? "No chapters are available for this project."
                          : "No chapters match the current book selection."
                }
                open={openPicker === "chapters"}
                options={visibleChapterOptions}
                selectedIds={filters.chapterIds}
                onClear={() => onChange({ chapterIds: [] })}
                onToggleOpen={() =>
                  setOpenPicker((current) => (current === "chapters" ? null : "chapters"))
                }
                onToggleValue={(chapterId) => {
                  onChange({
                    chapterIds: toggleStringValue(filters.chapterIds, chapterId),
                  });
                }}
                summary={formatSelectionSummary(
                  filters.chapterIds,
                  visibleChapterOptions,
                  filters.bookIds.length > 0 ? "All chapters in selected books" : "All chapters"
                )}
              />
            </div>

            <div>
              <SelectField
                label="Status"
                value={filters.status}
                options={TIMELINE_WORKSPACE_STATUS_OPTIONS}
                onChange={(value) => onChange({ status: value })}
              />
            </div>

            <div>
              <SelectField
                label="Event type"
                value={filters.eventType}
                options={TIMELINE_WORKSPACE_TYPE_OPTIONS}
                onChange={(value) => onChange({ eventType: value })}
              />
            </div>

            <div className="xl:col-span-1">
              <BookmarkFilterField
                bookmarkCollections={bookmarkCollections}
                bookmarked={filters.bookmarked}
                bookmarkCollectionIds={filters.bookmarkCollectionIds}
                onChange={(updates) => onChange(updates)}
                open={openPicker === "bookmarks"}
                onToggleOpen={() =>
                  setOpenPicker((current) => (current === "bookmarks" ? null : "bookmarks"))
                }
                summary={bookmarkFilterSummary}
              />
            </div>
          </div>
        </>
      )}
    </section>
  );
}

function CollapseChevron({ collapsed }: { collapsed: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      className={`h-4 w-4 shrink-0 transition ${collapsed ? "" : "rotate-180"}`}
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

function MultiSelectField({
  disabled,
  emptyMessage,
  label,
  open,
  options,
  selectedIds,
  onClear,
  onToggleOpen,
  onToggleValue,
  summary,
}: {
  disabled: boolean;
  emptyMessage: string;
  label: string;
  open: boolean;
  options: TimelineReferenceOption[];
  selectedIds: string[];
  onClear: () => void;
  onToggleOpen: () => void;
  onToggleValue: (value: string) => void;
  summary: string;
}) {
  return (
    <ControlShell label={label}>
      <div className="relative">
        <button
          type="button"
          disabled={disabled}
          onClick={onToggleOpen}
          className="flex h-11 w-full items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-zinc-50 px-4 text-left text-sm text-zinc-950 outline-none transition hover:bg-white focus:border-zinc-400 focus:bg-white disabled:cursor-not-allowed disabled:opacity-70"
        >
          <span className="min-w-0 truncate">{summary}</span>
          <ChevronIcon open={open} />
        </button>

        {open ? (
          <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-[60] overflow-hidden rounded-[1.5rem] border border-zinc-200 bg-white shadow-[0_18px_40px_-24px_rgba(24,24,27,0.45)]">
            <div className="flex items-center justify-between gap-3 border-b border-zinc-200 px-4 py-3">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                  {label}
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  {options.length} option{options.length === 1 ? "" : "s"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClear}
                  className="inline-flex h-8 items-center justify-center rounded-full border border-zinc-200 px-3 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={onToggleOpen}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-zinc-200 text-zinc-500 transition hover:bg-zinc-50 hover:text-zinc-950"
                  aria-label={`Close ${label.toLowerCase()} menu`}
                >
                  x
                </button>
              </div>
            </div>

            <div className="max-h-72 overflow-y-auto p-2">
              {options.length === 0 ? (
                <div className="rounded-2xl px-3 py-4 text-sm text-zinc-500">{emptyMessage}</div>
              ) : (
                options.map((option) => {
                  const isSelected = selectedIds.includes(option.value);
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => onToggleValue(option.value)}
                      className={`flex w-full items-start gap-3 rounded-2xl px-3 py-3 text-left transition ${
                        isSelected ? "bg-zinc-950 text-white" : "text-zinc-700 hover:bg-zinc-100"
                      }`}
                    >
                      <SelectionMark checked={isSelected} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{option.label}</span>
                        {option.meta ? (
                          <span className={`mt-1 block truncate text-xs ${
                            isSelected ? "text-white/65" : "text-zinc-500"
                          }`}>
                            {option.meta}
                          </span>
                        ) : null}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        ) : null}
      </div>
    </ControlShell>
  );
}

function BookmarkFilterField({
  bookmarkCollections,
  bookmarked,
  bookmarkCollectionIds,
  onChange,
  open,
  onToggleOpen,
  summary,
}: {
  bookmarkCollections: TimelineBookmarkCollection[];
  bookmarked: boolean;
  bookmarkCollectionIds: string[];
  onChange: (updates: Partial<TimelineWorkspaceFilters>) => void;
  open: boolean;
  onToggleOpen: () => void;
  summary: string;
}) {
  const hasUncategorized = bookmarkCollectionIds.includes(
    TIMELINE_BOOKMARK_COLLECTION_UNCATEGORIZED_ID
  );

  return (
    <ControlShell label="Bookmarks">
      <div className="relative">
        <button
          type="button"
          onClick={onToggleOpen}
          onPointerDownCapture={(event) => event.stopPropagation()}
          className="flex h-11 w-full items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-zinc-50 px-4 text-left text-sm text-zinc-950 outline-none transition hover:bg-white focus:border-zinc-400 focus:bg-white"
        >
          <span className="min-w-0 truncate">{summary}</span>
          <ChevronIcon open={open} />
        </button>

        {open ? (
          <div
            className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-[60] overflow-hidden rounded-[1.5rem] border border-zinc-200 bg-white shadow-[0_18px_40px_-24px_rgba(24,24,27,0.45)]"
            role="menu"
            onPointerDownCapture={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 border-b border-zinc-200 px-4 py-3">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                  Bookmarks
                </p>
                <p className="mt-1 text-sm text-zinc-600">
                  Filter by bookmarked events and one or more collections.
                </p>
              </div>
              <button
                type="button"
                onClick={() => onChange({ bookmarked: false, bookmarkCollectionIds: [] })}
                className="rounded-full border border-zinc-200 px-3 py-2 text-xs font-medium text-zinc-600 transition hover:bg-zinc-50"
              >
                Clear
              </button>
            </div>

            <div className="max-h-72 overflow-y-auto px-2 py-2">
              <button
                type="button"
                onClick={() =>
                  onChange({
                    bookmarked: !bookmarked,
                    bookmarkCollectionIds: !bookmarked ? bookmarkCollectionIds : [],
                  })
                }
                onPointerDownCapture={(event) => event.stopPropagation()}
                className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm text-zinc-700 transition hover:bg-zinc-50"
                role="menuitemcheckbox"
                aria-checked={bookmarked}
              >
                <SelectionMark checked={bookmarked} />
                <span className="min-w-0 truncate font-medium text-zinc-950">
                  Bookmarked only
                </span>
              </button>

              <div className="mx-3 my-2 border-t border-zinc-200" />

              <button
                type="button"
                onClick={() =>
                  onChange({
                    bookmarked: true,
                    bookmarkCollectionIds: toggleSelectedId(
                      bookmarkCollectionIds,
                      TIMELINE_BOOKMARK_COLLECTION_UNCATEGORIZED_ID
                    ),
                  })
                }
                onPointerDownCapture={(event) => event.stopPropagation()}
                className={`flex w-full items-center justify-between gap-3 rounded-2xl px-3 py-3 text-left text-sm transition ${
                  hasUncategorized ? "bg-zinc-50 text-zinc-950" : "text-zinc-700 hover:bg-zinc-50"
                }`}
                role="menuitemcheckbox"
                aria-checked={hasUncategorized}
              >
                <span className="flex min-w-0 items-center gap-3">
                  <SelectionMark checked={hasUncategorized} />
                  <span className="h-3.5 w-3.5 rounded-full border border-zinc-200 bg-amber-400" />
                  <span className="min-w-0 truncate font-medium">Uncategorized</span>
                </span>
              </button>

              {bookmarkCollections.map((collection) => {
                const selected = bookmarkCollectionIds.includes(collection.id);

                return (
                  <button
                    key={collection.id}
                    type="button"
                    onClick={() =>
                      onChange({
                        bookmarked: true,
                        bookmarkCollectionIds: toggleSelectedId(bookmarkCollectionIds, collection.id),
                      })
                    }
                    onPointerDownCapture={(event) => event.stopPropagation()}
                    className={`flex w-full items-center justify-between gap-3 rounded-2xl px-3 py-3 text-left text-sm transition ${
                      selected ? "bg-zinc-50 text-zinc-950" : "text-zinc-700 hover:bg-zinc-50"
                    }`}
                    role="menuitemcheckbox"
                    aria-checked={selected}
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <SelectionMark checked={selected} />
                      <span
                        className="h-3.5 w-3.5 rounded-full border border-zinc-200"
                        style={{ backgroundColor: collection.color }}
                      />
                      <span className="min-w-0 truncate font-medium">{collection.name}</span>
                    </span>
                  </button>
                );
              })}

              {bookmarkCollections.length === 0 ? (
                <div className="px-3 py-3 text-sm leading-6 text-zinc-600">
                  No collections yet. Bookmark an event to create one.
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </ControlShell>
  );
}

function SelectField<Value extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: Value;
  options: ReadonlyArray<{ value: Value; label: string }>;
  onChange: (value: Value) => void;
}) {
  return (
    <ControlShell label={label}>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as Value)}
        className="h-11 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 text-sm text-zinc-950 outline-none transition focus:border-zinc-400 focus:bg-white"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </ControlShell>
  );
}

function ControlShell({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="block">
      <span className="mb-2 block text-sm font-medium text-zinc-700">{label}</span>
      {children}
    </div>
  );
}

function SelectionMark({ checked }: { checked: boolean }) {
  return (
    <span
      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
        checked
          ? "border-white bg-white text-zinc-950"
          : "border-zinc-300 bg-white text-transparent"
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

function PinnedIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M15 4l5 5" />
      <path d="M8 9l7-5 5 5-5 7" />
      <path d="M9 10l5 5" />
      <path d="M6 21l5-5" />
    </svg>
  );
}

function UnpinnedIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M15 4l5 5" />
      <path d="M8 9l7-5 5 5-5 7" />
      <path d="M9 10l5 5" />
      <path d="M6 21l5-5" />
      <path d="M4 4l16 16" />
    </svg>
  );
}

function ClearIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 4l8 8" />
      <path d="M12 4l-8 8" />
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

function formatSelectionSummary(
  selectedIds: string[],
  options: TimelineReferenceOption[],
  emptyLabel: string
) {
  if (selectedIds.length === 0) {
    return emptyLabel;
  }

  const labelsById = new Map(options.map((option) => [option.value, option.label] as const));
  const labels = selectedIds
    .map((id) => labelsById.get(id))
    .filter((label): label is string => typeof label === "string");

  if (labels.length === 0) {
    return `${selectedIds.length} selected`;
  }

  if (labels.length <= 2) {
    return labels.join(", ");
  }

  return `${labels.slice(0, 2).join(", ")} +${labels.length - 2}`;
}

function toggleStringValue(values: string[], value: string) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

function toggleSelectedId(selectedIds: string[], value: string) {
  return selectedIds.includes(value)
    ? selectedIds.filter((selectedId) => selectedId !== value)
    : [...selectedIds, value];
}

function pruneChapterIdsForBooks(
  selectedChapterIds: string[],
  selectedBookIds: string[],
  chapterOptions: TimelineReferenceOption[],
  chapterBookIdById: ReadonlyMap<string, string | null>
) {
  if (selectedBookIds.length === 0) {
    return selectedChapterIds;
  }

  const selectedBookSet = new Set(selectedBookIds);
  const allowedChapterIds = new Set(
    chapterOptions
      .filter((option) => {
        const bookId = chapterBookIdById.get(option.value) ?? null;
        return typeof bookId === "string" && selectedBookSet.has(bookId);
      })
      .map((option) => option.value)
  );

  return selectedChapterIds.filter((chapterId) => allowedChapterIds.has(chapterId));
}

function filterChapterOptionsBySelectedBooks(
  chapterOptions: TimelineReferenceOption[],
  chapterBookIdById: ReadonlyMap<string, string | null>,
  selectedBookIds: string[]
) {
  if (selectedBookIds.length === 0) {
    return chapterOptions;
  }

  const selectedBookSet = new Set(selectedBookIds);

  return chapterOptions.filter((option) => {
    const bookId = chapterBookIdById.get(option.value) ?? null;
    return typeof bookId === "string" && selectedBookSet.has(bookId);
  });
}

function areStringArraysEqual(left: string[], right: string[]) {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((value, index) => value === right[index]);
}
