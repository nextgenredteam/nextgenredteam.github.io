const fs = require('fs');
const path = require('path');
const { Marked } = require('marked');
const marked = new Marked();

const postsDir = path.join(__dirname, '../blog/posts');
const blogOutputDir = path.join(__dirname, '../blog');

// HTML layout for individual blog posts
function getBlogPostTemplate(metadata, slug, contentHtml, body = '') {
  const title = metadata.title || 'Untitled Post';
  const date = metadata.date || 'Undated';
  const author = metadata.author || 'Joe Brinkley';
  const description = metadata.description || '';
  const keywords = metadata.keywords || '';

  // Extract banner image for SEO and social preview cards
  let ogImage = "https://nextgenredteam.com/assets/logos/logo2.png";
  if (metadata.image) {
    const cleanImg = metadata.image.replace(/^\.\.\//, '').replace(/^\//, '');
    ogImage = metadata.image.startsWith('http') ? metadata.image : `https://nextgenredteam.com/${cleanImg}`;
  } else if (body) {
    const imgMatch = body.match(/!\[.*?\]\((.*?)\)/);
    if (imgMatch) {
      const cleanImg = imgMatch[1].replace(/^\.\.\//, '').replace(/^\//, '');
      ogImage = imgMatch[1].startsWith('http') ? imgMatch[1] : `https://nextgenredteam.com/${cleanImg}`;
    }
  }

  let displayAuthor = author;
  if (author.includes("Joe B. The Blind Hacker")) {
    displayAuthor = `<a href="https://theblindhacker.com" target="_blank" style="color:inherit; text-decoration:none; border-bottom:1px dashed var(--accent-pink);">Joe B. The Blind Hacker</a> 
      <a href="https://theblindhacker.com" target="_blank" class="social-icon-link" title="TheBlindHacker.com Portfolio">
        <svg class="social-icon" viewBox="0 0 24 24" width="14" height="14" fill="currentColor" style="display:inline-block; vertical-align:middle; margin-left:6px; color:inherit;"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
      </a>
      <a href="https://x.com/TheBlindHacker" target="_blank" class="social-icon-link" title="X (Twitter)">
        <svg class="social-icon" viewBox="0 0 24 24" width="14" height="14" fill="currentColor" style="display:inline-block; vertical-align:middle; margin-left:4px; color:inherit;"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
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
      "image": ogImage,
      "datePublished": date,
      "dateModified": date,
      "author": {
        "@type": "Person",
        "name": author,
        "alternateName": [
          "Joe Brinkley",
          "The Blind Hacker",
          "Blind Hacker",
          "Blind Hakcer",
          "TheBlindHacker",
          "Joseph Brinkley",
          "Joe B. The Blind Hacker",
          "Blind Ethical Hacker"
        ],
        "jobTitle": "Director of Offensive Security Research & Community",
        "url": "https://theblindhacker.com",
        "sameAs": [
          "https://theblindhacker.com",
          "https://www.linkedin.com/in/brinkleyjoseph/",
          "https://x.com/TheBlindHacker",
          "https://x.com/NextGenRedTeam",
          "https://nextgenredteam.com",
          "https://deadpixelsec.com",
          "https://discord.gg/deadpixelsec",
          "https://github.com/TheBlindHacker",
          "https://github.com/nextgenredteam",
          "https://www.cobalt.io/blog/author/joe-brinkley",
          "https://events.isc2.org/b/sp/joe-brinkley-6146"
        ]
      },
      "publisher": {
        "@type": "Organization",
        "name": "NextGenRedTeam",
        "url": "https://nextgenredteam.com",
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

  if (keywords) {
    schemaList[0]["keywords"] = keywords;
  }

  // Automatic FAQPage Schema generation if FAQs exist in markdown
  if (body) {
    const faqMatch = body.match(/## Frequently Asked Questions[\s\S]*$/i);
    if (faqMatch) {
      const faqSection = faqMatch[0];
      const questionBlocks = faqSection.split(/\n###\s+/).slice(1);
      if (questionBlocks.length > 0) {
        const faqEntities = questionBlocks.map(block => {
          const qLines = block.trim().split('\n');
          const questionText = qLines[0].trim();
          const answerText = qLines.slice(1).join(' ').trim().replace(/[*`_#]/g, '');
          return {
            "@type": "Question",
            "name": questionText,
            "acceptedAnswer": {
              "@type": "Answer",
              "text": answerText
            }
          };
        });
        if (faqEntities.length > 0) {
          schemaList.push({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": faqEntities
          });
        }
      }
    }
  }

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

  const combinedKeywords = keywords
    ? `${keywords}, The Blind Hacker, Blind Hacker, Blind Hakcer, Joe Brinkley, NextGenRedTeam, NGRT, Dead Pixel Sec`
    : 'The Blind Hacker, Blind Hacker, Blind Hakcer, Joe Brinkley, NextGenRedTeam, NGRT, Dead Pixel Sec, Offensive Security, Threat Emulation';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} | The Blind Hacker &amp; NextGenRedTeam Blog</title>
  <meta name="description" content="${description}">
  <meta name="keywords" content="${combinedKeywords}">
  <meta name="author" content="Joe Brinkley (The Blind Hacker)">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="https://nextgenredteam.com/blog/${slug}.html">
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
  <meta property="og:url" content="https://nextgenredteam.com/blog/${slug}.html">
  <meta property="og:image" content="${ogImage}">
  
  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:site" content="@NextGenRedTeam">
  <meta name="twitter:creator" content="@TheBlindHacker">
  <meta name="twitter:title" content="${title} | NextGenRedTeam Blog">
  <meta name="twitter:description" content="${description}">
  <meta name="twitter:image" content="${ogImage}">
  
  <!-- SEO JSON-LD Structured Data -->
