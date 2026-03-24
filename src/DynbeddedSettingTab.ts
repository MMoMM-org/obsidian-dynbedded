import { App, PluginSettingTab, Setting } from 'obsidian';
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

		containerEl.createEl('h1', { text: this.plugin.pluginName});
		containerEl.createEl('h2', { text: this.plugin.pluginDescription});
		containerEl.createEl('b', { text: ' Version: ' + this.plugin.pluginVersion });
		containerEl.createEl('br', {text: ''})
		containerEl.createEl('br', {text: ''})
		containerEl.createEl('a', {text: 'Created by ' + this.plugin.pluginAuthor, href: this.plugin.pluginAuthorUrl})
		containerEl.createEl('br', {text: ''})
		containerEl.createEl('br', {text: ''})
		containerEl.createEl('a', {text: 'Plugin Documentation', href: this.plugin.pluginDocumentationUrl})
		containerEl.createEl('br', {text: ''})
		containerEl.createEl('br', {text: ''})
		// containerEl.createEl('h3', { text: 'Configuration:'});
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

		containerEl.createEl('h3', { text: 'Plugin Settings' });

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

// Leave this alone!
		containerEl.createEl('h3', { text: 'Developer Settings' });

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


