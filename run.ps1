# Canonix Quick Start
# Usage: .\run.ps1 [-Seed] [-Build] [-Clean]

param(
    [switch]$Seed  = $false,
    [switch]$Build = $false,
    [switch]$Clean = $false
)

$ErrorActionPreference = "Stop"
$projectDir = $PSScriptRoot

function Step($msg) { Write-Host "`n> $msg" -ForegroundColor Cyan }

if ($Clean) {
    Step "Cleaning .next cache"
    Remove-Item -Recurse -Force "$projectDir\.next" -ErrorAction SilentlyContinue
}

if ($Seed) {
    Step "Running Prisma migrations + seed"
    Set-Location $projectDir
    npx prisma migrate dev --name init 2>$null
    npx tsx prisma/seed.ts
    Write-Host "  Done" -ForegroundColor Green
}

if ($Build) {
    Step "Building production bundle"
    Set-Location $projectDir
    npx next build
    Write-Host "  Done" -ForegroundColor Green
}

Step "Freeing port 3000"
$proc = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
if ($proc) {
    Stop-Process -Id $proc -Force -ErrorAction SilentlyContinue
    Write-Host "  Killed process $proc on :3000" -ForegroundColor Yellow
    Start-Sleep -Seconds 1
}

Step "Starting dev server on http://localhost:3000"
Write-Host "  Ctrl+C to stop`n" -ForegroundColor DarkGray
Set-Location $projectDir
npx next dev -p 3000
