# Obsidian Plugin Architectural Patterns

Higher-level structural patterns for plugins beyond a few hundred LOC: layout, security boundaries, UI composition, build/bundle, release. These are conventions distilled from shipped plugins; pick what fits the plugin's complexity.

---

## Layout and Boundaries

### One Adapter per External API Surface

Each Obsidian subsystem (note body, frontmatter, search, delete, file ops, metadata cache) has different semantics. A monolithic `VaultAdapter` accumulates conditional branches and obscures behaviour. Split per surface:

```
src/obsidian/
├── note-adapter.ts          # vault.read / vault.modify / vault.process for body
├── frontmatter-adapter.ts   # processFrontMatter wrapper
├── delete-adapter.ts        # fileManager.trashFile wrapper
├── search-adapter.ts        # metadataCache queries
└── leaf-adapter.ts          # workspace leaf reuse + activation
```

Each adapter stays roughly 150–300 LOC, tests stay narrowly scoped, and the request-mapper picks the right one explicitly. The same pattern applies to FS (one adapter per OS-resource type), to external HTTP APIs (one per service), to IPC channels.

### Hexagonal Layout for Plugins

I/O surfaces (Obsidian Vault, FS, network, IPC) live in `src/<surface>/` with a port interface and an adapter implementation. Domain logic in `src/domain/`, `src/executor/`, `src/actions/` holds zero direct dependencies on Obsidian or Node. `src/main.ts` is the only wiring file — it constructs the adapters and injects them.

Tests substitute fakes for any adapter without touching domain code.

For deeper coverage of ports-and-adapters, dependency direction, and domain isolation, see the `tcs-hexagonal` skill.

### Single Time-Bounded Adapter for Blocking I/O

When a plugin reaches blocking external resources (FS, child_process, network), wrap every call in one adapter that adds a timeout and maps native errors to a closed `ErrorCode` union:

```typescript
async runWithTimeout<T>(op: () => Promise<T>, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      op(),
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new IoError("timeout")), timeoutMs);
      }),
    ]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}
```

The timeout reads from a closure-injected getter so settings changes apply live. Errors map to a structured log's vocabulary, so observability is uniform.

---

## Permission and Trust Boundaries

These apply when a plugin gates capabilities (per-key, per-path, per-feature). For local-only plugins with no inbound external surface, most of this is overkill — see "Auth at the Trust Boundary" below.

### Permission Chain Over Monolithic Check

When a plugin has multiple permission concerns (auth, scope, path, capability, etc.), compose them as a chain of single-purpose gates: each gate is a function returning `Allow | Deny(reason)`, the chain stops at the first `Deny`.

```typescript
type GateResult = { type: "allow" } | { type: "deny"; reason: string };
type Gate = (req: Request) => GateResult;

const gates: Gate[] = [authGate, scopeGate, pathGate, capabilityGate];

function check(req: Request): GateResult {
  for (const gate of gates) {
    const r = gate(req);
    if (r.type === "deny") return r;
  }
  return { type: "allow" };
}
```

Each gate is independently testable. Order matters for information leakage: check auth before scope, scope before path, path before capability — so a denial doesn't accidentally signal that a resource exists.

### Default-Deny Means Absence of a Rule Is Denial

Two outcomes only: matched rule's effective permissions, or denial. A third option ("fall back to default", "ask the user", "use the previous match") is a silent expansion of the trust surface.

Convention: any code that conditionally inverts a permission flag based on mode is a bug. Permission flags are literal — `{ read: true, write: false }` means the same in every mode. What changes between whitelist and blacklist modes is the default for *unlisted* paths (deny in whitelist, allow in blacklist), not the meaning of an explicit rule.

### Two Flavours of Denial — Silent for Path-ACL, Explicit for Feature-Gate

A denial that names the resource leaks existence; a denial that names the feature does not.

- **Path-ACL denials** return generic `FORBIDDEN` with no reason. A reason like "Note 'private/diary.md' not in scope" tells an attacker the file exists.
- **Capability denials** (feature flag off, capability not enabled, key has no permission) return `FORBIDDEN` with the named reason — there's nothing to leak because the feature is off regardless of which target was tried.

