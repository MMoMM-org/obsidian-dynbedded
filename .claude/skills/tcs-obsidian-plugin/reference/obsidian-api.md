# Obsidian Plugin API Reference

Lifecycle hooks, event registration, commands, settings, vault operations,
workspace API, views, modals, CodeMirror 6, mobile compatibility, and manifest.

---

## Plugin Lifecycle

```typescript
import { Plugin } from "obsidian";

export default class MyPlugin extends Plugin {
  settings: MyPluginSettings;

  async onload() {
    await this.loadSettings();
    this.addSettingTab(new MySettingTab(this.app, this));
    this.addCommand({ ... });
    this.registerEvent(this.app.workspace.on("file-open", this.handleFileOpen));
    this.registerDomEvent(document, "click", this.handleClick);
    this.addRibbonIcon("dice", "My Plugin", () => this.doThing());
  }

  onunload() {
    // Only clean up resources you managed manually.
    // Anything registered via registerEvent, registerDomEvent, addCommand,
    // addRibbonIcon, registerView is cleaned up automatically by Obsidian.
    this.myCustomResource?.destroy();
  }
}
```

### Lifecycle Subtleties

**`onLayoutReady` vs `workspace.on('layout-ready', ...)`.** Use `app.workspace.onLayoutReady(cb)` to defer first-time setup work. The helper fires immediately if layout is already ready, otherwise queues for the event. Do NOT use `workspace.on('layout-ready', cb)` for first-time setup — it does not fire when the plugin is enabled after layout is already ready (e.g. user toggles the plugin via Settings → Community Plugins), leaving the plugin stuck in a partial init state.

**Metadata-cache-dependent first-run work.** `onLayoutReady` fires when the workspace layout is ready, but the metadata cache may still be populating. Work that enumerates tagged notes, scans frontmatter, or queries links should wrap the actual work in `setTimeout(graceMs)` (a few seconds is typical). Always `register(() => clearTimeout(...))` so the timer is cleaned up if the plugin unloads before the grace elapses.

**Warm-cache start: `resolved` may already have fired (observed on 1.15.0).** A plugin that waits for `metadataCache.on("resolved", …)` before building an index never becomes ready when the cache was warm: in an empty or already-indexed vault `resolved` fired before `onload` subscribed. At layout-ready, check whether every file already has a cache entry (`vault.getMarkdownFiles().every(f => metadataCache.getFileCache(f))`) and start right away; subscribe to `resolved` only otherwise.

**Defensive double-onload guard.** Obsidian's lifecycle is single-shot per plugin instance, but the plugin must self-enforce — without it, a buggy reload or test calling `onload` twice silently double-registers every command, view, and status-bar entry, accumulating ghost handlers per fire.

```typescript
async onload() {
  if (this.loaded) throw new Error("onload called twice");
  this.loaded = true;
  // ...
}
```

**LIFO cleanup pattern.** For surfaces beyond Obsidian's auto-cleanup (anything not registered via `registerEvent` / `registerDomEvent` / `addCommand` / `addRibbonIcon` / `registerView`), maintain a `cleanups: Array<() => void>` field. Push from any wiring code that needs explicit teardown. In `onunload`, drain LIFO with try/catch around each — later registrations may depend on earlier ones, and one throwing teardown must not skip the rest.

```typescript
private cleanups: Array<() => void> = [];

onunload() {
  while (this.cleanups.length) {
    try { this.cleanups.pop()?.(); } catch (e) { console.debug("teardown failed", e); }
  }
}
```

### Leaf Identity

`workspace.getLeaf(false)` does NOT reuse an existing leaf — it always allocates a new one. The `false` argument controls split behaviour, not identity reuse. Without checking `getLeavesOfType` first, every ribbon-icon click stacks a new tab.

```typescript
async activateView() {
  const { workspace } = this.app;
  const existing = workspace.getLeavesOfType(VIEW_TYPE)[0];
  if (existing) {
    workspace.revealLeaf(existing);
    return;
  }
  const leaf = workspace.getRightLeaf(false);
  await leaf.setViewState({ type: VIEW_TYPE, active: true });
  workspace.revealLeaf(leaf);
}
```

---

## DOM and Workspace Discipline

**Class manipulation on Obsidian-managed DOM.** Use `el.addClass(name)` / `el.removeClass(name)` / `el.toggleClass(name, force)`. Never assign `el.className = ...` on Ribbon, Status Bar, Setting items, leaves, or any element Obsidian manages — Obsidian writes layout-critical classes onto these elements, and `className =` silently overwrites them. The element looks fine in DevTools but loses Obsidian's styling.

**Popout-aware DOM globals.** Obsidian's "Open in new window" feature creates a separate document. The bare `document` / `window` globals point at the main window only. Inside any rendering or focus-related code, use:
- `activeDocument` instead of `document`
- `activeWindow` instead of `window`
- `activeDocument.activeElement` instead of `document.activeElement`

The `obsidianmd/prefer-active-doc` ESLint rule catches the most common cases — leave it enabled.

**Obsidian DOM helpers are prototype methods — never destructure.** `el.createDiv(opts)` / `el.createEl(tag, opts)` / `el.createSpan(opts)` read `this`. Destructuring strips the binding and the helper either targets the wrong element or throws.

```typescript
// Correct
el.createDiv({ cls: "my-row" });

// Wrong — strips `this`-binding
const { createDiv } = el;
createDiv({ cls: "my-row" });
```

**Per-modal aria IDs use `crypto.randomUUID()`, not module-scoped counters.** A pattern like `let nextId = 0; const id = "modal-" + (++nextId);` survives plugin disable/enable because the module is cached — the counter accumulates indefinitely and can collide across plugins. `crypto.randomUUID()` is reload-safe and conflict-proof.

**Never use `innerHTML` / `outerHTML` / `insertAdjacentHTML`.** These are XSS-prone when any operand is user-derived (note text, frontmatter, search results, settings input) and they bypass Obsidian's DOM helpers entirely. Use the prototype helpers:

```typescript
// Wrong — XSS risk + framework bypass
containerEl.innerHTML = `<div class="row">${userText}</div>`;
el.insertAdjacentHTML("beforeend", `<span>${count}</span>`);

// Right — composable, escapes by default
const row = containerEl.createDiv({ cls: "row" });
row.setText(userText);
const badge = el.createSpan({ text: String(count) });
```

To clear an element, use `el.empty()` — never `el.innerHTML = ""` (the assignment-form is still a runtime hazard if a tool later mistakes it for safe set-and-clear). The community-plugin reviewer bot rejects submissions with these patterns.

**Never use the global `app` / `window.app`.** The global is debug-only and Obsidian has signalled it may be removed in a future build. Always reach the app via `this.app` from the plugin instance, or via the explicit `App` argument that Obsidian passes to `PluginSettingTab`, `Modal`, `ItemView`, `SuggestModal`, etc. constructors.

```typescript
// Wrong — relies on a debug global
const file = app.vault.getFileByPath("foo.md");

// Right — use the plugin's app reference
const file = this.app.vault.getFileByPath("foo.md");

// Right — inside a Modal/View/SettingTab, the App is in scope
class MyModal extends Modal {
  onOpen() { this.app.workspace.openLinkText(...); }
}
```

**Never set inline hardcoded styles on plugin DOM.** `el.style.color = "red"` and friends force theme authors into `!important` overrides and break theme compatibility entirely for color/background/border properties that themes are expected to control. Put styling in `styles.css` with a prefixed class and reference Obsidian CSS variables:

