# Cowork — Full Capability Reference

*Updated S30 · March 30, 2026 · Cowork (Claude Sonnet) · Auto-read by terminals before requesting audits*

Cowork is Ryan's always-on desktop Claude running in Cowork mode. It is NOT a Claude Code terminal — it's a separate tool with a fundamentally different and broader capability set. It operates with full read/write access to the Cinis-app repo AND live connections to every external service the project touches.

---

## CORE FILE & CODE CAPABILITIES

| Capability | Detail |
|---|---|
| Full codebase read | Reads, greps, and globs every file simultaneously. No file-at-a-time limit. |
| Multi-agent parallel search | Spawns sub-agents scanning different parts of the codebase concurrently. Full-repo audit in under 2 minutes vs 30+ minutes for a single terminal. |
| Write and edit files directly | Surgical edits, bulk renames, entire new files. Can rename a pattern across 15 files in one pass. |
| Cross-reference code vs docs | Reads all planning docs and compares actual code state against intended state. Catches misalignments, not just bugs. |
| Run bash commands | npm, git, node, any CLI tool. Can run builds, lints, scripts, seed commands. |
| Web search and fetch | Live docs, APIs, current information. Can resolve library docs before implementing. |

**Scope note:** Cowork has NO terminal assignment and NO file domain restrictions. It can read and write any file. However, it defers all complex feature builds requiring iterative `npm run dev` + browser verification to the terminals — that feedback loop is theirs.

---

## MCP INTEGRATIONS — LIVE SERVICE ACCESS

These are real, live connections. Cowork can execute queries and mutations against production services.

### Supabase (via `mcp__75eb476a`)
- `execute_sql` — run any SQL against the project DB
- `list_tables` / `list_migrations` — schema inspection
- `apply_migration` — run migrations (confirm with Ryan first)
- `get_logs` — pull recent edge function or API logs
- `get_project` / `get_project_url` / `get_publishable_keys` — project metadata
- `list_branches` / `create_branch` / `merge_branch` / `delete_branch` / `rebase_branch` / `reset_branch` — DB branching
- `generate_typescript_types` — regenerate types from schema
- `search_docs` — query Supabase documentation directly
- `get_advisors` — performance and security recommendations
- `deploy_edge_function` / `get_edge_function` / `list_edge_functions` — edge function management
- `get_cost` / `confirm_cost` — usage and billing checks
- `list_extensions` / `list_organizations` / `get_organization` — org-level metadata
- `pause_project` / `restore_project` — project lifecycle

### Vercel (via `mcp__77aeaab0`)
- `list_deployments` / `get_deployment` — check deployment status
- `get_deployment_build_logs` — pull build logs when a deploy fails
- `get_runtime_logs` — pull live runtime logs from production
- `list_projects` / `get_project` / `list_teams` — project metadata
- `deploy_to_vercel` — trigger a deployment
- `get_access_to_vercel_url` / `web_fetch_vercel_url` — fetch a Vercel-hosted URL
- `search_vercel_documentation` — query Vercel docs directly
- `check_domain_availability_and_price` — domain lookup
- Toolbar: `list_toolbar_threads` / `get_toolbar_thread` / `reply_to_toolbar_thread` / `add_toolbar_reaction` / `edit_toolbar_message` / `change_toolbar_thread_resolve_status`

### Gmail (via `mcp__158f475b`)
- `gmail_search_messages` — search inbox by query string
- `gmail_read_message` / `gmail_read_thread` — read email content
- `gmail_create_draft` — compose drafts (Ryan sends manually)
- `gmail_list_drafts` / `gmail_list_labels` / `gmail_get_profile`

### Google Calendar (via `mcp__6ce9aa88`)
- `gcal_list_events` / `gcal_get_event` — read calendar
- `gcal_create_event` / `gcal_update_event` / `gcal_delete_event` — manage events
- `gcal_find_my_free_time` / `gcal_find_meeting_times` — scheduling assistance
- `gcal_respond_to_event` — accept/decline invites
- `gcal_list_calendars` — list all connected calendars

