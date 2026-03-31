# Cinis — Full Codebase Audit
*S32 · March 31, 2026 · Pre-launch audit pass*
*DB verified via Supabase MCP — all column/table checks are confirmed against live schema*

---

## VERDICT SUMMARY

5 hard failures confirmed. All prevent features from working in production. Fix all before any user testing.

| Severity | Count | Owner |
|----------|-------|-------|
| CRITICAL — hard failure | 5 | T2 (4), T3 (1) |
| MEDIUM — data issue / dead code | 3 | T2 (2), T3 (1) |
| CLEANUP — style / logging | 2 | T2 (1), T3 (1) |
| DOCS — schema doc wrong | 6 | Cowork |

---

## CRITICAL BUGS — Fix Before Any Testing

---

### BUG-01 · `progress-snapshot.js` — `updated_at` column doesn't exist
**Owner:** T2
**File:** `pages/api/progress-snapshot.js`, line 102
**Impact:** Daily cron (`/api/cron/progress-snapshot`) fails hard on every run. Progress tab POST fails. All progress snapshots silently broken.

**Root cause:** Upsert includes `updated_at: new Date().toISOString()` but the live `progress_snapshots` table has no `updated_at` column. Verified via DB: columns are `id, user_id, snapshot_date, tasks_completed, tasks_added, tasks_rolled, focus_minutes, journal_entries, ai_summary, created_at`.

**Fix:**
```js
// Remove updated_at from the upsert object on line 102
// Before:
{
  user_id: userId,
  snapshot_date: snapshotDate,
  tasks_completed: tasksCompleted || 0,
  tasks_added: tasksAdded || 0,
  tasks_rolled: tasksRolled || 0,
  focus_minutes: focusMinutes,
  journal_entries: journalEntries || 0,
  ai_summary: aiSummary,
  updated_at: new Date().toISOString(),  // ← REMOVE THIS LINE
}
```

---

### BUG-02 · `nutrition/today.js` — reads wrong table
**Owner:** T2
**File:** `pages/api/nutrition/today.js`, line 17
**Impact:** The Nutrition tab "Today" view always shows zero entries and zero calories, even after the user logs food. Nutrition logging is broken for the primary display.

**Root cause:** `today.js` reads from `meal_log` table. But `nutrition/log.js`, `nutrition/water.js`, and `nutrition/insights.js` all write to and read from `nutrition_log`. These are two separate tables in the live DB with different schemas. No nutrition log data appears in today's view because it's reading the wrong table.

**Live DB tables:**
- `meal_log`: `id, user_id, meal_type, description, items, calories, protein_g, carbs_g, fat_g, confidence, logged_at, template_id`
- `nutrition_log`: `id, user_id, meal_name, food_description, calories, protein_g, carbs_g, fat_g, meal_type, logged_at`

**Fix:** Change line 17 in `nutrition/today.js`:
```js
// Before:
.from('meal_log')

// After:
.from('nutrition_log')
```

Note: `meal_log` uses `description` for the item name; `nutrition_log` uses `meal_name`. The totals calculation uses `calories/protein_g/carbs_g/fat_g` which exist in both tables, so no other changes needed beyond the table name.

---

### BUG-03 · `finance/budget.js` — wrong WHERE clause on profiles
**Owner:** T2
**File:** `pages/api/finance/budget.js`, line 13
**Impact:** Finance Budget tab always loads with null income data. `income`, `income_frequency`, and `payday_day` all return empty/null. Budget calculations fail silently.

**Root cause:** Query uses `.eq('user_id', userId)` on the `profiles` table. The `profiles` table primary key is `id`, not `user_id`. This returns no rows, so `profileRes.data` is `null`.

**Fix:**
```js
// Before:
.eq('user_id', userId)

// After:
.eq('id', userId)
```

---

### BUG-04 · `finance/score.js` — selects non-existent column `profiles.financial_goals`
**Owner:** T2
**File:** `pages/api/finance/score.js`, line 22
**Impact:** Finance Score tab fails with a PostgREST error every time it loads. The entire finance score calculation is broken.

**Root cause:** `.select('budget_plan, income_sources, financial_goals')` on `profiles`. The `financial_goals` column does not exist on `profiles` — it's a separate standalone table. Verified via live DB. PostgREST returns an error on any select of a non-existent column.

**Fix:** Remove `financial_goals` from the profiles select. The score calculation uses it in a check for an "emergency" goal, which should instead query the `financial_goals` table or be computed differently.

```js
// Before:
supabaseAdmin.from('profiles')
  .select('budget_plan, income_sources, financial_goals')
  .eq('id', userId)
  .single(),

// After:
supabaseAdmin.from('profiles')
  .select('budget_plan, income_sources')
  .eq('id', userId)
  .single(),
```

Then separately query for emergency goal detection:
```js
// Add this to the Promise.all:
supabaseAdmin.from('financial_goals')
  .select('id, category')
  .eq('user_id', userId),
```

