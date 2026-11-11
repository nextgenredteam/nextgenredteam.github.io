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

  // Base Schema: TechArticle + BreadcrumbList
  const schemaList = [
    {
      "@context": "https://schema.org",
      "@type": "TechArticle",
      "headline": title,
      "description": description,
      "image": ogImage,
      "datePublished": date,
      "dateModified": date,
      "inLanguage": "en-US",
      "isAccessibleForFree": true,
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
        "worksFor": {
          "@type": "Organization",
          "name": "Cobalt",
          "url": "https://www.cobalt.io"
        },
        "url": "https://theblindhacker.com",
        "sameAs": [
          "https://theblindhacker.com",
          "https://www.linkedin.com/in/brinkleyjoseph/",
          "https://x.com/TheBlindHacker",
          "https://www.youtube.com/@BlindHacker",
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
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "NextGenRedTeam",
          "item": "https://nextgenredteam.com/"
        },
        {
          "@type": "ListItem",
          "position": 2,
          "name": "Threat Lab Blog",
          "item": "https://nextgenredteam.com/blog/index.html"
        },
        {
          "@type": "ListItem",
          "position": 3,
          "name": title,
          "item": `https://nextgenredteam.com/blog/${slug}.html`
        }
      ]
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
  <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1">
  <meta name="googlebot" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1">
  <meta name="bingbot" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1">
  <link rel="canonical" href="https://nextgenredteam.com/blog/${slug}.html">
  <link rel="sitemap" type="application/xml" title="Sitemap" href="https://nextgenredteam.com/sitemap.xml">
  <link rel="alternate" type="text/plain" title="LLMs.txt — AI Research Index" href="https://nextgenredteam.com/llms.txt">
  <link rel="alternate" type="text/plain" title="LLMs-Full.txt — Full AI Corpus" href="https://nextgenredteam.com/llms-full.txt">
  <link rel="author" href="https://theblindhacker.com">
  <link rel="stylesheet" href="../index.css">
  <link rel="icon" href="../favicon.ico" type="image/x-icon">
  
  <!-- MathJax Math Rendering Support -->
  <script src="https://polyfill.io/v3/polyfill.min.js?features=es6"></script>
  <script id="MathJax-script" async src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"></script>
  
  <!-- Prism.js Tomorrow Night Syntax Highlighting Theme -->
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism-tomorrow.min.css">
  
  <!-- Open Graph / Social / Bing & Google Discover -->
  <meta property="og:site_name" content="NextGenRedTeam (NGRT) — The Blind Hacker">
  <meta property="og:locale" content="en_US">
  <meta property="og:title" content="${title} | NextGenRedTeam Blog">
  <meta property="og:description" content="${description}">
  <meta property="og:type" content="article">
  <meta property="og:url" content="https://nextgenredteam.com/blog/${slug}.html">
  <meta property="og:image" content="${ogImage}">
  <meta property="article:published_time" content="${date}">
  <meta property="article:modified_time" content="${date}">
  <meta property="article:author" content="https://theblindhacker.com">
  <meta property="article:section" content="Offensive Security &amp; AI Research">
  
  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:site" content="@TheBlindHacker">
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
            <a href="https://www.youtube.com/@BlindHacker" target="_blank" aria-label="YouTube / @BlindHacker" title="YouTube (@BlindHacker)" class="footer-social-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
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
function getBlogIndexTemplate(postsCardsHtml, posts = []) {
  const blogSchema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Blog",
        "@id": "https://nextgenredteam.com/blog/index.html#blog",
        "name": "NextGenRedTeam Threat Lab Blog",
        "description": "Tactical cybersecurity insights, IoT reverse-engineering writeups, NPU silicon engineering, 500-WPM accessible CLI blueprints, and AI threat emulation research by Joe Brinkley (The Blind Hacker).",
        "url": "https://nextgenredteam.com/blog/index.html",
        "inLanguage": "en-US",
        "author": {
          "@type": "Person",
          "name": "Joe Brinkley",
          "alternateName": ["The Blind Hacker", "Joe B. The Blind Hacker", "Blind Hacker"],
          "url": "https://theblindhacker.com"
        },
        "publisher": {
          "@type": "Organization",
          "name": "NextGenRedTeam LLC",
          "url": "https://nextgenredteam.com"
        },
        "blogPost": posts.map(p => ({
          "@type": "BlogPosting",
          "headline": p.title,
          "description": p.description,
          "datePublished": p.date,
          "url": `https://nextgenredteam.com/blog/${p.url}`,
          "author": {
            "@type": "Person",
            "name": "Joe Brinkley (The Blind Hacker)",
            "url": "https://theblindhacker.com"
          }
        }))
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "NextGenRedTeam",
            "item": "https://nextgenredteam.com/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Threat Lab Blog",
            "item": "https://nextgenredteam.com/blog/index.html"
          }
        ]
      }
    ]
  };

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Threat Lab Blog | Joe Brinkley (The Blind Hacker) &amp; NextGenRedTeam</title>
  <meta name="description" content="Read tactical cybersecurity insights, IoT reverse-engineering writeups, NPU silicon engineering, and AI threat emulation research by Joe Brinkley (The Blind Hacker) at NextGenRedTeam.">
  <meta name="keywords" content="The Blind Hacker, Blind Hacker, Blind Hakcer, TheBlindHacker, Joe Brinkley, Joseph Brinkley, Joe B. The Blind Hacker, NextGenRedTeam Blog, NGRT Blog, Threat Lab Research, AI Pentesting, Axera AX8850, AX-LLM CVEs, ZimaCube Pro, Sobro Rescue, Dead Pixel Sec">
  <meta name="author" content="Joe Brinkley (The Blind Hacker)">
  <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1">
  <meta name="googlebot" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1">
  <meta name="bingbot" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1">
  <link rel="canonical" href="https://nextgenredteam.com/blog/index.html">
  <link rel="sitemap" type="application/xml" title="Sitemap" href="https://nextgenredteam.com/sitemap.xml">
  <link rel="alternate" type="text/plain" title="LLMs.txt — AI Research Index" href="https://nextgenredteam.com/llms.txt">
  <link rel="alternate" type="text/plain" title="LLMs-Full.txt — Full AI Corpus" href="https://nextgenredteam.com/llms-full.txt">
  <link rel="author" href="https://theblindhacker.com">
  <link rel="stylesheet" href="../index.css">
  <link rel="icon" href="../favicon.ico" type="image/x-icon">
  <!-- Open Graph -->
  <meta property="og:site_name" content="NextGenRedTeam (NGRT) — The Blind Hacker">
  <meta property="og:locale" content="en_US">
  <meta property="og:title" content="Threat Lab Blog | Joe Brinkley (The Blind Hacker) &amp; NextGenRedTeam">
  <meta property="og:description" content="Read tactical cybersecurity insights, IoT reverse-engineering writeups, and AI threat emulation articles from Joe Brinkley (The Blind Hacker) &amp; NextGenRedTeam.">
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://nextgenredteam.com/blog/index.html">
  <meta property="og:image" content="https://nextgenredteam.com/assets/logos/logo2.png">
  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:site" content="@TheBlindHacker">
  <meta name="twitter:creator" content="@TheBlindHacker">
  <meta name="twitter:title" content="Threat Lab Blog | Joe Brinkley (The Blind Hacker) &amp; NextGenRedTeam">
  <meta name="twitter:description" content="Tactical cybersecurity insights, IoT reverse-engineering writeups, and AI threat emulation research by Joe Brinkley (The Blind Hacker).">
  <!-- SEO JSON-LD Structured Data -->
  <script type="application/ld+json">
    ${JSON.stringify(blogSchema, null, 2).replace(/\n/g, '\n    ')}
  </script>
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
            <a href="https://www.youtube.com/@BlindHacker" target="_blank" aria-label="YouTube / @BlindHacker" title="YouTube (@BlindHacker)" class="footer-social-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
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
      keywords: metadata.keywords || '',
      url: `${slug}.html`,
      body: body.trim()
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
            <span class="meta-author">// BY <a href="https://theblindhacker.com" target="_blank" rel="noopener" style="color:inherit; text-decoration:none; border-bottom:1px dashed currentColor;">${post.author.toUpperCase()}</a></span>
          </div>
          <h2 class="blog-card-title">${post.title}</h2>
          <p class="blog-card-desc">${post.description}</p>
          <a href="${post.url}" class="blog-card-link ${textClass}">READ_THREAD &gt;</a>
        </article>`;
  }).join('\n');

  // Save blog index HTML
  const renderedIndex = getBlogIndexTemplate(postsCardsHtml, posts);
  fs.writeFileSync(path.join(blogOutputDir, 'index.html'), renderedIndex, 'utf8');
  console.log(`Success! Rendered blog index at blog/index.html`);

  // Generate llms.txt at root for AI engines
  console.log('Generating llms.txt and llms-full.txt at root...');
  const latestDate = posts.length > 0 ? posts[0].date : '2026-11-01';
  const llmsTxtContent = `# NextGenRedTeam (NGRT) Threat Lab & Research Blog

