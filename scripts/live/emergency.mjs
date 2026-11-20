/**
 * Last-resort cleanup of the live harness: when the process exits or gets
 * SIGINT/SIGTERM (Ctrl-C) while an Obsidian launch is open, kill that
 * Obsidian and synchronously remove its temp profile and owned vault, then
 * re-raise the signal. Listeners exist only while a launch is registered.
 * Ported from obsidian-manabi `test/live/emergency.ts`.
 */

const SIGNALS = ["SIGINT", "SIGTERM"];

/**
 * @param {(dir: string) => void} removeDirSync
 * @returns {{ register(entry: { kill(): void, dirs: string[] }): () => void }}
 */
export function createEmergencyCleanup(removeDirSync) {
	const entries = new Set();
	let installed = false;

	const cleanAll = () => {
		for (const entry of entries) {
			try {
				entry.kill();
			} catch {
				// already gone
			}
			for (const dir of entry.dirs) {
				try {
					removeDirSync(dir);
				} catch {
					// best effort while the process is going down
				}
			}
		}
		entries.clear();
	};

	const onExit = () => {
		cleanAll();
		uninstall();
	};
	const onSignal = (signal) => {
		cleanAll();
		uninstall();
		process.kill(process.pid, signal);
	};

	function install() {
		if (installed) return;
		installed = true;
		process.on("exit", onExit);
		for (const signal of SIGNALS) process.on(signal, onSignal);
	}

	function uninstall() {
		if (!installed) return;
		installed = false;
		process.off("exit", onExit);
		for (const signal of SIGNALS) process.off(signal, onSignal);
	}

	return {
		register(entry) {
			entries.add(entry);
			install();
			return () => {
				entries.delete(entry);
				if (entries.size === 0) uninstall();
			};
		},
	};
}
