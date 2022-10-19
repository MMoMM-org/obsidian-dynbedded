import { App, PluginSettingTab, Setting } from 'obsidian';
import Dynbedded from './main';

// Remember to rename these classes and interfaces!
export interface DynbeddedSettings {
	debugLogging: boolean
}

export const DEFAULT_SETTINGS = {
	debugLogging: false
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
		// You probably want to start changing the contents below 😀

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


