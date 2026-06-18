// Syntax-agnostic internal model shared by every front-end parser
// (dynbedded native + quoth compat) and consumed by the SelectorResolver.

export type Anchor =
    | { kind: 'text'; text: string }            // matches a line by its raw text (incl. any '#')
    | { kind: 'pos'; line: number; col: number }; // positional, line:col (Quoth)

export type Selector =
    | { kind: 'whole' }                          // [[File]] — entire file
    | { kind: 'subpath'; subpath: string }       // [[File#Heading]] / #^block / #-list
    | { kind: 'after'; anchor: Anchor }          // from anchor (exclusive) to end of section/file
    | { kind: 'between'; from: Anchor; to: Anchor }
    | { kind: 'multi'; parts: Selector[] };      // several ranges joined by EmbedRequest.join

export interface EmbedRequest {
    fileName: string;                            // link target; {{...}} tokens resolved by the orchestrator
    selector: Selector;
    display: 'embedded' | 'inline';              // matches Quoth vocabulary; 'embedded' === block
    attribution: ('author' | 'title')[];         // empty = no attribution footer
    headerHierarchy: boolean;                    // #2 flag, only meaningful for heading selectors
    join: string;                                // separator for multi-range embeds
}

export const DEFAULT_JOIN = ' ... ';             // Quoth default

// Thrown by parsers / the resolver for user-facing, recoverable problems.
// The processor catches it and routes the message through showError (silent-mode aware).
export class DynbeddedError extends Error {}
