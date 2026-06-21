# Axera AX8850 NPU Deployment & Benchmarking Toolkit

This repository contains Python deployment, configuration, and benchmarking utilities to automate running Large Language Models (LLMs) on the **Axera AX8850 (LAMBERT)** Edge Neural Processing Unit (NPU).

## Overview

Deploying LLMs onto hardware accelerators often involves navigating rigid compiler boundaries. During deployment research for the AX8850 NPU, we identified two main compiler/hardware hurdles and engineered pathways to solve them:

1. **The `mRoPE` Compiler Exception:** Models using multi-core Rotary Position Embedding (like DeepSeek) trigger unhandled crashes in the `pulsar2` compiler. The toolkit enforces targeting standard RoPE models (e.g., Qwen, Llama, Gemma).
2. **The `TileFailException`:** The C++ SRAM tiler on the AX8850 strictly requires grouped quantization. Compiling raw float weights via `--weight_type s4` causes fallback allocation crashes. The solution is the **Golden Combo**: start with pre-quantized GPTQ-Int4 or AWQ models (groupN=128), which tile into SRAM natively.
3. **The AX650 cross-compatibility spoof:** The AX8850 silicon natively executes binary `.axmodel` graphs compiled for the older AX650 chip. This bypasses the local compiler step entirely by using pre-compiled binaries from vendor distributions (e.g. Hugging Face `AXERA-TECH`).

---

## Repository Structure

*   `npu_utils.py` - Core helper containing config loaders (`.env`) and SSH client handlers.
*   `deploy_golden_combo.py` - Downloads raw GPTQ-Int4 models, uploads them to the host, compiles them using Pulsar2 targeting the AX650 fallback, and boots the gateway.
*   `deploy_precompiled.py` - Downloads pre-compiled models directly from Hugging Face (such as Gemma or Qwen3.5) and boots them.
*   `benchmark_npu.py` - Connects to the host to query system CPU/RAM usage and tracks inference throughput (tokens/sec) across standardized evaluation prompts.
*   `proxmox_create_vm.py` - Provisioning automation to spin up NPU guest environments on Proxmox hosts.
*   `proxmox_configure_vm.py` - Bootstrapping script to set up packages, compilers, and user access inside guest environments.
*   `.env.example` - Template showing required configuration variables.

---

## Getting Started

### 1. Configure the Environment
Copy `.env.example` to `.env` and fill in your Proxmox credentials and target IP paths:
```bash
cp .env.example .env
# Edit .env with your environment configuration
```

### 2. Provision & Configure the Guest environment (Optional)
If setting up a fresh compiler VM on your Proxmox node:
```bash
python3 proxmox_create_vm.py
python3 proxmox_configure_vm.py
```

### 3. Deploy a Pre-compiled AX650 Model (Recommended)
To deploy a model without compiling locally, pull a pre-compiled model from Hugging Face:
```bash
# Deploys Gemma 2.6B (compiled for AX650, running natively on AX8850)
python3 deploy_precompiled.py AXERA-TECH/gemma-4-E2B-it-GPTQ-INT4

# Deploys Qwen 3.5 0.8B
python3 deploy_precompiled.py AXERA-TECH/Qwen3.5-0.8B-AX650-GPTQ-Int4-C128-P1152-CTX2047
```

### 4. Compile a Custom Model (Golden Combo)
To compile a custom model from a Hugging Face pre-quantized repository:
```bash
python3 deploy_golden_combo.py Qwen/Qwen1.5-0.5B-Chat-GPTQ-Int4
```

### 5. Run Performance Benchmarks
To evaluate inference throughput, system memory delta, and NPU CPU overhead:
```bash
python3 benchmark_npu.py
```

---

## Security Audit & Isolation Best Practices
*   **Zero Credentials checked-in:** All scripts reference environment settings via `npu_utils.py` and `.env` parsing. Never commit `.env` or SSH keys.
*   **Access Controls:** VM guest configuration scripts install non-root SSH profiles with customized passwordless sudo constraints restricted solely to NPU operations.
*   **Bounded Process Lifetimes:** Deployment validation includes automated cleanup (`pkill` traps) to ensure memory caches do not leak between server restarts.
