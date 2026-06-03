param(
  [Parameter(Mandatory = $true)]
  [string]$Sql,
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

& $sqlite.Source -header -column $databasePath $Sql

