const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { parseFrontmatter } = require('../scripts/build-blog.js');
const { stageDist } = require('../scripts/stage-dist.js');

test('parseFrontmatter correctly parses title, date, and author', () => {
  const content = `---
title: "Test Title"
date: "2026-06-25"
author: "Joe B. The Blind Hacker"
---
# Header
Body content`;
  const { metadata, body } = parseFrontmatter(content);
  assert.strictEqual(metadata.title, 'Test Title');
  assert.strictEqual(metadata.date, '2026-06-25');
  assert.strictEqual(metadata.author, 'Joe B. The Blind Hacker');
  assert.match(body, /# Header/);
});

test('stageDist stages public files while excluding secrets, drafts, and queued posts', () => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ngrt-stage-test-'));

  try {
    fs.mkdirSync(path.join(tmpRoot, 'blog', 'posts'), { recursive: true });
    fs.mkdirSync(path.join(tmpRoot, 'blog', 'queued_posts'), { recursive: true });
    fs.mkdirSync(path.join(tmpRoot, 'tools', 'joebro'), { recursive: true });
    fs.mkdirSync(path.join(tmpRoot, 'assets'), { recursive: true });

    fs.writeFileSync(path.join(tmpRoot, 'index.html'), '<html>home</html>', 'utf8');
    fs.writeFileSync(path.join(tmpRoot, 'assets', 'logo.png'), 'png', 'utf8');
    fs.writeFileSync(path.join(tmpRoot, 'blog', 'post.html'), '<html>post</html>', 'utf8');
    fs.writeFileSync(path.join(tmpRoot, 'blog', 'posts', 'wip.md.draft'), 'draft', 'utf8');
    fs.writeFileSync(path.join(tmpRoot, 'blog', 'queued_posts', 'queued.md'), 'queued', 'utf8');
    fs.writeFileSync(path.join(tmpRoot, 'tools', 'joebro', 'index.html'), '<html>joebro</html>', 'utf8');
    fs.writeFileSync(path.join(tmpRoot, 'tools', 'joebro', 'config.example.json'), '{}', 'utf8');
    fs.writeFileSync(path.join(tmpRoot, 'tools', 'joebro', '.env'), 'SECRET=1', 'utf8');
    fs.writeFileSync(path.join(tmpRoot, 'tools', 'joebro', 'config.json'), '{"token":"secret"}', 'utf8');

    const distDir = path.join(tmpRoot, 'dist');
    const result = stageDist(tmpRoot, distDir);

    assert.strictEqual(result.outDir, distDir);
    assert.strictEqual(fs.existsSync(path.join(distDir, 'index.html')), true);
    assert.strictEqual(fs.existsSync(path.join(distDir, 'assets', 'logo.png')), true);
    assert.strictEqual(fs.existsSync(path.join(distDir, 'blog', 'post.html')), true);
    assert.strictEqual(fs.existsSync(path.join(distDir, 'tools', 'joebro', 'index.html')), true);
    assert.strictEqual(fs.existsSync(path.join(distDir, 'tools', 'joebro', 'config.example.json')), true);

    assert.strictEqual(fs.existsSync(path.join(distDir, 'tools', 'joebro', '.env')), false);
    assert.strictEqual(fs.existsSync(path.join(distDir, 'tools', 'joebro', 'config.json')), false);
    assert.strictEqual(fs.existsSync(path.join(distDir, 'blog', 'posts', 'wip.md.draft')), false);
    assert.strictEqual(fs.existsSync(path.join(distDir, 'blog', 'queued_posts', 'queued.md')), false);
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
});