### Auth at the Trust Boundary

Plugins with external inbound surface (MCP, HTTP, IPC accepting connections) need authentication on every request — bearer token, OAuth, or similar.

Plugins without inbound surface do NOT need authentication on internal operations. Unix socket permissions, OS file permissions, and the user's own session ARE the trust contract. Adding bearer tokens between two local processes the user trusts mutually is ceremony, not security.

Document the boundary explicitly (e.g. in `PRIVACY.md` or `SECURITY.md`) so reviewers can verify which surfaces actually carry authentication and which don't.

### No Crypto, Hash, or Signing Without a Named Threat Actor

When a security review proposes a hash, signature, attestation, or fingerprint, ask: *what specific threat actor does this defeat?*

If the answer is "generic untrusted input" but the actual input source is the user's own machine and own files, the proposal pays ceremony cost without buying protection. For local-first plugins, prefer subtraction (remove inputs from logs, narrow API surface, reduce capability) over addition (hash, sign, attest). For plugins with a real inbound surface, crypto is justified — but only relative to a named threat model.

### Path Containment Uses `realpathSync` on Both Ends

Path containment via `path.resolve` + string-prefix check is defeated by symlinks. macOS specifically: `/var/folders/...` realpath-resolves to `/private/var/folders/...`; an attacker symlinking the target dir to escape the configured root would bypass containment.

```typescript
import * as fs from "node:fs";
import * as path from "node:path";

function containedIn(root: string, target: string): boolean {
  const realRoot = fs.realpathSync(root);
  const realTarget = fs.realpathSync(target);
  const rel = path.relative(realRoot, realTarget);
  return !rel.startsWith("..") && !path.isAbsolute(rel);
}
```

Resolve symlinks on BOTH the configured root AND the target BEFORE the prefix check.

### Path Length Cap Applied Twice

Apply the byte-length cap (POSIX `PATH_MAX` is 4096) on BOTH the user-supplied raw path AND the post-`~`/`$HOME` expansion result. A malformed `HOME` env var of several KB can blow the cap after `~` expansion even if the input was tiny. Use UTF-8 byte length, not character count.

### Filename Sanitization

For OS-FS writes outside the vault, see `path-sanitization.md` for the deterministic 10-step pipeline.

### Symlink Refusals Use Distinct Error Codes

Refusing all symlinks is the safe default; using ONE code (`symlink-refused`) for every refusal kind makes auditing harder. Distinct codes (`symlink-refused-at-root`, `subdir-is-symlink`, `source-is-symlink`, `symlink-loop-refused`) let the audit log distinguish situations a future "opt in to follow symlinks" feature could selectively allow.

---

## Structured Logging and Audit Trails

For plugins that ship an audit log or structured event log:

### Closed-Allowlist Serializer

Don't `JSON.stringify(entry)` an object directly to disk — a runtime mutation, prototype pollution, or future code that adds a field can silently leak content into a "metadata-only" log.

Pattern: hand-author an allowlist of legal keys; the serializer walks the allowlist; closed string-union types (derived from `*_VALUES as const` arrays) constrain values; the parser rejects unknown keys *before* missing-field checks (so adversarial input gets the most-specific reason).

This is the structural enforcement of "metadata only" — code review alone is not enough.

### Log Format Conventions (Example)

A workable shape if no plugin-specific reason dictates otherwise:

- **Format:** NDJSON (one JSON object per line). `grep` and `jq` work without parsing the whole file.
- **Fields (illustrative — pick what the plugin actually needs):** `timestamp`, `principal` or `key id`, `operation`, `path` or `path hash`, `decision`, `reason`, `errorCode`.
- **Rotation:** bound BOTH count AND size. Bound only one and you lose audit history (size-only) OR fill the disk (count-only). A typical pattern is per-month files (`YYYY-MM.ndjson`) with age-based purge for past months and size-based rename for the current month.

The exact field set depends on the plugin; treat the list as a starting point, not a standard.

---

## UI Patterns

### State-Machine Modal Beats Sequence-of-Modals

