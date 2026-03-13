import { readdirSync, renameSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const VAULT = new URL('./Dynbedded', import.meta.url).pathname;

function addDays(dateStr, n) {
    const d = new Date(dateStr + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
}

export async function updateVault() {
    const filePatterns = [
        { pattern: /^(\d{4}-\d{2}-\d{2})\.md$/,                  build: (d) => `${d}.md` },
        { pattern: /^(\d{4}-\d{2}-\d{2}) Not To be Found\.md$/,   build: (d) => `${d} Not To be Found.md` },
        { pattern: /^DP-(\d{4}-\d{2}-\d{2})\.md$/,                build: (d) => `DP-${d}.md` },
    ];

    const jobs = [];
    for (const entry of readdirSync(VAULT)) {
        for (const { pattern, build } of filePatterns) {
            const m = pattern.exec(entry);
            if (m) {
                const newDate = addDays(m[1], 1);
                jobs.push({ from: join(VAULT, entry), to: join(VAULT, build(newDate)), date: m[1] });
                break;
            }
        }
    }

    // Rename newest first to avoid collision
    jobs.sort((a, b) => b.date.localeCompare(a.date));
    for (const { from, to } of jobs) {
        renameSync(from, to);
        console.log(`update-vault: ${from.split('/').pop()} → ${to.split('/').pop()}`);
    }

    // Update ## YYYY-MM-DD headers in Dynamic Header Test.md
    const testFile = join(VAULT, 'Dynamic Header Test.md');
    let content = readFileSync(testFile, 'utf8');
    content = content.replace(/^(#{1,6} )(\d{4}-\d{2}-\d{2})$/gm, (_, prefix, date) => prefix + addDays(date, 1));
    writeFileSync(testFile, content, 'utf8');
    console.log('update-vault: updated date headers in Dynamic Header Test.md');
}
