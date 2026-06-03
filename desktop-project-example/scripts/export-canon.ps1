param(
  [string]$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
)

$sqlite = Get-Command sqlite3 -ErrorAction SilentlyContinue
if (-not $sqlite) {
  throw "sqlite3 was not found on PATH. Install SQLite CLI first."
}

$databasePath = Join-Path $ProjectRoot "data/project.sqlite"
if (-not (Test-Path $databasePath)) {
  throw "Database not found at '$databasePath'. Run .\\scripts\\bootstrap-project.ps1 first."
}

$exportsDir = Join-Path $ProjectRoot "exports"
$charactersPath = Join-Path $exportsDir "canon/characters.md"
$locationsPath = Join-Path $exportsDir "canon/locations.md"
$timelinePath = Join-Path $exportsDir "timeline/chronology.md"

$characters = & $sqlite.Source -separator "`t" $databasePath "select id, display_name, role, summary from characters order by display_name;"
$locations = & $sqlite.Source -separator "`t" $databasePath "select id, name, location_type, summary from locations order by name;"
$timeline = & $sqlite.Source -separator "`t" $databasePath "select id, title, display_date_label, summary from timeline_events order by start_year, same_day_sequence, title;"

$characterLines = @("# Characters", "", "Generated from `data/project.sqlite`.", "Do not treat this file as the source of truth.", "")
foreach ($row in $characters) {
  $parts = $row -split "`t", 4
  $characterLines += "## $($parts[0])"
  $characterLines += ""
  $characterLines += "- Name: $($parts[1])"
  $characterLines += "- Role: $($parts[2])"
  $characterLines += "- Summary: $($parts[3])"
  $characterLines += ""
}

$locationLines = @("# Locations", "", "Generated from `data/project.sqlite`.", "Do not treat this file as the source of truth.", "")
foreach ($row in $locations) {
  $parts = $row -split "`t", 4
  $locationLines += "## $($parts[0])"
  $locationLines += ""
  $locationLines += "- Name: $($parts[1])"
  $locationLines += "- Type: $($parts[2])"
  $locationLines += "- Summary: $($parts[3])"
  $locationLines += ""
}

$timelineLines = @("# Chronology", "", "Generated from `data/project.sqlite`.", "Do not treat this file as the source of truth.", "")
foreach ($row in $timeline) {
  $parts = $row -split "`t", 4
  $timelineLines += "## $($parts[2])"
  $timelineLines += ""
  $timelineLines += "- ID: $($parts[0])"
  $timelineLines += "- Title: $($parts[1])"
  $timelineLines += "- Summary: $($parts[3])"
  $timelineLines += ""
}

Set-Content -Path $charactersPath -Value ($characterLines -join "`r`n")
Set-Content -Path $locationsPath -Value ($locationLines -join "`r`n")
Set-Content -Path $timelinePath -Value ($timelineLines -join "`r`n")

Write-Host "Regenerated readable exports under $exportsDir"
