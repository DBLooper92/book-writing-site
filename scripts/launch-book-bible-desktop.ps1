$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

$desktopDir = [Environment]::GetFolderPath("DesktopDirectory")
$logPath = Join-Path $desktopDir "Launch BookBible Desktop.log"

function Write-LaunchLog {
  param([string]$Message)

  $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
  Add-Content -LiteralPath $logPath -Value "[$timestamp] $Message"
}

function Show-LaunchFailure {
  param(
    [string]$Title,
    [string]$Message
  )

  try {
    Add-Type -AssemblyName System.Windows.Forms | Out-Null
    [System.Windows.Forms.MessageBox]::Show(
      $Message,
      $Title,
      [System.Windows.Forms.MessageBoxButtons]::OK,
      [System.Windows.Forms.MessageBoxIcon]::Error
    ) | Out-Null
  } catch {
    Write-Host $Message -ForegroundColor Red
  }
}

Set-Content -LiteralPath $logPath -Value "" -Encoding UTF8
Write-LaunchLog "Starting production-like BuildaBook preview from $repoRoot"

$binDir = Join-Path $repoRoot "node_modules\.bin"
$nextCommand = Join-Path $binDir "next.cmd"
$electronCommand = Join-Path $binDir "electron.cmd"

if (-not (Test-Path $binDir)) {
  $message = "Local node_modules\.bin is missing. Run npm install before launching the app.`nLog: $logPath"
  Write-LaunchLog $message
  Show-LaunchFailure -Title "Launch BookBible Desktop" -Message $message
  exit 1
}

if (-not (Test-Path $nextCommand)) {
  $message = "Next.js is missing from node_modules\.bin. Run npm install before launching the app.`nLog: $logPath"
  Write-LaunchLog $message
  Show-LaunchFailure -Title "Launch BookBible Desktop" -Message $message
  exit 1
}

if (-not (Test-Path $electronCommand)) {
  $message = "Electron is missing from node_modules\.bin. Run npm install before launching the app.`nLog: $logPath"
  Write-LaunchLog $message
  Show-LaunchFailure -Title "Launch BookBible Desktop" -Message $message
  exit 1
}

$env:PATH = "$binDir;$env:PATH"
$env:NODE_ENV = "production"

try {
  Write-LaunchLog "Building renderer with next build"
  Write-Host "Building BuildaBook for a production-like preview..." -ForegroundColor Cyan
  & $nextCommand build

  if ($LASTEXITCODE -ne 0) {
    throw "next build exited with code $LASTEXITCODE"
  }

  $standaloneRoot = Join-Path $repoRoot ".next\standalone"
  $standaloneStaticDir = Join-Path $standaloneRoot ".next\static"
  $standalonePublicDir = Join-Path $standaloneRoot "public"
  $sourceStaticDir = Join-Path $repoRoot ".next\static"
  $sourcePublicDir = Join-Path $repoRoot "public"

  if (Test-Path $sourceStaticDir) {
    New-Item -ItemType Directory -Force -Path $standaloneStaticDir | Out-Null
    Copy-Item -Path (Join-Path $sourceStaticDir "*") -Destination $standaloneStaticDir -Recurse -Force
    Write-LaunchLog "Copied .next/static into standalone runtime"
  }

  if (Test-Path $sourcePublicDir) {
    New-Item -ItemType Directory -Force -Path $standalonePublicDir | Out-Null
    Copy-Item -Path (Join-Path $sourcePublicDir "*") -Destination $standalonePublicDir -Recurse -Force
    Write-LaunchLog "Copied public into standalone runtime"
  }

  Write-LaunchLog "Starting Electron preview"
  Write-Host "Launching BuildaBook preview..." -ForegroundColor Cyan
  & $electronCommand .

  if ($LASTEXITCODE -ne 0) {
    throw "electron exited with code $LASTEXITCODE"
  }
  Write-LaunchLog "Electron preview closed normally"
} catch {
  $failureMessage = $_.Exception.Message
  Write-LaunchLog "FAILED: $failureMessage"
  Show-LaunchFailure -Title "Launch BookBible Desktop" -Message "$failureMessage`n`nSee log: $logPath"
  exit 1
}
