const fs = require('fs');
const path = require('path');

const TOP_LEVEL_FILES = [
  'index.html',
  '404.html',
  'index.css',
  'app.js',
  'favicon.ico',
  'robots.txt',
  'sitemap.xml',
  'llms.txt',
  'llms-full.txt',
  '_headers',
  '_redirects'
];

const BLOCKED_EXTENSIONS = /\.(pem|key|secret|secrets)$/i;

/**
 * Determine whether an entry inside `tools/` should be staged for public deployment.
 * @param {string} srcPath - Absolute path to the candidate file or directory.
 * @param {string} resolvedRoot - Resolved repository root path.
 * @returns {boolean} True when the entry is safe to copy into `dist/`.
 */
function shouldIncludeToolEntry(srcPath, resolvedRoot) {
  const name = path.basename(srcPath);
  const lowerName = name.toLowerCase();
  const relPath = path.relative(resolvedRoot, srcPath).split(path.sep).join('/');

  if (lowerName === '__pycache__') {
    return false;
  }
  if (lowerName === '.gitignore' || lowerName === 'checkpoint.md') {
    return false;
  }
  if (lowerName === '.env') {
    return false;
  }
  if (lowerName.startsWith('.env.') && lowerName !== '.env.example') {
    return false;
  }
  if (relPath === 'tools/joebro/config.json') {
    return false;
  }
  if (BLOCKED_EXTENSIONS.test(lowerName)) {
    return false;
  }

  return true;
}

/**
 * Recursively copy a directory while applying an optional inclusion predicate.
 * @param {string} srcDir - Source directory path.
 * @param {string} destDir - Destination directory path.
 * @param {(srcPath: string) => boolean} [filterFn] - Optional filter callback.
 * @returns {number} Count of copied files.
 */
function copyDirectory(srcDir, destDir, filterFn) {
  if (!fs.existsSync(srcDir)) {
    return 0;
  }

  fs.mkdirSync(destDir, { recursive: true });
  const entries = fs.readdirSync(srcDir, { withFileTypes: true });
  let copiedCount = 0;

  for (const entry of entries) {
    const srcEntryPath = path.join(srcDir, entry.name);
    const destEntryPath = path.join(destDir, entry.name);

    if (filterFn && !filterFn(srcEntryPath)) {
      continue;
    }

    if (entry.isDirectory()) {
      copiedCount += copyDirectory(srcEntryPath, destEntryPath, filterFn);
    } else if (entry.isFile()) {
      fs.copyFileSync(srcEntryPath, destEntryPath);
      copiedCount += 1;
    }
  }

  return copiedCount;
}

/**
 * Copy only compiled `.html` files directly under `blog/` (excluding posts/ and queued_posts/).
 * @param {string} blogSrcDir - Source `blog/` directory.
 * @param {string} blogDestDir - Destination `dist/blog/` directory.
 * @returns {number} Count of copied HTML files.
 */
function copyCompiledBlogHtml(blogSrcDir, blogDestDir) {
  if (!fs.existsSync(blogSrcDir)) {
    return 0;
  }

  fs.mkdirSync(blogDestDir, { recursive: true });
  const entries = fs.readdirSync(blogSrcDir, { withFileTypes: true });
  let copiedCount = 0;

  for (const entry of entries) {
    if (!entry.isFile()) {
      continue;
    }
    if (!entry.name.toLowerCase().endsWith('.html')) {
      continue;
    }
    const srcFile = path.join(blogSrcDir, entry.name);
    const destFile = path.join(blogDestDir, entry.name);
    fs.copyFileSync(srcFile, destFile);
    copiedCount += 1;
  }

  return copiedCount;
}

/**
 * Stage clean public static assets into `dist/` for Cloudflare Pages/Workers deployment.
 * @param {string} [rootDir] - Repository root directory.
 * @param {string} [outDir] - Output staging directory (must be strictly inside `rootDir`).
 * @returns {{ outDir: string, fileCount: number }} Staging summary.
 */
function stageDist(rootDir = path.resolve(__dirname, '..'), outDir = path.join(rootDir, 'dist')) {
  if (typeof rootDir !== 'string' || rootDir.trim() === '') {
    throw new TypeError('rootDir must be a non-empty string');
  }
  if (typeof outDir !== 'string' || outDir.trim() === '') {
    throw new TypeError('outDir must be a non-empty string');
  }

  const resolvedRoot = path.resolve(rootDir);
  const resolvedOut = path.resolve(outDir);

  if (!fs.existsSync(resolvedRoot)) {
    throw new Error(`Repository root directory does not exist: ${resolvedRoot}`);
  }

  // Guard against deleting or writing outside the project root (or clobbering root itself).
  const relativeOut = path.relative(resolvedRoot, resolvedOut);
  if (relativeOut === '' || relativeOut.startsWith('..') || path.isAbsolute(relativeOut)) {
    throw new Error(`Unsafe output directory: ${resolvedOut} must be strictly inside ${resolvedRoot}`);
  }

  let fileCount = 0;

  try {
    fs.rmSync(resolvedOut, { recursive: true, force: true });
    fs.mkdirSync(resolvedOut, { recursive: true });

    for (const fileName of TOP_LEVEL_FILES) {
      const srcPath = path.join(resolvedRoot, fileName);
      if (fs.existsSync(srcPath) && fs.statSync(srcPath).isFile()) {
        fs.copyFileSync(srcPath, path.join(resolvedOut, fileName));
        fileCount += 1;
      }
    }

    fileCount += copyDirectory(
      path.join(resolvedRoot, 'assets'),
      path.join(resolvedOut, 'assets')
    );

    fileCount += copyCompiledBlogHtml(
      path.join(resolvedRoot, 'blog'),
      path.join(resolvedOut, 'blog')
    );

    fileCount += copyDirectory(
      path.join(resolvedRoot, 'tools'),
      path.join(resolvedOut, 'tools'),
      (srcPath) => shouldIncludeToolEntry(srcPath, resolvedRoot)
    );

    // Post-copy self-check to guarantee local joebro secrets never reach public output.
    const forbiddenOutputs = [
      path.join(resolvedOut, 'tools', 'joebro', '.env'),
      path.join(resolvedOut, 'tools', 'joebro', 'config.json')
    ];

    for (const forbiddenPath of forbiddenOutputs) {
      if (fs.existsSync(forbiddenPath)) {
        throw new Error(`Security check failed: sensitive file staged at ${forbiddenPath}`);
      }
    }
  } catch (err) {
    throw new Error(`Failed to stage static distribution directory: ${err.message}`, { cause: err });
  }

  return { outDir: resolvedOut, fileCount };
}

if (require.main === module) {
  try {
    const result = stageDist();
    console.log(`Staged ${result.fileCount} public files into ${result.outDir}`);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}

module.exports = { stageDist, shouldIncludeToolEntry };