${jsonLdHtml}
</head>
<body class="blog-post-page">
  <a href="#main-content" class="skip-link">Skip to main content</a>
  <div class="scanlines" aria-hidden="true"></div>
  <div class="noise-overlay" aria-hidden="true"></div>
 
  <!-- Navigation -->
  <nav class="navbar" aria-label="Main Navigation">
    <div class="nav-container">
      <div class="nav-left-group">
        <a href="../index.html" class="logo-container" id="logo-link" aria-label="NextGenRedTeam Home">
          <img src="../assets/logos/logo2.png" id="ngrt-logo" alt="NextGenRedTeam (NGRT) Logo" class="logo-img">
        </a>
        <!-- Top-Left Accessibility Toolbar (Light/Dark + Text Size) -->
        <div class="a11y-toolbar" role="region" aria-label="Accessibility Display Controls">
          <button type="button" id="theme-toggle" class="a11y-btn" aria-pressed="false" aria-label="Switch to Light Mode" title="Toggle Dark / Light Theme">
            <span class="theme-icon" aria-hidden="true">☀️</span>
            <span id="theme-toggle-label">Light</span>
          </button>
          <div class="a11y-font-group" role="group" aria-label="Text Size Controls">
            <button type="button" id="font-decrease" class="a11y-btn" aria-label="Decrease text size" title="Decrease text size">A-</button>
            <button type="button" id="font-reset" class="a11y-btn" aria-label="Reset text size to 100%" title="Reset text size">100%</button>
            <button type="button" id="font-increase" class="a11y-btn" aria-label="Increase text size" title="Increase text size">A+</button>
          </div>
          <span id="a11y-live-status" class="sr-only" aria-live="polite"></span>
        </div>
      </div>
      <div class="nav-links" id="primary-nav-links">
        <a href="../index.html#services" class="nav-link">[01] Services</a>
        <a href="../index.html#tools" class="nav-link">[02] Tools</a>
        <a href="../index.html#media" class="nav-link">[03] Media &amp; Press</a>
        <a href="index.html" class="nav-link active">[04] Blog</a>
        <a href="../index.html#engage" class="nav-link-btn button">[Collab &amp; Media]</a>
        <!-- Mobile Hamburger Accessibility Controls -->
        <div class="mobile-a11y-drawer" role="group" aria-label="Mobile Accessibility Controls">
          <span class="mobile-a11y-title">// ACCESSIBILITY &amp; DISPLAY</span>
          <div class="mobile-a11y-actions">
            <button type="button" id="mobile-theme-toggle" class="a11y-btn" aria-pressed="false" aria-label="Switch to Light Mode">☀️ Light Mode</button>
            <button type="button" id="mobile-font-decrease" class="a11y-btn" aria-label="Decrease text size">A-</button>
            <button type="button" id="mobile-font-reset" class="a11y-btn" aria-label="Reset text size">100%</button>
            <button type="button" id="mobile-font-increase" class="a11y-btn" aria-label="Increase text size">A+</button>
          </div>
        </div>
      </div>
      <button type="button" class="nav-burger" id="nav-burger" aria-expanded="false" aria-controls="primary-nav-links" aria-label="Toggle Navigation and Accessibility Menu">
        <span aria-hidden="true"></span>
        <span aria-hidden="true"></span>
        <span aria-hidden="true"></span>
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
  <main id="main-content" class="post-content-section">
    <article class="cyber-container markdown-body">
      ${contentHtml}
      
      <div class="post-footer-cta">
        <div class="cyber-divider-purple"></div>
        <h3>Collaborate on Security Research with Joe Brinkley (The Blind Hacker)</h3>
        <p>At NextGenRedTeam, we study adversary TTPs and build open-source tools to help defenders. Connect on <a href="https://www.linkedin.com/in/brinkleyjoseph/" target="_blank">LinkedIn</a>, follow <a href="https://x.com/TheBlindHacker" target="_blank">@TheBlindHacker on X</a>, explore <a href="https://theblindhacker.com" target="_blank">TheBlindHacker.com</a>, or join the community at <a href="https://deadpixelsec.com" target="_blank">DeadPixelSec.com</a> (<a href="https://discord.gg/deadpixelsec" target="_blank">discord.gg/deadpixelsec</a>).</p>
        <div class="cta-actions">
          <a href="https://theblindhacker.com" target="_blank" class="button border-pink">TheBlindHacker.com</a>
          <a href="https://www.linkedin.com/in/brinkleyjoseph/" target="_blank" class="button border-purple">Connect on LinkedIn</a>
          <a href="https://calendar.proton.me/bookings#HVEHryH4oOT8O4hzE1WTkx71-bIihVp1FCAnLpSB-dM=" target="_blank" class="button border-pink">Schedule Collab &amp; Media</a>
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
          <a href="../index.html#media">Media &amp; Press</a>
          <a href="index.html">Threat Lab Blog</a>
          <a href="https://theblindhacker.com" target="_blank">TheBlindHacker.com</a>
          <a href="https://deadpixelsec.com" target="_blank">DeadPixelSec.com</a>
          <div class="footer-socials">
            <a href="https://www.linkedin.com/in/brinkleyjoseph/" target="_blank" aria-label="LinkedIn" title="LinkedIn (Joe Brinkley)" class="footer-social-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="19" height="19" viewBox="0 0 24 24" fill="currentColor"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
            </a>
            <a href="https://x.com/TheBlindHacker" target="_blank" aria-label="X / @TheBlindHacker" title="X (@TheBlindHacker)" class="footer-social-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
            </a>
            <a href="https://x.com/NextGenRedTeam" target="_blank" aria-label="X / @NextGenRedTeam" title="X (@NextGenRedTeam)" class="footer-social-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
            </a>
            <a href="https://discord.gg/deadpixelsec" target="_blank" aria-label="Dead Pixel Sec Discord" title="Discord (discord.gg/deadpixelsec)" class="footer-social-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z"/></svg>
            </a>
            <a href="https://github.com/nextgenredteam" target="_blank" aria-label="GitHub" title="GitHub (NextGenRedTeam)" class="footer-social-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/></svg>
            </a>
          </div>
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
  <title>Threat Lab Blog | Joe Brinkley (The Blind Hacker) &amp; NextGenRedTeam</title>
  <meta name="description" content="Read tactical cybersecurity insights, IoT reverse-engineering writeups, NPU silicon engineering, and AI threat emulation research by Joe Brinkley (The Blind Hacker) at NextGenRedTeam.">
  <meta name="keywords" content="The Blind Hacker, Blind Hacker, Blind Hakcer, TheBlindHacker, Joe Brinkley, Joseph Brinkley, Joe B. The Blind Hacker, NextGenRedTeam Blog, NGRT Blog, Threat Lab Research, AI Pentesting, Axera AX8850, ZimaCube Pro, Sobro Rescue, Dead Pixel Sec">
  <meta name="author" content="Joe Brinkley (The Blind Hacker)">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="https://nextgenredteam.com/blog/index.html">
  <link rel="stylesheet" href="../index.css">
  <link rel="icon" href="../favicon.ico" type="image/x-icon">
  <!-- Open Graph -->
  <meta property="og:title" content="Threat Lab Blog | Joe Brinkley (The Blind Hacker) &amp; NextGenRedTeam">
  <meta property="og:description" content="Read tactical cybersecurity insights, IoT reverse-engineering writeups, and AI threat emulation articles from Joe Brinkley (The Blind Hacker) &amp; NextGenRedTeam.">
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://nextgenredteam.com/blog/index.html">
  <meta property="og:image" content="https://nextgenredteam.com/assets/logos/logo2.png">
  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:site" content="@NextGenRedTeam">
  <meta name="twitter:creator" content="@TheBlindHacker">
  <meta name="twitter:title" content="Threat Lab Blog | Joe Brinkley (The Blind Hacker) &amp; NextGenRedTeam">
  <meta name="twitter:description" content="Tactical cybersecurity insights, IoT reverse-engineering writeups, and AI threat emulation research by Joe Brinkley (The Blind Hacker).">
