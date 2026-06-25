<#
.SYNOPSIS
    PowerShell emulator for Event ID 4625 (failed logon attempts) targeting Windows machines.
.DESCRIPTION
    Uses flags, config.json fallback, or interactive inputs. Performs SMB connection attempts
    with explicit incorrect credentials to trigger logon failure events on target systems.
#>
[CmdletBinding()]
param (
    [Parameter(Mandatory = $false)]
    [string]$TargetIp,

    [Parameter(Mandatory = $false)]
    [string]$Domain,

    [Parameter(Mandatory = $false)]
    [string]$Username,

    [Parameter(Mandatory = $false)]
    [string]$InvalidPassword,

    [Parameter(Mandatory = $false)]
    [int]$Interval = 0,

    [Parameter(Mandatory = $false)]
    [int]$Count = -1
)

# Search config paths
$configPaths = @(
    (Join-Path $PSScriptRoot "..\config.json"),
    (Join-Path $PSScriptRoot "config.json"),
    "..\config.json",
    ".\config.json",
    "config.json"
)

$config = $null
$configFound = $null
foreach ($path in $configPaths) {
    if (Test-Path $path) {
        try {
            $config = Get-Content $path -Raw | ConvertFrom-Json
            $configFound = $path
            break
        } catch {}
    }
}

# Fallback to config values if parameters were not supplied (prioritize CLI flags, then config.json)
if ($config) {
    if ([string]::IsNullOrEmpty($TargetIp) -and $config.target_ip) { $TargetIp = $config.target_ip }
    if ([string]::IsNullOrEmpty($Domain) -and $config.domain) { $Domain = $config.domain }
    if ([string]::IsNullOrEmpty($Username) -and $config.username) { $Username = $config.username }
    if ([string]::IsNullOrEmpty($InvalidPassword) -and $config.invalid_password) { $InvalidPassword = $config.invalid_password }
    if ($Interval -eq 0 -and $config.interval) {
        $Interval = $config.interval
    }
    if ($Count -eq -1 -and $config.count) {
        $Count = $config.count
    }
}

# Interactive prompts if still missing
if (-not $TargetIp) {
    $TargetIp = Read-Host "Enter Target Windows IP/List/CIDR"
}
if (-not $Domain) {
    $Domain = Read-Host "Enter Target Domain/WORKGROUP [WORKGROUP]"
    if ([string]::IsNullOrWhiteSpace($Domain)) { $Domain = "WORKGROUP" }
}
if (-not $Username) {
    $Username = Read-Host "Enter Target Username"
}
if (-not $InvalidPassword) {
    $InvalidPassword = Read-Host "Enter Invalid Password (to fail auth)"
}
if ($Interval -eq 0) {
    $ans = Read-Host "Enter Interval between attempts (seconds) [5]"
    if ([string]::IsNullOrWhiteSpace($ans)) { $Interval = 5 } else { $Interval = [int]$ans }
}
if ($Count -eq -1) {
    $ans = Read-Host "Enter run count (0 for infinite) [3]"
    if ([string]::IsNullOrWhiteSpace($ans)) { $Count = 3 } else { $Count = [int]$ans }
}

# Helper to expand CIDR block
function Get-IpFromCidr {
    param([string]$Cidr)
    try {
        $parts = $Cidr.Split('/')
        $ip = $parts[0]
        $mask = [int]$parts[1]
        
        $ipBytes = [System.Net.IPAddress]::Parse($ip).GetAddressBytes()
        [Array]::Reverse($ipBytes)
        $ipNum = [System.BitConverter]::ToUInt32($ipBytes, 0)
        
        $hostBits = 32 - $mask
        $numHosts = [math]::Pow(2, $hostBits)
        
        $maskNum = [uint32]::MaxValue
        if ($hostBits -lt 32) {
            $maskNum = [uint32]::MaxValue -shl $hostBits
        }
        $netNum = $ipNum -band $maskNum
        
        $ips = New-Object System.Collections.Generic.List[string]
        
        $start = 1
        $end = $numHosts - 1
        if ($mask -ge 31) {
            $start = 0
            $end = $numHosts
        }
        
        for ($i = $start; $i -lt $end; $i++) {
            $addr = $netNum + $i
            $addrBytes = [System.BitConverter]::GetBytes($addr)
            [Array]::Reverse($addrBytes)
            $ips.Add(([System.Net.IPAddress]$addrBytes).IPAddressToString)
        }
        return $ips
    } catch {
        return @($Cidr)
    }
}

# Resolve target array
$targets = New-Object System.Collections.Generic.List[string]
foreach ($part in $TargetIp.Split(',')) {
    $part = $part.Trim()
    if ($part -like "*/*") {
        foreach ($ip in (Get-IpFromCidr -Cidr $part)) {
            $targets.Add($ip)
        }
    } elseif ($part) {
        $targets.Add($part)
    }
}

Write-Host "=============================================="
Write-Host "Starting Event ID 4625 Emulation Loop (PowerShell)"
Write-Host "Targets  : $($targets -join ', ')"
Write-Host "Domain   : $Domain"
Write-Host "Username : $Username"
Write-Host "Password : [REDACTED]"
Write-Host "Interval : $Interval seconds"
Write-Host "Count    : $(if ($Count -eq 0) { "Infinite (Press Ctrl+C to terminate)" } else { $Count })"
Write-Host "=============================================="

# Formulate username correctly with domain if needed
$fullUsername = $Username
if (-not [string]::IsNullOrWhiteSpace($Domain) -and $Domain -ne "WORKGROUP") {
    $fullUsername = "$Domain\$Username"
}

$iteration = 0
while ($true) {
    foreach ($target in $targets) {
        $iteration++
        if ($Count -ne 0 -and $iteration -gt $Count) {
            Write-Host "Completed requested $Count attempts. Exiting."
            break
        }

        $time = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        Write-Host "[$time] Attempt #${iteration}: Sending failed SMB authentication to ${target}..."

        # Clean up previous mapping attempts just in case
        $netSharePath = "\\$target\IPC$"
        
        # We use net use via cmd to trigger logon event cleanly
        $netUseCmd = "net use $netSharePath /u:$fullUsername $InvalidPassword 2>&1"
        $output = Invoke-Expression $netUseCmd

        if ($output -match "System error 86" -or $output -match "Access is denied" -or $output -match "error 1326" -or $output -match "logon failure") {
            Write-Host "  [SUCCESS] Triggered Logon Failure status (Event ID 4625 generated on target)." -ForegroundColor Green
        } else {
            Write-Host "  [INFO] Attempt completed. System message:" -ForegroundColor Yellow
            $cleanOutput = $output.Trim().Replace([string][char]13, '').Replace([string][char]10, ' ')
            Write-Host "  $cleanOutput"
        }

        # Clean up mapping if it somehow succeeded
        net use $netSharePath /delete /y 2>$null | Out-Null

        if ($Count -eq 0 -or $iteration -lt $Count) {
            Start-Sleep -Seconds $Interval
        }
    }
    
    if ($Count -ne 0) {
        break
    }
}
