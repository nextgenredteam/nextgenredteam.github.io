<#
.SYNOPSIS
    Emulates a Linux SSH login failure from a Windows or Linux PowerShell environment.
.DESCRIPTION
    Attempts SSH authentication using incorrect credentials (passwords or keys) to generate
    audit logs on target Linux machines.
.PARAMETER TargetIp
    Target Linux host IP, comma-separated list, or CIDR block (e.g. 192.168.1.0/24).
.PARAMETER Port
    Target SSH Port (default: 22).
.PARAMETER Username
    The username to attempt authentication with.
.PARAMETER InvalidPassword
    The incorrect password to fail authentication.
.PARAMETER Interval
    Time in seconds to wait between logon attempts.
.PARAMETER Count
    The number of attempts to run (use 0 for infinite).
#>
param(
    [string]$TargetIp,
    [int]$Port = 0,
    [string]$Username,
    [string]$InvalidPassword,
    [int]$Interval = -1,
    [int]$Count = -1
)

# Helper function to prompt interactively
function Read-Input {
    param([string]$Prompt)
    Write-Host $Prompt -NoNewline
    return Read-Host
}

# Resolve config.json fallbacks
$config = @{
    "target_ip" = "192.168.1.100"
    "port" = 22
    "username" = "root"
    "invalid_password" = "WrongPassword123!"
    "interval" = 5
    "count" = 3
    "auth_method" = "password"
    "invalid_key_data" = "-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAABFwAAAAdzc2gtcn
NhAAAAAwEAAQAAAQEAvzHebtagLlVilTyFiQKpW3jZnKj7+nq2Zv/piovsgLiawHBiVjpI
Op/Cs2z5mTzR1PCWuPxMcACJZtCGfnEs9sVZNj6ppacSq28mu20uBA0n6CluMaEWICqiED
gLcdn/LA8OtsNi170JzJbgB2H0kJwshD5kriENtPlrKaR3KdXlIOGhe4Qo/i8BQwubiIOV
pFTNAy4xkRL5ojT835sI61Wlp1pZpLb43aLYbYV8UDEj/ciojkQ6AlrDZI3G5NPdV98Q9C
XduC9axw85Wxb7l9An2sCDxRycbo0yXQqOEq47LtjTuJ7jA/jupwGGOqjSoFZ8VLz0Zpg7
60dJGRqPsQAAA9DVwaoh1cGqIQAAAAdzc2gtcnNhAAABAQC/Md5u1qAuVWKVPIWJAqlbeN
mcqPv6erZm/+mKi+yAuJrAcGJWOkg6n8KzbPmZPNHU8Ja4/ExwAIlm0IZ+cSz2xVk2Pqml
pxKrbya7bS4EDSfoKW4xoRYgKqIQOAtx2f8sDw62w2LXvQnMluAHYfSQnCyEPmSuIQ20+W
sppHcp1eUg4aF7hCj+LwFDC5uIg5WkVM0DLjGREvmiNPzfmwjrVaWnWlmktvjdoththXxQ
MSP9yKiORDoCWsNkjcbk091X3xD0Jd24L1rHDzlbFvuX0CfawIPFHJxujTJdCo4Srjsu2N
O4nuMD+O6nAYY6qNKgVnxUvPRmmDvrR0kZGo+xAAAAAwEAAQAAAQEAsCclFZ+eszGuA2tg
aKxQFtvQOtsiVVOMDHfJ1wE15B6xTY39vA40j/azrxY/HOUBOpxzcXnafvKvpU+IKqThVX
bby/ON3/Z/Z/2fhN2BoO/yDZ9mTElrFjXRXPoV6U59ID27Q73eqoAbsChtvb+NUVLiXPET
V69SbqPCDPrfY2V5eEceE+jir69y8vnd9AkkkYbFG0HI9lHQyoAiaWfISb3HbX0PFKAYos
1RYYurAhx6UI7w5t+rwLMiRDN3giK7t/tSB+ylGes29YVpkze32FONCc8QqWgVZBmIxgUs
nowAr0XaqdZGaJ2rQtRd+YIXLpKCkmtwNeLsgT/uwMH/wAQAAAIEA70UZJhVvna8mqx30rk
d5o9gH0FY/dD0lP3aH3wKXlJss1BjmrgrwL5hxG6cKC5hOlU75s7RiFXUq4gpv6Pw41jEk
ndtK/t+snGyp4emnp0w61zGfjtZcgmikv+M1o4EUx1ihjR0Rrrl0n5DqwxLE4SLPaKFi0uP
4iznPWhjI2muUAAACBAPbZfpXIYl/MSbC6jx+h4nCflrH4bN8KQ7lEBBWBfw3LhAA3i/N8
6GPosQ8EKKi63KJGrN2g/cTo/Pj+RI8Df33iR8nOwT0aai7yEM66dBgKNLGwneAyHXoCX0
3xKBROeQdBBz494v4gjx4gHbsp8FTceT1Jl7rINSYKLbjw+w6xAAAAgQDGSDt7rxmidUtd
5SAeAgfQ4MIqJNR+WjZwF+i7Ic+S1ksCGXY36w4O5pjt7u1TzXdsZc5ffQAIWRtvPUjZxJ
30SuNX1j81EqIXk1xqXKjCupbbDVE8ajyevmr7uIBV45QY+n0+NSE7z721yHK4s/IjbD6V
58Dj3uwCAL7MRXHRAQAAABZicmlua0BERVNLVE9QLUpPRVVST0NLAQID
-----END OPENSSH PRIVATE KEY-----"
}
$configPaths = @(
    (Join-Path $PSScriptRoot "..\config.json"),
    (Join-Path $PSScriptRoot "config.json"),
    "..\config.json",
    ".\config.json",
    "config.json"
)
foreach ($path in $configPaths) {
    if (Test-Path $path) {
        try {
            $content = Get-Content -Raw $path | ConvertFrom-Json
            if ($content) {
                if ($content.target_ip) { $config["target_ip"] = $content.target_ip }
                if ($content.port) { $config["port"] = $content.port }
                if ($content.username) { $config["username"] = $content.username }
                if ($content.invalid_password) { $config["invalid_password"] = $content.invalid_password }
                if ($content.interval) { $config["interval"] = $content.interval }
                if ($content.count) { $config["count"] = $content.count }
                if ($content.auth_method) { $config["auth_method"] = $content.auth_method }
                if ($content.invalid_key_data) { $config["invalid_key_data"] = $content.invalid_key_data }
                break
            }
        } catch {}
    }
}

