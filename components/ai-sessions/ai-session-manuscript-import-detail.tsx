"use client";

import { useEffect, useMemo, useState } from "react";

import { AiSessionDetailSection } from "@/components/ai-sessions/ai-session-detail-section";
import { getBooksForProject } from "@/lib/data/books";
import type { Book } from "@/types/book";
import type {
  ManuscriptImportProposalByType,
  ManuscriptImportProposalType,
  ManuscriptImportWorkflowState,
} from "@/types/ai-manuscript-import";
import type { AiSession } from "@/types/ai-session";

type AiSessionManuscriptImportDetailProps = {
  aiSession: AiSession;
  uid: string;
  projectId: string;
};

type AnyProposal = ManuscriptImportProposalByType<ManuscriptImportProposalType>;

export function AiSessionManuscriptImportDetail({
  aiSession,
  uid,
  projectId,
}: AiSessionManuscriptImportDetailProps) {
  const [workflowState, setWorkflowState] = useState(aiSession.workflowState);
  const [books, setBooks] = useState<Book[]>([]);
  const [booksError, setBooksError] = useState<string | null>(null);
  const [selectedBookFilter, setSelectedBookFilter] = useState<string>("all");
  const [processingBookId, setProcessingBookId] = useState<string | null>(null);
  const [processingError, setProcessingError] = useState<string | null>(null);

  useEffect(() => {
    setWorkflowState(aiSession.workflowState);
  }, [aiSession.workflowState]);

  useEffect(() => {
    let cancelled = false;

    void getBooksForProject(uid, projectId)
      .then((nextBooks) => {
        if (cancelled) {
          return;
        }

        setBooks(nextBooks);
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }

        setBooksError(error instanceof Error ? error.message : "Unable to load books.");
      });

    return () => {
      cancelled = true;
    };
  }, [projectId, uid]);

  const availableBookFilters = useMemo(
    () =>
      workflowState?.books.filter((book) => book.parseStatus === "parsed").map((book) => ({
        importBookId: book.importBookId,
        title: book.title,
      })) ?? [],
    [workflowState]
  );
  const allParsedBooksMapped = useMemo(
    () =>
      workflowState
        ? workflowState.books.every(
            (book) => book.parseStatus !== "parsed" || book.mapping.mappingStatus === "saved"
          )
        : false,
    [workflowState]
  );

  if (!workflowState) {
    return (
      <AiSessionDetailSection title="Manuscript import">
        <p className="text-sm text-zinc-500">No manuscript import workflow state was saved.</p>
      </AiSessionDetailSection>
    );
  }

  async function handleProcessBook(importBookId: string) {
    const currentWorkflowState = workflowState;

    if (!currentWorkflowState) {
      return;
    }

    const selectedBook = currentWorkflowState.books.find(
      (book) => book.importBookId === importBookId
    );

    if (!selectedBook || selectedBook.chunkCount === 0) {
      return;
    }

    setProcessingBookId(importBookId);
    setProcessingError(null);

    try {
      let nextState = currentWorkflowState;

      for (let index = 0; index < selectedBook.chunkCount + 2; index += 1) {
        const response = await fetch(
          `/api/ai-sessions/${aiSession.id}/manuscript-import-process`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ importBookId }),
          }
        );
        const result = (await response.json().catch(() => null)) as
          | {
              workflowState?: ManuscriptImportWorkflowState;
              complete?: boolean;
              error?: string;
            }
          | null;

        if (!response.ok || !result?.workflowState) {
          throw new Error(result?.error || "Unable to process this imported book.");
        }

        nextState = result.workflowState;
        setWorkflowState(nextState);

        const nextBook = nextState.books.find((book) => book.importBookId === importBookId);

        if (!nextBook || nextBook.status === "failed" || result.complete) {
          break;
        }
      }
    } catch (error) {
      setProcessingError(
        error instanceof Error ? error.message : "Unable to process this imported book."
      );
    } finally {
      setProcessingBookId(null);
    }
  }

  return (
    <>
      <AiSessionDetailSection title="Import overview">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <DetailItem label="Stage" value={formatEnumLabel(workflowState.stage)} />
          <DetailItem label="Mode" value={formatEnumLabel(workflowState.importMode)} />
          <DetailItem label="Files" value={String(workflowState.files.length)} />
          <DetailItem label="Books" value={String(workflowState.books.length)} />
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <TextPanel label="Summary" value={workflowState.summary} fallback="No summary yet." />
          <TextPanel
            label="Last error"
            value={workflowState.lastError}
            fallback="No current import errors."
          />
        </div>
      </AiSessionDetailSection>

      <AiSessionDetailSection title="Files">
        <div className="grid gap-4">
          {workflowState.files.map((file) => (
            <article
              key={file.attachmentId}
              className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-medium text-zinc-950">{file.fileName}</h3>
                  <p className="mt-1 text-xs text-zinc-500">
                    {formatEnumLabel(file.parseStatus)} |{" "}
                    {(file.fileSizeBytes / (1024 * 1024)).toFixed(1)} MB
                  </p>
                </div>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-zinc-600 ring-1 ring-zinc-200">
                  {file.plainTextLength.toLocaleString()} chars
                </span>
              </div>
              {file.parseError ? <p className="mt-3 text-sm text-red-700">{file.parseError}</p> : null}
            </article>
          ))}
        </div>
      </AiSessionDetailSection>

      <AiSessionDetailSection title="Book mapping">
        <div className="space-y-4">
          {workflowState.books.map((book) => (
            <BookMappingCard
              key={book.importBookId}
              aiSessionId={aiSession.id}
              book={book}
              books={books}
            />
          ))}
          {booksError ? <p className="text-sm text-red-700">{booksError}</p> : null}
        </div>
      </AiSessionDetailSection>

      <AiSessionDetailSection title="Extraction progress">
        <div className="space-y-4">
          {workflowState.books.map((book) => {
            const nextChunk = book.chunks.find(
              (chunk) => chunk.status === "pending" || chunk.status === "failed"
            );

            return (
              <article
                key={`progress-${book.importBookId}`}
                className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-medium text-zinc-950">{book.title}</h3>
                    <p className="mt-1 text-xs text-zinc-500">
                      {book.processedChunkCount} / {book.chunkCount} chunks processed |{" "}
                      {formatEnumLabel(book.status)}
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">
                      {nextChunk
                        ? `Next chapter unit: ${nextChunk.heading}`
                        : "All chapter units processed."}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleProcessBook(book.importBookId)}
                    disabled={
                      processingBookId === book.importBookId ||
                      !allParsedBooksMapped ||
                      book.mapping.mappingStatus !== "saved" ||
                      book.chunkCount === 0 ||
                      book.status === "ready_for_review"
                    }
                    className="inline-flex h-10 items-center justify-center rounded-full border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-700 transition disabled:cursor-not-allowed disabled:opacity-50 hover:bg-zinc-50"
                  >
                    {processingBookId === book.importBookId ? "Processing..." : "Process book"}
                  </button>
                </div>
                {book.lastError ? <p className="mt-3 text-sm text-red-700">{book.lastError}</p> : null}
              </article>
            );
          })}
          {!allParsedBooksMapped ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Save book mappings for every parsed manuscript file before extraction can begin.
            </div>
          ) : null}
          {processingError ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {processingError}
            </div>
          ) : null}
        </div>
      </AiSessionDetailSection>

      <AiSessionDetailSection title="Review workspace">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-sm font-medium text-zinc-700" htmlFor="book-filter">
              Book filter
            </label>
            <select
              id="book-filter"
              value={selectedBookFilter}
              onChange={(event) => setSelectedBookFilter(event.target.value)}
              className="h-11 rounded-full border border-zinc-200 bg-white px-4 text-sm text-zinc-900"
            >
              <option value="all">All books</option>
              {availableBookFilters.map((book) => (
                <option key={book.importBookId} value={book.importBookId}>
                  {book.title}
                </option>
              ))}
            </select>
          </div>

          <ProposalSection title="Characters" aiSessionId={aiSession.id} proposalType="characters" proposals={workflowState.proposals.characters.filter((proposal) => matchesBookFilter(proposal, selectedBookFilter))} />
          <ProposalSection title="Locations" aiSessionId={aiSession.id} proposalType="locations" proposals={workflowState.proposals.locations.filter((proposal) => matchesBookFilter(proposal, selectedBookFilter))} />
          <ProposalSection title="Plot threads" aiSessionId={aiSession.id} proposalType="plotThreads" proposals={workflowState.proposals.plotThreads.filter((proposal) => matchesBookFilter(proposal, selectedBookFilter))} />
          <ProposalSection title="Timeline" aiSessionId={aiSession.id} proposalType="timelineEvents" proposals={workflowState.proposals.timelineEvents.filter((proposal) => matchesBookFilter(proposal, selectedBookFilter))} />
          <ProposalSection title="Chapters" aiSessionId={aiSession.id} proposalType="chapters" proposals={workflowState.proposals.chapters.filter((proposal) => matchesBookFilter(proposal, selectedBookFilter))} />
          <ProposalSection title="Scenes" aiSessionId={aiSession.id} proposalType="scenes" proposals={workflowState.proposals.scenes.filter((proposal) => matchesBookFilter(proposal, selectedBookFilter))} />
        </div>
      </AiSessionDetailSection>
    </>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">{label}</p>
      <p className="mt-2 text-sm font-medium text-zinc-900">{value}</p>
    </div>
  );
}

