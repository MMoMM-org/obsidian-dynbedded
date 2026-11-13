# Obsidian UI Conventions and Sensitive Data

Settings-tab structure, sentence-case copy, `SettingGroup` (1.11.0+), and the
`SecretStorage` / `SecretComponent` flow for keys and tokens (1.11.4+).

Load this when designing or auditing the user-facing surface of a settings tab
or any code path that persists API keys, OAuth tokens, or other secrets.

---

## Settings-Section Headings via `setHeading`

Never use raw `<h1>`–`<h6>` (`containerEl.createEl("h2", ...)`) for section headings inside a settings tab — they pick up document-level styling rather than Obsidian's settings styling, and themes can't target them consistently. Use `Setting.setHeading()`:

```typescript
// Wrong — inconsistent with native settings tabs
containerEl.createEl("h2", { text: "Connection" });

// Right — themed, accessible, palette-consistent
new Setting(containerEl).setName("Connection").setHeading();
```

---

## Sentence Case + No "Settings" Suffix

Obsidian house style is sentence case for all UI text — commands, settings names and descriptions, button labels, modal titles, headings.

| Wrong | Right |
|---|---|
| "Template Folder Location" | "Template folder location" |
| "Enable Auto Save" | "Enable auto save" |
| "API Key" | "API key" |
| "Open Settings" (button) | "Open settings" |

For section headings inside a settings tab, drop the redundant "settings" suffix. Everything in the tab is a setting, so "Advanced settings" reads as "Advanced settings settings" once it's rendered under the plugin name.

| Wrong | Right |
|---|---|
| "Advanced settings" | "Advanced" |
| "Connection settings" | "Connection" |
| "Display settings" | "Display" |

---

## `SettingGroup` (Obsidian 1.11.0+)

For visually grouped clusters of related settings, use the `SettingGroup` API. Bumps `minAppVersion`:

```json
// manifest.json
{ "minAppVersion": "1.11.0", ... }
```

```typescript
import { App, PluginSettingTab, Setting, SettingGroup } from "obsidian";

class MySettingTab extends PluginSettingTab {
  display() {
    const { containerEl } = this;
    containerEl.empty();

    const connection = new SettingGroup(containerEl).setHeading("Connection");

    connection.addSetting((setting) => {
      setting.setName("Endpoint")
        .addText((text) =>
          text.setValue(this.plugin.settings.endpoint)
            .onChange(async (v) => {
              this.plugin.settings.endpoint = v;
              await this.plugin.saveSettings();
            })
        );
    });

    // Optional: filter input at the top of the group
    connection.addSearch?.((search) =>
      search.setPlaceholder("Filter").onChange(/* ... */)
    );
  }
}
```

`SettingGroup` methods: `setHeading(string)`, `addSetting(cb)`, `addSearch(cb)`, `addExtraButton(cb)`.

**Storing `Setting` references for later mutation (e.g. show/hide based on a toggle) requires block-syntax callbacks**, since arrow-expression callbacks have no place to assign:

```typescript
// Wrong — can't capture `setting` with expression syntax
let advanced: Setting;
group.addSetting((setting) =>
  setting.setName("Advanced").addToggle(/* ... */)
);  // no way to write `advanced = setting` here

// Right — block syntax allows the capture
let advanced: Setting;
group.addSetting((setting) => {
  advanced = setting;
  setting.setName("Advanced")
    .addToggle((toggle) =>
      toggle.onChange((on) => {
        advanced.settingEl.toggleClass("is-disabled", !on);
      })
    );
});
```

**The empty gap left of the settings at wide widths is Obsidian's own layout (observed on 1.15.0).** App CSS sets `.setting-group { max-width: var(--setting-group-max-width) }` (700 px), the same for core tabs, so at 1920 px a large gap remains. Leave it. To prove it is not your plugin's CSS, log the matching CSS rules and their source sheet for your tab and for a core tab.

---

## Secrets and Sensitive Data

For API keys, OAuth tokens, passwords, signing secrets — never put the raw value in `data.json`. Obsidian Sync replicates `data.json` byte-for-byte across all paired devices, so any secret persisted there leaks to every device the user has paired (including ones controlled by ex-collaborators on shared accounts). Use the `SecretStorage` API and `SecretComponent` UI helper, both available since **Obsidian 1.11.4** — bump `minAppVersion` accordingly.

The pattern: store the **secret ID** (a stable, lowercase-alphanumeric-with-dashes name) in `data.json`, and resolve it to the live value at use-time via `SecretStorage`.

```typescript
// settings.ts — store the ID, not the value
export interface MyPluginSettings {
  apiKeySecretId: string;   // e.g. "myplugin-api-key" — points at SecretStorage
}
```

```typescript
// settings-tab.ts — SecretComponent is App-aware, so use addComponent
import { App, PluginSettingTab, SecretComponent, Setting } from "obsidian";

new Setting(containerEl)
  .setName("API key")
  .setDesc("Pick a secret from Obsidian's secret store.")
  .addComponent((el) =>
    new SecretComponent(this.app, el)
      .setValue(this.plugin.settings.apiKeySecretId)
      .onChange(async (id) => {
        this.plugin.settings.apiKeySecretId = id;
        await this.plugin.saveSettings();
      })
  );
```

```typescript
// At call time — resolve the ID into the value
const value = this.app.secretStorage.getSecret(this.settings.apiKeySecretId);
if (!value) {
  new Notice("API key not configured. Open settings to pick a secret.");
  return;
}
await this.callApi(value);
```

Programmatic management (rarely needed — users typically manage secrets via the UI):

```typescript
this.app.secretStorage.setSecret("myplugin-api-key", "sk-abc123...");
const ids = this.app.secretStorage.listSecrets();           // ["myplugin-api-key", ...]
const value = this.app.secretStorage.getSecret("myplugin-api-key");
```

**Secret ID validation:** lowercase letters, digits, and hyphens only. Other characters throw at `setSecret` / `getSecret`. Prefix with the plugin ID (`myplugin-`) to avoid colliding with another plugin's keys when both are installed.

**Why this resolves the existing Sync rule:** `obsidian-api.md` → Settings Reactivity → Hybrid Storage warns "do not put credentials in `data.json`" but stops short of saying where they should go. `SecretStorage` is the answer for credentials specifically; the sidecar pattern from Hybrid Storage is still the right answer for non-credential per-device state (machine-bound paths, per-device feature flags, hardware identifiers).
