const fs = require('fs');
const path = require('path');
const { Marked } = require('marked');
const marked = new Marked();

const postsDir = path.join(__dirname, '../blog/posts');
const blogOutputDir = path.join(__dirname, '../blog');

// HTML layout for individual blog posts
function getBlogPostTemplate(metadata, slug, contentHtml) {
  const title = metadata.title || 'Untitled Post';
  const date = metadata.date || 'Undated';
  const author = metadata.author || 'Joe Brinkley';
  const description = metadata.description || '';
  const keywords = metadata.keywords || '';

  let displayAuthor = author;
  if (author.includes("Joe B. The Blind Hacker")) {
    displayAuthor = `Joe B. The Blind Hacker 
      <a href="https://x.com/TheBlindHacker" target="_blank" class="social-icon-link" title="X (Twitter)">
        <svg class="social-icon" viewBox="0 0 24 24" width="14" height="14" fill="currentColor" style="display:inline-block; vertical-align:middle; margin-left:6px; color:inherit;"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
      </a>
      <a href="https://www.linkedin.com/in/brinkleyjoseph/" target="_blank" class="social-icon-link" title="LinkedIn">
        <svg class="social-icon" viewBox="0 0 24 24" width="14" height="14" fill="currentColor" style="display:inline-block; vertical-align:middle; margin-left:4px; color:inherit;"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.225 0z"/></svg>
      </a>`;
  }

  // Base Schema: TechArticle
  const schemaList = [
    {
      "@context": "https://schema.org",
      "@type": "TechArticle",
      "headline": title,
      "description": description,
      "datePublished": date,
      "author": {
        "@type": "Person",
        "name": author
      },
      "publisher": {
        "@type": "Organization",
        "name": "NextGenRedTeam",
        "logo": {
          "@type": "ImageObject",
          "url": "https://nextgenredteam.com/assets/logos/logo2.png"
        }
      },
      "mainEntityOfPage": {
        "@type": "WebPage",
        "@id": `https://nextgenredteam.com/blog/${slug}.html`
      }
    }
  ];

  // If howto, inject HowTo schema as well
  if (metadata.type === 'howto') {
    const howToSchema = {
      "@context": "https://schema.org",
      "@type": "HowTo",
      "name": title,
      "description": description,
      "step": []
    };

    if (slug.includes('joebro') || slug.includes('sobro')) {
      howToSchema.step = [
        {
          "@type": "HowToStep",
          "name": "Enable AP Mode",
          "text": "Press and hold the physical power button on the back/underside of your Sobro table until the lights flash to enter Access Point (AP) mode."
        },
        {
          "@type": "HowToStep",
          "name": "Connect to Sobro Hotspot",
          "text": "Open your computer's Wi-Fi menu and connect to the unsecured network broadcasted by the table (usually named Sobro_XXXX)."
        },
        {
          "@type": "HowToStep",
          "name": "Download Handshake Scripts",
          "text": "Get the JoeBro setup provisioning scripts from the NextGenRedTeam GitHub tools repository."
        },
        {
          "@type": "HowToStep",
          "name": "Execute Handshake",
          "text": "Run provision.ps1 (Windows) or provision.sh (Mac/Linux) in your terminal to inject Wi-Fi credentials into the table."
        },
        {
          "@type": "HowToStep",
          "name": "Bind to Cloud Account",
          "text": "Provide your Ayla Networks credentials when prompted by the script to register the table's DSN to your account."
        },
        {
          "@type": "HowToStep",
          "name": "Access Web Controller",
          "text": "Load the JoeBro Web Controller in your browser, log in, and control your smart table."
        }
      ];
    }
    schemaList.push(howToSchema);
  }

  const jsonLdHtml = schemaList.map(s => `  <script type="application/ld+json">\n    ${JSON.stringify(s, null, 2).replace(/\n/g, '\n    ')}\n  </script>`).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} | NextGenRedTeam Blog</title>
  <meta name="description" content="${description}">
  ${keywords ? `<meta name="keywords" content="${keywords}">` : ''}
  <link rel="stylesheet" href="../index.css">
  <link rel="icon" href="../favicon.ico" type="image/x-icon">
  
  <!-- MathJax Math Rendering Support -->
  <script src="https://polyfill.io/v3/polyfill.min.js?features=es6"></script>
  <script id="MathJax-script" async src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"></script>
  
  <!-- Prism.js Tomorrow Night Syntax Highlighting Theme -->
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism-tomorrow.min.css">
  
  <!-- Open Graph -->
  <meta property="og:title" content="${title} | NextGenRedTeam Blog">
  <meta property="og:description" content="${description}">
  <meta property="og:type" content="article">
  <meta property="og:url" content="https://nextgenredteam.com/blog/">
  <meta name="twitter:card" content="summary_large_image">
  
  <!-- SEO JSON-LD Structured Data -->
