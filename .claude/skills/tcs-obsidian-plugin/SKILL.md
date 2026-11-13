---
name: tcs-obsidian-plugin
description: "Use PROACTIVELY when building or reviewing Obsidian plugins, or MUST BE USED when preparing a plugin for community-directory submission. Covers lifecycle, listener/timer cleanup, mobile compatibility, settings reactivity, vault write/event discipline, XSS-safe DOM, SecretStorage for keys, requestUrl over fetch, sentence-case UI text, manifest submission rules (author email, description punctuation, plugin id naming, fundingUrl), release asset attestations, sample-plugin residue, console.log vs console.debug, and common API gotchas (normalizePath, vault.process vs modify, processFrontMatter, popout-window globals, layout-ready timing, Sync-aware persistence, platform CSS body classes). Trigger phrases: \"obsidian plugin\", \"manifest.json\", \"community plugin submission\", \"community.obsidian.md\", \"obsidianmd/obsidian-releases\", \"obsidian audit\"."
user-invocable: true
argument-hint: "[plugin source path to audit]"
allowed-tools: Read, Bash, Grep, Glob
---

## Persona

**Active skill: tcs-obsidian-plugin**

Act as an Obsidian plugin developer. Respect the plugin lifecycle. Never leak listeners. Never break the vault on disable. Mobile compatibility is non-negotiable.

## Interface

ObsidianViolation {
  kind: LISTENER_LEAK | DOM_BYPASS | MOBILE_INCOMPATIBLE | LIFECYCLE_VIOLATION | VAULT_WRITE_UNGUARDED | LINT_RULE_DISABLED | XSS_DOM_INJECTION | GLOBAL_APP | DEFAULT_HOTKEY | INLINE_STYLE | ACTIVE_LEAF | VIEW_REF_LEAK | INEFFICIENT_FILE_LOOKUP | RAW_FETCH | SETTINGS_HEADING_RAW | MANIFEST_INVALID | SAMPLE_PLACEHOLDER | CONSOLE_LOG | COMMAND_ID_PREFIXED | VAULT_MODIFY_ACTIVE
  severity: CRITICAL | HIGH | MEDIUM | LOW
  file: string
  line?: number
  fix: string
}

State {
  target = $ARGUMENTS
  violations: ObsidianViolation[]
  hasMobileCheck: boolean
  usesRegisterEvent: boolean
}

## Constraints

