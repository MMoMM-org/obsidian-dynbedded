import { App, Component, MarkdownPostProcessorContext, MarkdownRenderer } from "obsidian";
import Dynbedded from "./main";
import { Anchor, DynbeddedError, EmbedRequest, ParseFn, Selector } from "./EmbedRequest";
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

    async render(source: string, el: HTMLElement, ctx: MarkdownPostProcessorContext, component: Component, parse: ParseFn) {
        let request: EmbedRequest;
        try {
            request = parse(source, this.plugin.settings.defaultDisplay);
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
        // Use the per-block render child as the component so any children
        // registered by MarkdownRenderer are released when the block unloads.
        // Passing the plugin would tie them to the plugin's lifetime → leak.
        if (request.display === "inline") {
            await this.renderInline(fileContents, el, ctx.sourcePath, component);
        } else {
            const container = el.createDiv({cls: [Dynbedded.containerClass]});
            await MarkdownRenderer.render(this.app, fileContents, container, ctx.sourcePath, component);
        }
    }

    // Inline display: render into an inline span and unwrap a single top-level
    // paragraph so the content flows as one run. Multi-block content (lists,
    // multiple paragraphs) is left intact as a graceful fallback.
    private async renderInline(content: string, el: HTMLElement, sourcePath: string, component: Component) {
        const span = el.createSpan({cls: [Dynbedded.containerClass, "dynbedded-inline"]});
        await MarkdownRenderer.render(this.app, content, span, sourcePath, component);
        if (span.childElementCount === 1 && span.firstElementChild?.tagName === "P") {
            const paragraph = span.firstElementChild;
            while (paragraph.firstChild) {
                span.insertBefore(paragraph.firstChild, paragraph);
            }
            paragraph.remove();
        }
    }

    // Resolves {{...}} date tokens in the filename and in every selector anchor.
    private resolveDates(request: EmbedRequest) {
        request.fileName = this.substituteDate(request.fileName);
        request.selector = this.resolveSelectorDates(request.selector);
    }

    private resolveSelectorDates(selector: Selector): Selector {
        switch (selector.kind) {
            case "subpath":
                return { kind: "subpath", subpath: this.substituteDate(selector.subpath) };
            case "after":
                return { kind: "after", anchor: this.resolveAnchorDates(selector.anchor) };
            case "between":
                return {
                    kind: "between",
                    from: this.resolveAnchorDates(selector.from),
                    to: this.resolveAnchorDates(selector.to),
                };
            case "multi":
                return { kind: "multi", parts: selector.parts.map(part => this.resolveSelectorDates(part)) };
            case "whole":
                return selector;
        }
    }

    private resolveAnchorDates(anchor: Anchor): Anchor {
        return anchor.kind === "text"
            ? { kind: "text", text: this.substituteDate(anchor.text) }
            : anchor;
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
