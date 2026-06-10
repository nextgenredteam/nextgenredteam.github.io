const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const sourceToolsDir = path.join(__dirname, '../tools/joebro');
const sourceBlogDir = path.join(__dirname, '../blog');

const destBaseDir = path.join(__dirname, '../../NGRT/Website');
const destToolsDir = path.join(destBaseDir, 'tools/joebro');
const destBlogDir = path.join(destBaseDir, 'blog');

console.log("==================================================");
console.log("   JoeBro & Website Repository Synchronizer       ");
console.log("==================================================");

// Helper to recursively copy directories
function copyRecursiveSync(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();
  if (isDirectory) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    fs.readdirSync(src).forEach((childItemName) => {
      copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

// 1. Sync tools/joebro
if (fs.existsSync(destToolsDir)) {
  console.log(`[*] Syncing tools/joebro from ${sourceToolsDir} to ${destToolsDir}...`);
  copyRecursiveSync(sourceToolsDir, destToolsDir);
  console.log("[+] Tools sync complete!");
} else {
  console.error(`[-] Destination directory not found: ${destToolsDir}`);
}

// 2. Sync blog posts & compiled output
if (fs.existsSync(destBlogDir)) {
  console.log(`[*] Syncing blog from ${sourceBlogDir} to ${destBlogDir}...`);
  copyRecursiveSync(sourceBlogDir, destBlogDir);
  console.log("[+] Blog sync complete!");
} else {
  console.error(`[-] Destination directory not found: ${destBlogDir}`);
}

// 3. Git Status & Push (Optional Automation)
try {
  console.log("\n[*] Checking Git repositories...");
  
  // SoBroExploit Git Push
  console.log("\n--- [SoBroExploit Repo Status] ---");
  const sobroStatus = execSync("git status --porcelain", { cwd: path.join(__dirname, '..') }).toString().trim();
  if (sobroStatus) {
    console.log("[!] Uncommitted changes found in SoBroExploit repository.");
  } else {
    console.log("[+] SoBroExploit repository is clean.");
  }

  // Website Git Push
  console.log("\n--- [Website Repo Status] ---");
  const websiteStatus = execSync("git status --porcelain", { cwd: destBaseDir }).toString().trim();
  if (websiteStatus) {
    console.log("[!] Uncommitted changes found in Website repository.");
  } else {
    console.log("[+] Website repository is clean.");
  }
} catch (err) {
  console.log("\n[!] Git check skipped or encountered error:", err.message);
}

console.log("\n==================================================");
console.log("   Done! All assets are fully synchronized.       ");
console.log("==================================================");
