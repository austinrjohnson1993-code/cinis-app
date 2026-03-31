# DB_SCHEMA_v6.md
*Updated: S32 · March 31, 2026 · All columns verified against live Supabase DB*

---

## Connection

- **Project ID:** ieimwwhvrbujgnovvrrc
- **Supabase MCP:** `execute_sql` with `project_id: ieimwwhvrbujgnovvrrc`
- **RLS:** Enabled on ALL tables — always use `auth.uid()` policies

---

## Core Tables

### profiles
User identity + settings + AI memory
```
id                          uuid (FK → auth.users)
email                       text
full_name                   text
persona_blend               text[]
persona_voice               text
persona_set                 boolean
persona_custom_notes        text
baseline_profile            text
rolling_memory_summary      text
ai_context                  text
coaching_blend              jsonb
communication_style         text
subscription_status         text ('free' | 'pro')
subscription_expires_at     timestamptz
stripe_customer_id          text
ai_interactions_today       integer
ai_interactions_reset_at    timestamptz
current_streak              integer
longest_streak              integer
total_xp                    integer
theme_id                    text
accent_color                text
push_subscription           jsonb
push_notifications_enabled  boolean
morning_time                text
midday_time                 text
evening_time                text
checkin_times               text[]
checkin_mode                text
checkin_preference          text
onboarding_complete         boolean
onboarded                   boolean
birthday                    date
last_checkin_message        text
last_checkin_at             timestamptz
next_checkin_at             timestamptz
last_rollover_date          date
monthly_income              numeric
income_frequency            text
income_sources              jsonb
payday_day                  integer
budget_plan                 text
chore_preset                text
mental_health_context       text
calorie_target              integer
protein_target              integer
water_target                integer
nutrition_staples           text[]
diagnosis                   text
main_struggle               text
work_schedule               text
sleep_habits                text
exercise_habits             text
food_habits                 text
family_context              text
biggest_friction            text
accountability_style        text
past_failures               text
current_priorities          text
ranked_priorities           text[]
shepherd_focus              text
shepherd_interrupt          text
shepherd_celebrate          text
tutorial_completed          boolean
tutorial_step               integer
created_at                  timestamptz
updated_at                  timestamptz
```

### tasks
```
id                  uuid
user_id             uuid (FK → profiles)
title               text
completed           boolean
archived            boolean
scheduled_for       timestamptz
completed_at        timestamptz
due_time            timestamptz
rollover_count      integer
notes               text
sort_order          integer
starred             boolean
task_type           text ('task' | 'bill' | 'chore' | 'appointment')
estimated_minutes   integer
recurrence          text
recurrence_days     text[]
reminder            text
consequence_level   text
priority_score      integer
created_at          timestamptz
updated_at          timestamptz
```

### habits
```
id                uuid
user_id           uuid (FK → profiles)
name              text
description       text
frequency         text ('daily' | 'weekly' | 'custom')
frequency_days    text[]
habit_type        text ('build' | 'break')
target_metric     text
target_count      integer
reminder_time     text
habit_stack       text
difficulty        text
track_relapses    boolean
note              text
color             text
archived          boolean
created_at        timestamptz
```

### habit_completions
```
id           uuid
habit_id     uuid (FK → habits)
user_id      uuid (FK → profiles)
completed_at timestamptz
```

### journal_entries
```
id           uuid
user_id      uuid (FK → profiles)
content      text
ai_response  text
mood         text
created_at   timestamptz
```

---

## Finance Tables

### bills
```
id          uuid
user_id     uuid (FK → profiles)
name        text
amount      numeric
due_day     integer
frequency   text ('monthly' | 'weekly' | 'biweekly' | 'annual')
category    text
autopay     boolean
notes       text
auto_task   boolean
created_at  timestamptz
```

### spend_log
```
id          uuid
user_id     uuid (FK → profiles)
amount      numeric
category    text
description text          ← NOTE: column is 'description' not 'note'
impulse     boolean
logged_at   timestamptz
```

### income_sources
```
id               uuid
user_id          uuid (FK → profiles)
name             text
income_type      text
annual_amount    numeric
hourly_rate      numeric
hours_per_week   numeric
monthly_amount   numeric
pay_frequency    text
next_pay_date    date
is_net           boolean
created_at       timestamptz
```

