# Custom Rules for NextGenRedTeam Website

## Blog Generation Rules
* **Always Include a Custom Graphic**: Whenever generating or creating a new blog post, you MUST generate a high-quality, topic-relevant banner image using the `generate_image` tool.
* **Asset Location**: Save the generated image in the `assets/` directory of the website (e.g., `assets/your_post_name.png`).
* **Embed the Graphic**: Embed the generated image at the top of the blog post markdown file right under the main heading so it is rendered in the compiled HTML.
* **Default Author and Socials**: Unless explicitly instructed otherwise, all new blog posts must use `author: "Joe B. The Blind Hacker"` in their frontmatter metadata to automatically format the post headers with social links (X/Twitter and LinkedIn).

