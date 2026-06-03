param(
  [Parameter(Mandatory = $true)]
  [string]$Query,
  [string]$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
)

$rg = Get-Command rg -ErrorAction SilentlyContinue
if (-not $rg) {
  throw "ripgrep (rg) was not found on PATH."
}

Push-Location $ProjectRoot
try {
  & $rg.Source -n --hidden --glob "!proposals/rejected/**" --glob "!attachments/**" $Query exports inbox proposals
} finally {
  Pop-Location
}

