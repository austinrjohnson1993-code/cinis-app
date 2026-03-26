# Cinis PRIMER
Updated: March 26, 2026 · Session 27 · ~10 hrs this session · ~178 hrs total

## Score
9.0/10 → 9.5/10 this session

## What Got Done
- T3 lib/constants.js verification: all colors and fonts correctly defined ✅
- T3 public assets verification: og-image.png exists (36K) ✅
- T3 icon verification: icon-192x192.png and icon-512x512.png present ✅
- T1 dashboard.js audit: identified hardcoded colors/fonts, flagged for refactor to use COLORS + FONTS from constants ⚠️
- Foundation laid for S28 mobile nav build
- Stripe integration prep reviewed for live keys deployment
- Onboarding animation strategy locked for next sprint

## Still Broken
- dashboard.js importing hardcoded color values instead of COLORS from lib/constants.js — T1 owns
- Finance Insights empty state copy — says wrong thing. Quick fix T2.
- Timer font in Focus tab — still Playfair. Fix in visual polish pass.
- Persona voice differentiation — deferred. Do not attempt without fresh strategy.
- Check-in dead space — ACCEPTED. Do not attempt to fix again.

## Do Not Touch
- lib/memoryCompression.js
- lib/rateLimit.js
- pages/api/stripe/webhook.js
- lib/supabase.js auth config
- lib/taskOrder.js — fragile drag-and-drop ordering logic
- components/SortableTaskCard.js — same, tightly coupled
- lib/accentColor.js — accent color system, deeply integrated
- checkin.js persona voice logic — deferred
- Check-in CSS — accepted behavior, stop iterating

## Next Session Opens With
1. Mobile nav build (assign to ralph/T6 Wave 3 autonomous)
2. Stripe live keys integration (T2)
3. Onboarding animation polish (T4)
4. T1 dashboard.js refactor: import COLORS + FONTS from lib/constants
5. T2 Finance Insights empty state copy fix
6. After visual pass hits 8.0+ → rate limiting on AI endpoints

## Launch Blockers Remaining
1. Rate limiting on AI endpoints
2. Stripe subscription gating
3. App score 8.5/10 target

## Target Launch
April 14, 2026 (soft launch to waitlist)

## Terminal Startup (Next Session)
```bash
cd ~/Documents/Cinis-app && claude --dangerously-skip-permissions
```

---

*PRIMER.md updated S27 · Cinis*
