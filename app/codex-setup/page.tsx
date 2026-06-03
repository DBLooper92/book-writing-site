"use client";

import { useEffect, useState } from "react";

import { PageShell } from "@/components/layout/page-shell";
import type { DesktopCurrentProject } from "@/types/electron-api";

export default function CodexSetupPage() {
  const [project, setProject] = useState<DesktopCurrentProject | null>(null);

  useEffect(() => {
    void window.bookBible.project.getCurrent().then(setProject);
  }, []);

  return (
    <PageShell
      eyebrow="Codex Setup"
      title="Open This Project In Codex"
      description="Use Codex as the sidecar assistant for research, proposal drafting, and export inspection. The desktop app remains the canonical apply surface."
    >
      <section className="grid gap-6 lg:grid-cols-2">
        <SetupPanel title="Project folder">
          <p className="text-sm leading-6 text-zinc-700">
            {project?.path ?? "No local project is currently open."}
          </p>
        </SetupPanel>

        <SetupPanel title="Proposal workflow">
          <ul className="space-y-2 text-sm leading-6 text-zinc-700">
            <li>Read structured canon from <code>exports/</code>.</li>
            <li>Draft reviewable JSON files into <code>proposals/pending/</code>.</li>
            <li>Approve or reject proposals inside the desktop app.</li>
            <li>Apply approved bundles from the desktop app so SQLite stays authoritative.</li>
          </ul>
        </SetupPanel>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <SetupPanel title="Important folders">
          <ul className="space-y-2 text-sm leading-6 text-zinc-700">
            <li><code>{project?.folders.prompts ?? "prompts/"}</code> for generated prompt templates</li>
            <li><code>{project?.folders.inbox ?? "inbox/"}</code> for raw brain dumps and notes</li>
            <li><code>{project?.folders.proposals ?? "proposals/"}</code> for draft review bundles</li>
            <li><code>{project?.folders.exports ?? "exports/"}</code> for readable canon snapshots</li>
          </ul>
        </SetupPanel>

        <SetupPanel title="Operator reminders">
          <ul className="space-y-2 text-sm leading-6 text-zinc-700">
            <li>Do not edit SQLite directly from Codex.</li>
            <li>Keep proposal IDs readable and stable.</li>
            <li>Use additive patch keys like <code>summaryAppend</code> when extending canon.</li>
            <li>Regenerated exports will overwrite manual edits under <code>exports/</code>.</li>
          </ul>
        </SetupPanel>
      </section>
    </PageShell>
  );
}

function SetupPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold tracking-tight text-zinc-950">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}
