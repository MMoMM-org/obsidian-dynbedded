import { Anchor, DEFAULT_JOIN, DEFAULT_PARSER_DEFAULTS, DynbeddedError, EmbedRequest, ParserDefaults, Selector } from '../EmbedRequest';
import type { DisplayMode } from '../DynbeddedSettingTab';
import { parseShow, splitTopLevel } from './shared';

// Opt-in compatibility adapter: parses the deprecated Quoth code-block syntax
// into an EmbedRequest so Dynbedded can render `quoth` blocks unchanged.
//
//   path: [[file#subpath]]            required
//   ranges: after "X" | "X" to "Y" | line:col to line:col | "X"   (comma-separated)
//   join: "string"                    multi-range separator (default " ... ")
//   display: embedded | inline        default embedded
//   show: author, title               attribution
//
// Isolated and deletable: nothing else imports this except the guarded
// registration in main.ts. The `defaultDisplay` argument is intentionally
// ignored — Quoth's own default (embedded) governs `quoth` blocks for fidelity.
//
// Known limitations (see spec open questions): `#-list` subpaths, column-precise
// line:col offsets, and the subpath+ranges composition are line-granular or unsupported.

const PATH = /^path:\s*\[\[([^\]]{2}.*)\]\]\s*$/m;
const RANGES = /^ranges:\s*(.*)$/m;
const JOIN = /^join:\s*"(.*)"\s*$/m;
const DISPLAY = /^display:\s*(embedded|inline)\s*$/m;
const SHOW = /^show:\s*(.*)$/m;

export function parseQuoth(source: string, defaults: ParserDefaults = DEFAULT_PARSER_DEFAULTS): EmbedRequest {
    const pathMatch = PATH.exec(source);
    if (!pathMatch) {
        throw new DynbeddedError('Quoth block missing "path: [[...]]"');
    }

    let target = pathMatch[1];
    let subpath = '';
    const hashIndex = target.indexOf('#');
    if (hashIndex !== -1) {
        subpath = target.slice(hashIndex + 1);
        target = target.slice(0, hashIndex);
    }

    const joinMatch = JOIN.exec(source);
    const join = joinMatch ? joinMatch[1] : DEFAULT_JOIN;

    const displayMatch = DISPLAY.exec(source);
    const display: DisplayMode = displayMatch ? (displayMatch[1] as DisplayMode) : 'embedded';

    const showMatch = SHOW.exec(source);
    const attribution = showMatch ? parseShow(showMatch[1]) : [];

    const rangesMatch = RANGES.exec(source);
    const selector: Selector = rangesMatch
        ? parseRanges(rangesMatch[1])
        : subpath !== ''
            ? { kind: 'subpath', subpath }
            : { kind: 'whole' };

    // Quoth has no includeHeading key — fall back to the Dynbedded default.
    return { fileName: target, selector, display, attribution, headerHierarchy: false, includeHeading: defaults.includeHeading, join };
}

function parseRanges(value: string): Selector {
    const parts = splitTopLevel(value, ',').map(parseRange);
    if (parts.length === 0) {
        return { kind: 'whole' };
    }
    return parts.length === 1 ? parts[0] : { kind: 'multi', parts };
}

function parseRange(segment: string): Selector {
    const trimmed = segment.trim();

    const after = /^after\s+(.*)$/.exec(trimmed);
    if (after) {
        return { kind: 'after', anchor: parseAnchor(after[1]) };
    }

    const toSplit = splitOnTo(trimmed);
    if (toSplit) {
        return { kind: 'between', from: parseAnchor(toSplit[0]), to: parseAnchor(toSplit[1]) };
    }

    // A lone "text" range embeds that single matched line.
    const anchor = parseAnchor(trimmed);
    return { kind: 'between', from: anchor, to: anchor };
}

function parseAnchor(token: string): Anchor {
    const trimmed = token.trim();

    const quoted = /^"(.*)"$/.exec(trimmed);
    if (quoted) {
        return { kind: 'text', text: quoted[1] };
    }

    const pos = /^(\d+):(\d+)$/.exec(trimmed);
    if (pos) {
        return { kind: 'pos', line: Number(pos[1]), col: Number(pos[2]) };
    }

    throw new DynbeddedError('Bad quoth range anchor: ' + token);
}

// Splits a range segment on the first top-level " to " (outside quotes).
function splitOnTo(segment: string): [string, string] | null {
    let inQuotes = false;
    for (let i = 0; i < segment.length; i++) {
        if (segment[i] === '"') {
            inQuotes = !inQuotes;
        }
        if (!inQuotes && segment.startsWith(' to ', i)) {
            return [segment.slice(0, i), segment.slice(i + 4)];
        }
    }
    return null;
}
