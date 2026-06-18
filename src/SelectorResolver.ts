import { App, TFile } from 'obsidian';
import { DynbeddedError, EmbedRequest, Selector } from './EmbedRequest';
import Dynbedded from './main';

// Turns an EmbedRequest's Selector into the slice of file content to render.
// Phase 0 implements `whole` and `subpath` (heading) — byte-identical to the
// pre-refactor DynbeddedProcessor. Range selectors arrive in Phase 1.
export class SelectorResolver {
    private app: App;
    private plugin: Dynbedded;

    constructor(app: App, plugin: Dynbedded) {
        this.app = app;
        this.plugin = plugin;
    }

    async resolve(file: TFile, request: EmbedRequest): Promise<string> {
        return this.resolveSelector(file, request.selector, request);
    }

    private async resolveSelector(file: TFile, selector: Selector, request: EmbedRequest): Promise<string> {
        switch (selector.kind) {
            case 'whole':
                return this.app.vault.cachedRead(file);
            case 'subpath':
                return this.resolveHeading(file, selector.subpath, request);
            default:
                throw new DynbeddedError('Unsupported selector: ' + selector.kind);
        }
    }

    private async resolveHeading(file: TFile, header: string, request: EmbedRequest): Promise<string> {
        const fileCache = this.app.metadataCache.getFileCache(file);
        if (!fileCache) {
            throw new DynbeddedError('File cache not available for [[' + request.fileName + ']]');
        }
        const headings = fileCache.headings;
        if (headings === null || headings === undefined) {
            throw new DynbeddedError('Header "' + header + '" not found in [[' + request.fileName + ']]');
        }
        this.plugin.log('Headings', headings);

        let position: { start: number; end: number } | undefined;
        for (let i = 0; i < headings.length; i++) {
            const heading = headings[i];
            this.plugin.log('Heading', heading);
            if (heading.heading == header) {
                position = {
                    start: heading.position.start.line,
                    end: (() => {
                        if (!request.headerHierarchy) {
                            // existing behaviour: stop at next heading of any level
                            return i == headings.length - 1 ? -1 : headings[i + 1].position.start.line;
                        }
                        // #2: stop only at heading of equal or higher level (lower or equal level number)
                        for (let j = i + 1; j < headings.length; j++) {
                            if (headings[j].level <= heading.level) {
                                return headings[j].position.start.line;
                            }
                        }
                        return -1; // no equal/higher heading found → rest of file
                    })(),
                };
                break; // #5: stop after first match
            }
        }
        if (position === undefined) {
            throw new DynbeddedError('Header "' + header + '" not found in [[' + request.fileName + ']]');
        }
        return this.sliceLines(file, position);
    }

    private async sliceLines(file: TFile, position: { start: number; end: number }): Promise<string> {
        let text = await this.app.vault.cachedRead(file);
        if (!text.endsWith('\n')) {
            text = text + '\n';
        }
        this.plugin.log('Position', position);
        // position.end may be -1 (rest of file); the appended trailing newline makes the
        // final split element empty, so slice(start+1, -1) correctly drops only that blank.
        const content = text.split('\n').slice(position.start + 1, position.end).join('\n');
        this.plugin.log('Split', content);
        return content;
    }
}