### Google Drive (via `mcp__c1fc4002`)
- `google_drive_search` — search Drive for files by name or content
- `google_drive_fetch` — read file contents from Drive

### Granola — Meeting Notes (via `mcp__8ecc85f6`)
- `list_meetings` / `get_meetings` / `list_meeting_folders` — browse meetings
- `get_meeting_transcript` / `query_granola_meetings` — read transcripts, search meeting history

### Base44 — App Builder (via `mcp__e9e0c6f6`)
- `create_base44_app` / `edit_base44_app` — build or edit Base44 apps
- `list_user_apps` — list existing Base44 apps
- `create_entities` / `create_entity_schema` / `list_entity_schemas` / `query_entities` — data model management within Base44

### Job Search (via `mcp__19e5740f`)
- `search_jobs` / `get_job_details` / `get_company_data` / `get_resume`

### Scheduled Tasks (via `mcp__scheduled-tasks`)
- `create_scheduled_task` — schedule recurring Cowork workflows
- `list_scheduled_tasks` / `update_scheduled_task`

### Session Info (via `mcp__session_info`)
- `list_sessions` / `read_transcript` — read full history of past Cowork sessions

### MCP & Plugin Registry
- `mcp__mcp-registry__search_mcp_registry` — search for available MCP connectors
- `mcp__mcp-registry__suggest_connectors` — suggest connectors for a task
- `mcp__plugins__search_plugins` — search plugin marketplace
- `mcp__plugins__suggest_plugin_install` — recommend plugins to install

---

## BROWSER CONTROL — Claude in Chrome (via `mcp__Claude_in_Chrome`)

Cowork has full browser control. This is NOT available to terminals.

- `navigate` — go to any URL
- `read_page` / `get_page_text` — read page DOM and text content
- `find` — find elements on page
- `form_input` — fill form fields (note: bypasses React synthetic events — use `computer` with keystrokes for React-controlled inputs)
- `javascript_tool` — execute JavaScript in the browser context
- `read_network_requests` / `read_console_messages` — inspect network traffic and console output
- `computer` — full mouse/keyboard control (screenshots, clicks, typing)
- `upload_image` / `file_upload` — upload files to browser
- `gif_creator` — record browser interactions as GIF
- `resize_window` / `switch_browser` / `tabs_create_mcp` / `tabs_close_mcp` / `tabs_context_mcp`
- `shortcuts_list` / `shortcuts_execute`

**Known limitation:** Cannot interact with cross-origin iframes (e.g. Stripe Checkout, payment modals). Cowork generates the URL/payload and hands off to Ryan.

---

## DOCUMENT CREATION SKILLS

| Skill | Output | Capability |
|---|---|---|
| `docx` | .docx | Headings, tables of contents, page numbers, letterheads, tracked changes |
| `pptx` | .pptx | Slide decks, pitch decks, reading/editing existing .pptx files |
| `xlsx` | .xlsx | Formulas, formatting, data analysis, charts, multi-sheet workbooks |
| `pdf` | .pdf | Create, merge, split, extract text/tables, fill forms |
| `schedule` | Scheduled task | Creates recurring automated Cowork workflows |

---

## ENGINEERING SKILLS (Plugin: Engineering)

| Skill | What it does |
|---|---|
| `engineering:debug` | Structured debug session — reproduce, isolate, diagnose, fix |
| `engineering:code-review` | Security, performance, correctness review of PRs or diffs |
| `engineering:architecture` | Architecture Decision Records (ADRs), technology trade-off analysis |
| `engineering:system-design` | System/service/API design from requirements |
| `engineering:deploy-checklist` | Pre-deployment verification — migrations, feature flags, CI, rollback plan |
| `engineering:testing-strategy` | Test strategy and test plan design |
| `engineering:documentation` | Technical docs, READMEs, runbooks, onboarding guides |
| `engineering:incident-response` | Incident triage, status communication, blameless postmortem |
| `engineering:standup` | Standup update from recent git/PR/ticket activity |
| `engineering:tech-debt` | Tech debt audit, categorization, prioritization |

---

