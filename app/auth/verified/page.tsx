"use client";

import Link from "next/link";
import { useEffect } from "react";

import { PageShell } from "@/components/layout/page-shell";
import { signOutCurrentUser } from "@/lib/auth";

export default function VerifiedEmailPage() {
  useEffect(() => {
    void signOutCurrentUser().catch(() => {
      // The confirmation link may or may not create a session. Ignore sign-out failures.
    });
  }, []);

  return (
    <PageShell
      eyebrow="Email Confirmed"
      title="Thanks for verifying!"
      description="Your email address is confirmed. Continue to the sign-in page and log in with your email and password."
    >
      <section className="rounded-4xl border border-zinc-200 bg-white p-8 shadow-sm">
        <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6 text-sm leading-6 text-emerald-900">
          <p className="font-medium">Thanks for verifying your email.</p>
          <p className="mt-3">
            Your account is now ready. Use the button below to go to the login screen.
          </p>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/auth"
            className="inline-flex h-11 items-center justify-center rounded-full bg-zinc-950 px-5 text-sm font-medium text-white transition hover:bg-zinc-800"
          >
            Go to sign in
          </Link>
          <Link
            href="/"
            className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-200 px-5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
          >
            Back home
          </Link>
        </div>
      </section>
    </PageShell>
  );
}

