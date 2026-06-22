#!/usr/bin/env python3
"""
Proxmox VM Provisioner
- Deploys a new VM template targeting the NPU compiler environment on the Proxmox host
- Configures virtual hardware specs, storage adapters, agent configurations, and mounts Cloud-Init disk
"""

import sys
import os
from npu_utils import load_env, get_required_env, get_ssh_client, get_env_or_default

def main():
    load_env()
    
    host = get_required_env('PROXMOX_HOST')
    user = get_required_env('PROXMOX_USER')
    password = get_env_or_default('PROXMOX_PASSWORD')
    key_file = get_env_or_default('SSH_KEY_PATH')
    target_id = get_required_env('NPU_TARGET_ID')
    
    # Load SSH public key to load into cloudinit guest config
    # Try environment variable first, then fallback to looking up key_file.pub
    pub_key = os.getenv('SSH_PUBLIC_KEY')
    if not pub_key and key_file:
        pub_key_path = key_file + ".pub"
        if os.path.exists(pub_key_path):
            with open(pub_key_path, 'r') as f:
                pub_key = f.read().strip()
                
    if not pub_key:
        print("[-] Configuration Error: Please export 'SSH_PUBLIC_KEY' or place a public key next to your private key file.")
        sys.exit(1)
        
    print(f"[*] Provisioning VM {target_id} on Proxmox host: {host}...")
    
    # Fetch the VM bootstrap password to use in Cloud-Init
    bootstrap_password = get_env_or_default('VM_BOOTSTRAP_PASSWORD', 'changeme-set-a-strong-password')

    commands = [
        # Write public key to temporary cloud-init load file
        f"echo '{pub_key}' > /tmp/npu_vm_keys",
        
        # Stop and destroy VM if it already exists (clean slate deployment)
        f"qm stop {target_id} || true",
        f"qm destroy {target_id} || true",
        
        # Create virtual machine definition
        f"qm create {target_id} --name blue-brain-npu-env --memory 8192 --cores 4 --cpu host --net0 virtio,bridge=vmbr0",
        
        # Import cloud-ready template image disk
        f"qm importdisk {target_id} /var/lib/vz/template/iso/ubuntu-24.04.img fast-tier",
        
        # Bind storage controllers
        f"qm set {target_id} --scsihw virtio-scsi-pci --scsi0 fast-tier:vm-{target_id}-disk-0",
        
        # Attach cloud-init block device
        f"qm set {target_id} --ide2 fast-tier:cloudinit",
        
        # Set boot loader priority
        f"qm set {target_id} --boot c --bootdisk scsi0",
        
        # Set up serial and console options
        f"qm set {target_id} --serial0 socket --vga serial0",
        
        # Enable guest integration agent
        f"qm set {target_id} --agent enabled=1",
        
        # Expand storage allocation allocation
        f"qm resize {target_id} scsi0 100G",
        
        # Set system machine target
        f"qm set {target_id} --machine q35",
        
        # Configure default administrative credentials and auto network configurations
        f"qm set {target_id} --ciuser root --cipassword '{bootstrap_password}' --ipconfig0 ip=dhcp",
        
        # Apply the ssh credential hooks
        f"qm set {target_id} --sshkeys /tmp/npu_vm_keys",
        
        # Cleanup temporary keys
        "rm -f /tmp/npu_vm_keys"
    ]
    
    client = get_ssh_client(host, user, key_file, password)
    try:
        for cmd in commands:
            print(f"[*] Running: {cmd}")
            stdin, stdout, stderr = client.exec_command(cmd)
            exit_status = stdout.channel.recv_exit_status()
            out = stdout.read().decode().strip()
            err = stderr.read().decode().strip()
            if out:
                print(f"    STDOUT: {out}")
            if err and exit_status != 0:
                print(f"    STDERR: {err}")
                print(f"[-] Command failed with exit code: {exit_status}")
                sys.exit(1)
        print("[+] VM provisioned successfully.")
    finally:
        client.close()

if __name__ == "__main__":
    main()
