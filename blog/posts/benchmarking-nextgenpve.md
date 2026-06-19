---
title: "Benchmarking NextGenPVE: Running Local Offensive AI Agents on Proxmox"
date: "2026-06-19"
author: "Joe Brinkley"
description: "How we tested, why we tested, and what we learned benchmarking local abliterated LLMs for red team operations on our NextGenPVE cluster."
---

# Benchmarking NextGenPVE: Running Local Offensive AI Agents on Proxmox

![NextGenPVE AI Benchmarking Banner](../assets/nextgenpve_benchmark.png)

In modern offensive security operations, AI is no longer a futuristic concept—it’s an active member of the red team. However, relying on commercial cloud LLMs (like GPT-4 or Claude) presents two massive blockers for professional red teaming:
1. **Safety Refusal Loops**: Cloud providers enforce strict, broad-brush alignment guardrails. Asking a cloud model to analyze an IDOR chain or generate a PoC HTTP exploit request often triggers a generic refusal: *"As an AI, I cannot assist with hacking..."*
2. **Data Privacy & OpSec**: Feeding client network layouts, custom exploitation code, or proprietary vulnerability details into external third-party APIs is a compliance and confidentiality nightmare.

To solve this, we built **NextGenPVE**—our locally-hosted, heterogeneous Proxmox cluster dedicated to running uncensored, abliterated local LLMs. 

To ensure our AI agents can reason through complex offensive scenarios efficiently without melting our hardware, we conducted extensive benchmark testing across multiple model architectures (Dense and Mixture-of-Experts) ranging from 2B to 35B parameters.

Here is how we did it, what we tested, and the results that shaped our production setup.

---

## Why We Tested (The Core Objective)
We needed a local model that could act as a competent **Lead Offensive Security Researcher**. The ideal model had to satisfy three criteria:
* **Offensive Competence**: It must understand vulnerabilities (like Insecure Direct Object References, business logic bypasses, and access control flaws) and generate clean, structured Markdown or HTTP PoC scripts.
* **No Refusals**: It must be "abliterated" or uncensored, ignoring standard guardrails to evaluate security weaknesses objectively.
* **Hardware Efficiency**: It must deliver acceptable tokens-per-second throughput on our local cluster without exceeding host resource constraints.

---

## What & How We Tested
We benchmarked several models across three distinct phases (**v5, v6, and v7**) on the NextGenPVE environment. The testbed server host was a dedicated machine running Proxmox VE, with high-compute tasks allocated to our primary node `NextGenPVE` and GPU-passthrough allocated to our VM workloads (like `NextGen-Brain-RTX`).

### The Test Suite
Each model was subjected to a test suite of **5 real-world offensive security prompts (P1 to P5)**, including:
* **P1**: Evaluating Broken Access Control (BAC) and analyzing IDOR chaining.
* **P2–P5**: Assessing business logic bypasses, authentication flaws, and API vulnerabilities.

For each model, we measured:
1. **Average Ingestion Speed (t/s)**: How fast the model processes the context and prompt.
2. **Average Generation Speed (t/s)**: How fast the model streams the response tokens.
3. **Resource Footprint**: Peak CPU (%) and Peak Memory (GB) usage on the host.
4. **Alignment & Pass Rate**: Whether the model successfully completed the security task without refusing or throwing system errors.

---

## The Benchmark Data

Below are the consolidated metrics from our testing rounds, categorized by model type and size.

### Dense Models (v5 & v7)
Dense models allocate resources to all parameters for every token. We tested models from 9B to 27B parameters, plus a tiny 2B edge model.

| Model | Size / Type | Avg Ingest (t/s) | Avg Gen (t/s) | Peak CPU | Peak Mem | Prompt Pass Rate |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Gemma-4-E2B-Abliterated** | 2B / Edge | **2384.09** | **87.39** | 1.2% | 12.5 GB | **5 / 5 (100%)** |
| **Yi-Coder-9B-Chat** | 9B / Dense | 1112.79 | 35.71 | 1.2% | 13.2 GB | **5 / 5 (100%)** |
| **GLM-4-9B-Abliterated** | 9B / Dense | 524.96 | 33.26 | 81.8% | 7.6 GB | **5 / 5 (100%)** |
| **Qwen3.6-27B-Abliterated** | 27B / Dense | 61.90 | 3.65 | 25.3% | 8.4 GB | **5 / 5 (100%)** |
| **Gemma-4-12B-Uncensored** | 12B / Dense | 591.97 | 23.73 | 2.4% | 18.7 GB | 4 / 5 (80%) |
| **Gemma-4-12B-Abliterated** | 12B / Dense | 574.59 | 23.12 | 22.6% | 37.5 GB | 2 / 5 (40%) |

