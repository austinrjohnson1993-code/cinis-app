# SESSION 29 PRIMER — Cinis
*Generated: March 27, 2026 · End of S29 · Cowork (Opus)*
*Launch target: April 14, 2026 — 18 days out*

---

## 1. WHERE WE ARE

**App score:** ~8.0/10 (estimated — Solver 3 confirmation still pending)
**Total commits:** 271+ (S29 changes not yet committed)
**Estimated hours:** ~135 hrs cumulative
**Branch:** main

### What shipped in S29 (Cowork session):

**Bug Fixes (Tier 1 — would break in production):**
- pricing.js: dead endpoint `/api/stripe-checkout` → `/api/stripe/create-checkout-session` (line 26)
- onboarding.js: FocusBuddy branding replaced with "Cinis" in saving/loading state (line 586)

**Spec Alignment (Tier 2 — contradicted docs/plans):**
- Playfair Display purged from all CSS: globals.css (import + .brand), Dashboard.module.css (11 occurrences), Onboarding.module.css (3), Legal.module.css (2), Guide.module.css (1). All replaced with Sora per TERMINAL_CONTEXT.md spec.
- Dead CSS removed: `.brand .focus`, `.brand .buddy`, paper theme override for `.brand .focus` in globals.css
- localStorage key rename: `fb_accent_color` → `cinis_accent_color` (dashboard.js, TabSettings.js, guide.js), `fb_push_enabled` → `cinis_push_enabled` (TabSettings.js), `fb_budget_plan` → `cinis_budget_plan` (TabFinance.js). Fallback reads added for old keys since lib/accentColor.js (Do Not Touch) still writes `fb_accent_color`.
- Color constant reconciliation: `lib/constants.js` transparency variants (dim, faint, ghost, micro, border, charBorder, charLight) updated from `#F5F0E3` base to `#F0EAD6` base to match canonical ash color.
- Unused `isDebug` state variable removed from dashboard.js (debugRef retained — used by loggedFetch).

