#!/usr/bin/env python3
"""
NPU Pre-compiled Model Deployer
- Downloads a pre-compiled AX650 model from Hugging Face (e.g. Gemma, Qwen3.5, etc.)
- Skips the local compiler phase entirely by utilizing AX8850 backward-compatibility
- Configures directories, sets up CMM allocator, and boots the axllm server
"""

import time
import sys
from npu_utils import load_env, get_required_env, get_ssh_client, get_env_or_default

def main():
    # Load configuration
    load_env()
    
    host = get_required_env('PROXMOX_HOST')
    user = get_required_env('PROXMOX_USER')
    password = get_env_or_default('PROXMOX_PASSWORD')
    key_file = get_env_or_default('SSH_KEY_PATH')
    target_id = get_required_env('NPU_TARGET_ID')
    npu_user = get_required_env('NPU_USER')
    
    # Configure model to deploy from command line arguments or default
    repo = sys.argv[1] if len(sys.argv) > 1 else "AXERA-TECH/gemma-4-E2B-it-GPTQ-INT4"
    model_dir_name = repo.split('/')[-1]
    
    print(f"[*] Initializing pre-compiled model deployment: {repo}")
    print(f"[*] Target Proxmox Host: {host} (Container: {target_id})")
    
    bash_script = f"""#!/bin/bash
set -e

source /home/{npu_user}/npu_scripts/venv/bin/activate || true
export HF_XET_HIGH_PERFORMANCE=1

REPO="{repo}"
MODEL_DIR="/opt/axera/models/{model_dir_name}"
LOG="/opt/axera/models/{model_dir_name}_deploy.log"

echo "--- DEPLOYING PRE-COMPILED MODEL: $REPO ---" > $LOG

if [ ! -d "$MODEL_DIR" ] || [ -z "$(ls -A $MODEL_DIR 2>/dev/null)" ]; then
    mkdir -p $MODEL_DIR
    echo "[*] Downloading pre-compiled slices from HuggingFace..." | tee -a $LOG
    python3 -c "from huggingface_hub import snapshot_download; snapshot_download(repo_id='$REPO', local_dir='$MODEL_DIR')"
fi

echo "[*] Initializing local KV-cache and folder permissions..." | tee -a $LOG
mkdir -p $MODEL_DIR/kvcache
chmod -R 777 $MODEL_DIR

if [ ! -f "$MODEL_DIR/config.json" ]; then
    echo "[-] ERROR: config.json not found in model path! Download incomplete." | tee -a $LOG
    exit 1
fi

echo "[*] Shutting down active inference gateways..." | tee -a $LOG
pkill -9 -f axllm || true
sleep 2

echo "[*] Allocating CMM memory and booting axllm serve..." | tee -a $LOG
# Start the API gateway serving the pre-compiled graph model
axllm serve $MODEL_DIR --host 0.0.0.0 --port 8000 > /opt/axera/models/axllm_serve_{model_dir_name}.log 2>&1 &
SERVER_PID=$!

# Bounded sleep timeout to allow large model graphs to allocate CMM slices
sleep 45

echo "[*] Performing inference completion validation..." | tee -a $LOG
cat << 'EOF' > /tmp/test_payload.json
{{
  "model": "default",
  "messages": [{{"role": "user", "content": "What is 2+2? Answer simply."}}],
  "max_tokens": 10
}}
EOF

RESPONSE=$(curl -s -X POST http://127.0.0.1:8000/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -d @/tmp/test_payload.json)

echo "[+] Inference response check:" | tee -a $LOG
echo "$RESPONSE" | tee -a $LOG

echo "--- DEPLOYMENT COMPLETE ---" >> $LOG
"""

    client = get_ssh_client(host, user, key_file, password)
    
    try:
        print("[*] Uploading deployment script to Proxmox...")
        sftp = client.open_sftp()
        tmp_script_path = '/tmp/npu_deploy_precompiled.sh'
        with sftp.file(tmp_script_path, 'w') as f:
            f.write(bash_script)
        sftp.close()
        
        target_path = f"/home/{npu_user}/npu_scripts/npu_deploy_precompiled.sh"
        
        client.exec_command(f"sudo pct push {target_id} {tmp_script_path} {target_path}")
        client.exec_command(f"sudo pct exec {target_id} -- chmod +x {target_path}")
        
        print("[*] Running script on container asynchronously...")
        client.exec_command(f"sudo pct exec {target_id} -- bash -c 'nohup {target_path} > /opt/axera/models/{model_dir_name}_deploy_stdout.log 2>&1 &'")
        
        print("[*] Checking logs for completion...")
        while True:
            time.sleep(15)
            stdin, stdout, stderr = client.exec_command(f"sudo pct exec {target_id} -- cat /opt/axera/models/{model_dir_name}_deploy.log")
            log_out = stdout.read().decode()
            
            if 'COMPLETE' in log_out or 'ERROR' in log_out:
                print("\n--- DEPLOYMENT RESULT ---")
                print(log_out)
                break
            else:
                print("... downloading / preparing model ...")
                
    finally:
        client.close()

if __name__ == "__main__":
    main()
