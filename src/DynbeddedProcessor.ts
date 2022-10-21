import {App, MarkdownPostProcessorContext, MarkdownRenderer, TFile} from "obsidian";
import Dynbedded from "./main";

export class DynbeddedProcessor {
    private plugin: Dynbedded;
    private app: App;

    constructor(app: App, plugin: Dynbedded) {
        this.plugin = plugin;
        this.app = app;
    }

    async render(source: string, el: HTMLElement, ctx: MarkdownPostProcessorContext) {

        const fileNameMatchPattern = /\[\[([^\]]{2}.*)\]\]/u;
        const fileNameMatch = fileNameMatchPattern.exec(source);

        this.plugin.log("FileNameMatch", fileNameMatch);
        if (!fileNameMatch) {
            Dynbedded.displayError(el, "Bad file link: " + source);
            return;
        }

        let fileName = fileNameMatch[1];
        const dynamicDateMatchPattern = /{{(.*)}}/;
        const dynamicDateMatch = dynamicDateMatchPattern.exec(fileName);
        this.plugin.log("DynamicDateMatch", dynamicDateMatch);

        if (dynamicDateMatch !== null) {
            const {dynamicDateFormat, dynamicDate} = this.getDynamicDate(dynamicDateMatch);
            // Todo: figure out how to handle wrong formats correctly.. most formats are valid but create undesired results...
            if (!window.moment(window.moment.now(), dynamicDateFormat, true).isValid || dynamicDate === null) {
                Dynbedded.displayError(el, "Not a valid Moment.js Time format: " + dynamicDateFormat);
                return;
            }
            fileName = fileName.replace(dynamicDateMatchPattern, dynamicDate);
            this.plugin.log("DynamicFileName", fileName);
        }

        let header = "";
        if (fileName.contains("#")) {
            const __ret = this.splitFileName(fileName);
            header = __ret.header;
            fileName = __ret.fileName;
        }
        const matchingFile = this.app.metadataCache.getFirstLinkpathDest(fileName, '');
        this.plugin.log("MatchingFile", matchingFile);

        if (!matchingFile) {
            Dynbedded.displayError(el, "File link not found: [[" + fileName + "]]");
            return;
        }
        // Todo: could this be moved up?
        if (matchingFile.extension !== "md") {
            Dynbedded.displayError(el, "Bad file extension found, expected markdown: " + matchingFile);
            return;
        }

        let fileContents = ""
        if (header != "") {
            // @ts-ignore
            const headings = this.app.metadataCache.getFileCache(matchingFile).headings;
            if (headings === null || headings === undefined) {
                const errorMessage = "Header \"" + header + "\" not found in [[" + fileName + "]]";
                Dynbedded.displayError(el, errorMessage);
                return;
            }
            this.plugin.log("Headings", headings);
            let position;
            for (let i = 0; i < headings.length; i++) {
                const heading = headings[i];
                this.plugin.log("Heading", heading)
                if (heading.heading == header) {
                    if (i == headings.length - 1) {
                        position = [heading.position.start.line, -1];
                    } else {
                        position = [heading.position.start.line, headings[i + 1].position.start.line];
                    }
                }
            }
            if (position) {
                fileContents = await this.getHeaderSectionContent(matchingFile, position, fileContents);
            }
        } else {
            fileContents = await this.app.vault.cachedRead(matchingFile);
        }
        if (fileContents == "") {
            const errorMessage = "Header \"" + header + "\" not found in [[" + fileName + "]]";
            Dynbedded.displayError(el, errorMessage);
            return;
        }
        this.plugin.log("File", fileContents)
        const container = el.createDiv({cls: [Dynbedded.containerClass]});
        await MarkdownRenderer.renderMarkdown(fileContents, container, ctx.sourcePath, this.plugin);
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

    private async getHeaderSectionContent(matchingFile: TFile, position: number[], fileContents: string) {
        let text = await this.app.vault.cachedRead(matchingFile)
        if (!text.endsWith("\n")) {
            text = text + "\n"
        }
        this.plugin.log("Position", position);
        this.plugin.log("Text", text);
        fileContents = text.split("\n").slice(position[0] + 1, position[1]).join("\n");
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

