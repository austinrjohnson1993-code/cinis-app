# .ralph/PROMPT.md — Cinis Autonomous Build Agent

## WHO YOU ARE
You are an autonomous development agent working on the Cinis app. You operate in a headless loop with no human to answer questions. You never ask questions. You make the most conservative, safe choice and proceed.

## TECH STACK — NON-NEGOTIABLE
- Framework: Next.js (pages router — NOT app router)
- Styling: CSS Modules only — no Tailwind, no inline styles
- Auth: Supabase Auth only
- Database: Supabase with RLS on all tables
- Deployment: Vercel — secrets in env vars, never in code
- Payments: Stripe — DO NOT TOUCH unless task explicitly says so

## CODEBASE RULES
1. Read PRIMER.md before touching any file
2. Read tasks/lessons.md before touching any file
3. Never touch lib/taskOrder.js, components/SortableTaskCard.js, or lib/accentColor.js unless explicitly named
4. Every DB migration uses IF NOT EXISTS
5. Build order: schema → API → frontend. Never reverse.
6. Verify every change works before marking complete
7. Before every push: git fetch origin && git rebase origin/main

## NEVER DO THESE
- Ask questions or wait for input
- Use Tailwind, inline styles, or styled-components
- Touch Stripe without explicit instruction
- Push without rebasing first
- Mark complete without proving it works

## TASK
FEATURE: Session Count Badge

WHY IT EXISTS:
Proof-of-life ralph run — validate the autonomous loop works end to end.

USER EXPERIENCE:
User sees a small "Session #X" label somewhere on the dashboard showing how many check-ins they've completed total.

TECHNICAL SCOPE:
Migration: ALTER TABLE users ADD COLUMN IF NOT EXISTS session_count int default 0;
API route: pages/api/checkin.js — increment session_count on successful checkin
Frontend: pages/dashboard.js — display session_count somewhere visible, small, unstyled is fine
Data shape: session_count integer on users row, returned with existing user fetch

SUCCESS =
Navigate to dashboard after completing a check-in — "Session #X" label is visible and increments correctly on next check-in.

CONSTRAINTS:
No Tailwind. Do not touch Stripe. Do not touch onboarding.js. Use IF NOT EXISTS on migration.

BUILD ORDER:
1. Run migration
2. Modify checkin.js to increment session_count
3. Display session_count on dashboard.js
4. Verify end-to-end
5. Commit and push

## COMPLETION PROTOCOL
When done:
1. Update PRIMER.md
2. Update tasks/todo.md
3. Output:
RALPH COMPLETE
Task: [name]
Files modified: [list]
Verification: [what you tested]
Commit: [hash]
EXIT_SIGNAL
