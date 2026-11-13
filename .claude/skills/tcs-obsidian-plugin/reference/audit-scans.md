# Audit Scans (steps 9–13)

Loaded at step 9 of the audit workflow in `SKILL.md`. Run every scan; each one's findings go into the step 14 report.

### 9. Scan for Vault Write Traps

```bash
grep -rn "vault\.adapter\.\(write\|writeBinary\|rename\|remove\)" "$TARGET" 2>/dev/null
grep -rn "vault\.delete\|adapter\.remove" "$TARGET" 2>/dev/null
grep -rn "vault\.read.*vault\.modify\|read(.*).*modify(" "$TARGET" 2>/dev/null
grep -rn "normalizePath" "$TARGET" 2>/dev/null
```

Flag adapter-layer writes on tracked paths as HIGH (use `vault.modify` / `vault.process`). Flag `vault.delete` as MEDIUM (prefer `fileManager.trashFile`). Flag read-modify-write sequences as MEDIUM (prefer `vault.process` to avoid TOCTOU). Flag any `normalizePath(absolutePath)` call as CRITICAL.

### 10. Scan for Lifecycle and Settings Issues

```bash
grep -rn "workspace\.on(\s*['\"]layout-ready" "$TARGET" 2>/dev/null
grep -rn "workspace\.getLeaf(false)" "$TARGET" 2>/dev/null
grep -rn "el\.className\s*=" "$TARGET" 2>/dev/null
grep -rn "\bdocument\.activeElement\b" "$TARGET" 2>/dev/null
```

Flag `workspace.on('layout-ready', ...)` as HIGH (use `app.workspace.onLayoutReady` instead). Flag `workspace.getLeaf(false)` in ribbon/command handlers as HIGH (does not reuse leaves). Flag `el.className =` on plugin-managed elements as HIGH. Flag `document.activeElement` as MEDIUM (use `activeDocument.activeElement` for popout safety).

### 11. Scan for Disabled ESLint Rules (Community-Plugin Submission Blocker)

```bash
grep -rn -E "eslint-disable|/\*\s*eslint-disable" "$TARGET" --include="*.ts" --include="*.tsx" --include="*.js" 2>/dev/null
grep -rn -E "['\"][a-z@/-]+['\"]\s*:\s*['\"]?off['\"]?" "$TARGET" --include=".eslintrc*" --include="eslint.config*" 2>/dev/null
```

