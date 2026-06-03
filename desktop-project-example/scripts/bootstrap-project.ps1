param(
  [string]$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
)

$sqlite = Get-Command sqlite3 -ErrorAction SilentlyContinue
if (-not $sqlite) {
  throw "sqlite3 was not found on PATH. Install SQLite CLI first."
}

$dataDir = Join-Path $ProjectRoot "data"
$databasePath = Join-Path $dataDir "project.sqlite"

if (Test-Path $databasePath) {
  throw "Database already exists at '$databasePath'. Remove it manually if you want to recreate it."
}

$migrationOne = Join-Path $dataDir "migrations/0001_initial_schema.sql"
$migrationTwo = Join-Path $dataDir "migrations/0002_seed_reference_data.sql"

Get-Content $migrationOne -Raw | & $sqlite.Source $databasePath
Get-Content $migrationTwo -Raw | & $sqlite.Source $databasePath

Write-Host "Created SQLite database at $databasePath"

