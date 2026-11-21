/**
 * Live harness: launches real Obsidian on a temp vault with the built plugin,
 * driven over the Chrome DevTools Protocol. Usage: docs/live-testing.md.
 *
 * Isolation: each launch gets a temporary Electron `--user-data-dir` profile
 * whose `obsidian.json` registers only the temp vault. The user's real
 * Obsidian profile, vault list and vaults are never read or written, and a
 * running Obsidian is not affected (the single-instance lock is per profile).
 * Adapted from obsidian-manabi `test/live/harness.ts`.
 */

import { spawn } from "node:child_process";
import { createWriteStream, existsSync, mkdirSync, rmSync } from "node:fs";
import { mkdtemp, readFile, realpath, rm } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { connectCdp, listTargets, pickWorkspaceTarget, showsVaultChooser } from "./cdp.mjs";
import { createEmergencyCleanup } from "./emergency.mjs";
import { createTempVault, PLUGIN_ID, writeProfile } from "./vault.mjs";

export const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
/** Per-launch Obsidian logs (gitignored). */
export const LIVE_OUTPUT_DIR = path.join(REPO_ROOT, "live-output");

const DEFAULT_OBSIDIAN_BIN = "/Applications/Obsidian.app/Contents/MacOS/Obsidian";
const nonEmpty = (value) => (value === undefined || value === "" ? null : value);

export const liveConfig = {
	/** Obsidian executable (`OBSIDIAN_BIN`); point it at another installer to run another app version. */
	bin: nonEmpty(process.env.OBSIDIAN_BIN) ?? DEFAULT_OBSIDIAN_BIN,
	/** `OBSIDIAN_EXPECT_VERSION`: the launch fails when Obsidian reports another version. */
	expectVersion: nonEmpty(process.env.OBSIDIAN_EXPECT_VERSION),
	/** Folder with main.js, manifest.json, styles.css (`DYNBEDDED_PLUGIN_DIR`, default `build/`). */
	pluginDir: nonEmpty(process.env.DYNBEDDED_PLUGIN_DIR) ?? path.join(REPO_ROOT, "build"),
	/** The test vault copied for each launch. */
	sourceVault: path.join(REPO_ROOT, "Dynbedded"),
};

/** Time limits of one launch; generous because a cold Electron start on a busy Mac can take a while. */
const TIMEOUTS = { window: 45_000, layout: 45_000, plugin: 30_000, quit: 10_000, kill: 5_000 };

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Calls `probe` until it returns a truthy value; a probe that throws stops the wait at once. */
async function waitFor(probe, { timeoutMs, intervalMs = 250, what }) {
	const deadline = Date.now() + timeoutMs;
	for (;;) {
		const value = await probe();
		if (value) return value;
		if (Date.now() >= deadline) throw new Error(`Timed out after ${timeoutMs} ms waiting for ${what}`);
		await sleep(Math.min(intervalMs, Math.max(0, deadline - Date.now())));
	}
}

/** Numeric comparison of dotted versions; missing parts count as 0. */
export function compareVersions(a, b) {
	const pa = a.split(".").map(Number);
	const pb = b.split(".").map(Number);
	for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
		const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
		if (diff !== 0) return diff;
	}
	return 0;
}

/** Vaults made by the harness: only these are deleted on close. */
const ownedVaults = new Set();
const emergency = createEmergencyCleanup((dir) => rmSync(dir, { recursive: true, force: true }));

/**
 * Writes a temp vault (copy of `Dynbedded/`, or empty with `empty: true`) with
 * the built plugin. With `keep: true` the harness does not own it, so neither
 * close() nor the emergency cleanup removes it.
 */
export async function buildVault({ empty = false, keep = false } = {}) {
	const vault = await createTempVault({ sourceVault: empty ? null : liveConfig.sourceVault, pluginDir: liveConfig.pluginDir });
	if (!keep) ownedVaults.add(vault);
	return vault;
}

function freePort() {
	return new Promise((resolve, reject) => {
		const server = createServer();
		server.once("error", reject);
		server.listen(0, "127.0.0.1", () => {
			const address = server.address();
			const port = typeof address === "object" && address !== null ? address.port : 0;
			server.close(() => (port > 0 ? resolve(port) : reject(new Error("No free port"))));
		});
	});
}

