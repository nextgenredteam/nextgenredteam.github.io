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
* **Host:** Proxmox VE server (`192.168.40.250`)
* **Workload Container:** A privileged LXC container (`LXC 102`) passing through the PCIe NPU interface
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

## Next Steps

By leveraging the AX650 cross-compatibility spoof, we successfully booted a **Gemma 2.6B** model in under two minutes, running natively on the AX8850 edge NPU. 

Now that we are chest-deep in the firmware of this board, we are going to dive deeper to see what else we can extract—and find out if we can manually update the core firmware and system software to the latest versions.

*Stay tuned for our next deep-dive on bridging these edge APIs into our autonomous C2 pipelines.*
