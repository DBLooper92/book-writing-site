param(
  [Parameter(Mandatory = $true)]
  [string]$ProposalPath,
  [switch]$Execute,
  [string]$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
)

$resolvedProposalPath = Join-Path $ProjectRoot $ProposalPath
if (-not (Test-Path $resolvedProposalPath)) {
  throw "Proposal file not found at '$resolvedProposalPath'."
}

$proposal = Get-Content $resolvedProposalPath -Raw | ConvertFrom-Json
if ($proposal.status -ne "approved") {
  throw "Proposal status must be 'approved' before apply. Current status: '$($proposal.status)'."
}

$previewLines = @(
  "-- Apply preview generated from $ProposalPath",
  "-- Review each statement before execution.",
  ""
)

foreach ($change in $proposal.proposedChanges) {
  switch ($change.slice) {
    "locations" {
      if ($change.action -eq "create") {
        $previewLines += "INSERT INTO locations (id, name, location_type, summary, parent_location_id, created_at, updated_at)"
        $previewLines += "VALUES ('$($change.targetId)', '$($change.fields.name)', '$($change.fields.location_type)', '$($change.fields.summary)', NULL, datetime('now'), datetime('now'));"
        $previewLines += ""
      }
    }
    "timeline_events" {
      if ($change.action -eq "create") {
        $previewLines += "INSERT INTO timeline_events (id, title, summary, start_year, same_day_sequence, display_date_label, created_at, updated_at)"
        $previewLines += "VALUES ('$($change.targetId)', '$($change.fields.title)', '$($change.fields.summary)', $($change.fields.start_year), 0, '$($change.fields.display_date_label)', datetime('now'), datetime('now'));"
        $previewLines += ""
      }
    }
    default {
      $previewLines += "-- No automatic SQL mapper implemented for slice '$($change.slice)'."
      $previewLines += ""
    }
  }
}

$previewPath = [System.IO.Path]::ChangeExtension($resolvedProposalPath, ".apply-preview.sql")
Set-Content -Path $previewPath -Value ($previewLines -join "`r`n")
Write-Host "Wrote apply preview to $previewPath"

if (-not $Execute) {
  Write-Host "Dry run only. Re-run with -Execute after reviewing the SQL."
  exit 0
}

$sqlite = Get-Command sqlite3 -ErrorAction SilentlyContinue
if (-not $sqlite) {
  throw "sqlite3 was not found on PATH. Install SQLite CLI first."
}

$databasePath = Join-Path $ProjectRoot "data/project.sqlite"
if (-not (Test-Path $databasePath)) {
  throw "Database not found at '$databasePath'."
}

Get-Content $previewPath -Raw | & $sqlite.Source $databasePath
Write-Host "Applied preview SQL to $databasePath"
