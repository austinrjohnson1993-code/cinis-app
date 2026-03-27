# SESSION 28 PRIMER — Cinis
*Generated: March 26, 2026 · End of S27 · T5 Opus*
*Launch target: April 14, 2026 — 19 days out*

---

## 1. WHERE WE ARE

**App score:** ~8.0/10 (estimated — up from 7.5 at S9, needs Solver 3 confirmation)
**Total commits:** 271
**Estimated hours:** ~130 hrs cumulative
**Branch:** main — clean, no open PRs

### What shipped since S26:
- Dashboard split complete — 7,242 → 326 lines, 11 tab components extracted
- Security hardening — authGuard on all API routes (batches 1 + 2 + bills-to-tasks)
- 97 console.logs purged from API routes (including API key leak)
- Mobile polish — tap targets + font sizes across 5 tabs
- Capacitor added for iOS/Android native builds
- Favicon replaced with rounded Cinis mark PNG
- OG image added for social sharing
- Shared color/font constants refactored to lib/constants.js
- Midday check-in cron with push notifications live
- Settings.json hooks format corrected

### What's confirmed working (QC'd S27):
- vercel.json: 4 crons active (morning/midday/evening/progress-snapshot)
- checkin.js: authGuard imported, handler wrapped, rate limiting present
- lib/push.js: sendPushNotification + sendPushToUsers exported correctly, dead subscription cleanup built in
- notifications/subscribe.js: authGuard wrapped, subscribe + unsubscribe paths validated
- Security headers: nosniff, DENY frame, CSP all present

---

## 2. S28 OPENING ORDER

| Priority | Task | Terminal | Notes |
|----------|------|----------|-------|
| 1 | Solver 3 QC sweep — all 11 tabs | T1 | Get real score. Cannot proceed to Wave 3 without 8.0+ |
| 2 | Push notification toggle — wire to Settings UI | T1 | Infra is built (lib/push.js, subscribe.js). Frontend connection missing |
| 3 | OG meta image confirm on cinis.app | T1 | og-image.png committed — verify it renders on social share |
| 4 | VAPID env var cleanup in Vercel | Ryan | Delete VAPID_KEY + VAPID_PUBLIC_KEY, keep NEXT_PUBLIC_VAPID_PUBLIC_KEY + VAPID_PRIVATE_KEY |
| 5 | session_start.sh path verification | T3 | May reference old focusbuddy-app path |
| 6 | Stripe Pro flip — blocked on LLC | Ryan+T2 | Cannot unblock until LLC filed |

---

## 3. KNOWN ISSUES ENTERING S28

### Blockers (P1)
1. **Stripe Pro flip not verified** — live mode blocked until LLC is filed. Ryan action.
2. **Push notification toggle not wired to UI** — backend complete, frontend connection missing. T1.

### Queue (P2)
3. Solver 3 QC results still pending — no confirmed app score since S9.
4. VAPID_KEY / VAPID_PUBLIC_KEY duplicate env vars in Vercel — Ryan cleanup.
5. session_start.sh may still reference `focusbuddy-app` path.

### Accepted / Deferred
- Check-in dead space — ACCEPTED. Do not fix.
- Persona voice differentiation — deferred until fresh strategy.
- Timer font in Focus tab — may have been fixed in mobile polish pass. Verify in QC.
- Finance Insights empty state copy — verify in QC.

---

## 4. TERMINAL SETUP

| Terminal | Model | Domain | S28 Role |
|----------|-------|--------|----------|
| T1 | Sonnet 4.6 | dashboard.js + Dashboard.module.css | Solver 3 QC + push toggle UI |
| T2 | Sonnet 4.6 | pages/api/* | Stripe prep (blocked on LLC) |
| T3 | Haiku 4.5 | lib/* + public/* + scripts/* + PWA | session_start.sh path fix |
| T4 | Haiku 4.5 | pages/onboarding.js + new pages + vercel.json | Standby |
| T5 | Opus 4.6 | Escalations only | On call if Sonnet fails 3 passes |
| T6 | — | Ralph autonomous builds | Wave 3 only, after QC ≥ 8.0 |

**Conflict rule active:** T2/T3/T4 do not touch lib/taskOrder.js, components/SortableTaskCard.js, or lib/accentColor.js while T1 is active.

---

## 5. RYAN PERSONAL ACTIONS — STILL PENDING

| Action | Status | Blocks |
|--------|--------|--------|
| File LLC (Texas SOS) | NOT DONE | Stripe live mode, launch |
| Remove LinkedIn "Open to work" badge | NOT DONE | Nothing, but visible |
| Identify 5-10 beta testers by name | NOT DONE | Soft launch quality |
| Update Resend sender to cinis.app | NOT DONE | Email deliverability |
| Re-upload rounded mark to Instagram, X, Reddit, LinkedIn, Google OAuth, Stripe | NOT DONE | Brand consistency |
| Delete duplicate VAPID env vars in Vercel | NOT DONE | Clean config |

**LLC is the critical path.** Everything Stripe-related is gated behind it.

---

## 6. NUMBERS

| Metric | Value |
|--------|-------|
| Total sessions | 27 completed |
| Estimated total hours | ~130 hrs |
| Total commits | 271 |
| Current app score | ~8.0 (unconfirmed — last confirmed 7.5 at S9) |
| Target app score | 8.5 for launch |
| Launch date | April 14, 2026 |
| Days remaining | 19 |
| Sessions remaining (est.) | 5-8 (depending on pace) |
| Revenue break-even | 628 Pro subscribers @ $13.99/mo = $8,792/mo |
| Launch blockers | 3: LLC → Stripe live, push toggle UI, app score 8.5 |

### Launch Checklist Status
- **Legal & Financial:** 0/5 complete (all blocked on LLC)
- **Email:** 0/3 complete (Resend domain not verified)
- **App — Must Work:** ~8/12 likely working (needs Solver 3 verification)
- **Visual — Must Match:** 0/4 formally confirmed (needs QC sweep)

---

## S28 DECISION POINT

If Solver 3 QC returns **≥ 8.0**: proceed to Wave 3 feature work (push toggle, Stripe prep).
If Solver 3 QC returns **< 8.0**: stay in Wave 1/2. Fix before building.

**Do not skip QC. Do not estimate score. Run Solver 3.**

---

*SESSION_28_PRIMER.md · Generated by T5 Opus · March 26, 2026*