function openLaunchLog() {
	mkdirSync(LIVE_OUTPUT_DIR, { recursive: true });
	const stamp = new Date().toISOString().slice(0, 19).replace(/:/g, "-");
	const file = path.join(LIVE_OUTPUT_DIR, `obsidian-${stamp}-${process.pid}.log`);
	return { file, stream: createWriteStream(file) };
}

/** Writes Obsidian's stdout/stderr to `log` (never the terminal); returns its last lines for launch errors. */
function outputTail(child, log, maxLines = 40) {
	const lines = [];
	const push = (chunk) => {
		log.write(chunk);
		lines.push(...chunk.toString("utf8").split("\n").filter((l) => l.trim() !== ""));
		lines.splice(0, Math.max(0, lines.length - maxLines));
	};
	child.stdout?.on("data", push);
	child.stderr?.on("data", push);
	return () => (lines.length === 0 ? "(no output)" : lines.join("\n"));
}

const hasExited = (child) => child.exitCode !== null || child.signalCode !== null;

function waitForExit(child, timeoutMs) {
	if (hasExited(child)) return Promise.resolve(true);
	return new Promise((resolve) => {
		const timer = setTimeout(() => resolve(false), timeoutMs);
		child.once("exit", () => {
			clearTimeout(timer);
			resolve(true);
		});
	});
}

async function stopProcess(child) {
	if (hasExited(child)) return;
	child.kill("SIGTERM");
	if (await waitForExit(child, TIMEOUTS.quit)) return;
	child.kill("SIGKILL");
	await waitForExit(child, TIMEOUTS.kill);
}

const removeDir = (dir) => rm(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });

async function readMinAppVersion(pluginDir) {
	const file = path.join(pluginDir, "manifest.json");
	const manifest = JSON.parse(await readFile(file, "utf8").catch(() => "{}"));
	if (typeof manifest.minAppVersion !== "string") throw new Error(`No minAppVersion in ${file}. Run \`npm run build\` first.`);
	return manifest.minAppVersion;
}

/** `cdp.call` that answers null while the page reloads or has no `app` yet. */
async function tryCall(cdp, fn, args = []) {
	try {
		return await cdp.call(fn, args, { timeoutMs: 5_000 });
	} catch {
		return null;
	}
}

// Page-side probes: run in Obsidian's window via cdp.call (page globals only, no closures).
/* global app, localStorage, location */
const layoutReady = () => typeof app !== "undefined" && app.workspace?.layoutReady === true;
const pluginsOn = () => typeof app !== "undefined" && app.workspace?.layoutReady === true && app.plugins.isEnabled() === true;
const pluginLoaded = (id) => typeof app !== "undefined" && app.workspace?.layoutReady === true && app.plugins.isEnabled() === true && app.plugins.plugins[id] !== undefined;
const trustVaultAndReload = () => {
	localStorage.setItem("enable-plugin-" + app.appId, "true");
	setTimeout(() => location.reload(), 50);
	return true;
};
const enablePluginViaApi = (id) => app.plugins.setEnable(true).then(() => app.plugins.enablePlugin(id));

/**
 * A fresh profile starts in restricted mode (and may show the trust prompt):
 * set Obsidian's per-vault flag and reload, so the vault starts like a trusted
 * one. If the flag does not work in this version, fall back to the plugin API.
 */
async function enableCommunityPlugins(cdp) {
	if (await tryCall(cdp, pluginsOn)) return;
	await cdp.call(trustVaultAndReload);
	const enabled = await waitFor(() => tryCall(cdp, pluginsOn), {
		timeoutMs: TIMEOUTS.layout,
		what: "the workspace to come back with community plugins on after the reload",
	}).catch(() => false);
	if (enabled) return;
	await waitFor(() => tryCall(cdp, layoutReady), { timeoutMs: TIMEOUTS.layout, what: "workspace layout ready" });
	await cdp.call(enablePluginViaApi, [PLUGIN_ID]);
}

async function findWindow(port, child, tail) {
	let lastTargets = [];
	return waitFor(
		async () => {
			if (hasExited(child)) throw new Error(`Obsidian exited during start (code ${String(child.exitCode)}, signal ${String(child.signalCode)})`);
			lastTargets = await listTargets(port).catch(() => []);
			return pickWorkspaceTarget(lastTargets);
		},
		{ timeoutMs: TIMEOUTS.window, what: "the vault window's CDP target" },
	).catch((error) => {
		const chooser = showsVaultChooser(lastTargets) ? " Obsidian shows its vault chooser: the temp profile's vault registry was not used." : "";
		throw new Error(`${error instanceof Error ? error.message : String(error)}.${chooser}\nTargets: ${JSON.stringify(lastTargets)}\nOutput:\n${tail()}`);
	});
}

