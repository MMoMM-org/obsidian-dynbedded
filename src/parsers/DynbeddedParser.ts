import { DEFAULT_JOIN, DynbeddedError, EmbedRequest, Selector } from '../EmbedRequest';

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

export function parseDynbedded(source: string): EmbedRequest {
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

    return {
        fileName: target,
        selector: parseSelector(source, subpath),
        display: 'embedded',
        attribution: [],
        headerHierarchy: HEADER_HIERARCHY.test(source),
        join: DEFAULT_JOIN,
    };
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
