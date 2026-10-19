---
title: "Beyond Prompt Injection: The Edge Execution Review (EER) Playbook for AI Silicon"
date: "2026-11-05"
author: "Joe Brinkley (The Blind Hacker)"
description: "Why red teams must evolve beyond Layer 7 prompt fuzzing to audit low-level inference runtimes. A comprehensive offensive playbook combining Edge Execution Review (EER) and Source Code Review (SRC) on physical NPU silicon."
---

# Beyond Prompt Injection: The Edge Execution Review (EER) Playbook for AI Silicon

![Beyond Prompt Injection](../assets/ax8850_edge_playbook.png)

* **Author:** Joe Brinkley (The Blind Hacker)
* **Project:** NextGen Red Team Independent Research
* **Target Platforms:** Axera AX8850, Rockchip RK3588, Hailo-8, Qualcomm QNN
* **Published Date:** November 5, 2026
* **Category:** Offensive Hardware & AI Runtime Tradecraft

---

## The Layer 7 Plateau: Why Prompt Fuzzing Is Not Enough

Over the past two years, the security industry treated AI testing as an exercise in creative writing.

Red teams spent countless hours finding ways to bypass content guardrails, trigger Unicode normalization glitches, or trick language models into writing malicious payloads. While that research has value for public web chatbots, it hits a hard ceiling: it assumes the execution environment is a secure, sandboxed cloud hypervisor.

When machine learning leaves the cloud and lands on physical edge silicon, the threat model changes completely.

On edge devices, there is no Python runtime acting as a memory barrier. There is no Kubernetes control plane monitoring pod health. The models execute on high-performance C and C++ runtimes that interface directly with physical device memory via Direct Memory Access (DMA).

If you are an offensive operator or application security engineer, your focus should not just be on what the model says. Your focus should be on what the inference runtime does to physical memory when processing untrusted inputs.

This playbook documents our **Edge Execution Review (EER)** framework: how to take apart an edge AI runtime, identify arithmetic conversion seams, and validate binary memory corruption on physical Neural Processing Unit (NPU) hardware.

---

## The Physical Reality: Inside the Edge NPU Architecture

To audit an edge AI engine, you have to understand how modern NPUs handle tensor memory. 

In our threat lab, we audited the `ax-llm` runtime running on the **Axera AX8850 (LAMBERT)** silicon, deployed on a Radxa AI Core AX-M1 accelerator module. The architectural principles apply equally to platforms like Rockchip RKNN, Hailo-8, and Qualcomm QNN:

```text
┌─────────────────────────────────────────────────────────────┐
│                    Cloud vs. Edge AI Stack                  │
└─────────────────────────────────────────────────────────────┘

       CLOUD INFERENCE (L7 Focus)          EDGE SILICON (L1-L3 Focus)
  ┌──────────────────────────────────┐   ┌───────────────────────────────┐
  │  Web App / API Gateway (HTTPS)   │   │ Network Daemon / API Service  │
  ├──────────────────────────────────┤   ├───────────────────────────────┤
  │  Python / PyTorch / TensorRT     │   │ C/C++ Inference Runtime       │
  ├──────────────────────────────────┤   │ (e.g. ax-llm, RKNN, llama.cpp)│
  │  Isolated Container (Docker/K8s) │   ├───────────────────────────────┤
  ├──────────────────────────────────┤   │ Kernel Driver (/dev/ax_npu)   │
  │  Virtual Memory Management (MMU) │   ├───────────────────────────────┤
  ├──────────────────────────────────┤   │ Hardware Memory (MMZ / CMM)   │
  │  GPU Hardware Acceleration       │   ├───────────────────────────────┤
  └──────────────────────────────────┘   │ Physical NPU Silicon (AX8850) │
                                         └───────────────────────────────┘
```

### Direct Physical Memory Mapping (MMZ / CMM)
Standard operating systems use virtual memory. When a normal process encounters an out-of-bounds pointer write, the CPU Memory Management Unit (MMU) triggers a page fault, and the kernel terminates the process with `SIGSEGV`.

Edge inference runtimes cannot tolerate virtual memory paging latency. To push 20 to 30 tokens per second on low-power silicon, they allocate physical contiguous memory blocks via Contiguous Memory Management (CMM) and Memory Management Zones (MMZ). 

