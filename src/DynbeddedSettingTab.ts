import { App, PluginSettingTab, Setting, TextComponent } from 'obsidian';
import Dynbedded from './main';


export interface DynbeddedSettings {
	debugLogging: boolean;
	silentMode: boolean;
	autoRefresh: boolean;
	refreshIntervalSeconds: number;
}

export const DEFAULT_SETTINGS = {
	debugLogging: false,
	silentMode: false,
	autoRefresh: false,
	refreshIntervalSeconds: 60,
};


export class DynbeddedSettingTab extends PluginSettingTab {
	private plugin: Dynbedded;

	constructor(app: App, plugin: Dynbedded) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		const banner = containerEl.createDiv({ cls: 'dynbedded-settings-banner' });
		banner.createDiv({ cls: 'dynbedded-settings-banner-title', text: this.plugin.pluginName });
		banner.createDiv({ cls: 'dynbedded-settings-banner-subtitle', text: this.plugin.pluginDescription });
		banner.createDiv({ cls: 'dynbedded-settings-banner-version', text: 'Version: ' + this.plugin.pluginVersion });
		banner.createEl('a', {
			cls: 'dynbedded-settings-banner-link',
			text: 'Created by ' + this.plugin.pluginAuthor,
			href: this.plugin.pluginAuthorUrl,
		});
		banner.createEl('a', {
			cls: 'dynbedded-settings-banner-link',
			text: 'Plugin Documentation',
			href: this.plugin.pluginDocumentationUrl,
		});

		// take from https://github.com/zsviczian/obsidian-excalidraw-plugin/blob/04367bd3cd96a162185401139995f7fc48481470/src/settings.ts#L261
		const coffeeDiv = containerEl.createDiv("coffee");
		coffeeDiv.addClass("ex-coffee-div");
		const coffeeLink = coffeeDiv.createEl("a", {
			href: "https://ko-fi.com/mmomm",
		});
		const coffeeImg = coffeeLink.createEl("img", {
			attr: {
				src: "https://cdn.ko-fi.com/cdn/kofi3.png?v=3",
			},
		});
		coffeeImg.height = 45;

		new Setting(containerEl).setName('Plugin Settings').setHeading();

		new Setting(containerEl)
			.setName('Enable Silent Mode')
			.setDesc('When enabled, missing files or headers render as empty blocks instead of showing an error message.')
			.addToggle(toggle =>
				toggle.setValue(this.plugin.settings.silentMode).onChange(async value => {
					this.plugin.log("Silent Mode", value)
					this.plugin.settings.silentMode = value;
					await this.plugin.saveSettings();
				})
			);

		let intervalSetting: Setting;
		let intervalText: TextComponent;

		const intervalDescEnabled  = 'How often to re-render dynbedded blocks (10–3600 seconds).';
		const intervalDescDisabled = 'Enable Auto-Refresh above to change this value (10–3600 seconds).';

		const applyIntervalDisabled = (disabled: boolean) => {
			intervalText.setDisabled(disabled);
			intervalSetting.setDisabled(disabled);
			intervalSetting.setDesc(disabled ? intervalDescDisabled : intervalDescEnabled);
			intervalText.inputEl.toggleClass('dynbedded-disabled-input', disabled);
		};

		new Setting(containerEl)
			.setName('Enable Auto-Refresh')
			.setDesc('Automatically re-render dynbedded blocks at a set interval. Changes take effect when the note is reopened.')
			.addToggle(toggle =>
				toggle.setValue(this.plugin.settings.autoRefresh).onChange(async value => {
					this.plugin.log("Auto Refresh", value);
					this.plugin.settings.autoRefresh = value;
					await this.plugin.saveSettings();
					applyIntervalDisabled(!value);
				})
			);

		intervalSetting = new Setting(containerEl)
			.setName('Refresh Interval (seconds)')
			.addText(text => {
				intervalText = text;
				text.setValue(String(this.plugin.settings.refreshIntervalSeconds));
				const persistInterval = async () => {
					const parsed = parseInt(text.getValue(), 10);
					const clamped = isNaN(parsed) ? this.plugin.settings.refreshIntervalSeconds
					                              : Math.max(10, Math.min(3600, parsed));
					this.plugin.settings.refreshIntervalSeconds = clamped;
					await this.plugin.saveSettings();
					text.setValue(String(clamped));
				};
				// Save and clamp only when the user leaves the field
				text.inputEl.addEventListener('blur', () => { void persistInterval(); });
			});
		applyIntervalDisabled(!this.plugin.settings.autoRefresh);

// Leave this alone!
		containerEl.createEl('hr');
		new Setting(containerEl).setName('Developer Settings').setHeading();

		new Setting(containerEl)
			.setName('Enable Debug Logging')
			.setDesc('If this is enabled, more things are printed to the console.')
			.addToggle(toggle =>
				toggle.setValue(this.plugin.settings.debugLogging).onChange(async value => {
					this.plugin.log("Debug Logging", value)
					this.plugin.settings.debugLogging = value;
					await this.plugin.saveSettings();
				})
			);
	}
}


