# Cinis — Product Vision & Growth Architecture

## The Core Insight
Every other productivity app is single-player. Cinis is multiplayer.
The coach is the coordination layer between people, not just between
a person and their tasks.

## Four Layers

### Layer 1 — Individual (Live Today)
Personal AI coaching. Knows your baseline, your tasks, your patterns.
Talks to you like a person, not a productivity app.
Price: Free / $14 month / $99 year

### Layer 2 — Family (V1.4)
Shared household coordination via coach.
- Mom tells coach: "Add dishes to Jake's chore list"
  → inserts into Jake's tasks with mom attribution
- Husband adds car payment → wife's Finance tab updates automatically
- Coach knows every family member's schedule and bills
- No group chats, no "hey can you add this" — just tell Cinis
Price: Same as individual, shared crew is free

### Layer 3 — Work Team (V1.5)
Team coordination replacing standup and task logging.
- Manager tells coach: "Add API docs to Sarah's sprint, due Friday"
  → inserts into Sarah's task list, appears in her morning check-in
- VP says verbally: "Add Monday standup to engineering team"
  → creates recurring task for every crew member, sends nudges
- Coach reads crew task status: "What's the team working on?"
  → returns sprint summary across all members
- No Jira. No Asana. No logging. Just speak.
Price: $20-30/seat/month

### Layer 4 — Enterprise (V2.0+)
Org-level deployment. Same architecture, enterprise permissions.
- Role hierarchy: Owner → VP → Manager → IC
- Department-level crews
- Coach cross-writes with permission model
- Completion analytics per team
- SSO + admin dashboard
- Audit trail on all coach actions
Price: Custom contracts, $25-40/seat/month

## The Voice Layer — The Real Unlock
The Voice FAB is already built (Web Speech API, live in app).
Extending it to crew coordination requires only:
1. Coach tool: add_crew_task(crew_id, assignee_id, title, due)
2. Coach tool: add_shared_bill(crew_id, bill_data)
3. Coach tool: nudge_crew_member(crew_id, member_id, message)
4. Coach tool: get_crew_status(crew_id) — manager summary
5. Cross-user writes via Supabase service role

The foundation is one codebase. Consumer and enterprise run on the
same infrastructure. The permission model is the only delta.

## Time ROI for Enterprise
50-person company × 20 min/day task logging = 16 hrs collective
productivity lost daily. Cinis with voice + crew tools eliminates
most of that overhead. At $25/seat = $1,250/month. ROI conversation
sells itself.

## Growth Loop
Individual user loves it → introduces it to family → family uses it
→ one family member is a manager → introduces it to their team →
team adopts → company buys enterprise seats.

Consumer is the top of the funnel. Enterprise is the revenue ceiling.

## Architecture Efficiency
Tag Team tables (crews, crew_members, crew_tasks, crew_sprints) get
built once for family (V1.4) and serve work + enterprise with
permission model changes only. No rebuild. Pure extension.

---
*Captured Session 25 · March 24, 2026*
*This is the moat. Single-player productivity apps cannot compete
with a multiplayer coordination layer.*
