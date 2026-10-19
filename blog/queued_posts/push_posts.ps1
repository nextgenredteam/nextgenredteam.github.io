param (
    [Parameter(Mandatory=$false)]
    [ValidateSet("status", "next", "oct26", "nov1", "nov5", "nov10", "nov15", "nov20", "nov25", "nov30", "all")]
    [string]$Target = "status",

    [Parameter(Mandatory=$false)]
    [switch]$Push = $false
)

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$PostsDir = Join-Path $ScriptDir "..\posts"
$RootDir = Join-Path $ScriptDir "..\.."
$BuildScript = Join-Path $RootDir "scripts\build-blog.js"

# Post queue definition
$Queue = @(
    @{
        Key = "oct26"
        Date = "2026-10-26"
        Title = "Why I Use AI to Build Accessible CLIs and Progressive Web Apps"
        Source = Join-Path $ScriptDir "2026-10-26-why-i-use-ai-to-build-accessible-clis-and-pwas.md"
        Dest = Join-Path $PostsDir "why-i-use-ai-to-build-accessible-clis-and-pwas.md"
        Draft = Join-Path $PostsDir "why-i-use-ai-to-build-accessible-clis-and-pwas.md.draft"
    },
    @{
        Key = "nov1"
        Date = "2026-11-01"
        Title = "Hunting Edge AI CVEs: From Demo Code to DMA Memory Corruption"
        Source = Join-Path $ScriptDir "2026-11-01-hunting-edge-ai-cves-from-demo-code-to-dma-memory-corruption.md"
        Dest = Join-Path $PostsDir "hunting-edge-ai-cves-from-demo-code-to-dma-memory-corruption.md"
        Draft = Join-Path $PostsDir "hunting-edge-ai-cves-from-demo-code-to-dma-memory-corruption.md.draft"
    },
    @{
        Key = "nov5"
        Date = "2026-11-05"
        Title = "Beyond Prompt Injection: Edge Execution Review (EER) Playbook"
        Source = Join-Path $ScriptDir "2026-11-05-beyond-prompt-injection-edge-execution-review-playbook.md"
        Dest = Join-Path $PostsDir "beyond-prompt-injection-edge-execution-review-playbook.md"
        Draft = Join-Path $PostsDir "beyond-prompt-injection-edge-execution-review-playbook.md.draft"
    },
    @{
        Key = "nov10"
        Date = "2026-11-10"
        Title = "Why OWASP Top 10 Checklists Cap AI Pentesting at 30%"
        Source = Join-Path $ScriptDir "2026-11-10-why-owasp-top-10-checklists-cap-ai-pentesting-at-30-percent.md"
        Dest = Join-Path $PostsDir "why-owasp-top-10-checklists-cap-ai-pentesting-at-30-percent.md"
        Draft = Join-Path $PostsDir "why-owasp-top-10-checklists-cap-ai-pentesting-at-30-percent.md.draft"
    },
    @{
        Key = "nov15"
        Date = "2026-11-15"
        Title = "Building an Ephemeral AI Security Swarm in 48 Hours"
        Source = Join-Path $ScriptDir "2026-11-15-building-ephemeral-ai-security-swarm-in-48-hours.md"
        Dest = Join-Path $PostsDir "building-ephemeral-ai-security-swarm-in-48-hours.md"
        Draft = Join-Path $PostsDir "building-ephemeral-ai-security-swarm-in-48-hours.md.draft"
    },
    @{
        Key = "nov20"
        Date = "2026-11-20"
        Title = "The Autonomous Scope Problem: How to Keep AI Red Teams in Bounds"
        Source = Join-Path $ScriptDir "2026-11-20-autonomous-scope-problem-ai-red-teams.md"
        Dest = Join-Path $PostsDir "autonomous-scope-problem-ai-red-teams.md"
        Draft = Join-Path $PostsDir "autonomous-scope-problem-ai-red-teams.md.draft"
    },
    @{
        Key = "nov25"
        Date = "2026-11-25"
        Title = "Why DAST Authenticated Scanning Always Breaks"
        Source = Join-Path $ScriptDir "2026-11-25-why-dast-authenticated-scanning-always-breaks.md"
        Dest = Join-Path $PostsDir "why-dast-authenticated-scanning-always-breaks.md"
        Draft = Join-Path $PostsDir "why-dast-authenticated-scanning-always-breaks.md.draft"
    },
    @{
        Key = "nov30"
        Date = "2026-11-30"
        Title = "Weaponizing Adversarial Telemetry: Invariant Architectures"
        Source = Join-Path $ScriptDir "2026-11-30-weaponizing-adversarial-telemetry-invariant-architectures.md"
        Dest = Join-Path $PostsDir "weaponizing-adversarial-telemetry-invariant-architectures.md"
        Draft = Join-Path $PostsDir "weaponizing-adversarial-telemetry-invariant-architectures.md.draft"
    }
)

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " NextGenRedTeam Threat Lab Release Automation" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

