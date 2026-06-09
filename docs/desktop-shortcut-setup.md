# Desktop Shortcut Setup

This note records the local Windows desktop-launch setup created on 2026-06-03.

## What Was Done On This PC

The desktop shortcut originally opened a blank terminal and closed because the normal Windows environment did not have `npm` available, and the repo did not have `node_modules` installed yet.

To fix that, a machine-local Node/npm runtime was installed outside the repo:

```text
C:\Users\drone\AppData\Local\BookBibleDesktopRuntime\node-v22.22.3-win-x64
```

Then repo dependencies were installed:

```powershell
npm install
```

That also ran the repo `postinstall` script and rebuilt Electron native dependencies, including `better-sqlite3`.

Finally, a desktop shortcut was created:

```text
C:\Users\drone\OneDrive\Travel Desktop\Book Bible Desktop.lnk
```

The shortcut launches:

```powershell
scripts\launch-book-bible-desktop-dev.ps1
```

It prepends the portable Node/npm folder to `PATH`, uses the tracked icon at `build/icon.ico`, keeps the PowerShell window open so launch errors stay visible, starts the app on the launcher instead of restoring the last project automatically, and chooses a free local port so Next.js and Electron stay on the same URL through `scripts/start-dev.js`.

## What Is In Git

The repo already contains the launch script and icon:

- `scripts/launch-book-bible-desktop-dev.ps1`
- `build/icon.ico`

This documentation file is tracked so the setup can be repeated on another computer.

## What Is Not In Git

These are machine-local and should not be committed:

- `node_modules/`
- the portable Node runtime under `%LOCALAPPDATA%\BookBibleDesktopRuntime`
- the desktop `.lnk` file

## How To Recreate On Another Windows PC

After pulling the repo on the other computer, run this from the repo root in PowerShell:

```powershell
$ErrorActionPreference = "Stop"
$repoRoot = (Resolve-Path ".").Path
$runtimeRoot = Join-Path $env:LOCALAPPDATA "BookBibleDesktopRuntime"
$zipPath = Join-Path $runtimeRoot "node.zip"
New-Item -ItemType Directory -Force -Path $runtimeRoot | Out-Null

$index = Invoke-RestMethod -Uri "https://nodejs.org/dist/index.json"
$version = ($index |
  Where-Object { $_.version -like "v22.*" -and ($_.files -contains "win-x64-zip") } |
  Select-Object -First 1).version

if (-not $version) {
  throw "Could not find a Node 22 win-x64 zip in the Node release index."
}

$nodeDir = Join-Path $runtimeRoot "node-$version-win-x64"

if (-not (Test-Path -LiteralPath (Join-Path $nodeDir "npm.cmd"))) {
  $url = "https://nodejs.org/dist/$version/node-$version-win-x64.zip"
  Invoke-WebRequest -Uri $url -OutFile $zipPath
  Expand-Archive -LiteralPath $zipPath -DestinationPath $runtimeRoot -Force
  Remove-Item -LiteralPath $zipPath -Force
}

$env:PATH = "$nodeDir;$env:PATH"
& (Join-Path $nodeDir "npm.cmd") install

$desktop = [Environment]::GetFolderPath("Desktop")
$shortcutPath = Join-Path $desktop "Book Bible Desktop.lnk"
$scriptPath = Join-Path $repoRoot "scripts\launch-book-bible-desktop-dev.ps1"
$iconPath = Join-Path $repoRoot "build\icon.ico"
$command = "`$env:PATH='$nodeDir;' + `$env:PATH; & '$scriptPath'"

$wsh = New-Object -ComObject WScript.Shell
$shortcut = $wsh.CreateShortcut($shortcutPath)
$shortcut.TargetPath = "powershell.exe"
$shortcut.Arguments = "-NoExit -NoProfile -ExecutionPolicy Bypass -Command `"$command`""
$shortcut.WorkingDirectory = $repoRoot
$shortcut.IconLocation = $iconPath
$shortcut.Description = "Launch Book Bible Desktop in development mode"
$shortcut.WindowStyle = 1
$shortcut.Save()

Write-Output "Created shortcut: $shortcutPath"
Write-Output "Using Node runtime: $nodeDir"
```

Then double-click `Book Bible Desktop.lnk` on the desktop. Leave the terminal window open while using the app because it hosts the development server.

## Quick Prompt For The Other PC

Use something like:

```text
Pull the latest git changes. Read docs/desktop-shortcut-setup.md and recreate the Book Bible Desktop shortcut on this PC.
```

