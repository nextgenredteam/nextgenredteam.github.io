const fs = require('fs');
const path = require('path');
const { Marked } = require('marked');
const marked = new Marked();

const postsDir = path.join(__dirname, '../blog/posts');
const blogOutputDir = path.join(__dirname, '../blog');

// HTML layout for individual blog posts
function getBlogPostTemplate(title, date, author, description, contentHtml) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} | NextGenRedTeam Blog</title>
  <meta name="description" content="${description}">
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
        <span class="meta-author">// AUTHOR: ${author}</span>
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
      metadata.title || 'Untitled Post',
      metadata.date || 'Undated',
      metadata.author || 'Joe Brinkley',
      metadata.description || '',
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
}

buildBlog();
