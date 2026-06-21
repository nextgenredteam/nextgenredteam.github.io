#!/usr/bin/env python3
"""
NPU Performance & Benchmark Suite
- Sends standard evaluation requests to the axllm API gateway
- Automatically tracks tokens/sec generation speeds
- Queries host cpu and memory metrics asynchronously during generation
"""

import time
import json
import urllib.request
import subprocess
import sys
from npu_utils import load_env, get_required_env, get_env_or_default

# Evaluation prompts focusing on standard security architecture, concepts, and mitigation
EVAL_PROMPTS = [
    {
        "id": "Q1",
        "label": "IDOR Vulnerability Concept",
        "prompt": "Explain Insecure Direct Object Reference (IDOR) vulnerabilities: how they occur, how they are detected during security code reviews, and what are the best practices for remediation using access control checks."
    },
    {
        "id": "Q2",
        "label": "JWT Authentication Analysis",
        "prompt": "Analyze the security implications of utilizing JWT (JSON Web Tokens) without server-side validation. Detail the architectural risks and remediation methods to prevent privilege escalation."
    },
    {
        "id": "Q3",
        "label": "SSRF & Internal Network Pivot",
        "prompt": "Detail Server-Side Request Forgery (SSRF) concepts. What are the common methods of preventing SSRF vulnerabilities, and how should cloud metadata access be secured?"
    },
    {
        "id": "Q4",
        "label": "Time-based Blind SQLi Mitigations",
        "prompt": "Describe the mechanics of time-based blind SQL injection vulnerabilities. What code-level constructs introduce these vulnerabilities, and how does parameterized query syntax eliminate them?"
    },
    {
        "id": "Q5",
        "label": "OWASP API Top 10 Protections",
        "prompt": "Discuss the top 3 OWASP API Security threats. For each threat, provide an overview of the vulnerability and the design-level defense-in-depth security strategies required to address it."
    }
]

def load_config():
    load_env()
    return {
        'host': get_required_env('PROXMOX_HOST'),
        'user': get_required_env('PROXMOX_USER'),
        'key_path': get_env_or_default('SSH_KEY_PATH'),
        'target_id': get_required_env('NPU_TARGET_ID'),
        'npu_ip': get_required_env('NPU_IP'),
        'npu_port': get_required_env('NPU_PORT'),
        'npu_user': get_required_env('NPU_USER')
    }

def ssh_cmd(config, cmd):
    ssh_key = config['key_path']
    ssh_host = f"{config['user']}@{config['host']}"
    
    ssh_args = ['ssh']
    if ssh_key:
        ssh_args.extend(['-i', ssh_key])
    ssh_args.extend([
        '-o', 'BatchMode=yes',
        '-o', 'StrictHostKeyChecking=no',
        ssh_host,
        cmd
    ])
    
    try:
        result = subprocess.run(
            ssh_args,
            capture_output=True,
            text=True,
            timeout=15
        )
        return result.stdout.strip()
    except Exception as e:
        print(f"[-] SSH command execution failed: {e}")
        return ""

def get_system_stats(config):
    cpu = ssh_cmd(config, f"sudo pct exec {config['target_id']} -- grep 'cpu ' /proc/stat")
    mem = ssh_cmd(config, f"sudo pct exec {config['target_id']} -- cat /proc/meminfo | grep -E 'MemTotal|MemFree|MemAvailable'")
    return cpu, mem

def calc_cpu_percent(stat1, stat2):
    try:
        v1 = list(map(int, stat1.split()[1:8]))
        v2 = list(map(int, stat2.split()[1:8]))
        idle1, idle2 = v1[3], v2[3]
        total1, total2 = sum(v1), sum(v2)
        if total2 - total1 == 0:
            return 0.0
        return round(100.0 * (1.0 - (idle2 - idle1) / (total2 - total1)), 1)
    except Exception:
        return "N/A"

