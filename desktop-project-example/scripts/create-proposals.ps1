param(
  [Parameter(Mandatory = $true)]
  [string]$BrainDumpPath,
  [string]$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
)

$resolvedBrainDumpPath = Join-Path $ProjectRoot $BrainDumpPath
if (-not (Test-Path $resolvedBrainDumpPath)) {
  throw "Brain dump file not found at '$resolvedBrainDumpPath'."
}

$timestamp = Get-Date -Format "yyyy-MM-dd-HHmmss"
$proposalPath = Join-Path $ProjectRoot "proposals/pending/$timestamp-generated-proposal.json"
$excerpt = (Get-Content $resolvedBrainDumpPath -Raw).Trim()
if ($excerpt.Length -gt 280) {
  $excerpt = $excerpt.Substring(0, 280)
}

$proposal = [ordered]@{
  id = "proposal-$timestamp"
  createdAt = (Get-Date).ToString("o")
  sourceFile = $BrainDumpPath
  status = "pending-review"
  summary = "Replace this placeholder summary with a reviewed AI summary."
  excerpt = $excerpt
  proposedChanges = @(
    [ordered]@{
      slice = "locations"
      action = "create"
      targetId = "replace-with-readable-id"
      confidence = "low"
      reason = "Replace this placeholder with the real reasoning."
      fields = [ordered]@{
        name = "Replace with title"
        summary = "Replace with structured summary."
      }
    }
  )
}

$proposal | ConvertTo-Json -Depth 8 | Set-Content -Path $proposalPath
Write-Host "Created proposal scaffold at $proposalPath"