### Mixture-of-Experts (MoE) Models (v6 & v7)
MoE models route inputs to specific subnetworks ("experts"), allowing them to utilize a fraction of their total parameters per token. This gives them the reasoning capability of a larger model with the speed of a smaller one.

| Model | Size / Type | Avg Ingest (t/s) | Avg Gen (t/s) | Peak CPU | Peak Mem | Prompt Pass Rate |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **DeepSeek-Coder-V2-Lite-16B** | 16B / MoE | 260.82 | **55.09** | 14.3% | 20.7 GB | **5 / 5 (100%)** |
| **Gemma-4-26B-Abliterated** | 26B / MoE | 154.50 | 32.44 | 4.8% | 14.1 GB | 4 / 5 (80%) |
| **Qwen3.6-35B-A3B-MoE** | 35B / MoE | 11.65 | 22.16 | 22.3% | 9.4 GB | 4 / 5 (80%) |
| **DeepSeek-V4-Flash-Abliterated**| Flash / MoE | 0.00 | 0.00 | 0.0% | 0.0 GB | *CRASHED (0%)* |

---

## Key Takeaways & Performance Analysis

### 1. The Power of Mixture-of-Experts (MoE)
**DeepSeek-Coder-V2-Lite-16B** emerged as an absolute powerhouse. It maintained an impressive generation speed of **55.09 t/s** while only pulling **14.3% Peak CPU** and **20.7 GB** of RAM. Because of its MoE routing, it handles code generation and vulnerability analysis with the intelligence of a much larger model at a fraction of the hardware cost.

### 2. Edge Speed Demons
For edge deployment or lightweight tasks (like parsing quick telemetry logs or running agents on low-resource devices like ZimaBoards), **Gemma-4-E2B-Abliterated** was a revelation. It ingested text at an astronomical **2,384 t/s** and generated at **87.39 t/s** using almost no CPU (1.2%) and minimal memory. Crucially, it passed all 5 prompts, making it the perfect candidate for local agent orchestration on edge hardware.

### 3. Dense Bottlenecks
While **Qwen3.6-27B-Abliterated** was highly intelligent and passed all 5 prompts, its generation speed choked down to a painful **3.65 t/s**. The compute overhead of a 27B dense model running without heavy GPU acceleration makes it impractical for real-time agent loops where speed is critical.

---

## What We’re Running in Production

After analyzing the data, we settled on a hybrid architecture for NextGenPVE:

* **Production Inference Host (`NextGen-Brain-RTX` VM)**:
  We chose **Gemma-4-26B-Abliterated** as our primary reasoning engine. Running locally on Ollama, it strikes the perfect balance of deep vulnerability reasoning and acceptable generation speeds (32.44 t/s) with a low CPU overhead (4.8%). When we need extreme precision, we fallback to Gemini via API (with anonymized data).
* **Production Agent Gateway (`NextGen-Hermes-Prod` LXC)**:
  This container runs our **Hermes Agent Gateway**, coordinating tasks and querying `NextGen-Brain-RTX` for fast, local intelligence.
* **Edge Scouts**:
  For persistent network monitoring and telemetry parsing, we deploy **Gemma-4-E2B-Abliterated** directly to our Tailscale-connected ZimaBoards.

## The Wrap-Up
Self-hosting your AI stack isn't just about privacy; it’s about control. By benchmarking and selecting models like Gemma-4 and DeepSeek-Coder, we've built a local, highly-responsive threat emulation pipeline that doesn't ask for permission to do its job.

Stay tuned for our next update, where we’ll dive into how we hook these local LLMs into our custom exploitation tools to automate safe, controlled defense validation.
