---
title: "Taming the Edge: Bypassing Axera AX8850 NPU Compiler Constraints"
date: "2026-06-21"
author: "Joe Brinkley"
description: "A technical deep-dive into reverse-engineering the Pulsar2 compiler, patching PyArmor memory classes in-flight, and executing local LLMs on the Radxa AX-M1 NPU."
---

# Taming the Edge: Bypassing Axera AX8850 NPU Compiler Constraints

![Taming the Edge: Bypassing Axera AX8850 NPU Compiler Constraints](../assets/axera_edge_npu.png)

Edge Neural Processing Units (NPUs) represent a massive leap in deploying local, air-gapped LLMs for tactical offensive security operations. However, navigating the closed-source, highly rigid vendor compilers required to run models on bare silicon can feel like hacking a black box.

Recently, our team targeted the **Radxa AI Core AX-M1** board, which features the **Axera AX8850 (LAMBERT)** architecture. While the chip has hardware parity with recent edge modules, its vendor software stack remains outdated. Attempting to compile dense and Mixture-of-Experts (MoE) transformer models onto its Contiguous Memory (CMM) blocks using the proprietary `pulsar2` compiler suite led us directly into the weeds of reverse-engineering closed-source Python binaries.

Here is the technical breakdown of the compiler bugs we faced, the PyArmor runtime intercept we engineered, and how we bypassed silicon limits to achieve native inference.

---

## The Target Environment

Our hardware testbed consists of:
* **Host:** Proxmox VE server
* **Workload Container:** A privileged LXC container passing through the PCIe NPU interface
* **NPU Hardware:** Radxa AI Core AX-M1 (AX8850 LAMBERT architecture)
* **Compiler:** `pulsar2` (distributed inside the `ax_pulsar2_6.0_package` compiler suite)

---

## Roadblock 1: The Closed-Source Compiler Loop

The `pulsar2` compiler is distributed as an obfuscated Python package compiled using PyArmor. This prevents direct analysis or patch modification of files on disk. 

When attempting to build for the `LAMBERT` target, we hit two initial roadblocks:
1. **Startup Wrappers:** Symlinking the compiler binary directly to `/usr/local/bin/pulsar2` broke internal path resolution loops because of how the script resolved `${BASH_SOURCE[0]}`.
2. **The Backend Class Bug:** The compiler expects to map the `--chip LAMBERT` argument to a `LambertBackend` class inside Python's `backend.lambert.backend_impl`. However, the compiled package threw a module resolution exception because it lacked the class definition.

### The Fix: In-Memory Python Interception

To resolve the path loop, we wrapped the compiler execution in a forwarding script:

```bash
#!/bin/bash
exec /opt/axera/compiler/ax_pulsar2_6.0_package/bin/pulsar2 "$@"
```

To fix the backend class error without breaking PyArmor's signature checks, we created a custom `sitecustomize.py` file and injected it into the compiler's bundled Python site-packages directory (`/opt/axera/compiler/ax_pulsar2_6.0_package/python3/lib/python3.12/site-packages/sitecustomize.py`). 

By hooking Python’s built-in `__import__` function, we intercepted the import sequence in memory, dynamically mapped the `backend.lambert` requests to the existing `backend.ax8860` classes, and aliased the backend classes in-flight:

```python
import builtins
import sys
import importlib

original_import = builtins.__import__

def custom_import(name, globals=None, locals=None, fromlist=(), level=0):
    if name.startswith("backend.lambert"):
        # Map Lambert target to AX8860 backend classes in memory
        target_name = name.replace("backend.lambert", "backend.ax8860")
        mod = original_import(target_name, globals, locals, fromlist, level)
        sys.modules[name] = sys.modules[target_name]
        try:
            impl = importlib.import_module("backend.ax8860.backend_impl")
            if hasattr(impl, "AX8860Backend"):
                impl.LambertBackend = impl.AX8860Backend
                sys.modules["backend.lambert.backend_impl"] = impl
        except Exception:
            pass
        return mod
    return original_import(name, globals, locals, fromlist, level)

builtins.__import__ = custom_import
```

This bypass tricked the compiler into resolving the backend class successfully, allowing the code generation pipeline to start.