**Always:**
- Register all event listeners with `this.registerEvent(...)` — Obsidian unloads them automatically.
- Register all DOM event listeners with `this.registerDomEvent(...)` for automatic cleanup.
- Use `this.addCommand(...)`, `this.addRibbonIcon(...)`, etc. — never add raw commands to the app.
- Test on mobile (iOS/Android) or use `Platform.isMobile` for mobile-specific code paths.
- Implement `onunload()` to clean up anything not registered through Obsidian's register methods.
- Use `app.workspace.onLayoutReady(cb)` for first-time setup work — `workspace.on('layout-ready', cb)` does not fire when the plugin is enabled after layout is already ready.
- Use `addClass` / `removeClass` / `toggleClass` on Obsidian-managed DOM (Ribbon, Status Bar, Setting items, leaves).
- Use `activeDocument` / `activeWindow` over the bare `document` / `window` globals — popout windows have their own document.
- Read live settings through the plugin reference at call time (`plugin.settings.X`), not via a captured `settings` object.
- Use `vault.process(file, current => next)` for read-modify-write on tracked TFiles; `vault.modify` / `vault.modifyBinary` for whole-file replacement.
- Use `app.fileManager.processFrontMatter(file, fm => { ... })` for frontmatter mutations.
- Use `app.fileManager.trashFile(file)` for deletes — honors the user's trash preference.
- Surface validation errors inline next to the offending input — never silently drop a value in `onChange`.
- Use `requestUrl` (from `obsidian`) over `fetch` for HTTP — handles desktop/mobile CORS uniformly. Mark `// allow-fetch` on the rare line that genuinely needs `fetch` (e.g. streaming responses).
- For settings section headings, use `new Setting(containerEl).setName("…").setHeading()` — never raw `<h2>` / `createEl('h2', …)`. Same goes for `<h1>`–`<h6>` inside settings tabs.
- Pick the right command callback: `callback` (unconditional), `checkCallback(checking)` (conditional — return `boolean` for availability when `checking` is true; execute when false), `editorCallback(editor, view)` (needs an active editor). The wrong choice breaks command-palette filtering and visibility.
- For API keys, tokens, passwords use `SecretStorage` / `SecretComponent` (Obsidian 1.11.4+). Persist the **secret ID** (lowercase alphanumeric + dashes) in `data.json`, never the secret value — this is the proper resolution to the Sync-replication concern (see Settings Reactivity → Hybrid Storage and the Secrets section in `reference/obsidian-api.md`).
- Use sentence case for all UI text (commands, settings names, headings, buttons). "Template folder location", not "Template Folder Location".
- Drop redundant "settings" from settings-tab headings. "Advanced", not "Advanced settings".
- For edits to the **active** note, prefer the `Editor` API (`editor.replaceSelection`, `editor.setLine`, etc. via `getActiveViewOfType(MarkdownView)`) — `vault.modify` loses cursor, selection, and folded ranges. Use `vault.process` for background files only.
- In `addCommand`, use a bare `id` (e.g. `"run-import"`) — Obsidian prefixes with the plugin ID automatically. Prefixing yourself produces "MyPlugin: MyPlugin: Run Import" in the palette.
- Use `console.debug(...)`, never `console.log(...)`. The community-plugin reviewer rejects `console.log` — whether submission goes through the primary [community.obsidian.md](https://community.obsidian.md/account/plugins) portal (manual) or the legacy/parallel `obsidianmd/obsidian-releases` PR bot. Document the DevTools Verbose-level toggle in support docs so users can self-diagnose "no debug output".

**Never:**
- Use `document.addEventListener` directly — always use `registerDomEvent`.
- Access `app.workspace.containerEl` directly for DOM manipulation when a Workspace API exists.
- Use `setTimeout` or `setInterval` without clearing them in `onunload`.
- Store state in memory that must survive plugin reload — use plugin settings (`this.loadData`).
- Use `vault.adapter.*` writes for paths Obsidian tracks — bypasses the editor cache and desyncs disk vs editor.
- Suppress self-fired vault events at the source via "I'm writing" flags — absorb at the sink (idempotent or window-based).
- Set `el.className = ...` on Ribbon, Status Bar, Setting items, or any Obsidian-managed element — overwrites Obsidian's layout classes.
- Pass `typedArray.buffer` to a binary write call without verifying it's the exact slice — `subarray()` results expose the entire backing ArrayBuffer.
- Pass an OS-absolute path through `normalizePath` — it strips leading `/` and silently re-roots inside the vault.
- Persist credentials or per-device state in `data.json` — Obsidian Sync replicates `data.json` byte-for-byte.
- Use `el.innerHTML = ...`, `el.outerHTML = ...`, or `insertAdjacentHTML(...)` — XSS risk and bypasses Obsidian's DOM helpers. Use `containerEl.createDiv/createEl/createSpan` for construction and `el.empty()` to clear.
- Use the global `app` / `window.app` — always `this.app` from the Plugin instance. The global is debug-only and may be removed in a future Obsidian version.
- Set default `hotkeys: [...]` in `addCommand({...})` — they conflict with other plugins and override the user's mapping. Let users assign their own via Settings → Hotkeys.
- Set inline hardcoded styles (`el.style.color = ...`, `el.style.backgroundColor = ...`) on plugin-rendered DOM — forces themes into `!important` overrides. Use prefixed CSS classes in `styles.css` with Obsidian variables (`var(--text-normal)`, `var(--background-modifier-error)`, `var(--radius-s)`, etc.).
- Read `app.workspace.activeLeaf` directly — use `app.workspace.getActiveViewOfType(MarkdownView)` for the markdown view, or `app.workspace.activeEditor?.editor` for the active editor.
- Store references to custom views (`this.view = new MyView()` inside `registerView`) — leaks across plugin reloads. Use `(leaf) => new MyView(leaf)` and access live instances via `app.workspace.getLeavesOfType(VIEW_TYPE)`.
- Detach leaves in `onunload` (`workspace.detachLeavesOfType(VIEW_TYPE)`) — leaves should reinitialize at their original position when the user updates the plugin. Closing them on every update is hostile UX.
- Iterate `vault.getFiles().find(f => f.path === path)` for path lookup — O(n) per call. Use `vault.getFileByPath` / `vault.getFolderByPath` / `vault.getAbstractFileByPath` (constant-time).
- Disable **any** ESLint rule — no `// eslint-disable`, no `// eslint-disable-line`, no `// eslint-disable-next-line`, no `'rule': 'off'` entries in `.eslintrc*`. The Obsidian community-plugin reviewer (primary path: the [community.obsidian.md](https://community.obsidian.md/account/plugins) portal, manual submission; legacy/parallel path: the `obsidianmd/obsidian-releases` PR bot) scans submissions for disabled rules and **rejects the plugin from official registration** if any are found. This applies to every rule the project's ESLint config loads — `obsidianmd/*`, `@typescript-eslint/*`, base `eslint:recommended`, and any other plugin. If a rule conflicts with the code, **change the code, not the rule**. Document the workaround in a code comment when the alternative is non-obvious.
- Put an email address in the manifest `author` field — the submission bot **rejects** it. Use `authorUrl` for a contact / homepage link instead.
- Ship a manifest `description` that violates any of these submission-bot rules: longer than 250 characters; missing terminal punctuation (`.` / `!` / `?` / `)`); containing the word "Obsidian"; containing emoji or special characters; starting with "This is a plugin". The "Obsidian" word check exists for both redundancy (every entry is in the Obsidian directory) and trademark hygiene under the Developer policy.
- Use `obsidian` anywhere in the manifest `id` — the directory **rejects** it. Pick a unique kebab-case identifier that omits the word entirely.
- Set `fundingUrl` without actually accepting financial support — the submission-requirements doc requires removing the field if you don't take donations.
- Ship sample-plugin placeholder names (`MyPlugin`, `MyPluginSettings`, `SampleSettingTab`) or unmodified sample code (ribbon icon, command, modal) from the template plugin — the reviewer flags these as residue. Rename to your plugin's identity and delete what you don't use.

## Reference Materials

- `reference/obsidian-api.md` — API patterns, lifecycle/DOM/settings/vault subtleties, misc gotchas, concurrency, anti-pattern catalog
- `reference/ui-conventions.md` — settings-tab heading style, sentence-case copy, `SettingGroup` (1.11.0+), `SecretStorage` / `SecretComponent` for keys (1.11.4+) — load when designing or auditing settings-tab UI or secret persistence
- `reference/testing-patterns.md` — Vitest setup, mock parity, live-test discipline, hot-reload, `obsidianmd/*` lint rationale
- `reference/live-testing.md` — live harness for real Obsidian over CDP: mockup registry, isolated launch, `live:open`, verified screenshot matrix, 1.15 harness gotchas (load only when building live tests or screenshots)
- `reference/architectural-patterns.md` — adapter layout, permission/trust boundaries, audit log shape, UI patterns, build/bundle/release (load when designing structure beyond a few hundred LOC)
- `reference/path-sanitization.md` — deterministic 10-step pipeline for OS-FS writes outside the vault
- `reference/user-extensibility.md` — trust model, hook policy, `require.cache` eviction (load only when the plugin executes user-authored code)

## Workflow

### Entry Point

match ($ARGUMENTS) {
  empty | "build" | "new"  => execute Build workflow (steps 1–4)
  file path | "audit"      => execute Audit workflow (steps 5–8)
}

### Build Workflow

### 1. Scaffold Plugin

Read `reference/obsidian-api.md` Plugin Lifecycle and manifest sections.

Create the directory structure:
```
my-plugin/
├── src/
│   ├── main.ts             # Plugin class: onload, onunload
│   ├── settings.ts         # PluginSettings interface + DEFAULT_SETTINGS
│   ├── settings-tab.ts     # PluginSettingTab subclass
│   └── views/              # ItemView subclasses (if needed)
├── manifest.json           # id, name, version, minAppVersion, isDesktopOnly
├── package.json
├── tsconfig.json           # target: ES6, lib: [dom, ES6], moduleResolution: node
└── esbuild.config.mjs      # bundle to main.js (Obsidian's expected output file)
```

Note: Obsidian expects `main.js` at the plugin root — NOT `dist/`. Configure esbuild
accordingly: `outfile: "main.js"`.

### 2. Implement onload

In onload, register everything through Obsidian's APIs:
- Settings: `await this.loadSettings()` first
- Setting tab: `this.addSettingTab(...)`
- Commands: `this.addCommand(...)` for each user action — pick the right callback type (`callback` / `checkCallback` / `editorCallback`)
- Events: `this.registerEvent(...)` for vault/workspace events
- DOM events: `this.registerDomEvent(...)` — never raw addEventListener
- Intervals: `this.registerInterval(...)` — never raw setInterval
- Views: `this.registerView(TYPE, leaf => new MyView(leaf))` if using custom leaves — never store the instance on `this`
- Ribbon: `this.addRibbonIcon(...)` if applicable
- HTTP: use `requestUrl(...)` from `obsidian` — never `fetch`
- Secrets: use `SecretStorage` / `SecretComponent` for keys/tokens/passwords — never put the value in `data.json`

### 3. Mobile Compatibility Pass

Before finishing: grep for platform-unsafe APIs:
```bash
grep -n "require('fs')\|require(\"fs\")\|require('path')\|child_process" src/**/*.ts
```

Each hit needs a `Platform.isDesktop` guard or must be removed.
If any remain unguarded, set `isDesktopOnly: true` in manifest.json.

### 4. Build and Hot-Reload

```bash
npm run build          # esbuild → main.js
# Symlink or copy to vault's .obsidian/plugins/my-plugin/
# Enable in Obsidian Settings → Community Plugins
```

For dev: `npm run dev` — watch mode with esbuild, reloads on save.

---

### Audit Workflow

### 5. Check Lifecycle

Read `main.ts`. Verify:
- `onload()` registers all commands, events, views
- `onunload()` exists and cleans up non-registered resources

### 6. Scan for Listener Leaks

```bash
grep -n "addEventListener\|removeEventListener\|setTimeout\|setInterval" "$TARGET" 2>/dev/null
```

Flag any `addEventListener` not wrapped in `registerDomEvent` as CRITICAL.

### 7. Check API Usage

```bash
grep -n "document\." "$TARGET" 2>/dev/null | grep -v "registerDomEvent"
```

Flag direct DOM manipulation bypassing Obsidian API as HIGH.

### 8. Check Mobile Compatibility

Flag Node.js-only APIs (`fs`, `path`, `child_process`) used without `Platform.isDesktop` guard as HIGH.

### 9–13. Scan for Submission Blockers and Hygiene Issues

Read `reference/audit-scans.md` now and run its five scans in order: vault write traps (9), lifecycle and settings issues (10), disabled ESLint rules (11), plugin-guideline violations (12), manifest and sample-code residue (13). Each scan names the severity its findings carry into the report.

### 14. Report

Output format — produce exactly these sections, in this order:

```
## Obsidian Plugin Audit — <plugin-id or target path>

### Submission-Blockers (CRITICAL)
- <kind>: <file>:<line?> — <one-line fix referencing Obsidian API>

### High-severity (HIGH)
- ...

### Medium-severity (MEDIUM)
- ...

### Low-severity (LOW)
- ...

### Files checked
<list>

### Recommended next step
<one sentence — typically "fix CRITICAL items before opening the submission PR">
```

Rules:
- Group strictly by severity (CRITICAL → LOW), then by `kind` inside each group.
- Every finding cites file + line (or "manifest.json" for manifest issues).
- Every finding ends with a concrete Obsidian API replacement (e.g. "use `app.fileManager.trashFile(file)`").
- If no findings at a severity level, write "- None" rather than omitting the section.

Severity defaults across the catalog:

| Severity | Kinds |
|---|---|
| CRITICAL | `LINT_RULE_DISABLED`, `XSS_DOM_INJECTION`, `LISTENER_LEAK` (where unregistered), `MANIFEST_INVALID` (author email, id contains "obsidian"), `CONSOLE_LOG` |
| HIGH | `MOBILE_INCOMPATIBLE`, `VAULT_WRITE_UNGUARDED`, `GLOBAL_APP`, `INLINE_STYLE`, `ACTIVE_LEAF`, `MANIFEST_INVALID` (description rules), `SAMPLE_PLACEHOLDER` |
| MEDIUM | `DEFAULT_HOTKEY`, `VIEW_REF_LEAK`, `INEFFICIENT_FILE_LOOKUP`, `COMMAND_ID_PREFIXED`, `VAULT_MODIFY_ACTIVE`, `MANIFEST_INVALID` (`fundingUrl` review) |
| LOW | `RAW_FETCH`, `SETTINGS_HEADING_RAW` |

Read `reference/obsidian-api.md` for the full API/anti-pattern mapping. Read `reference/testing-patterns.md` for test-side issues.
