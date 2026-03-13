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
