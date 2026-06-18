// Helpers shared by the dynbedded and quoth front-end parsers.
// Imports nothing from either parser, so QuothParser stays self-contained/deletable.

// Splits on a single-character delimiter at the top level, ignoring delimiters
// that sit inside double quotes. Trims and drops empty segments.
export function splitTopLevel(input: string, delimiter: string): string[] {
    const out: string[] = [];
    let current = '';
    let inQuotes = false;
    for (const ch of input) {
        if (ch === '"') {
            inQuotes = !inQuotes;
        }
        if (ch === delimiter && !inQuotes) {
            out.push(current);
            current = '';
        } else {
            current += ch;
        }
    }
    out.push(current);
    return out.map(s => s.trim()).filter(s => s.length > 0);
}

// Parses a `show:` value (e.g. `author, title`) into the attribution list.
export function parseShow(value: string): ('author' | 'title')[] {
    const out: ('author' | 'title')[] = [];
    for (const token of splitTopLevel(value, ',')) {
        if (token === 'author' || token === 'title') {
            out.push(token);
        }
    }
    return out;
}
