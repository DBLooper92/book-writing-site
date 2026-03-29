"use client";

import { BrainDumpForm } from "@/components/ai-sessions/brain-dump-form";

type TimelineBrainDumpLightboxProps = {
  activeProjectId: string;
  activeProjectTitle: string;
  onClose: () => void;
  onSuccess: (aiSessionId: string) => void;
};

export function TimelineBrainDumpLightbox({
  activeProjectId,
  activeProjectTitle,
  onClose,
  onSuccess,
}: TimelineBrainDumpLightboxProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/45 px-4 py-6 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />

      <div className="relative z-10 flex max-h-[calc(100vh-3rem)] w-full max-w-5xl flex-col overflow-hidden rounded-4xl border border-zinc-200 bg-[#fffdf9] shadow-2xl">
        <div className="border-b border-zinc-200 bg-white px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                Timeline AI
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950">
                Brain dump to structure
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-600">
                Paste freeform planning text for {activeProjectTitle}. The AI will extract
                reviewable proposals for timeline events, scenes, chapter outlines, and
                characters without automatically writing canon rows. This uses the OpenAI key saved
                in Profile.
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-zinc-200 text-lg text-zinc-700 transition hover:bg-zinc-50"
              aria-label="Close brain dump lightbox"
            >
              x
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
          <BrainDumpForm projectId={activeProjectId} onSuccess={onSuccess} />
        </div>
      </div>
    </div>
  );
}
