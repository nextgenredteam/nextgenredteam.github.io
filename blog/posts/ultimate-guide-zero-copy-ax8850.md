---
title: "Ultimate Guide: Unlocking Native Zero-Copy 14+ TPS on the Axera AX8850"
date: "2026-06-23"
author: "Joe Brinkley"
description: "How we bypassed Radxa's Python CPU bottlenecks, compiled a native C++ server, and achieved stable 14+ TPS on LLaMA 3.2 3B using zero-copy memory pipelines."
---

# Ultimate Guide: Unlocking Native Zero-Copy 14+ TPS on the Axera AX8850 (Bypassing Radxa's Python Bottlenecks)

![Ultimate Guide: Unlocking Native Zero-Copy 14+ TPS on the Axera AX8850](../assets/ultimate_zero_copy_npu.png)

If you're running LLMs on the Axera AX8850 (or AX650N) NPUs using the default Radxa drivers and legacy Python orchestrators, you are severely bottlenecking your hardware. 

The default Radxa Python wrapper uses a stateful `pexpect` CLI bridge that pushes raw strings back and forth to a C++ binary. This creates massive I/O overhead, corrupts the KV Cache management, and causes the infamous **0.0 TPS Deadlock** the second your context window fills up.

Furthermore, the default global Python environments shipped on these NPUs are fundamentally broken and corrupted, which will silently crash the `huggingface-cli` and `Pulsar2` model compilers.

Here is the exact technical breakdown of how we bypassed the Radxa drivers, patched the C++ tokenizers, and deployed a pure, zero-copy native API server directly connected to the NPU's PCIe kernel driver.

---

## 🛠️ What We Patched

1. **The Orchestrator:** We completely threw out the Python wrapper. We cloned Axera's upstream `ax-llm` repository and compiled their unified `axllm serve` C++ daemon natively. This exposes a zero-copy OpenAI `/v1/chat/completions` API out of the box.
2. **The Python Environment:** The global `transformers` library on the NPU host is broken. We bypassed it by bootstrapping an entirely isolated Python `venv` purely for compiling the models and tokenizers.
3. **The Tokenizer Magic:** The native C++ server **will crash** if you feed it standard Hugging Face `tokenizer.json` files. It strictly requires a proprietary binary `tokenizer.txt` file beginning with a specific hex "magic number". We intercepted the compiler pipeline to generate this securely in our clean `venv`.

---

## ⚡ The "One-Go" Pipeline Script

If you want to skip the headache, here is the exact, end-to-end bash pipeline to get an LLM (like LLaMA 3.2 3B) compiled and running perfectly on the raw silicon in one go.

### Step 1: Compile the Native C++ Server

First, build the zero-copy daemon from Axera's upstream source:

```bash
# Clone the unified upstream engine
git clone https://github.com/AXERA-TECH/ax-llm.git
cd ax-llm
git submodule update --init --recursive

# Build the PCIe host backend for x86
mkdir build && cd build
cmake .. -DAX_TARGET_ARCH=x86 -DAX_BUILD_API=ON
make -j8
```

### Step 2: The Fully Automated Pipeline

Run this single bash script. It will create a clean virtual environment, download the weights using the modern `hf` command, compile the NPU `.axmodel` chunks utilizing maximum KV Cache, and securely generate the proprietary tokenizer.

```bash
#!/bin/bash
# 1. Isolate the environment! Never use the host Python for this.
echo "Creating clean compiler VENV..."
python3 -m venv /opt/axera/compiler_venv
export PATH=/opt/axera/compiler_venv/bin:/usr/local/bin:$PATH

echo "Installing clean dependencies..."
pip install --upgrade pip
pip install transformers huggingface_hub torch

# 2. Download the RAW Weights using the modern CLI
echo "Downloading LLaMA 3.2 RAW Weights..."
hf download huihui-ai/Llama-3.2-3B-Instruct-abliterated --local-dir /opt/axera/models/Llama-3.2-3B-RAW

# 3. Compile the Model Chunks for the NPU
# (Note: We explicitly override the kv_cache_len to maximize the 5.5GB NPU RAM!)
echo "Building LLaMA 3.2 3B (8191 Context)..."
pulsar2 llm_build --input_path /opt/axera/models/Llama-3.2-3B-RAW \
                  --output_path /opt/axera/models/Llama-3.2-3B-AX \
                  --kv_cache_len 8191 \
                  --chip AX650 \
                  -w s4

# 4. Generate the Proprietary Tokenizer
# This MUST be run inside the clean venv, otherwise the broken host environment will crash it!
echo "Exporting Tokenizer with Magic Hex..."
python3 /opt/axera/source/ax-llm/third_party/tokenizer.axera/tests/convert_tokenizer.py \
    --tokenizer_path /opt/axera/models/Llama-3.2-3B-RAW \
    --dst_path /opt/axera/models/Llama-3.2-3B-AX/tokenizer.txt

echo "Pipeline Complete!"
```

### Step 3: Boot the Daemon

Once the model is compiled into the `Llama-3.2-3B-AX` folder, you need to map it via a `config.json` payload so the C++ object factory recognizes it. Ensure your folder contains a `config.json` similar to this:

```json
{
    "model_name": "llama3_2",
    "template_filename_axmodel": "llama3_2_p128_l%d_together.axmodel",
    "url_tokenizer_model": "tokenizer.txt",
    "tokenizer_type": "LLaMA"
}
```

Then, fire up the daemon:

```bash
cd /opt/axera/source/ax-llm/
sudo ./build/axllm serve /opt/axera/models/Llama-3.2-3B-AX/ --port 8000
```

---

## The Results

You now have a fully operational, OpenAI-compatible REST server listening on `127.0.0.1:8000/v1/chat/completions`. 

By completely bypassing the CPU bottlenecks and utilizing the pure C++ NPU memory bridges, we stress-tested this engine and hit a perfectly stable **~14 TPS**. It handles back-to-back heavy reasoning prompts flawlessly, dynamically flushes the KV Cache, and completely eradicates the Radxa 0.0 TPS deadlock issue! 🔥
