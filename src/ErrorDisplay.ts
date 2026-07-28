import { App, Component, Keymap, setIcon, TFile } from 'obsidian';
import Dynbedded from './main';

// Everything needed to turn the "[[Target]]" inside an error message into a working
// link. `file` is null when the link could not be resolved — the link then renders
// muted but stays clickable, like a native unresolved [[link]] in Obsidian.
export interface ErrorLink {
    app: App;
    component: Component;
    sourcePath: string;
    fileName: string;
    file: TFile | null;
}

// Small link icon that opens `file`. Shared by the optional source-link on the
// success path and by the error box, so both look and behave identically.
export function createOpenNoteIcon(parent: HTMLElement, app: App, file: TFile, component: Component): HTMLElement {
    const link = parent.createSpan({
        cls: 'dynbedded-source-link',
        attr: { 'aria-label': 'Open ' + file.basename, role: 'link', tabindex: '0' },
    });
    setIcon(link, 'link');
    const open = () => { void app.workspace.getLeaf(false).openFile(file); };
    component.registerDomEvent(link, 'click', open);
    component.registerDomEvent(link, 'keydown', (event: KeyboardEvent) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            open();
        }
    });
    return link;
}

// Renders the error box. Without `link` this is the historical plain-text <pre>.
// With it, every "[[fileName]]" occurrence becomes a link and a link icon is
// appended when the target resolved (#39).
export function renderError(parent: HTMLElement, message: string, link?: ErrorLink) {
    const box = parent.createEl('pre', { cls: [Dynbedded.containerClass, Dynbedded.errorClass] });
    box.appendText('Dynbedded: Error: ');

    if (!link) {
        box.appendText(message);
        return;
    }

    // Split on the literal "[[fileName]]" rather than a generic [[...]] regex: the
    // Quoth parser's own 'missing "path: [[...]]"' message contains bracket syntax
    // that must not turn into a link to a note called "...".
    const token = '[[' + link.fileName + ']]';
    const segments = message.split(token);
    segments.forEach((segment, index) => {
        if (index > 0) {
            renderLink(box, link, token);
        }
        box.appendText(segment);
    });

    if (link.file) {
        createOpenNoteIcon(box, link.app, link.file, link.component)
            .addClass('dynbedded-source-link-inline');
    }
}

function renderLink(box: HTMLElement, link: ErrorLink, text: string) {
    const anchor = box.createEl('a', {
        cls: 'dynbedded-error-link',
        text,
        // href makes the anchor keyboard-focusable; the click handler below always
        // preventDefault()s, so the browser never navigates it.
        attr: { href: link.fileName, 'aria-label': 'Open ' + link.fileName },
    });
    if (!link.file) {
        anchor.addClass('is-unresolved');
    }
    link.component.registerDomEvent(anchor, 'click', (event: MouseEvent) => {
        event.preventDefault();
        // openLinkText also covers the unresolved case (creates the note), matching
        // what clicking a native unresolved link does.
        void link.app.workspace.openLinkText(link.fileName, link.sourcePath, Keymap.isModEvent(event));
    });
}
