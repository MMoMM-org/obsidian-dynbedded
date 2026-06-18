import {Editor, MarkdownFileInfo, MarkdownView, Notice, Plugin} from 'obsidian';
import {DEFAULT_SETTINGS, DynbeddedSettings, DynbeddedSettingTab} from './DynbeddedSettingTab';
import { DynbeddedBlock } from './DynbeddedBlock';
import { parseDynbedded, serializeDynbedded } from './parsers/DynbeddedParser';
import { parseQuoth } from './parsers/QuothParser';
import { buildReference } from './commands/CopyReference';

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
	static quothKeyword = "quoth";
	static containerClass = "dynbedded";
	static errorClass = "dynbedded-error";

	static displayError = (parent: HTMLElement, text: string) => {
		console.error("Dynbedded-Error: ", text);
		parent.createEl("pre", { text: "Dynbedded: Error: " + text, cls: [Dynbedded.containerClass, Dynbedded.errorClass] });
	}

	async onload() {
		await this.loadSettings();
		this.log("Loading Plugin")

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new DynbeddedSettingTab(this.app, this));

		// Registering the CodeBlockProcessor
		this.registerMarkdownCodeBlockProcessor(Dynbedded.codeBlockKeyword, async (source, el, ctx) => {
			ctx.addChild(new DynbeddedBlock(el, source, this.app, this, ctx, parseDynbedded));
		});

		// Opt-in: also render `quoth` blocks so the deprecated Quoth plugin can be
		// uninstalled. Guarded — if Quoth (or anything else) already owns the language
		// the registration throws; log and carry on rather than break onload.
		if (this.settings.renderQuothBlocks) {
			try {
				this.registerMarkdownCodeBlockProcessor(Dynbedded.quothKeyword, async (source, el, ctx) => {
					ctx.addChild(new DynbeddedBlock(el, source, this.app, this, ctx, parseQuoth));
				});
				this.log("Registered quoth code block rendering");
			} catch (error) {
				console.error("Dynbedded: could not register quoth rendering", error);
				// eslint-disable-next-line obsidianmd/ui/sentence-case -- "Quoth" is a proper noun (the plugin's name)
				new Notice('Dynbedded: could not render quoth blocks — is the Quoth plugin still installed? Uninstall it and reload.');
			}
		}

		this.addCommand({
			id: 'copy-dynbedded-reference',
			name: 'Copy reference',
			editorCallback: (editor: Editor, ctx: MarkdownView | MarkdownFileInfo) => {
				const file = ctx.file;
				if (!file) {
					return;
				}
				const block = serializeDynbedded(buildReference(editor, file));
				void navigator.clipboard.writeText(block);
				new Notice('Dynbedded reference copied to clipboard');
			},
		});
	}

	onunload() {
		this.log("Unloading Plugin")
	}

	log(...args: Parameters<LogType>) {
        if (this.settings.debugLogging) {
            console.debug(this.pluginName + "-Debug:", ...args);
		}
	}

	async loadSettings() {
		const loaded = (await this.loadData()) as Partial<DynbeddedSettings> | null;
		this.settings = { ...DEFAULT_SETTINGS, ...(loaded ?? {}) };
		this.log("Settings loaded", this.settings);
	}

	async saveSettings() {
		await this.saveData(this.settings);
		this.log("Settings saved",this.settings);
	}
}






