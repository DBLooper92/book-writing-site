"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { AuthApiError } from "@supabase/supabase-js";

import { PageShell } from "@/components/layout/page-shell";
import { useAuthUser } from "@/hooks/use-auth-user";
import {
  signInWithEmail,
  signOutCurrentUser,
  signUpWithEmail,
} from "@/lib/auth";

type Mode = "sign-in" | "sign-up";
type Notice =
  | { tone: "neutral"; text: string }
  | { tone: "success"; text: string }
  | { tone: "error"; text: string };

const defaultNotice: Notice = {
  tone: "neutral",
  text: "Use email/password auth to create an account or sign in.",
};

export default function AuthPage() {
  const [mode, setMode] = useState<Mode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<Notice>(defaultNotice);
  const { user: currentUser, loading: authReadyLoading } = useAuthUser();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedEmail = email.trim();

    if (!normalizedEmail) {
      setNotice({
        tone: "error",
        text: "Enter your email address.",
      });
      return;
    }

    if (mode === "sign-up" && password !== confirmPassword) {
      setNotice({
        tone: "error",
        text: "Passwords do not match.",
      });
      return;
    }

    setSubmitting(true);
    setNotice({
      tone: "neutral",
      text: mode === "sign-in" ? "Signing in..." : "Creating account...",
    });

      try {
      if (mode === "sign-in") {
        await signInWithEmail(normalizedEmail, password);
        setNotice({
          tone: "success",
          text: "Signed in successfully.",
        });
      } else {
        const result = await signUpWithEmail(normalizedEmail, password);
        setNotice({
          tone: "success",
          text: result.data.session
            ? "Account created and signed in successfully."
            : "Account created. Check your email to confirm sign-in if confirmation is enabled.",
        });
      }

      setEmail(normalizedEmail);
      setPassword("");
      setConfirmPassword("");
    } catch (error) {
      setNotice({
        tone: "error",
        text: getAuthErrorMessage(error),
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSignOut() {
    setSubmitting(true);
    setNotice({
      tone: "neutral",
      text: "Signing out...",
    });

    try {
      await signOutCurrentUser();
      setNotice({
        tone: "success",
        text: "Signed out successfully.",
      });
    } catch (error) {
      setNotice({
        tone: "error",
        text: getAuthErrorMessage(error),
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PageShell
      eyebrow="BookWritingSite Auth"
      title="Email and password sign in"
      description="Sign in here before creating a project or using the developer setup flow. The first migration pass now uses Supabase Auth for the active session."
    >
      <section className="rounded-4xl border border-zinc-200 bg-white p-8 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex gap-3 text-sm">
            <Link
              href="/"
              className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-200 px-4 font-medium text-zinc-700 transition hover:bg-zinc-50"
            >
              Home
            </Link>
            <Link
              href="/firebase-test"
              className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-200 px-4 font-medium text-zinc-700 transition hover:bg-zinc-50"
            >
              Backend test
            </Link>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-2xl border border-zinc-200 bg-zinc-50 p-6">
            <div className="flex gap-2 rounded-full bg-white p-1 shadow-sm ring-1 ring-zinc-200">
              <ModeButton
                active={mode === "sign-in"}
                disabled={submitting}
                onClick={() => {
                  setMode("sign-in");
                  setNotice(defaultNotice);
                }}
              >
                Sign in
              </ModeButton>
              <ModeButton
                active={mode === "sign-up"}
                disabled={submitting}
                onClick={() => {
                  setMode("sign-up");
                  setNotice(defaultNotice);
                }}
              >
                Sign up
              </ModeButton>
            </div>

            <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
              <Field
                id="email"
                label="Email"
                type="email"
                value={email}
                onChange={setEmail}
                placeholder="you@example.com"
                autoComplete="email"
              />
              <Field
                id="password"
                label="Password"
                type="password"
                value={password}
                onChange={setPassword}
                placeholder="Minimum 6 characters"
                autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
              />
              {mode === "sign-up" ? (
                <Field
                  id="confirm-password"
                  label="Confirm password"
                  type="password"
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  placeholder="Re-enter your password"
                  autoComplete="new-password"
                />
              ) : null}

              <button
                type="submit"
                disabled={submitting || !email || !password}
                className="inline-flex h-12 w-full items-center justify-center rounded-full bg-zinc-950 px-5 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-300"
              >
                {submitting
                  ? mode === "sign-in"
                    ? "Signing in..."
                    : "Creating account..."
                  : mode === "sign-in"
                    ? "Sign in"
                    : "Create account"}
              </button>
            </form>

            <p
              className={`mt-4 rounded-xl px-4 py-3 text-sm ${
                notice.tone === "success"
                  ? "bg-emerald-50 text-emerald-700"
                  : notice.tone === "error"
                    ? "bg-red-50 text-red-700"
                    : "bg-white text-zinc-700 ring-1 ring-zinc-200"
              }`}
            >
              {notice.text}
            </p>
          </section>

          <aside className="rounded-2xl border border-zinc-200 p-6">
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-zinc-500">
              Current session
            </p>
            <div className="mt-4 space-y-3 text-sm text-zinc-600">
              <StatusRow
                label="Auth ready"
                value={authReadyLoading ? "Loading..." : "Yes"}
              />
              <StatusRow
                label="Signed in"
                value={currentUser ? "Yes" : "No"}
              />
              <StatusRow
                label="Email"
                value={currentUser?.email ?? "Not signed in"}
              />
              <StatusRow label="UID" value={currentUser?.uid ?? "Not signed in"} />
            </div>

            <div className="mt-6 rounded-2xl bg-zinc-50 p-4 text-sm leading-6 text-zinc-600">
              <p>
                This route now reflects your current Supabase Auth session.
              </p>
              <p className="mt-3">
                The active runtime is now on Supabase. The remaining cleanup work is
                removing legacy Firebase code and documentation that are no longer in
                the request path.
              </p>
            </div>

            <button
              type="button"
              onClick={handleSignOut}
              disabled={!currentUser || submitting}
              className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-full border border-zinc-300 px-5 text-sm font-medium text-zinc-800 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:border-zinc-200 disabled:text-zinc-400"
            >
              Sign out
            </button>
          </aside>
        </div>
      </section>
    </PageShell>
  );
}

function Field({
  id,
  label,
  type,
  value,
  onChange,
  placeholder,
  autoComplete,
}: {
  id: string;
  label: string;
  type: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  autoComplete: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-zinc-700">{label}</span>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="h-12 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-sm text-zinc-950 outline-none transition focus:border-zinc-400"
      />
    </label>
  );
}

function ModeButton({
  active,
  disabled,
  onClick,
  children,
}: {
  active: boolean;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-10 flex-1 items-center justify-center rounded-full px-4 text-sm font-medium transition ${
        active
          ? "bg-zinc-950 text-white"
          : "text-zinc-600 hover:bg-zinc-100"
      } disabled:cursor-not-allowed disabled:opacity-60`}
    >
      {children}
    </button>
  );
}

function StatusRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 p-3">
      <p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">
        {label}
      </p>
      <p className="mt-1 break-all text-sm font-medium text-zinc-900">{value}</p>
    </div>
  );
}

function getAuthErrorMessage(error: unknown) {
  if (!(error instanceof AuthApiError)) {
    return error instanceof Error ? error.message : "Unknown authentication error.";
  }

  switch (error.code) {
    case "user_already_exists":
      return "That email address is already in use.";
    case "email_address_invalid":
    case "invalid_credentials":
      return "Enter a valid email address.";
    case "invalid_login_credentials":
      return "The email or password is incorrect.";
    case "weak_password":
      return "Password must be at least 6 characters.";
    case "over_request_rate_limit":
    case "over_email_send_rate_limit":
      return "Too many attempts. Try again in a moment.";
    default:
      return error.message;
  }
}
