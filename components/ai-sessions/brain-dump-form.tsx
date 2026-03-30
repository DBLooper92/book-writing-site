"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

import { BRAIN_DUMP_MAX_CHARACTERS } from "@/lib/ai/brain-dump";
import type { BrainDumpFailureDebugInfo } from "@/types/ai-brain-dump-debug";

type BrainDumpFormProps = {
  projectId: string;
  onSuccess: (aiSessionId: string) => void;
};

type BrainDumpFormValues = {
  title: string;
  purpose: string;
  guidance: string;
  sourceText: string;
};

const EMPTY_VALUES: BrainDumpFormValues = {
  title: "",
  purpose: "",
  guidance: "",
  sourceText: "",
};

export function BrainDumpForm({ projectId, onSuccess }: BrainDumpFormProps) {
  const [values, setValues] = useState<BrainDumpFormValues>(EMPTY_VALUES);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<BrainDumpFailureDebugInfo | null>(null);
  const [failedAiSessionId, setFailedAiSessionId] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const title = values.title.trim();
    const sourceText = values.sourceText.trim();

    if (!title) {
      setError("Brain dump title is required.");
      return;
    }

    if (!sourceText) {
      setError("Brain dump text is required.");
      return;
    }

    setSubmitting(true);
    setError(null);
    setDebugInfo(null);
    setFailedAiSessionId(null);

    try {
      const response = await fetch("/api/ai-sessions/brain-dump", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          projectId,
          title,
          purpose: values.purpose,
          guidance: values.guidance,
          sourceText,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { aiSessionId?: string; error?: string; debug?: BrainDumpFailureDebugInfo }
        | null;

      if (!response.ok || !payload?.aiSessionId) {
        if (payload?.debug) {
          console.error("Brain dump extraction failed.", payload.debug);
          setDebugInfo(payload.debug);
        }

        setFailedAiSessionId(payload?.aiSessionId ?? null);
        throw new Error(payload?.error || "Unable to process this brain dump.");
      }

      setDebugInfo(null);
      setFailedAiSessionId(null);
      onSuccess(payload.aiSessionId);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to process this brain dump.");
    } finally {
      setSubmitting(false);
    }
  }

  const sourceLength = values.sourceText.length;
  const sourceLengthTone =
    sourceLength > BRAIN_DUMP_MAX_CHARACTERS
      ? "text-red-600"
      : sourceLength > BRAIN_DUMP_MAX_CHARACTERS * 0.8
        ? "text-amber-600"
        : "text-zinc-500";

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <section className="grid gap-4 lg:grid-cols-2">
        <Field
          label="Session title"
          value={values.title}
          onChange={(value) => updateField("title", value)}
          placeholder="Book one planning brain dump"
          required
        />
        <Field
          label="Purpose"
          value={values.purpose}
          onChange={(value) => updateField("purpose", value)}
          placeholder="Pull out usable chapters, scenes, and timeline beats."
        />
      </section>

      <TextareaField
        label="AI guidance"
        value={values.guidance}
        onChange={(value) => updateField("guidance", value)}
        placeholder="Optional: emphasize character arcs, be conservative with chronology, keep duplicate scenes merged."
        rows={4}
        hint="Optional. Use this to tell the AI what to prioritize while extracting structure."
      />

      <div className="space-y-2">
        <TextareaField
          label="Brain dump text"
          value={values.sourceText}
          onChange={(value) => updateField("sourceText", value)}
          placeholder="Paste raw planning text, messy notes, partial prose, or a long exploratory dump here."
          rows={18}
          required
          hint="This produces reviewable proposals only. It does not automatically create canon rows."
        />
        <div className={`text-xs ${sourceLengthTone}`}>
          {sourceLength.toLocaleString()} / {BRAIN_DUMP_MAX_CHARACTERS.toLocaleString()} characters
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <p>{error}</p>
          {failedAiSessionId ? (
            <p className="mt-2 text-xs text-red-700/80">
              Failed session saved as{" "}
              <Link href={`/ai-sessions/${failedAiSessionId}`} className="font-medium underline">
                {failedAiSessionId}
              </Link>
              .
            </p>
          ) : null}
        </div>
      ) : null}

      {debugInfo ? (
        <BrainDumpDebugPanel
          debugInfo={debugInfo}
          failedAiSessionId={failedAiSessionId ?? debugInfo.aiSessionId}
        />
      ) : null}

      <button
        type="submit"
        disabled={submitting || sourceLength > BRAIN_DUMP_MAX_CHARACTERS}
        className="inline-flex h-12 items-center justify-center rounded-full bg-zinc-950 px-5 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-300"
      >
        {submitting ? "Processing brain dump..." : "Run brain dump extraction"}
      </button>
    </form>
  );

  function updateField<Key extends keyof BrainDumpFormValues>(
    key: Key,
    value: BrainDumpFormValues[Key]
  ) {
    if (error) {
      setError(null);
    }

    setValues((current) => ({
      ...current,
      [key]: value,
    }));
  }
}

