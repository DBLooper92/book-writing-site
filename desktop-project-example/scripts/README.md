# Scripts

These scripts are the safe automation surface for the project.

## Suggested Commands

Bootstrap a fresh local database when `sqlite3` is installed:

```powershell
.\scripts\bootstrap-project.ps1
```

Search readable canon:

```powershell
.\scripts\search-canon.ps1 -Query "Mara"
```

Run a SQL query:

```powershell
.\scripts\query-sqlite.ps1 -Sql "select id, title from timeline_events;"
```

Create a proposal scaffold from a brain dump:

```powershell
.\scripts\create-proposals.ps1 -BrainDumpPath "inbox/brain-dumps/arrival-outline.md"
```

Preview or apply an approved proposal:

```powershell
.\scripts\apply-approved.ps1 -ProposalPath "proposals/approved/example.json"
```

