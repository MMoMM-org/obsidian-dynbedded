# Live testing: a throw-away Obsidian

`npm run live:open` starts a separate, temporary Obsidian with the plugin from `build/` on a copy of the `Dynbedded/` test vault. Your own Obsidian profile and vaults are never read or written, and it runs next to an Obsidian that is already open. The harness is adapted from obsidian-manabi's live harness (`test/live/`), reduced to opening an instance by hand plus a smoke check.

```bash
npm run build
npm run live:open                  # copy of the Dynbedded/ test vault
npm run live:open -- --settings    # same, opened on the Dynbedded settings tab
npm run live:open -- --empty       # an empty vault with only the plugin
npm run live:open -- --keep        # keep the temp vault afterwards (its path is printed)
npm run live:open -- --smoke       # launch, print a status line, quit (no interaction)
```

It prints the vault path and the Obsidian log path and stays open until you quit Obsidian or press Ctrl-C. Then it removes the temp profile and, unless you passed `--keep`, the temp vault. It does not build: run `npm run build` first (or point `DYNBEDDED_PLUGIN_DIR` at another build).

`--smoke` prints `{ pluginVersion, settingsTab, settingDefinitions }` and exits non-zero when the plugin or its settings tab did not load. `settingDefinitions` is the number of top-level items `getSettingDefinitions()` returns (0 on a build without the declarative settings API).

## Environment variables

| Variable | Default | Effect |
|----------|---------|--------|
| `OBSIDIAN_BIN` | `/Applications/Obsidian.app/Contents/MacOS/Obsidian` | The Obsidian executable. Point it at another installer (e.g. `/Applications/Obsidian-1.12.app/Contents/MacOS/Obsidian`) to run another app version, for example to check the `display()` fallback on Obsidian < 1.13. |
| `OBSIDIAN_EXPECT_VERSION` | unset | The launch fails unless Obsidian reports this version, for example `1.15.0`. |
| `DYNBEDDED_PLUGIN_DIR` | `build/` | Folder the plugin files (`main.js`, `manifest.json`, `styles.css`) are copied from. |

A fresh profile runs the app version bundled with the installer you launch, not the version your everyday Obsidian has downloaded. The launch fails if that version is below the plugin's `minAppVersion`.

## How it isolates your Obsidian

- **Vault:** the `Dynbedded/` folder is copied to `$TMPDIR/dynbedded-live-vault-*` (or an empty folder with `--empty`). The plugin build replaces `.obsidian/plugins/obsidian-dynbedded/`, and `community-plugins.json` gets `obsidian-dynbedded` if it is missing. Edits in the instance never reach `Dynbedded/`.
- **Profile:** Obsidian is started with `--user-data-dir=$TMPDIR/dynbedded-live-profile-*`. Its `obsidian.json` lists only the temp vault, marked as open, with app updates off (`updateDisabled`). Obsidian never reads `~/Library/Application Support/obsidian`, and the profile has its own single-instance lock.
- **Restricted mode:** a fresh profile starts with community plugins off. The harness sets Obsidian's per-vault trust flag (`localStorage["enable-plugin-<app.appId>"]`) over CDP and reloads the window. If that does not work in some version, it falls back to `app.plugins.setEnable(true)` and `enablePlugin("obsidian-dynbedded")`.
- **CDP:** Obsidian listens on `--remote-debugging-port=<free port>` on localhost only, for as long as the run lasts.
- **Cleanup:** quitting sends SIGTERM, then SIGKILL after 10 s, and deletes the temp profile and the owned vault. On Ctrl-C (SIGINT/SIGTERM) or an early exit the harness kills the Obsidian it started and removes the same folders before re-raising the signal (`scripts/live/emergency.mjs`).
- **Logs:** Obsidian's stdout/stderr go to `live-output/obsidian-<timestamp>-<pid>.log` (gitignored), never to the terminal.

## Troubleshooting

- **Run from Claude Code:** the Bash sandbox blocks launching the app and the localhost CDP port. Run the command unsandboxed (or yourself, with `! npm run live:open`).
- **Stray Obsidian or temp folders after a crash:** quit any Obsidian started with `--user-data-dir=…dynbedded-live-profile-…`, then delete `$TMPDIR/dynbedded-live-*`.
- **"Plugin build not found":** run `npm run build`, or set `DYNBEDDED_PLUGIN_DIR`.
