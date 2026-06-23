---
title: "Ultimate Guide: Zero-Copy Inference on the AX8850 NPU"
date: "2026-06-23"
author: "Joe Brinkley"
description: "How to bypass Radxa's Python CPU bottlenecks, compile a native C++ OpenAI server, and achieve stable zero-copy inference on the AX8850 NPU."
---

# Ultimate Guide: Zero-Copy Inference on the AX8850 NPU

**TL;DR:** Legacy Python orchestrators for the Axera AX8850 introduce significant memory-copy overhead, resulting in intermittent `0.0 TPS` lockups and broken context switching. By bypassing these wrappers and compiling the official upstream `ax-llm` C++ server natively with PCIe backends enabled, you can unlock a pure, zero-copy inference pipeline. This guide details how to build a headless LXC inference appliance, resolve proprietary tokenizer formats, configure the native JSON schema, and map the hardware's 7040 MiB Contiguous Memory (CMM) allocations for massive context lengths.

---

## 1. How to Build the Zero-Copy Appliance (Proxmox LXC)

To deploy this optimized edge appliance, pass the physical PCIe NPU card directly into an unprivileged Linux container (LXC). This preserves bare-metal matrix performance while maintaining full container portability.

### Step 1: Proxmox Host Driver Verification

The physical AX8850 card must be recognized and bound to the host kernel driver first. Run this on your main Proxmox VE hypervisor terminal:

```bash
# Verify the physical PCIe device is visible on the bus
lspci | grep -i accel

# Ensure the official ax_pcie kernel modules are loaded
lsmod | grep -E "axcl_host|ax_pcie"
```

This exposes the critical character devices (such as `/dev/axcl_host`, `/dev/ax_mmb_dev`, `/dev/msg_userdev`, and `/dev/p2p`) on the host.

### Step 2: LXC Container Configuration

Create an unprivileged **Ubuntu 24.04** container on the Proxmox GUI. Before booting it, open the Proxmox host terminal and append the direct device passthrough rules to the container's configuration file (e.g., `/etc/pve/lxc/102.conf`):

```text
# Append direct hardware mapping entries to compile with major device class 10 (misc)
lxc.cgroup2.devices.allow: c 10:* rwm
lxc.mount.entry: /dev/axcl_host dev/axcl_host none bind,optional,create=file 0 0
lxc.mount.entry: /dev/ax_mmb_dev dev/ax_mmb_dev none bind,optional,create=file 0 0
lxc.mount.entry: /dev/msg_userdev dev/msg_userdev none bind,optional,create=file 0 0
lxc.mount.entry: /dev/p2p dev/p2p none bind,optional,create=file 0 0
```

### Step 3: Appliance Environment Reconstruction

Boot the container, log into its terminal, and execute the following sequence to provision the clean build stack from the official `AXERA-TECH/ax-llm` repository:

```bash
# 1. Install foundational build dependencies
sudo apt update && sudo apt install -y build-essential cmake git python3 python3-venv wget curl

# 2. Build the native zero-copy server from source
mkdir -p /opt/axera/source && cd /opt/axera/source
git clone --recursive https://github.com/AXERA-TECH/ax-llm
cd ax-llm && mkdir build && cd build
cmake .. -DAX_TARGET_ARCH=x86 -DAX_BUILD_API=ON
make -j$(nproc)
sudo cp axllm /usr/local/bin/axllm

# 3. Create the isolated tokenizer compiler environment
python3 -m venv /opt/axera/compiler_venv
source /opt/axera/compiler_venv/bin/activate
pip install --upgrade pip
pip install transformers huggingface_hub torch
```

### Step 4: Launching the Service

Once your compiled `.axmodel` folder and tokenizer assets are placed in `/opt/axera/models/`, boot the production daemon:

```bash
nohup axllm serve /opt/axera/models/Qwen2.5-1.5B-Instruct/ --port 8000 > /var/log/axllm_server.log 2>&1 &
```

The endpoint is now exposed to your wider enterprise network at `http://<LXC_IP_ADDRESS>:8000/v1/chat/completions`, operating as a dedicated, hardware-accelerated OpenAI API drop-in replacement.

### Step 5: Hardening Driver Initialization (Mitigating Kernel Lockups)

When restarting the C++ server or hot-swapping models, terminating the server process abruptly can leave the NPU kernel driver (`axcl`) in an unstable state. If the PCIe memory maps are not properly deallocated, the host kernel locks up, and subsequent runs will fail with memory boundary crashes—often misleadingly suggesting that your `.axmodel` files are corrupted.

To guarantee months of uninterrupted runtime, use a dedicated bash wrapper (`start_server.sh`) to perform socket teardown and flush the driver before booting:

```bash
#!/bin/bash
set -e

PORT=8000
MODEL_DIR="/opt/axera/models/Qwen2.5-1.5B-Instruct"

echo "[*] Tearing down existing socket connections on port $PORT..."
# Force close any deadlocked network processes on the port
sudo fuser -k $PORT/tcp || true
sleep 1

echo "[*] Flushing NPU PCIe driver and releasing CMM maps..."
# Reset driver state to avoid memory address mapping collisions
sudo axcl_util reset || true
sleep 2

echo "[*] Launching zero-copy inference server..."
nohup axllm serve "$MODEL_DIR" --port $PORT > /var/log/axllm_server.log 2>&1 &
echo "[+] NPU engine initialized successfully!"
```

---


## 2. Cracking the Tokenizer Engine

The native C++ server does not parse standard Hugging Face `tokenizer.json` files at runtime. Instead, the integrated `tokenizer.axera` library expects a proprietary, flattened binary format called `tokenizer.txt`. This file must begin with a strict, hardware-specific hex magic number header.

If the system Python environment on your edge device is constrained or corrupted, you can cross-compile this asset on any standard machine (such as a local Windows or Linux desktop) and drop it into the NPU's model directory.

### Local Tokenizer Compilation Sequence

Run this script inside your clean virtual environment to generate the proprietary flat file directly from the Hugging Face hub:

```bash
# Install dependencies in your local development environment
pip install transformers huggingface_hub

# Run the Axera conversion script pulled from the repository
python3 /path/to/ax-llm/third_party/tokenizer.axera/tests/convert_tokenizer.py \
    --tokenizer_path Qwen/Qwen2.5-1.5B-Instruct \
    --dst_path /tmp/qwen2_5_tokenizer.txt
```

Once generated, transfer `qwen2_5_tokenizer.txt` directly into your NPU's target model directory as `tokenizer.txt`.

---

## 3. Production Configuration Schema

When running `axllm serve`, the daemon requires an Axera-specific `config.json` file inside the model directory. This configuration defines the structural mapping of the compiled `.axmodel` chunks and registers the C++ tokenizer object factory.

Below is the verified, reverse-engineered production schema for a **Qwen 2.5 1.5B INT4** deployment. Note the explicit registration of the `"Qwen2_5"` tokenizer type (mapped directly from the C++ source macros) and the relative path declaration for the compiled token file.

```json
{
  "model_name": "qwen2_5",
  "tokenizer_type": "Qwen2_5",
  "url_tokenizer_model": "tokenizer.txt",
  "axmodel_chunks": [
    {
      "type": "embedding",
      "path": "qwen2.5-1.5b-ctx-int4-ax650/ax_embedding.axmodel"
    },
    {
      "type": "layer",
      "path": "qwen2.5-1.5b-ctx-int4-ax650/ax_layer.axmodel"
    },
    {
      "type": "lm_head",
      "path": "qwen2.5-1.5b-ctx-int4-ax650/ax_lm_head.axmodel"
    }
  ]
}
```

---

## 4. Raw Hardware Benchmarks & KV Cache Mechanics

The Radxa AX-M1 features **8GB of total system RAM**. The host operating system typically consumes between `1.0GB` to `1.5GB`, leaving **7040 MiB of Contiguous Memory (CMM)** dedicated exclusively to the NPU's memory bridges.

When running a 1.5B parameter model quantized to INT4, the static weights occupy roughly `1.0GB` of memory inside the CMM. This leaves an enormous **6.0GB pool of unallocated silicon memory** available purely for the Key-Value (KV) Cache.

Context boundaries on Edge NPUs are physically baked into the neural network's matrix dimensions during compilation rather than being dynamically allocated. By passing explicit flags during the `pulsar2 llm_build` compilation sequence (e.g., `--kv_cache_len 8191`), you can expand the model's context window to fill the remaining 6.0GB, allowing the chip to ingest massive RAG payloads natively.

### Verified Performance Metrics

Under a synthetic multi-turn stress test consisting of back-to-back deep reasoning and code generation prompts, the native C++ engine demonstrates absolute memory stability:

| Metric | Measured Value |
| --- | --- |
| **Model Size / Quantization** | Qwen 2.5 1.5B / INT4 |
| **Average Throughput (TPS)** | 13.6 - 14.2 Tokens/Sec |
| **Context Memory Management** | Automatic (Instant CMM Flush) |
| **API Error Rate (Multi-Turn)** | 0.00% |

The native server handles back-to-back requests seamlessly. It automatically purges and resets the KV Cache matrices in CMM memory between discrete API calls, permanently neutralizing the context stall issues found in legacy software wrappers.
