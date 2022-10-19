import {MarkdownRenderer, Plugin} from 'obsidian';
import {DEFAULT_SETTINGS, DynbeddedSettings, DynbeddedSettingTab} from './DynbeddedSettingTab';

type LogType = typeof console.log;


export default class Dynbedded extends Plugin {
	settings: DynbeddedSettings;
	pluginName = this.manifest.name;
	pluginDescription = this.manifest.description;
	pluginVersion = this.manifest.version;
	pluginAuthor = this.manifest.author;
	pluginAuthorUrl = this.manifest.authorUrl;
	pluginDocumentationUrl = 'https://github.com/MMoMM-Marcus/obsidian-dynbedded';

	static codeBlockKeyword = "dynbedded";
	static containerClass = "dynbedded";
	static errorClass = "dynbedded-error";

	static displayError = (parent: HTMLElement, text: string) => {
		console.log("Dynbedded-Error: ",text)
		parent.createEl("pre", { text: "Dynbedded: Error: " + text, cls: [Dynbedded.containerClass, Dynbedded.errorClass] });
	}


	async onload() {
		await this.loadSettings();
		this.log("Loading Plugin")

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new DynbeddedSettingTab(this.app, this));

		// Registering the CodeBlockProcessor
		this.registerMarkdownCodeBlockProcessor(Dynbedded.codeBlockKeyword, async (source, el, ctx) => {
			const fileNameMatchPattern = /\[\[([^\]]{2}.*)\]\]/u;
			const fileNameMatch = fileNameMatchPattern.exec(source);

			this.log("FileNameMatch", fileNameMatch);

			if (!fileNameMatch) {
				Dynbedded.displayError(el, "Bad file link: " + source);
				return;
			}
			let fileName = fileNameMatch[1];

			const dynamicDateMatchPattern = /{{(.*)}}/;
			const dynamicDateMatch = dynamicDateMatchPattern.exec(fileName);
			this.log("DynamicDateMatch", dynamicDateMatch);
			if (dynamicDateMatch !== null) {
				let dynamicDateFormat = dynamicDateMatch[1];
				let duration = window.moment.duration(0);
				this.log("DynamicDateFormat", dynamicDateFormat.includes("|"))
				if (dynamicDateFormat.includes("|")){
					const offset = dynamicDateFormat.split("|")[1];
					this.log("Offset", offset);
					dynamicDateFormat = dynamicDateFormat.split("|")[0];
					this.log("dynamicDateMatch",dynamicDateFormat)
					if ( /^-?\d+$/.test(offset)){
						this.log("Number");
						duration = window.moment.duration(Number(offset), "days");
					} else {
						this.log("String");
						duration = window.moment.duration(offset);
					}
					this.log("Duration",duration);
				}
				const dynamicDate = window.moment().add(duration).format(dynamicDateFormat);
				this.log("DynamicDate", dynamicDate);
				// Todo: figure out how to handle wrong formats correctly.. most formats are valid but create undesired results...
				if (!window.moment(window.moment.now(),dynamicDateFormat,true).isValid || dynamicDate === null) {
					Dynbedded.displayError(el, "Not a valid Moment.js Time format: "+ dynamicDateFormat);
					return;
				}
				fileName = fileName.replace(dynamicDateMatchPattern,dynamicDate);
				this.log("DynamicFileName", fileName);
			}
			let header = "";
			if (fileName.contains("#")) {
				header = fileName.split("#")[1];
				fileName = fileName.split("#")[0];
				this.log("Header",header);
			}

			const matchingFile = this.app.metadataCache.getFirstLinkpathDest(fileName, '');
			this.log("MatchingFile", matchingFile);
			if (!matchingFile) {
				Dynbedded.displayError(el, "File link not found: [["+ fileName + "]]");
				return;
			}
			// Todo: could this be moved up?
			if (matchingFile.extension !== "md") {
				Dynbedded.displayError(el, "Bad file extension found, expected markdown: " + matchingFile);
				return;
			}

			let fileContents = ""
			if (header != ""){
				// @ts-ignore
				const headings = this.app.metadataCache.getFileCache(matchingFile).headings;
				if (headings === null || headings === undefined) {
					const errorMessage = "Header \"" + header + "\" not found in [["+ fileName + "]]";
					Dynbedded.displayError(el, errorMessage);
				}
				this.log("Headings", headings);
				let position;
				for (let i = 0; i < headings.length; i++) {
					const heading = headings[i];
					this.log("Heading",heading)
					if (heading.heading == header) {
						if (i == headings.length - 1) {
							position = [heading.position.start.line, -1];
						} else {
							position = [heading.position.start.line, headings[i + 1].position.start.line];
						}
					}
				}
				if (position) {
					let text = await this.app.vault.cachedRead(matchingFile)
					if (!text.endsWith("\n")) {
						text = text + "\n"
					}
					this.log("Position",position);
					this.log("Text",text);
					fileContents = text.split("\n").slice(position[0] + 1, position[1]).join("\n");
					this.log("Split",fileContents)
				}
			} else {
				fileContents = await this.app.vault.cachedRead(matchingFile);
			}
			if (fileContents == "") {
				const errorMessage = "Header \"" + header + "\" not found in [["+ fileName + "]]";
				Dynbedded.displayError(el, errorMessage);
				return;
			}
			this.log("File",fileContents)
			const container = el.createDiv({ cls: [Dynbedded.containerClass] });
			await MarkdownRenderer.renderMarkdown(fileContents, container, ctx.sourcePath, this);
		});
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





