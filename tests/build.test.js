const test = require('node:test');
const assert = require('node:assert');
const { parseFrontmatter } = require('../scripts/build-blog.js');

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
