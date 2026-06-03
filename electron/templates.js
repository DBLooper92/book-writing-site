const fs = require("fs");
const path = require("path");

const PROJECT_DIRECTORIES = [
  "data",
  "data/migrations",
  "attachments",
  "attachments/images",
  "attachments/documents",
  "exports",
  "exports/canon",
  "exports/manuscript",
  "exports/timeline",
  "exports/indexes",
  "inbox",
  "inbox/brain-dumps",
  "prompts",
  "proposals",
  "proposals/pending",
  "proposals/approved",
  "proposals/rejected",
  "proposals/applied",
  "scripts",
];

const PROMPT_TEMPLATES = {
  "brain-dump-ingestion.md": `# Brain Dump Ingestion

You are reading raw story notes for this project.

1. Use the exported canon under \`exports/\` as the reference baseline.
2. Read the brain dump under \`inbox/brain-dumps/\`.
3. Draft a reviewable JSON proposal into \`proposals/pending/\`.
4. Do not apply canon changes directly.
`,
  "canon-update-proposal.md": `# Canon Update Proposal

Every proposal file must include:

- \`id\`
- \`projectId\`
- \`createdAt\`
- \`sourceFile\`
- \`status\`
- \`summary\`
- \`proposedChanges[]\`

Each proposed change must include:

- \`slice\`
- \`action\`
- \`targetId\`
- \`confidence\`
- \`reason\`
- \`fields\`
`,
  "draft-writing-rules.md": `# Draft Writing Rules

- Prefer readable IDs.
- Keep summaries concise and reviewable.
- Use additive patches like \`summaryAppend\` when extending existing canon.
- Do not write directly into SQLite.
- Wait for explicit app approval before apply.
`,
  "reference-lookup.md": `# Reference Lookup

- Use \`exports/canon/\` first for fast canon review.
- Use \`exports/timeline/\` for chronology.
- Use \`scripts/query-sqlite.ps1\` when exact structured values are needed.
`,
};

function ensureDir(directoryPath) {
  fs.mkdirSync(directoryPath, { recursive: true });
}

function ensureTextFile(filePath, content) {
  ensureDir(path.dirname(filePath));

  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, content, "utf8");
  }
}

function buildProjectManifest({ projectId, projectSlug, title }) {
  return {
    id: projectId,
    slug: projectSlug,
    title,
    createdAt: new Date().toISOString(),
    templateVersion: 1,
    storage: {
      databaseFile: "data/project.sqlite",
      migrationsDir: "data/migrations",
      attachmentsDir: "attachments",
      exportsDir: "exports",
      proposalsDir: "proposals",
    },
    workflow: {
      proposalMode: "review-first",
      applyMode: "explicit-approval-only",
      defaultExportFormat: "markdown-and-json",
    },
    chronology: {
      calendarLabel: "Common Reckoning",
      yearZeroAllowed: false,
    },
  };
}

function buildAgentsFile() {
  return `# AGENTS.md

## Purpose

This project folder is a local-first writing workspace for one story project.

The desktop app is the editor and SQLite owner.
Codex is a sidecar assistant that can read project files, search exports, draft proposal files, and help apply approved changes through scripts.

## Source Of Truth

- Canonical structured data lives in \`data/project.sqlite\`
- Readable AI context lives in generated files under \`exports/\`
- Raw user input lives under \`inbox/\`
- Review-first AI output lives under \`proposals/\`

Do not treat Markdown exports as the source of truth.
Do not edit exports directly unless the user explicitly asks for a manual correction and understands it will be overwritten.

## Safety Rules

1. Do not mutate the database by hand when a script exists.
2. Do not apply canon changes without an approved proposal.
3. Prefer generating a proposal file over directly editing structured records.
4. Keep IDs readable and stable.
5. Keep one project per folder. The folder boundary is the project scope.
6. Attachments stay on disk and are referenced from the database by relative path.
`;
}

function buildBootstrapScript() {
  return `param(
  [string]$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
)

Write-Host "The desktop app owns SQLite bootstrap for this project."
Write-Host "Open the project in Book Bible Desktop to initialize or repair the local database."
`;
}

function buildCreateProposalScript(projectId) {
  return `param(
  [Parameter(Mandatory = $true)]
  [string]$BrainDumpPath,
  [string]$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
)

$resolvedBrainDumpPath = Join-Path $ProjectRoot $BrainDumpPath
if (-not (Test-Path $resolvedBrainDumpPath)) {
  throw "Brain dump file not found at '$resolvedBrainDumpPath'."
}

$timestamp = Get-Date -Format "yyyy-MM-dd-HHmmss"
$proposalPath = Join-Path $ProjectRoot "proposals/pending/$timestamp-generated-proposal.json"
$excerpt = (Get-Content $resolvedBrainDumpPath -Raw).Trim()
if ($excerpt.Length -gt 280) {
  $excerpt = $excerpt.Substring(0, 280)
}

$proposal = [ordered]@{
  id = "proposal-$timestamp"
  projectId = "${projectId}"
  createdAt = (Get-Date).ToString("o")
  sourceFile = $BrainDumpPath
  status = "pending-review"
  summary = "Replace this placeholder summary with a reviewed summary."
  proposedChanges = @(
    [ordered]@{
      slice = "locations"
      action = "create"
      targetId = "replace-with-readable-id"
      confidence = "low"
      reason = "Replace this placeholder with the real reasoning."
      fields = [ordered]@{
        name = "Replace with title"
        summary = $excerpt
      }
    }
  )
}

$proposal | ConvertTo-Json -Depth 10 | Set-Content -Path $proposalPath
Write-Host "Created proposal scaffold at $proposalPath"
`;
}

