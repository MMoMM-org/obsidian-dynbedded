# Live Testing: Real Obsidian over CDP

Load this file when building a live-test or screenshot harness for a plugin. `testing-patterns.md`
§ Live Tests covers the discipline: a separate live config, and tests that restore their own
changes. This file covers the build: a mockup registry as the single source of truth, launching
real Obsidian in isolation, driving it over the Chrome DevTools Protocol (CDP), and a verified
screenshot matrix.

> **Proven on:** one plugin's spec cycle, Obsidian 1.15.0 / Electron 43.8 / Chromium 150, on a
> macOS host. Paths and launch flags are unverified on Linux and Windows. The file layout in §9 is
> a starting structure, not a requirement. The harness code is written per plugin from this
> description.

API facts found the same way, which apply to plugin code and not only to tests, live in
`obsidian-api.md` and `ui-conventions.md`. §7 lists them.

---

## 1. The Idea

The UI is approved as a clickable HTML mockup first. The mockup holds a machine-readable registry
of every screen and state, each tagged with the acceptance criteria it covers. Unit tests run
against a behavioural fake of Obsidian. A small set of live tests starts the **real** Obsidian on
a throw-away vault and profile and drives it over CDP. An opt-in screenshot run brings real
Obsidian into every registry state. It captures each state on desktop and phone, in light and
dark, complete enough for a side-by-side review against the mockup and for user documentation.
`npm run live:open` starts the same throw-away Obsidian for inspection by hand.

The code can be written where no Obsidian runs (a container, CI). The live runs happen on a
machine with Obsidian. Whoever reviews a run reads the logs **and looks at the images**.

## 2. Mockup First

- One self-contained `mockups/index.html`. It imitates Obsidian's look with CSS tokens for light
  and dark, and has a sidebar of screens and state tabs.
- A registry inside the HTML is parsed by the tests, so the mockup stays the single source of
  truth:
  ```js
  const SCREENS = [
    { g: "Forms", id: "item", name: "New item", file: "src/ui/forms/…", render: item,
      states: [["empty", "Empty", ["AC-2.1", "AC-2.4"]], ["filled", "Filled", ["AC-3.2"]]],
      notes: ["…"] },
  ];
  ```
- `test/live/mockups.ts` parses `SCREENS` with regexes (`parseMockupScreens`). A unit test checks
  that `SCENARIOS` plus `UNREACHABLE` cover the registry **exactly**. A new mockup state fails the
  build until it is captured or declared unreachable with a reason.
- Spec drift goes back into the mockup, with a decision row in the spec, so the mockup always
  shows what ships. Example: Obsidian renders a SuggestModal without a title, so the mockup's
  picker heading was dropped.
- A mockup state with a data mix (for example item statuses default / update available /
  modified / missing) needs a scenario that **creates that mix with real data**, through the
  plugin's own services. Check the mix in the DOM, so the scenario fails instead of capturing
  "all missing".

## 3. Launching Real Obsidian in Isolation (macOS)

- **Isolation:**
  - A temp vault (`buildVault(files)`) with `.obsidian/community-plugins.json` and the plugin
    build copied in.
  - A temp profile via `--user-data-dir=<tmp>`. Its own `obsidian.json` lists only that vault,
    marked open, and sets `updateDisabled: true`.
  - The real profile is never read or written. The temp profile has its own single-instance
    lock, so the user's normal Obsidian keeps running.
- **Restricted mode:**
  - Set `localStorage["enable-plugin-<app.appId>"]` in the temp profile and reload.
  - Fallback: `app.plugins.setEnable(true)` plus `enablePlugin(id)`.
- **CDP:**
  - `--remote-debugging-port=<free port>` on localhost.
  - Node 22's built-in `WebSocket` as the client, with no dependency. Send no `Origin` header,
    otherwise Chromium answers 403.
  - `Runtime.evaluate` with `awaitPromise` and `returnByValue`.
- **Window size and position:**
  - `require("@electron/remote").getCurrentWindow()`, then leave fullscreen and un-maximize,
    wait about 300 ms, then `setBounds({ x: workArea.x, y: workArea.y, width, height })`. The
    work area comes from `screen.getDisplayMatching(bounds).workArea`. Never make the window
    larger than the work area.
  - Result on a 1920×1200 screen: inner 1920×1170 at 0,30, below the menu bar. Without placement
    the window starts centred, and growing it pushes the right side off-screen.
  - Fallback: `window.moveTo(availLeft, availTop)` plus `resizeTo`.
  - Log which way worked: `[live] window 1920x1200 via BrowserWindow.setBounds (inner …) at x,y`.
  - Make the size one constant with an env override (`<PLUGIN>_LIVE_WINDOW=WIDTHxHEIGHT`).
