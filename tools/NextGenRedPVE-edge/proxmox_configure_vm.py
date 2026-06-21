#!/usr/bin/env python3
"""
Proxmox VM Guest Configurator
- Resolves guest container/VM dynamic IP from Proxmox agent
- Connects directly to the VM guest to configure administrative user permissions
- Pre-installs build dependencies, compilers, libraries, and guest agents
"""

import sys
import os
import json
import re
import paramiko
from npu_utils import load_env, get_required_env, get_ssh_client, get_env_or_default

def get_vm_ip(client, target_id):
    """
    Attempts to resolve guest IP via guest agent interfaces.
    Falls back to parsing host ARP neighbor table.
    """
    print(f"[*] Querying guest agent network interfaces for VM {target_id}...")
    stdin, stdout, stderr = client.exec_command(f"qm agent {target_id} network-get-interfaces")
    exit_status = stdout.channel.recv_exit_status()
    out = stdout.read().decode().strip()
    
    if exit_status == 0 and out:
        try:
            interfaces = json.loads(out).get("result", [])
            for iface in interfaces:
                if iface.get("name") == "lo":
                    continue
                for ip_info in iface.get("ip-addresses", []):
                    if ip_info.get("ip-address-type") == "ipv4":
                        ip = ip_info.get('ip-address')
                        print(f"[+] Found IP via QEMU Guest Agent: {ip}")
                        return ip
        except Exception as e:
            print(f"[-] Error parsing guest agent interface output: {e}")
            
    # Fallback to Host ARP matching
    print("[*] Guest agent query failed or returned no IP. Querying host ARP table...")
    stdin, stdout, stderr = client.exec_command(f"qm config {target_id} | grep -i 'net0'")
    conf_exit = stdout.channel.recv_exit_status()
    conf_out = stdout.read().decode().strip()
    
    if conf_exit == 0 and conf_out:
        match = re.search(r'([0-9a-fA-F]{2}(?::[0-9a-fA-F]{2}){5})', conf_out)
        if match:
            mac = match.group(1).lower()
            stdin, stdout, stderr = client.exec_command(f"ip neigh show | grep -i {mac}")
            arp_exit = stdout.channel.recv_exit_status()
            arp_out = stdout.read().decode().strip()
            
            if arp_exit == 0 and arp_out:
                ip = arp_out.split()[0]
                print(f"[+] Found IP matching MAC address {mac} in ARP table: {ip}")
                return ip
                
    return None

def configure_guest(ip, key_file, pub_key, npu_user):
    """
    Configures guest dependencies and setups non-root users.
    """
    print(f"[*] Bootstrapping environment on guest IP {ip} as user '{npu_user}'...")
    
    commands = [
        # Set up dynamic non-root user
        f"useradd -m -s /bin/bash {npu_user} || true",
        f"mkdir -p /home/{npu_user}/.ssh",
        f"echo '{pub_key}' > /home/{npu_user}/.ssh/authorized_keys",
        f"chown -R {npu_user}:{npu_user} /home/{npu_user}/.ssh",
        f"chmod 700 /home/{npu_user}/.ssh",
        f"chmod 600 /home/{npu_user}/.ssh/authorized_keys",
        f"echo '{npu_user} ALL=(ALL) NOPASSWD:ALL' > /etc/sudoers.d/{npu_user}",
        f"chmod 0440 /etc/sudoers.d/{npu_user}",
        
        # Install foundational compilation packages and utility drivers
        "apt-get update",
        "DEBIAN_FRONTEND=noninteractive apt-get upgrade -y",
        "DEBIAN_FRONTEND=noninteractive apt-get install -y build-essential git cmake python3-pip linux-headers-generic qemu-guest-agent curl",
        "systemctl enable qemu-guest-agent || true",
        "systemctl start qemu-guest-agent || true"
    ]
    
    guest_client = paramiko.SSHClient()
    guest_client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        # Connect to VM directly via SSH public key (or default password fallback)
        if key_file and os.path.exists(key_file):
            guest_client.connect(ip, port=22, username='root', key_filename=key_file, timeout=15)
        else:
            guest_client.connect(ip, port=22, username='root', password='changeme-set-a-strong-password', timeout=15)
            
        for cmd in commands:
            print(f"[*] Running on Guest: {cmd[:60]}...")
            stdin, stdout, stderr = guest_client.exec_command(cmd)
            exit_status = stdout.channel.recv_exit_status()
            if exit_status != 0:
                err_out = stderr.read().decode().strip()
                print(f"[-] Command failed: {err_out}")
                sys.exit(1)
                
        print("[+] Guest VM bootstrapped and users configured successfully.")
    finally:
        guest_client.close()

def main():
    load_env()
    
    host = get_required_env('PROXMOX_HOST')
    user = get_required_env('PROXMOX_USER')
    password = get_env_or_default('PROXMOX_PASSWORD')
    key_file = get_env_or_default('SSH_KEY_PATH')
    target_id = get_required_env('NPU_TARGET_ID')
    npu_user = get_required_env('NPU_USER')
    
    # Load SSH public key
    pub_key = os.getenv('SSH_PUBLIC_KEY')
    if not pub_key and key_file:
        pub_key_path = key_file + ".pub"
        if os.path.exists(pub_key_path):
            with open(pub_key_path, 'r') as f:
                pub_key = f.read().strip()
                
    if not pub_key:
        print("[-] Configuration Error: Please export 'SSH_PUBLIC_KEY'.")
        sys.exit(1)
        
     client = get_ssh_client(host, user, key_file, password)
    
    try:
        # Resolve target VM dynamic IP address
        ip = get_vm_ip(client, target_id)
        if not ip:
            print(f"[-] Error: Could not resolve IP for VM {target_id}. Ensure the guest is running.")
            sys.exit(1)
            
        configure_guest(ip, key_file, pub_key, npu_user)
    finally:
        client.close()

if __name__ == "__main__":
    main()
