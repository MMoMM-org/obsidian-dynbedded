# Auto-Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add opt-in auto-refresh to all dynbedded blocks — each block re-renders at a configurable interval, managed via Obsidian's `MarkdownRenderChild` lifecycle.

**Architecture:** A new `DynbeddedBlock extends MarkdownRenderChild` class owns the render lifecycle. `onload()` runs the first render and registers an interval; Obsidian clears the interval automatically on `onunload()`. Settings add `autoRefresh: boolean` (default `false`) and `refreshIntervalSeconds: number` (default `60`).

**Tech Stack:** TypeScript 5, Obsidian API (`MarkdownRenderChild`, `registerInterval`, `ctx.addChild`), esbuild 0.27

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/DynbeddedBlock.ts` | **Create** | `MarkdownRenderChild` subclass — owns render lifecycle + interval |
| `src/DynbeddedSettingTab.ts` | **Modify** | Add `autoRefresh` + `refreshIntervalSeconds` fields and UI |
| `src/main.ts` | **Modify** | Wire `ctx.addChild(new DynbeddedBlock(...))` |
| `src/DynbeddedProcessor.ts` | **No change** | `render()` already public and async |

---

## Task 1: Create feature branch

**Files:** none

- [ ] **Step 1: Create and checkout branch**

```bash
git checkout -b feature/auto-refresh
```

Expected: `Switched to a new branch 'feature/auto-refresh'`

---

## Task 2: Add settings fields

**Files:**
- Modify: `src/DynbeddedSettingTab.ts`

The `DynbeddedSettings` interface and `DEFAULT_SETTINGS` live in this file (lines 5–13). Add two new fields.

- [ ] **Step 1: Add fields to the interface**

In `DynbeddedSettingTab.ts`, extend the interface:

```ts
export interface DynbeddedSettings {
	debugLogging: boolean;
	silentMode: boolean;
	autoRefresh: boolean;
	refreshIntervalSeconds: number;
}
```

- [ ] **Step 2: Add defaults**

```ts
export const DEFAULT_SETTINGS = {
	debugLogging: false,
	silentMode: false,
	autoRefresh: false,
	refreshIntervalSeconds: 60,
};
```

- [ ] **Step 3: Type-check**

```bash
npm run build:dev
```

Expected: no TypeScript errors, build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/DynbeddedSettingTab.ts
git commit -m "feat: add autoRefresh and refreshIntervalSeconds settings fields"
```

---

## Task 3: Update Settings UI

**Files:**
- Modify: `src/DynbeddedSettingTab.ts` (the `display()` method, currently lines 24–80)

The current settings UI order is: Silent Mode → Developer Settings header → Debug Logging.
New order: Silent Mode → Auto-Refresh toggle → Refresh Interval input → `<hr>` → Developer Settings header → Debug Logging.

- [ ] **Step 1: Add Auto-Refresh toggle after Silent Mode**

After the existing `silentMode` Setting block (ends around line 65), add:

```ts
new Setting(containerEl)
    .setName('Enable Auto-Refresh')
    .setDesc('Automatically re-render dynbedded blocks at a set interval. Changes take effect when the note is reopened.')
    .addToggle(toggle =>
        toggle.setValue(this.plugin.settings.autoRefresh).onChange(async value => {
            this.plugin.log("Auto Refresh", value);
            this.plugin.settings.autoRefresh = value;
            await this.plugin.saveSettings();
            intervalSetting.setDisabled(!value);
        })
    );
```

Note: `intervalSetting` is declared in the next step — declare it with `let` before this block so both can reference it:

```ts
let intervalSetting: Setting;
```

- [ ] **Step 2: Add Refresh Interval input**

Immediately after the toggle:

```ts
intervalSetting = new Setting(containerEl)
    .setName('Refresh Interval (seconds)')
    .setDesc('How often to re-render dynbedded blocks (10–3600 seconds).')
    .addText(text =>
        text
            .setValue(String(this.plugin.settings.refreshIntervalSeconds))
            .onChange(async value => {
                const parsed = parseInt(value, 10);
                if (!isNaN(parsed)) {
                    this.plugin.settings.refreshIntervalSeconds = Math.max(10, Math.min(3600, parsed));
                    await this.plugin.saveSettings();
                }
            })
    );
intervalSetting.setDisabled(!this.plugin.settings.autoRefresh);
```

- [ ] **Step 3: Add separator line before Developer Settings**

Replace the existing `containerEl.createEl('h3', { text: 'Developer Settings' });` line with:

```ts
containerEl.createEl('hr');
containerEl.createEl('h3', { text: 'Developer Settings' });
```

- [ ] **Step 4: Type-check and build**

```bash
npm run build:dev
```

Expected: no TypeScript errors, build succeeds.

- [ ] **Step 5: Manual verification in Obsidian**
  - Open `Dynbedded/` vault in Obsidian
  - Go to Settings → Community Plugins → Dynbedded
  - Verify: Auto-Refresh toggle appears between Silent Mode and the separator line
  - Verify: Refresh Interval input is disabled by default (toggle is off)
  - Enable Auto-Refresh → Refresh Interval input becomes enabled
  - Disable Auto-Refresh → Refresh Interval input becomes disabled again
  - Verify: separator line appears above "Developer Settings"

- [ ] **Step 6: Commit**

```bash
git add src/DynbeddedSettingTab.ts
git commit -m "feat: add auto-refresh settings UI with separator line"
```

