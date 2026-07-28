#!/bin/bash
# tcs-git-helpers — shared bundle library for installed hooks
# lib-bundle.sh — sourced by the four installed hook files via relative path
#
# Sourced by the four installed hook files via relative path:
#   source "$(dirname "$0")/lib-bundle.sh"
#
# Rules (CON-7, CON-8, CON-9):
#   - Bash 3.2 compatible (no declare -A, no mapfile, no flock)
#   - STDOUT always silent — all diagnostics go to stderr
#   - Functions exit/return 0 unless explicitly signalling failure via
#     return code (_resolve_data_dir may return 1 on git failure)
#   - Safe to source under set -uo pipefail
#
# Public API:
#   _resolve_data_dir     — print the cache dir path; return 1 if not in a git repo
#   _emit_skip            — write one structured stderr line; return 0
#   _guard_gh             — return 0 if gh CLI is on PATH; otherwise emit a skip and return 1
#   _guard_jq             — return 0 if jq is available
#
# Spec refs:
#   - SDD §Implementation Examples / hook resolves its data dir without env vars
#   - SDD §ADR-6 — structured single-line stderr messages
#   - SDD §CON-7, CON-8, CON-9

# ---------------------------------------------------------------------------
# _resolve_data_dir
#
# Print the absolute path to the cache directory where stale-branch files live.
# Respects an explicit CLAUDE_PLUGIN_DATA override (lets tests + power users
# redirect); otherwise derives the path deterministically from $HOME and the
# git repo basename.
#
# Returns:
#   0  — path printed to stdout
#   1  — not inside a git repository (nothing printed)
# ---------------------------------------------------------------------------

_resolve_data_dir() {
  # 1. User-explicit override wins (lets tests + power users redirect).
  if [ -n "${CLAUDE_PLUGIN_DATA:-}" ]; then
    printf '%s/cache' "$CLAUDE_PLUGIN_DATA"
    return 0
  fi

  # 2. Derive deterministically from repo identity (the normal production path).
  local repo_path repo_name
  repo_path="$(git rev-parse --show-toplevel 2>/dev/null)" || return 1
  repo_name="$(basename "$repo_path")"
  printf '%s/.claude/plugins/data/tcs-git-helpers-%s/cache' "$HOME" "$repo_name"
}

# ---------------------------------------------------------------------------
# _emit_skip <action> <reason> <suggestion>
#
# Write one structured stderr line and return 0.
# Format (SDD ADR-6):
#   tcs-git-helpers: <action> skipped — <reason>. <suggestion>.
#
# STDOUT: nothing
# STDERR: exactly one line
# ---------------------------------------------------------------------------

_emit_skip() {
  local action="$1"
  local reason="$2"
  local suggestion="$3"
  printf 'tcs-git-helpers: %s skipped — %s. %s.\n' \
    "$action" "$reason" "$suggestion" >&2
}

# ---------------------------------------------------------------------------
# _guard_gh
#
# Return 0 if gh is installed; emit a skip message and return 1 if not.
# Callers pass the action name used in the skip message.
#
# Usage: _guard_gh <action> || return 0
# ---------------------------------------------------------------------------

_guard_gh() {
  local action="${1:-hook}"
  if ! command -v gh >/dev/null 2>&1; then
    _emit_skip "$action" \
      "gh CLI not installed" \
      "Install gh to enable stale-branch detection"
    return 1
  fi
}

# ---------------------------------------------------------------------------
# _guard_jq
#
# Return 0 if jq is installed; emit a skip message and return 1 if not.
#
# Usage: _guard_jq <action> || return 0
# ---------------------------------------------------------------------------

_guard_jq() {
  local action="${1:-hook}"
  if ! command -v jq >/dev/null 2>&1; then
    _emit_skip "$action" \
      "jq not installed" \
      "Install jq to enable stale-branch detection"
    return 1
  fi
}