function BrainDumpDebugPanel({
  debugInfo,
  failedAiSessionId,
}: {
  debugInfo: BrainDumpFailureDebugInfo;
  failedAiSessionId: string | null;
}) {
  return (
    <details
      open
      className="rounded-2xl border border-amber-200 bg-amber-50/70 px-4 py-3 text-sm text-amber-950"
    >
      <summary className="cursor-pointer font-medium">Technical failure details</summary>

      <div className="mt-4 space-y-4">
        {debugInfo.fixHints.length > 0 ? (
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-amber-800">
              Likely next steps
            </p>
            <ul className="mt-2 space-y-2 text-sm leading-6 text-amber-950/85">
              {debugInfo.fixHints.map((hint, index) => (
                <li key={`${hint}-${index}`}>{hint}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <DebugItem label="Failure type" value={formatDebugLabel(debugInfo.failureType)} />
          <DebugItem label="Elapsed time" value={formatElapsed(debugInfo.elapsedMs)} />
          <DebugItem label="Timeout" value={formatElapsed(debugInfo.timeoutMs)} />
          <DebugItem label="Model" value={debugInfo.model} />
          <DebugItem label="Source length" value={debugInfo.sourceLength.toLocaleString()} />
          <DebugItem label="Prompt length" value={debugInfo.promptLength.toLocaleString()} />
          <DebugItem
            label="Output token cap"
            value={debugInfo.maxOutputTokens.toLocaleString()}
          />
          <DebugItem label="Started at" value={debugInfo.startedAt} />
          <DebugItem
            label="OpenAI status"
            value={debugInfo.openAiStatus ? String(debugInfo.openAiStatus) : "None"}
          />
          <DebugItem
            label="OpenAI request id"
            value={debugInfo.openAiRequestId || "None captured"}
          />
          <DebugItem
            label="OpenAI processing ms"
            value={debugInfo.openAiProcessingMs || "None captured"}
          />
          <DebugItem label="Failed session" value={failedAiSessionId || "None"} />
        </div>

        {failedAiSessionId ? (
          <p className="text-sm text-amber-950/85">
            Open the saved session for the stored source dump and extraction status:{" "}
            <Link href={`/ai-sessions/${failedAiSessionId}`} className="font-medium underline">
              {failedAiSessionId}
            </Link>
          </p>
        ) : null}

        {debugInfo.responseSummary ? (
          <DebugBlock
            label="Response summary"
            value={JSON.stringify(debugInfo.responseSummary, null, 2)}
          />
        ) : null}

        <DebugBlock label="Error message" value={debugInfo.errorMessage} />
        <DebugBlock label="Error name" value={debugInfo.errorName || "None captured"} />
        <DebugBlock
          label="Raw provider response preview"
          value={debugInfo.rawResponsePreview || "No provider response body was captured."}
        />
      </div>
    </details>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-zinc-700">
        {label}
        {required ? " *" : ""}
      </span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
        className="h-12 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-sm text-zinc-950 outline-none transition focus:border-zinc-400"
      />
    </label>
  );
}

function TextareaField({
  label,
  value,
  onChange,
  placeholder,
  rows,
  hint,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  rows: number;
  hint?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-zinc-700">
        {label}
        {required ? " *" : ""}
      </span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={rows}
        required={required}
        className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-950 outline-none transition focus:border-zinc-400"
      />
      {hint ? <span className="mt-2 block text-xs text-zinc-500">{hint}</span> : null}
    </label>
  );
}

function DebugItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-amber-200 bg-white/80 p-3">
      <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-amber-800">
        {label}
      </p>
      <p className="mt-2 break-words text-sm text-amber-950">{value}</p>
    </div>
  );
}

function DebugBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-amber-200 bg-white/80 p-3">
      <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-amber-800">
        {label}
      </p>
      <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-words font-mono text-xs leading-6 text-amber-950">
        {value}
      </pre>
    </div>
  );
}

function formatDebugLabel(value: string) {
  return value.replace(/_/g, " ");
}

function formatElapsed(value: number) {
  return `${(value / 1000).toFixed(1)}s (${value.toLocaleString()} ms)`;
}
