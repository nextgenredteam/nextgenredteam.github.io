# Linux Login Failure (SSH Authentication) Emulator Suite

This folder contains multi-language scripts and precompiled binaries designed to emulate Linux logon failure events (specifically SSH authentication failures) on target Linux systems. The emulators operate by sending SSH authentication requests using incorrect passwords or invalid private keys.

This is extremely useful for demonstrating log capture, SIEM alerting, and security monitoring setups for Linux environments.

> [!CAUTION]
> **ACCOUNT LOCKOUT & IP BANNING WARNING:** Running these tools repeatedly with a real username (such as `root` or a valid system account) can trigger:
> 1. **Account Lockout Policies:** Tools like `pam_tally2` or `pam_faillock` on the target system may lock out the targeted user.
> 2. **IP Banning / Intrusion Prevention:** Software like `fail2ban` on the target system may automatically block the IP address of the system executing these tests.
> - **Recommendation:** Always test using a dedicated, non-critical test account (e.g., `test_malicious_user` or `fake_admin_account`) or verify target lockout and banning thresholds before running.

> [!NOTE]
> **HOW TO STOP THE EMULATOR:** 
> When running the tools repeatedly or in infinite mode (`count: 0`), press **Ctrl+C** to terminate the execution loop.

---

## Folder Structure

```text
LinuxLoginFailure/
├── config.json                 # Shared configuration file
├── README.md                   # This instruction file
├── bash/
│   └── trigger_ssh_failure.sh  # Bash implementation (uses sshpass or SSH_ASKPASS)
├── powershell/
│   └── trigger_ssh_failure.ps1 # PowerShell implementation (uses Windows SSH_ASKPASS)
├── python/
│   └── trigger_ssh_failure.py  # Python implementation (uses paramiko or SSH_ASKPASS)
└── go/
    ├── main.go                 # Go source code
    ├── go.mod                  # Go module definition
    └── bin/
        ├── trigger_ssh_failure_linux_amd64       # Precompiled Linux Binary (RHEL compatible)
        └── trigger_ssh_failure_windows_amd64.exe  # Precompiled Windows Binary
```

---

## Shared Configuration: `config.json`

The root of this directory contains a `config.json` file. All tools in this suite look for this file in their parent directory or current directory by default if command line flags are not provided.

### Configuration Structure:
```json
{
  "target_ip": "192.168.1.100,192.168.1.0/24",
  "port": 22,
  "username": "root",
  "invalid_password": "WrongPassword123!",
  "auth_method": "password",
  "invalid_key_data": "-----BEGIN OPENSSH PRIVATE KEY-----\n...",
  "interval": 5,
  "count": 3
}
```
- `target_ip`: IP address, hostname, comma-separated list of targets, or CIDR network range (e.g. `192.168.1.0/24`) to scan.
- `port`: Port where SSH is listening (default `22`).
- `username`: The username to attempt authentication with.
- `invalid_password`: The incorrect password to trigger the failed logon event (used when `auth_method` is `password`).
- `auth_method`: Authentication method to emulate. Set to `password` (default) or `publickey`.
- `invalid_key_data`: Validly formatted dummy private key data used when `auth_method` is `publickey` to trigger key authentication failure.
- `interval`: Time in seconds to pause between logon attempts.
- `count`: Total number of attempts to run across all targets. Set to `0` to run infinitely until interrupted (**Ctrl+C**).

---

## Dual Input Mode (How to Run)

All implementations support three fallback methods for reading settings:
1. **CLI Flags / Parameters:** Direct arguments passed to the script/binary (e.g. `-t`, `-P`, `-u`, `-p`, `-i`, `-c`).
2. **Configuration File:** Automatically looks for a `config.json` in the root folder.
3. **Interactive Mode:** If flags are not supplied and `config.json` is missing or incomplete, the script will prompt you interactively for details.

---

## Execution Instructions

### 1. Go Binary (Precompiled)
The precompiled binaries require no runtime installation, are completely self-contained, and perform a real SSH cryptographic handshake.