def parse_mem(meminfo):
    lines = {}
    for line in meminfo.splitlines():
        parts = line.split()
        if len(parts) >= 2:
            lines[parts[0].rstrip(':')] = int(parts[1])
    total_mb = lines.get('MemTotal', 0) // 1024
    avail_mb = lines.get('MemAvailable', 0) // 1024
    used_mb = total_mb - avail_mb
    return total_mb, used_mb, avail_mb

def send_prompt(config, prompt, max_tokens=300):
    url = f"http://{config['npu_ip']}:{config['npu_port']}/v1/chat/completions"
    data = {
        'model': 'default',
        'messages': [{'role': 'user', 'content': prompt}],
        'max_tokens': max_tokens,
        'temperature': 0.7
    }
    
    req = urllib.request.Request(
        url,
        data=json.dumps(data).encode('utf-8'),
        headers={'Content-Type': 'application/json'}
    )
    
    # Bounded timeout for API gateway evaluation
    with urllib.request.urlopen(req, timeout=90) as resp:
        return json.loads(resp.read().decode())

def main():
    config = load_config()
    print("[*] NPU Performance evaluation initialized.")
    print(f"[*] Connecting to: {config['npu_ip']}:{config['npu_port']}")
    
    # Baseline hardware snapshot
    cpu_idle_base, mem_base = get_system_stats(config)
    if not mem_base:
        print("[-] Error: Unable to fetch system memory metadata from Proxmox.")
        sys.exit(1)
        
    total_mb, used_mb_base, avail_mb_base = parse_mem(mem_base)
    print(f"\n[SYSTEM BASELINE] RAM Total: {total_mb}MB | Used: {used_mb_base}MB | Available: {avail_mb_base}MB\n")
    
    results = []
    
    for q in EVAL_PROMPTS:
        print(f"\n{'='*60}")
        print(f"[{q['id']}] {q['label']}")
        print(f"{'='*60}")
        print(f"Prompt: {q['prompt'][:80]}...")
        
        cpu_stat_before, mem_before = get_system_stats(config)
        t_start = time.time()
        
        try:
            response = send_prompt(config, q['prompt'])
            t_end = time.time()
            elapsed = t_end - t_start
            
            cpu_stat_after, mem_after = get_system_stats(config)
            cpu_pct = calc_cpu_percent(cpu_stat_before, cpu_stat_after)
            _, used_mb_after, _ = parse_mem(mem_after)
            ram_delta = used_mb_after - used_mb_base
            
            answer = response['choices'][0]['message']['content'].strip()
            # Approximate output token count
            token_count = len(answer.split())
            tps = round(token_count / elapsed, 2) if elapsed > 0 else 0
            
            print(f"\nResponse ({elapsed:.2f}s | ~{tps} tokens/s | CPU Load: {cpu_pct}% | RAM Delta: {ram_delta}MB):\n")
            print(answer[:150] + "...\n[Output truncated for benchmark summary]")
            
            results.append({
                "id": q['id'],
                "label": q['label'],
                "elapsed_s": round(elapsed, 2),
                "tokens_out": token_count,
                "tokens_per_s": tps,
                "cpu_pct": cpu_pct,
                "ram_delta_mb": ram_delta
            })
            
        except Exception as e:
            print(f"ERROR: {e}")
            results.append({"id": q['id'], "label": q['label'], "error": str(e)})
            
    # Print clean benchmark summary table
    print(f"\n\n{'='*60}")
    print("  BENCHMARK SUMMARY — AX8850 LAMBERT Edge NPU Inference")
    print(f"{'='*60}")
    print(f"{'ID':<4} {'Label':<30} {'Time(s)':<9} {'Tok/s':<8} {'CPU%':<7} {'RAM ΔMB'}")
    print("-"*75)
    for r in results:
        if 'error' in r:
            print(f"{r['id']:<4} {r['label']:<30} ERROR: {r['error']}")
        else:
            print(f"{r['id']:<4} {r['label']:<30} {r['elapsed_s']:<9} {r['tokens_per_s']:<8} {r['cpu_pct']:<7} {r.get('ram_delta_mb','N/A')}")
    print(f"{'='*60}")

if __name__ == "__main__":
    main()
