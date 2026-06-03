$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

$binDir = Join-Path $repoRoot "node_modules\.bin"
$nodeCommand = Get-Command node.exe -ErrorAction SilentlyContinue

if (-not $nodeCommand) {
  $nodeCommand = Get-Command node -ErrorAction SilentlyContinue
}

$nodeAvailable = [bool]$nodeCommand
$npmCommand = Get-Command npm.cmd -ErrorAction SilentlyContinue

if (-not $npmCommand) {
  $npmCommand = Get-Command npm -ErrorAction SilentlyContinue
}

if (-not $npmCommand) {
  if (-not (Test-Path $binDir)) {
    throw "npm was not found in PATH and local node_modules\.bin is missing. Install dependencies before launching the app."
  }

  if (-not $nodeAvailable) {
    throw "Node.js was not found in PATH, so the local dev shims cannot run. Install Node.js or add it to PATH."
  }

  Write-Host "npm was not found in PATH, so using local node_modules\.bin shims from $binDir" -ForegroundColor Yellow
  $env:PATH = "$binDir;$env:PATH"

  $concurrentlyCommand = Get-Command concurrently.cmd -ErrorAction SilentlyContinue

  if (-not $concurrentlyCommand) {
    throw "Could not find a runnable dev toolchain in node_modules\.bin. Run npm install, then try again."
  }

  Write-Host "Launching Book Bible Desktop in dev mode from $repoRoot" -ForegroundColor Cyan

  & $concurrentlyCommand.Source -k "next dev" "wait-on http://127.0.0.1:3000 && cross-env NODE_ENV=development ELECTRON_RENDERER_URL=http://127.0.0.1:3000 electron ."

  if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
  }

  exit 0
}

Write-Host "Launching Book Bible Desktop in dev mode from $repoRoot" -ForegroundColor Cyan

& $npmCommand.Source run dev

if ($LASTEXITCODE -ne 0) {
  exit $LASTEXITCODE
}
