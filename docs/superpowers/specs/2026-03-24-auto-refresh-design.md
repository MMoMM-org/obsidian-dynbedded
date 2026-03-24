# Auto-Refresh Design — obsidian-dynbedded

**Date:** 2026-03-24
**Branch:** `feature/auto-refresh`
**Status:** Approved

---

## Summary

Add opt-in auto-refresh to dynbedded blocks. All blocks (static and date-based) re-render at a configurable interval. Auto-refresh is disabled by default.

---

## Architecture

### New class: `DynbeddedBlock` (`src/DynbeddedBlock.ts`)

`DynbeddedBlock extends MarkdownRenderChild` encapsulates the render lifecycle for a single code block.

- **Constructor:** `(containerEl: HTMLElement, source: string, app: App, plugin: Dynbedded, ctx: MarkdownPostProcessorContext)` — calls `super(containerEl)`
- **`async onload()`:** awaits initial render via `DynbeddedProcessor.render()`, then — if `autoRefresh` is enabled — registers an interval with `this.registerInterval(window.setInterval(() => this.rerender(), intervalMs))`. The interval is only registered after the first render completes to avoid overlap.
- **`async rerender()`:** clears `this.containerEl` and awaits re-invoke of render logic. The method is async to match `DynbeddedProcessor.render()`.
- **`onunload()`:** intervals registered via `registerInterval` are cancelled automatically by Obsidian; no manual cleanup needed.

### Changes to `DynbeddedProcessor` (`src/DynbeddedProcessor.ts`)

No structural changes required. `render()` is already public and async. It will be called with `this.containerEl` as `el` on each re-render.

### Changes to `main.ts`

`registerMarkdownCodeBlockProcessor` callback creates a `DynbeddedBlock` and passes it to `ctx.addChild()` instead of calling `render()` directly:

```ts
this.registerMarkdownCodeBlockProcessor(Dynbedded.codeBlockKeyword, (source, el, ctx) => {
    ctx.addChild(new DynbeddedBlock(el, source, this.app, this, ctx));
});
```

---

## Settings

### New fields in `DynbeddedSettings`

| Field | Type | Default | Description |
|---|---|---|---|
| `autoRefresh` | `boolean` | `false` | Enable periodic re-render of all dynbedded blocks |
| `refreshIntervalSeconds` | `number` | `60` | Refresh interval in seconds (10–3600) |

### Settings UI order

1. **Enable Silent Mode** — existing toggle
2. **Enable Auto-Refresh** — new toggle (default off)
3. **Refresh Interval** — number input (seconds, 10–3600), always visible, disabled when auto-refresh is off
4. `———` horizontal separator (`containerEl.createEl('hr')`)
5. **Developer Settings** header — existing
6. **Enable Debug Logging** — existing toggle

The interval input uses `setDisabled(!autoRefresh)` to reflect the current toggle state. It also updates dynamically when the toggle changes.

---

## Files Changed

| File | Change |
|---|---|
| `src/DynbeddedBlock.ts` | New — `DynbeddedBlock extends MarkdownRenderChild` |
| `src/DynbeddedProcessor.ts` | Minor — ensure `render()` works cleanly on repeated calls |
| `src/DynbeddedSettingTab.ts` | Add settings fields, new UI controls, separator line |
| `src/main.ts` | Use `ctx.addChild(new DynbeddedBlock(...))` |

---

## Constraints

- Auto-refresh applies to **all** dynbedded blocks (not just `{{...}}` date blocks)
- Toggle is **off by default** — opt-in
- Interval field is always rendered but disabled when auto-refresh is off
- No global state — each block manages its own timer via `MarkdownRenderChild` lifecycle
- Interval range: 10–3600 seconds; values outside this range are clamped at registration time in `onload()`

## Implementation Notes

- **Interval clamping:** `Math.max(10, Math.min(3600, settings.refreshIntervalSeconds)) * 1000` — silent clamp, no error shown
- **Container clearing:** `containerEl.empty()` clears child nodes; `render()` creates a new inner div on each call — minor visual flicker on re-render is acceptable
- **Error handling in `rerender()`:** no special handling needed — `DynbeddedProcessor.render()` already calls `showError()` (respects `silentMode`); errors surface the same way as on initial load
- **Double-load guard:** not needed — Obsidian creates a new `DynbeddedBlock` instance per block per render cycle; `onload()` is called exactly once per instance

## Settings Change Behaviour

Changing `autoRefresh` or `refreshIntervalSeconds` in settings does **not** affect currently running blocks — changes take effect when the note is closed and reopened (blocks are created at render time). This is acceptable for v1 and avoids complex live-reload logic.
