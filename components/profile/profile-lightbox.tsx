"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import { emitProjectsChanged, useUserProjects } from "@/hooks/use-user-projects";
import { signOutCurrentUser } from "@/lib/auth";
import { clearRememberedAppRoute } from "@/lib/navigation/last-app-route";
import type { UserProject } from "@/lib/data/projects";

type ProfileLightboxProps = {
  displayName: string | null;
  email: string | null;
  onClose: () => void;
  uid: string;
};

type ProfileTab = "details" | "api_keys" | "security";

type OpenAiKeyState = {
  hasKey: boolean;
  last4: string | null;
  updatedAt: string | null;
};

type FeedbackState =
  | {
      message: string;
      tone: "error" | "success";
    }
  | null;

type ProjectDeletionResponse = {
  deletedProjectId?: string;
  deletedProjectTitle?: string;
  message?: string;
  nextActiveProjectId?: string | null;
  redirectTo?: string | null;
  remainingProjectCount?: number;
  wasActiveProject?: boolean;
  error?: string;
};

type AccountDeletionResponse = {
  message?: string;
  redirectTo?: string;
  error?: string;
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
  uid,
}: ProfileLightboxProps) {
  const router = useRouter();
  const { activeProjectId, loading: projectsLoading, projects } = useUserProjects(uid);
  const [activeTab, setActiveTab] = useState<ProfileTab>("details");
  const [keyState, setKeyState] = useState<OpenAiKeyState>(EMPTY_KEY_STATE);
  const [loadingKeyState, setLoadingKeyState] = useState(true);
  const [keyInput, setKeyInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [apiKeyFeedback, setApiKeyFeedback] = useState<FeedbackState>(null);
  const [securityPassword, setSecurityPassword] = useState("");
  const [securityFeedback, setSecurityFeedback] = useState<FeedbackState>(null);
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null);
  const [deletingAccount, setDeletingAccount] = useState(false);

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

        setApiKeyFeedback({
          message:
            nextError instanceof Error
              ? nextError.message
              : "Unable to load API key settings.",
          tone: "error",
        });
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
      setApiKeyFeedback({
        message: "Paste an OpenAI API key first.",
        tone: "error",
      });
      return;
    }

    setSaving(true);
    setApiKeyFeedback(null);

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
      setApiKeyFeedback({
        message: "OpenAI API key saved.",
        tone: "success",
      });
    } catch (nextError) {
      setApiKeyFeedback({
        message:
          nextError instanceof Error ? nextError.message : "Unable to save this API key.",
        tone: "error",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteOpenAiKey() {
    setDeleting(true);
    setApiKeyFeedback(null);

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
      setApiKeyFeedback({
        message: "OpenAI API key removed.",
        tone: "success",
      });
    } catch (nextError) {
      setApiKeyFeedback({
        message:
          nextError instanceof Error ? nextError.message : "Unable to remove this API key.",
        tone: "error",
      });
    } finally {
      setDeleting(false);
    }
  }

  async function handleDeleteProject(project: UserProject) {
    const trimmedPassword = securityPassword.trim();

    if (!trimmedPassword) {
      setSecurityFeedback({
        message: "Enter your current password before deleting a project.",
        tone: "error",
      });
      return;
    }

    const shouldDelete = window.confirm(
      `Delete project "${project.title}" permanently? This removes every scoped record and uploaded image in that project.`
    );

    if (!shouldDelete) {
      return;
    }

    setDeletingProjectId(project.id);
    setSecurityFeedback(null);

    try {
      const response = await fetch("/api/profile/security/project", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          password: trimmedPassword,
          projectId: project.id,
        }),
      });
      const payload = (await response.json().catch(() => null)) as ProjectDeletionResponse | null;

      if (!response.ok) {
        throw new Error(payload?.error || "Unable to delete this project.");
      }

      emitProjectsChanged();
      setSecurityPassword("");

      if (payload?.wasActiveProject && payload.redirectTo) {
        clearRememberedAppRoute();
        onClose();
        router.push(payload.redirectTo);
        router.refresh();
        return;
      }

      setSecurityFeedback({
        message: payload?.message || `Deleted ${project.title}.`,
        tone: "success",
      });
    } catch (nextError) {
      setSecurityFeedback({
        message:
          nextError instanceof Error ? nextError.message : "Unable to delete this project.",
        tone: "error",
      });
    } finally {
      setDeletingProjectId(null);
    }
  }

  async function handleDeleteAccount() {
    const trimmedPassword = securityPassword.trim();

    if (!trimmedPassword) {
      setSecurityFeedback({
        message: "Enter your current password before deleting your account.",
        tone: "error",
      });
      return;
    }

    const shouldDelete = window.confirm(
      "Delete this account permanently? This removes your auth login, profile, every project, all scoped records, and all uploaded files."
    );

    if (!shouldDelete) {
      return;
    }

    setDeletingAccount(true);
    setSecurityFeedback(null);

    try {
      const response = await fetch("/api/profile/security/account", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          password: trimmedPassword,
        }),
      });
      const payload = (await response.json().catch(() => null)) as AccountDeletionResponse | null;

      if (!response.ok) {
        throw new Error(payload?.error || "Unable to delete this account.");
      }

      clearRememberedAppRoute();
      emitProjectsChanged();
      onClose();
      await signOutCurrentUser().catch(() => undefined);
      window.location.assign(payload?.redirectTo || "/auth?mode=sign-up");
    } catch (nextError) {
      setSecurityFeedback({
        message:
          nextError instanceof Error ? nextError.message : "Unable to delete this account.",
        tone: "error",
      });
      setDeletingAccount(false);
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
            <TabButton
              active={activeTab === "security"}
              label="Security"
              onClick={() => setActiveTab("security")}
            />
          </nav>
        </aside>

        <section className="min-h-0 flex-1 overflow-y-auto p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                {getTabEyebrow(activeTab)}
              </p>
              <h3 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950">
                {getTabTitle(activeTab)}
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
            ) : activeTab === "api_keys" ? (
              <ApiKeysTab
                deleting={deleting}
                feedback={apiKeyFeedback}
                keyInput={keyInput}
                keyState={keyState}
                loadingKeyState={loadingKeyState}
                onChangeKeyInput={(value) => {
                  if (apiKeyFeedback) {
                    setApiKeyFeedback(null);
                  }

                  setKeyInput(value);
                }}
                onDelete={handleDeleteOpenAiKey}
                onSave={handleSaveOpenAiKey}
                saving={saving}
              />
            ) : (
              <SecurityTab
                activeProjectId={activeProjectId}
                deletingAccount={deletingAccount}
                deletingProjectId={deletingProjectId}
                feedback={securityFeedback}
                onChangePassword={(value) => {
                  if (securityFeedback) {
                    setSecurityFeedback(null);
                  }

                  setSecurityPassword(value);
                }}
                onDeleteAccount={handleDeleteAccount}
                onDeleteProject={handleDeleteProject}
                password={securityPassword}
                projects={projects}
                projectsLoading={projectsLoading}
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
  feedback,
  keyInput,
  keyState,
  loadingKeyState,
  onChangeKeyInput,
  onDelete,
  onSave,
  saving,
}: {
  deleting: boolean;
  feedback: FeedbackState;
  keyInput: string;
  keyState: OpenAiKeyState;
  loadingKeyState: boolean;
  onChangeKeyInput: (value: string) => void;
  onDelete: () => Promise<void>;
  onSave: () => Promise<void>;
  saving: boolean;
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

      {feedback ? <FeedbackCard tone={feedback.tone}>{feedback.message}</FeedbackCard> : null}

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

function SecurityTab({
  activeProjectId,
  deletingAccount,
  deletingProjectId,
  feedback,
  onChangePassword,
  onDeleteAccount,
  onDeleteProject,
  password,
  projects,
  projectsLoading,
}: {
  activeProjectId: string | null;
  deletingAccount: boolean;
  deletingProjectId: string | null;
  feedback: FeedbackState;
  onChangePassword: (value: string) => void;
  onDeleteAccount: () => Promise<void>;
  onDeleteProject: (project: UserProject) => Promise<void>;
  password: string;
  projects: UserProject[];
  projectsLoading: boolean;
}) {
  const hasPassword = !!password.trim();
  const actionsDisabled = deletingAccount || deletingProjectId !== null;

  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-zinc-200 bg-zinc-50 p-5 text-sm leading-6 text-zinc-600">
        Enter your current password to unlock destructive actions. Project deletion removes every
        scoped record and uploaded image in that project. Account deletion removes the auth user,
        profile row, all projects, all project data, and all uploaded files for this account.
      </section>

      <label className="block">
        <span className="mb-2 block text-sm font-medium text-zinc-700">
          Current password
        </span>
        <input
          type="password"
          value={password}
          onChange={(event) => onChangePassword(event.target.value)}
          autoComplete="current-password"
          placeholder="Re-enter your password to confirm destructive actions"
          className="h-12 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-sm text-zinc-950 outline-none transition focus:border-zinc-400"
        />
        <span className="mt-2 block text-xs text-zinc-500">
          This password is checked on the server before any delete runs.
        </span>
      </label>

      {feedback ? <FeedbackCard tone={feedback.tone}>{feedback.message}</FeedbackCard> : null}

      <section className="rounded-3xl border border-zinc-200 bg-white p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
              Projects
            </p>
            <h4 className="mt-3 text-lg font-semibold tracking-tight text-zinc-950">
              Delete a project
            </h4>
            <p className="mt-2 text-sm leading-6 text-zinc-600">
              Deleting a project removes its books, chapters, scenes, story-bible records, AI
              sessions, attachments, and uploaded entity images.
            </p>
          </div>
          <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600">
            {projects.length} project{projects.length === 1 ? "" : "s"}
          </span>
        </div>

        {projectsLoading ? (
          <div className="mt-5 rounded-2xl bg-zinc-50 px-4 py-4 text-sm text-zinc-600">
            Loading projects...
          </div>
        ) : projects.length === 0 ? (
          <div className="mt-5 rounded-2xl bg-zinc-50 px-4 py-4 text-sm text-zinc-600">
            No projects remain on this account.
          </div>
        ) : (
          <div className="mt-5 space-y-3">
            {projects.map((project) => (
              <ProjectDeleteCard
                key={project.id}
                deleting={deletingProjectId === project.id}
                disabled={!hasPassword || actionsDisabled}
                isActive={project.id === activeProjectId}
                onDelete={onDeleteProject}
                project={project}
              />
            ))}
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-red-200 bg-red-50 p-5">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-red-700">
          Account
        </p>
        <h4 className="mt-3 text-lg font-semibold tracking-tight text-red-950">
          Delete this account
        </h4>
        <p className="mt-2 text-sm leading-6 text-red-900/80">
          This is permanent. Your auth login, profile row, every project, every scoped entity row,
          and every uploaded file tied to this account will be removed.
        </p>

        <div className="mt-5">
          <button
            type="button"
            onClick={() => void onDeleteAccount()}
            disabled={!hasPassword || actionsDisabled}
            className="inline-flex h-11 items-center justify-center rounded-full bg-red-700 px-4 text-sm font-medium text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:bg-red-200 disabled:text-red-50"
          >
            {deletingAccount ? "Deleting account..." : "Delete account"}
          </button>
        </div>
      </section>
    </div>
  );
}

function ProjectDeleteCard({
  deleting,
  disabled,
  isActive,
  onDelete,
  project,
}: {
  deleting: boolean;
  disabled: boolean;
  isActive: boolean;
  onDelete: (project: UserProject) => Promise<void>;
  project: UserProject;
}) {
  return (
    <section className="rounded-3xl border border-zinc-200 bg-zinc-50 p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-semibold text-zinc-950">{project.title}</p>
            {isActive ? (
              <span className="rounded-full bg-zinc-950 px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-white">
                Active
              </span>
            ) : null}
          </div>
          <p className="mt-2 text-xs uppercase tracking-[0.18em] text-zinc-500">{project.id}</p>
          <p className="mt-2 text-sm leading-6 text-zinc-600">
            {project.summary || "No summary saved for this project."}
          </p>
        </div>

        <button
          type="button"
          onClick={() => void onDelete(project)}
          disabled={disabled}
          className="inline-flex h-10 items-center justify-center rounded-full border border-red-200 px-4 text-sm font-medium text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:border-zinc-200 disabled:text-zinc-400"
        >
          {deleting ? "Deleting..." : "Delete"}
        </button>
      </div>
    </section>
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

function getTabEyebrow(activeTab: ProfileTab) {
  switch (activeTab) {
    case "api_keys":
      return "API keys";
    case "security":
      return "Security";
    default:
      return "Details";
  }
}

function getTabTitle(activeTab: ProfileTab) {
  switch (activeTab) {
    case "api_keys":
      return "Provider keys";
    case "security":
      return "Security and deletion";
    default:
      return "Profile details";
  }
}