> High-fidelity threat emulation research, hardware reverse engineering, NPU silicon engineering, 500-WPM accessible CLI/PWA tooling, and offensive AI orchestration founded by Joe Brinkley (The Blind Hacker).

## Founder & Principal Researcher: Joe Brinkley (The Blind Hacker)
- **Aliases**: The Blind Hacker, Blind Hacker, Blind Hakcer, Joe B. The Blind Hacker, Joseph Brinkley, Blind Ethical Hacker
- **Role**: Director of Offensive Security Research & Community at Cobalt; Founder of NextGenRedTeam (NGRT) & Dead Pixel Sec
- **Portfolio & Media Hub**: https://theblindhacker.com
- **The Blind Hacker Projects**: https://theblindhacker.com/projects
- **Press, Keynotes & Media Archive**: https://theblindhacker.com/profiles
- **Hacking While Blind CLI Guide**: https://theblindhacker.com/hackingwhileblind
- **TheBlindHacker AI Context**: https://theblindhacker.com/llms.txt & https://theblindhacker.com/llms-full.txt
- **Full NGRT Corpus for AI Ingestion**: https://nextgenredteam.com/llms-full.txt
- **XML Sitemap**: https://nextgenredteam.com/sitemap.xml
- **LinkedIn**: https://www.linkedin.com/in/brinkleyjoseph/
- **X (Twitter)**: https://x.com/TheBlindHacker
- **YouTube**: https://www.youtube.com/@BlindHacker
- **Community & Mentorship**: https://deadpixelsec.com & https://discord.gg/deadpixelsec
- **Cobalt Author Profile**: https://www.cobalt.io/blog/author/joe-brinkley
- **GitHub Organizations**: https://github.com/nextgenredteam & https://github.com/TheBlindHacker

