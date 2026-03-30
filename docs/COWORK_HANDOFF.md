# Cowork — Briefing for Claude Code Terminals

*Read this once at the start of any session where you'll be working alongside Cowork.*

---

## What Cowork Is

Cowork is Ryan's always-on desktop Claude (running Claude Sonnet in Cowork mode). It is a completely separate process from you — not a terminal, not Claude Code. It has a different tool set, broader file access, and live connections to every service the project touches.

**The working relationship:**
- Terminals write and iterate on code within their assigned file domains
- Cowork diagnoses, audits, verifies against live services, and handles anything that crosses terminal boundaries
- You do not need to ask for permission to request Cowork — just flag it and Ryan routes it

---

## What Cowork Can Do That You Cannot

### Live Service Access
Cowork has direct MCP connections — not just file access, but live API calls — to:

| Service | What Cowork can do |
|---|---|
| **Supabase** | Run any SQL query, inspect schema, apply migrations, pull logs, manage edge functions, DB branching |
| **Vercel** | Check deployment status, pull build logs, pull runtime logs, trigger deployments, fetch live URLs |
| **Gmail** | Search inbox, read emails and threads, create drafts |
| **Google Calendar** | Read/create/update/delete events, find free time, respond to invites |
| **Google Drive** | Search and read files |
| **Granola** | Read meeting transcripts, search meeting history |
| **Base44** | Build and edit Base44 apps, manage data schemas |
| **MCP/Plugin Registry** | Search for new connectors and plugins |
| **Scheduled Tasks** | Create recurring automated workflows |
| **Session History** | Read transcripts of all past Cowork sessions |

### Browser Control
Cowork can control Chrome directly:
- Navigate to any URL (including cinis.app in production)
- Read page DOM, text, network requests, console messages
- Fill forms and click elements
- Execute JavaScript in the browser context
- Full mouse/keyboard control via `computer` tool

*Limitation: Cannot interact with cross-origin iframes like Stripe Checkout. Cowork generates the payload/URL and hands off to Ryan.*

### Full Codebase Parallelism
Cowork can spawn sub-agents that scan different parts of the repo simultaneously. A full-repo audit that would take you 30+ minutes of sequential reads takes Cowork under 2 minutes.

### Document Output
Cowork can produce .docx, .pptx, .xlsx, and .pdf files with professional formatting.

---

## What Cowork Cannot Do That You Can

- Run `npm run dev` and iterate with browser hot-reload feedback — that loop is yours
- Stay resident in a single terminal session across many build/fix cycles
- Work within a specific file domain with deep context on one component

---

## Cowork's Skill Inventory

Beyond raw tools, Cowork has structured skill workflows it can invoke:

**Engineering:** debug, code-review, architecture (ADRs), system-design, deploy-checklist, testing-strategy, documentation, incident-response, standup, tech-debt

**Product:** write-spec, competitive-brief, roadmap-update, sprint-planning, stakeholder-update, metrics-review, synthesize-research

**Data:** analyze, write-query, sql-queries, explore-data, statistical-analysis, create-viz, data-visualization, build-dashboard, validate-data, data-context-extractor

**Productivity:** task-management, memory-management, start, update

**Plugins:** create-cowork-plugin, cowork-plugin-customizer, skill-creator

---

## File Domain Rules

Cowork has NO file domain restriction — it can read and write any file in the repo. However, it respects terminal ownership. When Cowork makes surgical edits to a terminal-owned file, it reports this clearly. Terminals do not need to re-read those files from scratch — Cowork will report exactly what changed and why.

The files that are off-limits to EVERYONE without explicit Ryan instruction remain off-limits to Cowork too:
- `lib/taskOrder.js`
- `components/SortableTaskCard.js`
- `lib/accentColor.js`

---

## When to Request Cowork

Flag Cowork when your task requires ANY of the following:

- Reading files outside your terminal domain (cross-boundary)
- Verifying something in Supabase, Vercel, or any live service
- A bug that involves files owned by a different terminal
- A bulk find-and-replace across 5+ files
- Checking whether the live site matches what the code says
- Generating a spec, report, or document
- Reading email, calendar, or meeting notes related to the project
- Browser-based end-to-end testing

**How to flag it:**
```
"This requires [cross-boundary scanning / live service check / bulk normalization] — recommend Cowork audit before proceeding."
```
Ryan routes it. Cowork diagnoses. You fix.

---

## Full Reference

Full MCP tool-by-tool inventory: `docs/COWORK_CAPABILITIES.md`

---

*COWORK_HANDOFF.md · S30 · March 30, 2026*
