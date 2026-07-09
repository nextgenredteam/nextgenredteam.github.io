---
layout: post
title: "Deep Benchmarks v7: Pushing NextGenPVE to the Limit"
date: "2026-07-03"
author: "Joe B. The Blind Hacker"
description: "Reviewing the latest local LLM benchmarks across NextGenPVE-RTX and the new NextGenPVE-NPU hardware."
---

![NextGenPVE Benchmarks](../assets/nextgenpve-benchmarks-v7.png)

We just wrapped up another intensive benchmarking session on the NextGenPVE cluster. Every time a new local model drops, the entire landscape shifts. Our primary goal in the offensive security space is maintaining operational security without sacrificing reasoning capability or speed. That means running these models entirely on local infrastructure. 

With the recent additions to the hardware stack, we decided to run the Deep Benchmarks v7 suite across our primary nodes. I want to break down exactly what we are testing, the hardware backing it, and how these models actually perform when the rubber meets the road. 

### The Hardware: NextGenPVE-RTX and NextGenPVE-NPU

Before diving into the numbers, let us set the stage with the environment specs. 

**NextGenPVE-RTX (The Heavy Lifter)**
This node is built on a ZimaCube Pro Creator, punching well above its weight class. It handles the complex reasoning tasks while strictly managing its memory overhead.
*   Compute: NVIDIA RTX 2000 Ada Generation (12GB VRAM)
*   Memory: 32GB System RAM
*   Storage: Fast NVMe arrays for rapid weight loading 
*   Role: Handling complex reasoning tasks and context-heavy dense models

**NextGenPVE-NPU (The Edge Specialist)**
This is our dedicated neural processing node, built around the Axera AX8850 edge NPU.
*   Compute: Dedicated Edge NPU silicon
*   Role: Ultra-low latency, high-efficiency inference for smaller specialized models

### Benchmarking Methodology

We test speeds across two main phases. The first is the cold boot, measuring the penalty of pulling weights from storage, mapping them into memory, and serving the first token. The second is the optimized hot load, measuring sustained generation speeds once the model is locked into VRAM. 

### 1. Optimized Hot-Load Benchmarks (Current Baseline)

This is the true, optimized speed of the hardware. Tested via the native API with Flash Attention and Q8 KV Caching enabled. The models remain locked in VRAM without spilling into CPU RAM. Speeds reflect one code prompt and three massive security prompts.

