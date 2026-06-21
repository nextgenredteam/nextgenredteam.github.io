#!/usr/bin/env python3
"""
NPU Golden Combo Deployer
- Compiles models targeting the AX650 fallback architecture to bypass mRoPE and SRAM tiler restrictions
- Pushes and executes the compilation script inside the Proxmox LXC container
- Verifies model inference natively on the AX8850 silicon
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
    
    # Target model details (can override via command line arguments)
    repo = sys.argv[1] if len(sys.argv) > 1 else "Qwen/Qwen1.5-0.5B-Chat-GPTQ-Int4"
    model_name = repo.split('/')[-1]
    
    print(f"[*] Initializing Golden Combo pipeline for: {repo}")
    print(f"[*] Target Proxmox Host: {host} (Container: {target_id})")
    
    bash_script = f"""#!/bin/bash
set -e

# Setup compilation path environment
source /home/{npu_user}/npu_scripts/venv/bin/activate || true
export PATH="/usr/local/bin:/opt/axera/compiler/ax_pulsar2_6.0_package/bin:$PATH"
PULSAR2="/usr/local/bin/pulsar2"

REPO="{repo}"
MODEL_NAME="{model_name}"
RAW_DIR="/opt/axera/models/${{MODEL_NAME}}-RAW"
OUT_DIR_AX650="/opt/axera/models/${{MODEL_NAME}}-AX650"
LOG="/opt/axera/models/golden_combo.log"

echo "--- THE GOLDEN COMBO PIPELINE ---" > $LOG

if [ ! -d "$RAW_DIR" ] || [ -z "$(ls -A $RAW_DIR 2>/dev/null)" ]; then
    mkdir -p $RAW_DIR
    echo "[*] Downloading $REPO..." | tee -a $LOG
    python3 -c "from huggingface_hub import snapshot_download; snapshot_download(repo_id='$REPO', local_dir='$RAW_DIR')"
fi

echo "[*] Compiling model for AX650 architecture target..." | tee -a $LOG
rm -rf $OUT_DIR_AX650

if $PULSAR2 llm_build \\
    --input_path $RAW_DIR \\
    --output_path $OUT_DIR_AX650 \\
    --chip AX650 \\
    --hidden_state_type bf16 \\
    --weight_type s4 \\
    --post_weight_type s8 \\
    --kv_cache_len 2048 \\
    --prefill_len 128 \\
    --parallel 2 > /opt/axera/models/plan_compile.log 2>&1; then
    
    echo "[+] Compilation passed!" | tee -a $LOG
    cp $RAW_DIR/*.json $OUT_DIR_AX650/ 2>/dev/null || true
    cp $RAW_DIR/*.txt $OUT_DIR_AX650/ 2>/dev/null || true
    mkdir -p $OUT_DIR_AX650/kvcache
    chmod -R 777 $OUT_DIR_AX650
    
    echo "[*] Testing native compatibility on AX8850 silicon..." | tee -a $LOG
    pkill -9 -f axllm || true
    sleep 2
    
    # Run server in background
    axllm serve --model $OUT_DIR_AX650 --host 0.0.0.0 --port 8000 > /opt/axera/models/axllm_serve_ax650.log 2>&1 &
    SERVER_PID=$!
    sleep 25
    
    if grep -q "0x8030070c" /opt/axera/models/axllm_serve_ax650.log; then
        echo "[-] ERROR 0x8030070c: Native hardware allocation rejected this architecture format." | tee -a $LOG
        kill -9 $SERVER_PID || true
        exit 1
    else
        echo "[*] Sending local validation completion test..." | tee -a $LOG
        RESPONSE=$(curl -s -X POST http://127.0.0.1:8000/v1/chat/completions \\
            -H "Content-Type: application/json" \\
            -d '{{"model": "default", "messages": [{{"role": "user", "content": "What is 2+2? Answer simply."}}], "max_tokens": 15}}')
        echo "[+] Response: $RESPONSE" | tee -a $LOG
        echo "--- GOLDEN COMBO PIPELINE SUCCESS ---" >> $LOG
    fi
    kill -9 $SERVER_PID || true
else
    echo "[-] ERROR: Compilation failed." | tee -a $LOG
    tail -n 20 /opt/axera/models/plan_compile.log | tee -a $LOG
    echo "--- GOLDEN COMBO PIPELINE FAILED ---" >> $LOG
    exit 1
fi
"""

    # Establish SSH connection
    client = get_ssh_client(host, user, key_file, password)
    
    try:
        # Write temporary script
        print("[*] Uploading compilation script to Proxmox...")
        sftp = client.open_sftp()
        tmp_script_path = '/tmp/npu_golden_combo.sh'
        with sftp.file(tmp_script_path, 'w') as f:
            f.write(bash_script)
        sftp.close()
        
        target_path = f"/home/{npu_user}/npu_scripts/npu_golden_combo.sh"
        
        # Deploy and make executable
        client.exec_command(f"sudo pct push {target_id} {tmp_script_path} {target_path}")
        client.exec_command(f"sudo pct exec {target_id} -- chmod +x {target_path}")
        
        # Execute asynchronously
        print("[*] Starting remote compilation and verification loop...")
        client.exec_command(f"sudo pct exec {target_id} -- bash -c 'nohup {target_path} > /opt/axera/models/golden_combo_stdout.log 2>&1 &'")
        
        # Poll status
        print("[*] Waiting for pipeline completion...")
        while True:
            time.sleep(15)
            stdin, stdout, stderr = client.exec_command(f"sudo pct exec {target_id} -- cat /opt/axera/models/golden_combo.log")
            log_out = stdout.read().decode()
            
            if any(marker in log_out for marker in ['SUCCESS', 'FAILED']):
                print("\n--- PIPELINE EXECUTION COMPLETED ---")
                print(log_out)
                break
            else:
                print("... compiling and preparing graph model ...")
                
    finally:
        client.close()

if __name__ == "__main__":
    main()