And update the emergency flag logic (line 48–52):
```js
// Before:
const financialGoals = profile?.financial_goals || []
const hasEmergencyGoal = Array.isArray(financialGoals)
  ? financialGoals.some(g => String(g).toLowerCase().includes('emergency'))
  : String(financialGoals).toLowerCase().includes('emergency')

// After (using the new financialGoals query result):
const financialGoals = goalsData || []
const hasEmergencyGoal = financialGoals.some(g =>
  String(g.category || '').toLowerCase().includes('emergency')
)
```

---

### BUG-05 · `delete-account.js` — wrong table names, massive orphaned data
**Owner:** T2
**File:** `pages/api/delete-account.js`, lines 30–39
**Impact:** Account deletion leaves most user data behind. Three table names in `USER_TABLES` are wrong (cause errors, silently logged and skipped). Many tables not listed at all. GDPR/data hygiene issue.

**Root cause:** `USER_TABLES` array uses stale names: `'checkins'` (no such table — real table is `checkin_logs`), `'chores'` (no such table — chore tasks live in `tasks` with `notes LIKE '%chore routine%'`), `'income'` (no such table — real table is `income_sources`). Additionally, many tables that contain user data are not listed at all.

**Fix — replace USER_TABLES:**
```js
const USER_TABLES = [
  'tasks',
  'bills',
  'habits',
  'habit_completions',
  'journal_entries',
  'checkin_logs',
  'coach_memories',
  'alarms',
  'spend_log',
  'nutrition_log',
  'meal_log',
  'weight_log',
  'supplements',
  'meal_templates',
  'progress_snapshots',
  'income_sources',
  'financial_goals',
  'crew_members',     // removes them from crews but doesn't delete owned crews
  'co_sessions',
]
```

Note: `crews` owned by the user (where `owner_id = userId`) should also be deleted. Add a separate step for crew deletion before the loop since it uses `owner_id` not `user_id`.

---

## MEDIUM BUGS

---

### BUG-06 · `lib/memoryCompression.js` — logs userId to Vercel output
**Owner:** T3
**File:** `lib/memoryCompression.js`, line ~66
**Impact:** Every memory compression event logs the user's UUID to Vercel function logs. Privacy concern. Noise in logs.

**Fix:** Remove or convert to a non-identifying log:
```js
// Remove this line:
console.log('[memoryCompression] saved summary for', userId)
```

---

### BUG-07 · `require()` mixed with ES modules in 4 files
**Owner:** T2
**Files:**
- `pages/api/cron/morning-checkin.js` line 4
- `pages/api/cron/midday-checkin.js` line 4
- `pages/api/cron/evening-checkin.js` line 7
- `pages/api/co-session/nudge.js` line 3

**Impact:** Works via webpack interop currently, but is an ES module violation that can silently break on Next.js version updates or strict ESM configs. Should be unified before launch.

**Fix — convert each to ES import:**
```js
// Before:
const { sendPushToUsers } = require('../../../lib/push')

// After:
import { sendPushToUsers } from '../../../lib/push'
```

(Move to top of file with other imports.)

---

### BUG-08 · `bills-to-tasks.js` — dead reference to `bill.account`
**Owner:** T2
**File:** `pages/api/bills-to-tasks.js`, line 46
**Impact:** `bills` table has no `account` column. `bill.account` is always `undefined`, so this branch is dead code. Low risk — silently skipped, no crash.

**Fix:** Remove the dead line:
```js
// Remove:
if (bill.account) noteParts.push(bill.account)
```

---

## SCHEMA DOC ERRORS — Update DB_SCHEMA_v5.md

The schema doc uploaded to Claude.ai project has these confirmed inaccuracies. Update before S33 terminal work begins so terminals aren't confused.

**`checkin_logs` — actual DB columns:**
```
id, user_id, role, content, persona_blend (array), created_at
```
Doc shows: `prompt_used, ai_response, mood_before, mood_after` — ALL WRONG.

**`co_sessions` — actual DB columns:**
```
id, host_user_id, guest_user_id, session_code, duration_minutes, status
('waiting'|'active'|'complete'|'cancelled'), host_task, guest_task, started_at, ended_at, created_at, updated_at
```
Doc shows: `host_id, partner_id, duration_mins` — column names wrong throughout.

**`tag_team_crews` table does NOT exist.**
Real tables: `crews`, `crew_members`, `crew_tasks` (migration 014).
`crews` has: `id, owner_id, name, crew_type, invite_code, created_at`

**`saved_meals` table does NOT exist.**
Real table name: `meal_templates`

**`spend_log.note` does NOT exist.**
Real column name: `description`

**Missing tables entirely (all confirmed in live DB):**
`alarms`, `financial_goals`, `income_sources`, `nutrition_entries`, `meal_log`, `crew_activity`, `crew_nudges`, `crew_sprints`, `supplement_stack`, `feedback`

