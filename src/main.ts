import { Notice, Plugin } from 'obsidian';
import { SampleCommands } from 'SampleCommands';
import {DEFAULT_SETTINGS, MyPluginSettings, SampleSettingTab} from './SampleSettingTab';

type LogType = typeof console.log;

// Remember to rename these classes and interfaces!


export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;
	pluginName = this.manifest.name;
	pluginVersion = this.manifest.version;
	pluginAuthor = this.manifest.author;
	pluginAuthorUrl = this.manifest.authorUrl;
	pluginDocumentationUrl = 'https://github.com/MMoMM-Marcus/obsidian-plugin-base';

	async onload() {
		await this.loadSettings();
		this.log("Loading Plugin")


		// This creates an icon in the left ribbon.
		const ribbonIconEl = this.addRibbonIcon('dice', 'Sample Plugin', (evt: MouseEvent) => {
			// Called when the user clicks the icon.
			new Notice('This is a notice!');
		});
		// Perform additional things with the ribbon
		ribbonIconEl.addClass('my-plugin-ribbon-class');

		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.setText('Status Bar Text');

		// This will register the commands of the plugin
		new SampleCommands(this);

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SampleSettingTab(this.app, this));

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
			this.log('click', evt);
		});

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(window.setInterval(() => this.log('setInterval'), 5 * 60 * 1000));

	}

	onunload() {
		this.log("Unloading Plugin")

	}

	log(...args: Parameters<LogType>) {
        if (this.settings.debugLogging) {
            // eslint-disable-next-line no-console
            console.log(this.pluginName + " Debug:", ...args);
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
};