---

## Roadblock 2: SRAM Allocation & The `TileFailException`

Once the compiler began parsing the model, we ran into deep physical memory layout constraints on the chip's internal SRAM blocks.

### The `mRoPE` Crash
When attempting to compile models like DeepSeek, the compiler immediately crashed. 
* **The Root Cause:** These models utilize multi-core Rotary Position Embedding (mRoPE). The NPU's physical gating engine lacks the hardware logic to tile and compile multi-dimensional positional embeddings on silicon.
* **The Fix:** Stick to standard, single-dimensional RoPE architectures (such as Qwen 1.5/2.5 or Gemma). MoE models and dynamic embeddings are fundamentally incompatible with static CMM memory maps.

### The `TileFailException` (Group Quantization)
When compiling standard float models (FP16/BF16) directly to INT4 using `--weight_type s4`, the compilation crashed with a `TileFailException` or `AssertionError: invalid groupN`.
* **The Root Cause:** The silicon's SRAM tiler requires a strictly structured, grouped quantization matrix (specifically `groupN=128`). When fed raw float weights, the compiler falls back to a per-tensor or channel-wide quantization scheme (`groupN=1024`), which exceeds the physical SRAM tile boundaries.

### The Fix: In-Flight Function Hooking
Using our `sitecustomize.py` injector, we targeted `conv_common` module functions to log internal shapes and dynamically hook the compiler's math routines. We intercepted `get_group_info` and overrode data type validations in `get_ifm_dtype` to force unsupported FP32 tensors to register as BF16 (represented as type `6` in the compiler engine):

```python
# Part of our injected runtime hook
if "conv_common" in name:
    # Hook the group allocation assertion
    if hasattr(mod, "get_group_info"):
        orig_get_group_info = mod.get_group_info
        def wrapper_get_group_info(inputs_spec, attrs):
            try:
                return orig_get_group_info(inputs_spec, attrs)
            except AssertionError as ae:
                if "invalid groupN" in str(ae):
                    # Force override to let the tiler pass
                    return (0, 0)
                raise ae
        mod.get_group_info = wrapper_get_group_info

    # Patch data type mapping to avoid FP32 crashes
    if hasattr(mod, "get_ifm_dtype"):
        orig_get_ifm_dtype = mod.get_ifm_dtype
        def wrapper_get_ifm_dtype(dtype):
            try:
                return orig_get_ifm_dtype(dtype)
            except KeyError:
                if getattr(dtype, "name", "") == "FP32":
                    return 6 # Force override to BF16 (Type 6)
```

---

## Bypassing Compilation: The AX650 Cross-Compatibility Spoof

While the memory hooking allowed us to compile small models, the "Golden Combo" for compiling larger models from scratch requires:
1. **Standard RoPE Architecture** (e.g., Qwen 1.5).
2. **Pre-Quantized Weights** (e.g., `Qwen1.5-0.5B-Chat-GPTQ-Int4` or AWQ) to ensure weight groupings are already set to `groupN=128` prior to compilation.

However, our biggest breakthrough was discovering a hardware cross-compatibility shortcut: **The AX8850 silicon natively executes graph files (`.axmodel`) compiled for the older AX650 architecture.**

Instead of wrestling with local compiler issues, we bypassed the entire compilation pipeline:
1. Download a pre-compiled AX650 model from Hugging Face (such as `AXERA-TECH/gemma-4-E2B-it-GPTQ-INT4`).
2. Download the pre-compiled CMM slices directly to the target system.
3. Launch the `axllm` PCIe Inference gateway pointing to the model directory.

The AX8850 native memory allocator accepts the AX650 binary slices perfectly, serving the models natively on silicon without any magic bytes rejection.

```bash
# Verify CMM status
axcl-smi

# Spin up the gateway
axllm serve /opt/axera/models/gemma-4-E2B --host 0.0.0.0 --port 8000
```

---

## Qwen 2.5-0.5B NPU Benchmarks

To verify the performance of pre-compiled AX650 binaries running natively on the AX8850 CMM blocks, we ran a standard inference test suite against **Qwen 2.5-0.5B (AX650 Pre-Compiled)**. The model was served using the `axllm` gateway and queried via the completions API:

| Test Prompt | NPU Response Time (s) | Key Output Snippet |
| :--- | :--- | :--- |
| **P1:** Capital of France? | **0.62s** | "The capital of France is Paris." |
| **P2:** Define Zero Trust? | **2.52s** | "Zero-trust architecture is a security model that..." |
| **P3:** HTTP GET Python Script? | **10.37s** | Code output importing `http.client` |
| **P4:** Mitigate XSS? | **7.51s** | "To mitigate XSS, use a Content Security Policy (CSP)..." |
| **P5:** Summarize OSI model? | **9.63s** | OSI Layer summaries (Physical, Data Link, Network...) |

While the model's responses are direct and the generation speed on the M1 NPU is fast, we did notice minor output repetition on longer tokens (e.g., repeating the CSP header sentence in P4), which is typical of smaller 0.5B parameter models. However, the raw execution speed and the fact that it loads into memory and streams tokens in under a second validates that AX650 spoofing is a viable deployment pipeline.


---

## Multi-Model Co-Existence: Running Concurrent Models on a Single NPU

Deploying local AI at the edge often hits a hard resource wall. While most edge deployments dedicate a single NPU board to a single running model, the **Radxa AI Core AX-M1** provides **7040 MiB of CMM (Contiguous Memory Allocation)**. This memory layout allows us to partition the physical NPU allocation and run multiple models concurrently on a single silicon board.

By launching multiple instances of the `axllm` inference gateway on different network ports, we successfully served two independent models on the same NPU without memory overlap or graph compilation conflicts:

1. **Qwen 2B (INT4 AX650 Compiled)** serving completions on port `8000`
2. **Gemma 2B (INT4 AX650 Compiled)** serving completions on port `8002`

### Concurrent Serving Execution

To start both models concurrently, we spin up two background `axllm` daemons. The NPU runtime automatically registers the model graphs into separate CMM memory blocks:

```bash
# Boot the Qwen 2B model on Port 8000
sudo sh -c 'nohup axllm serve /opt/axera/models/Qwen3.5-2B-AX650-GPTQ-Int4-C128-P1152-CTX2047 \
  --host 0.0.0.0 --port 8000 > /opt/axera/models/axllm_qwen_8000.log 2>&1 &'

# Boot the Gemma 2B model on Port 8002
sudo sh -c 'nohup axllm serve /opt/axera/models/gemma-4-E2B \
  --host 0.0.0.0 --port 8002 > /opt/axera/models/axllm_gemma_8002.log 2>&1 &'
```

Verifying the active processes inside the LXC container confirms that both compiler runtimes are active and handling context concurrently:

```bash
$ ps aux | grep axllm
root     29290  0.8  1.0 2034400 174232 ?  Sl   21:58   0:07 axllm serve /opt/axera/models/Qwen3.5-2B... --port 8000
root     29915  0.0  0.7  651252 127736 ?  Sl   22:14   0:00 axllm serve /opt/axera/models/gemma-4-E2B ... --port 8002
```

This multi-tenant NPU setup allows edge routers or localized offensive security hardware to route classification and analysis tasks to different specialized local models simultaneously, maximizing hardware utilization.

### The Catch: Concurrency Driver Bottlenecks & Loops

While the dual-model allocation is physically supported by the NPU's SRAM and CMM, our testing exposed significant stability bugs when querying both models simultaneously:

1. **API Timing Collisions & Cutoffs:** When querying both Qwen 3.5 and Gemma 4 concurrently (e.g. asking both models to evaluate `2/2+2*2=`), the `axcl` driver backend struggled to multiplex execution contexts. Qwen 3.5 successfully booted its `<think>` reasoning block but froze mid-token.
2. **EOS Array Bugs & Loops:** Gemma 4 started spewing repetitive garbage loop outputs (`"content": "factfactfactfact..."`). This occurred because the vendor gateway failed to handle Hugging Face token configs where `eos_token_id` is defined as an array (`[1, 106]`) instead of a single integer. We had to write an automated patching script to force `eos_token_id = 106` on the disk-level configuration to restore proper end-of-sentence behavior.
3. **Driver Hangs:** High-concurrency query execution eventually exhausted the NPU core scheduling queue, necessitating a hard service restart (`pkill -f axllm`) and temporary file cleanups (`/tmp/axcl/*`).

