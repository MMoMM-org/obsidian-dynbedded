import { App, Component, MarkdownPostProcessorContext, MarkdownRenderer, setIcon, TFile } from "obsidian";
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
        let contentEl: HTMLElement;
        if (request.display === "inline") {
            contentEl = await this.renderInline(fileContents, el, ctx.sourcePath, component);
        } else {
            contentEl = el.createDiv({cls: [Dynbedded.containerClass]});
            await MarkdownRenderer.render(this.app, fileContents, contentEl, ctx.sourcePath, component);
            if (this.plugin.settings.quoteStyle) {
                contentEl.addClass("dynbedded-quote-style");
            }
        }

        if (this.plugin.settings.showSourceLink) {
            this.renderSourceLink(contentEl, matchingFile, component, request.display);
        }

        if (request.attribution.length > 0) {
            this.renderAttribution(el, matchingFile, request.attribution);
        }
    }

    // Optional link icon that opens the embedded note (#b). For embedded display it
    // sits in the top-right corner; for inline it trails the content.
    private renderSourceLink(contentEl: HTMLElement, file: TFile, component: Component, display: 'embedded' | 'inline') {
        const link = contentEl.createSpan({
            cls: "dynbedded-source-link",
            attr: { "aria-label": "Open " + file.basename, role: "link", tabindex: "0" },
        });
        setIcon(link, "link");
        if (display === "embedded") {
            contentEl.addClass("dynbedded-has-link");
        } else {
            link.addClass("dynbedded-source-link-inline");
        }
        const open = () => { void this.app.workspace.getLeaf(false).openFile(file); };
        component.registerDomEvent(link, "click", open);
        component.registerDomEvent(link, "keydown", (event: KeyboardEvent) => {
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                open();
            }
        });
    }

    // Renders a source-attribution footer (#28). Title falls back to the file
    // basename; author comes from frontmatter. Order follows the `show:` list.
    private renderAttribution(el: HTMLElement, file: TFile, attribution: ('author' | 'title')[]) {
        const frontmatter = this.app.metadataCache.getFileCache(file)?.frontmatter;
        const parts: string[] = [];
        for (const field of attribution) {
            if (field === "title") {
                parts.push(String(frontmatter?.title ?? file.basename));
            } else if (frontmatter?.author !== undefined && frontmatter.author !== null) {
                parts.push(String(frontmatter.author));
            }
        }
        if (parts.length === 0) {
            return;
        }
        el.createEl("cite", {
            cls: [Dynbedded.containerClass, "dynbedded-attribution"],
            text: "— " + parts.join(", "),
        });
    }

    // Inline display: render into an inline span and unwrap a single top-level
    // paragraph so the content flows as one run. Multi-block content (lists,
    // multiple paragraphs) is left intact as a graceful fallback.
    private async renderInline(content: string, el: HTMLElement, sourcePath: string, component: Component): Promise<HTMLElement> {
        const span = el.createSpan({cls: [Dynbedded.containerClass, "dynbedded-inline"]});
        await MarkdownRenderer.render(this.app, content, span, sourcePath, component);
        if (span.childElementCount === 1 && span.firstElementChild?.tagName === "P") {
            const paragraph = span.firstElementChild;
            while (paragraph.firstChild) {
                span.insertBefore(paragraph.firstChild, paragraph);
            }
            paragraph.remove();
        }
        return span;
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