- **Cleanup:**
  - SIGTERM, then SIGKILL after 10 s, then delete only the temp dirs the harness created.
  - An emergency handler covers SIGINT, SIGTERM and exit.
  - A `session.exited` promise notices that the user quit Obsidian.
- **Version pinning:**
  - A fresh profile runs the version **bundled with the installer**; an `obsidian-x.y.z.asar` in
    the profile only upgrades (§7).
  - `OBSIDIAN_EXPECT_VERSION` makes the launch fail on a mismatch.
  - Make `minAppVersion` equal to the version you actually test.
  - A script that fetches an asar: https only, a GitHub host allowlist checked on every redirect
    hop, timeouts, size caps.
- **One Obsidian at a time:** vitest `fileParallelism: false`.
- **Logs:**
  - The terminal shows progress only.
  - `test/live/output/live-<ts>.log` holds every result, stack, `[live] …` line and failure probe.
  - `obsidian-<ts>-<pid>-<n>.log` holds each launch's stdout and stderr.
- **Opt-in flags:**
  - `<PLUGIN>_LIVE_SCREENSHOTS=1`: the screenshot run.
  - `<PLUGIN>_LIVE_PERF=1`: perf runs, only on the user's go. They are indicators, never a gate.
  - `<PLUGIN>_LIVE_DEV=1`: a dev build with diagnostic commands (for example a syntax-node dump).
  - Without an Obsidian binary (container or CI) everything skips and the run exits 0.

## 4. Inspect by Hand: `live:open`

```
npm run build && npm run live:open      # screenshot vault with all sample notes
npm run live:open -- --empty            # empty vault → the plugin's first-run dialog
npm run live:open -- --keep             # keep the temp vault afterwards, print its path
```

- It launches exactly like the tests: temp profile, trusted vault, plugin from `build/`, version
  check, window sized and placed.
- It stays open until Ctrl-C or until Obsidian is quit, then cleans up. The profile is always
  removed.
- It does not build.
- It runs through `vite-node`, a transitive dependency of vitest. Declare it in devDependencies
  if your package manager does not hoist it.
- Use it when a screenshot looks wrong, **before** fixing anything. In the reference plugin a
  suspected settings layout bug was Obsidian's own layout when checked by hand (see
  `ui-conventions.md` § `SettingGroup`).

## 5. Driver and Page Snippets

- Every DOM interaction is a self-contained JS expression string (`test/live/page.ts`) evaluated
  in the page, starting from a shared prelude (`__text`, `__visible`, `__name`, …).
- The snippets are **unit-tested in jsdom** (`test/live-unit/page.test.ts`).
  `globalThis.__laidOut` replaces layout checks there.
- **Regex escapes inside template literals:** `split(/\s+/)` in a plain `` `…` `` reaches the
  page as `/s+/` and splits on the letter "s". Put helpers in a `String.raw` prelude, or write
  `\\s`, and prove it with a jsdom test.
- `Driver` waits: `until(probe, accept, what, timeout)`, `untilModal`, `untilPrompt(placeholder)`,
  `untilForm`.
- `Driver` actions: `click`, `setField`, `open(note, mode)`, `command(id)`, `openSettings`,
  `closeSettings`, `closeAll`.
- A failed wait prints what it expected, the last value seen, and a window probe: modals and
  prompts, settings, active leaf and all leaves, notices, body classes, index state, mobile
  emulation.
- `DOCUMENTS` covers every live document: the main window, `activeDocument`,
  `app.setting.containerEl.ownerDocument`, popouts. It skips documents of closed windows, which
  still keep their elements.
- **Wait on something unique.** "Settings rows exist" is true for every settings tab. Wait for
  your own tab, for example your header class or the active nav item name, and share that one
  predicate.
- Log **which strategy worked** when there are fallbacks. Delete the unused ones once the log
  proves them unnecessary.
- **Never read a file once right after an action.** Settings saves and the like are
  asynchronous; poll with `until`. A rename test that read `data.json` once flaked in 1 of 6 runs.

## 6. Screenshot Run

- One `it` per registry state. The title carries the `screen:state` key and its AC ids, so
  traceability counts it.
