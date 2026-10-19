param (
    [Parameter(Mandatory=$false)]
    [ValidateSet("nov1", "nov5", "all", "status")]
    [string]$Target = "status"
)

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$PostsDir = Join-Path $ScriptDir "..\posts"
$RootDir = Join-Path $ScriptDir "..\.."
$BuildScript = Join-Path $RootDir "scripts\build-blog.js"

$PostNov1Source = Join-Path $ScriptDir "2026-11-01-hunting-edge-ai-cves-from-demo-code-to-dma-memory-corruption.md"
$PostNov1Dest = Join-Path $PostsDir "hunting-edge-ai-cves-from-demo-code-to-dma-memory-corruption.md"

$PostNov5Source = Join-Path $ScriptDir "2026-11-05-beyond-prompt-injection-edge-execution-review-playbook.md"
$PostNov5Dest = Join-Path $PostsDir "beyond-prompt-injection-edge-execution-review-playbook.md"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " NGRT Blog Release Automation (Post-Embargo Queue)" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

if ($Target -eq "status") {
    Write-Host "`nCurrent Staging Status:" -ForegroundColor Yellow
    Write-Host "  [Post 1: Nov 01, 2026] Hunting Edge AI CVEs (7 Vulns Walkthrough)"
    Write-Host "    - Queued file: $PostNov1Source"
    Write-Host "    - Live in blog/posts: $(Test-Path $PostNov1Dest)"
    
    Write-Host "  [Post 2: Nov 05, 2026] Beyond Prompt Injection (EER Playbook)"
    Write-Host "    - Queued file: $PostNov5Source"
    Write-Host "    - Live in blog/posts: $(Test-Path $PostNov5Dest)"

    Write-Host "`nUsage Instructions:" -ForegroundColor Green
    Write-Host "  .\push_posts.ps1 -Target nov1   # Publish Post 1 (November 1, 2026)"
    Write-Host "  .\push_posts.ps1 -Target nov5   # Publish Post 2 (November 5, 2026)"
    Write-Host "  .\push_posts.ps1 -Target all    # Publish both posts immediately"
    exit 0
}

$RebuildNeeded = $false

if ($Target -eq "nov1" -or $Target -eq "all") {
    Write-Host "`n[+] Publishing Post 1 (Nov 1): Hunting Edge AI CVEs..." -ForegroundColor Green
    Copy-Item -Path $PostNov1Source -Destination $PostNov1Dest -Force
    Write-Host "    Copied to $PostNov1Dest" -ForegroundColor Gray
    $RebuildNeeded = $true
}

if ($Target -eq "nov5" -or $Target -eq "all") {
    Write-Host "`n[+] Publishing Post 2 (Nov 5): Beyond Prompt Injection (EER Playbook)..." -ForegroundColor Green
    Copy-Item -Path $PostNov5Source -Destination $PostNov5Dest -Force
    Write-Host "    Copied to $PostNov5Dest" -ForegroundColor Gray
    $RebuildNeeded = $true
}

if ($RebuildNeeded) {
    Write-Host "`n[+] Rebuilding NextGenRedTeam Blog Site..." -ForegroundColor Yellow
    node $BuildScript
    Write-Host "`n[SUCCESS] Blog build complete and HTML pages rendered!" -ForegroundColor Green
}