#### Run on Linux (RHEL / Rocky / CentOS / Ubuntu):
```bash
cd LinuxLoginFailure/go/bin/
chmod +x trigger_ssh_failure_linux_amd64

# Method A: Using config.json (placed in root or current folder)
./trigger_ssh_failure_linux_amd64

# Method B: Passing command-line flags (takes CIDR subnets and comma lists)
./trigger_ssh_failure_linux_amd64 -t 192.168.1.50,192.168.1.60 -P 22 -u root -p WrongPass -i 2 -c 5
```

#### Run on Windows (PowerShell/CMD):
```powershell
cd .\LinuxLoginFailure\go\bin\
# Method A: Config JSON
.\trigger_ssh_failure_windows_amd64.exe
# Method B: CLI flags (scan whole CIDR subnet)
.\trigger_ssh_failure_windows_amd64.exe -t 192.168.1.0/24 -P 22 -u root -p WrongPass -i 2 -c 5
```

---

### 2. PowerShell Script (`trigger_ssh_failure.ps1`)
Designed to be run natively from Windows or Linux with PowerShell Core (`pwsh`). It leverages the native OpenSSH client `ssh`.
```powershell
cd .\LinuxLoginFailure\powershell\

# Method A: Using config.json
.\trigger_ssh_failure.ps1

# Method B: Passing Parameters
.\trigger_ssh_failure.ps1 -TargetIp "192.168.1.50,192.168.1.60" -Port 22 -Username "root" -InvalidPassword "WrongPass" -Interval 3 -Count 4
```

---

### 3. Python Script (`trigger_ssh_failure.py`)
Requires Python 3. Leverages `paramiko` if present; otherwise, it automatically falls back to spawning the system's `ssh` client non-interactively using standard environment variables (`SSH_ASKPASS`).
```bash
cd LinuxLoginFailure/python/

# Run via config.json or interactive prompt
python trigger_ssh_failure.py

# Run with arguments
python trigger_ssh_failure.py --target 192.168.1.0/24 --port 22 --user root --password WrongPass --interval 2 --count 5
```

---

### 4. Bash Script (`trigger_ssh_failure.sh`)
Typically executed on Red Hat/Linux systems. Leverages `sshpass` if available, otherwise sets up a temporary `SSH_ASKPASS` script to inject the password securely.

```bash
cd LinuxLoginFailure/bash/
chmod +x trigger_ssh_failure.sh

# Run via config.json or interactive prompt
./trigger_ssh_failure.sh

# Run with flags
./trigger_ssh_failure.sh -t 192.168.1.50,192.168.1.60 -P 22 -u root -p WrongPass -i 2 -c 5
```

---

## Log Verification

Executing this tool successfully generates standard SSH authentication failure logs on the target Linux system.

### RHEL / CentOS / Rocky Linux / Fedora
Logs are recorded in `/var/log/secure`. Run the following command on the target system to watch live logs:
```bash
sudo tail -f /var/log/secure | grep -E "sshd|pam"
```
*Expected log snippet (Password Authentication Failure):*
```text
Jun 10 12:15:30 target sshd[12345]: pam_unix(sshd:auth): authentication failure; logname= uid=0 euid=0 tty=ssh ruser= rhost=192.168.1.20 user=root
Jun 10 12:15:32 target sshd[12345]: Failed password for root from 192.168.1.20 port 54321 ssh2
```
*Expected log snippet (PublicKey Authentication Failure):*
```text
Jun 10 12:16:10 target sshd[12346]: Connection closed by authenticating user root 192.168.1.20 port 54322 [preauth]
```

### Ubuntu / Debian Linux
Logs are recorded in `/var/log/auth.log`. Run the following command on the target system:
```bash
sudo tail -f /var/log/auth.log | grep -E "sshd|pam"
```
*Expected log snippet:*
```text
Jun 10 12:15:32 target sshd[12345]: Failed password for root from 192.168.1.20 port 54321 ssh2
```