/**
 * Starts Obsidian with `--remote-debugging-port` on `vaultPath` in a temp
 * profile and resolves once the workspace layout is ready, community plugins
 * are on and Dynbedded is loaded. On any failure Obsidian is stopped and the
 * temp files are removed before the error is thrown.
 */
export async function launchObsidian(vaultPath) {
	if (!existsSync(liveConfig.bin)) throw new Error(`Obsidian not found at ${liveConfig.bin}; set OBSIDIAN_BIN.`);
	const vault = await realpath(vaultPath);
	const profileDir = await realpath(await mkdtemp(path.join(tmpdir(), "dynbedded-live-profile-")));
	const log = openLaunchLog();
	let child = null;
	let cdp = null;
	let closing = null;
	const unregister = emergency.register({
		kill: () => {
			if (child && !hasExited(child)) child.kill("SIGKILL");
		},
		dirs: ownedVaults.has(vault) ? [profileDir, vault] : [profileDir],
	});

	const close = () => {
		closing ??= (async () => {
			try {
				cdp?.close();
				if (child) await stopProcess(child);
				log.stream.end();
				await removeDir(profileDir);
				if (ownedVaults.delete(vault)) await removeDir(vault);
			} finally {
				unregister();
			}
		})();
		return closing;
	};

	try {
		const minAppVersion = await readMinAppVersion(liveConfig.pluginDir);
		await writeProfile(profileDir, vault);
		const port = await freePort();
		const started = spawn(liveConfig.bin, [`--user-data-dir=${profileDir}`, `--remote-debugging-port=${port}`], { stdio: ["ignore", "pipe", "pipe"] });
		child = started;
		const exited = new Promise((resolve) => started.once("exit", () => resolve()));
		const tail = outputTail(started, log.stream);
		const spawnError = new Promise((_, reject) => started.once("error", (e) => reject(new Error(`Cannot start ${liveConfig.bin}: ${e.message}`))));
		spawnError.catch(() => undefined); // only the race below reports it

		const target = await Promise.race([findWindow(port, started, tail), spawnError]);
		cdp = await connectCdp(target.webSocketDebuggerUrl);
		const client = cdp;
		await waitFor(() => tryCall(client, layoutReady), { timeoutMs: TIMEOUTS.layout, what: "workspace layout ready" });

		const opened = await client.evaluate(`app.vault.adapter.basePath`);
		if (path.resolve(opened) !== vault) throw new Error(`Obsidian opened ${opened}, not the temp vault ${vault}`);

		const userAgent = await client.evaluate("navigator.userAgent");
		const appVersion = /obsidian\/([\d.]+)/i.exec(userAgent)?.[1] ?? "unknown";
		if (liveConfig.expectVersion !== null && appVersion !== liveConfig.expectVersion) {
			throw new Error(`Expected Obsidian ${liveConfig.expectVersion} (OBSIDIAN_EXPECT_VERSION) but it runs ${appVersion} (installer: ${liveConfig.bin}).`);
		}
		if (appVersion !== "unknown" && compareVersions(appVersion, minAppVersion) < 0) {
			throw new Error(`Obsidian ${appVersion} is below the plugin's minAppVersion ${minAppVersion} (installer: ${liveConfig.bin}).`);
		}

		await enableCommunityPlugins(client);
		await waitFor(() => tryCall(client, pluginLoaded, [PLUGIN_ID]), {
			timeoutMs: TIMEOUTS.plugin,
			what: `plugin "${PLUGIN_ID}" to load (check the build in ${liveConfig.pluginDir} and the console of the Obsidian window)`,
		});
		return { cdp: client, vaultPath: vault, appVersion, logFile: log.file, exited, close };
	} catch (error) {
		await close().catch((cleanupError) => console.warn("[live] cleanup after a failed launch failed:", cleanupError));
		if (error instanceof Error) error.message += `\nObsidian log: ${log.file}`;
		throw error;
	}
}
