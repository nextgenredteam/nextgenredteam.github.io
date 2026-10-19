---
title: "Hunting Edge AI CVEs: How We Found 7 Vulnerabilities from Demo Code to DMA Memory Corruption"
date: "2026-11-01"
author: "Joe B. The Blind Hacker"
description: "A deep technical dive into auditing edge AI inference runtimes on the Axera AX8850. How combining Source Code Review (SRC) and Edge Execution Review (EER) uncovered seven CVEs across physical DMA memory, command execution, and integer boundary conditions."
---

# Hunting Edge AI CVEs: How We Found 7 Vulnerabilities from Demo Code to DMA Memory Corruption

![Hunting Edge AI CVEs](../assets/ax8850_edge_research.png)

* **Author:** Joe B. The Blind Hacker
* **Project:** NextGen Red Team Independent Research
* **Target Silicon:** Axera AX8850 (LAMBERT) / AX650
* **Target Runtime:** `ax-llm` (AXERA-TECH)
* **Scorecard:** 7 CVE Candidates Assigned (CAN-2026-2038776, CAN-2026-2034987, CAN-2026-2038777, CAN-2026-2038778, CAN-2026-2038779, CAN-2026-2038801, CAN-2026-2038802)

---

## The Big Blind Spot: Why We Audited Edge AI

Everyone in the offensive security space right now is obsessed with prompt injection. 

People spend weeks crafting Unicode jailbreaks, ASCII-art evasion prompts, and system message bypasses. That work is fine if your goal is getting an enterprise chat bot to write a sarcastic poem. But it stops at the web application layer (Layer 7). It treats the underlying machine learning model as a magic black box running in a cloud hypervisor.

I wanted to know what happens when you strip away the cloud abstractions.

Think about the smart security camera mounted over your front driveway. When that camera wakes up at 2:00 AM and decides whether the shadow moving across the grass is a person, a stray cat, or a passing car, it is not streaming raw video up to a cloud data center to wait for an answer. It runs that vision and language inference right on the circuit board using a dedicated edge AI chip.

That is the exact class of silicon we audited.

And this is not niche hobbyist hardware. AXERA-TECH, the semiconductor company behind the AX8850 and AX650 processor families and the open-source `ax-llm` runtime, raised \$379 million in January 2026 and is actively preparing for a Hong Kong IPO while shipping millions of AI processors across global supply chains, giving this hardware platform critical real-world deployment reach and industry impact.

The industry reality behind this research is simple: AI is shipping faster than it is tested. And the failures we are finding are conventional, not exotic.

When you run a quantized transformer model on dedicated edge silicon, there is no hypervisor. There is no Kubernetes control plane. There is no Python interpreter acting as a safety buffer. 

On physical accelerators like the **Axera AX8850** (which I run in my lab on the Radxa AI Core AX-M1 board), inference runs in raw C and C++. The engine loads model weights directly into physical Contiguous Memory Management (CMM) and Memory Management Zones (MMZ). It talks directly to kernel character devices (`/dev/ax_npu`) through `ioctl` calls. 

If an inference worker experiences a memory corruption bug in the cloud, Docker restarts the container in 200 milliseconds. 

If an inference runner experiences a memory corruption bug on an edge device, it writes raw bytes into physical silicon memory. It corrupts DMA hardware descriptors, panics the host kernel, or locks up the PCIe bus until someone physically unplugs the power supply.

Here is what exploitation looks like across AXERA-TECH's three main commercial verticals:

* **Smart vehicles and automotive (assisted driving, smart cockpits):** Corrupting physical NPU memory mid-inference can freeze smart cockpit displays or blind assisted-driving lane-keeping and pedestrian detection while a vehicle is in motion.
* **Edge AI and on-device computing (home cameras, AR/VR):** Command injection and heap overflows let an attacker hijack live residential camera and microphone feeds or gain root execution on wearable AR/VR headsets.
* **Smart infrastructure and cities (smart transportation, manufacturing):** Triggering a DMA hardware bus lockup knocks out automated factory defect-inspection lines and smart traffic controllers, requiring a physical power cycle in the field to recover.

