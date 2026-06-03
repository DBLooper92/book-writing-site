"use client";

import { useEffect, useMemo, useState } from "react";

import { PageShell } from "@/components/layout/page-shell";
import {
  type OpenAiUsageRangePreset,
  type OpenAiUsageScope,
  useOpenAiDashboard,
} from "@/hooks/use-openai-dashboard";

const RANGE_OPTIONS: Array<{
  description: string;
  label: string;
  value: OpenAiUsageRangePreset;
}> = [
  { description: "A tight read on recent activity.", label: "7 days", value: "7d" },
  { description: "Balanced for weekly usage patterns.", label: "30 days", value: "30d" },
  { description: "Good for trend watching.", label: "90 days", value: "90d" },
  { description: "No cutoff, all stored events.", label: "All time", value: "all" },
];

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    style: "currency",
  }).format(Number(value ?? 0));
}

function formatCompactNumber(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 1,
    notation: "compact",
  }).format(Number(value ?? 0));
}

function formatPrettyDate(dateValue: string) {
  const parsed = new Date(dateValue);

  if (Number.isNaN(parsed.getTime())) {
    return dateValue;
  }

  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function getModelLabel(model: string | null | undefined) {
  const value = String(model ?? "").trim();

  if (!value) {
    return "OpenAI";
  }

  return value.replace(/^openai\./i, "").replace(/-/g, " ");
}

function getKeyScopeLabel(scope: OpenAiUsageScope, dashboardKeys: string[]) {
  if (scope === "all") {
    return "All keys";
  }

  if (scope === "active") {
    return "Active key";
  }

  if (dashboardKeys.includes(scope)) {
    return "Selected key";
  }

  return "All keys";
}

export default function ProfilePage() {
  const [rangePreset, setRangePreset] = useState<OpenAiUsageRangePreset>("30d");
  const [scope, setScope] = useState<OpenAiUsageScope>("all");
  const { config, dashboard, error: dashboardError, loading, refresh } = useOpenAiDashboard(
    rangePreset,
    scope
  );
  const [apiKey, setApiKey] = useState("");
  const [keyLabel, setKeyLabel] = useState("");
  const [saving, setSaving] = useState(false);
  const [adding, setAdding] = useState(false);
  const [removingKeyId, setRemovingKeyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const keys = useMemo(() => config?.keys ?? [], [config?.keys]);
  const activeKey = dashboard?.activeKey ?? keys.find((key) => key.active) ?? null;
  const activeKeyLabel = activeKey?.label ?? "No active key";
  const selectedScopeKeys = dashboard?.keys ?? [];
  const timelineMaxTokens = useMemo(
    () => Math.max(1, ...(dashboard?.timeline.map((entry) => entry.totalTokens) ?? [1])),
    [dashboard]
  );
  const usageSummary = dashboard?.summary ?? {
    averageSpendUsd: 0,
    averageTokens: 0,
    pricingKnown: true,
    requestCount: 0,
    totalSpendUsd: 0,
    totalTokens: 0,
  };

  useEffect(() => {
    if (scope === "all" || scope === "active") {
      return;
    }

    if (!keys.some((key) => key.fingerprint === scope)) {
      setScope("all");
    }
  }, [keys, scope]);

  async function saveActiveKey() {
    const normalizedKey = apiKey.trim();
    const normalizedLabel = keyLabel.trim();

    if (!normalizedKey) {
      setActionError("Enter an OpenAI API key first.");
      return;
    }

    setSaving(true);
    setActionError(null);
    setMessage(null);

    try {
      const result = await window.bookBible.ai.setOpenAiKey(normalizedKey, normalizedLabel);
      setApiKey("");
      setKeyLabel("");
      setMessage(`Active key saved (****${result.last4}).`);
      await refresh();
    } catch (nextError) {
      setActionError(nextError instanceof Error ? nextError.message : "Unable to save key.");
    } finally {
      setSaving(false);
    }
  }

  async function addAnotherKey() {
    const normalizedKey = apiKey.trim();
    const normalizedLabel = keyLabel.trim();

    if (!normalizedKey) {
      setActionError("Enter an OpenAI API key first.");
      return;
    }

    setAdding(true);
    setActionError(null);
    setMessage(null);

    try {
      const result = await window.bookBible.ai.addOpenAiKey(normalizedKey, normalizedLabel);
      setApiKey("");
      setKeyLabel("");
      setMessage(`Added key (****${result.last4}) and set it active.`);
      await refresh();
    } catch (nextError) {
      setActionError(nextError instanceof Error ? nextError.message : "Unable to add key.");
    } finally {
      setAdding(false);
    }
  }

  async function setActiveKey(keyId: string) {
    setActionError(null);
    setMessage(null);

    try {
      await window.bookBible.ai.setActiveOpenAiKey(keyId);
      setMessage("Active key updated.");
      await refresh();
    } catch (nextError) {
      setActionError(nextError instanceof Error ? nextError.message : "Unable to update active key.");
    }
  }

  async function removeKey(keyId: string) {
    const targetKey = keys.find((key) => key.fingerprint === keyId);
    const shouldRemove = window.confirm(
      `Remove ${targetKey?.label ?? "this key"} from the local key vault?`
    );

    if (!shouldRemove) {
      return;
    }

    setRemovingKeyId(keyId);
    setActionError(null);
    setMessage(null);

    try {
      await window.bookBible.ai.removeOpenAiKey(keyId);
      setMessage("Key removed.");

      if (scope === keyId) {
        setScope("all");
      }

      await refresh();
    } catch (nextError) {
      setActionError(nextError instanceof Error ? nextError.message : "Unable to remove key.");
    } finally {
      setRemovingKeyId(null);
    }
  }

  const keyScopeOptions = useMemo(
    () => [
      { description: "Everything stored locally", label: "All keys", value: "all" as const },
      {
        description: "The currently active key only",
        label: "Active key",
        value: "active" as const,
      },
      ...keys.map((key) => ({
        description: `${key.label} ****${key.last4}`,
        label: key.label,
        value: key.fingerprint,
      })),
    ],
    [keys]
  );

  return (
    <PageShell
      eyebrow="Profile"
      title="Profile, Keys & Usage"
      description="Manage encrypted OpenAI keys locally, then review spend, token volume, and request counts by key and by time range. Usage data is written to the app backend so it does not live in project files."
    >
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,1.25fr)]">
        <section className="relative overflow-hidden rounded-[2rem] border border-zinc-200 bg-[linear-gradient(180deg,#1f2937_0%,#111827_100%)] p-6 text-zinc-100 shadow-[0_20px_80px_rgba(15,23,42,0.18)]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(251,191,36,0.18),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(244,114,182,0.14),transparent_30%)]" />
          <div className="relative">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.26em] text-zinc-400">
                  OpenAI key vault
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">
                  Encrypted local storage
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-300">
                  Keys are stored outside project files, kept encrypted on disk, and never shown back to the
                  renderer. You can keep multiple keys and switch the active one without losing the others.
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-right backdrop-blur">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-400">
                  Active key
                </p>
                <p className="mt-1 text-sm font-medium text-white">{activeKeyLabel}</p>
                <p className="mt-1 text-xs text-zinc-400">
                  {config?.defaultModel ? `Model: ${getModelLabel(config.defaultModel)}` : "Model not set"}
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
                  Key label
                </span>
                <input
                  type="text"
                  value={keyLabel}
                  onChange={(event) => setKeyLabel(event.target.value)}
                  placeholder="Primary, Research, Billing..."
                  className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none transition placeholder:text-zinc-500 focus:border-amber-300/60 focus:bg-white/10"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
                  OpenAI API key
                </span>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(event) => setApiKey(event.target.value)}
                  placeholder="sk-..."
                  className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none transition placeholder:text-zinc-500 focus:border-amber-300/60 focus:bg-white/10"
                />
              </label>
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void saveActiveKey()}
                disabled={saving || adding}
                className="inline-flex h-11 items-center justify-center rounded-full bg-amber-300 px-4 text-sm font-semibold text-zinc-950 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Verifying..." : "Save as active"}
              </button>

              <button
                type="button"
                onClick={() => void addAnotherKey()}
                disabled={saving || adding}
                className="inline-flex h-11 items-center justify-center rounded-full border border-white/15 bg-white/5 px-4 text-sm font-medium text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {adding ? "Adding..." : "Add another key"}
              </button>
            </div>

            <div className="mt-6 grid gap-3">
              {keys.length > 0 ? (
                keys.map((key, index) => (
                  <article
                    key={`${key.fingerprint}-${index}`}
                    className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 backdrop-blur-sm"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-semibold text-white">{key.label}</h3>
                          {key.active ? (
                            <span className="rounded-full bg-emerald-400/15 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-200">
                              Active
                            </span>
                          ) : (
                            <span className="rounded-full bg-white/8 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-300">
                              Idle
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-zinc-400">****{key.last4}</p>
                        <p className="mt-2 text-xs text-zinc-500">
                          Added {new Date(key.createdAt).toLocaleDateString()}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => void setActiveKey(key.fingerprint)}
                          disabled={key.active}
                          className="inline-flex h-9 items-center justify-center rounded-full border border-white/12 bg-white/5 px-3 text-xs font-medium text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {key.active ? "Current" : "Set active"}
                        </button>

                        <button
                          type="button"
                          onClick={() => void removeKey(key.fingerprint)}
                          disabled={removingKeyId === key.fingerprint}
                          className="inline-flex h-9 items-center justify-center rounded-full border border-rose-300/20 bg-rose-400/10 px-3 text-xs font-medium text-rose-100 transition hover:bg-rose-400/20 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {removingKeyId === key.fingerprint ? "Removing..." : "Remove"}
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-3">
                      <div className="rounded-xl bg-black/15 p-3">
                        <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">Requests</p>
                        <p className="mt-1 text-sm font-semibold text-white">
                          {formatCompactNumber(
                            selectedScopeKeys.find((entry) => entry.apiKeyFingerprint === key.fingerprint)
                              ?.requestCount ?? 0
                          )}
                        </p>
                      </div>
                      <div className="rounded-xl bg-black/15 p-3">
                        <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">Tokens</p>
                        <p className="mt-1 text-sm font-semibold text-white">
                          {formatCompactNumber(
                            selectedScopeKeys.find((entry) => entry.apiKeyFingerprint === key.fingerprint)
                              ?.totalTokens ?? 0
                          )}
                        </p>
                      </div>
                      <div className="rounded-xl bg-black/15 p-3">
                        <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">Spend</p>
                        <p className="mt-1 text-sm font-semibold text-white">
                          {formatCurrency(
                            selectedScopeKeys.find((entry) => entry.apiKeyFingerprint === key.fingerprint)
                              ?.totalSpendUsd ?? 0
                          )}
                        </p>
                      </div>
                    </div>
                  </article>
                ))
              ) : (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-zinc-300">
                  No API keys saved yet. Add one above to start tracking usage.
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500">
                Usage ledger
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950">
                Requests, tokens, and spend
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600">
                This is aggregated from the app&apos;s backend ledger, not from project files. It is filtered by
                the active key selection and the time window you choose below.
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-right">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                Range
              </p>
              <p className="mt-1 text-sm font-medium text-zinc-950">
                {RANGE_OPTIONS.find((option) => option.value === rangePreset)?.label ?? "30 days"}
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                {getKeyScopeLabel(scope, keys.map((key) => key.fingerprint))}
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              {
                label: "Total spend",
                value: formatCurrency(usageSummary.totalSpendUsd),
                helper: dashboard?.pricingKnown
                  ? "Estimated from current public model rates"
                  : "Pricing unknown for one or more models",
              },
              {
                label: "Total tokens",
                value: formatCompactNumber(usageSummary.totalTokens),
                helper: `${formatCompactNumber(usageSummary.averageTokens)} average per request`,
              },
              {
                label: "Total requests",
                value: formatCompactNumber(usageSummary.requestCount),
                helper: `${formatCurrency(usageSummary.averageSpendUsd)} average per request`,
              },
              {
                label: "Stored keys",
                value: formatCompactNumber(keys.length),
                helper: activeKey ? `Active: ${activeKey.label}` : "No active key set",
              },
            ].map((metric, index) => (
              <div
                key={`${metric.label}-${index}`}
                className="rounded-2xl border border-zinc-200 bg-[linear-gradient(180deg,#ffffff_0%,#fafafa_100%)] p-4 shadow-[0_1px_0_rgba(15,23,42,0.04)]"
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                  {metric.label}
                </p>
                <p className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950">{metric.value}</p>
                <p className="mt-2 text-xs leading-5 text-zinc-500">{metric.helper}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                Time range
              </span>
              <div className="grid grid-cols-2 gap-2 rounded-3xl border border-zinc-200 bg-zinc-50 p-2">
                {RANGE_OPTIONS.map((option, index) => (
                  <button
                    type="button"
                    key={`${option.value}-${index}`}
                    onClick={() => setRangePreset(option.value)}
                    className={`rounded-2xl px-3 py-3 text-left text-sm transition ${
                      rangePreset === option.value
                        ? "bg-zinc-950 text-white shadow-sm"
                        : "bg-transparent text-zinc-600 hover:bg-white"
                    }`}
                  >
                    <span className="block font-medium">{option.label}</span>
                    <span
                      className={`mt-1 block text-xs ${
                        rangePreset === option.value ? "text-zinc-300" : "text-zinc-500"
                      }`}
                    >
                      {option.description}
                    </span>
                  </button>
                ))}
              </div>
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                Key scope
              </span>
              <select
                value={scope}
                onChange={(event) => setScope(event.target.value as OpenAiUsageScope)}
                className="h-12 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-sm text-zinc-950 outline-none transition focus:border-zinc-400"
              >
                {keyScopeOptions.map((option, index) => (
                  <option key={`${option.value}-${index}`} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="mt-2 text-xs leading-5 text-zinc-500">
                Narrow the ledger to one key if you want to see what a specific API key is doing.
              </p>
            </label>
          </div>

          <div className="mt-6 overflow-hidden rounded-3xl border border-zinc-200">
            <div className="border-b border-zinc-200 bg-zinc-50 px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-zinc-950">Trend by day</p>
                  <p className="text-xs text-zinc-500">
                    {dashboard?.range.sinceIso
                      ? `Since ${new Date(dashboard.range.sinceIso).toLocaleDateString()}`
                      : "All stored usage"}
                  </p>
                </div>
                <p className="text-xs text-zinc-500">
                  {dashboard?.pricingKnown
                    ? "Estimated spend included"
                    : "One or more rows are missing pricing"}
                </p>
              </div>
            </div>

            <div className="divide-y divide-zinc-200 bg-white">
              {loading ? (
                <div className="px-4 py-6 text-sm text-zinc-500">Loading usage data...</div>
              ) : dashboard?.timeline.length ? (
                dashboard.timeline.map((entry, index) => {
                  const width = Math.max(8, (entry.totalTokens / timelineMaxTokens) * 100);

                  return (
                    <div
                      key={`${entry.date}-${index}`}
                      className="grid gap-3 px-4 py-4 sm:grid-cols-[8rem_minmax(0,1fr)_7rem] sm:items-center"
                    >
                      <div>
                        <p className="text-sm font-medium text-zinc-950">{formatPrettyDate(entry.date)}</p>
                        <p className="text-xs text-zinc-500">
                          {formatCompactNumber(entry.requestCount)} requests
                        </p>
                      </div>

                      <div className="space-y-2">
                        <div className="h-2 overflow-hidden rounded-full bg-zinc-200">
                          <div
                            className="h-full rounded-full bg-[linear-gradient(90deg,#f59e0b_0%,#fb7185_100%)]"
                            style={{ width: `${width}%` }}
                          />
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500">
                          <span>{formatCompactNumber(entry.totalTokens)} tokens</span>
                          <span>{formatCurrency(entry.totalSpendUsd)} spend</span>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="text-sm font-medium text-zinc-950">
                          {formatCurrency(entry.totalSpendUsd)}
                        </p>
                        <p className="text-xs text-zinc-500">
                          {formatCompactNumber(entry.totalTokens)} tokens
                        </p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="px-4 py-6 text-sm text-zinc-500">
                  No usage has been recorded for this filter yet.
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 rounded-3xl border border-zinc-200 bg-zinc-50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-zinc-950">Per-key breakdown</p>
                <p className="text-xs text-zinc-500">Values in the currently selected range.</p>
              </div>
              <p className="text-xs text-zinc-500">
                {selectedScopeKeys.length > 0
                  ? `${selectedScopeKeys.length} matching keys`
                  : "No matching keys"}
              </p>
            </div>

            <div className="mt-4 grid gap-3">
              {selectedScopeKeys.length > 0 ? (
                selectedScopeKeys.map((entry, index) => (
                  <div
                    key={`${entry.apiKeyFingerprint}-${index}`}
                    className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-zinc-200 bg-white px-4 py-3"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium text-zinc-950">{entry.apiKeyLabel}</p>
                        {entry.active ? (
                          <span className="rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700">
                            Active
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-xs text-zinc-500">****{entry.apiKeyLast4}</p>
                    </div>

                    <div className="grid grid-cols-3 gap-3 text-right text-sm">
                      <div>
                        <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Requests</p>
                        <p className="mt-1 font-medium text-zinc-950">
                          {formatCompactNumber(entry.requestCount)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Tokens</p>
                        <p className="mt-1 font-medium text-zinc-950">
                          {formatCompactNumber(entry.totalTokens)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Spend</p>
                        <p className="mt-1 font-medium text-zinc-950">{formatCurrency(entry.totalSpendUsd)}</p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-zinc-300 bg-white px-4 py-5 text-sm text-zinc-500">
                  No keys match the current filter.
                </div>
              )}
            </div>
          </div>

          {message ? (
            <p className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              {message}
            </p>
          ) : null}

          {actionError || dashboardError ? (
            <p className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {actionError ?? dashboardError}
            </p>
          ) : null}
        </section>
      </div>
    </PageShell>
  );
}
