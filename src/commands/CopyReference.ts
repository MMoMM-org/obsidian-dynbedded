import { Editor, TFile } from 'obsidian';
import { EmbedRequest, Selector } from '../EmbedRequest';

// Builds a dynbedded EmbedRequest referencing the editor's current selection or
// cursor (#29), mirroring Quoth's "Copy reference" command. Serialise the result
// with serializeDynbedded() to get a ready-to-paste block.
//
// - A multi-line selection → `from "<first line>" to "<last line>"`
// - A single-line / partial selection → that one line (from == to)
// - No selection, cursor on a heading → `#Heading` subpath
// - No selection elsewhere → whole-file reference
export function buildReference(editor: Editor, file: TFile): EmbedRequest {
    return baseRequest(file.basename, selectorFor(editor));
}

function selectorFor(editor: Editor): Selector {
    if (editor.getSelection().trim().length > 0) {
        const range = editor.listSelections()[0];
        const startLine = Math.min(range.anchor.line, range.head.line);
        const endLine = Math.max(range.anchor.line, range.head.line);
        const from = editor.getLine(startLine).trim();
        const to = editor.getLine(endLine).trim();
        return {
            kind: 'between',
            from: { kind: 'text', text: from },
            to: { kind: 'text', text: to },
        };
    }

    const cursorLine = editor.getLine(editor.getCursor().line);
    const heading = /^#{1,6}\s+(.*)$/.exec(cursorLine);
    if (heading) {
        return { kind: 'subpath', subpath: heading[1].trim() };
    }

    return { kind: 'whole' };
}

function baseRequest(fileName: string, selector: Selector): EmbedRequest {
    return {
        fileName,
        selector,
        display: 'embedded',
        attribution: [],
        headerHierarchy: false,
        join: ' ... ',
    };
}
