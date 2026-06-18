import { App, Component, MarkdownPostProcessorContext, MarkdownRenderer } from "obsidian";
import Dynbedded from "./main";
import { DynbeddedError, EmbedRequest } from "./EmbedRequest";
import { parseDynbedded } from "./parsers/DynbeddedParser";
import { SelectorResolver } from "./SelectorResolver";

export class DynbeddedProcessor {
    private plugin: Dynbedded;
    private app: App;
    private resolver: SelectorResolver;

    constructor(app: App, plugin: Dynbedded) {
        this.plugin = plugin;
        this.app = app;
        this.resolver = new SelectorResolver(app, plugin);
    }

    private showError(el: HTMLElement, message: string) {
        if (this.plugin.settings.silentMode) {
            this.plugin.log("Suppressed error:", message);
        } else {
            Dynbedded.displayError(el, message);
        }
    }

    async render(source: string, el: HTMLElement, ctx: MarkdownPostProcessorContext, component: Component) {
        let request: EmbedRequest;
        try {
            request = parseDynbedded(source);
            this.resolveDates(request);
        } catch (error) {
            if (error instanceof DynbeddedError) {
                this.showError(el, error.message);
                return;
            }
            throw error;
        }
        this.plugin.log("EmbedRequest", request);

        const matchingFile = this.app.metadataCache.getFirstLinkpathDest(request.fileName, '');
        this.plugin.log("MatchingFile", matchingFile);
        if (!matchingFile) {
            this.showError(el, "File link not found: [[" + request.fileName + "]]");
            return;
        }
        if (matchingFile.extension !== "md") {
            this.showError(el, "Bad file extension found, expected markdown: " + matchingFile.path);
            return;
        }

        let fileContents: string;
        try {
            fileContents = await this.resolver.resolve(matchingFile, request);
        } catch (error) {
            if (error instanceof DynbeddedError) {
                this.showError(el, error.message);
                return;
            }
            throw error;
        }

        // Header exists but has no content — render nothing silently (existing behaviour).
        if (fileContents === "" && request.selector.kind === "subpath") {
            return;
        }

        this.plugin.log("File", fileContents);
        const container = el.createDiv({cls: [Dynbedded.containerClass]});
        // Use the per-block render child as the component so any children
        // registered by MarkdownRenderer are released when the block unloads.
        // Passing the plugin would tie them to the plugin's lifetime → leak.
        await MarkdownRenderer.render(this.app, fileContents, container, ctx.sourcePath, component);
    }

    // Resolves {{...}} date tokens in the filename and (heading) subpath in place.
    private resolveDates(request: EmbedRequest) {
        request.fileName = this.substituteDate(request.fileName);
        if (request.selector.kind === "subpath") {
            request.selector.subpath = this.substituteDate(request.selector.subpath);
        }
    }

    private substituteDate(value: string): string {
        const pattern = /{{(.*)}}/;
        const match = pattern.exec(value);
        this.plugin.log("DynamicDateMatch", match);
        if (match === null) {
            return value;
        }
        const {dynamicDateFormat, dynamicDate} = this.getDynamicDate(match);
        // Todo: figure out how to handle wrong formats correctly.. most formats are valid but create undesired results...
        if (!window.moment(window.moment.now(), dynamicDateFormat, true).isValid || dynamicDate === null) {
            throw new DynbeddedError("Not a valid Moment.js Time format: " + dynamicDateFormat);
        }
        const result = value.replace(pattern, dynamicDate);
        this.plugin.log("DynamicValue", result);
        return result;
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
}