```css
/* styles.css */
.myplugin-warning {
  color: var(--text-error);
  background-color: var(--background-modifier-error);
  border: 1px solid var(--background-modifier-border);
  border-radius: var(--radius-s);
  padding: var(--size-2-3);
}
```

```typescript
// Wrong
el.style.color = "white";
el.style.backgroundColor = "red";

// Right
el.addClass("myplugin-warning");
```

Reserve direct `el.style.X = ...` writes for layout-arithmetic that genuinely depends on runtime values (computed positions, drag offsets, animated transforms). For static appearance, always go through CSS.

### Accessibility Minima

- Dynamic-update regions (recovery banners, filter-result counts, status text) need `aria-live="polite"`.
- Focus indicators: do not set `outline: none` and rely on a border-color change. Use `outline: 2px solid var(--interactive-accent); outline-offset: 2px;`. The CSS variable is Obsidian-themed, so it adapts to user themes.
- When a third-party dependency's runtime defaults affect accessibility (xterm's `screenReaderMode`, codemirror's announce regions, etc.), set the value explicitly AND add a build-failing source-regex test that asserts the literal config string is present. A runtime config check would let a silent upstream-default flip pass; a source-regex test forces a deliberate, reviewable change.

### Untyped Runtime APIs

Some Obsidian runtime APIs are present but not in the published `.d.ts`. The most common: `app.setting.open()` and `app.setting.openTabById(id)`. Cast at the call site and guard with `typeof === "function"` so older or future Obsidian builds that drop the API degrade gracefully:

```typescript
const setting = (this.app as unknown as {
  setting?: { open?: () => void; openTabById?: (id: string) => void };
}).setting;
if (typeof setting?.open === "function") {
  setting.open();
  setting.openTabById?.("my-plugin-id");
}
```

---

## Settings Reactivity

This is the highest-leverage section in the reference — most "weird settings bug" reports trace to one of these.

### Closure Snapshots vs Live Reads

A function that captures `plugin.settings` directly snapshots the object at definition time and never sees updates. Subsequent UI updates that reassign `plugin.settings = newObj` never reach the closure — it still holds the old reference.

Two patterns work:

1. **Always read through `this.plugin.settings.X`** at call time (require `plugin` reference, not `settings`).
2. **Mutable container:** `const ref = { settings: plugin.settings };` then update via `ref.settings = newObj`; consumers read `ref.settings.X`.

**Code-review checklist:** for every function that lives beyond `onload` (event handlers, intervals, view methods), ask "does this read a setting? if so, will it see updates?" If the function captured `settings` (or any sub-object), the answer is no.

### Single-Writer Wrappers

When a class caches state in memory (queues, indices, manifests), inject *the wrapper* as the dependency, never the underlying store. If any code path writes to the underlying store directly, the wrapper's cache becomes a lie. The symptom: scheduled work appears to succeed but does nothing, because the wrapper's view of "pending work" never updates.

### Settings Tab Async Loads

Any data the settings tab reads (account info, available options, validation rules) must be fully loaded before the first `display()` call. If a fetch resolves later and triggers a re-render, the tab rebuilds and any in-progress user typing is lost. Either pre-load before opening, show a loading state with no inputs, or render with placeholders that persist user edits across the re-render.

### Validation Must Show Its Work

Any `onChange` that validates input must surface its rejection — never silently drop the value. Silent rejection is indistinguishable from "save is broken" and produces the worst class of bug-hunt: the user looks at storage code when the bug is in input.

**Where validation errors render:** inline next to the offending input, never in a top-of-page Notice. For multi-row inputs (path lists, tag lists), this is the difference between "I can fix this in 2 seconds" and "which of these 20 rows did I mistype?". Pattern: each row component owns its own validation state and reports up to the parent for save-blocking.

### `TextComponent.onChange` Timing

`text.onChange(cb)` listens to the DOM `change` event, which fires on blur. If the user types and then clicks elsewhere (tab switch, modal close), the last keystrokes are lost. For "save as you type" UX, additionally attach an `input` listener:

```typescript
new Setting(containerEl).setName("API Key").addText((text) => {
  text.setValue(this.plugin.settings.apiKey);
  const commit = async (value: string) => {
    this.plugin.settings.apiKey = value;
    await this.plugin.saveSettings();
  };
  text.onChange(commit);
  text.inputEl.addEventListener("input", () => commit(text.getValue()));
});
```

### `onExternalSettingsChange` for External `data.json` Mutations

When `data.json` is mutated by another process (Obsidian Sync from a peer device, manual edit, hot-reload tooling), the lifecycle hook `onExternalSettingsChange` fires. Implement it to re-read config and call `this.settingsTab.display()` — that's the only path to repaint the settings UI on external mutation. Without it, settings UI shows stale state until the user closes and reopens the tab.

### Hybrid Storage for Sync-Aware Persistence

Obsidian Sync replicates `data.json` byte-for-byte across devices. For state that is per-device (machine-specific paths, per-device enablement flags, machine-bound credentials), write to a sibling file via `app.vault.adapter.read` / `write` / `exists` rather than `plugin.saveData()`:

```typescript
const sidecar = `${this.manifest.dir ?? `.obsidian/plugins/${this.manifest.id}`}/device.json`;
await this.app.vault.adapter.write(sidecar, JSON.stringify(deviceState));
```

Whether new state synced from a peer device should be enabled by default on the receiving device is a plugin-design decision — both default-on and default-off are legitimate. Document the choice for users so the behaviour is predictable.

Credentials are a special case: do not put them in `data.json`. Sync would replicate them across devices, including ones the user does not control. Use `SecretStorage` / `SecretComponent` instead — see `reference/ui-conventions.md` → Secrets and Sensitive Data.

### Notice Lifetime Conventions

- Auto-dismiss transient notices (typical 4–5 s, e.g. `new Notice("Saved", 4000)`) for non-actionable updates.
- Use sticky notices (`new Notice(msg, 0)`) only when the user must acknowledge or take action.
- For sticky or recurring notices that are not catastrophic, offer a "Don't show this again" affordance. Without it, the same alert across many sessions becomes noise the user learns to dismiss without reading. Auto-restore-on-load actions are a typical case: state synced from another device may map to a different local resource, and the user benefits from one prominent prompt the first time, not on every reload.

---

## Vault Write Traps

### Adapter-Layer Writes Bypass the Editor Cache

`vault.adapter.writeBinary` / `writeFile` / `rename` succeed at the disk layer but do not invalidate Obsidian's in-memory view. The file on disk is correct, the editor shows the old content, the user thinks the operation failed.

For any path that might be a tracked TFile (anything inside the vault), use the high-level API:

- `vault.modify(file, content)` — replace text content
- `vault.modifyBinary(file, buffer)` — replace binary content
- `vault.process(file, current => next)` — read-modify-write (preferred, see below)
- `vault.rename(file, newPath)` — rename
- `app.fileManager.trashFile(file)` — delete

Adapter-layer writes are appropriate for vault paths Obsidian does not track (plugin data sidecars, asset directories outside the visible vault tree). Even then, prefer `plugin.saveData` / `plugin.loadData` where possible.

### `vault.process` for Read-Modify-Write

For read-modify-write specifically (the most common case — append a line, change frontmatter, replace a string), prefer `app.vault.process(file, current => newContent)` over `read` + `modify`. `vault.process` serializes concurrent edits at the Obsidian level; two near-simultaneous calls cannot corrupt each other. The `read + modify` pattern has a TOCTOU window where the editor or another plugin can interleave a write between your read and your modify, silently losing changes.

