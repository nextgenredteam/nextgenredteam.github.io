# Plan 003: Refactor sync script for path flexibility

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm the expected result before moving to the next step. If anything in the "STOP conditions" section occurs, stop and report — do not improvise. When done, update the status row for this plan in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat e5cda6e..HEAD -- scripts/sync-repos.js`
> If the target file changed since this plan was written, compare the "Current state" excerpts against the live code; on a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: None
- **Category**: tech-debt
- **Planned at**: commit `e5cda6e`, 2026-06-25

## Why this matters

The repository synchronizer script `scripts/sync-repos.js` uses a hardcoded relative path (`../../NGRT/Website`) to target the destination website repository. If the workspace is checked out on a different folder structure, this path will fail or overwrite unrelated folders. Making this target path configurable via environment variables or command-line arguments (with a safe local directory fallback) prevents unexpected sync errors and improves modularity.

## Current state

- Relevant file:
  - `scripts/sync-repos.js` — copies files between local repositories (lines 8-10).
- Excerpt from [scripts/sync-repos.js:8-10](file:///f:/OneDrive/NGRT/Website/scripts/sync-repos.js#L8-L10):
  ```javascript
  const destBaseDir = path.join(__dirname, '../../NGRT/Website');
  const destToolsDir = path.join(destBaseDir, 'tools/joebro');
  const destBlogDir = path.join(destBaseDir, 'blog');
  ```

## Scope

**In scope**:
- `scripts/sync-repos.js`

**Out of scope**:
- Changing sync behavior or copying additional folders other than those defined in `sync-repos.js`.

## Git workflow

- Branch: `advisor/003-refactor-sync-script`
- Commit message: `refactor: Make sync-repos.js destination base directory configurable`

## Steps

### Step 1: Modify destination path resolution in scripts/sync-repos.js

Rewrite the `destBaseDir` variable in `scripts/sync-repos.js` to look for a command-line argument first, then an environment variable `NGRT_DEST_DIR`, and finally fall back to the default relative path.

Target state:
```javascript
const defaultDestDir = path.join(__dirname, '../../NGRT/Website');
const destBaseDir = process.argv[2] || process.env.NGRT_DEST_DIR || defaultDestDir;
```

**Verify**:
Run the script passing a temporary directory to verify that it copies files correctly into that directory:
```bash
mkdir -p temp_sync_test
node scripts/sync-repos.js temp_sync_test
```
Check that `temp_sync_test/tools/joebro` and `temp_sync_test/blog` folders were created and filled with files.
Remove the test directory when verification succeeds:
```bash
rm -rf temp_sync_test
```

## Done criteria

- [ ] `scripts/sync-repos.js` supports passing a target directory as a CLI argument.
- [ ] No files are modified or overwritten when running without args unless the default relative path exists.

## STOP conditions

- If `scripts/sync-repos.js` does not contain the `destBaseDir` variable definition.
- If copying directories fails due to permission errors.
