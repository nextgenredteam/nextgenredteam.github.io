# NextGenRedTeam Project Rules

## The Golden Writing Rule: Speech-to-Text Cadence
Every blog post must read like I just talked it into a microphone and then did a quick pass to clean up the repeats and typos. That means avoiding stiff, textbook setups. 
* **Write like you speak:** Use varied sentence lengths. Land a point with a short, punchy sentence. Then follow it up with the detailed technical explanation. 
* **Keep AI detection low:** AI detectors trigger on predictable patterns and uniform sentence structures. Bypassing them requires high variance in sentence length, active verbs, and direct phrasing. If a sentence feels like a generic transition, delete it.
* **Banned AI words:** Never use words like "furthermore," "moreover," "pivotal," "revolutionize," "delve," "crucial," or "it's important to remember." Drop the corporate fluff and marketing hype. We are writing for senior security engineers and offensive researchers. Speak to them directly.
* **No Em-Dashes:** Standalone double hyphens (`--`) or long em-dashes (`—`) are banned. Use commas, colons, parentheses, or clean line breaks to separate your clauses.

---

## SEO & AI Search Engine Optimization (LLMO)
We need our posts to be found by humans on search engines and indexed cleanly by AI reasoning engines like Perplexity, Gemini, and ChatGPT.
* **Automatic Schema Injection:** The build script must parse frontmatter and inject JSON-LD structured data into the `<head>` of every post.
  * *TechArticle:* Automatically generated for all posts.
  * *HowTo:* Generated if the frontmatter contains `type: "howto"`. Ensure steps, tools, and prerequisites are mapped cleanly.
* **Auto-generated llms.txt:** Every build must compile a semantic `llms.txt` file at the root. This is a directory of our active research threads, titles, and summaries, formatted so AI crawlers can index the entire lab quickly.
* **Troubleshooting and FAQs:** If a post details a tool setup or a hardware build, you must include a structured troubleshooting section. Frame headings as direct user questions (e.g., *"Why is my Sobro table not connecting to Wi-Fi?"*) to match high-volume organic search queries.

---

## Blog Graphic Rules
* **Always Include a Custom Graphic:** Every new post must have a high-quality, topic-relevant banner image generated via the `generate_image` tool.
* **Save Location:** Store the generated image in the `assets/` directory (e.g., `assets/your_post_name.png`).
* **Embed Placement:** Embed the graphic at the very top of the markdown file, right under the main title header, so the compiler renders it at the start of the HTML page.
* **Default Author details:** Use `author: "Joe B. The Blind Hacker"` in the frontmatter to ensure social links (X/Twitter and LinkedIn) format correctly in the page header.

---

## OpSec and Data Leak Prevention
We do not leak our actual setup configurations, deployment IPs, or API keys.
* **Infrastructure Placeholders:** Always refer to the hypervisor host as `NextGenPVE`. Name containers using their virtual IDs (e.g. `LXC 205`, `LXC 211`, `LXC 210`).
* **IP and Key Placeholders:** Use generic range variables:
  * IP ranges: `<lxc_211_ip>`, `<lxc_210_ip>`, loopback (`127.0.0.1`), or bind-all (`0.0.0.0`).
  * API keys: `sk-gateway-master-key` or `sk-dummy-key`.