Multi-phase confirmation flows (preview → running → summary) use one Modal instance, not three. The modal subscribes to a run-state store on `onOpen`; each state transition rebuilds `contentEl` in place via the appropriate subview function. Closing-and-reopening between phases loses focus for AT users and looks janky.

Add a fast path for same-state updates (progress index advance) that mutates the existing DOM rather than rebuilding — full rebuilds on hot loops are O(N²) main-thread work.

### Custom `Store<T>` for Few Reactive Surfaces

Adding Svelte/React to an Obsidian plugin for a handful of reactive surfaces is bundle bloat and stack-trace opacity. A 30-line `Store<T>` handles every common case:

```typescript
class Store<T> {
  private value: T;
  private listeners = new Set<(v: T) => void>();
  constructor(initial: T) { this.value = initial; }
  get(): T { return this.value; }
  set(next: T): void {
    if (Object.is(this.value, next)) return;
    this.value = next;
    for (const l of [...this.listeners]) l(next);  // snapshot before iterating
  }
  subscribe(listener: (v: T) => void): () => void {
    this.listeners.add(listener);
    listener(this.value);
    return () => this.listeners.delete(listener);
  }
}
```

Two correctness rules:
- Subscribers fire immediately with the current value on subscription, then on each `set` where `!Object.is(prev, next)`.
- Snapshot the listener set before iteration so a mid-iteration `subscribe()` doesn't fire on the same `set()` call.

The unsubscribe-fn return matches Obsidian's `plugin.register(...)` cleanup pattern.

### One Store, Many Subscribers — Never Duplicate State

When the same piece of state needs to render in multiple places (status bar + settings tab + main view), each renderer subscribes to one shared store. Never copy the state into renderer-local variables and try to keep them in sync; correctness diverges the moment one renderer is forgotten in an update path.

### Modals as Injectable Async Functions (Test Seam)

Wrap every Modal as a `static pick(app, args) → Promise<Result>` factory. Production callers `await Cls.pick(app, args)`; tests pass an injected `vi.fn().mockResolvedValue(...)`. This makes test code fully independent of Obsidian's modal lifecycle and avoids the `activeDocument` / `onOpen` / `onClose` mocking issues entirely.

### Tabs Over Collapsibles for Complex Settings IA

A plugin with both global settings and per-resource settings (per-key permissions, per-rule scheduling, per-instance config) outgrows a single scrolling page with collapsible sections. Three or four tabs (e.g. General / Security / Per-resource) make "which screen owns this?" answerable from the chrome alone. Each tab is its own file under `src/settings/tabs/`.

### Settings Header as a Separate Component

A manifest-driven header (name, version, author URL, docs URL, funding URL, tagline, optional icon) is enough code to deserve its own file. Extract a `HeaderSection` class with constructor `{ plugin, resolveAsset }` and a `render(containerEl)` method.

URLs MUST source from `manifest.json` — the community-plugins listing reads the same fields, and drift between settings header URLs and listing URLs is a "looks broken" issue.

### `Modal.onClose` Doesn't Tell You Why

Obsidian fires `onClose` for Esc / X chrome / your own `close()`. Modals that own in-progress work (running an executor, holding a connection, awaiting a fetch) must call the cancellation path defensively in `onClose`, even though the user-cancelled case may have already cancelled. Otherwise a user clicking X mid-execution leaves the work orphaned and the lock held until plugin reload.

```typescript
class ExecutionModal extends Modal {
  onClose() {
    this.contentEl.empty();
    this.executor.cancel();  // idempotent — safe even if already cancelled
  }
}
```

---

## Build, Bundle, Release

### CJS Bundle, Externalize What Obsidian Provides

Obsidian plugins ship as ONE file (`main.js`) with no adjacent `node_modules/`. esbuild config:

```js
export default {
  entryPoints: ["src/main.ts"],
  bundle: true,
  format: "cjs",
  target: "es2018",
  outfile: "main.js",
  external: [
    "obsidian",
    "electron",
    "@electron/remote",
    "@codemirror/autocomplete",
    "@codemirror/collab",
    "@codemirror/commands",
    "@codemirror/language",
    "@codemirror/lint",
    "@codemirror/search",
    "@codemirror/state",
    "@codemirror/view",
    "@lezer/common",
    "@lezer/highlight",
    "@lezer/lr",
    // node builtins:
    "fs", "fs/promises", "path", "os", "crypto", "stream", "util", "url", "child_process",
  ],
};
```

