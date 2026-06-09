$ErrorActionPreference = "Stop"
$env:BOOK_BIBLE_SKIP_RESTORE_CURRENT_PROJECT = "1"

$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

$binDir = Join-Path $repoRoot "node_modules\.bin"
$startDevScript = Join-Path $repoRoot "scripts\start-dev.js"
$nodeCommand = Get-Command node.exe -ErrorAction SilentlyContinue

if (-not $nodeCommand) {
  $nodeCommand = Get-Command node -ErrorAction SilentlyContinue
}

if (-not $nodeCommand) {
  throw "Node.js was not found in PATH. Install Node.js or add it to PATH before launching the app."
}

if (-not (Test-Path $binDir)) {
  throw "Local node_modules\.bin is missing. Run npm install before launching the app."
}

$env:PATH = "$binDir;$env:PATH"

Write-Host "Launching Book Bible Desktop in dev mode from $repoRoot" -ForegroundColor Cyan

& $nodeCommand.Source $startDevScript

if ($LASTEXITCODE -ne 0) {
  exit $LASTEXITCODE
}