# Apply fallbacks (prioritize CLI flags, then config.json)
if ([string]::IsNullOrEmpty($TargetIp) -and $config.ContainsKey("target_ip") -and -not [string]::IsNullOrEmpty($config["target_ip"])) {
    $TargetIp = $config["target_ip"]
}
if (($Port -eq 0 -or $Port -eq 22) -and $config.ContainsKey("port") -and $config["port"] -ne 0) {
    # If port is default 22 or 0, allow config.json to override it if defined, unless explicitly passed.
    # Actually, if the user passes -Port 2222, then $Port will be 2222.
    # But wait! If the user did not pass -Port, $Port defaults to 0 (or we can see what parameter default is).
    # Wait, in param declaration: [int]$Port = 0. So if they don't pass it, it's 0.
    # If they did pass it, it is whatever they passed. So if $Port is 0, we use config.json port.
}
if ($Port -eq 0 -and $config.ContainsKey("port") -and $config["port"] -ne 0) {
    $Port = $config["port"]
}
if ($Port -eq 0) {
    $Port = 22
}
if ([string]::IsNullOrEmpty($Username) -and $config.ContainsKey("username") -and -not [string]::IsNullOrEmpty($config["username"])) {
    $Username = $config["username"]
}
if ([string]::IsNullOrEmpty($InvalidPassword) -and $config.ContainsKey("invalid_password") -and -not [string]::IsNullOrEmpty($config["invalid_password"])) {
    $InvalidPassword = $config["invalid_password"]
}
if ($Interval -eq -1) {
    if ($config.ContainsKey("interval")) {
        $Interval = $config["interval"]
    } else {
        $Interval = 5
    }
}
if ($Count -eq -1) {
    if ($config.ContainsKey("count")) {
        $Count = $config["count"]
    } else {
        $Count = 3
    }
}
$AuthMethod = "password"
if ($config.ContainsKey("auth_method")) { $AuthMethod = $config["auth_method"] }
$InvalidKeyData = ""
if ($config.ContainsKey("invalid_key_data")) { $InvalidKeyData = $config["invalid_key_data"] }

