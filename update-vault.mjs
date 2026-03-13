import { readdirSync, renameSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const VAULT = new URL('./Dynbedded', import.meta.url).pathname;

// Use local date (not UTC) so vault files match the user's system clock.
function localDateStr(offsetDays = 0) {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    const year  = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day   = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

export async function updateVault() {
    const todayStr     = localDateStr(0);
    const yesterdayStr = localDateStr(-1);

    const plainDateFiles = [];  // YYYY-MM-DD.md — need today + yesterday
    const jobs = [];

    for (const entry of readdirSync(VAULT)) {
        // Plain date files — collect both, assign after sort
        if (/^\d{4}-\d{2}-\d{2}\.md$/.test(entry)) {
            plainDateFiles.push(entry);
            continue;
        }
        // "Not To be Found" → today
        const mNtbf = /^(\d{4}-\d{2}-\d{2}) Not To be Found\.md$/.exec(entry);
        if (mNtbf) {
            jobs.push({ from: join(VAULT, entry), to: join(VAULT, `${todayStr} Not To be Found.md`), date: mNtbf[1] });
            continue;
        }
        // DP- → today
        const mDp = /^DP-(\d{4}-\d{2}-\d{2})\.md$/.exec(entry);
        if (mDp) {
            jobs.push({ from: join(VAULT, entry), to: join(VAULT, `DP-${todayStr}.md`), date: mDp[1] });
        }
    }

    // Sort ascending: oldest file → yesterday, newest file → today
    plainDateFiles.sort();
    if (plainDateFiles[0]) {
        const d = plainDateFiles[0].slice(0, 10);
        jobs.push({ from: join(VAULT, plainDateFiles[0]), to: join(VAULT, `${yesterdayStr}.md`), date: d });
    }
    if (plainDateFiles[1]) {
        const d = plainDateFiles[1].slice(0, 10);
        jobs.push({ from: join(VAULT, plainDateFiles[1]), to: join(VAULT, `${todayStr}.md`), date: d });
    }

    // Rename newest-first to avoid collisions; skip no-ops
    jobs.sort((a, b) => b.date.localeCompare(a.date));
    for (const { from, to } of jobs) {
        if (from === to) continue;
        renameSync(from, to);
        console.log(`update-vault: ${from.split('/').pop()} → ${to.split('/').pop()}`);
    }

    // Update date headings in Dynamic Header Test.md:
    // sort headings descending, largest → today, second → yesterday
    const testFile = join(VAULT, 'Dynamic Header Test.md');
    const original = readFileSync(testFile, 'utf8');
    const dateHeadings = [...original.matchAll(/^(#{1,6} )(\d{4}-\d{2}-\d{2})$/gm)]
        .map(m => m[2])
        .sort()
        .reverse();                // [newest, oldest]
    const targets = [todayStr, yesterdayStr];
    let updated = original;
    for (let i = 0; i < dateHeadings.length && i < targets.length; i++) {
        updated = updated.replace(dateHeadings[i], targets[i]);
    }
    if (updated !== original) {
        writeFileSync(testFile, updated, 'utf8');
        console.log('update-vault: updated date headers in Dynamic Header Test.md');
    }
}
