import { Anchor, DEFAULT_JOIN, DEFAULT_PARSER_DEFAULTS, DynbeddedError, EmbedRequest, ParserDefaults, Selector } from '../EmbedRequest';
import type { DisplayMode } from '../DynbeddedSettingTab';
import { parseShow } from './shared';

// Parses the native dynbedded code-block syntax into an EmbedRequest.
//
//   [[File]]                     → whole-file embed
//   [[File#Header]]              → heading-section embed (ends at next heading)
//   headerHierarchy: true        → section ends at equal/higher heading only
//   after: "text"                → from the anchor line (exclusive) to end of file (#26)
//   from: "text" / to: "text"    → text-anchored range, both ends inclusive (#26)
//
// A `#subpath` on the link takes precedence over range keys (existing behaviour wins).

const FILE_LINK = /\[\[([^\]]{2}.*)\]\]/u;
const HEADER_HIERARCHY = /^headerHierarchy:\s*true\s*$/m;
const AFTER = /^after:\s*"(.*)"\s*$/m;
const FROM = /^from:\s*"(.*)"\s*$/m;
const TO = /^to:\s*"(.*)"\s*$/m;
const DISPLAY = /^display:\s*(embedded|inline)\s*$/m;
const SHOW = /^show:\s*(.*)$/m;
const INCLUDE_HEADING = /^includeHeading:\s*(true|false)\s*$/m;

export function parseDynbedded(source: string, defaults: ParserDefaults = DEFAULT_PARSER_DEFAULTS): EmbedRequest {
    const linkMatch = FILE_LINK.exec(source);
    if (!linkMatch) {
        throw new DynbeddedError('Bad file link: ' + source);
    }

    let target = linkMatch[1];
    let subpath = '';
    const hashIndex = target.indexOf('#');
    if (hashIndex !== -1) {
        subpath = target.slice(hashIndex + 1);
        target = target.slice(0, hashIndex);
    }

    const displayMatch = DISPLAY.exec(source);
    const showMatch = SHOW.exec(source);
    const includeHeadingMatch = INCLUDE_HEADING.exec(source);

    return {
        fileName: target,
        selector: parseSelector(source, subpath),
        display: displayMatch ? (displayMatch[1] as DisplayMode) : defaults.display,
        attribution: showMatch ? parseShow(showMatch[1]) : [],
        headerHierarchy: HEADER_HIERARCHY.test(source),
        includeHeading: includeHeadingMatch ? includeHeadingMatch[1] === 'true' : defaults.includeHeading,
        join: DEFAULT_JOIN,
    };
}

// Serialises an EmbedRequest back into a ready-to-paste dynbedded code block.
// Inverse of parseDynbedded; used by the "Copy Dynbedded reference" command (#29).
export function serializeDynbedded(request: EmbedRequest): string {
    const subpath = request.selector.kind === 'subpath' ? '#' + request.selector.subpath : '';
    const lines: string[] = [`[[${request.fileName}${subpath}]]`];

    if (request.selector.kind === 'after') {
        lines.push(`after: ${serializeAnchor(request.selector.anchor)}`);
    } else if (request.selector.kind === 'between') {
        lines.push(`from: ${serializeAnchor(request.selector.from)}`);
        lines.push(`to: ${serializeAnchor(request.selector.to)}`);
    }

    if (request.selector.kind === 'subpath' && request.includeHeading) {
        lines.push('includeHeading: true');
    }
    if (request.display === 'inline') {
        lines.push('display: inline');
    }
    if (request.attribution.length > 0) {
        lines.push('show: ' + request.attribution.join(', '));
    }

    return '```dynbedded\n' + lines.join('\n') + '\n```';
}

function serializeAnchor(anchor: Anchor): string {
    return anchor.kind === 'text' ? `"${anchor.text}"` : `${anchor.line}:${anchor.col}`;
}

function parseSelector(source: string, subpath: string): Selector {
    if (subpath !== '') {
        return { kind: 'subpath', subpath };
    }

    const after = AFTER.exec(source);
    if (after) {
        return { kind: 'after', anchor: { kind: 'text', text: after[1] } };
    }

    const from = FROM.exec(source);
    const to = TO.exec(source);
    if (from && to) {
        return {
            kind: 'between',
            from: { kind: 'text', text: from[1] },
            to: { kind: 'text', text: to[1] },
        };
    }
    if (from || to) {
        throw new DynbeddedError('Range needs both from: and to: — found only ' + (from ? 'from:' : 'to:'));
    }

    return { kind: 'whole' };
}
