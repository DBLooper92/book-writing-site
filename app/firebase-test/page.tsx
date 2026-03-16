"use client";

import { useState } from "react";
import { FirebaseError } from "firebase/app";

import { app, auth, db } from "@/lib/firebase/client";
import { runFirestoreHealthcheck } from "@/lib/firebase/firestore";

type ReadState =
  | { status: "idle"; message: string }
  | { status: "success"; message: string }
  | { status: "error"; message: string };

const initialState: ReadState = {
  status: "idle",
  message: "No Firestore read attempted yet.",
};

export default function FirebaseTestPage() {
  const [readState, setReadState] = useState<ReadState>(initialState);
  const projectId = app.options.projectId ?? "Unknown";

  async function handleFirestoreCheck() {
    setReadState({
      status: "idle",
      message: "Checking Firestore...",
    });

    try {
      const result = await runFirestoreHealthcheck();

      setReadState({
        status: "success",
        message: result.empty
          ? "Firestore read succeeded. The __healthcheck collection is currently empty."
          : `Firestore read succeeded. Retrieved ${result.size} document result(s).`,
      });
    } catch (error) {
      if (error instanceof FirebaseError) {
        const permissionMessage =
          error.code === "permission-denied"
            ? "Firestore read was blocked by security rules."
            : "Firestore read failed.";

        setReadState({
          status: "error",
          message: `${permissionMessage} ${error.code}: ${error.message}`,
        });

        return;
      }

      setReadState({
        status: "error",
        message:
          error instanceof Error ? error.message : "Unknown Firestore read error.",
      });
    }
  }

  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-16 text-zinc-950">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <div className="space-y-2">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-zinc-500">
            Temporary Firebase Test Page
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">
            Firebase connection status
          </h1>
          <p className="text-sm leading-6 text-zinc-600">
            This page is isolated so you can verify client-side Firebase setup and
            delete it later. Firestore security rules may block reads until rules are
            configured in Firebase.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <StatusCard label="Firebase App" value="Initialized" />
          <StatusCard label="Project ID" value={projectId} />
          <StatusCard label="Firestore" value={db ? "Available" : "Missing"} />
          <StatusCard label="Auth" value={auth ? "Available" : "Missing"} />
        </div>

        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
          <p className="text-sm font-medium text-zinc-900">Firestore read test</p>
          <p className="mt-1 text-sm text-zinc-600">
            Reads up to one document from the <code>__healthcheck</code> collection
            without writing data.
          </p>

          <button
            type="button"
            onClick={handleFirestoreCheck}
            className="mt-4 inline-flex h-11 items-center justify-center rounded-full bg-zinc-950 px-5 text-sm font-medium text-white transition hover:bg-zinc-800"
          >
            Run Firestore read
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
      </div>
    </main>
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
