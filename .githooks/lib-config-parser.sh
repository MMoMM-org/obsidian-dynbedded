# shellcheck shell=bash
# templates/githooks/lib-config-parser.sh — strict-allowlist KV parser for .githooks/.config
#
# Spec refs:
#   - SDD §Implementation Examples — Bash parser sketch (ADR-3)
#   - SDD §Application Data Models — Allowlisted key schema
#   - research/security.md §4 — MUST-reject corpus + parser rules
#   - CON-1 (bash 3.2 compat: no `declare -A`, `mapfile`, `${var,,}`)
#   - CON-9 (regex: `[[:space:]]+`, never `\s+`)
#
# Security model: NO `eval`, NO `source` of user input. All assignments go
# through `printf -v` after the key passes a hardcoded `case`-glob allowlist
# AND the value passes a per-key regex. Unknown keys, malformed lines,
# type mismatches, and forbidden metacharacters are rejected on stderr and
# skipped (graceful: never makes the parser exit non-zero on a bad line).
#
# Public API:
#   parse_tcs_config <config_file>   # returns 0 even when file is missing
#                                    # exports TCS_* on success per line
#
# Bash 3.2: `printf -v` is bash 3.1+. `case`-glob substring check replaces
# associative arrays (`declare -A`).

# Strict allowlist of accepted keys. MUST stay in sync with SDD schema.
# shellcheck disable=SC2034   # consumed via $TCS_ALLOWED_KEYS expansion below
TCS_ALLOWED_KEYS="TCS_PROTECTED_BRANCHES TCS_HOOK_EXCLUDE_PATHS_FILE TCS_ALLOWED_COMMIT_TYPES TCS_REQUIRE_SCOPE TCS_MAX_SUBJECT_LENGTH TCS_ENABLE_CONVENTIONAL_CHECK TCS_ENABLE_PR_PUSH_CHECK TCS_ALLOW_AMEND_ON_PROTECTED"

# Per-key value validator. Returns 0 if value is acceptable for key, 1 otherwise.
# Echoes a short reason (for stderr context) on failure.
_tcs_validate_value() {
  local key="$1" val="$2"
  case "$key" in
    TCS_PROTECTED_BRANCHES)
      # |-separated branch names; chars: A-Z a-z 0-9 . _ / -
      [[ "$val" =~ ^[A-Za-z0-9._/-]+(\|[A-Za-z0-9._/-]+)*$ ]] && return 0
      return 1
      ;;
    TCS_HOOK_EXCLUDE_PATHS_FILE)
      # Repo-relative path: A-Z a-z 0-9 . _ / -
      [[ "$val" =~ ^[A-Za-z0-9._/-]+$ ]] || return 1
      # Defense-in-depth: forbid `..` segments (path traversal).
      case "$val" in
        *..*) return 1 ;;
      esac
      return 0
      ;;
    TCS_ALLOWED_COMMIT_TYPES)
      # Space-separated lowercase tokens.
      [[ "$val" =~ ^[a-z]+([[:space:]]+[a-z]+)*$ ]] && return 0
      return 1
      ;;
    TCS_REQUIRE_SCOPE|TCS_ENABLE_CONVENTIONAL_CHECK|TCS_ENABLE_PR_PUSH_CHECK|TCS_ALLOW_AMEND_ON_PROTECTED)
      # Strict boolean: 0 or 1 (NOT true/false).
      [[ "$val" =~ ^[01]$ ]] && return 0
      return 1
      ;;
    TCS_MAX_SUBJECT_LENGTH)
      # 1-4 digit integer.
      [[ "$val" =~ ^[0-9]{1,4}$ ]] && return 0
      return 1
      ;;
    *)
      # Unknown key — caller should have already filtered, defense-in-depth deny.
      return 1
      ;;
  esac
}

