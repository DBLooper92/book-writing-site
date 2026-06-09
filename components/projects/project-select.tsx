"use client";

import type { UserProject } from "@/lib/data/projects";

type ProjectSelectProps = {
  projects: UserProject[];
  activeProjectPath: string | null;
  loading: boolean;
  disabled?: boolean;
  compact?: boolean;
  label?: string;
  onChange: (projectPath: string) => void;
};

export function ProjectSelect({
  projects,
  activeProjectPath,
  loading,
  disabled = false,
  compact = false,
  label = "Active project",
  onChange,
}: ProjectSelectProps) {
  const selectDisabled = disabled || loading || projects.length === 0;

  return (
    <label className={`flex ${compact ? "min-w-[15rem]" : "w-full"} flex-col gap-2`}>
      <span className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
        {label}
      </span>
      <select
        value={activeProjectPath ?? ""}
        disabled={selectDisabled}
        onChange={(event) => onChange(event.target.value)}
        className={`h-10 rounded-2xl border border-zinc-200 bg-white px-4 text-sm text-zinc-900 outline-none transition focus:border-zinc-400 disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-500 ${
          compact ? "min-w-[15rem]" : "w-full"
        }`}
      >
        {projects.length === 0 ? (
          <option value="">No projects yet</option>
        ) : activeProjectPath ? null : (
          <option value="">Select a project</option>
        )}
        {projects.map((project) => (
          <option key={project.path} value={project.path}>
            {project.title}
          </option>
        ))}
      </select>
    </label>
  );
}
