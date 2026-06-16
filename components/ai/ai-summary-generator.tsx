"use client";

import { useEffect, useState } from "react";

import { useOpenAiConfig } from "@/hooks/use-openai-config";
import { useScrollLock } from "@/hooks/use-scroll-lock";

type AiSummaryGeneratorProps = {
  description: string;
  entityType: string;
  summary: string;
  title?: string;
  onApply: (nextSummary: string) => void;
};

export function AiSummaryGenerator({
  description,
  entityType,
  summary,
  title,
  onApply,
}: AiSummaryGeneratorProps) {
  const { config, loading: configLoading } = useOpenAiConfig();
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [generatedSummary, setGeneratedSummary] = useState<string | null>(null);
  useScrollLock(previewOpen);

  const normalizedDescription = description.trim();
  const hasExistingSummary = summary.trim().length > 0;
  const disabled =
    configLoading ||
    !config?.configured ||
    working ||
    normalizedDescription.length === 0;

  useEffect(() => {
    if (!previewOpen) {
      return;
    }

    const previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setPreviewOpen(false);
      }
    }

    window.addEventListener("keydown", handleEscape);
    return () => {
      document.body.style.overflow = previousBodyOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [previewOpen]);

  async function generateSummaryPreview() {
    if (disabled) {
      return;
    }

    setWorking(true);
    setError(null);

    try {
      const response = await window.bookBible.ai.generateSummary({
        description: normalizedDescription,
        entityType,
        title,
      });
      setGeneratedSummary(response.summary);
      setPreviewOpen(true);
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Unable to generate summary right now."
      );
    } finally {
      setWorking(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void generateSummaryPreview()}
          disabled={disabled}
          className="inline-flex h-10 items-center justify-center rounded-full border border-zinc-300 bg-white px-4 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {working ? "Generating..." : "Generate summary"}
        </button>

        {!configLoading && !config?.configured ? (
          <p className="text-xs text-zinc-500">Add your OpenAI API key in Profile to enable this.</p>
        ) : null}

        {normalizedDescription.length === 0 ? (
          <p className="text-xs text-zinc-500">Add description text first.</p>
        ) : null}
      </div>

      {error ? (
        <p className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {previewOpen && generatedSummary ? (
        <div className="fixed inset-0 z-[60] overflow-y-auto overscroll-contain bg-zinc-950/45 px-4 py-6 backdrop-blur-sm">
          <div
            className="absolute inset-0"
            onClick={() => setPreviewOpen(false)}
            aria-hidden="true"
          />

          <div className="relative z-10 mx-auto my-auto w-full max-w-xl rounded-4xl border border-zinc-200 bg-[#fffdf9] p-6 shadow-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
              AI summary preview
            </p>
            <h3 className="mt-2 text-xl font-semibold tracking-tight text-zinc-950">
              {title ? `Preview for ${title}` : "Generated summary"}
            </h3>
            <p className="mt-3 whitespace-pre-wrap rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm leading-6 text-zinc-800">
              {generatedSummary}
            </p>

            {hasExistingSummary ? (
              <p className="mt-3 text-xs text-zinc-500">
                Your current summary is unchanged until you choose &quot;Use this summary&quot;.
              </p>
            ) : null}

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void generateSummaryPreview()}
                disabled={working}
                className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {working ? "Generating..." : "Generate again"}
              </button>
              <button
                type="button"
                onClick={() => {
                  onApply(generatedSummary);
                  setPreviewOpen(false);
                }}
                className="inline-flex h-11 items-center justify-center rounded-full bg-zinc-950 px-4 text-sm font-medium text-white transition hover:bg-zinc-800"
              >
                Use this summary
              </button>
              <button
                type="button"
                onClick={() => setPreviewOpen(false)}
                className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-200 px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