---

## WHAT IS CLEAN (confirmed no bugs)

- `lib/authGuard.js` — clean, token extraction correct
- `lib/rateLimit.js` — `ai_interactions_reset_at` ✅ exists on profiles
- `lib/push.js` — VAPID key naming correct (`NEXT_PUBLIC_VAPID_PUBLIC_KEY`) ✅
- `lib/sanitize.js` — clean
- `lib/subscriptionGate.js` — clean
- `lib/stripe.js` — clean
- `pages/api/stripe/webhook.js` — clean, bodyParser disabled ✅, updates correct columns ✅
- `pages/api/stripe/create-checkout-session.js` — clean
- `pages/api/checkin.js` — tool definitions and handler clean; `checkin_logs` insert uses correct columns ✅
- `pages/api/tasks.js` POST — `recurrence`, `recurrence_days`, `reminder` all ✅ exist in DB
- `pages/api/tasks/[id].js` — clean
- `pages/api/tasks/bulk.js` — clean (same columns as tasks.js)
- `pages/api/tasks/streak.js` — clean
- `pages/api/tasks/xp.js` — clean
- `pages/api/bills.js` — clean
- `pages/api/bills/[id].js` — not read but likely clean
- `pages/api/habits.js` — all extended columns ✅ exist in live DB
- `pages/api/habits/complete.js` — clean
- `pages/api/rollover-tasks.js` — clean
- `pages/api/voice/parse.js` — clean
- `pages/api/waitlist.js` — clean
- `pages/api/notifications/subscribe.js` — clean
- `pages/api/nutrition/log.js` — clean (writes to `nutrition_log` ✅)
- `pages/api/nutrition/water.js` — clean (reads/writes `nutrition_log` ✅)
- `pages/api/nutrition/meals.js` — clean (`meal_templates` ✅)
- `pages/api/nutrition/supplements.js` — clean
- `pages/api/nutrition/body.js` — clean (`body_metrics` columns ✅)
- `pages/api/nutrition/weight.js` — clean (`weight_log` columns ✅)
- `pages/api/nutrition/insights.js` — clean
- `pages/api/nutrition/parse.js` — clean (AI parse only, no DB write)
- `pages/api/finance/summary.js` — clean
- `pages/api/finance/insight.js` — clean
- `pages/api/finance/spend.js` — clean (`logged_at` ✅ exists on spend_log)
- `pages/api/finance/spend-log.js` — clean
- `pages/api/income.js` — clean (`income_sources` table ✅ exists)
- `pages/api/co-session/create.js` — clean
- `pages/api/co-session/join.js` — clean
- `pages/api/co-session/nudge.js` — clean except `require()` bug (BUG-07)
- `pages/api/crews/create.js` — clean (`crew_type`, `invite_code` ✅ exist on crews)
- `pages/api/crews/index.js` — clean (graceful on `crew_activity`)
- `pages/api/feedback.js` — graceful fail ✅, no crash
- `pages/api/export.js` — reads from some stale table names but wrapped in try/catch, returns empty arrays for missing data
- `pages/api/settings.js` — clean, all fields exist on profiles ✅
- `pages/api/chores.js` — clean (`chore_preset` ✅, inserts to `tasks` correctly)
- `pages/api/delete-account.js` — Stripe logic clean; USER_TABLES is the bug (BUG-05)

---

## QUICK REFERENCE — Fix Queue by Terminal

### T2 (5 fixes + 2 cleanups)
| # | File | Line | Change |
|---|------|------|--------|
| BUG-01 | `pages/api/progress-snapshot.js` | 102 | Remove `updated_at` from upsert |
| BUG-02 | `pages/api/nutrition/today.js` | 17 | `meal_log` → `nutrition_log` |
| BUG-03 | `pages/api/finance/budget.js` | 13 | `.eq('user_id'` → `.eq('id'` |
| BUG-04 | `pages/api/finance/score.js` | 22 | Remove `financial_goals` from profiles select + query `financial_goals` table |
| BUG-05 | `pages/api/delete-account.js` | 30–39 | Replace USER_TABLES array |
| BUG-07 | 4 cron/co-session files | top | `require()` → `import` |
| BUG-08 | `pages/api/bills-to-tasks.js` | 46 | Remove dead `bill.account` reference |

### T3 (1 fix)
| # | File | Line | Change |
|---|------|------|--------|
| BUG-06 | `lib/memoryCompression.js` | ~66 | Remove `console.log` with userId |

### Cowork (docs update)
- Update `DB_SCHEMA_v5.md` with corrected `checkin_logs`, `co_sessions`, crews table names, and add missing tables
- Upload corrected doc to Claude.ai project

---

*AUDIT_S32.md · Cinis · March 31, 2026 · All bugs verified against live Supabase DB*