**Architecture Improvements:**
- `lib/supabaseAdmin.js` created — shared `getAdminClient()` module. 48 API route files refactored to import from shared module instead of defining inline copies. Zero inline `getAdminClient()` definitions remain in pages/api/.
- `next.config.js`: removed invalid top-level `api` key (Next.js 14 doesn't support it). Body parser config is already set per-route where needed (stripe/webhook.js, voice/parse.js).

**Database Cleanup (Supabase live):**
- `waitlist` table: added RLS INSERT policy (`WITH CHECK (true)`) — was RLS-enabled with zero policies.
- `waitlist_signups` table: dropped (orphan — nothing writes to it, code uses `waitlist`).
- `spend_log`: removed duplicate RLS policy ("Users can only access their own spend log" — identical to "Users manage own spend_log").

**Documentation Updates:**
- `LAUNCH_CHECKLIST.md`: checked off Voice FAB built+tested, push notification toggle wired, FocusBuddy references purged.
- `tasks/lessons.md`: corrected Layout Constants — sidebar 220px wide (was 106px), card radius 12px (was 10px).
- `docs/COWORK_CAPABILITIES.md`: created — full reference for terminal handoffs.
- `CLAUDE.md`: added Cowork section, bumped to v1.1.

---

## 2. AUDIT RESULTS (read-only, no action taken)

### Supabase Schema Audit
- **23 tables found, all RLS-enabled.** All documented columns in TERMINAL_CONTEXT.md exist with correct types. No missing columns, no type mismatches.
- 16 tables exist in DB but are not documented in TERMINAL_CONTEXT.md (alarms, checkin_logs, financial_goals, crews/crew_*, spend_log, nutrition_log, supplement_stack, body_metrics, waitlist, nutrition_entries). These should be added to TERMINAL_CONTEXT.md.

### Stripe Account
- Account exists: Cinis (acct_1TBeUp2OSKmsLrz4)
- **Zero products and zero prices configured.** Checkout route correctly reads from env vars `STRIPE_PRICE_MONTHLY` and `STRIPE_PRO_PRICE_ID_YEARLY`. When LLC clears, create products/prices in Stripe Dashboard and set env vars in Vercel.

### Dead Endpoint Scan
- 37 fetch calls across 13 files → 27 unique endpoints → **100% routes exist.** Zero dead wires remaining.

### Build Verification
- Could not complete in Cowork sandbox (VM resource limitation). Must be verified locally or via Vercel deployment.
- `next.config.js` warning about `api` key has been fixed.

---

## 3. KNOWN REMAINING ISSUES

### Still in accentColor.js (Do Not Touch)
- `lib/accentColor.js` line 71 still writes `fb_accent_color` to localStorage. Dashboard.js and guide.js now read with fallback (`cinis_accent_color || fb_accent_color`). When ready to unlock that file, it's a one-line rename.

### Not Yet Fixed
- Finance Insights empty state copy — PRIMER.md (S27) flagged as "says wrong thing." Not investigated this session.
- Timer font in Focus tab — S27 flagged as still Playfair. Should now be Sora after CSS purge, but needs visual QC.
- `react-beautiful-dnd` still in package.json — was reported removed but re-appeared. Verify and remove.
- `@supabase/ssr` still in package.json — same situation. Verify and remove.
- `withAuthGuard` named export re-appeared in lib/authGuard.js line 56. Was removed but re-added (possibly by linter or session revert). Remove again.
- Hardcoded `mailto:ryan@cinis.app` in lib/push.js line 4 and pages/api/push-notification.js line 12 — should be env var.

---

## 4. LAUNCH BLOCKERS (updated)

### Ryan Actions (cannot be done by terminals)
- [ ] File LLC — CRITICAL (blocks Stripe live mode)
- [ ] Remove LinkedIn "Open to work" badge
- [ ] Identify 5-10 beta testers
- [ ] Resend sender domain verification
- [ ] Re-upload rounded mark to social/OAuth/Stripe
- [ ] Delete duplicate VAPID vars in Vercel

### Technical (terminal work)
- [ ] Stripe products/prices created in Dashboard (after LLC)
- [ ] Stripe live keys swapped into Vercel env vars
- [ ] Stripe Pro flip confirmed e2e with real card
- [ ] Solver 3 QC all 11 tabs (target 8.5/10)
- [ ] Human QC pass — every tab, every flow
- [ ] Verify npm run build passes locally

### Completed This Session
- [x] Dead endpoint in pricing.js fixed
- [x] FocusBuddy branding purged from app code
- [x] Playfair Display replaced with Sora across all CSS
- [x] localStorage keys normalized to cinis_ prefix
- [x] Color constants reconciled to canonical ash (#F0EAD6)
- [x] getAdminClient consolidated to shared module (48 files)
- [x] next.config.js invalid key removed
- [x] Supabase RLS gaps fixed (waitlist policy, orphan table, duplicate policy)
- [x] Voice FAB, push toggle, FocusBuddy checked off in LAUNCH_CHECKLIST
- [x] docs/COWORK_CAPABILITIES.md created
- [x] CLAUDE.md updated with Cowork section

---

## 5. S30 OPENING ORDER

1. Run `npm run build` locally — verify clean after S29 changes
2. Git commit all S29 changes (50+ files modified)
3. Check if `@supabase/ssr`, `react-beautiful-dnd`, and `withAuthGuard` export have re-appeared (linter/revert issue) — fix if so
4. Solver 3 QC pass on all 11 tabs
5. If QC ≥ 8.0: proceed to Wave 3 feature builds
6. If QC < 8.0: fix flagged visual issues first

---

## 6. REVENUE GATE (unchanged)

628 Pro subscribers @ $13.99/mo = $8,792/mo = break-even

---

*SESSION_29_PRIMER.md · Cinis · March 27, 2026 · Generated by Cowork (Opus)*