### Frontmatter via `processFrontMatter`

`app.fileManager.processFrontMatter(file, fm => { /* mutate */ })` preserves the user's exact YAML formatting (block vs flow arrays, comma-separated strings, indentation). Reparsing through `js-yaml` / `yaml` and writing back destroys the user's chosen representation and re-indents their notes.

For deletes, use `delete fm[k]`. Do NOT write `fm[k] = null` — that produces a literal YAML `null`, which is semantically different from "field absent."

### Delete via `fileManager.trashFile`

`app.fileManager.trashFile(file)` honors the user's "Deleted files" preference (system trash / vault `.trash/` / permanent). `vault.delete(file)` and `adapter.remove(path)` ignore that preference and unconditionally delete, surprising users who relied on trash recovery.

### `normalizePath` Strips Leading Slashes

`normalizePath("/Users/me/Documents")` returns `"Users/me/Documents"`. A code path that builds an OS-absolute filesystem path and pipes it through `normalizePath` silently re-roots inside the vault. `normalizePath` is for vault-relative segments only.

When working with absolute paths: normalize the vault-relative segment first, then concatenate with the absolute base. Never pass the joined absolute path back through `normalizePath`.

**Mock parity warning:** any test mock for `normalizePath` MUST replicate the leading-slash strip — otherwise tests pass while runtime breaks.

### TypedArray `buffer` Trap

`uint8.buffer` returns the *backing* ArrayBuffer, ignoring `byteOffset` and `byteLength`. For `subarray()` results in particular, this can be many times larger than the slice. To write exactly the slice's bytes:

```typescript
const exact = new Uint8Array(slice.byteLength);
exact.set(slice);
await vault.modifyBinary(file, exact.buffer);
// or: await vault.modifyBinary(file, slice.slice().buffer);
```

---

## Vault Event Discipline

### Vault Events Do Not Distinguish Source

`vault.on('modify' | 'create' | 'delete' | 'rename', ...)` fires for both user edits AND plugin-originated writes. A naive change-detector that listens for `modify` to detect "user changed a file" loops back into itself: plugin writes → fires modify → detector triggers → plugin writes again.

Do not try to suppress events at the source (e.g. by setting an "I'm writing" flag) — async race conditions make the flag unreliable. Instead, **absorb at the sink**: the change-detector's logic should be idempotent or window-based (e.g. "process changes observed at least N seconds before now"), so a plugin-originated write inside the window is harmless.

### `file-menu` Covers Two Surfaces

`workspace.on('file-menu', ...)` fires from BOTH the file-explorer right-click context menu AND the note's 3-dot "more options" menu. A single registration handles both. A common bug is to wire two separate handlers (one for explorer, one for notes), then fight duplicates.

### `metadataCache.getFileCache` for Non-Body Reads

For frontmatter, tags, inline-fields, headings, and blocks, prefer the metadata cache:

```typescript
const cache = this.app.metadataCache.getFileCache(file);
const fm = cache?.frontmatter;
const tags = cache?.tags;
const headings = cache?.headings;
const links = cache?.links;
```

Only call `vault.read(file)` / `vault.cachedRead(file)` when you actually need the body bytes. At 10k+ notes the difference between cache and re-parse is sub-ms vs tens of ms per call, which matters when search runs over the whole vault.

### Frontmatter `tags` Come in (At Least) Four YAML Shapes

Obsidian accepts all of these:

```yaml
tags: [finance, planning]            # 1. flow array
tags:                                # 2. block array (multi-line dash list)
  - finance
  - planning
tags: "finance, planning"            # 3. comma-separated string
tags: finance                        # 4. scalar
```

Code that only handles one shape silently fails for users who write it differently. Match all four, case-insensitive. When writing tags via `processFrontMatter`, Obsidian normalizes to a single representation — useful for consistency, but means the round-trip will not preserve the user's original shape.

---

## Event Registration

```typescript
// Vault events
this.registerEvent(this.app.vault.on("create", (file) => { }));
this.registerEvent(this.app.vault.on("modify", (file) => { }));
this.registerEvent(this.app.vault.on("delete", (file) => { }));
this.registerEvent(this.app.vault.on("rename", (file, oldPath) => { }));

// Workspace events
this.registerEvent(this.app.workspace.on("file-open", (file) => { }));
this.registerEvent(this.app.workspace.on("active-leaf-change", (leaf) => { }));
this.registerEvent(this.app.workspace.on("layout-change", () => { }));

// DOM events
this.registerDomEvent(document, "keydown", (evt) => { });
this.registerDomEvent(someEl, "click", this.handler.bind(this));

// NEVER: document.addEventListener — leaks on disable
```

---

## Commands

```typescript
// Basic command
this.addCommand({
  id: "my-command",
  name: "My Command Name",
  callback: () => { this.doThing(); },
});

// Editor command (only available with an open editor)
this.addCommand({
  id: "insert-text",
  name: "Insert Text at Cursor",
  editorCallback: (editor, view) => {
    editor.replaceSelection("inserted text");
  },
});

// Conditional command (checkCallback controls visibility)
this.addCommand({
  id: "context-command",
  name: "Context Command",
  checkCallback: (checking) => {
    const file = this.app.workspace.getActiveFile();
    if (!file) return false;       // not available — hide from palette
    if (checking) return true;     // available — show in palette
    this.doThingWith(file);        // execute
  },
});

// With hotkey suggestion
this.addCommand({
  id: "quick-action",
  name: "Quick Action",
  hotkeys: [{ modifiers: ["Mod", "Shift"], key: "p" }],
  callback: () => { this.doThing(); },
});
```

### Three Callback Types — Pick Deliberately

Obsidian's `addCommand` accepts exactly one callback shape per command. Picking the wrong one breaks the command palette's filtering and visibility:

| Shape | When to pick | Effect on palette |
|---|---|---|
| `callback: () => void` | Command always runs (no preconditions) | Always visible |
| `checkCallback: (checking: boolean) => boolean \| void` | Conditional — depends on workspace state | Hidden when `checking=true` returns `false` |
| `editorCallback: (editor: Editor, view: MarkdownView) => void` | Needs an active markdown editor | Auto-hidden when no markdown view is active |

`checkCallback` is the trickiest: Obsidian invokes it twice. First with `checking=true` to ask "is this command available right now?" — return `true`/`false` to control palette visibility. Then if true and the user actually invokes it, with `checking=false` to execute. The execute branch can return nothing.

```typescript
this.addCommand({
  id: "summarise-selection",
  name: "Summarise selection",
  checkCallback: (checking) => {
    const editor = this.app.workspace.activeEditor?.editor;
    if (!editor || !editor.somethingSelected()) return false;
    if (checking) return true;
    this.summarise(editor.getSelection());
  },
});
```

Common mistakes:
- Using `callback` for editor-dependent commands → command always shows but throws when no editor.
- Using `checkCallback` but always returning `true` regardless of state → no filtering, defeats the point.
- Using `editorCallback` for commands that work with any leaf type → command vanishes for users in other view types.

### Default Hotkeys — Don't

The `hotkeys: [...]` field is a **suggestion** Obsidian applies on first install. Setting it conflicts with other plugins and overrides any mapping the user already configured for that key. Omit it entirely; users can assign hotkeys via Settings → Hotkeys after install. The exception: shipping a plugin meant exclusively for personal use where you control all installs.

