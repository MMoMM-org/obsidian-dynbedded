import { DEFAULT_JOIN, DynbeddedError, EmbedRequest } from '../EmbedRequest';

// Parses the native dynbedded code-block syntax into an EmbedRequest.
//
// Phase 0 supports the historical syntax verbatim:
//   [[File]]                     → whole-file embed
//   [[File#Header]]              → heading-section embed
//   headerHierarchy: true        → section ends at equal/higher heading only
// Range selectors (after / from-to / line:col / multi) are layered on in Phase 1.

const FILE_LINK = /\[\[([^\]]{2}.*)\]\]/u;
const HEADER_HIERARCHY = /^headerHierarchy:\s*true\s*$/m;

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
        selector: subpath === '' ? { kind: 'whole' } : { kind: 'subpath', subpath },
        display: 'embedded',
        attribution: [],
        headerHierarchy: HEADER_HIERARCHY.test(source),
        join: DEFAULT_JOIN,
    };
}
