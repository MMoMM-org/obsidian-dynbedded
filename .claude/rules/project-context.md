# obsidian-dynbedded — Project Context

## Test Vault Date Files

The `Dynbedded/` test vault contains 4 date-stamped files that must be renamed to match the current date at the start of every session:

| Pattern | Date |
|---|---|
| `YYYY-MM-DD.md` | today |
| `YYYY-MM-DD.md` (the earlier one) | yesterday |
| `YYYY-MM-DD Not To be Found.md` | today |
| `DP-YYYY-MM-DD.md` | today |

**Rename these at session start** using today's date and yesterday's date before doing any other work.

Example (run from repo root):
```bash
TODAY=$(date +%Y-%m-%d)
YESTERDAY=$(date -v-1d +%Y-%m-%d)
# rename the 4 files accordingly
```

**Note:** `update-vault.mjs` (called by `npm run dev` / `npm run build:dev`) handles this automatically — it renames the 4 date files AND updates `[[date]]` links inside `1. Readme English.md` and `1. Liesmich Deutsch.md`. All vault date maintenance logic belongs here; do not create separate scripts for vault updates.

## Dev Build

`npm run dev` — esbuild watch mode, auto-deploys to `Dynbedded/.obsidian/plugins/obsidian-dynbedded/` (main.js + manifest.json + styles.css). No manual copy needed.

## Commit Conventions

Use `closes #N` or `fixes #N` in commit messages (not just `(#N)`) so GitHub auto-closes the issue on merge to main. The `(#N)` bracket style is ignored by GitHub's issue-close parser.

Use `chore:` for changes outside the plugin source (test vault files, build artifacts, docs, TASKS.md). Only `fix:` and `feat:` should trigger a release — don't use them for non-source changes.

**Push only when a feature or fix is ready to release.** Intermediate `chore:` commits are batched and pushed together with the next real feature/fix.

## Pending: Untested Release Pipeline Refactor (commit dffa46a)

Commit `dffa46a` (2026-03-13) implements a release pipeline cleanup but has **NOT been pushed or tested**. It must ship together with the next `fix:` or `feat:` commit.

**What was changed:**
- `build/` removed from git tracking (`git rm --cached`) and added to `.gitignore` — build artifacts no longer committed to the repo
- `esbuild.config.mjs` — copy plugin disabled for production mode (dev/devbuild still copy manifest.json + styles.css)
- `package.json` — `prepareCmd` removed from `@semantic-release/exec` (was causing double-execution of version-bump); `@semantic-release/git` assets trimmed to metadata only; `@semantic-release/github` uses explicit asset labels
- `createZip.sh` — hardened with `rm -rf $1` before `mkdir`
- `.github/workflows/release.yml` — bumped `actions/checkout` and `actions/setup-node` from v2 → v4

**What to verify on first push:**
- CI builds correctly and `build/` is populated at publish time
- GitHub Release assets (`main.js`, `manifest.json`, `styles.css`, zip) are uploaded correctly
- Release commit contains only `manifest.json`, `versions.json`, `Changelog.md`, `package.json` (no compiled JS)

## TASKS.md Lifecycle

Only committed-but-unreleased tasks belong in **Pending Confirmation**. Newly created GitHub issues for future features (not yet implemented) stay in **Open** or **Future Features** — they do not move to Pending Confirmation.