# Interactive prompts if still null
if ([string]::IsNullOrEmpty($TargetIp)) {
    $TargetIp = Read-Input "Enter Target Linux IP/List/CIDR: "
}
if ($Port -eq 0) {
    $val = Read-Input "Enter Target SSH Port [22]: "
    if ([string]::IsNullOrEmpty($val)) { $Port = 22 } else { $Port = [int]$val }
}
if ([string]::IsNullOrEmpty($Username)) {
    $Username = Read-Input "Enter Target Username: "
}
if ([string]::IsNullOrEmpty($InvalidPassword) -and $AuthMethod -eq "password") {
    $InvalidPassword = Read-Input "Enter Invalid Password (to fail auth): "
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

# Helper to run SSH logon attempt non-interactively
function Trigger-SshFailure {
    param (
        [string]$TargetIp,
        [int]$Port,
        [string]$Username,
        [string]$InvalidPassword
    )
    
    $isUnix = $IsLinux -or $IsMacOS
    $tempFile = $null
    $tempKeyFile = $null
    
    # Write temporary key file if key-based authentication is requested
    if ($AuthMethod -eq "publickey" -and $InvalidKeyData) {
        $tempKeyFile = [System.IO.Path]::GetTempFileName()
        $InvalidKeyData | Out-File -FilePath $tempKeyFile -Encoding ascii
        
        # Restrict permissions so OpenSSH doesn't reject it
        if ($isUnix) {
            chmod 600 $tempKeyFile
        } else {
            $currUser = $env:USERNAME
            icacls $tempKeyFile /inheritance:r /grant:r "${currUser}:(R,W)" | Out-Null
        }
    }
    
    # Write temporary password script if password-based authentication is requested
    if ($AuthMethod -eq "password") {
        if ($isUnix) {
            $tempFile = [System.IO.Path]::GetTempFileName() + ".sh"
            "#!/bin/sh`necho '$InvalidPassword'" | Out-File -FilePath $tempFile -Encoding ascii
            chmod +x $tempFile
        } else {
            $tempFile = [System.IO.Path]::GetTempFileName() + ".bat"
            "@echo off`necho $InvalidPassword" | Out-File -FilePath $tempFile -Encoding ascii
        }
    }
    
    try {
        # Store original environment variables
        $oldAskpass = $env:SSH_ASKPASS
        $oldAskpassReq = $env:SSH_ASKPASS_REQUIRE
        $oldDisplay = $env:DISPLAY
        
        # Configure variables if password auth is used
        if ($AuthMethod -eq "password") {
            $env:SSH_ASKPASS = $tempFile
            $env:SSH_ASKPASS_REQUIRE = "force"
            $env:DISPLAY = "dummydisplay:0"
        }
        
        $psi = New-Object System.Diagnostics.ProcessStartInfo
        $psi.FileName = "ssh"
        
        $sshArgs = "-p $Port -o StrictHostKeyChecking=no "
        if ($AuthMethod -eq "publickey") {
            $sshArgs += "-i `"$tempKeyFile`" -o PreferredAuthentications=publickey -o PubkeyAuthentication=yes -o NumberOfPasswordPrompts=0 "
        } else {
            $sshArgs += "-o PreferredAuthentications=password -o PubkeyAuthentication=no -o NumberOfPasswordPrompts=1 "
        }
        $sshArgs += "-o ConnectTimeout=3 $Username@$TargetIp true"
        
        $psi.Arguments = $sshArgs
        $psi.UseShellExecute = $false
        $psi.RedirectStandardInput = $true
        $psi.RedirectStandardOutput = $true
        $psi.RedirectStandardError = $true
        $psi.CreateNoWindow = $true
        
        $proc = [System.Diagnostics.Process]::Start($psi)
        $proc.StandardInput.Close()
        
        $stdout = $proc.StandardOutput.ReadToEnd()
        $stderr = $proc.StandardError.ReadToEnd()
        $proc.WaitForExit()
        $exitCode = $proc.ExitCode
        
        $output = $stdout + $stderr
        
        if ($output -like "*Permission denied*" -or $output -like "*Keyboard-interactive*" -or $output -like "*Connection closed*" -or $exitCode -eq 255) {
            # Check for connection error
            if ($output -like "*Connection refused*" -or $output -like "*Connection timed out*") {
                Write-Host "  [ERROR] Connection failed to ${TargetIp}: $($output.Trim().Replace([string][char]13, '').Replace([string][char]10, ' '))" -ForegroundColor Red
                return $false
            }
            return $true
        } elseif ($exitCode -eq 0) {
            Write-Host "  [WARNING] Established SSH session successfully to $TargetIp! (Verify if credentials are correct)" -ForegroundColor Yellow
            return $false
        } else {
            Write-Host "  [INFO] Attempt completed. SSH output: $($output.Trim().Replace([string][char]13, '').Replace([string][char]10, ' '))"
            return $false
        }
    } catch {
        Write-Host "  [ERROR] Failed to run ssh. Ensure OpenSSH Client is installed. Error: $_" -ForegroundColor Red
        return $false
    } finally {
        # Restore environment variables
        $env:SSH_ASKPASS = $oldAskpass
        $env:SSH_ASKPASS_REQUIRE = $oldAskpassReq
        $env:DISPLAY = $oldDisplay
        
        # Cleanup temp files
        foreach ($file in @($tempFile, $tempKeyFile)) {
            if ($file -and (Test-Path $file)) {
                Remove-Item $file -Force -ErrorAction SilentlyContinue
            }
        }
    }
}

Write-Host "=============================================="
Write-Host "Starting SSH Logon Failure Emulation Loop (PowerShell)"
Write-Host "Targets  : $($targets -join ', ')"
Write-Host "Port     : $Port"
Write-Host "Username : $Username"
Write-Host "Password : [REDACTED]"
Write-Host "Auth Mode: $AuthMethod"
Write-Host "Interval : $Interval seconds"
if ($Count -eq 0) {
    Write-Host "Count    : Infinite (Press Ctrl+C to terminate)"
} else {
    Write-Host "Count    : $Count"
}
Write-Host "=============================================="

$iteration = 0
while ($true) {
    foreach ($target in $targets) {
        $iteration++
        if ($Count -ne 0 -and $iteration -gt $Count) {
            Write-Host "Completed requested $Count attempts. Exiting."
            break
        }
        
        $currentTime = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        Write-Host "[$currentTime] Attempt #${iteration}: Sending failed SSH authentication to ${target}:${Port}..."
        
        $success = Trigger-SshFailure -TargetIp $target -Port $Port -Username $Username -InvalidPassword $InvalidPassword
        if ($success) {
            Write-Host "  [SUCCESS] Triggered SSH Logon Failure status (auth failure log generated on target)." -ForegroundColor Green
        }
        
        if ($Count -eq 0 -or $iteration -lt $Count) {
            Start-Sleep -Seconds $Interval
        }
    }
    
    if ($Count -ne 0) {
        break
    }
}