Everything else gets bundled, including heavy deps. `external: ["heavy-dep"]` to "save bundle size" looks fine in type-checking and breaks at runtime when `require("heavy-dep")` finds no `node_modules`.

### Stub Native-Only Transitive Deps in Dead Code Paths

When a Node library pulls native deps (e.g. `.node` binaries) for branches the plugin never reaches, esbuild fails to bundle them and `external` fails to load them at runtime.

Pattern: a custom esbuild plugin that intercepts `require("ssh2")` / `require("cpu-features")` / `require("./buildkit")` etc. and resolves them to a tiny stub module:

```js
// esbuild plugin
const stubMissingNativeDeps = {
  name: "stub-missing-native-deps",
  setup(build) {
    const stubs = ["ssh2", "cpu-features", "@grpc/grpc-js"];
    build.onResolve({ filter: new RegExp(`^(${stubs.join("|")})$`) }, () => ({
      path: "stub", namespace: "stub-ns",
    }));
    build.onLoad({ filter: /.*/, namespace: "stub-ns" }, () => ({
      contents: "module.exports = {};", loader: "js",
    }));
  },
};
```

Bundles cleanly AND runs cleanly. Critical that the plugin actually never reaches those branches — runtime takes the stub at face value.

### Vendor Third-Party CSS at Build Time

`obsidianmd/no-forbidden-elements` flags runtime `<style>` injection. If the plugin ships third-party UI (xterm, monaco, etc.) that comes with CSS, concatenate that CSS into the emitted `styles.css` at build time. Obsidian loads `styles.css` automatically; concatenation preserves CSS load order; the lint rule stays green.

### Pre-Scale Runtime Assets to HiDPI of Rendered Size

A README looks great with a 1024×1024 master image; `main.js` doesn't need to ship that many pixels for a 72-pixel CSS render. Pre-scale to roughly 2× the rendered size (144×144 for a 72-pixel render) and ship that. Keep originals in `assets/` for GitHub rendering. Document the scale in the file header so future you doesn't re-bloat it.

### Community Plugin Auto-Update Fetches Three Files Only

The Obsidian community-plugin install flow fetches exactly `main.js`, `manifest.json`, `styles.css`. Other release assets reach BRAT and manual installs but NOT users on auto-update.

Two options:
- Inline assets as base64 / SVG inside `main.js` (bundle cost, ~25–50% increase for typical plugin icons).
- Design for graceful degradation when the asset is missing — skip rendering, show fallback. A `HeaderSection` whose `resolveAsset()` returns `undefined` should simply skip the icon — missing-asset is no broken render.

### Conventional Commits + semantic-release

Once multiple humans ship to the same repo, manual changelog drift is unavoidable, tag-vs-manifest skew is embarrassing, "what changed in 0.4.2?" wastes hours per release. Conventional commit prefixes drive automated semantic versioning:

- `feat:` → minor
- `fix:` → patch
- `BREAKING CHANGE` in body → major
- `chore:` / `docs:` → skip release

semantic-release writes the tag, builds the release notes from commits, publishes the GitHub Release. Setup cost is one `.releaserc.json` and one CI workflow.

### TypeScript Strict + Three Extra Flags

Default strict is the floor. Three additional flags punch above their weight for plugin code:

- `noUncheckedIndexedAccess` — array indexing returns `T | undefined`, catches "row 17 doesn't exist" at compile time.
- `useUnknownInCatchVariables` — catch clauses receive `unknown`, forces explicit narrowing instead of `err.message` faith.
- `noImplicitReturns`.

Pair with the `no-any` lint rule. When Obsidian's published types are wrong, narrow with `as unknown as { ... }` at the boundary, never `as any`.

For deeper coverage of TypeScript strict-mode patterns, see the `tcs-typescript-strict` skill.