These memory pools are mapped directly into user space via `/dev/ax_npu` character device handles. When a buffer overflow occurs inside an attention mask or embedding table, the write operation corrupts physical hardware descriptors. It does not just kill an application thread; it can lock up the physical PCIe bus, desynchronize DMA transfers, or force a kernel panic that requires a hard power cycle.

---

## The "Demo Code to Production" Vulnerability Engine

Why do these runtimes contain so many vulnerabilities? 

It boils down to the software supply chain of edge hardware:

1. **The Silicon Manufacturer Goal:** Chip vendors publish reference code repositories (such as `ax-llm`) to give hardware developers working examples of how to compile models using their proprietary toolchains (such as Axera Pulsar2). Their engineering priority is tensor quantization efficiency and hardware compute saturation, not defensive input validation.
2. **The Hardware Integrator Shortcut:** Third-party vendors building physical appliances (smart security cameras, facial recognition door controllers, automated optical inspection cameras, delivery robotics) rarely write custom inference runtimes. They pull the vendor reference repository, wrap an HTTP or WebSocket listener around `main()`, compile it into their Linux Board Support Package (BSP), and ship the product.
3. **Ambient Root Privileges:** Because the inference engine must issue low-level `ioctl` commands, configure NPU clocks, and manage camera sensor pipelines, the daemon almost universally runs as `root`.

A vulnerability that appears minor in a standalone developer demo becomes a critical remote root compromise once that demo is baked into production firmware.

---

## The EER + SRC Audit Methodology

Our testing methodology relies on two coordinated workflows: **Source Code Review (SRC)** and **Edge Execution Review (EER)**.

```text
┌─────────────────────────────────────────────────────────────┐
│                 EER + SRC Testing Architecture              │
└─────────────────────────────────────────────────────────────┘
                               │
         ┌─────────────────────┴─────────────────────┐
         ▼                                           ▼
┌─────────────────────────────┐             ┌─────────────────────────────┐
│   Phase 1: Source Review    │             │   Phase 2: Edge Execution   │
│ - Trace input entry points  │             │ - Deploy on ARM64 board     │
│ - Scan for C-in-C++ flaws   │             │ - Compile with ASan / UBSan │
│ - Audit pointer lifecycles  │             │ - Probe boundary dimensions │
└─────────────────────────────┘             └─────────────────────────────┘
         │                                           │
         └─────────────────────┬─────────────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────┐
│   Phase 3: Silicon Triage & Proof of Vulnerability          │
│ - Verify hardware memory impact vs virtual page crash       │
│ - Check kernel /dev/ax_npu driver stability                 │
│ - Package reproduction logs for vendor disclosure           │
└─────────────────────────────┘
```

---

### Step 1: Identifying the Seams (Source Code Review)

When auditing C++ AI engines, avoid getting bogged down in matrix math or quantization layers. Look directly at the seams where untrusted external data determines buffer sizes, loop counters, and copy lengths.

#### The 5 Primary Seams to Hunt:

#### 1. Integer Downcasting in Capacity Calculations
In 64-bit systems, memory sizes are represented as `size_t` (8 bytes unsigned). When developers calculate element counts, they frequently downcast to signed 32-bit `int` (4 bytes).
* **What to search for:** `(int)(buffer.size() / ...)` or `(int)t_mask.nSize`
* **The failure mode:** If incoming token dimensions produce an arithmetic result exceeding `0x7FFFFFFF`, the value wraps into negative territory or discards upper precision bits.

#### 2. The Unclamped Memory Copy
High-performance inference code often assumes the input data was already validated by a tokenizer.
* **What to search for:** `memcpy(dest.pVirAddr, src, incoming_len)` or custom DMA calls like `llm_h2d(...)`.
* **The failure mode:** If `incoming_len` is derived solely from the user payload and never clamped against `dest.nSize`, an oversized payload writes straight past the DMA buffer boundary.

