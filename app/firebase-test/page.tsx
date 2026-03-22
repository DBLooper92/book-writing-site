"use client";

import { useState } from "react";
import { PostgrestError } from "@supabase/supabase-js";

import { PageShell } from "@/components/layout/page-shell";
import { runSupabaseHealthcheck } from "@/lib/supabase/healthcheck";

type ReadState =
  | { status: "idle"; message: string }
  | { status: "success"; message: string }
  | { status: "error"; message: string };

const initialState: ReadState = {
  status: "idle",
  message: "No backend read attempted yet.",
};

export default function BackendTestPage() {
  const [readState, setReadState] = useState<ReadState>(initialState);

  async function handleBackendCheck() {
    setReadState({
      status: "idle",
      message: "Checking Supabase...",
    });

    try {
      const result = await runSupabaseHealthcheck();

      setReadState({
        status: "success",
        message: result.empty
          ? "Supabase read succeeded. The projects table is currently empty for this client context."
          : `Supabase read succeeded. Retrieved ${result.size} project result(s).`,
      });
    } catch (error) {
      if (error instanceof PostgrestError) {
        const permissionMessage =
          error.code === "42501"
            ? "Supabase read was blocked by database permissions."
            : "Supabase read failed.";

        setReadState({
          status: "error",
          message: `${permissionMessage} ${error.code}: ${error.message}`,
        });

        return;
      }

      setReadState({
        status: "error",
        message: error instanceof Error ? error.message : "Unknown Supabase read error.",
      });
    }
  }

  return (
    <PageShell
      eyebrow="Temporary Backend Test"
      title="Supabase connection status"
      description="Use this page to confirm the client app can reach the configured Supabase project and read a lightweight project query."
    >
      <section className="rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-2">
          <StatusCard label="Backend" value="Supabase" />
          <StatusCard label="Read target" value="projects" />
        </div>

        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
          <p className="text-sm font-medium text-zinc-900">Supabase read test</p>
          <p className="mt-1 text-sm text-zinc-600">
            Reads up to one row from the <code>projects</code> table without writing
            data.
          </p>

          <button
            type="button"
            onClick={handleBackendCheck}
            className="mt-4 inline-flex h-11 items-center justify-center rounded-full bg-zinc-950 px-5 text-sm font-medium text-white transition hover:bg-zinc-800"
          >
            Run Supabase read
          </button>

          <p
            className={`mt-4 rounded-lg px-3 py-2 text-sm ${
              readState.status === "success"
                ? "bg-emerald-50 text-emerald-700"
                : readState.status === "error"
                  ? "bg-red-50 text-red-700"
                  : "bg-zinc-100 text-zinc-700"
            }`}
          >
            {readState.message}
          </p>
        </div>
      </section>
    </PageShell>
  );
}

function StatusCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 p-4">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
        {label}
      </p>
      <p className="mt-2 text-lg font-semibold text-zinc-950">{value}</p>
    </div>
  );
}