| Model | Avg TTFT (s) | Avg TPS | Prompts Passed | Quant | Architecture & Features | 
| :--- | :---: | :---: | :---: | :---: | :--- |
| **`hermes-3-llama-3.2-3b:128k`** | 0.02s | **91.48** | 4/4 | Q4_0 | Dense, Tool Calls, Agentic |
| **`hermes-3-llama-3.2-3b:64k`** | 0.02s | **90.57** | 4/4 | Q4_0 | Dense, Tool Calls, Agentic |
| **`gemma-4-e2b-abliterated:128k`** | 0.08s | **79.21** | 4/4 | Q4_K_M | Dense, Abliterated |
| **`gemma-4-e2b-abliterated:64k`** | 0.06s | **78.90** | 4/4 | Q4_K_M | Dense, Abliterated, Agentic |
| **`hermes3:64k`** | 0.04s | **46.90** | 4/4 | Q4_0 | Dense, Tool Calls, MCP, Agentic |
| **`deephat-7b:q4`** | 0.03s | **38.39** | 4/4 | Q4_K_M | Dense, Uncensored |
| **`gemma2:9b`** | 0.10s | **35.80** | 4/4 | Q4_0 | Dense, Agentic |
| **`deepseek-r1:8b`** | 0.82s | **34.63** | 3/4 | Q4_K_M | Dense, **Thinking** |
| **`qwythos:q4 (Claude-Mythos-5)`** | 0.23s | **34.37** | 5/5 | Q4_K_M | Dense, MTP, Abliterated |
| **`qwen3.5-abliterated:9b-Qwopus`**| 0.11s | **34.32** | 5/5 | Q4_K_M | Dense, Abliterated, Tool Calls |
| **`glm-4-9b-abliterated:64k`** | 0.08s | **31.66** | 3/4 | Q4_K_M | Dense, Abliterated, Tool Calls, MCP, Agentic |
| **`qwen2.5-coder-7b-uncensored:q8`**| 0.05s | **31.26** | 4/4 | Q8_0 | Dense, Uncensored, Tool Calls |
| **`deephat-7b:q8`** | 0.05s | **31.14** | 4/4 | Q8_0 | Dense, Uncensored |
| **`ornith:9b`** | 0.91s | **30.45** | 5/5 | Q4_K_M | Dense, Agentic, Coding |
| **`dolphin-3-8b:latest`** | 0.04s | **29.38** | 4/4 | Q3_K_L | Dense, Uncensored, Agentic |
| **`gemma-4-12b-qat:latest`** | 0.11s | **28.18** | 4/4 | Q4_0 | Dense, QAT, Agentic |
| **`yi-coder-9b:latest`** | 0.05s | **25.66** | 4/4 | Q3_K_L | Dense, Tool Calls |
| **`qwen2.5-coder:14b`** | 0.42s | **17.97** | 4/4 | Q4_K_M | Dense, Tool Calls, MCP, Agentic |
| **`llama3.1:8b-instruct-q8_0`** | 0.49s | **17.94** | 4/4 | Q8_0 | Dense, Tool Calls, MCP, Agentic |
| **`llama-3.1-8b-abliterated:q8`** | 0.53s | **17.69** | 4/4 | Q8_0 | Dense, Abliterated, Tool Calls, MCP, Agentic |
| **`qwen2.5-coder:14b-64k`** | 0.42s | **17.38** | 4/4 | Q4_K_M | Dense, Tool Calls, MCP, Agentic |
| **`deepseek-coder-v2:16b`** | 0.56s | **16.89** | 4/4 | Q4_0 | MoE, Tool Calls, Agentic |
| **`codestral:22b`** | 7.35s | **4.73** | 2/4 (Timeouts) | Q4_0 | Dense, Tool Calls, Agentic (SPILLED TO RAM) |
| **`mistral-nemo-12b-obliterated:q6`**| - | **-** | 0/4 (Failed 500) | Q6_K | Dense, Abliterated |

**Feature Legend**
*   **Dense**: Standard monolithic transformer architecture.
*   **MoE**: Mixture of Experts (highly efficient for its parameter size).
*   **Thinking**: Contains advanced chain-of-thought tokens/modes before answering (e.g. Qwen3.6 MoE, DeepSeek R1).
*   **Tool Calls / MCP**: Natively trained to output JSON schema for function calling and capable of driving the Model Context Protocol.
*   **Agentic**: Excels at multi-turn autonomy, self-correction, and system prompting.
*   **Abliterated / Uncensored**: Refusal vectors have been orthogonalized to bypass standard safety guardrails for red-teaming tasks.

### 2. Unoptimized Cold-Boot Benchmarks (Historical Tracker)

This section tracks the penalty of forcing a cold model load from disk into VRAM along with an uncompressed 16-bit KV Cache. These were tested prior to our hyper-tuning efforts. 

