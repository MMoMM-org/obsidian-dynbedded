import { DynbeddedError } from '../EmbedRequest';
import { serializeDynbedded } from '../parsers/DynbeddedParser';
import { parseQuoth } from '../parsers/QuothParser';

// Converts every ```quoth fenced block in a note's text to an equivalent
// ```dynbedded block (#30, reduced). Operates on a single note's content only —
// invoked explicitly per note; there is no vault-wide rewrite (Silent strategy).
// Blocks that fail to parse are left untouched so nothing is lost.
const QUOTH_BLOCK = /^```quoth[ \t]*\n([\s\S]*?)\n```[ \t]*$/gm;

export function convertQuothBlocks(content: string): { result: string; converted: number } {
    let converted = 0;
    const result = content.replace(QUOTH_BLOCK, (match, body: string) => {
        try {
            const block = serializeDynbedded(parseQuoth(body));
            converted++;
            return block;
        } catch (error) {
            if (error instanceof DynbeddedError) {
                return match; // leave unparseable quoth blocks as-is
            }
            throw error;
        }
    });
    return { result, converted };
}
