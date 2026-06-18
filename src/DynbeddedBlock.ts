import { App, MarkdownPostProcessorContext, MarkdownRenderChild } from 'obsidian';
import Dynbedded from './main';
import { DynbeddedProcessor } from './DynbeddedProcessor';
import { ParseFn } from './EmbedRequest';

export class DynbeddedBlock extends MarkdownRenderChild {
    private source: string;
    private plugin: Dynbedded;
    private ctx: MarkdownPostProcessorContext;
    private processor: DynbeddedProcessor;
    private parse: ParseFn;
    private isRendering = false;

    constructor(
        containerEl: HTMLElement,
        source: string,
        app: App,
        plugin: Dynbedded,
        ctx: MarkdownPostProcessorContext,
        parse: ParseFn
    ) {
        super(containerEl);
        this.source = source;
        this.plugin = plugin;
        this.ctx = ctx;
        this.processor = new DynbeddedProcessor(app, plugin);
        this.parse = parse;
    }

    onload() {
        void this.renderAndScheduleRefresh();
    }

    private async renderAndScheduleRefresh() {
        await this.processor.render(this.source, this.containerEl, this.ctx, this, this.parse);

        if (this.plugin.settings.autoRefresh) {
            const intervalMs = Math.max(10, Math.min(3600, this.plugin.settings.refreshIntervalSeconds)) * 1000;
            this.registerInterval(window.setInterval(() => { void this.rerender(); }, intervalMs));
        }
    }

    private async rerender() {
        if (this.isRendering) return;
        this.isRendering = true;
        this.containerEl.empty();
        await this.processor.render(this.source, this.containerEl, this.ctx, this, this.parse);
        this.isRendering = false;
    }
}
