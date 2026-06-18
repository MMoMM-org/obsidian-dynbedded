import { App, resolveSubpath, TFile } from 'obsidian';
import { Anchor, DynbeddedError, EmbedRequest, Selector } from './EmbedRequest';
import Dynbedded from './main';

// Turns an EmbedRequest's Selector into the slice of file content to render.
//   whole    — entire file
//   subpath  — heading section (ends at next heading / headerHierarchy)
//   after    — anchor line (exclusive) → end of file (#26)
//   between  — from-anchor line → to-anchor line, both inclusive (#26)
//   multi    — several selectors joined by EmbedRequest.join (#26)
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
                return this.resolveSubpath(file, selector.subpath, request);
            case 'after':
                return this.resolveAfter(file, selector.anchor, request);
            case 'between':
                return this.resolveBetween(file, selector.from, selector.to, request);
            case 'multi': {
                const parts: string[] = [];
                for (const part of selector.parts) {
                    parts.push(await this.resolveSelector(file, part, request));
                }
                return parts.join(request.join);
            }
        }
    }

    private async resolveAfter(file: TFile, anchor: Anchor, request: EmbedRequest): Promise<string> {
        const lines = await this.readLines(file);
        const idx = this.findAnchorLine(lines, anchor, request);
        // exclusive of the anchor line, through to end of file (Quoth `after` semantics)
        return lines.slice(idx + 1).join('\n');
    }

    private async resolveBetween(file: TFile, from: Anchor, to: Anchor, request: EmbedRequest): Promise<string> {
        const lines = await this.readLines(file);
        const fromIdx = this.findAnchorLine(lines, from, request);
        // search for `to` from the `from` line onward so a repeated phrase resolves forward
        const toRel = this.findAnchorLine(lines.slice(fromIdx), to, request);
        const toIdx = fromIdx + toRel;
        // both ends inclusive
        return lines.slice(fromIdx, toIdx + 1).join('\n');
    }

    // Resolves an anchor to a 0-based line index. Text anchors prefer an exact
    // (trimmed) whole-line match, falling back to the first line that contains the
    // text. Positional anchors are line-granular (1-based line; col not yet honoured).
    private findAnchorLine(lines: string[], anchor: Anchor, request: EmbedRequest): number {
        if (anchor.kind === 'pos') {
            const idx = anchor.line - 1;
            if (idx < 0 || idx >= lines.length) {
                throw new DynbeddedError('Line ' + anchor.line + ' out of range in [[' + request.fileName + ']]');
            }
            return idx;
        }
        const needle = anchor.text.trim();
        const exact = lines.findIndex(line => line.trim() === needle);
        if (exact !== -1) {
            return exact;
        }
        const contained = lines.findIndex(line => line.includes(anchor.text));
        if (contained !== -1) {
            return contained;
        }
        throw new DynbeddedError('Anchor "' + anchor.text + '" not found in [[' + request.fileName + ']]');
    }

    private async readLines(file: TFile): Promise<string[]> {
        const text = await this.app.vault.cachedRead(file);
        return text.split('\n');
    }

    // Heading subpaths keep the historical exact-match behaviour. Block subpaths
    // (#^id) are resolved via Obsidian's own subpath resolver. List-item subpaths
    // (#-…) fall through to the heading path (and surface as "not found").
    private async resolveSubpath(file: TFile, subpath: string, request: EmbedRequest): Promise<string> {
        if (subpath.startsWith('^')) {
            return this.resolveBlock(file, subpath, request);
        }
        return this.resolveHeading(file, subpath, request);
    }

    private async resolveBlock(file: TFile, subpath: string, request: EmbedRequest): Promise<string> {
        const fileCache = this.app.metadataCache.getFileCache(file);
        if (!fileCache) {
            throw new DynbeddedError('File cache not available for [[' + request.fileName + ']]');
        }
        const result = resolveSubpath(fileCache, '#' + subpath);
        if (!result || result.type !== 'block') {
            throw new DynbeddedError('Block "' + subpath + '" not found in [[' + request.fileName + ']]');
        }
        const lines = await this.readLines(file);
        const endLine = result.end ? result.end.line : result.start.line;
        return lines.slice(result.start.line, endLine + 1).join('\n');
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