${jsonLdHtml}
</head>
<body class="blog-post-page">
  <div class="scanlines"></div>
  <div class="noise-overlay"></div>
 
  <!-- Navigation -->
  <nav class="navbar">
    <div class="nav-container">
      <a href="../index.html" class="logo-container" id="logo-link">
        <img src="../assets/logos/logo2.png" id="ngrt-logo" alt="NGRT Logo" class="logo-img">
      </a>
      <div class="nav-links">
        <a href="../index.html#services" class="nav-link">[01] Services</a>
        <a href="../index.html#tools" class="nav-link">[02] Tools</a>
        <a href="index.html" class="nav-link active">[03] Blog</a>
        <a href="../index.html#engage" class="nav-link-btn button">[Collab &amp; Media]</a>
      </div>
      <button class="nav-burger" id="nav-burger" aria-label="Toggle Menu">
        <span></span>
        <span></span>
        <span></span>
      </button>
    </div>
  </nav>
 
  <!-- Article Hero -->
  <header class="post-hero">
    <div class="cyber-container">
      <div class="post-meta">
        <span class="meta-date">// PUBLISHED: ${date}</span>
        <span class="meta-author">// AUTHOR: ${displayAuthor}</span>
      </div>
      <h1 class="post-title">${title}</h1>
      <div class="cyber-divider-cyan"></div>
    </div>
  </header>

  <!-- Article Content -->
  <main class="post-content-section">
    <article class="cyber-container markdown-body">
      ${contentHtml}
      
      <div class="post-footer-cta">
        <div class="cyber-divider-purple"></div>
        <h3>Collaborate on Security Research</h3>
        <p>At NextGenRedTeam, we study adversary TTPs and build open-source tools to help defenders. Let's collaborate on research, media projects, or community initiatives.</p>
        <div class="cta-actions">
          <a href="https://calendar.proton.me/bookings#HVEHryH4oOT8O4hzE1WTkx71-bIihVp1FCAnLpSB-dM=" target="_blank" class="button border-purple">Schedule Collab &amp; Media</a>
          <a href="index.html" class="button border-cyan">Back to Blog</a>
        </div>
      </div>
    </article>
  </main>

  <!-- Footer -->
  <footer class="footer">
    <div class="cyber-container">
      <div class="footer-grid">
        <div class="footer-brand">
          <span class="cyber-glitch-text font-mono">NGRT</span>
          <p class="footer-desc">Independent Threat Emulation Research &amp; Collaborative Defense.</p>
        </div>
        <div class="footer-links">
          <a href="../index.html#services">Services</a>
          <a href="../index.html#tools">GitHub Tools</a>
          <a href="index.html">Threat Lab Blog</a>
        </div>
      </div>
      <div class="footer-bottom">
        <p>&copy; 2026 NextGenRedTeam LLC. All rights reserved. Obfuscated communications active.</p>
      </div>
    </div>
  </footer>

  <script src="../app.js"></script>
  <!-- PrismJS Core and Autoloader Scripts -->
  <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-core.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/plugins/autoloader/prism-autoloader.min.js"></script>
</body>
</html>`;
}

// HTML layout for the blog index page
function getBlogIndexTemplate(postsCardsHtml) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Threat Lab Blog | NextGenRedTeam</title>
  <meta name="description" content="Read tactical cybersecurity insights, IoT reverse-engineering writeups, and AI threat emulation articles from NextGenRedTeam.">
  <link rel="stylesheet" href="../index.css">
  <link rel="icon" href="../favicon.ico" type="image/x-icon">
  <!-- Open Graph -->
  <meta property="og:title" content="Threat Lab Blog | NextGenRedTeam">
  <meta property="og:description" content="Read tactical cybersecurity insights, IoT reverse-engineering writeups, and AI threat emulation articles from NextGenRedTeam.">
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://nextgenredteam.com/blog/">
</head>
<body class="blog-index-page">
  <div class="scanlines"></div>
  <div class="noise-overlay"></div>

  <!-- Navigation -->
  <nav class="navbar">
    <div class="nav-container">
      <a href="../index.html" class="logo-container" id="logo-link">
        <img src="../assets/logos/logo2.png" id="ngrt-logo" alt="NGRT Logo" class="logo-img">
      </a>
      <div class="nav-links">
        <a href="../index.html#services" class="nav-link">[01] Services</a>
        <a href="../index.html#tools" class="nav-link">[02] Tools</a>
        <a href="index.html" class="nav-link active">[03] Blog</a>
        <a href="../index.html#engage" class="nav-link-btn button">[Collab &amp; Media]</a>
      </div>
      <button class="nav-burger" id="nav-burger" aria-label="Toggle Menu">
        <span></span>
        <span></span>
        <span></span>
      </button>
    </div>
  </nav>

  <!-- Header Section -->
  <section class="blog-header">
    <div class="cyber-container">
      <div class="tag">// THREAT LAB RESEARCH</div>
      <h1 class="glitch-title">Intel & Writeups</h1>
      <p class="section-subtitle">Tactical guides, vulnerability deep dives, and thoughts on AI-driven threat emulation operations.</p>
      <div class="cyber-divider-pink"></div>
    </div>
  </section>

  <!-- Blog Grid -->
  <section class="blog-grid-section">
    <div class="cyber-container">
      <div class="blog-grid">
        ${postsCardsHtml || `<div class="no-posts">Initializing blog threads... Check back shortly.</div>`}
      </div>
    </div>
  </section>

  <!-- Footer -->
  <footer class="footer">
    <div class="cyber-container">
      <div class="footer-grid">
        <div class="footer-brand">
          <span class="cyber-glitch-text font-mono">NGRT</span>
          <p class="footer-desc">Independent Threat Emulation Research &amp; Collaborative Defense.</p>
        </div>
        <div class="footer-links">
          <a href="../index.html#services">Services</a>
          <a href="../index.html#tools">GitHub Tools</a>
          <a href="index.html">Threat Lab Blog</a>
        </div>
      </div>
      <div class="footer-bottom">
        <p>&copy; 2026 NextGenRedTeam LLC. All rights reserved. Obfuscated communications active.</p>
      </div>
    </div>
  </footer>

  <script src="../app.js"></script>
</body>
</html>`;
}

