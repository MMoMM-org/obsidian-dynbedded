import {App, MarkdownPostProcessorContext, MarkdownRenderer, TFile} from "obsidian";
import Dynbedded from "./main";

export class DynbeddedProcessor {
    private plugin: Dynbedded;
    private app: App;

    constructor(app: App, plugin: Dynbedded) {
        this.plugin = plugin;
        this.app = app;
    }

    private showError(el: HTMLElement, message: string) {
        if (this.plugin.settings.silentMode) {
            this.plugin.log("Suppressed error:", message);
        } else {
            Dynbedded.displayError(el, message);
        }
    }

    async render(source: string, el: HTMLElement, ctx: MarkdownPostProcessorContext) {

        const fileNameMatchPattern = /\[\[([^\]]{2}.*)\]\]/u;
        const fileNameMatch = fileNameMatchPattern.exec(source);

        this.plugin.log("FileNameMatch", fileNameMatch);
        if (!fileNameMatch) {
            this.showError(el, "Bad file link: " + source);
            return;
        }

        let fileName = fileNameMatch[1];

        // #7: split BEFORE date substitution so each part can have its own {{...}} token
        let header = "";
        if (fileName.contains("#")) {
            const __ret = this.splitFileName(fileName);
            header = __ret.header;
            fileName = __ret.fileName;
        }

        // Apply dynamic date substitution to fileName
        const dynamicDateMatchPattern = /{{(.*)}}/;
        const filenameDateMatch = dynamicDateMatchPattern.exec(fileName);
        this.plugin.log("DynamicDateMatch (filename)", filenameDateMatch);

        if (filenameDateMatch !== null) {
            const {dynamicDateFormat, dynamicDate} = this.getDynamicDate(filenameDateMatch);
            // Todo: figure out how to handle wrong formats correctly.. most formats are valid but create undesired results...
            if (!window.moment(window.moment.now(), dynamicDateFormat, true).isValid || dynamicDate === null) {
                this.showError(el, "Not a valid Moment.js Time format: " + dynamicDateFormat);
                return;
            }
            fileName = fileName.replace(dynamicDateMatchPattern, dynamicDate);
            this.plugin.log("DynamicFileName", fileName);
        }

        // Apply dynamic date substitution to header (#7)
        if (header !== "") {
            const headerDateMatch = dynamicDateMatchPattern.exec(header);
            this.plugin.log("DynamicDateMatch (header)", headerDateMatch);
            if (headerDateMatch !== null) {
                const {dynamicDateFormat, dynamicDate} = this.getDynamicDate(headerDateMatch);
                if (!window.moment(window.moment.now(), dynamicDateFormat, true).isValid || dynamicDate === null) {
                    this.showError(el, "Not a valid Moment.js Time format: " + dynamicDateFormat);
                    return;
                }
                header = header.replace(dynamicDateMatchPattern, dynamicDate);
                this.plugin.log("DynamicHeader", header);
            }
        }
        const matchingFile = this.app.metadataCache.getFirstLinkpathDest(fileName, '');
        this.plugin.log("MatchingFile", matchingFile);

        if (!matchingFile) {
            this.showError(el, "File link not found: [[" + fileName + "]]");
            return;
        }
        // Todo: could this be moved up?
        if (matchingFile.extension !== "md") {
            this.showError(el, "Bad file extension found, expected markdown: " + matchingFile);
            return;
        }

        let fileContents = ""
        if (header != "") {
            // #4: guard against null cache (e.g. cache not yet built)
            const fileCache = this.app.metadataCache.getFileCache(matchingFile);
            if (!fileCache) {
                this.showError(el, "File cache not available for [[" + fileName + "]]");
                return;
            }
            const headings = fileCache.headings;
            if (headings === null || headings === undefined) {
                const errorMessage = "Header \"" + header + "\" not found in [[" + fileName + "]]";
                this.showError(el, errorMessage);
                return;
            }
            this.plugin.log("Headings", headings);
            let position: {start: number, end: number} | undefined;
            for (let i = 0; i < headings.length; i++) {
                const heading = headings[i];
                this.plugin.log("Heading", heading)
                if (heading.heading == header) {
                    position = {
                        start: heading.position.start.line,
                        end: i == headings.length - 1 ? -1 : headings[i + 1].position.start.line,
                    };
                    break; // #5: stop after first match
                }
            }
            // #3: distinguish "not found" from "found but empty"
            if (position === undefined) {
                this.showError(el, "Header \"" + header + "\" not found in [[" + fileName + "]]");
                return;
            }
            fileContents = await this.getHeaderSectionContent(matchingFile, position, fileContents);
            if (fileContents == "") {
                // Header exists but has no content — render nothing silently
                return;
            }
        } else {
            fileContents = await this.app.vault.cachedRead(matchingFile);
        }
        this.plugin.log("File", fileContents)
        const container = el.createDiv({cls: [Dynbedded.containerClass]});
        await MarkdownRenderer.render(this.app, fileContents, container, ctx.sourcePath, this.plugin);
    }

    private getDynamicDate(dynamicDateMatch: RegExpExecArray) {
        let dynamicDateFormat = dynamicDateMatch[1];
        let duration = window.moment.duration(0);
        this.plugin.log("DynamicDateFormat", dynamicDateFormat.includes("|"))
        if (dynamicDateFormat.includes("|")) {
            const offset = dynamicDateFormat.split("|")[1];
            this.plugin.log("Offset", offset);
            dynamicDateFormat = dynamicDateFormat.split("|")[0];
            this.plugin.log("dynamicDateMatch", dynamicDateFormat)
            if (/^-?\d+$/.test(offset)) {
                this.plugin.log("Number");
                duration = window.moment.duration(Number(offset), "days");
            } else {
                this.plugin.log("String");
                duration = window.moment.duration(offset);
            }
            this.plugin.log("Duration", duration);
        }
        const dynamicDate = window.moment().add(duration).format(dynamicDateFormat);
        this.plugin.log("DynamicDate", dynamicDate);
        return {dynamicDateFormat, dynamicDate};
    }

    private async getHeaderSectionContent(matchingFile: TFile, position: {start: number, end: number}, fileContents: string) {
        let text = await this.app.vault.cachedRead(matchingFile)
        if (!text.endsWith("\n")) {
            text = text + "\n"
        }
        this.plugin.log("Position", position);
        this.plugin.log("Text", text);
        fileContents = text.split("\n").slice(position.start + 1, position.end).join("\n");
        this.plugin.log("Split", fileContents)
        return fileContents;
    }

   private splitFileName(fileName: string) {
        const header = fileName.split("#")[1];
        fileName = fileName.split("#")[0];
        this.plugin.log("Header", header);
        return {header, fileName};
    }
}

