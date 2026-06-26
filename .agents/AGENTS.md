# Custom Rules for NextGenRedTeam Website

## Blog Generation Rules
* **Always Include a Custom Graphic**: Whenever generating or creating a new blog post, you MUST generate a high-quality, topic-relevant banner image using the `generate_image` tool.
* **Asset Location**: Save the generated image in the `assets/` directory of the website (e.g., `assets/your_post_name.png`).
* **Embed the Graphic**: Embed the generated image at the top of the blog post markdown file right under the main heading so it is rendered in the compiled HTML.
* **Default Author and Socials**: Unless explicitly instructed otherwise, all new blog posts must use `author: "Joe B. The Blind Hacker"` in their frontmatter metadata to automatically format the post headers with social links (X/Twitter and LinkedIn).

## Style & Voice Golden Rules
* **Tone**: Write like an experienced Principal Engineer or Offensive Security Researcher addressing peers. Casualty combined with deep professionalism (no corporate fluff, but no internet slang or overly familiar shorthand).
* **Dictation Cadence**: Write with a natural, speech-like flow (as if dictated and cleaned up well afterward). Write more like spoken conversation with varied sentence lengths, avoiding rigid textbook-like sentence constructions.
* **No Em-Dashes**: Never use standalone double hyphens (`--`) or long em-dashes (`—`) to separate clauses or break up sentences. Use commas, colons, or clean line breaks instead.
* **Humanize the Output**: Eliminate typical AI writing markers (e.g. "In today's fast-paced digital landscape," "Moreover," "Furthermore," "Crucial," or "It's important to remember"). Avoid generic hype words or marketing fluff.
* **Formatting**: Use clean markdown bullet points, bolding for emphasis, and structured code blocks or process flows where necessary to make the content instantly scannable.

## Data Leak Prevention Rules
* **No Real IPs, Keys, or System Names**: Never leak real internal/external IP subnets or specific IP addresses (e.g., do not use `192.168.40.x`), private API tokens, or real deployment credentials.
* **Approved Infrastructure Placeholders**: Always refer to the hypervisor host as `NextGenPVE`, and designate containers using their virtual IDs (e.g. `LXC 205`, `LXC 211`, `LXC 210`).
* **Approved API/IP Placeholders**: Use generic documentation variables or safe default ranges:
    *   IP placeholders: `<lxc_211_ip>`, `<lxc_210_ip>`, loopback (`127.0.0.1`), or bind-all (`0.0.0.0`).
    *   API keys/token placeholders: `sk-gateway-master-key` or `sk-dummy-key`.



