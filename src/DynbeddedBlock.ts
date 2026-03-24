import { App, MarkdownPostProcessorContext, MarkdownRenderChild } from 'obsidian';
import Dynbedded from './main';
import { DynbeddedProcessor } from './DynbeddedProcessor';

export class DynbeddedBlock extends MarkdownRenderChild {
    private source: string;
    private plugin: Dynbedded;
    private ctx: MarkdownPostProcessorContext;
    private processor: DynbeddedProcessor;
    private isRendering = false;

    constructor(
        containerEl: HTMLElement,
        source: string,
        app: App,
        plugin: Dynbedded,
        ctx: MarkdownPostProcessorContext
    ) {
        super(containerEl);
        this.source = source;
        this.plugin = plugin;
        this.ctx = ctx;
        this.processor = new DynbeddedProcessor(app, plugin);
    }

    async onload() {
        await this.processor.render(this.source, this.containerEl, this.ctx);

        if (this.plugin.settings.autoRefresh) {
            const intervalMs = Math.max(10, Math.min(3600, this.plugin.settings.refreshIntervalSeconds)) * 1000;
            this.registerInterval(window.setInterval(() => this.rerender(), intervalMs));
        }
    }

    private async rerender() {
        if (this.isRendering) return;
        this.isRendering = true;
        this.containerEl.empty();
        await this.processor.render(this.source, this.containerEl, this.ctx);
        this.isRendering = false;
    }
}
