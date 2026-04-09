#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * scripts/backfill-timezone-fix.js
 *
 * Sprint 1 (S41) timezone backfill — reconciled against prod reality
 * ────────────────────────────────────────────────────────────────────
 *
 * This script originally planned to REWRITE the `snapshot_date` column on
 * pre-sprint `progress_snapshots` rows under an America/Chicago
 * interpretation. A dry-run against prod (2026-04-09) revealed that strategy
 * was pointless:
 *
 *    • 37 pre-sprint rows, all 37 have tasks_completed=0, tasks_added=0,
 *      tasks_rolled=0, focus_minutes=0, journal_entries=0
 *    • 31 of the 33 drift candidates would collide with an existing row for
 *      the same user and be skipped
 *    • weight_log: 0 rows, nothing to fix
 *    • supplements: 0 rows with last_taken_date set, nothing to fix
 *    • habit_completions: 1 pre-sprint row with drift, but the drift is ~7
 *      days (2026-03-24 vs 2026-03-31) — this is a manual backfill, not a
 *      timezone artifact, leave it alone
 *
 * The pre-sprint CRON bug wasn't "wrong dates with real data" — it was
 * "right dates with empty data" because the handler was querying the
 * future. So the correct repair is DELETE, not UPDATE. The fixed CRON at
 * 04:00 UTC will rebuild correct rows starting the night after deploy.
 *
 * SAFETY
 * ──────
 *   • Dry run by default. Prints plan, touches nothing.
 *   • --apply flag required to delete.
 *   • Cutoff constant guards against deleting rows written by the fixed
 *     code path.
 *   • Logs per-user counts before + after.
 *
 * HOW TO RUN
 * ──────────
 *   node scripts/backfill-timezone-fix.js            # dry run
 *   node scripts/backfill-timezone-fix.js --apply    # delete
 *
 * REQUIRED ENV
 * ────────────
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * ALTERNATIVE: Running via Supabase MCP
 * ─────────────────────────────────────
 * If your operator has direct Supabase SQL access (Cowork, Studio console,
 * psql with service role), the equivalent one-liner is:
 *
 *   DELETE FROM progress_snapshots
 *   WHERE created_at < '2026-04-09 00:00:00+00'
 *     AND tasks_completed = 0
 *     AND tasks_added = 0
 *     AND tasks_rolled = 0
 *     AND focus_minutes = 0
 *     AND journal_entries = 0;
 *
 * The guard on all-zero is intentional redundancy — even if a new non-zero
 * row somehow slipped in before the cutoff (it shouldn't), it would be
 * preserved.
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY
const SPRINT_CUTOFF = '2026-04-09T00:00:00.000Z'

if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const APPLY = process.argv.includes('--apply')

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function planAndMaybeDelete() {
  // 1. Fetch the doomed rows
  const { data: rows, error: fetchErr } = await supabase
    .from('progress_snapshots')
    .select('id, user_id, snapshot_date, tasks_completed, tasks_added, tasks_rolled, focus_minutes, journal_entries, created_at')
    .lt('created_at', SPRINT_CUTOFF)

  if (fetchErr) throw new Error(`fetch failed: ${fetchErr.message}`)

  const total = rows.length
  const allZero = rows.filter(
    r =>
      r.tasks_completed === 0 &&
      r.tasks_added === 0 &&
      r.tasks_rolled === 0 &&
      r.focus_minutes === 0 &&
      r.journal_entries === 0
  )
  const hasData = total - allZero.length

  console.log('\n── progress_snapshots pre-sprint sweep ───────────────')
  console.log(`  total rows older than ${SPRINT_CUTOFF}: ${total}`)
  console.log(`  all-zero (safe to delete):              ${allZero.length}`)
  console.log(`  has activity (preserve):                ${hasData}`)

  // Per-user breakdown
  const byUser = new Map()
  for (const r of allZero) {
    byUser.set(r.user_id, (byUser.get(r.user_id) || 0) + 1)
  }
  console.log('\n  per-user (all-zero only):')
  for (const [uid, n] of byUser) {
    console.log(`    ${uid}  ${n} row${n !== 1 ? 's' : ''}`)
  }

  if (hasData > 0) {
    console.log('\n  ⚠ Some pre-sprint rows have non-zero metrics. Those will')
    console.log('    be PRESERVED. Review manually before changing strategy.')
  }

  if (!APPLY) {
    console.log('\n  ⚠ DRY RUN — rerun with --apply to delete the all-zero rows.')
    return
  }

  if (allZero.length === 0) {
    console.log('\n  nothing to delete.')
    return
  }

  const ids = allZero.map(r => r.id)
  const { error: delErr, count } = await supabase
    .from('progress_snapshots')
    .delete({ count: 'exact' })
    .in('id', ids)

  if (delErr) throw new Error(`delete failed: ${delErr.message}`)
  console.log(`\n  ✓ deleted ${count} rows`)
}

async function reportOthers() {
  console.log('\n── other tables (no action needed per reality check) ──')

  const { count: wlCount } = await supabase
    .from('weight_log')
    .select('id', { count: 'exact', head: true })
    .lt('created_at', SPRINT_CUTOFF)
  console.log(`  weight_log pre-sprint rows:              ${wlCount || 0}`)

  const { count: spCount } = await supabase
    .from('supplements')
    .select('id', { count: 'exact', head: true })
    .lt('created_at', SPRINT_CUTOFF)
    .not('last_taken_date', 'is', null)
  console.log(`  supplements pre-sprint w/ last_taken:    ${spCount || 0}`)

  const { count: hcCount } = await supabase
    .from('habit_completions')
    .select('id', { count: 'exact', head: true })
    .lt('completed_at', SPRINT_CUTOFF)
  console.log(`  habit_completions pre-sprint rows:       ${hcCount || 0}`)
  console.log('    (completed_at is timestamptz; client-side day derivation')
  console.log('     is the surface of concern, not a column rewrite.)')
}

async function main() {
  console.log('┌─────────────────────────────────────────────────────────────┐')
  console.log('│  Cinis timezone backfill — Sprint 1 (S41)                   │')
  console.log(`│  mode: ${APPLY ? 'APPLY (destructive)'.padEnd(50) : 'DRY RUN (no writes)'.padEnd(50)}│`)
  console.log(`│  cutoff: ${SPRINT_CUTOFF.padEnd(49)}│`)
  console.log('└─────────────────────────────────────────────────────────────┘')

  await planAndMaybeDelete()
  await reportOthers()
}

main().catch(err => {
  console.error('FATAL:', err)
  process.exit(1)
})