---

## Model Support Quick Reference

Here is a quick compatibility matrix of the LLM architectures we tested against the AX8850 (AICore AX-M1) during our research:

| Model Name | Parameters | Source | Compatibility | Notes / Failure Cause |
| :--- | :--- | :--- | :--- | :--- |
| **Qwen 2.5-0.5B** | 0.5B | Pre-Compiled (AX650) | **PASS** | Runs natively. Fast token streaming. |
| **Qwen 3.5-2B** | 2.0B | Pre-Compiled (AX650) | **PASS** | Runs on port 8000. Susceptible to freeze under concurrent query load. |
| **Qwen 1.5-0.5B** | 0.5B | Local Compile (Pulsar2) | **PASS** | Compiled using our custom in-memory patcher hooks. |
| **Gemma 4 E2B-it** | 2.0B | Pre-Compiled (AX650) | **PARTIAL** | Runs on port 8002. Requires patching `eos_token_id` to single int `106` to prevent looping. |
| **DeepSeek-R1-Distill-Qwen-1.5B** | 1.5B | Pre-Compiled (AX650) | **FAIL** | Crashes with `0x8030070c` driver execution error (often triggered by 0-byte HF stub config imports). |
| **DeepSeek-Coder-V2 / MoE** | Various | Direct compile attempt | **FAIL** | Compiler crash. SRAM tiler cannot process `mRoPE` (multi-core Rotary Position Embedding) shapes. |
| **Raw float16 / bf16 models** | Various | Direct compile attempt | **FAIL** | Compiler `TileFailException` / `invalid groupN` crash. SRAM requires pre-quantized weights (`groupN=128`). |

---


## Deployment & Tooling Suite

To automate and streamline these deployment steps, we've developed and packaged a unified Python toolkit for NPU guest provisioning, model compiling, and testing. It is available under our public repositories as [NextGenRedPVE-edge](https://github.com/nextgenredteam/nextgenredteam.github.io/tree/main/tools/NextGenRedPVE-edge).

### The Tooling Toolkit

1. **`proxmox_create_vm.py`**
   * *When to use:* To spin up a clean Ubuntu template environment on a Proxmox cluster configured with proper storage drivers and QEMU guest agents.
   * *What it does:* Connects to Proxmox via SSH and automates VM templates generation.
2. **`proxmox_configure_vm.py`**
   * *When to use:* Immediately after VM generation.
   * *What it does:* Auto-resolves dynamic guest IPs from the guest agent, adds restricted developer users, installs build dependencies, compilers, and dependencies.
3. **`deploy_precompiled.py`**
   * *When to use:* The recommended path. Deploying a high-speed pre-compiled model from Hugging Face.
   * *What it does:* Connects to the guest container, downloads pre-compiled models (e.g., Qwen3.5 or Gemma), provisions cache folders, and launches the `axllm serve` gateway.
4. **`deploy_golden_combo.py`**
   * *When to use:* Compiling custom standard RoPE models from raw HF quantized sources.
   * *What it does:* Automates the local compilation loop targeting the AX650 fallback architecture.
5. **`benchmark_npu.py`**
   * *When to use:* After model boot to evaluate efficiency.
   * *What it does:* Queries evaluation prompt sequences and metrics CPU, memory, and tokens/sec throughput during inference execution.

---

## Next Steps

By leveraging the AX650 cross-compatibility spoof, we successfully booted a **Gemma 2.6B** model in under two minutes, running natively on the AX8850 edge NPU. 

Now, we've taken the next leap: bypassing broken vendor C++ HTTP APIs, designing a custom FastAPI orchestrator, and piping bare-metal telemetry directly into OpenAI-formatted API outputs.

Check out the full story in **[Conquering the Silicon: Building a Custom 'Ollama' Orchestrator for the AX8850 NPU (Part II)](/blog/conquering-silicon-edge-npu.html)**.
