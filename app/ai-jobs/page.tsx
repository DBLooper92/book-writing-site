"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { PageShell } from "@/components/layout/page-shell";
import { useActiveProject } from "@/hooks/use-active-project";
import type { AiJobSummary, BrainDumpValidationReport } from "@/types/ai-brain-dump";

export default function AiJobsPage() {
  const { activeProject, activeProjectId, user, loading: projectLoading } = useActiveProject();
  const [jobs, setJobs] = useState<AiJobSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelingJobId, setCancelingJobId] = useState<string | null>(null);
  const [validationReports, setValidationReports] = useState<
    Array<{ createdAt: string; id: string; path: string; projectId: string }>
  >([]);
  const [runningValidation, setRunningValidation] = useState(false);
  const [latestValidationReport, setLatestValidationReport] =
    useState<BrainDumpValidationReport | null>(null);

  useEffect(() => {
    if (!activeProjectId) {
      setJobs([]);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function loadJobs() {
      try {
        const [nextJobs, nextReports] = await Promise.all([
          window.bookBible.ai.listJobs(),
          window.bookBible.ai.listValidationReports(),
        ]);

        if (cancelled) {
          return;
        }

        setJobs(nextJobs);
        setValidationReports(nextReports);
        setError(null);
      } catch (nextError) {
        if (cancelled) {
          return;
        }

        setError(nextError instanceof Error ? nextError.message : "Unable to load AI jobs.");
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    setLoading(true);
    void loadJobs();
    const unsubscribe = window.bookBible.ai.subscribeJobs(() => {
      void loadJobs();
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [activeProjectId]);

  async function handleCancel(jobId: string) {
    setCancelingJobId(jobId);
    try {
      await window.bookBible.ai.cancelJob(jobId);
    } catch (nextError) {
      window.alert(nextError instanceof Error ? nextError.message : "Unable to cancel AI job.");
    } finally {
      setCancelingJobId(null);
    }
  }

  async function handleRunValidationSuite() {
    setRunningValidation(true);
    setError(null);

    try {
      const report = await window.bookBible.ai.runBrainDumpValidationSuite({
        budgetUsd: 10,
      });
      setLatestValidationReport(report);
      setValidationReports((current) => [
        {
          createdAt: report.createdAt,
          id: report.id,
          path: report.path,
          projectId: report.projectId,
        },
        ...current.filter((entry) => entry.id !== report.id),
      ]);
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Unable to run the brain dump validation suite."
      );
    } finally {
      setRunningValidation(false);
    }
  }

  return (
    <PageShell
      eyebrow="AI Jobs"
      title="Background AI Timeline Jobs"
      description="Track large multi-event brain dumps, then open each completed job to review extracted events and apply them into the timeline."
    >
      {!user ? (
        <StateCard>Sign in first to view project AI jobs.</StateCard>
      ) : projectLoading ? (
        <StateCard>Loading project context...</StateCard>
      ) : !activeProjectId || !activeProject ? (
        <StateCard>No active project selected.</StateCard>
      ) : loading ? (
        <StateCard>Loading AI jobs for {activeProject.title}...</StateCard>
      ) : jobs.length === 0 ? (
        <section className="space-y-4">
          <article className="rounded-3xl border border-zinc-200 bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold tracking-tight text-zinc-950">
                  Sandbox Validation Suite
                </h2>
                <p className="mt-2 text-sm text-zinc-600">
                  Runs 24 messy horror-trilogy brain dump scenarios in a new sandbox project and
                  writes real timeline records plus a JSON quality report.
                </p>
              </div>
              <button
                type="button"
                onClick={() => void handleRunValidationSuite()}
                disabled={runningValidation}
                className="inline-flex h-10 items-center justify-center rounded-full bg-zinc-950 px-4 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-300"
              >
                {runningValidation ? "Running..." : "Run Validation Suite"}
              </button>
            </div>
            {error ? (
              <p className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            ) : null}
          </article>
          <StateCard>No AI jobs yet. Start one from Timeline &gt; Create timeline event &gt; AI Multi-Event.</StateCard>
          {latestValidationReport ? <ValidationReportCard report={latestValidationReport} /> : null}
          {validationReports.length > 0 ? (
            <article className="rounded-3xl border border-zinc-200 bg-white p-5">
              <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-zinc-500">
                Validation Reports
              </h3>
              <ul className="mt-3 space-y-2 text-sm text-zinc-700">
                {validationReports.map((report) => (
                  <li key={report.id}>
                    {report.id} · {new Date(report.createdAt).toLocaleString()}
                  </li>
                ))}
              </ul>
            </article>
          ) : null}
        </section>
      ) : (
        <section className="grid gap-4">
          <article className="rounded-3xl border border-zinc-200 bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold tracking-tight text-zinc-950">
                  Sandbox Validation Suite
                </h2>
                <p className="mt-2 text-sm text-zinc-600">
                  Budget-capped deep-dive runner for single + multi-event brain dump quality that
                  materializes sandbox timeline and slice data.
                </p>
              </div>
              <button
                type="button"
                onClick={() => void handleRunValidationSuite()}
                disabled={runningValidation}
                className="inline-flex h-10 items-center justify-center rounded-full bg-zinc-950 px-4 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-300"
              >
                {runningValidation ? "Running..." : "Run Validation Suite"}
              </button>
            </div>
            {error ? (
              <p className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            ) : null}
          </article>
          {latestValidationReport ? <ValidationReportCard report={latestValidationReport} /> : null}
          {jobs.map((job) => {
            const isTerminal =
              job.status === "completed" ||
              job.status === "failed" ||
              job.status === "failed-needs-rerun" ||
              job.status === "canceled";

            return (
              <article
                key={job.id}
                className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-base font-semibold tracking-tight text-zinc-950">{job.title}</h2>
                    <p className="mt-2 text-xs uppercase tracking-[0.18em] text-zinc-500">
                      Created {new Date(job.createdAt).toLocaleString()}
                    </p>
                    <p className="mt-1 text-xs uppercase tracking-[0.18em] text-zinc-500">
                      Updated {new Date(job.updatedAt).toLocaleString()}
                    </p>
                  </div>
                  <span className={getStatusClassName(job.status)}>{job.status}</span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link
                    href={`/ai-jobs/${job.id}`}
                    className="inline-flex h-10 items-center justify-center rounded-full border border-zinc-200 px-4 text-sm font-medium text-zinc-800 transition hover:bg-zinc-50"
                  >
                    Open job
                  </Link>
                  {!isTerminal ? (
                    <button
                      type="button"
                      onClick={() => void handleCancel(job.id)}
                      disabled={cancelingJobId === job.id}
                      className="inline-flex h-10 items-center justify-center rounded-full border border-red-200 px-4 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {cancelingJobId === job.id ? "Canceling..." : "Cancel job"}
                    </button>
                  ) : null}
                </div>
              </article>
            );
          })}
        </section>
      )}
    </PageShell>
  );
}

function ValidationReportCard({ report }: { report: BrainDumpValidationReport }) {
  return (
    <article className="rounded-3xl border border-zinc-200 bg-white p-5">
      <h3 className="text-base font-semibold tracking-tight text-zinc-950">
        Latest Validation Report
      </h3>
      <p className="mt-2 text-sm text-zinc-600">
        Mapping correctness {report.metrics.mappingCorrectnessPct}% · Scenario pass{" "}
        {report.metrics.scenarioPassPct}%.
      </p>
      <p className="mt-1 text-sm text-zinc-600">
        Estimated cost ${report.costGuardrail.estimatedCostUsd.toFixed(4)} of $
        {report.costGuardrail.budgetUsd.toFixed(2)} budget.
      </p>
      <p className="mt-1 text-sm text-zinc-600">
        Passed {report.totals.passed} / {report.totals.scenarios} scenarios.
      </p>
      <p className="mt-1 text-sm text-zinc-600">
        Original brain dump text is preserved on each scenario result for failed reruns and manual review.
      </p>
    </article>
  );
}

function StateCard({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "error";
}) {
  return (
    <section
      className={`rounded-3xl border p-6 text-sm leading-6 ${
        tone === "error"
          ? "border-red-200 bg-red-50 text-red-700"
          : "border-zinc-300 bg-zinc-50 text-zinc-600"
      }`}
    >
      {children}
    </section>
  );
}

function getStatusClassName(status: string) {
  if (status === "completed") {
    return "rounded-full bg-emerald-100 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-800";
  }

  if (status === "running" || status === "queued") {
    return "rounded-full bg-blue-100 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-800";
  }

  if (status === "canceled") {
    return "rounded-full bg-zinc-200 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-700";
  }

  return "rounded-full bg-red-100 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-red-700";
}
