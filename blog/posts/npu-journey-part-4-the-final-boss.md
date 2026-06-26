---
title: "The NPU Journey Part 4: Conquering the Final Boss (Strict JSONs, CMM Boot Windows, and Gateways)"
date: "2026-06-28"
author: "Joe B. The Blind Hacker"
description: "Resolving strict post_config type checks, handling the 65-second CMM boot window, and building a LiteLLM translation layer for unified edge NPU inference."
---

# The NPU Journey Part 4: Conquering the Final Boss (Strict JSONs, CMM Boot Windows, and Gateways)

![The NPU Journey Part 4: Conquering the Final Boss](../assets/npu_journey_part4.png)

Compiling your own custom model graphs (documented in Part 3) is a huge milestone. But actually serving those graphs in a production API is where you face the final boss of NPU deployment. 

The vendor C++ runtime is unforgiving. If a single configuration key is missing, or if a JSON type is slightly incorrect, the server crashes at the last millisecond of startup. 

Here is the engineering breakdown of how we fixed the runtime exceptions, handled the physical memory loading latency, and integrated the edge NPU into our central LiteLLM gateway.

---

## 1. The `post_config.json` Strict Typing Crash

After transfering our compiled Qwen 2.5 Coder 7B model to the inference node (LXC 211), we configured the metadata files and started the native `axllm serve` server. The binary started, loaded the model shards into the NPU, and then crashed instantly:

```text
fatal: json_abi_v3_11_3::detail::type_error: [json.exception.type_error.302] type must be boolean, but is null
```

We tracked this down to the C++ JSON parser (`nlohmann::json`) used by the vendor. 

The backend requires four specific configuration fields to be present in `post_config.json`. Because the parser uses strict type checking with no coercion, omitting these fields (or passing them as null, integers, or strings) triggers a fatal type exception that crashes the server.

You must manually append these four boolean fields to your model's `post_config.json`:

```json
{
    "model_type": "qwen2",
    "chat_format": "chatml",
    "eos_token_id": 151645,
    "bos_token_id": 151644,
    "pad_token_id": 151643,
    "system_message": "You are a helpful assistant.",
    "user_token": "<|im_start|>user",
    "assistant_token": "<|im_start|>assistant",
    "end_token": "<|im_end|>",
    "stop_words": ["<|im_end|>", "<|endoftext|>"],
    "enable_temperature": false,
    "enable_repetition_penalty": false,
    "enable_top_k_sampling": true,
    "enable_top_p_sampling": false
}
```

Make sure these fields are raw JSON booleans (`true`/`false`), not quoted strings. Once we patched the template metadata, the parser initialized cleanly.

---

## 2. The 65-Second CMM Boot Window

When you launch `axllm serve`, the server must load the model weights from host memory into the NPU's physical Continuous Memory (CMM) blocks. 

For a 7B parameter model, this memory transfer takes approximately **65 seconds**. 

During this loading phase, the server's HTTP port is not open. If you send a `curl` probe or API request immediately after launching the process, the socket returns `Connection refused`. This looks exactly like a crashed service, prompting you to debug a server that is actually booting normally.

Always wait a minimum of **90 seconds** after starting the service before checking the endpoint or routing traffic. You can monitor the CMM loading progress directly in the logs:

```text
[I] Loading shard 0/31 into CMM...
[I] Loading shard 1/31 into CMM...
...
[I] axllm serve: HTTP server listening on port 8000
```

---

## 3. Exact Model Name Namespace Enforcement

The native C++ server uses exact string comparison to route incoming API requests. 

When you send a request to `/v1/chat/completions`, the `"model"` field in your JSON payload must exactly match the HuggingFace repository ID defined in the model's `config.json`. If you send a shorthand name (like `"qwen"` or `"coder-7b"`), the server silently rejects the request with a 404 error.

```bash
# This request will fail with a 404:
curl -X POST http://127.0.0.1:8000/v1/chat/completions \
    -d '{"model": "coder-7b", "messages": [{"role": "user", "content": "Hi!"}]}'

# This request will succeed:
curl -X POST http://127.0.0.1:8000/v1/chat/completions \
    -d '{"model": "Qwen/Qwen2.5-Coder-7B-Instruct-GPTQ-Int4", "messages": [{"role": "user", "content": "Hi!"}]}'
```

---

## 4. The LiteLLM Gateway Integration

Because we cannot expect our tools and agents to format model names with long vendor namespaces, we routing all traffic through a **LiteLLM proxy** (LXC 210). LiteLLM handles user authentication, key rotation, and translates human-readable model names to the exact strings required by the NPU backend.

Here is our routing configuration:

```yaml
# /opt/ai_gateway/config/litellm_config.yaml
model_list:
  - model_name: qwen2.5-3b-instruct
    litellm_params:
      model: openai/qwen2.5-3b-instruct
      api_base: http://192.168.40.183:8000/v1
      api_key: sk-axera-dummy-key
      rpm: 1000

  - model_name: qwen2.5-coder-7b
    litellm_params:
      model: openai/Qwen/Qwen2.5-Coder-7B-Instruct-GPTQ-Int4
      api_base: http://192.168.40.183:8000/v1
      api_key: sk-axera-dummy-key
      rpm: 1000
```

With the proxy in place, we can address the NPU using clean tags:

```bash
# Querying the edge NPU through the LiteLLM gateway
curl -H "Authorization: Bearer sk-bluestar-master-key" \
     -X POST http://192.168.40.11:4000/v1/chat/completions \
     -d '{"model": "qwen2.5-coder-7b", "messages": [{"role": "user", "content": "Write a quick TCP socket script."}]}'
```

---

## Conclusion: Full Independence Achieved

We now have a fully operational, sovereign edge NPU serving a 7B parameter model natively on our homelab infrastructure. The Radxa AX-M1 pulls less than **8 watts** of power during active inference, streaming tokens to our orchestration pipeline without relying on external cloud APIs or proprietary code.

By working through the compilation environment blocks, debugging the strict JSON parser layouts, and wrapping the API in a translation gateway, we successfully unlocked the potential of this edge accelerator. 

The Pico Claw is online, stable, and ready to serve.

---

### The NPU Journey Series
*   **[Part 1: Taming the Axera AX8850 (And Why We Reverse-Engineered Everything for Nothing)](npu-journey-part-1-taming-axera-ax8850.html)**
*   **[Part 2: The True Guide to Deploying LLMs on the Axera AX8850](npu-journey-part-2-deploying-llms.html)**
*   **[Part 3: Night Shift Compilation Breakthroughs (AppArmor, LXC Ghost Memory)](npu-journey-part-3-compilation-breakthroughs.html)**
*   **Part 4: Conquering the Final Boss (Strict JSONs, CMM Boot Windows, and Gateways)**