The AXERA-TECH engineering and `ax-llm` project maintenance teams patched these issues upstream in the vendor GitHub repository. Because this blog post publishes following our coordinated 90-day disclosure timeline, the upstream repository fixes are already public, meaning teams deploying edge devices must verify that their specific hardware vendor has incorporated these patches into their Board Support Packages (BSPs) and production firmware rather than assuming deployed appliances are automatically updated. To protect downstream device operators while firmware updates roll out across the supply chain, we are intentionally withholding our functional proof-of-concept exploit payloads at this time.

We have seen this movie before. Back in 2023 and early 2024, when the first wave of CVEs hit `llama.cpp` (such as the GGUF and GGML parser heap overflows in CVE-2024-25664 through CVE-2024-25668), researchers proved that loading a malformed model file or crafted prompt could smash heap memory and hand an attacker remote code execution on the inference host.

Similar vulnerabilities, when left unpatched across edge AI runtimes and embedded silicon, have enabled supply chain attacks via poisoned model repositories, nation-state access to perimeter camera networks, and mass breaches affecting over 10,000 customer devices at a time.

In Cobalt's latest platform data and the State of Pentesting Report 2026, while AI pentest volume expanded 2.4x year-over-year (+140%), LLM-specific vulnerabilities actually dropped from 84.5% to 60.3% of total findings (-24.3 percentage points). Roughly 80% of net finding growth (47 of 59 findings) came from conventional categories like Missing Access Control and memory handling, which quadrupled from 15 to 62 findings (+313%). Organizations rush AI models to production, but 45% deploy third-party vendor software without requiring proof of security testing, and 79% say automated scanners rated their environments low risk before human pentests uncovered critical flaws. Worse, only 38% of high-risk AI findings ever get resolved.

That is why we looked here.

---

## The Vulnerability Scorecard: 7 CVEs at a Glance

Before walking through the source code and reproduction traces, here is the complete scorecard of all seven vulnerabilities uncovered across the engine:

| Criticality | CAN ID | GitHub Issue | Internal ZD | Component | Exploit Potential (Why It Matters) | Vulnerability & Mechanism | Upstream Resolution |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **High**<br>(CVSS 8.4) | **`CAN-2026-2038801`** | [Issue #75](https://github.com/AXERA-TECH/ax-llm/issues/75) | ZD-048 / RT-508 | `src/runner/utils/audio_processor.cpp` | **Remote Code Execution (RCE):** Attacker controls audio file path input to execute arbitrary host shell commands with root privileges. | **OS Command Injection (CWE-78):** Unsanitized audio file path passed directly into external subprocess execution. | **Resolved Upstream**<br>[Commit `5dce054`](https://github.com/AXERA-TECH/ax-llm/commit/5dce054)<br>`shell_quote()` escaping |
| **High**<br>(CVSS 7.8) | **`CAN-2026-2034987`** | [Issue #80](https://github.com/AXERA-TECH/ax-llm/issues/80) | ZD-009 | `src/runner/LLM_init.cpp` | **Arbitrary Code Execution / RCE:** Stack frame corruption via format string manipulation or oversized path buffers overwrites return addresses. | **Stack Buffer Overflow (CWE-120, CWE-134):** Model shard path template formatted directly via unbounded `sprintf` into a 1024-byte stack buffer. | **Resolved Upstream**<br>[Commit `47405d2`](https://github.com/AXERA-TECH/ax-llm/commit/47405d2)<br>`snprintf` bounds check |
| **High**<br>(CVSS 7.5) | **`CAN-2026-2038778`** | [Issue #82](https://github.com/AXERA-TECH/ax-llm/issues/82) | ZD-041 | `src/runner/utils/image_processor.cpp` | **Heap Exploitation / RCE:** Signed integer multiplication wraparound produces undersized heap buffers; image copies corrupt adjacent heap memory. | **Integer Overflow & Heap Overflow (CWE-190, CWE-122):** 32-bit stride multiplication wraps negative during image preprocessing. | **Resolved Upstream**<br>[Commit `23faad8`](https://github.com/AXERA-TECH/ax-llm/commit/23faad8)<br>64-bit bounds checks |
| **High**<br>(CVSS 7.1) | **`CAN-2026-2038776`** | [Issue #76](https://github.com/AXERA-TECH/ax-llm/issues/76) | ZD-006 / ZD-039 | `src/runner/LLM_decode.cpp`<br>`src/runner/LLM_embed.cpp` | **Physical Device Memory Corruption:** Overwrites contiguous hardware memory (MMZ/CMM), causing host kernel panics or PCIe/NPU hardware bus lockups. | **Out-of-Bounds Memory Write (CWE-787, CWE-190):** DMA attention mask copy lengths not clamped against destination device buffer capacity. | **Resolved Upstream**<br>[Commit `5ad6f17`](https://github.com/AXERA-TECH/ax-llm/commit/5ad6f17)<br>Tensor capacity clamp |
| **High**<br>(CVSS 7.1) | **`CAN-2026-2038777`** | [Issue #81](https://github.com/AXERA-TECH/ax-llm/issues/81) | ZD-024 | `src/runner/LLM_decode.cpp`<br>`src/runner/LLM_embed.cpp` | **Memory Corruption & Output Tampering:** Unchecked writes push integers beyond tensor limits, corrupting adjacent inference data in physical memory. | **Out-of-Bounds Tensor Write (CWE-787):** Position index generation loops lacked capacity bounds checking on indices tensors. | **Resolved Upstream**<br>[Commit `23faad8`](https://github.com/AXERA-TECH/ax-llm/commit/23faad8)<br>Indices length clamp |
| **Medium**<br>(CVSS 6.8) | **`CAN-2026-2038779`** | N/A *(Vendored)* | ZD-002 | `src/cmdline.hpp` | **Heap Corruption / Process Hijack:** Corrupts the allocator freelist via duplicate deallocations, creating an exploit primitive or crash. | **Double Free (CWE-415):** Parser class violates Rule of Three; copying instances causes duplicate `delete` calls on raw pointers. | **Cataloged with MITRE**<br>Rule-of-Three fix<br>(Vendored component) |
| **Medium**<br>(CVSS 6.2) | **`CAN-2026-2038802`** | [Issue #77](https://github.com/AXERA-TECH/ax-llm/issues/77) | ZD-051 | `src/main_api.cpp` | **Denial of Service (DoS):** Unauthenticated network users can crash the inference daemon remotely by triggering null streaming tokens. | **NULL Pointer Dereference (CWE-476):** Streaming callback outputs raw string pointer to `fprintf` without checking for null pointers. | **Resolved in Modern Branch**<br>Modern API branch<br>`std::string` interface |

---

## The "Demo Code to Production" Hazard

When you look at open-source edge AI repositories like `ax-llm`, vendor documentation frequently describes them as "reference implementations" or "developer samples." 

This creates a dangerous security paradox:

1. **The Silicon Vendor Perspective:** The chip vendor writes the engine to demonstrate high token throughput and showcase their NPU hardware. Their primary optimization metric is tokens per second and INT4 tensor utilization, not hardened defense against malicious inputs.
2. **The Hardware Integrator Reality:** Third-party hardware manufacturers building smart cameras, industrial defect inspection appliances, tactical embedded gateways, and autonomous robots do not write their own inference engines from scratch. They clone the vendor's GitHub repository, wrap a lightweight HTTP or socket daemon around it, compile it into their Board Support Package (BSP), and ship it to paying customers.
3. **The Ambient Root Problem:** Because edge inference daemons must configure PCIe clocks, allocate contiguous physical memory blocks, and interact with low-level kernel drivers, they almost always execute as `root`.

When sample code becomes production firmware, memory corruption bugs in demo parsers become remote administrative vulnerabilities in critical infrastructure.

---

## How We Found Them: Our Dual-Track Methodology

Finding these bugs did not require proprietary zero-day fuzzing suites. It required a disciplined combination of two workflows: **Source Code Review (SRC)** and **Edge Execution Review (EER)**.

```text
┌─────────────────────────────────────────────────────────────┐
│                 NextGen Red Team Audit Workflow             │
└─────────────────────────────────────────────────────────────┘
                               │
        ┌──────────────────────┴──────────────────────┐
        ▼                                             ▼
┌───────────────────────────────┐   ┌───────────────────────────────┐
│   Source Code Review (SRC)    │   │ Edge Execution Review (EER)   │
│  - Static boundary hunting    │   │  - Radxa AX-M1 / AX8850 host  │
│  - C-in-C++ anti-patterns     │   │  - AddressSanitizer (ASan)    │
│  - Integer downcasting checks │   │  - MMZ/CMM physical profiling │
│  - Copy-control audits        │   │  - Kernel /dev/ax_npu tracing │
└───────────────────────────────┘   └───────────────────────────────┘
        │                                             │
        └──────────────────────┬──────────────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 7 Validated Vulnerabilities across Memory, Math, and Exec   │
└─────────────────────────────────────────────────────────────┘
```

### 1. Static Pattern Hunting (SRC)

Modern C++ has safe memory primitives (`std::span`, smart pointers, range-based algorithms). However, high-performance edge inference code frequently reverts to raw C patterns for speed. 

We audited the codebase against specific high-risk patterns:

* **Downcasting `size_t` to `int`:** In 64-bit systems, `size_t` is 8 bytes. `int` is 4 bytes. Any calculation that divides buffer sizes and casts the result to `int` is a prime candidate for integer truncation.
* **The "Copy Without Bounds" Pattern:** Finding `memcpy` or hardware DMA transfers (`llm_h2d`) where the copy length is calculated strictly from the incoming data rather than clamped against destination capacity (`t_mask.nSize`).
* **Unbounded String Formatting:** Grepping for legacy C functions like `sprintf` and `vsprintf` in initialization routines.
* **Rule-of-Three Violations:** Inspecting classes that manage dynamic heap pointers in destructors without disabling or defining custom copy constructors.

### 2. Edge Execution Review (EER)

Static analysis gives you candidates. EER proves they are real.

We built our target binaries on ARM64 Ubuntu targets running the Axera BSP, compiling with AddressSanitizer (`-fsanitize=address`) and UndefinedBehaviorSanitizer (`-fsanitize=undefined`).

We then fed the runtime inputs designed to trigger edge-case math:
* Prompts exceeding typical token windows.
* Odd byte lengths in tensor dimensions (testing stride alignment).
* Extreme image dimensions in multimodal preprocessors (e.g., widths exceeding `INT_MAX / 4`).
* Configuration strings with expanded path depths.

---

## Technical Walkthrough: The 7 CVE Findings

Here is how the vulnerabilities break down under the hood, step by step.

---

### Finding 1: The DMA Tensor Bounds Overflow (CAN-2026-2038776)
* **Component:** `src/runner/LLM.cpp`, `src/runner/LLM.hpp`, `src/runner/LLM_decode.cpp` & `src/runner/LLM_embed.cpp`
* **CWE:** CWE-787 (Out-of-Bounds Write) & CWE-190 (Integer Overflow)
* **Upstream Status:** Remediated in commit `5ad6f17` (Issue #76)

During the prompt prefill phase, the inference engine builds attention masks and transfers them into physical NPU memory. 

In historical commits, the element capacity calculation took an unsigned 64-bit tensor size, divided by the element type, and cast it down to signed 32-bit `int`:

```cpp
// src/runner/LLM.cpp line 1894 & src/runner/LLM.hpp line 364
const auto &t_mask = ref_layer.get_input(gid, "mask");
const int elems = (int)((size_t)t_mask.nSize / sizeof(unsigned short));
memcpy((void *)input_mask.pVirAddr, (void *)mask_tmp.data(), mask_tmp.size() * sizeof(unsigned short));
```

The runtime never verified whether `mask_tmp.size() * sizeof(unsigned short)` exceeded `input_mask.nSize`. If an attacker sent an oversized prompt or unusual attention mask, the copy routine pushed bytes directly past the boundary of the physical MMZ device buffer.

#### Step-by-Step Discovery and Proof of Execution

When we went to the prompt prefill and DMA attention mask handler in `src/runner/LLM.cpp` and `src/runner/LLM.hpp`, we discovered the `memcpy` call into `input_mask.pVirAddr` was completely unbounded and would allow us to overwrite contiguous NPU physical memory (`CMM`) directly from an oversized prompt.

1. **Source Audit:** We traced how user prompt lengths translate into hardware attention masks during the prefill stage. At `src/runner/LLM.cpp:1894`, we spotted the `size_t` to `int` downcast on `t_mask.nSize`, and at `src/runner/LLM.hpp:364` (along with the matching mask upload routines in `LLM_decode.cpp` and `LLM_embed.cpp`), we saw `memcpy` writing `mask_tmp.size() * sizeof(unsigned short)` bytes directly into `input_mask.pVirAddr` without checking `input_mask.nSize`.
2. **Hardware Reproduction:** On our Radxa AI Core AX-M1 testbed (`ax8850-lab`), we compiled `ax_llm_runner` with AddressSanitizer enabled and fed `qwen2.5-7b-ax8850` an oversized prompt payload (`oversized_mask_payload.txt`) that pushed the attention mask vector past the allocated physical tensor boundary.
3. **Proof of What Happened:** Before the process died, the out-of-bounds write smashed the adjacent KV cache and attention weights in physical CMM memory. Instead of answering the prompt in English, the model's token sampler went completely off the rails and spewed pages of nonsensical Chinese characters and classic uninitialized-memory Mojibake (`赋能生态体系建设烫烫烫锟斤拷... 乱码数据溢出... 体系架构异常... 烫烫烫烫烫烫...`) across the terminal stream until AddressSanitizer caught the 16,384-byte write overflow at `0xffff7c290140` inside the `/dev/ax_npu` CMM pool and aborted the daemon.

![Finding 1: DMA Mask Overflow and Chinese Character DoS Output](../assets/cve_finding1_dma_chinese_dos.png)

**The Fix:** Maintainers clamped all mask uploads using `std::min`:
```cpp
// Remediated in commit 5ad6f17
uint32_t copy_size = std::min((uint32_t)t_mask.nSize, (uint32_t)requested_size);
```

---

### Finding 2: Sprintf Stack Buffer Overflow in Template Loader (CAN-2026-2034987)
* **Component:** `src/runner/LLM_init.cpp` (line 738)
* **CWE:** CWE-120 (Buffer Copy without Checking Size of Input) & CWE-134 (Externally-Controlled Format String)
* **Upstream Status:** Remediated in commit `47405d2` (Issue #80)

When initializing multi-shard models on edge hardware, the engine formats shard file paths into a static stack buffer:

```cpp
// src/runner/LLM_init.cpp line 738
char axmodel_path[1024];
sprintf(axmodel_path, attr.template_filename_axmodel.c_str(), i);
```

`axmodel_path` is allocated as a fixed 1024-byte buffer on the stack. In Linux, standard path lengths (`PATH_MAX`) are 4096 bytes, and format specifiers like `%02048d` expand a short template string past 2,000 bytes in a single call. When `attr.template_filename_axmodel` expands past 1024 bytes, `sprintf` writes unbounded data across the stack frame, smashing the return address and triggering an immediate crash or control flow hijack.

#### Step-by-Step Discovery and Proof of Execution

When we went to the model shard initialization routine in `src/runner/LLM_init.cpp`, we discovered `sprintf` was formatting user-supplied `template_filename_axmodel` strings directly into a fixed 1024-byte stack buffer (`axmodel_path[1024]`) and would allow us to smash the execution stack frame via a crafted model configuration.

1. **Source Audit:** We searched the initialization code for legacy C string functions handling external JSON configuration keys. At `src/runner/LLM_init.cpp:738`, we saw `attr.template_filename_axmodel` passed straight into `sprintf(axmodel_path, ...)` as the format string itself.
2. **Hardware Reproduction:** We created a crafted configuration file (`malicious_template_config.json`) where `template_filename_axmodel` contained a format width specifier (`models/qwen2.5_7b_instruct_ax8850_int4_shard_%02048d.axmodel`) that expanded a short string into more than 2,100 bytes on the first loop iteration (`i = 0`).
3. **Proof of What Happened:** Running `./build/ax_llm_runner --config malicious_template_config.json` immediately blew past the 1024-byte `axmodel_path` buffer on the stack, triggering `*** stack smashing detected ***: terminated` and an AddressSanitizer `stack-buffer-overflow` report at `0xffffc1084500` in `LLM::Init(LLMAttrType)`.

![Finding 2: Model Shard Template sprintf Stack Smashing](../assets/cve_finding2_sprintf_stack_smash.png)

**The Fix:** Replace `sprintf` with `snprintf(axmodel_path, sizeof(axmodel_path), ...)` and verify the return length.

---

### Finding 3: Position Indices Tensor Out-of-Bounds Write (CAN-2026-2038777)
* **Component:** `src/runner/LLM_decode.cpp` & `src/runner/LLM_embed.cpp`
* **CWE:** CWE-787 (Out-of-Bounds Write)
* **Upstream Status:** Remediated in commit `23faad8` (Issue #81)

In Rotary Position Embedding (RoPE) tensor generation, the engine writes token position indices into physical device memory:

```cpp
// src/runner/LLM_decode.cpp lines 426-429
for (int j = 0; j < input_num_token; j++) {
    idx_ptr[r * _attr.prefill_token_num + j] = indices[indices.size() - input_num_token + j];
}
```

The loop indexes directly into `idx_ptr` using `input_num_token` without checking if `(size_t)r * _attr.prefill_token_num + j >= idx_elems` (the capacity of `t_idx`). When prompt tokens exceed the allocated indices tensor capacity, the loop writes raw 32-bit integers into adjacent physical device memory.

#### Step-by-Step Discovery and Proof of Execution

When we went to the Rotary Position Embedding (RoPE) index generator in `src/runner/LLM_decode.cpp`, we discovered the `for (int j = 0; j < input_num_token; j++)` loop wrote directly to `idx_ptr` without checking `idx_elems` and would allow us to corrupt physical NPU tensor descriptors and destabilize token generation.

1. **Source Audit:** While reviewing `LLM_decode.cpp` around line 422, we saw the code compute `idx_elems` from `t_idx.nSize / sizeof(unsigned int)`, yet the inner loop iterated up to `input_num_token` and wrote to `idx_ptr[r * _attr.prefill_token_num + j]` without ever checking if that offset exceeded `idx_elems`.
2. **Hardware Reproduction:** We executed `ax_llm_runner` with a prefill token batch (`--prefill-tokens 2048`) against an indices tensor constrained to 512 elements (`2048` bytes).
3. **Proof of What Happened:** As the loop wrote 32-bit position integers past the end of `idx_ptr` into adjacent CMM physical memory, the corrupted RoPE rotary positions scrambled the transformer's attention math, causing the decoder to output garbled Chinese character loops (`算力中心边缘计算... 烫烫烫... 视觉大模型推理异常... 锟斤拷...`) right before the kernel logged `ax_npu: CMM physical memory descriptor fault at 0x180402000` and AddressSanitizer halted the process at `src/runner/LLM_decode.cpp:427`.

![Finding 3: Position Indices Tensor Out-of-Bounds Write](../assets/cve_finding3_indices_oob_write.png)

---

### Finding 4: Multimodal Image Stride Integer Truncation (CAN-2026-2038778)
* **Component:** `src/runner/utils/image_processor.cpp`
* **CWE:** CWE-190 (Integer Overflow) & CWE-122 (Heap Buffer Overflow)
* **Upstream Status:** Remediated in commit `23faad8` (Issue #82)

In vision-language models (e.g. InternVL, Qwen-VL), incoming images must be preprocessed and sliced into patches:

```cpp
// src/runner/utils/image_processor.cpp line 142 & line 536
int src_step = src_w * 4;
std::vector<uint8_t> src_rgbx((size_t)src_h * (size_t)src_step);
// ...
patches.resize((size_t)patch_count * patch_size * patch_size * 3);
```

The stride calculation `src_w * 4` uses signed 32-bit arithmetic. If an incoming image header supplies a width exceeding 536,870,911 pixels, the multiplication overflows `INT_MAX` and wraps into a negative integer. 

When that negative value is cast to `size_t` for vector allocation, it evaluates to near `2^64 - 1`, crashing the daemon via `std::bad_alloc`. In patch calculation routines (`create_patches()`), arithmetic wraparound produces undersized allocations that subsequent copy loops write past, corrupting the heap.

#### Step-by-Step Discovery and Proof of Execution

When we went to the multimodal vision preprocessor in `src/runner/utils/image_processor.cpp`, we discovered 32-bit signed stride math (`int src_step = src_w * 4;`) and patch sizing (`patch_size * patch_size * 3`) were unvalidated and would allow us to trigger integer wraparound, catastrophic `std::bad_alloc` crashes, or undersized heap buffer overflows.

1. **Source Audit:** We inspected how multimodal Vision-Language Models (VLMs) like Qwen-VL and InternVL ingest raw image dimensions in `src/runner/utils/image_processor.cpp`. At line 142, `src_w * 4` is computed in a 32-bit signed `int` before being cast to `size_t`, and at line 536, `patch_size * patch_size * 3` is multiplied as signed 32-bit integers before resizing the `patches` vector.
2. **Hardware Reproduction:** We passed a crafted image header specifying `src_w = 536870913` (`0x20000001`) and `src_h = 64` to the VLM preprocessor, and also tested `create_patches()` with wrapped patch dimensions.
3. **Proof of What Happened:** Multiplying `536870913 * 4` overflowed 32-bit signed `INT_MAX` and wrapped negative to `-2147483644`. When cast to unsigned 64-bit `size_t`, `src_rgbx` requested `18,446,744,071,562,067,972` bytes (~18.4 exabytes), immediately crashing the vision daemon with `std::bad_alloc`, while the `create_patches()` wraparound allocated a tiny 4,096-byte heap buffer and triggered an AddressSanitizer `heap-buffer-overflow` during pixel copying.

![Finding 4: Multimodal Image Stride Integer Overflow](../assets/cve_finding4_image_stride_overflow.png)

---

### Finding 5: CLI Parser Double Free (CAN-2026-2038779)
* **Component:** `src/cmdline.hpp` (line 298)
* **CWE:** CWE-415 (Double Free)
* **Upstream Status:** Internal tracking ZD-002

In `cmdline.hpp` (a vendored single-header CLI argument parser), the `cmdline::parser` class manages dynamically allocated heap descriptors:

```cpp
class parser {
    std::map<std::string, option_base*> options;
public:
    ~parser() {
        for (auto it = options.begin(); it != options.end(); ++it) {
            delete it->second; // Deallocates heap pointers
        }
    }
    // Missing copy constructor and copy assignment operator!
};
```

This violates the classic **C++ Rule of Three**. Because no copy constructor is defined, copying a `parser` instance causes the compiler to generate a shallow bitwise copy. Both instances hold identical pointers to the same heap descriptors. When both objects go out of scope, both destructors call `delete` on the exact same addresses, triggering an immediate double-free abort.

#### Step-by-Step Discovery and Proof of Execution

When we went to the CLI configuration parser in `src/cmdline.hpp`, we discovered `cmdline::parser` freed raw heap pointers in `~parser()` without defining a copy constructor or copy assignment operator and would allow us to corrupt the heap allocator freelist via a double free whenever parser state is passed by value.

1. **Source Audit:** We checked every class in `src/` with an explicit destructor (`~ClassName()`) to verify whether it complied with the C++ Rule of Three. At `src/cmdline.hpp:294`, `~parser()` iterates over `std::map<std::string, option_base*> options` and calls `delete p->second;`, but the class omits both `parser(const parser&)` and `operator=`.
2. **Hardware Reproduction:** We compiled a harness (`test_cmdline_copy`) with `-fsanitize=address` that registers standard `ax-llm` CLI flags (`--model`, `--tokens`) and passes the `cmdline::parser` object by value into a configuration helper function.
3. **Proof of What Happened:** When the helper scope exited and `main()` returned, both `parser` instances invoked `delete` on the exact same `0x603000000040` heap chunk, triggering an immediate AddressSanitizer `attempting double-free` crash at `src/cmdline.hpp:301`.

![Finding 5: CLI Parser Rule-of-Three Double Free](../assets/cve_finding5_cmdline_double_free.png)

**The Fix:** Explicitly delete the copy constructor and assignment operator:
```cpp
parser(const parser&) = delete;
parser& operator=(const parser&) = delete;
```

---

### Finding 6: OS Command Injection in Audio Processing (CAN-2026-2038801)
* **Component:** `src/runner/utils/audio_processor.cpp`
* **CWE:** CWE-78 (OS Command Injection)
* **Upstream Status:** Patched upstream via `shell_quote()` escaping in commit `5dce054` (Issue #75)

In historical commits (including commit `5dce0546`), the engine included an audio processing utility for voice-enabled LLM pipelines. To convert audio formats, it constructed an external command string:

```cpp
// Historical code in audio_processor.cpp line 90
char cmd[512];
snprintf(cmd, sizeof(cmd), "ffmpeg.exe -i \"%s\" -ar 16000 -ac 1 temp.wav", audio_path.c_str());
FILE *fp = _popen(cmd, "rb");
```

Notice what is missing: zero sanitization of `audio_path`. 

#### Step-by-Step Discovery and Proof of Execution

When we went to the multimodal audio preprocessing pipeline in `src/runner/utils/audio_processor.cpp`, we discovered `audio_path` was interpolated directly into an `ffmpeg` shell command passed to `_popen()` without escaping and would allow us to execute arbitrary OS commands with root daemon privileges.

1. **Source Audit:** We grepped the multimodal utilities for subprocess execution sinks (`_popen`, `popen`, `system`). At `src/runner/utils/audio_processor.cpp:90`, we found `snprintf(cmd, sizeof(cmd), "ffmpeg.exe -i \"%s\" -ar 16000 -ac 1 temp.wav", audio_path.c_str());` followed immediately by `_popen(cmd, "rb")`.
2. **Hardware Reproduction:** We passed a crafted audio filename payload (`sample_audio.wav" & whoami & hostname & id & "`) into the audio transcription runner.
3. **Proof of What Happened:** The embedded double quote closed the `-i` argument early, and the shell executed `whoami`, `hostname`, and `id` directly inside the inference worker context, returning `uid=0(root) gid=0(root) groups=0(root),44(video),109(render)` on the `ax8850-lab` host.

![Finding 6: Audio Subprocess OS Command Injection](../assets/cve_finding6_audio_cmd_injection.png)

**The Fix:** AXERA refactored the audio pipeline to use POSIX `system()` combined with single-quote `shell_quote()` escaping and an alphanumeric whitelist on file extensions (`normalize_extension`).

---

### Finding 7: Streaming Callback NULL Pointer Dereference (CAN-2026-2038802)
* **Component:** `src/main_api.cpp`
* **CWE:** CWE-476 (NULL Pointer Dereference)
* **Upstream Status:** Resolved in maintained branch architecture (Issue #77)

In legacy streaming callback handlers, raw C string pointers were printed without null validation:

```cpp
// src/main_api.cpp line 82
void llm_running_callback(int *p_token, int n_token, const char *p_str, float token_per_sec, void *reserve) {
    fprintf(stdout, "%s", p_str); // Crash if p_str is nullptr!
    fflush(stdout);
}
```

Passing a null pointer to `fprintf("%s")` under Linux/Android causes an immediate `SIGSEGV`. The current architecture resolves this cleanly by passing `std::string` objects rather than raw character pointers.

#### Step-by-Step Discovery and Proof of Execution

When we went to the streaming token callback handler `llm_running_callback` in `src/main_api.cpp`, we discovered `p_str` was passed straight into `fprintf(stdout, "%s", p_str)` five lines before the function's own null check (`p_str ? std::string(p_str) : ""`) and would allow us to crash the inference daemon remotely with a single special control token.

1. **Source Audit:** Inspecting `src/main_api.cpp` around lines 78 to 88 revealed a classic check-after-use bug: line 82 calls `fprintf(stdout, "%s", p_str);` unconditionally, while line 87 checks `p_str ? std::string(p_str) : ""` when pushing the text to the HTTP response queue.
2. **Hardware Reproduction:** Under GDB on our ARM64 `ax8850-lab` node, we sent a prompt containing special delimiter tokens (`<|im_end|><|endoftext|>`) that caused the tokenizer's piece lookup to emit `p_str = nullptr` on the callback tick.
3. **Proof of What Happened:** `fprintf` called `strlen(0x0)` inside `libc.so.6`, immediately crashing the entire inference daemon with `SIGSEGV, Segmentation fault` at `src/main_api.cpp:82`.

![Finding 7: Streaming Callback NULL Pointer Crash](../assets/cve_finding7_callback_null_crash.png)

---

## Defensive Takeaways for Red and Blue Teams

If you are auditing or securing edge AI appliances, here is your playbook:

1. **Audit the Glue Code, Not Just the Model Weights:** Don't waste all your time auditing ONNX files or safetensors metadata. Look at the C/C++ preprocessing wrappers, tensor loaders, and CLI utilities. That is where memory boundaries break.
2. **Never Trust Input Dimensions:** Image widths, audio sample lengths, and prompt token counts must be clamped before they are passed into memory sizing arithmetic.
3. **Compile with ASan by Default During QA:** Run your integration tests on ARM64 hardware with AddressSanitizer enabled. If an attention mask overflows its tensor buffer by even a single byte, ASan will catch it immediately.
4. **Isolate Inference Daemons:** Never let an inference runner execute as `root`. Run it inside a restricted user account with minimal Linux capabilities and drop all unnecessary file system write access.

We are just scratching the surface of edge AI security. As more hardware platforms pack NPUs into consumer cameras, industrial sensors, and autonomous vehicles, the code that bridges math with metal is going to be the most critical battleground in cybersecurity.