function TextPanel({ label, value, fallback }: { label: string; value: string; fallback: string }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">{label}</p>
      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-zinc-700">
        {value || fallback}
      </p>
    </div>
  );
}

function BookMappingCard({
  aiSessionId,
  book,
  books,
}: {
  aiSessionId: string;
  book: ManuscriptImportWorkflowState["books"][number];
  books: Book[];
}) {
  const chapterCount = new Set(
    book.chunks.map((chunk) => `${chunk.chapterIndex}:${chunk.chapterTitle}`)
  ).size;

  const [suggestedAction, setSuggestedAction] = useState<"create" | "update">(
    book.mapping.suggestedAction
  );
  const [targetBookId, setTargetBookId] = useState(book.mapping.targetBookId ?? "");
  const [targetBookTitle, setTargetBookTitle] = useState(book.mapping.targetBookTitle || book.title);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);

    try {
      const selectedBook = books.find((entry) => entry.id === targetBookId);
      const response = await fetch(
        `/api/ai-sessions/${aiSessionId}/manuscript-import-book-mapping`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            importBookId: book.importBookId,
            suggestedAction,
            targetBookId: targetBookId || null,
            targetBookTitle:
              suggestedAction === "update"
                ? selectedBook?.title || targetBookTitle
                : targetBookTitle.trim() || book.title,
          }),
        }
      );
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;

      if (!response.ok) {
        throw new Error(payload?.error || "Unable to save this book mapping.");
      }

      window.location.reload();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to save this book mapping.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <article className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-medium text-zinc-950">{book.title}</h3>
          <p className="mt-1 text-xs text-zinc-500">
            {formatEnumLabel(book.parseStatus)} | {formatEnumLabel(book.mapping.mappingStatus)}
          </p>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-zinc-600 ring-1 ring-zinc-200">
          {chapterCount} chapter units | {book.chunkCount} chunks
        </span>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        <label className="block">
          <span className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">Action</span>
          <select
            value={suggestedAction}
            onChange={(event) => setSuggestedAction(event.target.value === "update" ? "update" : "create")}
            className="mt-2 h-11 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-sm text-zinc-900"
          >
            <option value="create">Create book</option>
            <option value="update">Update existing book</option>
          </select>
        </label>

        {suggestedAction === "update" ? (
          <label className="block lg:col-span-2">
            <span className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">Existing book</span>
            <select
              value={targetBookId}
              onChange={(event) => {
                const nextBookId = event.target.value;
                const nextBook = books.find((entry) => entry.id === nextBookId);
                setTargetBookId(nextBookId);
                setTargetBookTitle(nextBook?.title || book.title);
              }}
              className="mt-2 h-11 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-sm text-zinc-900"
            >
              <option value="">Select a book</option>
              {books.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.title}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <label className="block lg:col-span-2">
            <span className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">New book title</span>
            <input
              value={targetBookTitle}
              onChange={(event) => setTargetBookTitle(event.target.value)}
              className="mt-2 h-11 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-sm text-zinc-900"
            />
          </label>
        )}
      </div>

      {book.parseError ? <p className="mt-3 text-sm text-red-700">{book.parseError}</p> : null}
      {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}

      <button
        type="button"
        onClick={handleSave}
        disabled={saving || book.parseStatus !== "parsed"}
        className="mt-4 inline-flex h-10 items-center justify-center rounded-full bg-zinc-950 px-4 text-sm font-medium text-white transition disabled:cursor-not-allowed disabled:bg-zinc-300 hover:bg-zinc-800"
      >
        {saving ? "Saving..." : "Save mapping"}
      </button>
    </article>
  );
}

