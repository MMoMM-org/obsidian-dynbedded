/**
 * Minimal Chrome DevTools Protocol client for the live harness: target
 * discovery over `/json/list` and `Runtime.evaluate` over a WebSocket.
 * No dependency: Node's `http` and global `WebSocket` (Node 22+).
 * Ported (reduced) from obsidian-manabi `test/live/cdp.ts`.
 */

import { get } from "node:http";

export class CdpError extends Error {
	name = "CdpError";
}

const DEFAULT_CALL_TIMEOUT_MS = 30_000;

export class CdpClient {
	#nextId = 1;
	#pending = new Map();
	#closedReason = null;
	#socket;

	/** @param {WebSocket} socket an open WebSocket to a page target */
	constructor(socket) {
		this.#socket = socket;
		socket.addEventListener("message", (event) => {
			if (typeof event.data === "string") this.#receive(event.data);
		});
		socket.addEventListener("close", (event) => this.#fail(`CDP socket closed: code ${event.code}`));
	}

	send(method, params, { timeoutMs = DEFAULT_CALL_TIMEOUT_MS } = {}) {
		if (this.#closedReason !== null) return Promise.reject(new CdpError(`${method}: ${this.#closedReason}`));
		const id = this.#nextId++;
		return new Promise((resolve, reject) => {
			const timer = setTimeout(() => {
				this.#pending.delete(id);
				reject(new CdpError(`${method} timed out after ${timeoutMs} ms`));
			}, timeoutMs);
			this.#pending.set(id, { method, resolve, reject, timer });
			try {
				this.#socket.send(JSON.stringify(params === undefined ? { id, method } : { id, method, params }));
			} catch (error) {
				clearTimeout(timer);
				this.#pending.delete(id);
				reject(new CdpError(`${method}: send failed: ${error instanceof Error ? error.message : String(error)}`));
			}
		});
	}

	/** `Runtime.evaluate` in the page: awaits a returned promise, returns the value as JSON; rejects on an exception. */
	async evaluate(expression, options = {}) {
		const reply = await this.send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true }, options);
		if (reply.exceptionDetails) {
			const details = reply.exceptionDetails;
			throw new CdpError(`Evaluation failed: ${details.exception?.description ?? details.text ?? "unknown exception"}`);
		}
		return reply.result.value;
	}

	close() {
		this.#fail("CDP client closed");
		this.#socket.close();
	}

	#receive(text) {
		let message;
		try {
			message = JSON.parse(text);
		} catch {
			return;
		}
		if (message.id === undefined) return; // an event; the harness subscribes to none
		const call = this.#pending.get(message.id);
		if (!call) return;
		this.#pending.delete(message.id);
		clearTimeout(call.timer);
		if (message.error) call.reject(new CdpError(`${call.method} failed: ${message.error.message ?? JSON.stringify(message.error)}`));
		else call.resolve(message.result);
	}

	#fail(reason) {
		this.#closedReason ??= reason;
		for (const [id, call] of this.#pending) {
			clearTimeout(call.timer);
			call.reject(new CdpError(`${call.method}: ${reason}`));
			this.#pending.delete(id);
		}
	}
}

/** The targets of a running Electron app (`GET http://127.0.0.1:port/json/list`). */
export function listTargets(port, timeoutMs = 2_000) {
	return new Promise((resolve, reject) => {
		const request = get({ host: "127.0.0.1", port, path: "/json/list", timeout: timeoutMs }, (response) => {
			const chunks = [];
			response.on("data", (chunk) => chunks.push(chunk));
			response.on("end", () => {
				if (response.statusCode !== 200) return reject(new Error(`/json/list answered HTTP ${response.statusCode ?? "?"}`));
				try {
					resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
				} catch (error) {
					reject(error);
				}
			});
		});
		request.on("timeout", () => request.destroy(new Error(`/json/list timed out after ${timeoutMs} ms`)));
		request.on("error", reject);
	});
}

/** The vault window: a page with a debugger URL, not the vault chooser (starter.html) or devtools. */
export function pickWorkspaceTarget(targets) {
	return targets.find((t) => t.type === "page" && t.webSocketDebuggerUrl !== undefined && t.url.startsWith("app://") && !t.url.includes("starter")) ?? null;
}

/** True when Obsidian shows its vault chooser: the temp profile's vault registry was not used. */
export function showsVaultChooser(targets) {
	return targets.some((t) => t.type === "page" && t.url.includes("starter"));
}

/** Opens a WebSocket to `url` and resolves a {@link CdpClient} on it. */
export function connectCdp(url, timeoutMs = 10_000) {
	if (typeof globalThis.WebSocket !== "function") return Promise.reject(new Error("No global WebSocket: the live harness needs Node 22 or newer"));
	return new Promise((resolve, reject) => {
		const socket = new WebSocket(url);
		const timer = setTimeout(() => {
			socket.close();
			reject(new Error(`Connecting to ${url} timed out after ${timeoutMs} ms`));
		}, timeoutMs);
		socket.addEventListener("error", () => {
			clearTimeout(timer);
			reject(new Error(`WebSocket error on ${url}`));
		});
		socket.addEventListener("open", () => {
			clearTimeout(timer);
			resolve(new CdpClient(socket));
		});
	});
}
