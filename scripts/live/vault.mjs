/**
 * Temp vault and isolated Obsidian profile of the live harness.
 *
 * The vault is a copy of the repo's `Dynbedded/` test vault (or an empty one)
 * with the plugin build installed and enabled. The profile is a temporary
 * Electron `--user-data-dir` whose `obsidian.json` lists only that vault, as
 * open, with app updates off. Obsidian then opens it on start, runs as its
 * own instance next to a running Obsidian, and never touches the user's real
 * profile or vaults. Adapted from obsidian-manabi `test/live/vault.ts`.
 */

import { randomBytes } from "node:crypto";
import { copyFile, cp, mkdir, mkdtemp, readFile, realpath, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

export const PLUGIN_ID = "obsidian-dynbedded";
const REQUIRED_PLUGIN_FILES = ["main.js", "manifest.json"];
const OPTIONAL_PLUGIN_FILES = ["styles.css"];

const exists = (file) => stat(file).then(() => true, () => false);

async function installPlugin(vault, pluginDir) {
	for (const name of REQUIRED_PLUGIN_FILES) {
		if (!(await exists(path.join(pluginDir, name)))) {
			throw new Error(`Plugin build not found: ${path.join(pluginDir, name)}. Run \`npm run build\` first (or set DYNBEDDED_PLUGIN_DIR).`);
		}
	}
	const target = path.join(vault, ".obsidian", "plugins", PLUGIN_ID);
	await rm(target, { recursive: true, force: true });
	await mkdir(target, { recursive: true });
	for (const name of [...REQUIRED_PLUGIN_FILES, ...OPTIONAL_PLUGIN_FILES]) {
		const source = path.join(pluginDir, name);
		if (await exists(source)) await copyFile(source, path.join(target, name));
	}
}

/** Makes sure `community-plugins.json` lists the plugin (keeps the vault's other entries). */
async function enablePluginInVault(vault) {
	const file = path.join(vault, ".obsidian", "community-plugins.json");
	const current = JSON.parse(await readFile(file, "utf8").catch(() => "[]"));
	const list = Array.isArray(current) ? current : [];
	if (!list.includes(PLUGIN_ID)) list.push(PLUGIN_ID);
	await writeFile(file, JSON.stringify(list, null, 2));
}

/**
 * Writes a temp vault: a copy of `sourceVault` (null = empty vault), the
 * plugin build from `pluginDir` installed over whatever the copy had, and the
 * plugin enabled. Returns the vault's real path; on failure nothing is left.
 */
export async function createTempVault({ sourceVault, pluginDir }) {
	const vault = await realpath(await mkdtemp(path.join(tmpdir(), "dynbedded-live-vault-")));
	try {
		if (sourceVault !== null) await cp(sourceVault, vault, { recursive: true });
		await mkdir(path.join(vault, ".obsidian"), { recursive: true });
		await installPlugin(vault, pluginDir);
		await enablePluginInVault(vault);
		return vault;
	} catch (error) {
		await rm(vault, { recursive: true, force: true });
		throw error;
	}
}

/**
 * Writes the profile's vault registry: only this vault, open; app updates off,
 * so Obsidian neither downloads nor swaps the app during a run.
 */
export async function writeProfile(profileDir, vaultPath) {
	const vaultId = randomBytes(8).toString("hex");
	const registry = { updateDisabled: true, vaults: { [vaultId]: { path: vaultPath, ts: Date.now(), open: true } } };
	await writeFile(path.join(profileDir, "obsidian.json"), JSON.stringify(registry));
}