---

## Settings

```typescript
interface MyPluginSettings {
  apiKey: string;
  maxResults: number;
  enabled: boolean;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
  apiKey: "",
  maxResults: 10,
  enabled: true,
};

// In Plugin class
async loadSettings() {
  this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
}
async saveSettings() {
  await this.saveData(this.settings);
}
```

```typescript
// Settings Tab
import { App, PluginSettingTab, Setting } from "obsidian";

class MySettingTab extends PluginSettingTab {
  constructor(app: App, private plugin: MyPlugin) { super(app, plugin); }

  display() {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl)
      .setName("API Key")
      .setDesc("Your API key from the service dashboard.")
      .addText((text) =>
        text.setPlaceholder("sk-...")
          .setValue(this.plugin.settings.apiKey)
          .onChange(async (value) => {
            this.plugin.settings.apiKey = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Max Results")
      .addSlider((slider) =>
        slider.setLimits(1, 50, 1)
          .setValue(this.plugin.settings.maxResults)
          .setDynamicTooltip()
          .onChange(async (value) => {
            this.plugin.settings.maxResults = value;
            await this.plugin.saveSettings();
          })
      );
  }
}
```

### See Also: UI Conventions

Settings-tab heading style (`Setting.setHeading()` over raw `<h2>`), sentence-case copy, the `SettingGroup` API (Obsidian 1.11.0+), and the `SecretStorage` / `SecretComponent` flow for keys and tokens (1.11.4+) are documented in `reference/ui-conventions.md`. Load that file when designing or auditing the user-facing surface of a settings tab or any code path that persists secrets.

---

## Vault Operations

```typescript
// Read
const content = await this.app.vault.read(file);          // TFile object
const content = await this.app.vault.cachedRead(file);    // faster, may be stale

// Write
await this.app.vault.modify(file, newContent);            // update existing
await this.app.vault.create("path/to/new.md", content);   // create new
await this.app.vault.createBinary("img.png", buffer);     // binary

// Check existence
const abstract = this.app.vault.getAbstractFileByPath("some/file.md");
if (abstract instanceof TFile) { /* file */ }
if (abstract instanceof TFolder) { /* folder */ }

// Create folder if missing
if (!this.app.vault.getAbstractFileByPath("myfolder")) {
  await this.app.vault.createFolder("myfolder");
}

// All markdown files
const files = this.app.vault.getMarkdownFiles();

// NEVER: require("fs") — bypasses Obsidian cache and sync
```

### Don't Iterate for Path Lookup

`vault.getFileByPath` / `getFolderByPath` / `getAbstractFileByPath` are constant-time lookups against an in-memory index. `vault.getFiles().find(f => f.path === path)` is O(n) — every call walks the whole vault. At 10k+ notes the difference is several ms per call, which compounds quickly inside change listeners or batched ops.

```typescript
// Wrong — linear scan per call
const file = this.app.vault.getFiles().find((f) => f.path === path);

// Right — indexed lookup
const file = this.app.vault.getFileByPath(path);                  // TFile | null
const folder = this.app.vault.getFolderByPath(path);              // TFolder | null
const af = this.app.vault.getAbstractFileByPath(path);            // TFile | TFolder | null
```

The same applies to filtered enumerations: if you need "all PDFs," prefer `getFiles()` once and filter once, not `getFiles().filter` in a hot loop.

---

## Workspace API

```typescript
// Active file
const file = this.app.workspace.getActiveFile();

// Open a file
await this.app.workspace.openLinkText("note-name", "", false);  // current leaf
await this.app.workspace.openLinkText("note-name", "", true);   // new leaf

// Get/create a leaf in side panel
const leaf = this.app.workspace.getRightLeaf(false);
await leaf.setViewState({ type: "my-view-type" });
this.app.workspace.revealLeaf(leaf);

// Active editor
const view = this.app.workspace.getActiveViewOfType(MarkdownView);
if (view) {
  const editor = view.editor;
  editor.replaceSelection("text");
  const { line } = editor.getCursor();
  editor.setLine(line, "new content");
}
```

### Avoid `workspace.activeLeaf`

`workspace.activeLeaf` exists but is unreliable: it can be `null`, can point at a non-markdown view (canvas, base, custom plugin view), and its identity is the framework's, not yours — using it as a key for "the user's working file" is wrong. Two safer entry points cover almost all real cases:

```typescript
// "I want the active markdown view" — typed, null-safe
const view = this.app.workspace.getActiveViewOfType(MarkdownView);
if (!view) return;

// "I want whatever editor is active right now" — works in Markdown + Canvas etc.
const editor = this.app.workspace.activeEditor?.editor;
if (!editor) return;

// "I want the active file" — also works without an editor (e.g. PDF view)
const file = this.app.workspace.getActiveFile();
```

`getActiveViewOfType(T)` accepts any view subclass. Pass your own `ItemView` subclass to scope to your plugin's leaves. If you find yourself reaching for `activeLeaf` to inspect leaf identity for layout work, the right tool is usually `getLeavesOfType(VIEW_TYPE)` (see Custom Views).

---

## Custom Views

```typescript
import { ItemView, WorkspaceLeaf } from "obsidian";

export const VIEW_TYPE = "my-plugin-view";

class MyView extends ItemView {
  getViewType() { return VIEW_TYPE; }
  getDisplayText() { return "My Plugin"; }

  async onOpen() {
    const container = this.containerEl.children[1];
    container.empty();
    container.createEl("h4", { text: "My Plugin" });
  }

  async onClose() { /* cleanup */ }
}

// In Plugin.onload():
this.registerView(VIEW_TYPE, (leaf) => new MyView(leaf));

// Activate
async activateView() {
  const { workspace } = this.app;
  let leaf = workspace.getLeavesOfType(VIEW_TYPE)[0];
  if (!leaf) {
    leaf = workspace.getRightLeaf(false);
    await leaf.setViewState({ type: VIEW_TYPE, active: true });
  }
  workspace.revealLeaf(leaf);
}
```

### Don't Store View References on the Plugin

A common bug: capturing the view instance in the `registerView` factory so the plugin can "talk to" it later.

```typescript
// Wrong — leaks across reloads, breaks multi-leaf usage
this.registerView(VIEW_TYPE, () => {
  this.view = new MyView(/* leaf? — not in scope */);
  return this.view;
});

// Right — factory takes the leaf, plugin doesn't hold the reference
this.registerView(VIEW_TYPE, (leaf) => new MyView(leaf));
```

Two distinct problems with the wrong form:
1. **Memory leak across plugin reload.** Disabling the plugin clears Obsidian's leaf references but the plugin instance's `this.view` keeps the view alive (along with its DOM, listeners, and any state it captured). On re-enable, a new instance is created and the old one is now unreachable garbage.
2. **Wrong with multiple leaves.** Users can split a leaf or drag the same view into multiple panes. `this.view` only ever holds the most recent one; mutations against it desync the others.

The right access pattern is to ask the workspace for live instances when you need them:

```typescript
for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE)) {
  if (leaf.view instanceof MyView) {
    leaf.view.refresh();
  }
}
```

### Don't `detachLeavesOfType` in `onunload`

A frequent pattern in older sample plugins:

```typescript
// Wrong — closes the user's leaves on every plugin update
onunload() {
  this.app.workspace.detachLeavesOfType(VIEW_TYPE);
}
```