| Model | Gen (TPS) | Tokens Generated | Quant | Prompts Passed | 
| :--- | :---: | :---: | :---: | :---: |
| **`hermes-3-llama-3.2-3b:64k`** | **15.72** | 64 | Q4_0 | 1/1 (Sorting) |
| **`gemma-4-e2b-abliterated:64k`** | **11.30** | 64 | Q4_K_M | 1/1 (Sorting) |
| **`hermes-3-llama-3.2-3b:128k`** | **10.41** | 64 | Q4_0 | 1/1 (Sorting) |
| **`yi-coder-9b:latest`** | **6.68** | 64 | Q3_K_L | 1/1 (Sorting) |
| **`gemma-4-e2b-abliterated:128k`** | **6.56** | 64 | Q4_K_M | 1/1 (Sorting) |
| **`glm-4-9b-abliterated:64k`** | **5.91** | 53 | Q4_K_M | 1/1 (Sorting) |
| **`hermes3:64k`** | **5.83** | 64 | Q4_0 | 1/1 (Sorting) |
| **`deephat-7b:q4`** | **5.68** | 64 | Q4_K_M | 1/1 (Sorting) |
| **`llama3.1:8b-instruct-q8_0`** | **4.96** | 54 | Q8_0 | 1/1 (Sorting) |
| **`qwen3.5-abliterated:9b-Qwopus`** | **4.90** | 64 | Q4_K_M | 1/1 (Sorting) |
| **`gemma-4-12b-qat:latest`** | **4.72** | 64 | Q4_0 | 1/1 (Sorting) |
| **`deepseek-r1:8b`** | **4.13** | 64 | Q4_K_M | 1/1 (Sorting) |
| **`qwen2.5-coder-7b-uncensored:q8`** | **4.02** | 64 | Q8_0 | 1/1 (Sorting) |
| **`deephat-7b:q8`** | **3.88** | 64 | Q8_0 | 1/1 (Sorting) |
| **`deepseek-coder-v2:16b`** | **3.57** | 64 | Q4_0 | 1/1 (Sorting) |
| **`qwen2.5-coder:14b`** | **2.58** | 50 | Q4_K_M | 1/1 (Sorting) |
| **`dolphin-3-8b:latest`** | **2.01** | 18 | Q3_K_L | 1/1 (Sorting) |
| **`gemma2:9b`** | **1.65** | 20 | Q4_0 | 1/1 (Sorting) |
| **`llama-3.1-8b-abliterated:q8`** | **1.40** | 27 | Q8_0 | 1/1 (Sorting) |
| **`qwen2.5-coder:14b-64k`** | **0.88** | 15 | Q4_K_M | 1/1 (Sorting) |
| **`mistral-nemo-12b-obliterated:q6`** | **-** | - | Q6_K | 0/1 (Failed 500) |

### 3. Axera AX8850 (NPU) Edge Benchmarks

These are compiled natively via Pulsar2 and executed on the zero-copy C++ `axllm serve` engine directly on the edge silicon.

| Model | Parameters | Quantization | Status | Gen (TPS) | Notes |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **`Qwen 2.5 0.5B Chat`** | 0.5B | FP16/BF16 | Active | **20.01 TPS** | Average across 3 massive prompt runs. |
| **`Qwen 3.5 2B (CTX17k)`** | 2B | GPTQ-Int4 | Active | **4.77 TPS** | Massive 17k context model compiled for AX650. |
| **`Qwen 2.5 3B Instruct`** | 3B | GPTQ-Int4 | Active | **7.24 TPS** | First production-confirmed model. |
| **`Qwen 2.5 Coder 3B`** | 3B | GPTQ-Int4 | Ready | - | Compiled flawlessly. |
| **`Qwen 2.5 Coder 7B`** | 7B | GPTQ-Int4 | Active | **3.84 TPS** | Live inference confirmed natively. |
| **`Qwen 2.5 1.5B Instruct`**| 1.5B | GPTQ-Int4 | Ready | - | Compiled flawlessly. |
| **`Llama 3 8B Abliterated v3`** | 8B | GPTQ | Ready | - | Compiled successfully. |
| **`Llama 3.2 1B Instruct`** | 1B | None | Ready | - | Requires clean LXC reboot between runs. |
| **`Dolphin 3.0 Qwen 2.5 3B`**| 3B | GPTQ | Blocked | - | Upstream repo GPTQ metadata malformed. |

### Analysis and Observations