- **Devices:**
  - Desktop: 1920×1200 at DPR 1 (the user's screen size).
  - Phone: `app.emulateMobile(true)` plus 390×844 at DPR 2.
- **Capture the right window.** Desktop settings have their own window (`obsidian-api.md` § Misc
  API Gotchas). Mark that window's `<html>` (`data-capture=<token>`), find its CDP page target
  from `/json/list`, open a client there, and set metrics and take the screenshot there. Always
  close that client and remove the mark. Fail when the window cannot be found.
- **Full content, no blank bands:**
  - Measure where the content **really ends**: the bottom of the last laid-out element with its
    own text, media or form control, or with a background or border. Exclude CodeMirror and
    preview structure such as gutters and sizers.
  - Do **not** use `scrollHeight` (§7).
  - For `.cm-scroller` and `.markdown-preview-view` also take the sizer height minus its bottom
    padding, because virtualised lines are not in the DOM.
  - Grow the viewport height to fit, in two passes. Reset it in `finally` after the capture.
  - Cap at Chromium's limit of about **16000 device px**: 16000 CSS px on desktop, 8000 on the
    phone. Beyond that, scroll the overflowing scroller and capture tiles (`-p2.png`, …). Never
    truncate silently.
  - A scenario can opt out (`fit: "none"`), for example a deliberately huge note.
  - Judge "cut off" without a margin (`content > client + 1`). A margin turns flush content into
    false failures.
  - **Wait for animations before measuring:** up to about 2 s, until no finite animation runs.
    Ignore infinite ones such as cursor blink or spinners.
  - **Measure only visible content:** skip elements entirely outside the scroller's horizontal
    box, and hidden or transparent ones (`checkVisibility({ visibilityProperty, opacityProperty })`).
  - **Clip to inner scrolling panes.** Cap each element's bottom at every ancestor with
    `overflow-y` other than `visible` between it and the measured scroller.
  - Only a box that clips (`overflow-y` not `visible`) can cut off content. The failure message
    names the element (`div.modal overflows by N px …`).
- **Themes:**
  - `app.changeTheme("moonstone" | "obsidian")` plus body classes, then wait until the class and
    the computed background luminance are stable.
  - That is still not enough (§7): decode the PNG (zlib plus the five row filters, no dependency)
    and check its mean brightness on a row×column **grid**. A flat index step aliases with the
    width.
  - Measured: light 221–255, dark ≤ 47. Thresholds: dark < 110, light > 140.
  - Wait two `requestAnimationFrame`s before each shot. Retake up to 3 times, else fail with the
    measured value and write no image.
- **Scenarios:**
  - One async function per state. Every change registers its undo **before** making it
    (`ui.onCleanup`).
  - The undo stack drains in reverse **even when the scenario threw**. What was on screen is
    still captured.
- `UNREACHABLE` lists states that would need app-wide patches, each with a reason. Allow
  device-scoped keys (`<screen>:hover@mobile`: phones have no hover).
- Before each scenario `closeAll()` tries, in order:
  1. close buttons;
  2. Escape, sent from inside a prompt's input;
  3. a `.modal-bg` click.

  Then it **verifies nothing is left** and otherwise throws with the names. One leak fails once
  instead of poisoning every later capture.
- `manifest.json` records per capture: files, tiles, viewport height and capping, and brightness
  and attempt for every shot. Use it to watch the margins.

## 7. Harness Gotchas (Obsidian 1.15.0)

None of these showed up against the fake.

| Symptom | Cause | Fix |
|---|---|---|
| CDP cannot deliver Cmd+Enter on macOS | Chromium/Electron limitation | Also dispatch the keydown on the focused element. A real Cmd+Enter with an IME stays a manual device check |
| `Browser.getWindowForTarget` "wasn't found" | Electron does not expose the Browser domain on page sessions | Size and place via `@electron/remote` `setBounds` (§3) |
| Settings search typed, but the page stayed on "General" | Search shows a result list; a setting appears only after its result is clicked | `el.click()` on `.setting-search-result-item`, ranked: plugin group → exact → prefix |
| Some "dark" captures were light | `changeTheme` is asynchronous; a late light switch wins, and DOM checks can pass on a stale frame | Verify the PNG pixels and retake (§6 Themes) |
| Captures cut off, or with blank bands | Fixed viewport; `scrollHeight` includes Obsidian's scroll-past-end padding, which grows with the viewport | Fit to the measured content, cap at the device-px limit, then tile (§6) |
| Settings sub-page captured with a huge blank band (a short page came out 4263 px tall) | The sub-page slides in sideways; the main list is still laid out beside it mid-animation | Wait for finite animations; skip content outside the scroller's horizontal box |
| A dialog with a scrolling diff pane "overflows" | Lines inside an inner `overflow: auto` pane were measured at their real position | Clip measured bottoms at inner clipping ancestors |
| Hover preview times out on the phone | Phones have no hover | Mark the state unreachable on mobile only |
| A 1.10 installer plus a 1.15 asar still ran 1.10 | The asar only upgrades the app the installer bundles | Use an installer that bundles the target version |

Plugin-side facts found in the same runs, each in one place:

- Mod+Enter in a view consumed by the keymap → `obsidian-api.md` § Common Anti-Patterns (`Scope` row)
- Index never "ready" on a warm metadata cache → `obsidian-api.md` § Lifecycle Subtleties
- SuggestModal is a `.prompt`, not a `.modal` → `obsidian-api.md` § Notices and Modals
- Desktop settings open in their own window → `obsidian-api.md` § Misc API Gotchas
- Re-running post-processors in Reading view → `obsidian-api.md` § Misc API Gotchas
- `a.internal-link` delegation and syntax-node names in CM6 → `obsidian-api.md` § CodeMirror 6 Extensions
- Empty gap left of the settings at wide widths → `ui-conventions.md` § `SettingGroup`

## 8. Lessons From the Runs

- **"N passed" says nothing about the images.** A run reported 178 passed while the images
  showed a leaked picker over every capture, settings from the wrong window, light images named
  dark, cut-off forms and blank bands. Look at the screenshots on every run: scan every
  `*-dark.png` for brightness, and read the manifest's viewport and tile data.
- **Refuse instead of writing a wrong image.** Every measurement check that fails loudly (theme
  brightness, leftover modals, cut-off content, missing window) turned a silently bad image into
  a visible failure. Keep them.
- **Check by hand before fixing.** When a screenshot looks like a bug, open it with `live:open`
  first. The suspected settings bug was Obsidian's own layout.
- **Expect each measurement fix to expose the next case.** It took about 12 runs on the host:
  leaked prompt, wrong window, theme race, cut-off images, blank bands, screen size, window
  placement, a data-mix state, a sub-page mid-slide, inner scroll panes.
- **Fixes are test-only** unless a real plugin bug is proven. A production bug found live (the
  keymap scope, the warm-cache start) gets a regression test against the fake and a gotcha entry.
- **When someone else runs Obsidian,** hand over one complete command per run, for example
  `npm run build && <PLUGIN>_LIVE_SCREENSHOTS=1 OBSIDIAN_EXPECT_VERSION=1.15.0 npm run test:live`,
  and read the log files and images yourself afterwards. The person running it only needs to
  say it finished.

## 9. File Map

```
test/live/
  harness.ts        launch/close, isolation, version check, restricted mode, session.exited
  window.ts         size + place the window (electron remote → moveTo/resizeTo), log the way
  vault.ts          temp vault + profile (obsidian.json)
  cdp.ts            CDP client over Node WebSocket (evaluate, send, screenshot, keys, IME)
  emergency.ts      kill + cleanup on signals
  config.ts version.ts runLog.ts   env (<PLUGIN>_LIVE_WINDOW, …), version checks, log files
  page.ts           self-contained DOM snippets (unit-tested in jsdom)
  driver.ts         waits/actions on top of page.ts, failure probes, closeAll/closeSettings
  capture.ts        capture window (settings window target), fit, tiles, theme wait, verified shots
  viewport.ts       pure: device-px cap, overflow, fit height, tile offsets, tile scroller
  png.ts theme.ts   PNG decode + brightness; theme class/luminance checks
  fixtures.ts disk.ts              note factories, read-back from disk
  mockups.ts        parse SCREENS, state keys, file names, device-scoped unreachable lookup
  screenScenarios.ts  SCENARIOS + UNREACHABLE + CAPTURE_FIT + screenshot vault
  dataMix.ts        example of a data-mix scenario with a DOM check
  cleanups.ts       undo stack + runScenario
  openArgs.ts openSession.ts       live:open
  screenshots.test.ts  the opt-in capture run
  *.test.ts         behaviour checks (first run, forms, settings search, mobile, rename, …)
test/live-unit/     unit tests for all pure helpers and snippets (run with npm test)
scripts/live-open.ts  scripts/fetch-obsidian-asar.mjs
vitest.live.config.ts   (fileParallelism: false)
docs/live-testing.md    user-facing how-to, env vars, troubleshooting
```
