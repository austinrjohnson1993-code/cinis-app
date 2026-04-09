#!/usr/bin/env bash
# Cinis-app · scripts/preflight.sh
#
# Deterministic, repo-local detector that fails on the forbidden patterns
# tracked in the Stabilization Audit (April 9 2026). Wired to run:
#   - manually:        bash scripts/preflight.sh
#   - as an npm script: npm run preflight
#   - in CI / pre-commit hook
#
# Exits non-zero on the first failed check. Every failure prints the rule,
# why it matters, and the exact hits.
#
# Usage:
#   bash scripts/preflight.sh          # full run
#   bash scripts/preflight.sh --quiet  # only print failures
#
# Must be run from the Cinis-app repo root.
#
# Scope note: this detector scans the Cinis-app repo only. The mobile repo
# (cinis-mobile) has its own hex/pattern hook. Do not try to cross-scan from
# here — relative paths between the two repos differ between Cowork and Mac.

set -u
set -o pipefail

QUIET=0
if [ "${1:-}" = "--quiet" ]; then QUIET=1; fi

say() { if [ "$QUIET" = "0" ]; then echo "$@"; fi }
fail_header() { echo ""; echo "❌ $1"; }
ok_header() { say "✅ $1"; }

if [ ! -f "package.json" ] || [ ! -d "pages/api" ]; then
  echo "preflight: must be run from the Cinis-app repo root" >&2
  exit 2
fi

FAILED=0

# Common grep exclusions.
EXCLUDE_DIRS=(
  --exclude-dir=node_modules
  --exclude-dir=.next
  --exclude-dir=out
  --exclude-dir=dist
  --exclude-dir=.git
)

# ─────────────────────────────────────────────────────────────────────────────
# Rule 1 — Forbidden date pattern: toISOString().split('T')[0]
#
# Why: silently returns the UTC calendar date. Any user west of UTC has their
#      evening work misattributed to the next day. See S41 stabilization audit.
# Fix: use getLocalDateString(date, timezone) from lib/dateUtils.
# Exemptions: lib/dateUtils.js (documents the pattern in comments),
#             scripts/preflight.sh (detector references the pattern).
# ─────────────────────────────────────────────────────────────────────────────
HITS="$(grep -rn --include='*.js' --include='*.jsx' --include='*.ts' --include='*.tsx' \
  "${EXCLUDE_DIRS[@]}" -- \
  "toISOString()\.split('T')\[0\]" . 2>/dev/null \
  | grep -v "^./scripts/preflight.sh:" \
  | grep -v "^./lib/dateUtils.js:" || true)"
if [ -n "$HITS" ]; then
  fail_header "Forbidden date pattern: toISOString().split('T')[0]"
  echo "  Use getLocalDateString(date, timezone) from lib/dateUtils instead."
  echo "  Hits:"
  echo "$HITS" | sed 's/^/    /'
  FAILED=1
else
  ok_header "No toISOString().split('T')[0] hits"
fi

# ─────────────────────────────────────────────────────────────────────────────
# Rule 2 — No CommonJS require() inside pages/api
#
# Why: Next.js 14 Pages Router is ESM end-to-end on Vercel. A stray require()
#      can throw `ReferenceError: require is not defined` under serverless
#      bundling. BUG-07 (invite.js) was this class of regression.
# Fix: convert to `import { x } from 'y'` at the top of the file.
# Scope: pages/api only. components/tabs/shared.js uses an intentional lazy
#        require() for browser-only code and is explicitly exempt.
# ─────────────────────────────────────────────────────────────────────────────
REQ_HITS="$(grep -rn --include='*.js' --include='*.jsx' \
  "${EXCLUDE_DIRS[@]}" -- \
  "require(" pages/api 2>/dev/null || true)"
if [ -n "$REQ_HITS" ]; then
  fail_header "Stray CommonJS require() in pages/api (ESM only here)"
  echo "  Convert to: import { x } from 'y'"
  echo "$REQ_HITS" | sed 's/^/    /'
  FAILED=1
else
  ok_header "No stray require() in pages/api"
fi

# ─────────────────────────────────────────────────────────────────────────────
# Rule 3 — profiles PK is `id`, never `user_id`
#
# Why: known class of silent bug. `.eq('user_id', ...)` on profiles returns
#      0 rows every time. Caught and fixed multiple times in AUDIT_S32.
# Fix: use `.eq('id', userId)`.
# Match strategy: single-line grep for `from('profiles')` chained to
#                 `.eq('user_id'` on the same line (matches every real hit
#                 pattern in this repo).
# ─────────────────────────────────────────────────────────────────────────────
PROFILE_HITS="$(grep -rn --include='*.js' --include='*.jsx' \
  "${EXCLUDE_DIRS[@]}" -E -- \
  "from\(['\"]profiles['\"]\)[^)]*\.eq\(['\"]user_id['\"]" . 2>/dev/null || true)"
if [ -n "$PROFILE_HITS" ]; then
  fail_header "profiles query using .eq('user_id', ...) — profiles PK is 'id'"
  echo "$PROFILE_HITS" | sed 's/^/    /'
  FAILED=1
else
  ok_header "profiles queries scoped to .eq('id', ...)"
fi

# ─────────────────────────────────────────────────────────────────────────────
# Rule 4 — Forbidden legacy table/column names
#
# Why: production bugs have shipped using old names. None of these match the
#      current schema and will fail silently (wrong table) or produce
#      subtly wrong data (wrong column).
#   checkin_history                  → checkin_logs
#   meal_log                         → nutrition_log
#   progress_snapshots.updated_at    → column does not exist
#   habits .eq('type', …)            → column is habit_type
# ─────────────────────────────────────────────────────────────────────────────
LEGACY_HITS=""
for pat in \
  "from\(['\"]checkin_history['\"]\)" \
  "from\(['\"]meal_log['\"]\)" \
  "habits['\"]\)[[:space:]]*.*\.eq\(['\"]type['\"]"
do
  H="$(grep -rn --include='*.js' --include='*.jsx' \
    "${EXCLUDE_DIRS[@]}" -E -- "$pat" . 2>/dev/null || true)"
  [ -n "$H" ] && LEGACY_HITS+="$H"$'\n'
done
# updated_at on progress_snapshots — grep within a window
UP_HITS="$(grep -rn --include='*.js' --include='*.jsx' \
  "${EXCLUDE_DIRS[@]}" -E -- \
  "progress_snapshots.*updated_at" . 2>/dev/null || true)"
[ -n "$UP_HITS" ] && LEGACY_HITS+="$UP_HITS"$'\n'

if [ -n "$LEGACY_HITS" ]; then
  fail_header "Legacy / forbidden DB identifiers"
  echo "  See Stabilization Audit — DB critical rules."
  echo "$LEGACY_HITS" | sed '/^$/d' | sed 's/^/    /'
  FAILED=1
else
  ok_header "No legacy DB identifiers"
fi

echo ""
if [ "$FAILED" = "0" ]; then
  echo "PREFLIGHT: GREEN — all rules passed."
  exit 0
else
  echo "PREFLIGHT: RED — fix the violations above and re-run."
  exit 1
fi