The **hermes-3-llama-3.2-3b** model absolutely tears through the benchmarks when hot loaded, hitting upwards of 91 tokens per second. It handles 128k contexts effortlessly on the RTX node and continues to prove its weight in gold. 

The 8B and 9B parameter class continues to be a very reliable sweet spot for the NextGenPVE-RTX node. Models like **deepseek-r1**, **Qwythos-9B**, and **gemma2** are all pushing a comfortable 34 to 35 tokens per second. They provide enough reasoning capability for complex offensive security tasks without bogging down the hardware. We even see the **deepseek-r1** model utilizing thinking modes without sacrificing much speed.

When looking at the unoptimized cold boots, you can truly see the penalty of VRAM thrashing. The Hermes models drop from 91 TPS all the way down to a sluggish 15 TPS when they are forced to load from disk on the fly. This perfectly illustrates why keeping models resident in memory is absolutely non-negotiable for responsive red-teaming tasks.

On the edge side, the Axera NPU is proving its worth. Pulling 20 tokens per second on a half-billion parameter Qwen 2.5 model using pure edge silicon is impressive. We are also successfully running multi-billion parameter models like Qwen 2.5 3B at over 7 TPS without waking up the main RTX GPUs.

### Under the Hood: llama.cpp Optimization on Debian

A lot of people ask how we pull these numbers, so I did a deep dive into the latest documentation and hardware benchmarking forums specifically for the **RTX A2000 (12GB VRAM)** running `llama.cpp` and Ollama. 

The short answer is: **Yes, we are running the absolute bleeding-edge optimal stack.** 

Here is exactly how our current flags map to the best practices:

1. **`OLLAMA_KEEP_ALIVE=-1`**
   *The Research:* By default, Ollama unloads models after five minutes of inactivity to save VRAM. When a new request comes in, it has to stream 5.3GB from the disk back to the GPU, causing a massive ten-second cold boot penalty. 
   *Our Setup:* Setting it to `-1` permanently locks Qwythos into the A2000's VRAM. Because this is a dedicated AI node, we do not care about sharing VRAM. This is what gives us the instant zero-latency response times.

2. **`OLLAMA_KV_CACHE_TYPE=q8_0`**
   *The Research:* When you submit a prompt, the engine stores the Key-Value state of the conversation in VRAM. For 1-Million context models like Qwythos, an unquantized 16-bit KV cache would instantly trigger an Out-Of-Memory (OOM) crash on a 12GB card.
   *Our Setup:* Quantizing the KV cache to 8-bit cuts its VRAM footprint entirely in half with zero perceptible loss in generation quality, allowing the 9B model to comfortably fit alongside a massive context window.

3. **`OLLAMA_FLASH_ATTENTION=1`**
   *The Research:* Traditional attention mechanisms scale quadratically in memory as the context grows. Flash Attention rewrites the math to be infinitely more memory efficient and hardware-aware.
   *Our Setup:* We have this explicitly flipped on, which is the secret sauce behind maintaining 34+ TPS even when the prompt gets long.

4. **`OLLAMA_NUM_PARALLEL=1`**
   *The Research:* If you allow Ollama to process multiple requests concurrently, it reserves VRAM for *each* parallel slot, dramatically reducing the maximum model size you can run. 
   *Our Setup:* We locked it to `1`. Since we use LiteLLM for routing requests, this forces the GPU to put 100% of its compute into generating one request as fast as humanly possible before moving to the next one in the queue.

There is not a single frame of performance being left on the table here. We have a perfectly tuned engine.

### Looking Ahead: The Cluster Rebuild

These numbers give us a solid baseline, but the work never stops. We are already planning a complete rebuild of the NextGenPVE environment in the coming weeks. The goal is to optimize the storage layer for even faster cold boots and streamline the networking between the LXC containers to reduce any latency overhead. 

We will be documenting that rebuild process as it happens. For now, the current infrastructure is holding its own and providing the local, secure intelligence needed for our daily operations.
