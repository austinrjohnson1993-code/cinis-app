# Cowork — Capabilities & When to Use

*Written by Cowork (Claude Desktop Opus) · S29 · March 27, 2026*

Cowork is Ryan's always-on desktop Claude running Opus. It operates with full read/write access to the Cinis-app repo. It is NOT a Claude Code terminal — it's a separate tool with a different capability set.

## What Cowork Can Do

- **Full codebase read access** — reads, greps, and globs every file simultaneously. No file-at-a-time limitation.
- **Multi-agent parallel search** — spawns sub-agents that scan different parts of the codebase concurrently. Full-repo audit in under 2 minutes vs 30+ minutes for a single terminal.
- **Cross-reference code against docs** — reads all planning docs and compares actual code state against intended state. Catches misalignments, not just bugs.
- **Write and edit files directly** — surgical edits, bulk renames, entire new files. Can rename 8 localStorage keys across 5 files in one pass.
- **Run bash commands** — npm, git, node, any CLI tool. Builds, lints, scripts.
- **Web search and fetch** — live docs, APIs, current information.
- **MCP integrations** — Supabase (SQL, migrations, tables), Vercel (deployments, logs, projects), Stripe (products, prices, subscriptions), Gmail, Google Calendar, Google Drive.
- **Create documents** — .docx, .pptx, .xlsx, .pdf with professional formatting.

## When to Use Cowork

1. **Reconnaissance before a session** — complete picture before terminals write any code
2. **Cross-file audits** — every instance of a pattern, import resolution, constant consistency
3. **Bulk normalization passes** — mechanical changes across 5-15 files (font replacements, key renames, brand purges)
4. **Doc-to-code verification** — does the code match what the spec says?
5. **Bug hunts that cross terminal boundaries** — when a bug involves files owned by T1 AND T2
6. **Pre-commit review** — diff staged changes against full codebase to catch regressions
7. **Live service checks** — Supabase queries, Vercel deployment status, Stripe product verification

## When NOT to Use Cowork

- Complex feature builds requiring iterative npm run dev + browser verification
- Visual QC (no browser/screenshot capability)
- Long-running interactive processes
- Work that stays cleanly within one terminal's domain

## How Terminals Request Cowork

Report: "This requires cross-boundary scanning — recommend Cowork audit before proceeding."
Core will route it.

---

*Reference this before deciding whether to send a bug fix to a terminal or Cowork first.*
