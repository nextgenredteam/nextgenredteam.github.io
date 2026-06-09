# NextGenRedTeam.com Deployment Guide

This document describes how to deploy the NextGenRedTeam website and the JoeBro table controller tool to **Cloudflare Pages** or **GitHub Pages** for free.

---

## Method 1: Cloudflare Pages (Recommended)

Cloudflare Pages provides global CDN routing, automated deployments on git push, and free SSL certificate management.

### Step 1: Initialize Git and Push to GitHub
1. Create a new repository on GitHub under your account or the `nextgenredteam` organization.
2. Initialize git in the website directory and push the files:
   ```bash
   cd f:\OneDrive\NGRT\Website
   git init
   git add .
   git commit -m "Initial commit of NextGenRedTeam website and JoeBro controller"
   git branch -M main
   git remote add origin https://github.com/nextgenredteam/<your-repo-name>.git
   git push -u origin main
   ```

### Step 2: Connect GitHub to Cloudflare
1. Log into the [Cloudflare Dashboard](https://dash.cloudflare.com/).
2. Navigate to **Workers & Pages** -> **Pages** -> **Create a Project** -> **Connect to Git**.
3. Select your GitHub account and choose the repository you just pushed.
4. Click **Begin setup**.
5. Configure the Build Settings:
   * **Framework preset**: None (Static site)
   * **Build command**: `npm run build`
   * **Build output directory**: `./`
   * *Note: Cloudflare will run the Node script to compile your blog automatically on every push!*
6. Click **Save and Deploy**.

### Step 3: Configure Custom Domain (NextGenRedTeam.com)
1. Once deployed, go to the **Custom Domains** tab on your Cloudflare Pages project.
2. Click **Set up a custom domain** and enter `NextGenRedTeam.com`.
3. Cloudflare will automatically update your DNS records and provision an SSL certificate.

---

## Method 2: GitHub Pages (Alternative)

If you prefer to host directly on GitHub Pages:

### Step 1: Compile the Blog Locally
Before deploying to GitHub Pages, you must build the blog articles locally since GitHub Pages does not run custom build steps automatically:
```bash
npm run build
```

### Step 2: Push Build to GitHub
Push all compiled files (including `/blog/*.html`) directly to the repository:
```bash
git add .
git commit -m "Compile blog posts and prepare for deployment"
git push
```

### Step 3: Enable GitHub Pages
1. Go to your GitHub repository on `github.com`.
2. Click **Settings** -> **Pages** (in the sidebar).
3. Under **Build and deployment**, set the Source to **Deploy from a branch**.
4. Select the `main` branch and `/ (root)` folder, then click **Save**.
5. Under **Custom domain**, type `nextgenredteam.com` and tick **Enforce HTTPS**.