function buildSearchCanonScript() {
  return `param(
  [Parameter(Mandatory = $true)]
  [string]$Query,
  [string]$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
)

Get-ChildItem (Join-Path $ProjectRoot "exports") -Recurse -File |
  Select-String -Pattern $Query -SimpleMatch
`;
}

function buildQuerySqliteScript() {
  return `param(
  [Parameter(Mandatory = $true)]
  [string]$Sql,
  [string]$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
)

$sqlite = Get-Command sqlite3 -ErrorAction SilentlyContinue
if (-not $sqlite) {
  throw "sqlite3 was not found on PATH. Install SQLite CLI first."
}

$databasePath = Join-Path $ProjectRoot "data/project.sqlite"
& $sqlite.Source $databasePath $Sql
`;
}

function buildExportCanonScript() {
  return `param(
  [string]$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
)

Write-Host "Use the desktop app's Export action to regenerate canon files."
Write-Host "Project root: $ProjectRoot"
`;
}

function buildApplyApprovedScript() {
  return `param(
  [Parameter(Mandatory = $true)]
  [string]$ProposalPath,
  [string]$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
)

Write-Host "Approved proposals are applied by the desktop app."
Write-Host "Review the proposal at: $ProposalPath"
`;
}

function buildScriptsReadme() {
  return `# Scripts

These scripts are operator helpers for a desktop-managed project.

- \`search-canon.ps1\`: search generated exports
- \`query-sqlite.ps1\`: run ad hoc SQL if SQLite CLI is installed
- \`export-canon.ps1\`: reminder entry point for export regeneration
- \`create-proposals.ps1\`: generate a proposal scaffold from a brain dump
- \`apply-approved.ps1\`: reminder entry point for desktop apply
`;
}

function buildMigrationFile() {
  return `-- Desktop document-store migration placeholder.
-- The desktop app owns live schema creation through Electron services.
-- Tables: projects, books, chapters, scenes, characters, relationships,
-- factions, cultures, religions, governments, organizations, plot_threads,
-- outlines, glossary_terms, eras, themes, languages, species, items,
-- technologies, locations, timeline_events, notes, retcons, attachments.
`;
}

function buildReadme(title) {
  return `# ${title}

This folder is a local-first Book Bible project.

- Open it in Book Bible Desktop to edit canon.
- Use Codex against this folder for search, proposal drafting, and review support.
- Review generated proposals in the desktop app before apply.
`;
}

function writeProjectFiles(projectRoot, manifest) {
  ensureTextFile(path.join(projectRoot, "README.md"), buildReadme(manifest.title));
  ensureTextFile(path.join(projectRoot, "AGENTS.md"), buildAgentsFile());
  ensureTextFile(
    path.join(projectRoot, "project.json"),
    JSON.stringify(manifest, null, 2) + "\n"
  );
  ensureTextFile(
    path.join(projectRoot, "data", "migrations", "0001_initial_document_tables.sql"),
    buildMigrationFile()
  );
  ensureTextFile(path.join(projectRoot, "scripts", "README.md"), buildScriptsReadme());
  ensureTextFile(path.join(projectRoot, "scripts", "bootstrap-project.ps1"), buildBootstrapScript());
  ensureTextFile(
    path.join(projectRoot, "scripts", "create-proposals.ps1"),
    buildCreateProposalScript(manifest.id)
  );
  ensureTextFile(path.join(projectRoot, "scripts", "search-canon.ps1"), buildSearchCanonScript());
  ensureTextFile(path.join(projectRoot, "scripts", "query-sqlite.ps1"), buildQuerySqliteScript());
  ensureTextFile(path.join(projectRoot, "scripts", "export-canon.ps1"), buildExportCanonScript());
  ensureTextFile(path.join(projectRoot, "scripts", "apply-approved.ps1"), buildApplyApprovedScript());

  Object.entries(PROMPT_TEMPLATES).forEach(([fileName, content]) => {
    ensureTextFile(path.join(projectRoot, "prompts", fileName), content);
  });
}

function ensureProjectScaffold({ projectRoot, projectId, projectSlug, title }) {
  PROJECT_DIRECTORIES.forEach((directoryName) => {
    ensureDir(path.join(projectRoot, directoryName));
  });

  const manifest = buildProjectManifest({
    projectId,
    projectSlug,
    title,
  });

  writeProjectFiles(projectRoot, manifest);
  return manifest;
}

module.exports = {
  ensureProjectScaffold,
};
