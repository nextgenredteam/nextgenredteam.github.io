# Plan 004: Add automated verification test suite

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm the expected result before moving to the next step. If anything in the "STOP conditions" section occurs, stop and report — do not improvise. When done, update the status row for this plan in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat e5cda6e..HEAD -- package.json`
> If package.json changed since this plan was written, compare target lines before proceeding.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: LOW
- **Depends on**: None
- **Category**: tests
- **Planned at**: commit `e5cda6e`, 2026-06-25

## Why this matters

The repository lacks any automated testing suite. Gaps or regressions in the blog builder script (`scripts/build-blog.js`)—such as failing to parse frontmatter or generating broken index pages—must currently be caught manually. Adding a lightweight, zero-dependency testing script using Node's native test runner (`node --test`) provides an automated gate to ensure that the template parsing, metadata extraction, and HTML outputs are correct.

## Current state

- Relevant files:
  - `package.json` — contains script definitions.
  - `scripts/build-blog.js` — handles blog compilation (specifically `parseFrontmatter` and HTML generation).

## Scope

**In scope**:
- `package.json` (add test script)
- `tests/build.test.js` (create new test file)

**Out of scope**:
- Importing third-party testing frameworks (like Jest or Mocha). We will use Node's native `node:test` and `node:assert` modules.

## Git workflow

- Branch: `advisor/004-add-test-suite`
- Commit message: `test: Add automated test suite for blog build verification using native node runner`

## Steps

### Step 1: Add a test script to package.json

Open `package.json` and add `"test": "node --test tests/"` to the `"scripts"` block.

**Verify**:
Run the test command:
```bash
npm run test
```
(Expected: exits with 0 or fails with "no test files found", not "script missing" error).

### Step 2: Create tests/build.test.js

Create a new file `tests/build.test.js` importing the parser helper from the build script. Since the parser functions inside `scripts/build-blog.js` are not currently exported, update the bottom of `scripts/build-blog.js` to conditionally export `parseFrontmatter` if required:

```javascript
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { parseFrontmatter };
}
```

Write tests in `tests/build.test.js` using Node's native assert:
```javascript
const test = require('node:test');
const assert = require('node:assert');
const { parseFrontmatter } = require('../scripts/build-blog.js');

test('parseFrontmatter correctly parses title, date, and author', () => {
  const content = `---\ntitle: "Test Title"\ndate: "2026-06-25"\nauthor: "Joe B. The Blind Hacker"\n---\n# Header\nBody content`;
  const { metadata, body } = parseFrontmatter(content);
  assert.strictEqual(metadata.title, 'Test Title');
  assert.strictEqual(metadata.date, '2026-06-25');
  assert.strictEqual(metadata.author, 'Joe B. The Blind Hacker');
  assert.match(body, /# Header/);
});
```

**Verify**:
Run the tests:
```bash
npm run test
```
Verify that the test suite runs and passes.

## Done criteria

- [ ] `npm run test` executes successfully.
- [ ] At least one test validates frontmatter parsing logic.
- [ ] No external dependencies are added to `package.json`.

## STOP conditions

- If Node version is too old to support `node:test` (requires Node.js v18+). If so, STOP and report.
