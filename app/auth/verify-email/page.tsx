import Link from "next/link";

import { PageShell } from "@/components/layout/page-shell";

type VerifyEmailPageProps = {
  searchParams: Promise<{
    email?: string | string[];
  }>;
};

export default async function VerifyEmailPage({
  searchParams,
}: VerifyEmailPageProps) {
  const resolvedSearchParams = await searchParams;
  const emailParam = resolvedSearchParams.email;
  const email =
    typeof emailParam === "string"
      ? emailParam.trim()
      : Array.isArray(emailParam)
        ? emailParam[0]?.trim() ?? ""
        : "";

  return (
    <PageShell
      eyebrow="Account Verification"
      title="Verify your email"
      description="Your account was created. Confirm your email address before you try to sign in."
    >
      <section className="rounded-4xl border border-zinc-200 bg-white p-8 shadow-sm">
        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6 text-sm leading-6 text-amber-900">
          <p className="font-medium">
            Check your inbox and open the verification link from Supabase.
          </p>
          <p className="mt-3">
            {email
              ? `We sent the verification email to ${email}.`
              : "We sent a verification email to the address you just used."}
          </p>
          <p className="mt-3">
            After you verify your email, come back and sign in from the auth page.
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