# ---------------------------------------------------------------------------
# _write_stale_cache <updated_iso> <repo_path> <default_branch>
#
# Reads TSV rows from stdin (name<TAB>pr_number<TAB>merged_at) and writes
# both cache files atomically (.tmp → mv):
#   <data_dir>/<repo_hash>-stale-cache.tsv
#   <data_dir>/<repo_hash>-stale-cache.json
#
# Resolves the data dir via _resolve_data_dir (which itself respects
# CLAUDE_PLUGIN_DATA when set, otherwise derives from $HOME + repo name).
#
# Returns:
#   0  — files written successfully (or silently skipped on error)
#   0  — always; cache failure must never block a merge
# ---------------------------------------------------------------------------

_write_stale_cache() {
  local updated_iso="$1"
  local repo_path="$2"
  local default_branch="$3"
  # stdin: TSV rows

  # Resolve (or derive) the cache directory.
  local data_dir
  data_dir="$(_resolve_data_dir)" || {
    _emit_skip "cache-write" \
      "not in a git repository" \
      "Ensure the hook is installed inside a git repo"
    return 0
  }

  # Create the cache dir atomically; fail gracefully if not writable.
  mkdir -p "$data_dir" 2>/dev/null || {
    _emit_skip "cache-write" \
      "cache directory could not be created" \
      "Check write permissions on $data_dir"
    return 0
  }

  # Compute the 12-char repo hash (sha1 prefix of the repo top-level path).
  local repo_hash
  repo_hash="$(printf '%s' "$repo_path" | shasum 2>/dev/null | head -c 12)"

  # Slurp stdin into a variable so we can write both files from the same data.
  local tsv_rows
  tsv_rows="$(cat)"

  local tsv_file="${data_dir}/${repo_hash}-stale-cache.tsv"
  local json_file="${data_dir}/${repo_hash}-stale-cache.json"

  # Write TSV atomically.
  printf '%s\n' "$tsv_rows" > "${tsv_file}.tmp" 2>/dev/null || {
    _emit_skip "cache-write" \
      "TSV write failed" \
      "Check write permissions on $data_dir"
    return 0
  }
  mv "${tsv_file}.tmp" "$tsv_file" 2>/dev/null || true

  # Build JSON array from TSV rows and write atomically.
  _emit_stale_json "$tsv_rows" "$updated_iso" "$default_branch" \
    > "${json_file}.tmp" 2>/dev/null || {
    rm -f "${json_file}.tmp" 2>/dev/null || true
    return 0
  }
  mv "${json_file}.tmp" "$json_file" 2>/dev/null || true

  return 0
}

# ---------------------------------------------------------------------------
# _emit_stale_json <tsv_rows> <updated_iso> <default_branch>
#
# Writes a JSON object to stdout in the cache schema format.
# TSV rows: name<TAB>pr_number<TAB>merged_at (one per line).
# Requires jq on PATH (caller must guard with _guard_jq first).
# ---------------------------------------------------------------------------

_emit_stale_json() {
  local tsv_rows="$1"
  local updated_iso="$2"
  local default_branch="$3"

  # Build the entries array via jq from the TSV data.
  # Each row: name<TAB>pr_num<TAB>merged_at
  local entries_json
  entries_json="$(printf '%s\n' "$tsv_rows" \
    | awk -F'\t' 'NF>=3 && $1!="" {
        printf "{\"name\":\"%s\",\"pr_number\":%s,\"merged_at\":\"%s\"}\n",
               $1, $2, $3
      }' \
    | jq -s '.' 2>/dev/null)" || entries_json="[]"

  [ -n "$entries_json" ] || entries_json="[]"

  jq -n \
    --arg updated "$updated_iso" \
    --arg default_branch "$default_branch" \
    --argjson entries "$entries_json" \
    '{
      version: 1,
      updated_iso: $updated,
      default_branch: $default_branch,
      stale_branches: $entries
    }' 2>/dev/null
}