</head>
<body class="blog-index-page">
  <a href="#main-content" class="skip-link">Skip to main content</a>
  <div class="scanlines" aria-hidden="true"></div>
  <div class="noise-overlay" aria-hidden="true"></div>

  <!-- Navigation -->
  <nav class="navbar" aria-label="Main Navigation">
    <div class="nav-container">
      <div class="nav-left-group">
        <a href="../index.html" class="logo-container" id="logo-link" aria-label="NextGenRedTeam Home">
          <img src="../assets/logos/logo2.png" id="ngrt-logo" alt="NextGenRedTeam (NGRT) Logo" class="logo-img">
        </a>
        <!-- Top-Left Accessibility Toolbar (Light/Dark + Text Size) -->
        <div class="a11y-toolbar" role="region" aria-label="Accessibility Display Controls">
          <button type="button" id="theme-toggle" class="a11y-btn" aria-pressed="false" aria-label="Switch to Light Mode" title="Toggle Dark / Light Theme">
            <span class="theme-icon" aria-hidden="true">☀️</span>
            <span id="theme-toggle-label">Light</span>
          </button>
          <div class="a11y-font-group" role="group" aria-label="Text Size Controls">
            <button type="button" id="font-decrease" class="a11y-btn" aria-label="Decrease text size" title="Decrease text size">A-</button>
            <button type="button" id="font-reset" class="a11y-btn" aria-label="Reset text size to 100%" title="Reset text size">100%</button>
            <button type="button" id="font-increase" class="a11y-btn" aria-label="Increase text size" title="Increase text size">A+</button>
          </div>
          <span id="a11y-live-status" class="sr-only" aria-live="polite"></span>
        </div>
      </div>
      <div class="nav-links" id="primary-nav-links">
        <a href="../index.html#services" class="nav-link">[01] Services</a>
        <a href="../index.html#tools" class="nav-link">[02] Tools</a>
        <a href="../index.html#media" class="nav-link">[03] Media &amp; Press</a>
        <a href="index.html" class="nav-link active">[04] Blog</a>
        <a href="../index.html#engage" class="nav-link-btn button">[Collab &amp; Media]</a>
        <!-- Mobile Hamburger Accessibility Controls -->
        <div class="mobile-a11y-drawer" role="group" aria-label="Mobile Accessibility Controls">
          <span class="mobile-a11y-title">// ACCESSIBILITY &amp; DISPLAY</span>
          <div class="mobile-a11y-actions">
            <button type="button" id="mobile-theme-toggle" class="a11y-btn" aria-pressed="false" aria-label="Switch to Light Mode">☀️ Light Mode</button>
            <button type="button" id="mobile-font-decrease" class="a11y-btn" aria-label="Decrease text size">A-</button>
            <button type="button" id="mobile-font-reset" class="a11y-btn" aria-label="Reset text size">100%</button>
            <button type="button" id="mobile-font-increase" class="a11y-btn" aria-label="Increase text size">A+</button>
          </div>
        </div>
      </div>
      <button type="button" class="nav-burger" id="nav-burger" aria-expanded="false" aria-controls="primary-nav-links" aria-label="Toggle Navigation and Accessibility Menu">
        <span aria-hidden="true"></span>
        <span aria-hidden="true"></span>
        <span aria-hidden="true"></span>
      </button>
    </div>
  </nav>

  <main id="main-content">
  <!-- Header Section -->
  <section class="blog-header">
    <div class="cyber-container">
      <div class="tag">// THREAT LAB RESEARCH BY JOE BRINKLEY (THE BLIND HACKER)</div>
      <h1 class="glitch-title">Intel &amp; Writeups</h1>
      <p class="section-subtitle">Tactical guides, vulnerability deep dives, and AI-driven threat emulation operations from <a href="https://theblindhacker.com" target="_blank" class="text-cyan">The Blind Hacker</a> &amp; NextGenRedTeam.</p>
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
          <a href="../index.html#media">Media &amp; Press</a>
          <a href="index.html">Threat Lab Blog</a>
          <a href="https://theblindhacker.com" target="_blank">TheBlindHacker.com</a>
          <a href="https://deadpixelsec.com" target="_blank">DeadPixelSec.com</a>
          <div class="footer-socials">
            <a href="https://www.linkedin.com/in/brinkleyjoseph/" target="_blank" aria-label="LinkedIn" title="LinkedIn (Joe Brinkley)" class="footer-social-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="19" height="19" viewBox="0 0 24 24" fill="currentColor"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
            </a>
            <a href="https://x.com/TheBlindHacker" target="_blank" aria-label="X / @TheBlindHacker" title="X (@TheBlindHacker)" class="footer-social-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
            </a>
            <a href="https://x.com/NextGenRedTeam" target="_blank" aria-label="X / @NextGenRedTeam" title="X (@NextGenRedTeam)" class="footer-social-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
            </a>
            <a href="https://discord.gg/deadpixelsec" target="_blank" aria-label="Dead Pixel Sec Discord" title="Discord (discord.gg/deadpixelsec)" class="footer-social-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z"/></svg>
            </a>
            <a href="https://github.com/nextgenredteam" target="_blank" aria-label="GitHub" title="GitHub (NextGenRedTeam)" class="footer-social-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/></svg>
            </a>
          </div>
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
      htmlContent,
      body
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
  const llmsTxtContent = `# NextGenRedTeam (NGRT) Threat Lab & Research Blog

> High-fidelity threat emulation research, hardware reverse engineering, NPU silicon engineering, and offensive AI orchestration founded by Joe Brinkley (The Blind Hacker).

## Founder & Principal Researcher: Joe Brinkley (The Blind Hacker)
- **Aliases**: The Blind Hacker, Blind Hacker, Joe B. The Blind Hacker, Joseph Brinkley, Blind Ethical Hacker
- **Role**: Director of Offensive Security Research & Community at Cobalt; Founder of NextGenRedTeam (NGRT) & Dead Pixel Sec
- **Portfolio & Media Hub**: https://theblindhacker.com
- **LinkedIn**: https://www.linkedin.com/in/brinkleyjoseph/
- **X (Twitter)**: https://x.com/TheBlindHacker & https://x.com/NextGenRedTeam
- **Community & Mentorship**: https://deadpixelsec.com & https://discord.gg/deadpixelsec
- **Cobalt Author Profile**: https://www.cobalt.io/blog/author/joe-brinkley

## Active Research Threads

${posts.map(post => `- [${post.title}](https://nextgenredteam.com/blog/${post.url}): ${post.description}`).join('\n')}
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