#### 3. Legacy String Formatting
Developers frequently use legacy C formatting functions when building file paths for model shards or weights.
* **What to search for:** `sprintf(`, `vsprintf(`, `strcpy(`
* **The failure mode:** Fixed-size stack arrays (e.g., `char path[128]`) cannot accommodate Linux path lengths (`PATH_MAX` = 4096). Deeply nested model directories smash the stack frame return address.

#### 4. The C++ Rule of Three / Rule of Five
Modern C++ classes that allocate raw heap descriptors must explicitly manage copy constructors.
* **What to search for:** Classes containing a custom destructor (`~ClassName()`) with `delete` calls, but lacking `ClassName(const ClassName&)` or `= delete`.
* **The failure mode:** When the object is passed by value or assigned, the compiler synthesizes a shallow bitwise copy. Both instances attempt to delete the same heap pointers upon exiting scope, causing an immediate double-free corruption.

#### 5. Unescaped Subprocess Invocations
Multimodal engines that support audio (e.g. Whisper) or video frequently invoke external tools like `ffmpeg` to normalize sample rates.
* **What to search for:** `system(`, `_popen(`, `popen(`
* **The failure mode:** Constructing command strings with `snprintf("ffmpeg -i %s", user_path)` without escaping shell metacharacters (`&`, `|`, `;`) allows instant remote command injection.

---

### Step 2: Instrumenting on Physical Silicon (Edge Execution Review)

Once you identify arithmetic or copy seams, you must validate them on physical hardware. Simulating an NPU in a standard x86 VM will not reveal how hardware DMA memory controllers behave.

#### 1. Compile with AddressSanitizer and UndefinedBehaviorSanitizer
On your ARM64 target board (e.g. Radxa AI Core AX-M1 running Ubuntu), rebuild the inference engine with instrumentation flags enabled:

```bash
cmake -B build \
  -DCMAKE_BUILD_TYPE=Debug \
  -DCMAKE_CXX_FLAGS="-fsanitize=address,undefined -fno-omit-frame-pointer -g" \
  -DCMAKE_C_FLAGS="-fsanitize=address,undefined -fno-omit-frame-pointer -g"
cmake --build build -j$(nproc)
```

#### 2. Execute Boundary-Value Payloads
Feed the instrumented binary inputs engineered to hit the edge cases of your identified seams:
* **Token Sizing:** Send prompt token arrays that exceed the configured `prefill_max_token_num`.
* **Image Dimensions:** Supply image headers with widths near `INT_MAX / 4` (e.g., width = 536,870,912) to test stride overflow.
* **Odd Byte Alignment:** Supply odd-sized attention masks to verify how hardware stride alignment routines handle non-16-byte boundaries.
* **Path Traversal / Nesting:** Point the model shard loader at directory paths deeper than 128 characters.

#### 3. Analyze the ASan Crash Signature
When an out-of-bounds write occurs in user space, AddressSanitizer produces an immediate stack trace:

```text
=================================================================
==41920==ERROR: AddressSanitizer: global-buffer-overflow on address 0x7fff5c290140
WRITE of size 4096 at 0x7fff5c290140 thread T0
    #0 0x555555628b12 in LLM::decode_prefill(prompt_tokens) src/runner/LLM_decode.cpp:142
    #1 0x55555561fa20 in main src/main.cpp:88
Address 0x7fff5c290140 is located in global variable 't_mask' defined in 'src/runner/LLM.cpp'
=================================================================
```

---

## Real-World Vulnerability Case Studies

Here is how our EER + SRC methodology uncovered the 7 published CVE Candidate vulnerabilities in `ax-llm`:

| CAN Identifier | GitHub Issue | Internal ZD | Vulnerability Class | Flaw Mechanism | Physical Impact on Device |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`CAN-2026-2038776`** | Issue #76 | ZD-006 / ZD-039 | CWE-787 / CWE-190 | `size_t` downcast to `int`; unclamped `memcpy` into `t_mask.nSize` | Corrupts physical NPU MMZ device memory; freezes hardware bus |
| **`CAN-2026-2038801`** | Issue #75 | ZD-048 / RT-508 | CWE-78 | Unsanitized audio filename in `_popen("ffmpeg.exe ...")` | Remote OS command execution with root process privileges |
| **`CAN-2026-2034987`** | Issue #80 | ZD-009 | CWE-120 / CWE-134 | Unbounded `sprintf` of shard paths into 1024-byte stack array | Stack frame return address corruption; segmentation fault |
| **`CAN-2026-2038777`** | Issue #81 | ZD-024 | CWE-787 | Position indices loop missing check against `idx_elems` | Out-of-bounds pointer write into physical RoPE device buffers |
| **`CAN-2026-2038778`** | Issue #82 | ZD-041 | CWE-190 / CWE-122 | Signed 32-bit stride multiplication `src_w * 4` overflows `INT_MAX` | Heap memory under-allocation; bad allocation crash (`std::bad_alloc`) |
| **`CAN-2026-2038779`** | N/A *(Vendored)* | ZD-002 | CWE-415 | Missing copy constructor in `cmdline::parser` (Rule of Three) | Duplicate heap pointers in shallow copy trigger double-free abort |
| **`CAN-2026-2038802`** | Issue #77 | ZD-051 | CWE-476 | Unchecked pointer in streaming callback formatted via `fprintf` | Null pointer dereference segmentation fault during streaming |

---

## How This Affects Real Devices in the Field

When discussing edge AI vulnerabilities, a common misconception is: *"These are just developer sample scripts. Do they really matter to an enterprise?"*

Here is what happens when these vulnerabilities land in production hardware:

1. **Smart Video Surveillance:** Many enterprise IP cameras use edge vision models to detect perimeter breaches, track license plates, or recognize faces. A malformed image dimension or oversized frame sent to the inference endpoint triggers `CAN-2026-2038778` (heap buffer overflow) or `CAN-2026-2038776` (NPU bus lockup). The camera stops processing video streams, blinding the surveillance grid until a technician physically power-cycles the camera.
2. **Industrial Robotics and Inspection:** In manufacturing lines, edge NPUs inspect manufactured parts for defects in real time. Forcing a physical MMZ memory lockup halts the quality assurance pipeline, stopping factory production.
3. **Voice-Enabled Gateways:** Intercoms, conference room transcribers, and voice-assisted kiosks running Whisper models are vulnerable to `CAN-2026-2038801`. An attacker supplying a crafted audio filename over the network gains an interactive root shell on the physical appliance, establishing a persistent foothold on the internal network.

---

## Defensive Engineering Playbook for AI Developers

To protect edge inference runtimes from these vulnerability patterns, implement these five defensive controls:

1. **Always Clamp Destination Buffers:** Never assume the caller knows the buffer limits. Compare requested copy size against destination capacity:
   ```cpp
   uint32_t safe_copy = std::min((uint32_t)dest.nSize, (uint32_t)requested_size);
   memcpy(dest.pVirAddr, src_buffer, safe_copy);
   ```
2. **Use 64-Bit Arithmetic for Strides and Allocations:** Never use 32-bit signed integers to compute image dimensions or patch sizes. Perform all arithmetic in unsigned 64-bit integers (`size_t`), and validate that multiplication does not overflow before allocating memory:
   ```cpp
   size_t step = (size_t)width * 4;
   if (width > 0 && step / 4 != width) {
       return false; // Overflow detected
   }
   ```
3. **Ban Unbounded C String Functions:** Replace all instances of `sprintf` with `snprintf`, and check the return code to verify truncation.
4. **Enforce the Rule of Five on Resource Managers:** If a class manages dynamically allocated memory or hardware device handles, explicitly delete the copy constructor and copy assignment operator to prevent shallow copies:
   ```cpp
   parser(const parser&) = delete;
   parser& operator=(const parser&) = delete;
   ```
5. **Drop Root Privileges:** Never run an edge inference daemon as `root`. Create a dedicated service user, assign only the necessary Linux capabilities (e.g. `CAP_SYS_RAWIO` or group access to `/dev/ax_npu`), and run the process inside a restricted systemd service sandbox.

---

## Conclusion: Securing the Seams

The future of offensive security in artificial intelligence is not just about prompt engineering. As models shrink and edge chips get faster, the attack surface is moving down the stack to the code that directly drives the silicon.

By combining Source Code Review with physical Edge Execution Review, red teams can identify real, exploitable vulnerabilities in physical devices long before threat actors weaponize them.
