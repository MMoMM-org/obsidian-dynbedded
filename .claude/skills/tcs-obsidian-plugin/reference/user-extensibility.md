# User Extensibility — Plugins That Run User-Authored Code

Applies only to plugins that load and execute user-authored JavaScript / Node code (hooks, scripts, custom adapters, "Templater-style" extensibility). For plugins that don't allow user code, none of this matters.

---

## Trust Model: In-Process at Plugin Privilege

User-authored code runs **in-process at full plugin privilege** — vault, FS, network, anything the plugin can do. This is the honest model. Real Node sandboxing in Electron is hard, brittle, and gives users a false sense of security. Templater, Dataview, and similar Obsidian plugins all operate this way.

The protection mechanism is **disclosure**, not isolation:

- A first-execution disclosure modal shows the file path, file size, and capability scope.
- The user's "approve" is recorded in-memory only — never persisted.
- A `disabled` kill switch neutralizes all hooks regardless of past approvals.

If a plugin's threat model genuinely requires sandboxing, this whole pattern is the wrong choice. Move the code outside the plugin process — workers, child_process with restricted args, or a separate service.

---

## Three-State Policy: `enabled` / `disabled` / `ask`

- **`enabled`** — run silently.
- **`disabled`** — kill switch. Neutralizes all hooks regardless of any prior approvals. Must be honoured even mid-session.
- **`ask`** — prompt with a session-scoped decision. Approvals live in-memory only.

A persistent "always allow" weakens the trust contract substantially — a malicious dependency update could replace the hook file with the user never noticing. In-memory only means the prompt re-fires every session, which is the correct cost.

### File-Fingerprint Detection on `ask`

When a hook is approved in `ask` mode, capture a fingerprint at approval time:

```typescript
type Fingerprint = { size: number; mtimeMs: number };
```

On the next invocation, re-stat the file. If size or mtimeMs changed, treat the approval as expired and re-prompt. This catches the case where the user approves a hook, then the file is replaced (by sync, by another process, by a malicious update) before the next run.

---

## `require.cache` Eviction by Directory Prefix

When re-running a user-authored Node module between approvals (hook, script, custom adapter), evict not just the entry file from `require.cache` but every cached module whose key starts with the entry file's directory prefix. Otherwise transitive requires (`require("./_helper")`) cache across runs and the user executes stale code while believing they have approved the fresh version.

```typescript
function evictCacheByDirectory(entryFile: string): void {
  const dir = path.dirname(entryFile);
  for (const cached of Object.keys(require.cache)) {
    if (cached.startsWith(dir + path.sep)) delete require.cache[cached];
  }
}
```

Prefix-scope keeps `node_modules` warm — no need to reload the entire dependency tree on every hook re-run.

---

## Hook Timeout via `Promise.race` + `finally clearTimeout`

Race the hook execution against a timeout. CRITICAL: clear the loser timer in a `finally` block — `Promise.race` only resolves the winner; the loser keeps its closure alive for the full window.

```typescript
async function runWithTimeout<T>(op: () => Promise<T>, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      op(),
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error("hook timeout")), timeoutMs);
      }),
    ]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}
```

This protects against ASYNC hangs only. A hook with a sync infinite loop blocks the single-threaded event loop and cannot be killed without workers — accept it or move hook execution to workers.

---

## Tiny HookContext: Minimum Capability Surface

A user-authored hook with privilege over what it needs is intentional. A hook with privilege over things the plugin author didn't mean to expose (an IPC channel, a scheduler handle, a network client) is an accident waiting to happen.

```typescript
interface HookContext {
  action: HookAction;        // the data the hook is responding to
  app: App;                  // Obsidian App — vault, workspace, settings
  logger: HookLogger;        // structured logging back to the plugin
}
```

Smaller surface = stable surface = less version-coupling between hook authors and plugin releases. Refactoring internals doesn't break user hooks if internals were never in the context.

---

## Path Containment for Hook Discovery

When a plugin discovers hook files in a configured directory:

- Resolve symlinks on BOTH the configured root AND each candidate file via `fs.realpathSync` BEFORE the prefix check. See `architectural-patterns.md` § Path Containment.
- Reject files outside the resolved root with a distinct error code so the user can tell "you configured this wrong" from "this hook violates the rules."

A common attack/accident: a sync tool resolves a symlink to `/Users/<other>/...` and the hook directory ends up containing files from another user's directory. Realpath-based containment catches this before code execution.

---

## Two Review Rounds for User-Extensibility Surfaces

Round-1 review covers the surface area the spec writer thought about. Round-2 finds the surface area they didn't know to think about — transitive cache eviction, symlink resolution depth, capability leaks via the context object, race conditions on policy changes.

Budget for both rounds when adding a user-extensibility surface. The class of bugs round-2 finds (cache transitives, symlink resolution) are not visible in normal end-to-end testing because they require an attacker's perspective: "what could a malicious hook author do that an honest one would never try?"
