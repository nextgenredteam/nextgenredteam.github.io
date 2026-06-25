# Event ID 4625 (Windows Logon Failure) Emulator Suite

This folder contains multi-language scripts and binaries designed to emulate failed logon events (Event ID 4625) on Windows target systems. The emulators operate by sending network authentication requests (SMB/NTLM) using incorrect passwords.

This is extremely useful for demonstrating log capture, SIEM alerting, and security monitoring setups for Windows environments.

> [!CAUTION]
> **ACCOUNT LOCKOUT WARNING:** Running these tools repeatedly with a real Windows username can trigger account lockout policies on the target Windows system or Active Directory domain. 
> - **Recommendation:** Always test with a dedicated, non-critical test account (e.g., `test_malicious_user` or `fake_admin_account`) or verify target lockout policy thresholds (e.g. `Account lockout threshold` in GPO/Local Security Policy) before running.

> [!NOTE]
> **HOW TO STOP THE EMULATOR:** 
> When running the tools repeatedly or in infinite mode (`count: 0`), you will need to press **Ctrl+C** to terminate the execution loop.

---

## Folder Structure

```text
EventID4625/
├── config.json                 # Shared configuration file (includes Domain setting)
├── README.md                   # This instruction file
├── bash/
│   └── trigger_4625.sh        # Bash implementation (requires smbclient)
├── powershell/
│   └── trigger_4625.ps1       # PowerShell implementation
├── python/
│   └── trigger_4625.py        # Python implementation
└── go/
    ├── main.go                 # Go source code
    └── bin/
        ├── trigger_4625_linux_amd64       # Precompiled Linux Binary (RHEL compatible)
        └── trigger_4625_windows_amd64.exe  # Precompiled Windows Binary
```

---

## Shared Configuration: `config.json`

The root of this directory contains a `config.json` file. All tools in this suite look for this file in their parent directory or current directory by default if command line flags are not provided.

### Configuration Structure:
```json
{
  "target_ip": "192.168.1.100,192.168.1.0/24",
  "domain": "WORKGROUP",
  "username": "Administrator",
  "invalid_password": "WrongPassword123!",
  "interval": 5,
  "count": 3
}
```
- `target_ip`: IP address, hostname, comma-separated list of targets, or CIDR network range (e.g. `192.168.1.0/24`) to scan.
- `domain`: Target domain name (default `"WORKGROUP"`). If targeting a local account, leave as `"WORKGROUP"` or `""`.
- `username`: The username to attempt authentication with.
- `invalid_password`: The incorrect password to trigger the failed logon event.
- `interval`: Time in seconds to pause between logon attempts.
- `count`: Total number of attempts to run across all targets. Set to `0` to run infinitely until interrupted (**Ctrl+C**).

---

## Dual Input Mode (How to Run)

All implementations support three fallback methods for reading settings:
1. **CLI Flags / Parameters:** Direct arguments passed to the script/binary (e.g. `-t`, `-d`, `-u`, `-p`, `-i`, `-c`).
2. **Configuration File:** Automatically looks for a `config.json` in the root folder.
3. **Interactive Mode:** If flags are not supplied and `config.json` is missing or incomplete, the script will prompt you interactively for the details.

---

## Execution Instructions

### 1. Go Binary (Precompiled)
The precompiled binaries require no runtime installation and contain a built-in SMB/NTLM stack that attempts a real authentication handshake.

#### Run on Red Hat / Linux (AMD64):
```bash
cd EventID4625/go/bin/
chmod +x trigger_4625_linux_amd64

# Method A: Using config.json (placed in root or current folder)
./trigger_4625_linux_amd64

# Method B: Passing command-line flags (takes comma lists and CIDRs)
./trigger_4625_linux_amd64 -t 192.168.1.50,192.168.1.60 -d WORKGROUP -u Admin -p WrongPass -i 2 -c 5
```

#### Run on Windows (PowerShell/CMD):
```powershell
cd .\EventID4625\go\bin\
# Method A: Config JSON
.\trigger_4625_windows_amd64.exe
# Method B: CLI flags (scan whole CIDR subnet)
.\trigger_4625_windows_amd64.exe -t 192.168.1.0/24 -d WORKGROUP -u Admin -p WrongPass -i 2 -c 5
```

---

### 2. PowerShell Script (`trigger_4625.ps1`)
Designed to be run natively from Windows or Linux with PowerShell Core (`pwsh`).
```powershell
cd .\EventID4625\powershell\

# Method A: Using config.json
.\trigger_4625.ps1

# Method B: Passing Parameters
.\trigger_4625.ps1 -TargetIp "192.168.1.50,192.168.1.60" -Domain "WORKGROUP" -Username "Admin" -InvalidPassword "WrongPass" -Interval 3 -Count 4
```

---

### 3. Python Script (`trigger_4625.py`)
Requires Python 3. Leverages `smbclient` if present on Linux, otherwise performs standard socket connections.
```bash
cd EventID4625/python/

# Run via config.json or interactive prompt
python trigger_4625.py

# Run with arguments
python trigger_4625.py --target 192.168.1.0/24 --domain WORKGROUP --user Admin --password WrongPass --interval 2 --count 5
```

---

### 4. Bash Script (`trigger_4625.sh`)
Typically executed on Red Hat/Linux systems targeting a Windows host.
> Requires `smbclient` utility (can be installed on Red Hat via `sudo dnf install samba-client -y`).

```bash
cd EventID4625/bash/
chmod +x trigger_4625.sh

# Run via config.json or interactive prompt
./trigger_4625.sh

# Run with flags
./trigger_4625.sh -t 192.168.1.50,192.168.1.60 -d WORKGROUP -u Admin -p WrongPass -i 2 -c 5
```