# parse_tcs_config <config_file>
#
# Reads the config file line-by-line and exports validated TCS_* variables
# into the caller's shell. Missing/unreadable file is a no-op (returns 0,
# defaults apply elsewhere). Bad lines emit a stderr warning and are skipped.
parse_tcs_config() {
  local config_file="${1:-.githooks/.config}"

  # No file or unreadable → defaults apply, return success.
  if [ ! -r "$config_file" ]; then
    return 0
  fi

  local lineno=0
  local raw line key val
  # `IFS=` + `read -r` preserves leading/trailing whitespace + backslashes.
  # `|| [ -n "$raw" ]` ensures the last line is processed even if it has no
  # trailing newline.
  while IFS= read -r raw || [ -n "$raw" ]; do
    lineno=$((lineno + 1))
    line="$raw"

    # 1. Strip trailing CR (CRLF tolerance).
    line="${line%$'\r'}"

    # 2. Strip leading whitespace (spaces/tabs).
    while [ -n "$line" ] && [ "${line#[[:space:]]}" != "$line" ]; do
      line="${line#[[:space:]]}"
    done

    # 3. If the line starts with `#` (after lstrip), it's a comment — skip.
    case "$line" in
      \#*) continue ;;
    esac

    # 4. Skip empty lines.
    [ -z "$line" ] && continue

    # 5. Strip everything after the first `#` (inline comment).
    case "$line" in
      *\#*) line="${line%%\#*}" ;;
    esac

    # 6. Strip trailing whitespace.
    while [ -n "$line" ] && [ "${line%[[:space:]]}" != "$line" ]; do
      line="${line%[[:space:]]}"
    done
    [ -z "$line" ] && continue

    # 7. Hard line-length cap (key + '=' + value ≤ 320 chars; value ≤ 256).
    if [ "${#line}" -gt 320 ]; then
      printf 'tcs-git-helpers: ignoring line %d (over 320 chars)\n' "$lineno" >&2
      continue
    fi

    # 8. Strict KV grammar.
    #    NOTE: bash 3.2's regex engine has a known quirk where bounded
    #    quantifiers ({m,n}) anchored with `$` fail to match valid input.
    #    We therefore use unbounded quantifiers and rely on the explicit
    #    line-length cap above (≤320) plus per-key value validators.
    if [[ ! "$line" =~ ^[A-Z][A-Z0-9_]*=.*$ ]]; then
      printf 'tcs-git-helpers: ignoring malformed line %d in %s\n' \
        "$lineno" "$config_file" >&2
      continue
    fi
    # Hardcoded key-prefix length cap (≤64 chars).
    local _kpfx="${line%%=*}"
    if [ "${#_kpfx}" -gt 64 ]; then
      printf 'tcs-git-helpers: ignoring line %d (key over 64 chars)\n' "$lineno" >&2
      continue
    fi
    # Hardcoded value length cap (≤256 chars).
    local _vraw="${line#*=}"
    if [ "${#_vraw}" -gt 256 ]; then
      printf 'tcs-git-helpers: ignoring line %d (value over 256 chars)\n' "$lineno" >&2
      continue
    fi

    # 9. Split on first `=`.
    key="${line%%=*}"
    val="${line#*=}"

    # 10. Strip a single matched outer pair of quotes (if present).
    if [ "${#val}" -ge 2 ]; then
      case "$val" in
        \"*\") val="${val#\"}"; val="${val%\"}" ;;
        \'*\') val="${val#\'}"; val="${val%\'}" ;;
      esac
    fi

    # 11. Defense-in-depth: reject any value with shell-dangerous chars.
    #     The per-key validator below would catch most of these, but layering
    #     prevents a future schema-relaxation from silently widening the
    #     attack surface.
    #     Note: bash variables cannot hold NUL bytes (read -r drops them),
    #     so a *$'\0'* pattern is unreliable — it expands to empty and
    #     matches everything. We rely on read -r and the per-key allowlist
    #     for NUL safety instead.
    local _nl=$'\n'
    case "$val" in
      *\`*|*\$*|*\;*|*\&*|*\>*|*\<*|*\\*|*"$_nl"*|*\"*|*\'*)
        printf 'tcs-git-helpers: rejected %s — value contains forbidden character (line %d)\n' \
          "$key" "$lineno" >&2
        continue
        ;;
    esac

    # 12. Allowlist check (case-glob; bash 3.2 compatible).
    case " $TCS_ALLOWED_KEYS " in
      *" $key "*) ;;
      *)
        printf 'tcs-git-helpers: unknown key %s (ignored, line %d)\n' \
          "$key" "$lineno" >&2
        continue
        ;;
    esac

    # 13. Per-key value validation (type/format).
    if ! _tcs_validate_value "$key" "$val"; then
      printf 'tcs-git-helpers: invalid value for %s: %q (ignored, line %d)\n' \
        "$key" "$val" "$lineno" >&2
      continue
    fi

    # 14. Assign by name. `printf -v` does NOT shell-eval the value — it
    #     literally writes the bytes into the named variable.
    printf -v "$key" '%s' "$val"
    # shellcheck disable=SC2163   # `export -n $key` not portable to 3.2
    export "$key"
  done <"$config_file"

  return 0
}