if ($Target -eq "status") {
    Write-Host "`nCurrent Staged Research Pipeline:" -ForegroundColor Yellow
    foreach ($item in $Queue) {
        $isLive = Test-Path $item.Dest
        $hasDraft = Test-Path $item.Draft
        $statusStr = if ($isLive) { "[LIVE]" } elseif ($hasDraft) { "[STAGED DRAFT]" } else { "[QUEUED]" }
        $color = if ($isLive) { "Green" } elseif ($hasDraft) { "Cyan" } else { "Gray" }

        Write-Host "  $statusStr $($item.Date) ($($item.Key))" -ForegroundColor $color
        Write-Host "    $($item.Title)" -ForegroundColor White
    }

    Write-Host "`nUsage Instructions:" -ForegroundColor Green
    Write-Host "  .\push_posts.ps1 -Target oct26       # Stage/publish specific post"
    Write-Host "  .\push_posts.ps1 -Target next        # Publish the next queued post"
    Write-Host "  .\push_posts.ps1 -Target all         # Publish all queued posts"
    Write-Host "  .\push_posts.ps1 -Target oct26 -Push # Publish and git commit/push to live"
    exit 0
}

$PostsToPublish = @()

if ($Target -eq "next") {
    foreach ($item in $Queue) {
        if (-not (Test-Path $item.Dest)) {
            $PostsToPublish += $item
            break
        }
    }
    if ($PostsToPublish.Count -eq 0) {
        Write-Host "`n[!] All posts in the queue are already live!" -ForegroundColor Green
        exit 0
    }
} elseif ($Target -eq "all") {
    $PostsToPublish = $Queue
} else {
    $match = $Queue | Where-Object { $_.Key -eq $Target }
    if ($match) {
        $PostsToPublish += $match
    } else {
        Write-Error "Unknown target key: $Target"
        exit 1
    }
}

Write-Host "`n[+] Staging and publishing selected posts:" -ForegroundColor Green
foreach ($item in $PostsToPublish) {
    Write-Host "    -> [$($item.Date)] $($item.Title)" -ForegroundColor White
    Copy-Item -Path $item.Source -Destination $item.Dest -Force
    # Clean up any leftover .draft file in posts
    if (Test-Path $item.Draft) {
        Remove-Item -Path $item.Draft -Force
    }
}

Write-Host "`n[+] Rebuilding NextGenRedTeam Blog Site..." -ForegroundColor Yellow
node $BuildScript

if ($Push) {
    Write-Host "`n[+] Committing and pushing changes to GitHub Pages..." -ForegroundColor Yellow
    git add blog/ llms.txt assets/
    git commit -m "feat(blog): publish $($PostsToPublish.Title -join ', ')"
    git push origin main
    Write-Host "`n[SUCCESS] Changes pushed to origin main! Site will update momentarily." -ForegroundColor Green
} else {
    Write-Host "`n[SUCCESS] Local build complete! Run with -Push to deploy to production." -ForegroundColor Green
}