Plugin updates trigger an unload + reload cycle. If `onunload` detaches all leaves of your view type, every plugin update silently closes whatever the user had open in your view, costing them their place in any session-state the view was holding. Obsidian's leaf-restoration mechanism can re-create leaves at their last known position when the plugin re-registers the view type — but only if you don't actively detach them.

The right behaviour: `onunload` cleans up resources you manage manually (timers, file handles, websocket connections) and lets Obsidian handle leaf cleanup. The view's own `onClose()` is where per-leaf teardown lives.

The exception is when the user explicitly disables the plugin (not when it's auto-reloaded for an update). There's no API surface that distinguishes these cleanly, so the safe default is: never detach.

---

## Notices and Modals

```typescript
import { Notice, Modal, Setting } from "obsidian";

new Notice("Done!", 4000);    // 4s
new Notice("Error!", 0);      // stays until dismissed

class ConfirmModal extends Modal {
  constructor(app: App, private onConfirm: () => void) { super(app); }

  onOpen() {
    const { contentEl } = this;
    contentEl.createEl("h2", { text: "Confirm?" });
    new Setting(contentEl)
      .addButton((btn) => btn.setButtonText("Confirm").setCta()
        .onClick(() => { this.close(); this.onConfirm(); }))
      .addButton((btn) => btn.setButtonText("Cancel")
        .onClick(() => this.close()));
  }

  onClose() { this.contentEl.empty(); }
}

new ConfirmModal(this.app, () => this.doThing()).open();
```

**A `SuggestModal` is not a `.modal` (observed on 1.15.0).** It renders as `.modal-container > .prompt`: no `.modal` element, no visible title (`setTitle` is not shown), no close button. Code or tests that look for `.modal` never find it. Probe `.prompt` too and identify it by its input's placeholder; close it with Escape from its input or a click on `.modal-bg`.

---

## Mobile Compatibility

```typescript
import { Platform } from "obsidian";

if (Platform.isMobile) { /* mobile-only */ }
if (Platform.isDesktop) { /* can use Node.js APIs */ }

// Guard Node.js-only APIs
if (Platform.isDesktop) {
  const { exec } = require("child_process");
}

// These crash on mobile without guard:
// require("fs"), require("path"), require("child_process")
```

Set `isDesktopOnly: true` in manifest.json ONLY if you have unguarded Node.js API usage.

### Body Classes for CSS Styling

Obsidian sets classes on `<body>` describing the platform — use them in `styles.css` instead of running JS feature-checks:

| Class | Set when |
|---|---|
| `.is-mobile` | Any mobile device (iOS or Android) |
| `.is-tablet` | Mobile device with tablet form factor |
| `.is-phone` | Mobile device with phone form factor |
| `.is-ios` | iOS specifically (combines with `.is-mobile`) |
| `.mod-windows` | Desktop on Windows |
| `.mod-macos` | Desktop on macOS |
| `.mod-linux` | Desktop on Linux |

**Two critical absences:**
- **There is no `.is-desktop` class.** Target desktop with `:not(.is-mobile)`.
- **There is no `.mod-ios` or `.mod-android`.** For iOS use `.is-ios`. For Android use `.is-mobile:not(.is-ios)`.

```css
/* Desktop-only sidebar width */
body:not(.is-mobile) .myplugin-sidebar { width: 320px; }

/* Mobile: full-width, fixed */
.is-mobile .myplugin-sidebar { width: 100%; position: fixed; }

/* iOS-specific scroll fix */
.is-mobile.is-ios .myplugin-pane { -webkit-overflow-scrolling: touch; }

/* Android-specific (no .is-android exists) */
.is-mobile:not(.is-ios) .myplugin-pane { /* ... */ }

/* macOS traffic-light gutter */
.mod-macos .myplugin-titlebar { padding-left: 80px; }
```

### Touch Target Minima

On mobile, interactive elements (buttons, ribbon icons, list-row tap targets) need a minimum hit area of **44×44 px**. Below that, mistapping rates climb sharply on phone-form-factor screens. Use padding and `min-width` / `min-height` on the *interactive element*, not its child text/icon. Hover states aren't reliable on touch — provide a clear non-hover affordance (color change, ripple, immediate state transition) for any tap-driven action.

### `addStatusBarItem` Is Desktop-Only

`this.addStatusBarItem()` is a no-op on mobile — Obsidian Mobile has no status bar. If status-bar text is the *only* surface a feature uses, the feature is silently absent on mobile. Either provide a parallel mobile surface (a ribbon icon, a command, a small floating UI), gate the feature with `Platform.isMobile`, or document that this feature is desktop-only.

---

## Timers and Intervals

```typescript
// Registered interval — auto-cancelled on disable
this.registerInterval(window.setInterval(() => this.poll(), 30_000));

// Manual timeout — track and clear in onunload
private timeout: ReturnType<typeof setTimeout> | null = null;

onload() { this.timeout = setTimeout(() => this.init(), 1000); }

onunload() {
  if (this.timeout !== null) { clearTimeout(this.timeout); this.timeout = null; }
}

// NEVER: setInterval(...) without registerInterval — leaks on disable
```

---

## CodeMirror 6 Extensions

```typescript
import { ViewPlugin, ViewUpdate } from "@codemirror/view";
import { editorLivePreviewField } from "obsidian";

// Register extension
this.registerEditorExtension(myExtension);

// View plugin
const myPlugin = ViewPlugin.fromClass(class {
  update(update: ViewUpdate) {
    if (update.docChanged || update.viewportChanged) { /* respond */ }
  }
});

// Check live preview vs source mode
const isLivePreview = editorView.state.field(editorLivePreviewField);
```

**Links in widgets: Obsidian already delegates `a.internal-link` (observed on 1.15.0).** An `a.internal-link` rendered inside a CM6 widget gets Obsidian's hover preview and click navigation. Do not add your own fallback hover or click events; they fire twice. Verify with event counts in a live test.

**Syntax-node names: dump them, do not guess.** An extension that must skip code, links and similar constructs matches on the syntax tree's node names. Verify the set with a dev-only command that dumps the names on a sample note containing every construct (inline code, fence, links, embed, math, comment, tag, HTML, frontmatter). On 1.15.0 that gave 41 names, and the substrings `code`, `link`, `url`, `embed`, `frontmatter`, `comment`, `math`, `hashtag` and `html` covered every name to skip.

---

## manifest.json

```json
{
  "id": "my-plugin-id",
  "name": "My Plugin",
  "version": "1.0.0",
  "minAppVersion": "1.0.0",
  "description": "Translate selected text into multiple languages.",
  "author": "Your Name",
  "authorUrl": "https://github.com/yourname",
  "isDesktopOnly": false
}
```

### Field-by-Field Submission Rules

The community-plugin reviewer enforces these on every submission. The **primary path** is now the [community.obsidian.md](https://community.obsidian.md/account/plugins) portal (manual submission per the official docs). The `obsidianmd/obsidian-releases` PR bot remains active as a **legacy/parallel path** — same rule set, different intake. Failing rules surface as **errors** (block submission) or **warnings** (do not block but the reviewer may still require fixes).

**`id`** (required)
- kebab-case, lowercase, unique across all published plugins.
- MUST NOT contain `obsidian` — the directory rejects it (trademark + namespace collision).
- For local development, the `id` should match the plugin's folder name; otherwise some lifecycle hooks like `onExternalSettingsChange` won't fire.

**`name`** (required)
- Display name shown in Community Plugins. Title Case is fine here — it's a product name.
- Avoid the literal word "Obsidian" inside the name — risks trademark confusion under the Developer policy ("don't use the Obsidian trademark in a way that could confuse users into thinking your plugin is a first-party creation").

**`version`** (required)
- Strict semver `x.y.z` — no `v` prefix, no pre-release tags. Obsidian enforces this on updates.

**`minAppVersion`** (required)
- The minimum Obsidian version your plugin actually works on. Test against it. If unsure, use the latest stable Obsidian version at submission time. Do not set artificially low.

**`description`** (required) — most-rejected field
- ≤ 250 characters.
- MUST end with `.` / `!` / `?` / `)` (bot warning if missing).
- MUST NOT contain the word "Obsidian" (redundant in the Community Plugins context, and trademark hygiene).
- MUST NOT contain emoji or special characters.
- MUST NOT start with "This is a plugin" (redundant — every entry in the directory is a plugin).
- SHOULD start with an action verb: "Translate…", "Generate…", "Import…", "Sync…", "Open…".
- Use correct capitalization for trademarks and acronyms: "Markdown", "PDF", "GitHub", "API".

**`author`** (required)
- The author's name. MUST NOT contain an email address — the bot rejects it.
- Use `authorUrl` for a contact / homepage link instead.

**`authorUrl`** (optional)
- URL to the author's website or GitHub profile. This is the right place to expose contact info that was wrongly placed in `author`.

**`fundingUrl`** (optional)
- Single URL or an object map `{ "Label": "url", ... }` for multiple sponsorship destinations.
- Only set if you actually accept financial support (Buy Me A Coffee, GitHub Sponsors, Patreon, etc.). Remove the field entirely otherwise — the submission-requirements doc is explicit.

**`isDesktopOnly`** (required, plugin-only)
- `true` ONLY if the plugin uses Node.js/Electron APIs (`fs`, `path`, `child_process`, `crypto`, `os`, `@electron/remote`) without a `Platform.isDesktop` guard. Setting this hides the plugin from mobile users — only true when there is no mobile-safe path.

### Sample-Plugin Residue

Submissions derived from the sample-plugin template ship with placeholder names that the bot and reviewer flag. Rename before submission:

| Placeholder | Replace with |
|---|---|
| `MyPlugin` (class) | The plugin's actual class name (e.g. `TranslatorPlugin`) |
| `MyPluginSettings` (interface) | `TranslatorSettings` |
| `SampleSettingTab` (class) | `TranslatorSettingTab` |
| Sample `addRibbonIcon`, sample `addCommand`, sample modal | Remove — they exist only to demonstrate the API |
| `console.log` calls left over from the sample | Replace with `console.debug` or remove entirely |

### Pre-Submission Checklist

Before submitting via the [community.obsidian.md](https://community.obsidian.md/account/plugins) portal (primary, manual) — or opening a submission PR against `obsidianmd/obsidian-releases` (legacy/parallel path):

- [ ] `manifest.json` validates against every field rule above.
- [ ] `README.md` exists at repo root and explains purpose + usage.
- [ ] `LICENSE` exists at repo root with a clear license.
- [ ] No `eslint-disable` anywhere in the codebase (see SKILL.md → `LINT_RULE_DISABLED`).
- [ ] No `console.log` — use `console.debug` (bot rejects `console.log`; DevTools Verbose level shows debug output).
- [ ] No global `app` / `window.app` — always `this.app`.
- [ ] No `innerHTML` / `outerHTML` / `insertAdjacentHTML`.
- [ ] No inline style writes (`el.style.color = ...`) on plugin-rendered DOM.
- [ ] No default `hotkeys: [...]` in `addCommand`.
- [ ] No plugin-id prefix in `addCommand` IDs — Obsidian prefixes automatically.
- [ ] Sample-plugin class names renamed.
- [ ] Plugin tested on the `minAppVersion` declared.
- [ ] GitHub release with `main.js`, `manifest.json`, and optional `styles.css` as **binary attachments** — release tag MUST match `manifest.version` exactly (no `v` prefix).
- [ ] `manifest.json` at the HEAD of the default branch is the version the directory will read on submission — commit it before submitting.
- [ ] *Recommended*: attach a GitHub artifact attestation to `main.js` (and `styles.css` if shipped). The reviewer surfaces a non-blocking **Recommendation** when assets lack attestations — see "Release Asset Attestations" below.

### Release Asset Attestations (Recommended)

The community-plugin reviewer surfaces a non-blocking **Recommendation** when release assets (`main.js`, `styles.css`) have no GitHub artifact attestation:

> *The `main.js` release asset does not have a GitHub artifact attestation. Artifact attestations let users cryptographically verify the provenance of the release assets, proving they were built from the source repository.*

Attestations are not a submission blocker today, but they're cheap to add and the reviewer is actively recommending them — expect this to harden over time.

**How to add them.** Use the GitHub-supplied [`actions/attest-build-provenance`](https://github.com/actions/attest-build-provenance) action in your release workflow, after the build step produces `main.js` and `styles.css`. Minimal sketch:

```yaml
# .github/workflows/release.yml
permissions:
  id-token: write        # required to mint the attestation
  attestations: write    # required to upload it
  contents: write        # to attach assets to the GitHub Release

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
      - run: npm ci
      - run: npm run build   # produces main.js (+ styles.css if applicable)

      - uses: actions/attest-build-provenance@v2
        with:
          subject-path: |
            main.js
            styles.css       # omit if your plugin doesn't ship one

      - uses: softprops/action-gh-release@v2
        with:
          tag_name: ${{ github.ref_name }}
          files: |
            main.js
            manifest.json
            styles.css
```

Key constraints:
- The workflow runs on a public repo (or with the appropriate permissions on private repos) — attestations are publicly verifiable.
- `subject-path` must point at the **same binary file** that is uploaded as the release asset; building twice (e.g. once for attestation, once for upload) produces a hash mismatch and the attestation won't verify.
- The release tag MUST still match `manifest.version` exactly (no `v` prefix) — attestation does not relax that rule.

Users can verify with `gh attestation verify main.js --owner <your-org>` once installed. Full reference: <https://docs.github.com/en/actions/security-for-github-actions/using-artifact-attestations/using-artifact-attestations-to-establish-provenance-for-builds>.

---

## Misc API Gotchas

### Command IDs Are Bare — Obsidian Adds the Plugin Prefix

```typescript
// Correct
this.addCommand({ id: "run-import", name: "Run Import" });

// Wrong — palette shows "MyPlugin: MyPlugin: Run Import"
this.addCommand({ id: "myplugin:run-import", name: "Run Import" });
```

### `console.debug`, Not `console.log`

The Obsidian community-plugin reviewer enforces `console.debug` over `console.log` — whether submission goes through the primary [community.obsidian.md](https://community.obsidian.md/account/plugins) portal (manual) or the legacy/parallel `obsidianmd/obsidian-releases` PR bot. User-facing impact: DevTools hides the Verbose level by default. Document the toggle in support docs (a screenshot of the DevTools log-level dropdown showing Verbose enabled lets users self-diagnose "no debug output" reports).

### Native Dialogs via `@electron/remote`

For folder/file/save pickers outside the vault:

```typescript
async function chooseFolder(): Promise<string | null> {
  try {
    const remote = require("@electron/remote");
    const result = await remote.dialog.showOpenDialog({ properties: ["openDirectory"] });
    return result.canceled ? null : result.filePaths[0];
  } catch {
    new Notice("Native dialogs are unavailable. Paste the folder path into the settings field instead.");
    return null;
  }
}
```

Mark `@electron/remote` and `electron` as `external` in esbuild — neither should be bundled. Future Obsidian builds may disable Electron remote entirely; the Notice fallback keeps the plugin usable when that happens.

### `manifest.dir` Is Typed Optional

Several Obsidian APIs return `manifest.dir` as `string | undefined`. Provide a defensive default at every consumer:

```typescript
const pluginDir = this.manifest.dir ?? `.obsidian/plugins/${this.manifest.id}`;
```

Never observed undefined in current Obsidian builds, but the type permits it and a future build could exercise it.

### `import.meta.url` Is Empty in CJS Bundles

esbuild with `format: "cjs"` does not populate `import.meta.url`. For `createRequire(...)` and other "where am I" code, use `__filename` (the CJS global, valid at runtime in a CJS bundle).

Do **not** disable an ESLint rule to silence the type complaint — disabled rules block community-plugin submission. Instead, declare `__filename` via the project's TypeScript ambient types (`@types/node` in devDependencies covers it) and use it directly:

```typescript
import { createRequire } from "node:module";
const localRequire = createRequire(__filename);
```

If the project deliberately omits `@types/node` to keep the type surface minimal, declare `__filename` locally in a `src/types/runtime-globals.d.ts` ambient file:

```typescript
// runtime-globals.d.ts
declare const __filename: string;
```

Either path keeps every ESLint rule enabled.

### `app.openWithDefaultApp(path)` Is Vault-Relative Only

Passing an OS-absolute path silently re-roots it inside the vault and finds nothing. Convert to vault-relative first; for files outside the vault, fall back to a Notice surfacing the absolute path so the user can navigate manually.

### `requestUrl` Over `fetch`

For HTTP from a plugin, use `requestUrl` from `obsidian` rather than the global `fetch`. `fetch` runs through the renderer's CORS layer, which differs across desktop and mobile and bites cross-origin endpoints that work fine in a node-side test but fail in the running plugin. `requestUrl` bypasses CORS entirely (the request is made by the host, not the renderer), so behaviour is uniform across platforms.

```typescript
import { requestUrl } from "obsidian";

const res = await requestUrl({
  url: "https://api.example.com/v1/things",
  method: "POST",
  headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
  body: JSON.stringify({ q: "search term" }),
  throw: false,                       // do not throw on non-2xx — inspect res.status
});
if (res.status >= 200 && res.status < 300) {
  const data = res.json;              // already parsed
}
```

`requestUrl` returns `{ status, headers, text, json, arrayBuffer }`. The body forms are lazy properties — read whichever you need.

The rare case for keeping `fetch`: streaming responses (server-sent events, large file streams) — `requestUrl` buffers the full body. Mark such call sites with a `// allow-fetch` comment so the audit grep skips them.

### Asset URLs Need `getResourcePath`

Plugin DOM rendering has no notion of "where the plugin is installed." For `<img>`, `<video>`, `<audio>` `src` attributes pointing at files inside the plugin install dir:

```typescript
const pluginDir = this.manifest.dir ?? `.obsidian/plugins/${this.manifest.id}`;
const url = this.app.vault.adapter.getResourcePath(`${pluginDir}/assets/banner.png`);
img.src = `${url}?v=${this.manifest.version}`;  // cache-bust on plugin update
```

### Desktop Settings Open in Their Own Window (observed on 1.15.0)

On desktop the settings render in a separate window; on the phone they render in the main window. As with a popout, settings-tab code that reaches for the global `document` gets the main window's; take the document from `containerEl.ownerDocument`. A screenshot of the main window shows the note behind, not the settings (`live-testing.md` § 6).

### Re-Running Post-Processors in Reading View

After a setting changes what a Markdown post-processor renders, `view.previewMode.rerender(true)` re-runs the post-processors on an open Reading view (works on 1.15.0). Coalesce the calls (a 400 ms trailing debounce) so a burst of changes renders once.

---

## Concurrency Patterns

### `Map<Id, true>` Is Atomic for In-Flight Registries

JS is single-threaded; a synchronous `if (map.has(id)) return false; map.set(id, true);` sequence runs atomically — no Promise lock, no Mutex library. The pattern works for "skip overlapping ticks of the same scheduled rule," "deduplicate concurrent requests by ID," and similar:

```typescript
class InFlightRegistry<K> {
  private set = new Set<K>();
  tryAcquire(key: K): boolean {
    if (this.set.has(key)) return false;
    this.set.add(key);
    return true;
  }
  release(key: K): void { this.set.delete(key); }
}
```

Document the rationale in code so a contributor doesn't add a Mutex out of caution.

### Single Promise Queue for Append-Only Files

When a structured log / audit / event file is mutated from many concurrent code paths, serialize via a private Promise queue:

```typescript
class AppendOnlyLog {
  private queue: Promise<unknown> = Promise.resolve();
  append(entry: string): Promise<void> {
    const next = this.queue.then(() => this.writeLine(entry));
    this.queue = next.catch(() => undefined);  // failure must not poison the chain
    return next;
  }
}
```

This guarantees on-disk byte ordering without fcntl locks or write-once-with-mtime tricks.

### Epoch-Based Cancellation for Callback-Style APIs

When an external library is callback-style and doesn't support `AbortSignal`, threading a cancellation token through every layer is heavyweight. Pattern: hold a monotonic `epoch: number` on the owning class. Every operation captures the epoch on entry; concurrent transitions (disconnect-while-attaching, dispose-while-reconnecting, force-reconnect-while-auto-reconnecting) bump it; the in-flight operation compares its captured epoch against the live one on resolution and bails if they diverge:

```typescript
class Connection {
  private epoch = 0;
  async connect() {
    const myEpoch = ++this.epoch;
    const result = await this.api.connectCb();
    if (myEpoch !== this.epoch) return;  // superseded — abort silently
    this.applyResult(result);
  }
  disconnect() { this.epoch++; /* ...*/ }
}
```

One-line check beats `AbortController` plumbing for this case.

---

## Common Anti-Patterns

| Anti-pattern | Problem | Fix |
|---|---|---|
| `document.addEventListener` | Leaks on disable | `this.registerDomEvent` |
| `activeLeaf.view` without null check | Crashes when no file open | Guard with `if (!leaf)` |
| `setInterval` without `registerInterval` | Leaks on disable | `this.registerInterval(window.setInterval(...))` |
| `require("fs")` without Platform check | Crashes on mobile | Wrap in `if (Platform.isDesktop)` |
| `new Notice` for non-actionable errors | Noise | Only notify when user can act |
| Mutable plugin state that must survive reload | Lost on reload | `this.loadData` / `this.saveData` |
| Raw vault path strings | Breaks on rename | `this.app.vault.getAbstractFileByPath` |
| `setTimeout` without clearing in `onunload` | Memory leak | Track and `clearTimeout` in `onunload` |
| `vault.adapter.writeBinary` on a tracked TFile | Editor cache desync — disk OK, editor stale | `vault.modifyBinary(file, exactBuffer)` |
| `workspace.on('layout-ready', cb)` for first-time setup | Doesn't fire on late-enable | `app.workspace.onLayoutReady(cb)` |
| `workspace.getLeaf(false)` in ribbon handler | Stacks new tab every click | `getLeavesOfType(VIEW_TYPE)[0] ?? getRightLeaf(false)` |
| `el.className = ...` on Obsidian-managed DOM | Overwrites Obsidian's layout classes | `el.addClass` / `removeClass` / `toggleClass` |
| `document.activeElement` | Wrong inside popout windows | `activeDocument.activeElement` |
| Closure capturing `settings` object | Snapshot — never sees updates | Read `plugin.settings.X` at call time |
| Direct write to underlying store next to a wrapper | Wrapper's in-memory cache goes stale | Inject the wrapper, not the store |
| `text.onChange(cb)` for save-as-you-type | Loses last value on blur/tab switch | Add `text.inputEl.addEventListener("input", ...)` |
| Silent `onChange` rejection in settings | Indistinguishable from "save broken" | Always surface validation errors inline |
| `bytes.buffer` from a `subarray` | Writes the entire backing ArrayBuffer | Copy into exact-size buffer first |
| Suppressing self-fired vault events at source | Race-prone, leaks | Window-based / idempotent absorption at sink |
| Two file-menu wirings (explorer + note) | Duplicate handler, double execution | One `workspace.on('file-menu', ...)` covers both |
| `vault.read(file)` then `vault.modify(file, transformed)` | TOCTOU — concurrent writer interleaves | `vault.process(file, current => transformed)` |
| YAML library parse → mutate → stringify on frontmatter | Destroys user's chosen YAML formatting | `app.fileManager.processFrontMatter(file, fm => { ... })` |
| `fm[k] = null` to delete a frontmatter field | Writes literal YAML `null`, not absent | `delete fm[k]` |
| `vault.delete(file)` / `adapter.remove(path)` | Ignores user's trash preference | `app.fileManager.trashFile(file)` |
| `normalizePath(absolutePath)` | Strips leading `/`, re-roots inside vault | Normalize vault-relative segment first, then concatenate |
| Module-scoped counter for unique IDs (`let n = 0`) | Survives plugin disable/enable; collides across plugins | `crypto.randomUUID()` |
| `const { createDiv } = el; createDiv(...)` | Strips `this`-binding | `el.createDiv(...)` directly |
| Reading frontmatter / tags / headings via `vault.read` + parse | Slow at scale — cache already has it | `app.metadataCache.getFileCache(file)?.frontmatter` |
| Treating `tags: a` and `tags: [a]` and `tags: "a,b"` as same shape | Fails for half of real-world vaults | Match flow array, block array, comma-string, scalar — case-insensitive |
| Persisting credentials or per-device state in `data.json` | Replicated by Obsidian Sync to peer devices | Sidecar via `app.vault.adapter.write` |
| `console.log(...)` in plugin code | Bot-rejected on community-plugin PRs | `console.debug(...)` (document Verbose toggle for users) |
| `addCommand({ id: "myplugin:foo", ... })` | Obsidian prepends plugin name → "MyPlugin: MyPlugin: Foo" | Bare ID — `addCommand({ id: "foo", name: "Foo" })` |
| `addEventListener("keydown", ...)` in a modal or view to catch Esc or Mod+Enter | Obsidian's keymap `Scope` consumes the key before DOM listeners (Mod+Enter in a form view observed on 1.15.0) | Esc in a modal: override `onClose()`. Other keys: `this.scope = new Scope(this.app.scope); this.scope.register(["Mod"], "Enter", handler)`, the handler returning `false` to consume |
| `import.meta.url` in CJS bundle | Empty at runtime — esbuild CJS doesn't populate it | `__filename` (CJS global) |
| `app.openWithDefaultApp(absolutePath)` | Re-roots inside vault, file not found | Convert to vault-relative first; Notice fallback for outside-vault |
| `<img src="assets/x.png">` from plugin DOM | No notion of plugin install dir | `app.vault.adapter.getResourcePath(pluginDir + "/" + rel)` |
| Module-scoped state for cross-instance pattern | Survives plugin disable/enable; accumulates ghost handlers | Field-scoped on plugin instance with explicit teardown |
| Bundling `electron` or `@electron/remote` | Bundle bloat; runtime mismatch with Electron host | Mark both as `external` in esbuild |
| `el.innerHTML = userText` / `insertAdjacentHTML(...)` | XSS risk; bypasses Obsidian's DOM helpers | `el.createDiv/createEl/createSpan(opts)` + `el.empty()` to clear |
| Global `app` or `window.app` | Debug-only; may be removed in future Obsidian builds | `this.app` from the plugin instance, or the `App` arg passed to Modal/View/SettingTab |
| `addCommand({ ..., hotkeys: [...] })` | Conflicts with other plugins; overrides user mapping | Omit; let users assign via Settings → Hotkeys |
| `el.style.color = "red"` on plugin DOM | Forces theme authors into `!important` overrides | CSS class with `var(--text-error)` etc. in `styles.css` |
| `workspace.activeLeaf` direct access | Unreliable null + non-markdown leaf types | `getActiveViewOfType(MarkdownView)` / `activeEditor?.editor` / `getActiveFile()` |
| `registerView(TYPE, () => new View())` capturing on `this` | Memory leak on reload + breaks multi-leaf | `registerView(TYPE, leaf => new View(leaf))` + `getLeavesOfType(TYPE)` for access |
| `workspace.detachLeavesOfType(TYPE)` in `onunload` | Closes user's leaves on every plugin update | Don't detach; let Obsidian restore leaves on re-register |
| `getFiles().find(f => f.path === path)` | O(n) per call — slow on large vaults | `getFileByPath` / `getFolderByPath` / `getAbstractFileByPath` |
| `fetch(url)` from a plugin | CORS divergence across desktop/mobile renderers | `requestUrl({ url, ... })` from `obsidian` (renderer bypass; uniform behaviour) |
| `containerEl.createEl("h2", { text })` for settings sections | Document-level styling — themes can't target it | `new Setting(containerEl).setName("...").setHeading()` |
| Title Case in UI text ("Template Folder Location") | Off-house-style; visually inconsistent with native UI | Sentence case ("Template folder location") |
| "Advanced settings" / "Connection settings" headings | Redundant — everything in the tab is a setting | "Advanced" / "Connection" |
| API key / token persisted in `data.json` | Replicated to every Sync-paired device | `SecretStorage` + `SecretComponent`; persist secret ID, not value |
| `"author": "Name <email@…>"` in manifest | Submission bot rejects — email forbidden in `author` | `"author": "Name"` + `"authorUrl": "https://…"` |
| Manifest `description` missing terminal punctuation | Bot warning — must end with `.` / `!` / `?` / `)` | End the sentence with `.` |
| Manifest `description` contains "Obsidian" | Bot warning — redundant in directory context + trademark hygiene | Reword without the word |
| Manifest `description` longer than 250 chars | Bot warning | Shorten to one action-led sentence |
| Manifest `description` contains emoji / special chars | Bot warning | ASCII-only prose |
| Manifest `description` starts with "This is a plugin" | Bot warning — redundant | Lead with an action verb ("Translate…", "Import…") |
| Manifest `id` contains `obsidian` | Directory rejects | Pick a unique kebab-case id without the word |
| `fundingUrl` set without accepting donations | Policy violation — must remove | Delete the field entirely |
| `MyPlugin` / `SampleSettingTab` / `MyPluginSettings` class names | Sample-plugin residue — reviewer flags | Rename to the plugin's actual identity |
| `vault.modify(activeFile, content)` for the current note | Loses cursor, selection, folded ranges | `editor.replaceSelection` / `editor.setLine` via `getActiveViewOfType(MarkdownView)` |