Flag **every match** as CRITICAL with kind `LINT_RULE_DISABLED`. The Obsidian community-plugin reviewer (primary path: the [community.obsidian.md](https://community.obsidian.md/account/plugins) portal, manual submission; legacy/parallel path: the `obsidianmd/obsidian-releases` PR bot) scans submissions for disabled rules and rejects plugins with any disabled rule — `obsidianmd/*`, `@typescript-eslint/*`, or otherwise. There is no "justified disable" exception. Fix: change the code to satisfy the rule. If the rule is genuinely wrong for the project, raise it upstream — do not disable locally.

This step is the audit-time net. The plugin also ships a write-time guard for the same rule: the `PreToolUse` hook `scripts/block-eslint-disable.sh` denies any `Write`/`Edit`/`NotebookEdit` that introduces a disable into a repo detected as an Obsidian plugin, so the pattern never reaches the audit.

<!-- Duplicated from docs/guides/tcs-patterns.md § Hooks for self-containment: this pattern ships on its own once copied into a consumer repo, so its hook description can't depend on a link back into this catalogue's host repo. Keep the two in sync if the hook's scope gate or escape hatch changes. -->
The hook stays completely silent unless all three hold: the target file is inside a git repository; that repository looks like an Obsidian plugin (a `manifest.json` containing `minAppVersion`, or a `package.json` depending on `obsidian`); and the target file is not Markdown (documentation legitimately quotes the pattern). It reads content from the incoming text only, so removing an existing disable is never blocked by its own payload. For a plugin that will never be submitted to the community directory, relaunch Claude with `CLAUDE_ALLOW_ESLINT_DISABLE=1` to disable this guard.

### 12. Scan for Plugin-Guideline Violations (Submission Blockers + Theme/UX Hygiene)

```bash
# innerHTML / outerHTML / insertAdjacentHTML — XSS_DOM_INJECTION (CRITICAL)
grep -rn -E "\.innerHTML\s*=|\.outerHTML\s*=|insertAdjacentHTML\s*\(" "$TARGET" --include="*.ts" --include="*.tsx" 2>/dev/null

# Global app / window.app — GLOBAL_APP (HIGH); excludes `this.app` lines
grep -rn -E "(^|[^.])\bapp\.(workspace|vault|fileManager|metadataCache)\b|window\.app\b" "$TARGET" --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v "this\.app"

# Default hotkeys in addCommand — DEFAULT_HOTKEY (MEDIUM); single-line form only
grep -rn -E "addCommand\s*\(\s*\{[^}]*\bhotkeys\s*:" "$TARGET" --include="*.ts" --include="*.tsx" 2>/dev/null

# Inline hardcoded styles — INLINE_STYLE (HIGH)
grep -rn -E "\.style\.(color|backgroundColor|background|borderColor|fontFamily|fontSize)\s*=\s*['\"]" "$TARGET" --include="*.ts" --include="*.tsx" 2>/dev/null

# Direct workspace.activeLeaf access — ACTIVE_LEAF (HIGH)
grep -rn -E "workspace\.activeLeaf\b" "$TARGET" --include="*.ts" --include="*.tsx" 2>/dev/null

# Stored view reference (zero-arg arrow in registerView) — VIEW_REF_LEAK (MEDIUM)
grep -rn -E "registerView\s*\([^,]+,\s*\(\s*\)\s*=>" "$TARGET" --include="*.ts" --include="*.tsx" 2>/dev/null

# Inefficient file lookup via getFiles().find/filter — INEFFICIENT_FILE_LOOKUP (MEDIUM)
grep -rn -E "vault\.getFiles\s*\(\s*\)\.(find|filter)\s*\(" "$TARGET" --include="*.ts" --include="*.tsx" 2>/dev/null

# fetch() instead of requestUrl — RAW_FETCH (LOW); allow opt-out via // allow-fetch
grep -rn -E "(^|[^.])\bfetch\s*\(" "$TARGET" --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v "// allow-fetch"

# Raw <h1>–<h6> in settings/UI — SETTINGS_HEADING_RAW (LOW)
grep -rn -E "createEl\s*\(\s*['\"]h[1-6]['\"]" "$TARGET" --include="*.ts" --include="*.tsx" 2>/dev/null
```

Severity mapping:
- `XSS_DOM_INJECTION` (innerHTML/outerHTML/insertAdjacentHTML) → CRITICAL — submission-blocker, security risk.
- `INLINE_STYLE`, `ACTIVE_LEAF`, `GLOBAL_APP` → HIGH — theme-incompatibility / future-removal / API divergence.
- `DEFAULT_HOTKEY`, `VIEW_REF_LEAK`, `INEFFICIENT_FILE_LOOKUP` → MEDIUM.
- `RAW_FETCH`, `SETTINGS_HEADING_RAW` → LOW.

Notes on the greps: the default-hotkey check is single-line; multi-line `addCommand({ ... \n hotkeys: ... })` calls won't match (use a manual scan for any `addCommand` blocks with `hotkeys:` if the audit warrants it). The global-app check excludes lines that contain `this.app` — comment-only mentions of `app.foo` may yield benign hits.

### 13. Scan Manifest and Sample-Code Residue (Community-Plugin Submission Blockers)

Read `reference/obsidian-api.md` → `## manifest.json` → "Field-by-Field Submission Rules" for the full rule set. Then run the manifest checks against the target's `manifest.json` (use `jq` when available, otherwise grep). Every failing rule is a `MANIFEST_INVALID` violation.

```bash
MANIFEST="$TARGET/manifest.json"

# author email — CRITICAL (bot rejects)
jq -r '.author' "$MANIFEST" 2>/dev/null | grep -E '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}' && echo "MANIFEST_INVALID: author contains email"

# id contains "obsidian" — CRITICAL (directory rejects)
jq -r '.id' "$MANIFEST" 2>/dev/null | grep -i 'obsidian' && echo "MANIFEST_INVALID: id contains 'obsidian'"

# description rules — HIGH (bot warnings, reviewer may require fixes)
DESC=$(jq -r '.description' "$MANIFEST" 2>/dev/null)
[ ${#DESC} -gt 250 ] && echo "MANIFEST_INVALID: description > 250 chars (${#DESC})"
echo "$DESC" | grep -qE '[.!?)]$' || echo "MANIFEST_INVALID: description missing terminal . ! ? )"
echo "$DESC" | grep -qi 'obsidian' && echo "MANIFEST_INVALID: description contains the word 'Obsidian'"
echo "$DESC" | grep -qE '[^[:print:][:space:]]|[^\x00-\x7F]' && echo "MANIFEST_INVALID: description contains emoji/non-ASCII"
echo "$DESC" | grep -qiE '^this is a plugin' && echo "MANIFEST_INVALID: description starts with 'This is a plugin'"

# fundingUrl present — MEDIUM (verify manually that donations are actually accepted)
jq -e '.fundingUrl' "$MANIFEST" >/dev/null 2>&1 && echo "MANIFEST_REVIEW: fundingUrl is set — confirm donations are actually accepted; otherwise remove"
```

Then scan for sample-plugin residue — every match is a `SAMPLE_PLACEHOLDER` violation:

```bash
# Sample-plugin class/interface names — HIGH (bot/reviewer flags)
grep -rnE '\b(MyPlugin|MyPluginSettings|SampleSettingTab|SampleModal)\b' "$TARGET/src" --include="*.ts" --include="*.tsx" 2>/dev/null

# Sample manifest text — HIGH
jq -r '.name, .description' "$MANIFEST" 2>/dev/null | grep -iE 'sample plugin|my plugin'
```

And scan for `console.log` — every match is a `CONSOLE_LOG` violation (CRITICAL, bot rejects):

```bash
grep -rnE '\bconsole\.log\s*\(' "$TARGET" --include="*.ts" --include="*.tsx" --include="*.js" 2>/dev/null
```

And scan for plugin-id-prefixed command IDs — every match is a `COMMAND_ID_PREFIXED` violation (MEDIUM):

```bash
PLUGIN_ID=$(jq -r '.id' "$MANIFEST" 2>/dev/null)
grep -rnE "addCommand\s*\(\s*\{[^}]*\bid\s*:\s*['\"]${PLUGIN_ID}[:-]" "$TARGET" --include="*.ts" --include="*.tsx" 2>/dev/null
```

And scan for `vault.modify` against the active file — `VAULT_MODIFY_ACTIVE` violation (MEDIUM, UX regression):

```bash
# heuristic: vault.modify near a getActiveFile() / activeEditor reference
grep -rnB2 -A2 -E "vault\.modify\s*\(" "$TARGET" --include="*.ts" --include="*.tsx" 2>/dev/null | grep -E "getActiveFile|activeEditor|activeView"
```
