#!/usr/bin/env bash
# scripts/smoke-test-tz.sh — Sprint 1 (S41) preview smoke test
#
# Hits the two most-used write endpoints with two timezones and reports
# whether the resulting rows in Supabase landed on the correct local-day key.
#
# USAGE
# ─────
#   # 1) deploy Sprint 1 branch to Vercel preview, grab the URL
#   # 2) sign in as the test account in the preview, grab the Supabase
#   #    access_token from devtools → Application → Cookies → sb-*-auth-token
#   # 3) export:
#   #      export PREVIEW_URL="https://cinis-git-sprint1-xxx.vercel.app"
#   #      export ACCESS_TOKEN="eyJhbGciOi..."
#   # 4) run:
#   #      bash scripts/smoke-test-tz.sh
#
# WHAT IT TESTS
# ─────────────
#   • POST /api/habits/complete with timezone=America/Chicago
#   • POST /api/habits/complete with timezone=America/Los_Angeles
#   • POST /api/focus/complete with timezone=America/Chicago
#   • POST /api/focus/complete with timezone=America/Los_Angeles
#   • GET  /api/progress?view=month with each tz (currentMonth string)
#
# Verification is MANUAL on the Supabase side after running. Script prints
# the HTTP responses; you then query:
#
#   SELECT id, completed_on, completed_at
#     FROM habit_completions
#    WHERE user_id = '<test-account-uuid>'
#    ORDER BY completed_at DESC LIMIT 4;
#
# and confirm that the two CT calls landed on the CT calendar day while the
# two LA calls landed on the LA calendar day. If they match — preview is
# safe to promote.
#
# ⚠ Do NOT run this against production. The script writes real rows.

set -euo pipefail

if [ -z "${PREVIEW_URL:-}" ]; then
  echo "❌ PREVIEW_URL not set"; exit 1
fi
if [ -z "${ACCESS_TOKEN:-}" ]; then
  echo "❌ ACCESS_TOKEN not set"; exit 1
fi
if [ -z "${TEST_HABIT_ID:-}" ]; then
  echo "⚠  TEST_HABIT_ID not set — /api/habits/complete POST will be skipped."
  echo "   Set it to a habit row id you own in the preview db."
fi

AUTH="Authorization: Bearer ${ACCESS_TOKEN}"
CT="America/Chicago"
LA="America/Los_Angeles"

banner() { echo ""; echo "── $* ──────────────────"; }

hit() {
  local method="$1"; local path="$2"; local body="${3:-}"
  if [ -n "$body" ]; then
    curl -sS -X "$method" \
      -H "$AUTH" \
      -H "Content-Type: application/json" \
      -d "$body" \
      "${PREVIEW_URL}${path}"
  else
    curl -sS -X "$method" -H "$AUTH" "${PREVIEW_URL}${path}"
  fi
  echo ""
}

# ── habits ───────────────────────────────────────────────────────────────────
if [ -n "${TEST_HABIT_ID:-}" ]; then
  banner "POST /api/habits/complete  tz=${CT}"
  hit POST "/api/habits/complete" "{\"habit_id\":\"${TEST_HABIT_ID}\",\"timezone\":\"${CT}\"}"

  banner "POST /api/habits/complete  tz=${LA}"
  hit POST "/api/habits/complete" "{\"habit_id\":\"${TEST_HABIT_ID}\",\"timezone\":\"${LA}\"}"
fi

# ── focus ────────────────────────────────────────────────────────────────────
banner "POST /api/focus/complete  tz=${CT}"
hit POST "/api/focus/complete" "{\"duration_minutes\":25,\"timezone\":\"${CT}\"}"

banner "POST /api/focus/complete  tz=${LA}"
hit POST "/api/focus/complete" "{\"duration_minutes\":25,\"timezone\":\"${LA}\"}"

# ── progress month view (read path) ──────────────────────────────────────────
banner "GET /api/progress?view=month&timezone=${CT}"
hit GET "/api/progress?view=month&timezone=${CT}"

banner "GET /api/progress?view=month&timezone=${LA}"
hit GET "/api/progress?view=month&timezone=${LA}"

echo ""
echo "── NEXT: verify row landing in Supabase ──"
echo ""
echo "  SELECT id, completed_on, completed_at"
echo "    FROM habit_completions"
echo "   WHERE user_id = '<test-account-uuid>'"
echo "   ORDER BY completed_at DESC LIMIT 4;"
echo ""
echo "  SELECT id, snapshot_date, created_at, focus_minutes"
echo "    FROM progress_snapshots"
echo "   WHERE user_id = '<test-account-uuid>'"
echo "   ORDER BY created_at DESC LIMIT 4;"
echo ""
echo "Pass criteria: CT calls land on CT-local day; LA calls land on LA-local day."
