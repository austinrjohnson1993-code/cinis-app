# Terminal Fix Prompts — S32 Audit
*Generated: March 31, 2026*
*Run these in Wave 1 — all independent, no cross-file dependencies. Run T2 and T3 in parallel.*

---

## T3 — 1 fix (run first, fastest)

### Prompt for T3:

```
Read PRIMER.md and TERMINAL_CONTEXT.md first.

TASK: Remove console.log from lib/memoryCompression.js

ROOT CAUSE: Line ~66 in lib/memoryCompression.js has:
  console.log('[memoryCompression] saved summary for', userId)
This logs user UUIDs to Vercel function output on every memory compression event.

INSTRUCTIONS:
1. Read lib/memoryCompression.js completely
2. Find the exact line with console.log('[memoryCompression] saved summary for', userId)
3. Delete that line and nothing else
4. Do not touch any other logic in this file

VERIFY: Read the file after editing and confirm the console.log line is gone and surrounding code is untouched.

OUTPUT FORMAT:
TERMINAL: T3
TASK: Remove userId console.log from lib/memoryCompression.js
ROOT CAUSE: Console.log logs user UUID on every memory save — privacy issue and log noise
FILES MODIFIED: lib/memoryCompression.js
VERIFICATION: [confirm line removed, show 3 lines before and after where it was]
RESULT: PASS / FAIL
```

---

## T2 — 7 fixes (run after T3 starts, all independent)

### Prompt for T2:

```
Read PRIMER.md and TERMINAL_CONTEXT.md first.

TASK: Fix 7 confirmed bugs from S32 audit. All files are in pages/api/. All bugs verified against live DB. Execute all fixes in this single session.

---

FIX 1: pages/api/progress-snapshot.js — remove updated_at from upsert
ROOT CAUSE: progress_snapshots table has no updated_at column. The upsert fails with a DB error every time it runs (daily cron + manual trigger = progress tab broken).

ACTION: Read pages/api/progress-snapshot.js. Find the upsert object (around line 93–104). Remove the line:
  updated_at: new Date().toISOString(),
Do not change anything else.

---

FIX 2: pages/api/nutrition/today.js — change meal_log to nutrition_log
ROOT CAUSE: today.js reads from meal_log but all nutrition logging (log.js, water.js) writes to nutrition_log. Two separate tables in live DB. Today view always shows zero entries.

ACTION: Read pages/api/nutrition/today.js. Find line 17 (the .from() call). Change:
  .from('meal_log')
to:
  .from('nutrition_log')
That's the only change needed. The column names (calories, protein_g, etc.) are identical between the two tables.

---

FIX 3: pages/api/finance/budget.js — fix profiles WHERE clause
ROOT CAUSE: .eq('user_id', userId) on profiles — but profiles uses id as PK, not user_id. Query returns null profile, budget page shows no income data.

ACTION: Read pages/api/finance/budget.js. Find the profiles query (line ~13). Change:
  .eq('user_id', userId)
to:
  .eq('id', userId)
Do not change anything else.

---

FIX 4: pages/api/finance/score.js — fix profiles select + query financial_goals table
ROOT CAUSE: .select('budget_plan, income_sources, financial_goals') fails because financial_goals is NOT a column on profiles — it's a standalone table. PostgREST throws an error, finance score always broken.

ACTION: Read pages/api/finance/score.js completely.

Change the profiles select (line ~22) to remove financial_goals:
  .select('budget_plan, income_sources')

Add a new entry to the Promise.all for the financial_goals table:
  supabaseAdmin.from('financial_goals')
    .select('id, category')
    .eq('user_id', userId),

Destructure the new result at the top of the Promise.all block.

Replace the financial_goals usage (lines ~48–52):
  // BEFORE:
  const financialGoals = profile?.financial_goals || []
  const hasEmergencyGoal = Array.isArray(financialGoals)
    ? financialGoals.some(g => String(g).toLowerCase().includes('emergency'))
    : String(financialGoals).toLowerCase().includes('emergency')

  // AFTER (goalsData is from the financial_goals query):
  const financialGoals = goalsData || []
  const hasEmergencyGoal = financialGoals.some(g =>
    String(g.category || '').toLowerCase().includes('emergency')
  )

---

FIX 5: pages/api/delete-account.js — replace USER_TABLES with correct table names
ROOT CAUSE: USER_TABLES contains 3 wrong names (checkins, chores, income) that don't exist in DB. Also missing most tables that contain user data. Account deletion leaves orphaned data everywhere.

ACTION: Read pages/api/delete-account.js completely. Replace the USER_TABLES array:

  // BEFORE:
  const USER_TABLES = [
    'tasks',
    'bills',
    'journal_entries',
    'checkins',
    'alarms',
    'chores',
    'income',
    'progress_snapshots',
  ]

  // AFTER:
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
    'crew_members',
    'co_sessions',
  ]

Do not change any other logic in this file.

---

FIX 6: Convert require() to import in 4 files
ROOT CAUSE: Four files use CommonJS require() mixed with ES module syntax. Works via webpack interop but is an ESM violation that can break on Next.js version changes.

FILES TO FIX (all the same change):
  - pages/api/cron/morning-checkin.js
  - pages/api/cron/midday-checkin.js
  - pages/api/cron/evening-checkin.js
  - pages/api/co-session/nudge.js

For EACH file:
1. Read the file
2. Find: const { sendPushToUsers } = require('../../../lib/push')
   (morning/midday/evening use ../../../lib/push; nudge uses ../../../lib/push — same path)
3. Replace with: import { sendPushToUsers } from '../../../lib/push'
   AND move it to the TOP of the file with the other imports
4. Verify the rest of the file is unchanged

Note: The import path depth differs — cron files use '../../../lib/push' and co-session/nudge.js also uses '../../../lib/push'. Verify the exact path in each file before changing.

---

FIX 7: pages/api/bills-to-tasks.js — remove dead bill.account reference
ROOT CAUSE: bills table has no account column. bill.account is always undefined, this branch never runs. Dead code.

ACTION: Read pages/api/bills-to-tasks.js. Find line ~46:
  if (bill.account) noteParts.push(bill.account)
Delete that line. Do not change anything else.

---

VERIFICATION FOR ALL 7 FIXES:
After all edits, confirm:
1. progress-snapshot.js: upsert has no updated_at field
2. nutrition/today.js: reads from nutrition_log not meal_log
3. finance/budget.js: profiles query uses .eq('id', userId)
4. finance/score.js: profiles select has no financial_goals; financial_goals table queried separately; hasEmergencyGoal uses category field
5. delete-account.js: USER_TABLES has 19 entries with correct names
6. All 4 cron/nudge files: sendPushToUsers imported at top, not required mid-file
7. bills-to-tasks.js: no bill.account reference

OUTPUT FORMAT (one block per fix):
TERMINAL: T2
FIX: [number and description]
ROOT CAUSE: [one sentence]
FILES MODIFIED: [filename]
VERIFICATION: [what you confirmed]
RESULT: PASS [evidence] | FAIL [exact error]
```

---

*TERMINAL_PROMPTS_S32.md · Cinis · S32 · March 31, 2026*
