"use client";

import { useEffect, useState, type ReactNode } from "react";

type ProfileLightboxProps = {
  displayName: string | null;
  email: string | null;
  onClose: () => void;
};

type ProfileTab = "details" | "api_keys";

type OpenAiKeyState = {
  hasKey: boolean;
  last4: string | null;
  updatedAt: string | null;
};

const EMPTY_KEY_STATE: OpenAiKeyState = {
  hasKey: false,
  last4: null,
  updatedAt: null,
};

export function ProfileLightbox({
  displayName,
  email,
  onClose,
}: ProfileLightboxProps) {
  const [activeTab, setActiveTab] = useState<ProfileTab>("details");
  const [keyState, setKeyState] = useState<OpenAiKeyState>(EMPTY_KEY_STATE);
  const [loadingKeyState, setLoadingKeyState] = useState(true);
  const [keyInput, setKeyInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadKeyState() {
      try {
        const response = await fetch("/api/profile/openai-key", {
          method: "GET",
        });
        const payload = (await response.json().catch(() => null)) as
          | { hasKey?: boolean; last4?: string | null; updatedAt?: string | null; error?: string }
          | null;

        if (!response.ok) {
          throw new Error(payload?.error || "Unable to load API key settings.");
        }

        if (cancelled) {
          return;
        }

        setKeyState({
          hasKey: !!payload?.hasKey,
          last4: payload?.last4 ?? null,
          updatedAt: payload?.updatedAt ?? null,
        });
      } catch (nextError) {
        if (cancelled) {
          return;
        }

        setError(
          nextError instanceof Error ? nextError.message : "Unable to load API key settings."
        );
      } finally {
        if (!cancelled) {
          setLoadingKeyState(false);
        }
      }
    }

    void loadKeyState();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSaveOpenAiKey() {
    const apiKey = keyInput.trim();

    if (!apiKey) {
      setError("Paste an OpenAI API key first.");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch("/api/profile/openai-key", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ apiKey }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { hasKey?: boolean; last4?: string | null; updatedAt?: string | null; error?: string }
        | null;

      if (!response.ok) {
        throw new Error(payload?.error || "Unable to save this API key.");
      }

      setKeyState({
        hasKey: !!payload?.hasKey,
        last4: payload?.last4 ?? null,
        updatedAt: payload?.updatedAt ?? null,
      });
      setKeyInput("");
      setSuccessMessage("OpenAI API key saved.");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to save this API key.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteOpenAiKey() {
    setDeleting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch("/api/profile/openai-key", {
        method: "DELETE",
      });
      const payload = (await response.json().catch(() => null)) as
        | { hasKey?: boolean; last4?: string | null; updatedAt?: string | null; error?: string }
        | null;

      if (!response.ok) {
        throw new Error(payload?.error || "Unable to remove this API key.");
      }

      setKeyState({
        hasKey: !!payload?.hasKey,
        last4: payload?.last4 ?? null,
        updatedAt: payload?.updatedAt ?? null,
      });
      setKeyInput("");
      setSuccessMessage("OpenAI API key removed.");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to remove this API key.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/45 px-4 py-6 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />

      <div className="relative z-10 flex max-h-[calc(100vh-3rem)] w-full max-w-4xl overflow-hidden rounded-4xl border border-zinc-200 bg-[#fffdf9] shadow-2xl">
        <aside className="w-full max-w-xs border-r border-zinc-200 bg-white/90 p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
            Profile
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950">
            Account settings
          </h2>

          <nav className="mt-6 space-y-2">
            <TabButton
              active={activeTab === "details"}
              label="Details"
              onClick={() => setActiveTab("details")}
            />
            <TabButton
              active={activeTab === "api_keys"}
              label="API keys"
              onClick={() => setActiveTab("api_keys")}
            />
          </nav>
        </aside>

        <section className="min-h-0 flex-1 overflow-y-auto p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                {activeTab === "details" ? "Details" : "API keys"}
              </p>
              <h3 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950">
                {activeTab === "details" ? "Profile details" : "Provider keys"}
              </h3>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-zinc-200 text-lg text-zinc-700 transition hover:bg-zinc-50"
              aria-label="Close profile lightbox"
            >
              x
            </button>
          </div>

          <div className="mt-6">
            {activeTab === "details" ? (
              <DetailsTab displayName={displayName} email={email} />
            ) : (
              <ApiKeysTab
                deleting={deleting}
                error={error}
                keyInput={keyInput}
                keyState={keyState}
                loadingKeyState={loadingKeyState}
                onChangeKeyInput={(value) => {
                  if (error) {
                    setError(null);
                  }

                  if (successMessage) {
                    setSuccessMessage(null);
                  }

                  setKeyInput(value);
                }}
                onDelete={handleDeleteOpenAiKey}
                onSave={handleSaveOpenAiKey}
                saving={saving}
                successMessage={successMessage}
              />
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function TabButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center rounded-2xl px-4 py-3 text-left text-sm font-medium transition ${
        active ? "bg-zinc-950 text-white" : "text-zinc-700 hover:bg-zinc-100"
      }`}
    >
      {label}
    </button>
  );
}

function DetailsTab({
  displayName,
  email,
}: {
  displayName: string | null;
  email: string | null;
}) {
  return (
    <div className="space-y-4">
      <InfoCard label="Display name" value={displayName || "No display name set."} />
      <InfoCard label="Email" value={email || "No email available."} />
      <section className="rounded-3xl border border-zinc-200 bg-zinc-50 p-5 text-sm leading-6 text-zinc-600">
        More profile details can live here later.
      </section>
    </div>
  );
}

function ApiKeysTab({
  deleting,
  error,
  keyInput,
  keyState,
  loadingKeyState,
  onChangeKeyInput,
  onDelete,
  onSave,
  saving,
  successMessage,
}: {
  deleting: boolean;
  error: string | null;
  keyInput: string;
  keyState: OpenAiKeyState;
  loadingKeyState: boolean;
  onChangeKeyInput: (value: string) => void;
  onDelete: () => Promise<void>;
  onSave: () => Promise<void>;
  saving: boolean;
  successMessage: string | null;
}) {
  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-zinc-200 bg-zinc-50 p-5 text-sm leading-6 text-zinc-600">
        Save your own OpenAI API key here. Brain dump requests will use your saved key instead of a
        shared app key.
      </section>

      <SavedKeyCard
        deleting={deleting}
        hasKey={keyState.hasKey}
        last4={keyState.last4}
        loading={loadingKeyState}
        onDelete={onDelete}
      />

      <label className="block">
        <span className="mb-2 block text-sm font-medium text-zinc-700">
          OpenAI API key
        </span>
        <input
          type="password"
          value={keyInput}
          onChange={(event) => onChangeKeyInput(event.target.value)}
          placeholder={keyState.hasKey ? "Paste a new key to replace the saved one" : "sk-..."}
          className="h-12 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-sm text-zinc-950 outline-none transition focus:border-zinc-400"
        />
        <span className="mt-2 block text-xs text-zinc-500">
          The saved key is stored server-side on your user profile and only a masked suffix is
          shown back to the UI.
        </span>
      </label>

      {error ? (
        <FeedbackCard tone="error">{error}</FeedbackCard>
      ) : successMessage ? (
        <FeedbackCard tone="success">{successMessage}</FeedbackCard>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => void onSave()}
          disabled={saving || deleting}
          className="inline-flex h-11 items-center justify-center rounded-full bg-zinc-950 px-4 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-300"
        >
          {saving ? "Saving..." : keyState.hasKey ? "Replace key" : "Save key"}
        </button>
      </div>
    </div>
  );
}

function SavedKeyCard({
  deleting,
  hasKey,
  last4,
  loading,
  onDelete,
}: {
  deleting: boolean;
  hasKey: boolean;
  last4: string | null;
  loading: boolean;
  onDelete: () => Promise<void>;
}) {
  async function handleDeleteClick() {
    const shouldDelete = window.confirm(
      "Remove the saved OpenAI API key from your profile?"
    );

    if (!shouldDelete) {
      return;
    }

    await onDelete();
  }

  return (
    <section className="rounded-3xl border border-zinc-200 bg-white p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
            Saved key
          </p>
          <p className="mt-3 text-sm leading-6 text-zinc-700">
            {loading
              ? "Loading..."
              : hasKey
                ? `Saved key ending in ${last4 ?? "unknown"}`
                : "No OpenAI key saved yet."}
          </p>
        </div>

        {hasKey && !loading ? (
          <button
            type="button"
            onClick={() => void handleDeleteClick()}
            disabled={deleting}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-zinc-200 text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:border-zinc-100 disabled:text-zinc-400"
            aria-label="Remove saved OpenAI key"
            title="Remove saved OpenAI key"
          >
            {deleting ? <SpinnerIcon /> : <TrashIcon />}
          </button>
        ) : null}
      </div>
    </section>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <section className="rounded-3xl border border-zinc-200 bg-white p-5">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">{label}</p>
      <p className="mt-3 text-sm leading-6 text-zinc-700">{value}</p>
    </section>
  );
}

function FeedbackCard({
  children,
  tone,
}: {
  children: ReactNode;
  tone: "error" | "success";
}) {
  return (
    <div
      className={`rounded-2xl border px-4 py-3 text-sm ${
        tone === "error"
          ? "border-red-200 bg-red-50 text-red-700"
          : "border-emerald-200 bg-emerald-50 text-emerald-700"
      }`}
    >
      {children}
    </div>
  );
}

function TrashIcon() {
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
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4 animate-spin"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 12a9 9 0 1 1-9-9" />
    </svg>
  );
}