### financial_goals
```
id              uuid
user_id         uuid (FK → profiles)
title           text
target_amount   numeric
current_amount  numeric
target_date     date
category        text
notes           text
created_at      timestamptz
```

---

## Check-in / AI Tables

### checkin_logs
Records each AI check-in message in conversation thread style
```
id              uuid
user_id         uuid (FK → profiles)
role            text ('user' | 'assistant')
content         text
persona_blend   text[]
created_at      timestamptz
```
⚠️ NOTE: Actual columns are role/content/persona_blend. NOT prompt_used/ai_response/mood_before/mood_after.

### coach_memories
Persistent memory tags from AI coaching sessions (migration 018)
```
id              uuid
user_id         uuid (FK → profiles)
memory_key      text
memory_value    text
updated_at      timestamptz
```

---

## Progress Tables

### progress_snapshots
Daily snapshot of user metrics
```
id                  uuid
user_id             uuid (FK → profiles)
snapshot_date       date
tasks_completed     integer
tasks_added         integer
tasks_rolled        integer
focus_minutes       integer
journal_entries     integer
ai_summary          text
created_at          timestamptz
```
⚠️ NOTE: No updated_at column. Do NOT include updated_at in upserts.

---

## Focus Tables

### co_sessions
Focus co-session state (migration 023)
```
id                uuid
host_user_id      uuid (FK → auth.users)   ← NOTE: host_user_id not host_id
guest_user_id     uuid (FK → auth.users)   ← NOTE: guest_user_id not partner_id
session_code      text (unique)
duration_minutes  integer                   ← NOTE: duration_minutes not duration_mins
status            text ('waiting' | 'active' | 'complete' | 'cancelled')
host_task         text
guest_task        text
started_at        timestamptz
ended_at          timestamptz
created_at        timestamptz
updated_at        timestamptz
```

### co_session_nudges (migration 023)
```
id            uuid
session_id    uuid (FK → co_sessions)
from_user_id  uuid (FK → auth.users)
message       text
sent_at       timestamptz
```

---

## Tag Team / Crews Tables (migration 014)

### crews
```
id           uuid
owner_id     uuid (FK → profiles)
name         text
crew_type    text ('family' | 'work' | 'general')
invite_code  text
created_at   timestamptz
```

### crew_members
```
id         uuid
crew_id    uuid (FK → crews)
user_id    uuid (FK → profiles)
role       text ('owner' | 'member')
joined_at  timestamptz
```

### crew_tasks
```
id           uuid
crew_id      uuid (FK → crews)
added_by     uuid (FK → profiles)
assigned_to  uuid (FK → profiles)
title        text
due_date     date
status       text ('open' | 'claimed' | 'done')
created_at   timestamptz
completed_at timestamptz
```

### crew_activity
(Created directly in Supabase — no local migration)
```
id          uuid
crew_id     uuid (FK → crews)
user_id     uuid (FK → profiles)
text        text
created_at  timestamptz
```

### crew_nudges
(Created directly in Supabase — no local migration)
```
id          uuid
crew_id     uuid (FK → crews)
user_id     uuid (FK → profiles)
emoji       text
text        text
created_at  timestamptz
```

### crew_sprints
(Created directly in Supabase — no local migration)
*Columns not yet audited*

---

## Nutrition Tables

### nutrition_log
Primary table — used by nutrition/log.js, water.js, insights.js
```
id                uuid
user_id           uuid (FK → profiles)
meal_name         text         ← NOTE: meal_name not food_name
food_description  text
calories          integer
protein_g         numeric
carbs_g           numeric
fat_g             numeric
meal_type         text ('breakfast' | 'lunch' | 'dinner' | 'snack' | 'water' | 'pre-workout' | 'post-workout')
logged_at         timestamptz
```

### meal_log
Legacy/alternative table — used by nutrition/today.js
(Target: migrate today.js to use nutrition_log — see BUG-02 in AUDIT_S32.md)
```
id           uuid
user_id      uuid (FK → profiles)
meal_type    text
description  text
items        jsonb
calories     numeric
protein_g    numeric
carbs_g      numeric
fat_g        numeric
confidence   text
logged_at    timestamptz
template_id  uuid (FK → meal_templates)
```