---

## Task 4: Create `DynbeddedBlock`

**Files:**
- Create: `src/DynbeddedBlock.ts`

This class wires together the `MarkdownRenderChild` lifecycle with the existing `DynbeddedProcessor.render()`.

- [ ] **Step 1: Create the file**

```ts
import { App, MarkdownPostProcessorContext, MarkdownRenderChild } from 'obsidian';
import Dynbedded from './main';
import { DynbeddedProcessor } from './DynbeddedProcessor';

export class DynbeddedBlock extends MarkdownRenderChild {
    private source: string;
    private app: App;
    private plugin: Dynbedded;
    private ctx: MarkdownPostProcessorContext;
    private processor: DynbeddedProcessor;

    constructor(
        containerEl: HTMLElement,
        source: string,
        app: App,
        plugin: Dynbedded,
        ctx: MarkdownPostProcessorContext
    ) {
        super(containerEl);
        this.source = source;
        this.app = app;
        this.plugin = plugin;
        this.ctx = ctx;
        this.processor = new DynbeddedProcessor(app, plugin);
    }

    async onload() {
        await this.processor.render(this.source, this.containerEl, this.ctx);

        if (this.plugin.settings.autoRefresh) {
            const intervalMs = Math.max(10, Math.min(3600, this.plugin.settings.refreshIntervalSeconds)) * 1000;
            this.registerInterval(window.setInterval(() => this.rerender(), intervalMs));
        }
    }

    private async rerender() {
        this.containerEl.empty();
        await this.processor.render(this.source, this.containerEl, this.ctx);
    }
}
```

- [ ] **Step 2: Type-check and build**

```bash
npm run build:dev
```

Expected: no TypeScript errors, build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/DynbeddedBlock.ts
git commit -m "feat: add DynbeddedBlock MarkdownRenderChild with auto-refresh interval"
```

---

## Task 5: Wire `DynbeddedBlock` into `main.ts`

**Files:**
- Modify: `src/main.ts`

Currently `main.ts` calls `this.dynbeddedProcessor.render(source, el, ctx)` directly in the `registerMarkdownCodeBlockProcessor` callback (line 38). Replace with `ctx.addChild(new DynbeddedBlock(...))`.

- [ ] **Step 1: Add import**

At the top of `main.ts`, add:

```ts
import { DynbeddedBlock } from './DynbeddedBlock';
```

- [ ] **Step 2: Replace the processor call**

Replace:
```ts
this.registerMarkdownCodeBlockProcessor(Dynbedded.codeBlockKeyword, async (source, el, ctx) => {this.dynbeddedProcessor.render(source,el, ctx)});
```

With:
```ts
this.registerMarkdownCodeBlockProcessor(Dynbedded.codeBlockKeyword, async (source, el, ctx) => {
    ctx.addChild(new DynbeddedBlock(el, source, this.app, this, ctx));
});
```

- [ ] **Step 3: Remove now-unused `dynbeddedProcessor` field**

The `dynbeddedProcessor: DynbeddedProcessor` field on line 26 and its initialisation on line 32 are no longer needed. Remove both:

```ts
// Remove this line:
dynbeddedProcessor: DynbeddedProcessor;

// Remove this line:
this.dynbeddedProcessor = new DynbeddedProcessor(this.app, this);
```

Also remove the `DynbeddedProcessor` import if it is no longer used in `main.ts`.

- [ ] **Step 4: Type-check and build**

```bash
npm run build:dev
```

Expected: no TypeScript errors, build succeeds.

- [ ] **Step 5: Manual verification — basic render (auto-refresh OFF)**
  - Open `Dynbedded/` vault in Obsidian (hot-reload picks up the new build)
  - Open any note containing a `dynbedded` code block
  - Verify: block renders correctly as before
  - Verify: no errors in Obsidian console (open DevTools → Console)

- [ ] **Step 6: Manual verification — auto-refresh ON**
  - In Settings → Dynbedded: enable Auto-Refresh, set interval to 10 seconds
  - Close and reopen a note with a date-based `dynbedded` block (e.g. `[[{{YYYY-MM-DD}}]]`)
  - Open DevTools Console, enable Debug Logging in plugin settings
  - Wait 10+ seconds and observe the console — you should see re-render log entries
  - Verify: no memory errors, no duplicate renders stacking up

- [ ] **Step 7: Commit**

```bash
git add src/main.ts
git commit -m "feat: wire DynbeddedBlock into registerMarkdownCodeBlockProcessor"
```

---

## Task 6: Update TASKS.md

**Files:**
- Modify: `TASKS.md`

Move F-1 from Future Features to Pending Confirmation.

- [ ] **Step 1: Update TASKS.md**

Remove the F-1 section from Future Features. Add to a new Pending Confirmation section (create it if absent):

```markdown
## Pending Confirmation

| Task | Commit |
|------|--------|
| F-1 — Automatic Refresh of Embeds | `feature/auto-refresh` |
```

- [ ] **Step 2: Commit**

```bash
git add TASKS.md
git commit -m "chore: move F-1 auto-refresh to Pending Confirmation"
```

---

## Task 7: Commit design doc

**Files:**
- `docs/superpowers/specs/2026-03-24-auto-refresh-design.md`
- `docs/superpowers/plans/2026-03-24-auto-refresh.md`

- [ ] **Step 1: Commit**

```bash
git add docs/
git commit -m "chore: add auto-refresh design doc and implementation plan"
```
