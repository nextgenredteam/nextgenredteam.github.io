# Plan 001: Update default author in new post template

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm the expected result before moving to the next step. If anything in the "STOP conditions" section occurs, stop and report — do not improvise. When done, update the status row for this plan in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat e5cda6e..HEAD -- scripts/new-post.js`
> If the target file changed since this plan was written, compare the "Current state" excerpts against the live code; on a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: None
- **Category**: dx
- **Planned at**: commit `e5cda6e`, 2026-06-25

## Why this matters

The default author name in the `new-post.js` template script is currently hardcoded as `"Joe Brinkley"`. This violates the recently established golden rule in `.agents/AGENTS.md`, which mandates that new posts default to `"Joe B. The Blind Hacker"` so they automatically display the correct author profile and social media links. Fixing this ensures that all future draft files generated using `npm run new-post` are immediately compliant.

## Current state

- Relevant file:
  - `scripts/new-post.js` — script to generate new markdown posts (line 30).
- Excerpt from [scripts/new-post.js:27-32](file:///f:/OneDrive/NGRT/Website/scripts/new-post.js#L27-L32):
  ```javascript
  const frontmatter = `---
  title: "${title}"
  date: "${currentDate}"
  author: "Joe Brinkley"
  description: "Brief description of the post..."
  ---
  ```

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Build | `npm run build` | Success! Rendered blog index... |
| Generate Post | `npm run new-post "Test Post"` | Success! Created new blog post draft... |

## Scope

**In scope**:
- `scripts/new-post.js`

**Out of scope**:
- Changing authors on existing posts.
- Any changes to `scripts/build-blog.js`.

## Git workflow

- Branch: `advisor/001-fix-default-author`
- Commit message: `dx: Update default author in new-post template to Joe B. The Blind Hacker`

## Steps

### Step 1: Update the author string in scripts/new-post.js

Replace `"Joe Brinkley"` with `"Joe B. The Blind Hacker"` on line 30 of `scripts/new-post.js`.

**Verify**:
Run the script to verify compilation:
```bash
npm run new-post "Standard Rule Verification Test"
```
Check that `blog/posts/standard-rule-verification-test.md` has:
```yaml
author: "Joe B. The Blind Hacker"
```
Delete the test post draft when verification succeeds:
```bash
rm blog/posts/standard-rule-verification-test.md
```

## Test plan

1. Run `npm run new-post "Verification Post"` to generate a post.
2. Confirm the frontmatter reads `author: "Joe B. The Blind Hacker"`.
3. Run `npm run build` to ensure the site compiles cleanly with the new draft.
4. Clean up `blog/posts/verification-post.md` and `blog/verification-post.html` after testing.

## Done criteria

- [ ] `scripts/new-post.js` is modified to set the default author as `"Joe B. The Blind Hacker"`.
- [ ] Running `npm run new-post` creates files with the correct author frontmatter.
- [ ] No files outside the in-scope list are modified.

## STOP conditions

- If `scripts/new-post.js` does not contain `author: "Joe Brinkley"` on or near line 30.
- If running `npm run new-post` throws errors.
