/**
 * `npm run live:open`: a throw-away Obsidian with the built plugin for
 * inspecting by hand (docs/live-testing.md). Temp profile, trusted temp copy
 * of the `Dynbedded/` test vault, version check. Stays open until Obsidian is
 * quit or Ctrl-C; then the profile and, unless `--keep`, the vault are removed.
 */

import { buildVault, launchObsidian } from "./live/harness.mjs";
import { PLUGIN_ID } from "./live/vault.mjs";

const USAGE = `Usage: npm run live:open -- [--empty] [--keep] [--settings] [--smoke]
  Opens a throw-away Obsidian (temp profile) on a copy of the Dynbedded/ test vault with the plugin from build/.
  --empty     an empty vault instead of the test vault copy
  --keep      keep the temp vault afterwards and print its path
  --settings  open the Dynbedded settings tab after launch
  --smoke     launch, print a status check, quit and clean up (no interaction)
Run npm run build first. Ctrl-C or quitting Obsidian ends it and cleans up.`;

function parseArgs(argv) {
	const options = { empty: false, keep: false, settings: false, smoke: false, help: false };
	for (const arg of argv) {
		if (arg === "--") continue;
		else if (arg === "--empty") options.empty = true;
		else if (arg === "--keep") options.keep = true;
		else if (arg === "--settings") options.settings = true;
		else if (arg === "--smoke") options.smoke = true;
		else if (arg === "--help" || arg === "-h") options.help = true;
		else throw new Error(`Unknown option ${arg}\n${USAGE}`);
	}
	return options;
}

// Page-side functions: run in Obsidian's window via cdp.call (page globals only, no closures).
/* global app */

/** Opens Obsidian's settings on the plugin's tab (`app.setting` is internal API, fine for a dev tool). */
const openSettings = (id) => {
	app.setting.open();
	app.setting.openTabById(id);
	return true;
};

/** What `--smoke` reports: the plugin version and whether the settings tab is declarative (1.13+). */
const status = (id) => {
	const plugin = app.plugins.plugins[id];
	const tab = (app.setting?.pluginTabs ?? []).find((t) => t.id === id);
	const items = tab && typeof tab.getSettingDefinitions === "function" ? tab.getSettingDefinitions() : [];
	return { pluginVersion: plugin?.manifest?.version ?? null, settingsTab: tab !== undefined, settingDefinitions: items.length };
};

async function main(argv) {
	const options = parseArgs(argv);
	if (options.help) {
		console.log(USAGE);
		return;
	}
	const vault = await buildVault({ empty: options.empty, keep: options.keep });
	const session = await launchObsidian(vault);
	console.log(`[live:open] Obsidian ${session.appVersion} with ${options.empty ? "an empty vault" : "a copy of the Dynbedded/ test vault"}`);
	console.log(`[live:open] vault: ${session.vaultPath}${options.keep ? " (kept afterwards)" : " (removed afterwards)"}`);
	console.log(`[live:open] Obsidian log: ${session.logFile}`);

	if (options.smoke) {
		const report = await session.cdp.call(status, [PLUGIN_ID]);
		console.log(`[live:open] smoke: ${JSON.stringify(report)}`);
		await session.close();
		if (!report.pluginVersion || !report.settingsTab) process.exitCode = 1;
		return;
	}
	if (options.settings) {
		await session.cdp.call(openSettings, [PLUGIN_ID]).catch((e) => console.warn(`[live:open] could not open the settings tab: ${e.message}`));
	}
	console.log("[live:open] Ctrl-C to quit and clean up (or quit Obsidian).");
	await session.exited;
	console.log("[live:open] Obsidian quit; cleaning up.");
	await session.close();
	if (options.keep) console.log(`[live:open] vault kept: ${session.vaultPath}`);
}

main(process.argv.slice(2)).catch((error) => {
	console.error(error instanceof Error ? error.message : String(error));
	process.exitCode = 1;
});