// Simple frontmatter parser
function parseFrontmatter(fileContent) {
  const frontmatterRegex = /^---\r?\n([\s\S]*?)\r?\n---/;
  const match = fileContent.match(frontmatterRegex);
  if (!match) return { metadata: {}, body: fileContent };

  const frontmatterText = match[1];
  const body = fileContent.replace(frontmatterRegex, '');
  const metadata = {};

  frontmatterText.split('\n').forEach(line => {
    const index = line.indexOf(':');
    if (index > -1) {
      const key = line.substring(0, index).trim();
      const value = line.substring(index + 1).trim().replace(/^['"]|['"]$/g, '');
      metadata[key] = value;
    }
  });

  return { metadata, body };
}

// Run compilation
function buildBlog() {
  console.log('Compiling NextGenRedTeam Blog Posts...');
  
  if (!fs.existsSync(postsDir)) {
    console.error(`Error: Blog posts directory not found at ${postsDir}`);
    process.exit(1);
  }

  const files = fs.readdirSync(postsDir).filter(f => f.endsWith('.md'));
  const posts = [];

  files.forEach(file => {
    const filePath = path.join(postsDir, file);
    const rawContent = fs.readFileSync(filePath, 'utf8');
    const { metadata, body } = parseFrontmatter(rawContent);
    const htmlContent = marked.parse(body);

    const slug = file.replace('.md', '');
    const outputFileName = `${slug}.html`;
    const outputPath = path.join(blogOutputDir, outputFileName);

    // Save individual post HTML
    const renderedPost = getBlogPostTemplate(
      metadata,
      slug,
      htmlContent
    );
    fs.writeFileSync(outputPath, renderedPost, 'utf8');
    console.log(`- Rendered: blog/${outputFileName}`);

    posts.push({
      slug,
      title: metadata.title || 'Untitled Post',
      date: metadata.date || 'Undated',
      author: metadata.author || 'Joe Brinkley',
      description: metadata.description || '',
      url: `${slug}.html`
    });
  });

  // Sort posts by date descending
  posts.sort((a, b) => new Date(b.date) - new Date(a.date));

  // Generate cards for the index page
  const postsCardsHtml = posts.map((post, postIndex) => {
    // Alternate card border color accents deterministically
    const borderClasses = ['border-pink', 'border-purple', 'border-cyan'];
    const textClasses = ['text-pink', 'text-purple', 'text-cyan'];
    const index = postIndex % 3;
    const accentClass = borderClasses[index];
    const textClass = textClasses[index];

    return `
        <article class="blog-card ${accentClass}">
          <div class="blog-card-meta">
            <span class="meta-date">// ${post.date}</span>
            <span class="meta-author">// BY ${post.author.toUpperCase()}</span>
          </div>
          <h2 class="blog-card-title">${post.title}</h2>
          <p class="blog-card-desc">${post.description}</p>
          <a href="${post.url}" class="blog-card-link ${textClass}">READ_THREAD &gt;</a>
        </article>`;
  }).join('\n');

  // Save blog index HTML
  const renderedIndex = getBlogIndexTemplate(postsCardsHtml);
  fs.writeFileSync(path.join(blogOutputDir, 'index.html'), renderedIndex, 'utf8');
  console.log(`Success! Rendered blog index at blog/index.html`);

  // Generate llms.txt at root for AI engines
  console.log('Generating llms.txt at root...');
  const llmsTxtContent = `# NextGenRedTeam Threat Lab Blog

> High-fidelity threat emulation research, hardware reverse engineering, and offensive AI orchestration.

## Active Research Threads

${posts.map(post => `- [${post.title}](/blog/${post.url}): ${post.description}`).join('\n')}
`;
  fs.writeFileSync(path.join(__dirname, '../llms.txt'), llmsTxtContent, 'utf8');
  console.log(`Success! Generated llms.txt at root.`);
}

if (require.main === module) {
  buildBlog();
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { parseFrontmatter };
}