## PRODUCT MANAGEMENT SKILLS (Plugin: Product Management)

| Skill | What it does |
|---|---|
| `product-management:write-spec` | Feature spec or PRD from a problem statement |
| `product-management:competitive-brief` | Competitive analysis brief, battle cards |
| `product-management:roadmap-update` | Reprioritize roadmap, add/shift initiatives |
| `product-management:sprint-planning` | Sprint scope, capacity, goals, carryover |
| `product-management:stakeholder-update` | Status updates for leadership, launches, escalations |
| `product-management:metrics-review` | Metrics review with trends and recommended actions |
| `product-management:synthesize-research` | Synthesize user interviews, surveys, support tickets into insights |

---

## DATA SKILLS (Plugin: Data)

| Skill | What it does |
|---|---|
| `data:analyze` | Answer data questions from quick lookups to full analyses |
| `data:write-query` / `data:sql-queries` | Write optimized SQL for any warehouse dialect |
| `data:explore-data` | Profile a dataset — nulls, distributions, quality issues |
| `data:statistical-analysis` | Descriptive stats, hypothesis testing, outlier detection |
| `data:create-viz` / `data:data-visualization` | Publication-quality charts with Python |
| `data:build-dashboard` | Interactive HTML dashboard with filters, KPI cards, charts |
| `data:validate-data` | QA an analysis before sharing — methodology, accuracy, bias |
| `data:data-context-extractor` | Build a company-specific data analysis skill from warehouse schema |

---

## PRODUCTIVITY SKILLS (Plugin: Productivity)

| Skill | What it does |
|---|---|
| `productivity:task-management` | Manage TASKS.md — add, complete, track commitments |
| `productivity:memory-management` | Two-tier memory system — CLAUDE.md + memory/ knowledge base |
| `productivity:start` | Initialize productivity system, bootstrap from existing task list |
| `productivity:update` | Sync tasks, triage stale items, fill memory gaps |

---

## PLUGIN MANAGEMENT SKILLS

| Skill | What it does |
|---|---|
| `cowork-plugin-management:create-cowork-plugin` | Build a new Cowork plugin from scratch |
| `cowork-plugin-management:cowork-plugin-customizer` | Customize an existing plugin for a specific org |
| `skill-creator` | Create, edit, benchmark, and optimize skills |

---

## COWORK WORKSPACE TOOLS

- `mcp__cowork__request_cowork_directory` — ask Ryan to select a folder to grant file access
- `mcp__cowork__allow_cowork_file_delete` — request permission to delete files
- `mcp__cowork__present_files` — present files to Ryan with download links
- `mcp__2d7200c4__get_configuration_url` — get configuration URL for a connector

---

## WHEN TO ROUTE TO COWORK (for terminals)

1. **Reconnaissance before coding** — full picture of codebase state before any file is touched
2. **Cross-file audits** — every instance of a pattern across the whole repo
3. **Bulk normalization** — mechanical changes across 5+ files simultaneously
4. **Doc-to-code verification** — does the code match what the spec says?
5. **Cross-boundary bugs** — bug involves files owned by T1 AND T2 (or any multi-terminal scope)
6. **Pre-commit review** — diff staged changes against full codebase to catch regressions
7. **Live service checks** — Supabase queries, Vercel deployment status, Stripe verification
8. **Browser testing** — Cowork can navigate to cinis.app, fill forms, inspect network requests
9. **Email/calendar actions** — anything involving Gmail or Google Calendar
10. **Document output** — specs, reports, postmortems, decks

## WHEN NOT TO ROUTE TO COWORK

- Complex feature builds requiring iterative `npm run dev` feedback loop — terminals own that
- Work that stays cleanly within one terminal's file domain with no external service checks

## HOW TO REQUEST COWORK

Terminal reports: `"This requires [cross-boundary scanning / live service check / bulk normalization] — recommend Cowork audit before proceeding."`

Ryan routes it. Cowork diagnoses. Terminals fix.

---

*COWORK_CAPABILITIES.md v2.1 · Updated S30 · March 30, 2026 · Full inventory including Base44 MCP*