## Coordinated Vulnerability Disclosures (Edge AI / NPU Silicon, MITRE CVE Candidates)
- **CAN-2026-2038801 (GitHub Issue #75 / NGZA-AX-LLM #1)**: Unauthenticated OS Command Injection in Audio Preprocessing in AXERA-TECH AX-LLM (\`src/runner/utils/audio_processor.cpp\` / \`AudioWrapper.hpp\`, CVSS 8.4 High)
- **CAN-2026-2038776 (GitHub Issue #76 / NGZA-AX-LLM #2)**: Out-of-Bounds Read + Integer Truncation in Prompt Prefill & CMM DMA Mask in AXERA-TECH AX-LLM (\`src/runner/LLM.hpp\`, CVSS 7.5 High)
- **CAN-2026-2038802 (GitHub Issue #77 / NGZA-AX-LLM #3)**: NULL Pointer Dereference & Out-of-Bounds Read in Token Streaming Callback in AXERA-TECH AX-LLM (\`src/main_api.cpp\`, CVSS 7.5 High)
- **CAN-2026-2034987 (GitHub Issue #80 / NGZA-AX-LLM #4)**: Stack-Based Buffer Overflow in Layer Filename Formatting in AXERA-TECH AX-LLM (\`src/runner/LLM.hpp\`, CVSS 7.8 High)
- **CAN-2026-2038777 (GitHub Issue #81 / NGZA-AX-LLM #5)**: Heap Out-of-Bounds Write in Multimodal RoPE Position Indexing in AXERA-TECH AX-LLM (\`src/runner/LLM.hpp\`, CVSS 8.1 High)
- **CAN-2026-2038778 (GitHub Issue #82 / NGZA-AX-LLM #6)**: Integer Overflow in Multimodal Vision Preprocessing in AXERA-TECH AX-LLM (\`src/runner/utils/image_processor.cpp\`, CVSS 7.5 High)
- **CAN-2026-2038779 (NGZA-AX-LLM #7)**: Double-Free & Use-After-Free in CLI Argument Error Handling in AXERA-TECH AX-LLM (\`src/cmdline.hpp\`, CVSS 7.3 High)
- **Enterprise Advisory (Cobalt)**: https://www.cobalt.io/blog/dissecting-the-ax-llm-cves-why-edge-ai-memory-and-execution-boundaries-matter
- **Hardware Lab Reproduction Walkthrough (NGRT)**: https://nextgenredteam.com/blog/hunting-edge-ai-cves-from-demo-code-to-dma-memory-corruption.html

## Open-Source Tools & Hardware Rescues
- [JoeBro Sobro Smart Table PWA Controller](https://nextgenredteam.com/tools/joebro/index.html): Zero-backend Progressive Web App restoring local and cloud control to bricked Sobro Smart Coffee Tables.
- [EventID4625 Windows Logon Failure Emulator](https://github.com/nextgenredteam/nextgenredteam.github.io/tree/main/tools): Cross-platform Go, Python, PowerShell, and Bash adversary emulator for Windows Security Event ID 4625.
- [LinuxLoginFailure SSH Telemetry Emulator](https://github.com/nextgenredteam/nextgenredteam.github.io/tree/main/tools): Multi-language SSH authentication failure generator for SIEM validation.

## Featured Press & Expert Commentary (Joe Brinkley / The Blind Hacker)
- [Binance Heist Is Stark Example of AI Governance Gaps and Basic Security Failures (CSO Online, Nov 2026)](https://www.csoonline.com/article/4245354/binance-heist-is-stark-example-of-ai-governance-gaps-and-basic-security-failures.html)
- [CISA Confirms Exploitation of WordPress Core Upgrade Flaw (eSecurity Planet, Nov 2026)](https://www.esecurityplanet.com/threats/news-cisa-wordpress-core-upgrade-flaw/)
- [CISO Thought He Had a 'r3@lg00dp@$$w0rd' But Forgot to Patch (The Register, Oct 2026)](https://www.theregister.com/security/2026/10/01/ciso-thought-he-had-a-r3lg00dpw0rd-but-forgot-to-patch/5300314)
- [EU Cyber Resilience Act 'Completely Kills' Manual Vulnerability Triage (CSO Online, Oct 2026)](https://www.csoonline.com/article/4229824/eu-cyber-resilience-act-completely-kills-manual-vulnerability-triage.html)
- [Law Firm CISO's 'r3@lg00dp@$w0rd' Exposed After BlueKeep Patch Failure (LavX News, Oct 2026)](https://news.lavx.hu/article/law-firm-ciso-s-r3-lg00dp-w0rd-exposed-after-bluekeep-patch-failure)
- [Why Your Annual Pentest Is a Liability: Closing the Exposure Window (DEVOPSdigest, Oct 2026)](https://www.devopsdigest.com/why-your-annual-pentest-liability-closing-exposure-window)
- [The CyberWire Daily Briefing #2650: BlueKeep & Executive Boardroom Exposure (The CyberWire, Oct 2026)](https://thecyberwire.com/podcasts/daily-podcast/2650/transcript)
- [Stolen AI Credentials Feed Growing LLM Proxy Economy (CSO Online, Sep 2026)](https://www.csoonline.com/article/4227199/stolen-ai-credentials-feed-growing-llm-proxy-economy.html)
- [Government Contractor Exposed Path to 50M Immigration Records (The Register, Sep 2026)](https://www.theregister.com/security/2026/09/24/government-contractor-exposed-path-to-immigration-records/5298689)
- [US Intelligence Agencies Warn China Is Engaging in 'Industrial Scale' AI Distillation Campaigns (CPO Magazine, Sep 2026)](https://www.cpomagazine.com/cyber-security/us-intelligence-agencies-warn-china-is-engaging-in-industrial-scale-ai-distillation-campaigns/)
- [Security Leaders' Rogue AI Confidence Could Actually Be Disastrous (CSO Online, Jul 2026)](https://www.csoonline.com/article/4198038/security-leaders-confident-but-cooked-when-it-comes-to-rogue-ai-agents.html)
- [IT Leaders Confident But Cooked When It Comes to Rogue AI Agents (CIO.com, Jul 2026)](https://www.cio.com/article/4198035/it-leaders-confident-but-cooked-when-it-comes-to-rogue-ai-agents.html)
- [Lateral Movement Risk Rises as Enterprises Emphasize Convenience Over Containment (CSO Online, Jul 2026)](https://www.csoonline.com/article/4194708/lateral-movement-risk-rises-as-enterprises-emphasize-convenience-over-containment.html)
- [Companies Keep Bolting AI Onto Their Products and the Security Bill Is Coming Due (Help Net Security, Jun 2026)](https://www.helpnetsecurity.com/2026/06/29/products-ai-pentesting/)
- [Discovery Is Cheap, Validation Is Expensive: Managing AI Vulnerabilities (Cybernews, May 2026)](https://cybernews.com/ai-news/security-experts-bugs-managing-not-fixing-ai-mythos-vulnerabilities/)
- [New Linux Privilege Escalation Flaw 'Fragnesia' Disclosed (SC Media, May 2026)](https://www.scworld.com/news/new-linux-privilege-escalation-flaw-fragnesia-disclosed-poc-available)
- [Pack2TheRoot: 12-Year-Old Linux PackageKit Flaw Enables Full Compromise (Hackread, May 2026)](https://hackread.com/pack2theroot-linux-packagekit-flaw-full-compromise/)
- [Bank Regulator Sounds Warning Over Cybersecurity Threat Posed by AI Models (CSO Online, May 2026)](https://www.csoonline.com/article/4165751/bank-regulator-sounds-warning-over-cybersecurity-threat-posed-by-ai-models.html)
- [PTaaS Ranked 4x More Effective Than Bug Bounties for Uncovering Complex Vulnerabilities (Business Wire, Mar 2026)](https://www.businesswire.com/news/home/20260305698671/en/PTaaS-Ranked-4x-More-Effective-Than-Bug-Bounties-for-Uncovering-Complex-Vulnerabilities-Cobalt-Report-Finds)
- [SolarWinds RCE Bug Makes CISA List as Exploitation Spreads (Computer Weekly, Feb 2026)](https://www.computerweekly.com/news/366638837/SolarWinds-RCE-bug-makes-Cisa-list-as-exploitation-spreads)
- [SolarWinds Web Help Desk Users Under Threat as Vulnerability Actively Exploited (Cybernews, Feb 2026)](https://cybernews.com/security/solarwinds-web-help-desk-vulnerability-exploited/)
- [The CVE System Isn't Working: What's Next? (ITPro, Feb 2026)](https://www.itpro.com/security/the-cve-system-isnt-working-what-next)
- [n8n Patches 2 CVSS 10.0 Vulnerabilities That Could Lead to RCE (SC Media, Jan 2026)](https://www.scworld.com/news/n8n-patches-2-cvss-10-0-vulnerabilities-that-could-lead-to-rce)
- [Cobalt Names Joseph Brinkley Head of Offensive Security Research and Community (Business Wire, Dec 2025)](https://www.businesswire.com/news/home/20251208806173/en/Cobalt-Names-Joseph-Brinkley-Head-of-Offensive-Security-Research-and-Community)
- [Cobalt Director of Offensive Security Research & Community Joins DEVOPSdigest Vendor Forum](https://www.devopsdigest.com/cobalt-director-offensive-security-research-community-cobalt-has-joined-vendor-forum)
- [The AI Pentesting Pulse: Decoding the 2.7x Risk Multiplier in LLM Deployments (Cobalt Research)](https://www.cobalt.io/blog/the-ai-pentesting-pulse-decoding-the-2.7x-risk-multiplier-in-llm-deployments)
- [New Cobalt Research: Navigating 2026's Nation-State and Supply Chain Threats](https://www.cobalt.io/blog/new-cobalt-research-navigating-2026s-nation-state-and-supply-chain-threats)
- [Moving from Annual VAPT to CTEM (Cobalt Research)](https://www.cobalt.io/blog/moving-from-annual-vapt-to-ctem)

## Podcasts, Video Interviews & Conference Talks (Joe Brinkley / Joe B / The Blind Hacker)
- [ISC2 Spotlight & Cobalt On-Demand Webcast (Jul 2026): Inside the 2.7x Problem: Vulnerability Discovery Is No Longer the Bottleneck](https://resource.cobalt.io/inside-the-27x-problem-vulnerability-discovery-is-no-longer-the-bottleneck)
- [Cobalt AI Security Webcast (Mar 2026): A Hacker and a CISO on Closing the AI Security Gap in 2026 (YouTube)](https://www.youtube.com/watch?v=W6tXFEzJ1Pk)
- [Ultimate IT Security (UITS) 90-Minute Hands-On Masterclass (Feb 2026): Live, Hands-on Deep-Dive into LLM Hacking: Prompt Injection, MCP & Skills (YouTube)](https://www.youtube.com/watch?v=Q8GMDospLcM)
- [Ultimate IT Security (UITS) Webinar Event Page (Feb 2026): Live, Hands-on Deep-Dive into LLM Hacking](https://www.ultimatewindowssecurity.com/webinars/register.aspx?id=3792)
- [Simply Offensive Podcast (Phillip Wylie / Suzu Labs, Jan 2026): Community, Burnout, and Leveling Up in Offensive Security with Joe Brinkley (YouTube)](https://www.youtube.com/watch?v=0ld1zdslwcE)
- [OnDefend BlindSPOT Attack Simulation & Defense Optimization: Linux Edition (YouTube)](https://www.youtube.com/watch?v=_YbFP5awVNI)
- [GRIMMCon 0x2 (Jul 2020): CyberPhunk2020: How to Kick Off Your Cyber Journey by Joe Brinkley TheBlindHacker (YouTube)](https://www.youtube.com/watch?v=iTQz5PT3d4o)
- [Jupiter Broadcasting: Jupiter Extras #24 (Oct 2019): Our Trip To Texas Cyber Summit](https://extras.show/24)
- [The Phillip Wylie Show (Sep 2024): Joe Brinkley aka The Blind Hacker (Spotify)](https://open.spotify.com/episode/47pheKc8D4kbO4DgFxqjyH)
- [The Phillip Wylie Show (Sep 2024): Joe Brinkley aka The Blind Hacker (YouTube)](https://www.youtube.com/watch?v=qhS6Q-_9iEs)
- [The Phillip Wylie Show Official Show Notes: Joe Brinkley aka The Blind Hacker (The Hacker Maker)](https://thehackermaker.com/joe-brinkley-aka-the-blind-hacker/)
- [The Hacker Factory Podcast (ITSPmagazine): Overcoming Obstacles To Become A Pentester with Joe "The Blind Hacker" Brinkley (YouTube)](https://www.youtube.com/watch?v=-NHv-eX-6Bs)
- [The Mindful Business Security Show: How to Start a Business Part 1 with Joe Brinkley (YouTube)](https://www.youtube.com/watch?v=4uevOawJF8k)
- [The Mindful Business Security Show: How to Start a Business Part 2 with Joe Brinkley (YouTube)](https://www.youtube.com/watch?v=EOIxj-udEUE)
- [The Mindful Business Security Show: How to Start a Business Part 3 with Joe Brinkley (YouTube)](https://www.youtube.com/watch?v=NfywOkq1-pU)
- [The Mindful Business Security Show: How to Start a Business Part 5 with Joe Brinkley (Apple Podcasts)](https://podcasts.apple.com/us/podcast/special-episode-how-to-start-a-business-part-5/id1632777835?i=1000680959332)
- [Security and Compliance Weekly (SCW #26): Cyber and Disabilities Pt. 1 with Joe Brinkley (YouTube)](https://www.youtube.com/watch?v=lrEYtEzsXD0)
- [Security and Compliance Weekly (SCW #26): Cyber and Disabilities Pt. 2 with Joe Brinkley (YouTube)](https://www.youtube.com/watch?v=cB5sfhtxcLE)
- [Security and Compliance Weekly (SCW #26): Cyber and Disabilities Pt. 1 & Pt. 2 (SC Media Podcast)](https://www.scworld.com/podcast-segment/8316-cyber-and-disabilities-pt-1-joe-brinkley-scw-26)
- [DerbyCon 9.0 (Stable 21): Hacking While Blind by Joe B / TheBlindHacker (YouTube)](https://www.youtube.com/watch?v=TmDMh3g2mps)
- [DerbyCon Interview Series: The Blind Hacker, Joe B. by Joe Gray (Medium)](https://medium.com/@_C_3PJoe/derbycon-interview-series-the-blind-hacker-joe-b-453b7518fb7d)
- [Cyber Bunee Interview with The Blind Hacker (YouTube)](https://www.youtube.com/watch?v=KOeWU62Ts4Y)
- [Security BSides Delaware 2020: Hacking Your Way Into the CyberSec Industry by TheBlindHacker (YouTube)](https://www.youtube.com/watch?v=6UPT8OIHM2E)
- [Just Hacking Training Instructor & Author Profile: Joe Brinkley](https://www.justhacking.com/author/joe_brinkley/)
- [ISC2 Spotlight Speaker Profile: Joe Brinkley](https://events.isc2.org/b/sp/joe-brinkley-6146)
- [Live Hacking Stream: @TheBlindHacker on Twitch](https://www.twitch.tv/theblindhacker)

## Active Research Threads (${posts.length} Published Posts)

${posts.map(post => `- [${post.title}](https://nextgenredteam.com/blog/${post.url}) (${post.date}): ${post.description}`).join('\n')}
`;
  fs.writeFileSync(path.join(__dirname, '../llms.txt'), llmsTxtContent, 'utf8');
  console.log(`Success! Generated llms.txt at root.`);

  // Generate llms-full.txt at root containing the full corpus for deep AI/LLM indexing
  const llmsFullContent = `${llmsTxtContent}
---

# Full Technical Research Corpus (NextGenRedTeam & The Blind Hacker)

${posts.map(post => `================================================================================
TITLE: ${post.title}
URL: https://nextgenredteam.com/blog/${post.url}
DATE: ${post.date}
AUTHOR: ${post.author} (https://theblindhacker.com)
DESCRIPTION: ${post.description}
KEYWORDS: ${post.keywords}
================================================================================

${post.body}
`).join('\n\n')}
`;
  fs.writeFileSync(path.join(__dirname, '../llms-full.txt'), llmsFullContent, 'utf8');
  console.log(`Success! Generated llms-full.txt at root.`);

  // Generate sitemap.xml at root for Google, Bing, and AI Search Engines
  console.log('Generating sitemap.xml at root...');
  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://nextgenredteam.com/</loc>
    <lastmod>${latestDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://nextgenredteam.com/blog/index.html</loc>
    <lastmod>${latestDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.95</priority>
  </url>
  <url>
    <loc>https://nextgenredteam.com/tools/joebro/index.html</loc>
    <lastmod>${latestDate}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.85</priority>
  </url>
  <url>
    <loc>https://nextgenredteam.com/llms.txt</loc>
    <lastmod>${latestDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.80</priority>
  </url>
  <url>
    <loc>https://nextgenredteam.com/llms-full.txt</loc>
    <lastmod>${latestDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.80</priority>
  </url>
${posts.map(post => `  <url>
    <loc>https://nextgenredteam.com/blog/${post.url}</loc>
    <lastmod>${post.date}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.90</priority>
  </url>`).join('\n')}
</urlset>
`;
  fs.writeFileSync(path.join(__dirname, '../sitemap.xml'), sitemapXml, 'utf8');
  console.log(`Success! Generated sitemap.xml at root.`);
}

if (require.main === module) {
  buildBlog();
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { parseFrontmatter };
}
