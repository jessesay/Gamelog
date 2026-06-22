$ErrorActionPreference = "Stop"

$PatchRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Get-Location

Write-Host "Applying GameLog Backlog v1 patch..." -ForegroundColor Cyan
Write-Host "Patch folder: $PatchRoot"
Write-Host "Project folder: $ProjectRoot"

function Copy-FileEnsureDir($RelativePath) {
  $Source = Join-Path $PatchRoot $RelativePath
  $Destination = Join-Path $ProjectRoot $RelativePath
  $DestinationDir = Split-Path -Parent $Destination

  if (!(Test-Path $Source)) {
    throw "Missing patch file: $Source"
  }

  if (!(Test-Path $DestinationDir)) {
    New-Item -ItemType Directory -Path $DestinationDir -Force | Out-Null
  }

  Copy-Item $Source $Destination -Force
  Write-Host "Wrote $RelativePath" -ForegroundColor Green
}

Copy-FileEnsureDir "src\app\api\games\backlog\route.ts"
Copy-FileEnsureDir "src\app\api\games\backlog\remove\route.ts"
Copy-FileEnsureDir "src\app\backlog\page.tsx"
Copy-FileEnsureDir "src\components\BacklogList.tsx"
Copy-FileEnsureDir "src\components\GameSwipeDeck.tsx"

Write-Host ""
Write-Host "Done. Optional SQL patch: run gamelog_backlog_patch.sql in Supabase SQL Editor." -ForegroundColor Yellow
Write-Host "Then run: npm run dev" -ForegroundColor Cyan
