# NPU Compilation Checkpoint: AX8850 Breakthroughs

## Overview
This document serves as a reference checkpoint for our research and breakthroughs compiling LLMs for the Axera AX8850 (LAMBERT) Edge NPU. It contains the essential rules we discovered for bypassing the compiler bugs and achieving native silicon execution.

## The Problems Encountered
When attempting to compile dense and MoE transformer models for the AX8850 NPU using `pulsar2 llm_build`, two critical failures were identified:
1. **The `mRoPE` Bug:** Models like DeepSeek use multi-core Rotary Position Embedding (mRoPE) which triggers an unhandled exception inside the `pulsar2` compiler for the LAMBERT architecture.
2. **The `TileFailException`:** The C++ SRAM tiler for the LAMBERT architecture does not support per-tensor or wide-channel (e.g., `groupN=1024`) quantization. When compiling raw FP16/BF16 weights using `--weight_type s4`, the compiler falls back to these unsupported formats and crashes during the hardware slice allocation phase.

## The Solutions
To bypass these hardware and compiler limitations, we developed the **Golden Combo** and **AX650 Cross-Compatibility** methodologies.

### 1. The Golden Combo
To successfully compile an NPU model, the target model must adhere to these two rules:
*   **Standard Architecture:** Use models with standard RoPE (e.g., Qwen 1.5/2.5, Llama, Gemma). Avoid MoE or custom mRoPE implementations.
*   **Pre-Quantized Weights:** Always use `GPTQ-Int4` or `AWQ` pre-quantized models (e.g., `Qwen/Qwen1.5-0.5B-Chat-GPTQ-Int4`). These models are pre-grouped with a `groupN=128` format, which the LAMBERT SRAM tiler *can* physically process without throwing an exception.

### 2. AX650 Cross-Compatibility
We discovered that **the AX8850 silicon can natively execute `.axmodel` graphs compiled for the older AX650 architecture.** 
This is a massive time-saver. Instead of recompiling models from scratch (which takes 15+ minutes and is prone to tokenizer/config JSON overwrite bugs), we can:
1. Download a pre-compiled AX650 model directly from Hugging Face (e.g., `AXERA-TECH/gemma-4-E2B-it-GPTQ-INT4`).
2. Serve it directly using `axllm serve`.
3. The AX8850 Contiguous Memory (CMM) allocator will accept and execute the older binary perfectly.

## Summary of Outcomes
*   **Qwen 1.5-0.5B (Golden Combo):** Successfully compiled into AX650 Contiguous Memory blocks. Proved that pre-quantized weights solve the tiler crash.
*   **Qwen 2.5-0.5B:** Execution on the AX8850 silicon validated via the inference API.
*   **Gemma 2.6B (AX650 Pre-Compiled):** Downloaded 1.5GB of pre-compiled weights and completely skipped the compiler step. The API gateway allocated CMM successfully and served inference natively on the AX8850.

## Future Protocol
When deploying new models to the BlueStar Proxmox cluster (LXC 102):
1. **Search Hugging Face** for pre-compiled `AX650` models in the `AXERA-TECH` repository.
2. If found, download via `snapshot_download` and boot directly.
3. If not found, download a `GPTQ-Int4` version of a standard RoPE model and compile it targeting the `AX650` chip fallback. Do not attempt to compile floating-point models or non-standard architectures.
