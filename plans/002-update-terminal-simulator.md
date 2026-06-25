# Plan 002: Update NPU & tool logs in terminal simulator

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm the expected result before moving to the next step. If anything in the "STOP conditions" section occurs, stop and report — do not improvise. When done, update the status row for this plan in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat e5cda6e..HEAD -- app.js`
> If the target file changed since this plan was written, compare the "Current state" excerpts against the live code; on a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: None
- **Category**: dx
- **Planned at**: commit `e5cda6e`, 2026-06-25

## Why this matters

The homepage terminal simulator animation in `app.js` still references the outdated NPU reverse-engineering narrative (e.g. bypassing constraints via PyArmor hooks and running Gemma 2.6B). It is also missing references to our new login detection emulation tools (**EventID4625** and **LinuxLoginFailure**). Correcting this aligns the front-page terminal widget logs with our true local deployment findings and showcases the new threat emulation modules.

## Current state

- Relevant file:
  - `app.js` — main website frontend javascript file.
- Excerpt from [app.js:58-65](file:///f:/OneDrive/NGRT/Website/app.js#L58-L65):
  ```javascript
  { text: '[!] DISCOVERED: Radxa AI Core AX-M1 NPU (LAMBERT AX8850)', type: 'warning' },
  { text: '[*] Bypassing Pulsar2 compiler constraints using PyArmor site-customize hook...', type: 'info' },
  { text: '[+] Booting Gemma 2.6B NPU model via axllm API gateway (Port 8000)...', type: 'success' },
  { text: '[+] NPU Inference stream: ONLINE [Latency: 0.62s]', type: 'success' },
  { text: '[*] Spawning Swarm-AI agent worker nodes...', type: 'info' },
  ```

## Scope

**In scope**:
- `app.js`

**Out of scope**:
- Modifications to `index.html` or `index.css`.
- Any backend scripts.

## Git workflow

- Branch: `advisor/002-update-terminal-simulator`
- Commit message: `dx: Update terminal simulator logs with native NPU server compile and login emulation tools`

## Steps

### Step 1: Update the scanLines array in app.js

Locate the `scanLines` array in `app.js` (lines 50-67) and replace the old NPU logs with the native compilation workflow and the execution logs for `trigger_4625_windows_amd64.exe` and `trigger_ssh_failure`.

The target state of the `scanLines` array should be:
```javascript
    const scanLines = [
      { text: 'ngrt --engage --target nextgenredteam.com', type: 'command' },
      { text: '[*] Initializing NextGenRedTeam Emulation Framework v3.0...', type: 'info' },
      { text: '[+] Loading modules: [ThreatEmulation] [PurpleTeaming] [Research]', type: 'success' },
      { text: '[+] Threat Simulation Node: ACTIVE', type: 'success' },
      { text: '[*] Checking external perimeter for security controls...', type: 'info' },
      { text: '[+] Discovery: 80/tcp, 443/tcp, 22/tcp [Filtered]', type: 'success' },
      { text: '[+] Analyzing threat intelligence vectors...', type: 'info' },
      { text: '[!] DISCOVERED: Radxa AI Core AX-M1 NPU (LAMBERT AX8850)', type: 'warning' },
      { text: '[*] Compiling native axllm zero-copy server from source...', type: 'info' },
      { text: '[*] Flushing NPU PCIe driver and clearing Continuous Memory (CMM)...', type: 'info' },
      { text: '[+] Booting Qwen 1.7B NPU model via native axllm service (Port 8000)...', type: 'success' },
      { text: '[+] NPU Inference stream: ONLINE [Latency: 0.28s]', type: 'success' },
      { text: '[*] Initializing telemetry validation checks...', type: 'info' },
      { text: 'trigger_4625_windows_amd64.exe --target 192.168.1.100 --count 3', type: 'command' },
      { text: '[*] SMB Handshake sent to 192.168.1.100... Windows Event ID 4625 generated.', type: 'success' },
      { text: 'trigger_ssh_failure --target 127.0.0.1 --method publickey', type: 'command' },
      { text: '[*] SSH signature authentication sent... Linux auth.log failure generated.', type: 'success' },
      { text: '[*] Spawning Swarm-AI agent worker nodes...', type: 'info' },
      { text: '[+] Allocating micro-containers: [Worker-A01] [Worker-A05]', type: 'success' },
      { text: '[+] Connected to Central SQL Intelligence Database', type: 'success' },
      { text: '[*] Smart Table reverse-engineering bypass: ACTIVE (JoeBro PWA)', type: 'info' },
      { text: 'ngrt --status // ENGAGED & SECURE', type: 'command' }
    ];
```

**Verify**:
Open `index.html` in a web browser and observe the terminal simulator widget. Confirm that the logs print the new native server compilation steps and tool executions in sequence.

## Done criteria

- [ ] `app.js` is modified to include the updated terminal logs.
- [ ] No syntax errors are introduced, and the terminal simulation loop functions cleanly.

## STOP conditions

- If `app.js` does not contain the `scanLines` array structure.
- If the terminal simulator animation fails to cycle or freezes.
