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

## Dev Build

`npm run dev` — esbuild watch mode, auto-deploys to `Dynbedded/.obsidian/plugins/obsidian-dynbedded/` (main.js + manifest.json + styles.css). No manual copy needed.

## Commit Conventions

Use `closes #N` or `fixes #N` in commit messages (not just `(#N)`) so GitHub auto-closes the issue on merge to main. The `(#N)` bracket style is ignored by GitHub's issue-close parser.

## TASKS.md Lifecycle

Only committed-but-unreleased tasks belong in **Pending Confirmation**. Newly created GitHub issues for future features (not yet implemented) stay in **Open** or **Future Features** — they do not move to Pending Confirmation.