function ProposalSection({
  title,
  aiSessionId,
  proposalType,
  proposals,
}: {
  title: string;
  aiSessionId: string;
  proposalType: ManuscriptImportProposalType;
  proposals: AnyProposal[];
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-base font-semibold tracking-tight text-zinc-950">{title}</h3>
        <span className="text-xs uppercase tracking-[0.18em] text-zinc-500">
          {proposals.length} proposals
        </span>
      </div>
      {proposals.length > 0 ? (
        <div className="grid gap-4">
          {proposals.map((proposal) => (
            <ProposalCard
              key={proposal.proposalId}
              aiSessionId={aiSessionId}
              proposalType={proposalType}
              proposal={proposal}
            />
          ))}
        </div>
      ) : (
        <p className="text-sm text-zinc-500">No proposals in this section for the current filter.</p>
      )}
    </section>
  );
}

function ProposalCard({
  aiSessionId,
  proposalType,
  proposal,
}: {
  aiSessionId: string;
  proposalType: ManuscriptImportProposalType;
  proposal: AnyProposal;
}) {
  const [reviewStatus, setReviewStatus] = useState(proposal.review.reviewStatus);
  const [suggestedAction, setSuggestedAction] = useState(proposal.review.suggestedAction);
  const [matchedRecordId, setMatchedRecordId] = useState(
    proposal.review.matchedRecord?.recordId ?? ""
  );
  const [saving, setSaving] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timelineProposal =
    proposalType === "timelineEvents"
      ? (proposal as ManuscriptImportProposalByType<"timelineEvents">)
      : null;

  const matchOptions = getMatchOptions(proposal.review);
  const applyGuardReason =
    suggestedAction !== "ignore" &&
    (reviewStatus !== "reviewed" ||
      ((suggestedAction === "update" || suggestedAction === "merge") && !matchedRecordId))
      ? "Review and target selection must be saved before this proposal can apply."
      : null;

  async function handleSaveReview() {
    setSaving(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/ai-sessions/${aiSessionId}/manuscript-import-proposal-review`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            proposalType,
            proposalId: proposal.proposalId,
            reviewStatus,
            suggestedAction,
            matchedRecordId: matchedRecordId || null,
            placement: timelineProposal?.placementSuggestion.placement ?? "unspecified",
            yearStart: timelineProposal?.placementSuggestion.yearStart ?? null,
            yearEnd: timelineProposal?.placementSuggestion.yearEnd ?? null,
            displayDateLabel: timelineProposal?.placementSuggestion.displayDateLabel ?? "",
          }),
        }
      );
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;

      if (!response.ok) {
        throw new Error(payload?.error || "Unable to save this proposal review.");
      }

      window.location.reload();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to save this proposal review.");
    } finally {
      setSaving(false);
    }
  }

  async function handleApply() {
    setApplying(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/ai-sessions/${aiSessionId}/manuscript-import-proposal-apply`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            proposalType,
            proposalId: proposal.proposalId,
          }),
        }
      );
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;

      if (!response.ok) {
        throw new Error(payload?.error || "Unable to apply this proposal.");
      }

      window.location.reload();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to apply this proposal.");
    } finally {
      setApplying(false);
    }
  }

  return (
    <article className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 className="text-sm font-medium text-zinc-950">{getProposalTitle(proposalType, proposal)}</h4>
          <p className="mt-1 text-xs text-zinc-500">
            {proposal.sourceAttachmentIds.length} files | {proposal.sourceChunkIds.length} chunks
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-zinc-600 ring-1 ring-zinc-200">
            Review {formatEnumLabel(proposal.review.reviewStatus)}
          </span>
          <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-zinc-600 ring-1 ring-zinc-200">
            Action {formatEnumLabel(proposal.review.suggestedAction)}
          </span>
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {getProposalFields(proposalType, proposal).map((field) => (
          <div key={`${proposal.proposalId}-${field.label}`}>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">{field.label}</p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-700">{field.value || "None"}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        <label className="block">
          <span className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">Review</span>
          <select value={reviewStatus} onChange={(event) => setReviewStatus(event.target.value as typeof reviewStatus)} className="mt-2 h-11 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-sm text-zinc-900">
            <option value="pending">Pending</option>
            <option value="reviewed">Reviewed</option>
            <option value="applied">Applied</option>
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">Action</span>
          <select value={suggestedAction} onChange={(event) => setSuggestedAction(event.target.value as typeof suggestedAction)} className="mt-2 h-11 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-sm text-zinc-900">
            <option value="create">Create</option>
            <option value="update">Update</option>
            <option value="merge">Merge</option>
            <option value="ignore">Ignore</option>
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">Matched record</span>
          <select value={matchedRecordId} onChange={(event) => setMatchedRecordId(event.target.value)} className="mt-2 h-11 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-sm text-zinc-900">
            <option value="">None</option>
            {matchOptions.map((option) => (
              <option key={option.recordId} value={option.recordId}>
                {option.recordLabel}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
      {applyGuardReason ? <p className="mt-3 text-xs text-zinc-500">{applyGuardReason}</p> : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={handleSaveReview} disabled={saving || applying} className="inline-flex h-10 items-center justify-center rounded-full bg-zinc-950 px-4 text-sm font-medium text-white transition disabled:cursor-not-allowed disabled:bg-zinc-300 hover:bg-zinc-800">
          {saving ? "Saving..." : "Save review"}
        </button>
        <button type="button" onClick={handleApply} disabled={saving || applying || Boolean(applyGuardReason)} className="inline-flex h-10 items-center justify-center rounded-full border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-700 transition disabled:cursor-not-allowed disabled:opacity-50 hover:bg-zinc-50">
          {applying ? "Applying..." : `Apply to ${formatEnumLabel(getTargetEntityLabel(proposalType))}`}
        </button>
      </div>
    </article>
  );
}

function getTargetEntityLabel(proposalType: ManuscriptImportProposalType) {
  if (proposalType === "plotThreads") {
    return "plot_threads";
  }

  if (proposalType === "timelineEvents") {
    return "timeline_events";
  }

  return proposalType;
}

function getMatchOptions(review: AnyProposal["review"]) {
  const options = review.matchedRecord ? [review.matchedRecord, ...review.matchCandidates] : review.matchCandidates;
  const seenIds = new Set<string>();

  return options.filter((option) => {
    if (!option.recordId || seenIds.has(option.recordId)) {
      return false;
    }

    seenIds.add(option.recordId);
    return true;
  });
}

function getProposalTitle(proposalType: ManuscriptImportProposalType, proposal: AnyProposal) {
  switch (proposalType) {
    case "characters":
      return (proposal as ManuscriptImportProposalByType<"characters">).name;
    case "locations":
      return (proposal as ManuscriptImportProposalByType<"locations">).name;
    case "plotThreads":
      return (proposal as ManuscriptImportProposalByType<"plotThreads">).title;
    case "timelineEvents":
      return (proposal as ManuscriptImportProposalByType<"timelineEvents">).title;
    case "chapters":
      return (proposal as ManuscriptImportProposalByType<"chapters">).title;
    case "scenes":
      return (proposal as ManuscriptImportProposalByType<"scenes">).title;
  }
}

function getProposalFields(proposalType: ManuscriptImportProposalType, proposal: AnyProposal) {
  switch (proposalType) {
    case "characters": {
      const character = proposal as ManuscriptImportProposalByType<"characters">;
      return [
        { label: "Summary", value: character.summary },
        {
          label: "Type",
          value: [character.characterType, character.importanceLevel].filter(Boolean).join(", "),
        },
        { label: "Traits", value: character.traits.join(", ") },
        { label: "Motivations", value: character.motivations.join(", ") },
        { label: "Evidence", value: character.evidence },
      ];
    }
    case "locations": {
      const location = proposal as ManuscriptImportProposalByType<"locations">;
      return [
        { label: "Summary", value: location.summary },
        { label: "Location type", value: location.locationType },
        { label: "Notable features", value: location.notableFeatures.join(", ") },
        { label: "Evidence", value: location.evidence },
      ];
    }
    case "plotThreads": {
      const plotThread = proposal as ManuscriptImportProposalByType<"plotThreads">;
      return [
        { label: "Summary", value: plotThread.summary },
        { label: "Thread type", value: plotThread.threadType },
        { label: "Linked characters", value: plotThread.linkedCharacterNames.join(", ") },
        { label: "Linked chapters", value: plotThread.linkedChapterTitles.join(", ") },
        { label: "Evidence", value: plotThread.evidence },
      ];
    }
    case "timelineEvents": {
      const timelineEvent = proposal as ManuscriptImportProposalByType<"timelineEvents">;
      return [
        { label: "Summary", value: timelineEvent.summary },
        { label: "Event type", value: timelineEvent.eventType },
        { label: "Date label", value: timelineEvent.dateLabel },
        { label: "Linked scenes", value: timelineEvent.linkedSceneTitles.join(", ") },
        { label: "Evidence", value: timelineEvent.evidence },
      ];
    }
    case "chapters": {
      const chapter = proposal as ManuscriptImportProposalByType<"chapters">;
      return [
        { label: "Summary", value: chapter.summary },
        { label: "Purpose", value: chapter.purpose },
        { label: "POV", value: chapter.pointOfViewCharacterName },
        { label: "Target book", value: chapter.targetBookId || "Unmapped" },
        { label: "Evidence", value: chapter.evidence },
      ];
    }
    case "scenes": {
      const scene = proposal as ManuscriptImportProposalByType<"scenes">;
      return [
        { label: "Summary", value: scene.summary },
        { label: "Scene type", value: scene.sceneType },
        { label: "POV", value: scene.pointOfViewCharacterName },
        { label: "Target book", value: scene.targetBookId || "Unmapped" },
        { label: "Evidence", value: scene.evidence },
      ];
    }
  }
}

function matchesBookFilter(proposal: AnyProposal, selectedBookFilter: string) {
  return selectedBookFilter === "all" || proposal.sourceBookIds.includes(selectedBookFilter);
}

function formatEnumLabel(value: string) {
  return value.replace(/_/g, " ");
}
