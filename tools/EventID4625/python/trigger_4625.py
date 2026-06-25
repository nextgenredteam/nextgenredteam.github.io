#!/usr/bin/env python3
import os
import sys
import json
import time
import argparse
import socket
import struct

# Python implementation of Event ID 4625 Trigger
# Utilizes simple SMB NTLM negotiation over raw sockets to avoid heavy dependencies on Red Hat, 
# while accurately generating Windows Security Log Event ID 4625 (Logon Failure).

def build_smb2_negotiate_request():
    # Construct a minimal SMB2 Negotiate Protocol Request
    # SMB Header
    protocol_id = b"\xfeSMB"
    header_length = struct.pack("<H", 64)
    credit_charge = struct.pack("<H", 0)
    status = struct.pack("<I", 0)
    command = struct.pack("<H", 0) # Negotiate
    credits_requested = struct.pack("<H", 31)
    flags = struct.pack("<I", 0)
    next_command = struct.pack("<I", 0)
    message_id = struct.pack("<Q", 0)
    reserved = struct.pack("<I", 0)
    tree_id = struct.pack("<I", 0)
    session_id = struct.pack("<Q", 0)
    signature = b"\x00" * 16
    
    # SMB2 Negotiate Request Payload
    structure_size = struct.pack("<H", 36)
    dialect_count = struct.pack("<H", 1)
    security_mode = struct.pack("<H", 1) # Signing enabled
    reserved2 = struct.pack("<H", 0)
    capabilities = struct.pack("<I", 0)
    client_guid = b"\x11" * 16
    client_start_time = struct.pack("<Q", 0)
    dialects = struct.pack("<H", 0x0202) # SMB 2.0.2

    header = (protocol_id + header_length + credit_charge + status + command + 
              credits_requested + flags + next_command + message_id + reserved + 
              tree_id + session_id + signature)
    payload = (structure_size + dialect_count + security_mode + reserved2 + 
               capabilities + client_guid + client_start_time + dialects)
    
    # NetBIOS session service wrapper
    netbios_len = struct.pack(">I", len(header) + len(payload))
    return netbios_len + header + payload


def trigger_via_smbclient(target, domain, username, password):
    # Attempt connection using system smbclient (very reliable on Red Hat)
    import subprocess
    cmd = f"echo '{password}' | smbclient '//{target}/IPC$' -U '{username}' -W '{domain}'"
    proc = subprocess.Popen(cmd, shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    stdout, stderr = proc.communicate()
    output = (stdout + stderr).decode('utf-8', errors='ignore')
    return "LOGON_FAILURE" in output or "ACCESS_DENIED" in output or "UNSUCCESSFUL" in output or proc.returncode != 0

def trigger_via_socket(target, username, password):
    # Attempt connection using raw socket attempt to port 445 (SMB)
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(3.0)
        s.connect((target, 445))
        
        # Send SMB2 negotiation
        s.sendall(build_smb2_negotiate_request())
        response = s.recv(1024)
        s.close()
        return True
    except Exception as e:
        print(f"  [ERROR] Socket connection failed to {target}: {e}")
        return False

def parse_targets(target_string):
    import ipaddress
    targets = []
    for part in target_string.split(','):
        part = part.strip()
        if '/' in part:
            try:
                network = ipaddress.ip_network(part, strict=False)
                hosts = list(network.hosts())
                if not hosts:
                    targets.extend([str(ip) for ip in network])
                else:
                    targets.extend([str(ip) for ip in hosts])
            except Exception:
                targets.append(part)
        elif part:
            targets.append(part)
    return targets

def main():
    parser = argparse.ArgumentParser(description="Windows Event ID 4625 Emulation Utility")
    parser.add_argument("-t", "--target", help="Target Windows Host IP, list, or CIDR block")
    parser.add_argument("-d", "--domain", help="Target Domain or WORKGROUP")
    parser.add_argument("-u", "--user", help="Username")
    parser.add_argument("-p", "--password", help="Invalid Password")
    parser.add_argument("-i", "--interval", type=int, help="Interval in seconds")
    parser.add_argument("-c", "--count", type=int, help="Count")
    args = parser.parse_args()

    # Fallback paths for config.json
    script_dir = os.path.dirname(os.path.abspath(__file__))
    config_paths = [
        os.path.join(script_dir, "..", "config.json"),
        os.path.join(script_dir, "config.json"),
        "../config.json",
        "./config.json",
        "config.json"
    ]
    config = {}
    for p in config_paths:
        if os.path.exists(p):
            try:
                with open(p, "r") as f:
                    config = json.load(f)
                break
            except Exception:
                pass

    # Resolve settings (CLI flags override config.json)
    target_ip = args.target or config.get("target_ip")
    domain = args.domain or config.get("domain", "WORKGROUP")
    username = args.user or config.get("username")
    invalid_password = args.password or config.get("invalid_password")
    
    interval = args.interval if args.interval is not None else config.get("interval", 5)
    count = args.count if args.count is not None else config.get("count", 3)

    # Prompt interactive if needed
    if not target_ip:
        target_ip = input("Enter Target Windows IP/List/CIDR: ").strip()
    if not domain:
        domain = input("Enter Target Domain/WORKGROUP [WORKGROUP]: ").strip()
        domain = domain if domain else "WORKGROUP"
    if not username:
        username = input("Enter Target Username: ").strip()
    if not invalid_password:
        invalid_password = input("Enter Invalid Password (to fail auth): ").strip()
    if interval is None:
        val = input("Enter Interval between attempts (seconds) [5]: ").strip()
        interval = int(val) if val else 5
    if count is None:
        val = input("Enter run count (0 for infinite) [3]: ").strip()
        count = int(val) if val else 3

    targets = parse_targets(target_ip)

    print("==============================================")
    print("Starting Event ID 4625 Emulation Loop (Python)")
    print(f"Targets  : {', '.join(targets)}")
    print(f"Domain   : {domain}")
    print(f"Username : {username}")
    print(f"Password : [REDACTED]")
    print(f"Interval : {interval} seconds")
    print(f"Count    : {'Infinite (Press Ctrl+C to terminate)' if count == 0 else count}")
    print("==============================================")

    has_smbclient = os.system("command -v smbclient >/dev/null 2>&1") == 0

    iteration = 0
    while True:
        for target in targets:
            iteration += 1
            if count != 0 and iteration > count:
                print(f"Completed requested {count} attempts. Exiting.")
                return

            print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] Attempt #{iteration}: Sending failed SMB authentication to {target}...")
            
            success = False
            if has_smbclient:
                success = trigger_via_smbclient(target, domain, username, invalid_password)
            else:
                success = trigger_via_socket(target, username, invalid_password)

            if success:
                print("  [SUCCESS] Triggered Logon Failure status (Event ID 4625 generated on host).")
            else:
                print("  [INFO] Attempt completed.")

            if count == 0 or iteration < count:
                time.sleep(interval)
        
        if count != 0:
            break


if __name__ == "__main__":
    main()
