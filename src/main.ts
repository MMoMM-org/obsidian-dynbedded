import {Plugin} from 'obsidian';
import {DEFAULT_SETTINGS, DynbeddedSettings, DynbeddedSettingTab} from './DynbeddedSettingTab';
import {DynbeddedProcessor} from './DynbeddedProcessor';

type LogType = typeof console.log;


export default class Dynbedded extends Plugin {
	settings: DynbeddedSettings;
	pluginName = this.manifest.name;
	pluginDescription = this.manifest.description;
	pluginVersion = this.manifest.version;
	pluginAuthor = this.manifest.author;
	pluginAuthorUrl = this.manifest.authorUrl;
	pluginDocumentationUrl = 'https://github.com/MMoMM-org/obsidian-dynbedded';

	static codeBlockKeyword = "dynbedded";
	static containerClass = "dynbedded";
	static errorClass = "dynbedded-error";

	static displayError = (parent: HTMLElement, text: string) => {
		console.log("Dynbedded-Error: ",text)
		parent.createEl("pre", { text: "Dynbedded: Error: " + text, cls: [Dynbedded.containerClass, Dynbedded.errorClass] });
	}

	dynbeddedProcessor = new DynbeddedProcessor(app, this);

	async onload() {
		await this.loadSettings();
		this.log("Loading Plugin")

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new DynbeddedSettingTab(this.app, this));

		// Registering the CodeBlockProcessor
		this.registerMarkdownCodeBlockProcessor(Dynbedded.codeBlockKeyword, async (source, el, ctx) => {this.dynbeddedProcessor.render(source,el, ctx)});
	}

	onunload() {
		this.log("Unloading Plugin")
	}

	log(...args: Parameters<LogType>) {
        if (this.settings.debugLogging) {
            console.log(this.pluginName + "-Debug:", ...args);
		}
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
		this.log("Settings loaded",this.settings);
	}

	async saveSettings() {
		await this.saveData(this.settings);
		this.log("Settings saved",this.settings);
	}
}






