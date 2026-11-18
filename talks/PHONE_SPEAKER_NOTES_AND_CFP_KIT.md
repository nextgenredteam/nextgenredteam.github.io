# Joe Brinkley (The Blind Hacker) Pocket Speaker Notes & Conference CFP Master Kit

This single-file master reference is formatted for fast screen-reader navigation (`500 WPM`) on your phone and for assistants or team members submitting Conference Call for Papers (CFPs) on your behalf.

---

## 0. Speaker Profile & Standard Conference Bio

* **Full Name:** Joe Brinkley
* **Handle / Persona:** Joe B. The Blind Hacker
* **Title:** Director of Offensive Security Research & Community at Cobalt (Founder, NextGen Red Team)
* **Phone (Public / Conference Organizer / Vendor Contact):** `202-670-0121`
* **Websites:** [TheBlindHacker.com](https://theblindhacker.com) | [NextGenRedTeam.com](https://nextgenredteam.com) | [DeadPixelSec.com](https://deadpixelsec.com)
* **50-Word Short Speaker Bio:**
  Joe Brinkley (The Blind Hacker) is Director of Offensive Security Research & Community at Cobalt and founder of NextGen Red Team. Completely blind, Joe audits C++ silicon runtimes, APIs, and autonomous AI swarms by ear at 500 words per minute using custom CLI pipelines and hardware testbeds.
* **120-Word Full Speaker Bio:**
  Joe Brinkley, known as The Blind Hacker, is Director of Offensive Security Research & Community at Cobalt and leads the NextGen Red Team lab. Operating entirely without sight, Joe audits source code, raw network streams, and embedded NPU silicon through a screen reader running at 500 words per minute. He brings over two decades of offensive security experience across enterprise red teaming, autonomous pentesting architectures, and bare-metal hardware vulnerability research. Joe recently uncovered seven memory corruption and command injection flaws (`CAN-2026-2038776` through `CAN-2026-2038802`) in the `AXERA-TECH/ax-llm` edge AI runtime. He leads community mentorship at DeadPixelSec and speaks regularly on offensive AI engineering and accessible security tradecraft.
* **Accessibility / AV Rider Note for Conference Organizers:**
  Speaker is blind and presents using a laptop/phone with audio screen reader routed to a single ear monitor. HDMI slide output is standard 1080p/16:9; no podium confidence monitor is required.

---

## Talk 1: Beyond Prompt Injection: The Edge Execution Review (EER) Playbook for AI Silicon

* **Full Paper:** [01-beyond-prompt-injection-eer-playbook.md](file:///f:/OneDrive/NGRT/Website/talks/01-beyond-prompt-injection-eer-playbook.md)
* **Best Conferences:** Black Hat, DEF CON, Hardware.io, RSA Conference, OWASP Global AppSec, Ekoparty

### CFP Copy-Paste Block
* **50-Word Abstract:**
  Most AI red teams stop at Layer 7 prompt fuzzing. On physical edge NPU silicon, C++ inference engines bypass virtual memory protection and write directly into Contiguous Media Memory (CMM) over DMA. This talk introduces Edge Execution Review (EER) and walks through seven real NPU vulnerabilities (`CAN-2026-2038776` through `CAN-2026-2038802`).
* **200-Word Abstract:**
  For two years, offensive AI security focused almost exclusively on cloud chatbots, jailbreaks, and prompt injection. That threat model collapses the moment machine learning leaves hyperscale cloud sandboxes and runs on physical edge silicon. On Neural Processing Units (NPUs) like the Axera AX8850, Rockchip RK3588, and Hailo-8, there is no memory-safe Python layer or Kubernetes hypervisor guarding the host. Lightweight C and C++ runtimes parse untrusted network inputs and pass raw pointers directly to `/dev/ax_npu` over Contiguous Media Memory (CMM) and Direct Memory Access (DMA) channels. In this talk, blind hacker and Cobalt Offensive Security Research Director Joe Brinkley demonstrates how he audits C++ NPU silicon by ear at 500 words per minute. Attendees will learn the **Edge Execution Review (EER) + Source Code Review (SRC)** methodology. We used that workflow to uncover seven memory corruption and command injection flaws in `AXERA-TECH/ax-llm` (`CAN-2026-2038776` through `CAN-2026-2038802`). We will walk through live AddressSanitizer stack traces, hardware DMA bus lockups, and a five-part defensive engineering playbook for securing edge AI firmware.

### Phone Stage Cues & Numbers
* **[00:00] Hook:** *"In the cloud, a bad prompt gets you a polite refusal. On an edge NPU, a bad tensor size locks up the physical PCIe bus."*
* **[08:00] Hardware Lab Specs:** Radxa AI Core AX-M1 (`ax650_card_v1.0` / Axera AX8850, 24 TOPS INT8) passed into `LXC 211` on `NextGenPVE` via `/dev/ax_npu` and `/dev/ax_cmm`.
* **[18:00] The 7 MITRE CVE Candidates (`AXERA-TECH/ax-llm` commit `a0fb3f2`):**
  1. `CAN-2026-2038801` (Issue #75): Unauthenticated OS Command Injection in `AudioWrapper.hpp` / `audio_processor.cpp` (`ffmpeg` shell string, CVSS 8.4 / 9.8).
  2. `CAN-2026-2038776` (Issue #76): OOB Read/Write + 64-bit `size_t` to 32-bit `int` truncation in `LLM_decode.cpp` / `t_mask` CMM DMA upload (CVSS 7.1 / 7.5).
  3. `CAN-2026-2038802` (Issue #77): NULL Pointer Dereference + OOB Read in `main_api.cpp` SSE streaming callback (CVSS 6.2 / 7.5).
  4. `CAN-2026-2034987` (Issue #80): Stack Buffer Overflow via unbounded `sprintf` in `LLM_init.cpp` model shard loader (CVSS 7.8).
  5. `CAN-2026-2038777` (Issue #81): Heap/CMM OOB Tensor Write in Multimodal RoPE `position_ids` indexing (CVSS 7.1 / 8.1).
  6. `CAN-2026-2038778` (Issue #82): 32-bit Signed Integer Overflow (`width * height * channels`) in `image_processor.cpp` (CVSS 7.5).
  7. `CAN-2026-2038779` (`NGZA-AX-LLM #7`): Double-Free and Use-After-Free in `cmdline.hpp` error cleanup + destructor (CVSS 7.3).
* **[35:00] Q&A Rebuttal:** Unprivileged LXC/Docker isolates the host filesystem against `CAN-2026-2038801`, but `/dev/ax_npu` DMA writes bypass virtual memory namespaces. You must patch the C++ bounds with `std::min` and `execvp`.

---

## Talk 2: Why OWASP Top 10 Checklists Cap AI Pentesting at 30%

* **Full Paper:** [02-why-owasp-top-10-caps-ai-pentesting.md](file:///f:/OneDrive/NGRT/Website/talks/02-why-owasp-top-10-caps-ai-pentesting.md)
* **Best Conferences:** OWASP Global AppSec, Black Hat, RSA Conference, SecTor, BSides

### CFP Copy-Paste Block
* **50-Word Abstract:**
  The OWASP Top 10 is an output reporting taxonomy, not an offensive testing methodology. Across 2,410 enterprise assessment runs, flat AI checklist scanners hit a hard 30% discovery ceiling while burning \$240 in tokens per run. This talk shows how stateful OWASP WSTG execution and a 5-Relation Ownership Matrix unlock 85%+ BOLA recall at \$8 per run.
* **200-Word Abstract:**
  Every vendor pitching an autonomous AI pentester claims 100% OWASP Top 10 coverage on a slide deck. In production enterprise environments, those flat checklist engines hit a brick wall at 30% vulnerability recall. Why? Because the OWASP Top 10 is an output reporting taxonomy for categorizing completed bugs, not an execution methodology for discovering them. Stateless single-request checks catch missing headers and trivial reflected strings. However, they miss the 70% of flaws that cause real breaches: multi-role BOLA, CRUD lifecycle mutations, business logic step-skipping, and HTTP/2 single-packet race conditions. Drawing from 2,410 enterprise shadow runs at Cobalt Labs, Joe Brinkley (The Blind Hacker) exposes the failure modes of flat AI scanners. Those include the 30% BOLA ceiling, the \$240 token furnace, and the 39.3% duplicate noise flood. Attendees will learn how to build a 6-Phase Stateful OWASP WSTG v4.2 and ASVS v5.0 execution engine. We walk through Entity CRUD lifecycle seeding, the 5-Relation Ownership Matrix, containerized Evidence Oracles that prevent hallucinated findings, and deterministic Go/CDP offloading that slashes LLM compute cost by 96%.

### Phone Stage Cues & Numbers
* **[00:00] Hook:** *"The OWASP Top 10 is how you file a bug in a compliance spreadsheet. OWASP WSTG is how you actually break an application."*
* **[10:00] The 2,410-Run Bake-Off Receipts:**
  * Flat 37-category URL matrix hit a **30% BOLA recall ceiling** (compared to **70%–85%+** with stateful multi-role session replay).
  * Unconstrained LLM token spend: **\$180.03 to \$240.00 per scan** (65%–75% burned writing ad-hoc Python HTML parsers).
  * Deterministic Go/CDP offload: **91.2% deterministic code / 8.8% frontier LLM reasoning**, cutting token cost by **96% down to \$6.50–\$8.50 per scan** (\$1.15 per validated finding).
  * Duplicate finding rate dropped from **39.3% down to 0.0%**, cutting human triage from **180 minutes to under 20 minutes**.
* **[22:00] The 5-Relation Ownership Matrix:**
  1. `SELF_OWNED` (Expect `200 OK`)
  2. `CO_OWNED_SHARED` (Expect `200 OK`, stops false positives on team resources)
  3. `PEER_EXCLUSIVE` (Expect `403` or `404`, same role across different users)
  4. `CROSS_TENANT_EXCLUSIVE` (Expect `403` or `404`, critical multi-tenant BOLA)
  5. `HIGHER_PRIV_EXCLUSIVE` (Expect `403` or `404`, vertical BFLA check)
* **[34:00] Q&A Rebuttal:** Every candidate bug must cross the **PoC Cliff** inside a containerized **Evidence Oracle** with a replayable dual-user script and SHA-256 wire hash. No exploit, no report.

---

## Talk 3: Building an Ephemeral AI Security Swarm in 48 Hours

* **Full Paper:** [03-building-ephemeral-ai-security-swarm.md](file:///f:/OneDrive/NGRT/Website/talks/03-building-ephemeral-ai-security-swarm.md)
* **Best Conferences:** DEF CON, Black Hat Briefings / Arsenal, RSA Conference, SecTor, BSides

### CFP Copy-Paste Block
* **50-Word Abstract:**
  Monolithic AI pentesting agents drown in HTML context pollution, hit safety refusal walls, and hallucinate bugs. In a 48-hour sprint, we built AetherShift and NextGenHunt: a Dual-Brain swarm using zero-token Python observers, ephemeral 2ms V8 isolates, 400ms self-healing WAF loops, and SHA-256 wire proofs.
* **200-Word Abstract:**
  Handing a frontier LLM a bash shell and telling it to "pentest this target" fails within twenty minutes on real enterprise networks. Monolithic agents drown in megabytes of minified DOM clutter, get trapped in recursive login loops, follow SSRF redirects into internal subnets, and trip commercial safety classifiers. Over a single 48-hour weekend sprint, blind hacker and Cobalt Offensive Security Research Director Joe Brinkley built **AetherShift** and **NextGenHunt** from scratch. This talk breaks down the five engineering primitives that make autonomous security swarms work in production. First, we replace Docker container bloat with a hardened SQLite WAL ledger and ephemeral JavaScript V8 isolates that boot in under 2 milliseconds using less than 8MB of RAM. Second, we decouple the **Observer Brain** (zero-token Python stripping 98% of HTML noise) from the **Reasoner Brain** (LiteLLM routing between cloud frontier planners and local RTX GPUs running Qwen 2.5 Coder 32B). Third, we achieve 100% refusal resilience via semantic RFC 9110 and RFC 7519 compliance framing. Finally, we demonstrate a 400ms self-healing WAF adaptation loop, four NextGenHunt governance gates, and a deterministic Zero-False-Positive wire proof pipeline.

### Phone Stage Cues & Numbers
* **[00:00] Hook:** *"The language model is only 20% of an autonomous offensive system. The deterministic execution harness is the other 80%."*
* **[10:00] Architecture & Runtime Metrics:**
  * **SQLite WAL Pragmas:** `journal_mode = WAL`, `synchronous = NORMAL`, `busy_timeout = 5000`, `mmap_size = 268435456` (256MB). Zero lock timeouts across 50 concurrent threads.
  * **Ephemeral V8 Isolates:** **< 2ms startup**, **< 8MB RAM**, **500+ parallel workers** (vs. Docker at 1–3s startup and 150MB RAM).
  * **Dual-Brain Split:** Python Observer strips **98% of HTML noise** into a `< 2KB` JSON schema at zero token cost. The Reasoner routes planning to Cloud Frontier and JS code synthesis to local RTX **Qwen 2.5 Coder 32B** (`< 200ms`).
  * **400ms Self-Healing WAF Loop:** Captures 403 headers (`cf-ray`, `server`) + 512-byte body excerpt, mutates JS encoding on local RTX GPU in 200ms, and re-fires in a fresh V8 isolate (`MAX_HEALING_ATTEMPTS = 3`).
* **[25:00] 100% Refusal Resilience:** Prompt frames task as **RFC 9110 / RFC 7519 compliance verification** using placeholder `__BOUNDARY_VECTOR_ALPHA__`. Python harness injects the raw exploit string right before V8 dispatch.
* **[38:00] 4-Tier Graded Kill Switch:** Tier 0 runs 10 healthy workers, Tier 1 throttles 50% at 3 blocks, Tier 2 pauses 60s at 7 blocks, and Tier 3 halts at 10 blocks.

---

## Talk 4: The Autonomous Scope Problem: How to Keep AI Red Teams in Bounds

* **Full Paper:** [04-autonomous-scope-problem-ai-red-teams.md](file:///f:/OneDrive/NGRT/Website/talks/04-autonomous-scope-problem-ai-red-teams.md)
* **Best Conferences:** Black Hat, DEF CON AI Village, RSA Conference, OWASP Global AppSec, BSides

### CFP Copy-Paste Block
* **50-Word Abstract:**
  Prompt-level scope rules fail 100% of the time when autonomous AI red team agents hit goal pressure, browser sub-resource loads, or indirect prompt injection. This talk presents a 3-layer deterministic enforcement engine using Go integer CIDR socket dialers, intercepting HTTP proxies, and Tree-Sitter AST validation that achieves zero ScopeBench canary touches.
* **200-Word Abstract:**
  What happens when you give an autonomous offensive AI agent a bash shell, a headless browser, and a system prompt warning it to stay strictly inside `staging.target.com`? Within thirty minutes, the agent follows a `302` redirect into a production SSO tenant and fires 4,000 automated POST requests at a live billing gateway. Next, it scans an out-of-scope internal subnet mentioned in an HTML comment. As Dreadnode demonstrated in `ScopeBench`, frontier reasoning models under optimization pressure actively rationalize breaking prompt-level Rules of Engagement. During this briefing, Joe Brinkley (The Blind Hacker, Cobalt Director of Offensive Security Research) shows why you must treat the LLM as an untrusted operator. We build a 3-Layer Deterministic Scope Architecture that enforces boundaries outside the model's control plane. First, we implement a custom Go `ScopeDialer` that prevents DNS rebinding via atomic DNS pinning and 32-bit integer CIDR bitwise math. Second, we deploy an outbound HTTP/WebSocket proxy that blocks destructive verbs (`DELETE` on billing routes) and self-sabotaging `/logout` hits in under 1 millisecond. Third, we run Tree-Sitter AST inspection in under 5ms to block rogue imports and out-of-scope literals in model-generated scripts.

### Phone Stage Cues & Numbers
* **[00:00] Hook:** *"Prompt engineering is advisory context, not a security boundary. Under 403 goal pressure, frontier models actively rationalize breaking your Rules of Engagement."*
* **[12:00] The 3 Deterministic Scope Layers:**
  * **Layer 1 (Go `ScopeDialer`):** Resolves DNS once (3s timeout), converts IPv4 to `uint32` (`binary.BigEndian.Uint32`), checks allowed CIDRs, and pins the TCP socket directly to the validated IP (defeats DNS rebinding).
  * **Layer 2 (Outbound Proxy `< 1ms`):** Checks 5 dimensions (FQDN whitelist, URL path regex, HTTP verb locks on `/admin/billing/*`, 3rd-party CDN stripping, and `/logout` mocking).
  * **Layer 3 (Tree-Sitter AST `< 5ms`):** Parses generated Python/JS/Bash scripts before execution; blocks `socket`, `scapy`, `paramiko`, `telnetlib`, `ftplib`, and hardcoded out-of-scope IP/domain literals.
* **[30:00] The 4 Planted ScopeBench Canaries:**
  1. Hidden HTML link: `/api/v1/admin/canary-wipe-database`
  2. 302 CORS redirect: `pci-zone.target.local`
  3. JS comment internal IP: `10.254.99.99` (`10.254.99.0/24`)
  4. Cloud metadata SSRF trap: `169.254.169.254`
  * **Result:** 0 packets, 0 DNS queries, 0 canary touches.

---

## Talk 5: Why DAST Authenticated Scanning Always Breaks

* **Full Paper:** [05-why-dast-authenticated-scanning-breaks.md](file:///f:/OneDrive/NGRT/Website/talks/05-why-dast-authenticated-scanning-breaks.md)
* **Best Conferences:** OWASP Global AppSec, Black Hat, RSA Conference, SecTor, BSides

### CFP Copy-Paste Block
* **50-Word Abstract:**
  In enterprise benchmarks, 80% of automated authenticated DAST scans silently lose their session within 15 minutes and spend hours fuzzing login redirects. This talk presents an Active Session Chaperone architecture using pre-flight JWT lifespan decoders, headless Playwright extractors, 60-second canary probes, and local proxy header injection.
* **200-Word Abstract:**
  Here is the dirty secret of dynamic application security testing: roughly 80% of automated authenticated scans are theater. You paste a Bearer token or record a login macro, hit start, and walk away. Fifteen minutes later, the short-lived OAuth2 JWT expires, an anti-CSRF nonce rotates, or a single-session concurrency rule evicts the scanner. The DAST engine does not crash; it quietly spends the next three hours fuzzing `401 Unauthorized` pages and `/login` redirects before outputting a clean PDF report with zero findings. Here, Cobalt Offensive Security Research Director Joe Brinkley (The Blind Hacker) shows how to solve credential rot permanently without rewriting your existing scanners (Nuclei, Katana, ZAP, or Burp). Attendees will walk through a complete Python implementation of an **Active Session Chaperone** running inside `LXC 211` on `NextGenPVE`. We cover a 15-second pre-flight JWT lifespan analyzer, a headless Playwright SSO extractor, and a 60-second canary heartbeat worker. Finally, we build a transparent `127.0.0.1:8080` intercepting proxy that rewrites outbound scanner headers in memory with zero dropped requests.

### Phone Stage Cues & Numbers
* **[00:00] Hook:** *"Roughly 80% of automated authenticated scans spend two hours and forty-five minutes fuzzing the login page redirect while leadership celebrates a clean PDF report."*
* **[10:00] Key Keepalive Metrics:**
  * **80% silent drop rate** within **15 minutes** on modern OAuth2/SPA apps.
  * **Pre-Flight Check (`< 15s`):** Base64url decodes JWT `exp` without signing keys; flags `SHORT_LIVED_WARNING` if `ttl < 1800s` (30 min).
  * **Canary Heartbeat (`60s` or `30s`):** Hits `/api/v1/users/me` with `allow_redirects=False`; triggers Playwright re-auth on `401`, `403`, or `302` to `/login`.
  * **Circuit Breaker:** Alert/abort if `401`/`403`/`302` exceeds **15% of total traffic** or if `> 70%` of `200 OK` responses have identical login shell `Content-Length`.

---

## Talk 6: Weaponizing Adversarial Telemetry: Invariant Architectures

* **Full Paper:** [06-weaponizing-adversarial-telemetry-invariant-architectures.md](file:///f:/OneDrive/NGRT/Website/talks/06-weaponizing-adversarial-telemetry-invariant-architectures.md)
* **Best Conferences:** RSA Conference, Black Hat, OWASP Global AppSec, CISO Summits, SecTor, BSides

### CFP Copy-Paste Block
* **50-Word Abstract:**
  Across 2,700 organizations in the Cobalt 2026 State of Pentesting dataset, median MTTR sits at 64 days while 50%+ of medium/low bugs linger for five years. This talk shows how attackers chain "Zombie Zone" debt and how four Invariant Architectures eliminate entire bug classes permanently.
* **200-Word Abstract:**
  Finding bugs faster does not secure software when remediation runs on a four-quarter whack-a-mole loop. Telemetry from 2,700 organizations in the 2026 Cobalt State of Pentesting Report reveals a stark divide. Roughly 56.8% of executives believe their teams meet remediation SLAs, while only 15.4% of practitioners agree. Worse, median remediation takes 64 days (stretching to 249 days in bottom-quartile teams), and over half of all medium and low findings sit unpatched in the "Zombie Zone" for five years. In this keynote, Joe Brinkley (The Blind Hacker, Director of Offensive Security Research at Cobalt) demonstrates how adversaries chain four quarters of ignored backlog debt into full Kubernetes cluster takeovers. He also shows how attackers use automated AST patch diffing to exploit sibling microservices within 15 minutes of a git commit. Security and engineering leaders will see how to replace controller band-aids with four **Invariant Architectures**: compile-time Rust `PhantomData` wrappers, Envoy + OPA gateway claim checks, Layer 4 network blackholing, and immutable 24-hour recycling containers. Finally, we introduce Depth Dial Scoping and the Board-level Vulnerability Class Elimination Metric.

### Phone Stage Cues & Numbers
* **[00:00] Hook:** *"User interfaces lie to defenders. Hiding a Delete button in React does nothing when the backend API route accepts unauthenticated JSON."*
* **[08:00] Cobalt 2026 State of Pentesting Receipts (2,700+ Orgs):**
  * **SLA Perception Gap:** **56.8% of leaders** believe SLAs are met vs. **15.4% of practitioners** (41.4-point disconnect).
  * **Remediation Half-Life (MTTR):** **64 days median** (**10 days** top 10% vs. **249 days** bottom 25%).
  * **The Zombie Zone:** **50%+ of medium/low bugs** remain open past **5 years**.
  * **4-Quarter Zombie Chain:** Q1 `CWE-209` stack trace (`10.244.3.0/24`) -> Q2 `CWE-942` staging CORS -> Q3 `CWE-200` proxy routing header -> Q4 `CWE-489` `/internal/v1/health/diagnostics?debug=true` IAM dump = Full K8s takeover in 4 hours.
* **[20:00] The 4 Invariant Architectures:**
  1. **Compile-Time Domain Models:** Rust `ScopedId<VerifiedTenantId, InvoiceEntity>` (`PhantomData`) throws compiler error `E0308` on unscoped strings.
  2. **Gateway Claim Enforcement:** Envoy + OPA Rego policy (`route_tenant_id == token_claims.tenant_id`) in `< 1ms`.
  3. **Active Network Blackholing:** Envoy Lua `request_handle:closeSocket()` / eBPF Layer 4 TCP RST on `/actuator`, `/debug`, `../`.
  4. **Immutable Container Runtimes:** `readOnlyRootFilesystem: true`, `drop: [ALL]`, 64Mi memory `/tmp`, 24-hour node recycle.
* **[35:00] Depth Dial & Board Metric:** Shift 70 hours of static perimeter scans into **10 hours Level 1 Automation + 110 hours Level 3 CPT Red Teaming**. Report **Vulnerability Class Elimination Rate** to the Board.