### meal_templates (migration 019)
```
id          uuid
user_id     uuid (FK → profiles)
name        text
description text
calories    integer
protein_g   numeric
carbs_g     numeric
fat_g       numeric
log_count   integer
created_at  timestamptz
updated_at  timestamptz
```

### nutrition_entries
(Created directly in Supabase — older/separate table)
```
id          uuid
user_id     uuid (FK → profiles)
category    text
name        text
notes       text
logged_at   timestamptz
```

### supplements (migration 022)
```
id                uuid
user_id           uuid (FK → profiles)
name              text
dose              text
form              text
timing_groups     text[]
frequency         text ('daily' | 'trainingdays' | 'weekdays' | 'custom')
frequency_days    text[]
preferred_time    time
note              text
last_taken_date   date
created_at        timestamptz
```

### supplement_stack
(Created directly in Supabase — no local migration)
*Columns not yet audited*

### body_metrics
```
id            uuid
user_id       uuid (FK → profiles)
weight_lbs    numeric
body_fat_pct  numeric
logged_at     timestamptz
```

### weight_log (migration 021)
```
id            uuid
user_id       uuid (FK → profiles)
weight_lbs    numeric
unit_entered  text ('lbs' | 'kg')
logged_date   date
note          text
created_at    timestamptz
```

---

## Other Tables

### alarms
(Created directly in Supabase — no local migration)
```
id          uuid
user_id     uuid (FK → profiles)
title       text
alarm_time  timestamptz
repeat      text
task_id     uuid (FK → tasks, nullable)
active      boolean
triggered   boolean
created_at  timestamptz
```

### feedback
(Created directly in Supabase — no local migration)
```
id          uuid
user_id     uuid (FK → profiles)
message     text
created_at  timestamptz
```

---

## Infrastructure / Auth Tables

### waitlist (migration 017)
```
id          uuid
email       text (unique)
phone       text
created_at  timestamptz
```

---

## Migration History

| # | File | What It Adds |
|---|------|-------------|
| 002 | persona_checkin | persona_blend, baseline_profile, last_checkin_message, last_checkin_at on profiles |
| 003 | chores_mental_health | chore_preset, mental_health_context, monthly_income, income_frequency on profiles |
| 004 | bills_extended | autopay, auto_task, notes on bills |
| 005 | bills_amount_numeric | amount → numeric type |
| 010 | tasks_starred | starred boolean on tasks |
| 011 | tasks_task_type | task_type text on tasks |
| 012 | tasks_estimated_minutes | estimated_minutes on tasks |
| 013 | checkin_logs | checkin_logs table |
| 014 | tag_team_crews | crews, crew_members, crew_tasks tables |
| 015 | spend_log | spend_log table |
| 017 | waitlist | waitlist table |
| 018 | coach_memories | coach_memories table |
| 019 | meal_templates | meal_templates table |
| 020 | meal_log_extensions | adds template_id, items, confidence to meal_log |
| 021 | weight_log | weight_log table |
| 022 | supplements | supplements table |
| 023 | co_sessions | co_sessions, co_session_nudges tables |

*23 migrations total (002–023)*
*Many additional columns + tables created directly in Supabase without local migration files*

---

## Common Query Patterns

### Always scope by user_id
```sql
SELECT * FROM tasks WHERE user_id = auth.uid() AND NOT archived
ORDER BY sort_order ASC;
```

### Today's tasks
```sql
SELECT * FROM tasks
WHERE user_id = auth.uid()
  AND (scheduled_for::date = CURRENT_DATE OR scheduled_for IS NULL)
  AND NOT archived AND NOT completed
ORDER BY sort_order ASC;
```

### Check subscription status
```sql
SELECT subscription_status FROM profiles WHERE id = auth.uid();
```

### Profile PK is id, not user_id
```js
// ALWAYS use:
.from('profiles').eq('id', userId)
// NEVER use:
.from('profiles').eq('user_id', userId)  // ← wrong, profiles has no user_id column
```

---

*DB_SCHEMA_v6.md · Cinis · S32 · March 31, 2026 · Verified against live DB*
