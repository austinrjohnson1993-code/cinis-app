# Cinis — Launch Checklist
*Created: S26 · March 25, 2026 · Launch target: April 14, 2026*
*Every item must be checked before going live. No exceptions.*

## BLOCKING — Cannot launch without these

### Legal & Financial
- [ ] LLC filed — Texas Secretary of State
- [ ] Stripe live mode activated (unlocks after LLC)
- [ ] Stripe live keys swapped into Vercel env vars (STRIPE_SECRET_KEY, STRIPE_PUBLISHABLE_KEY, NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY, STRIPE_WEBHOOK_SECRET)
- [ ] Stripe live webhook registered at https://cinis.app/api/stripe/webhook
- [ ] Stripe Pro flip tested end-to-end with real card (payment → webhook → subscription_status = 'pro')

### Email
- [ ] Resend sender domain verified (cinis.app)
- [ ] Signup confirmation email sending + landing in inbox (not spam)
- [ ] Password reset email sending + link works end-to-end

### App — Must Work
- [ ] Signup — email/password — end to end
- [ ] Signup — Google OAuth — end to end
- [ ] Onboarding — all 13 questions + baseline profile generates
- [ ] Dashboard loads after onboarding
- [ ] Check-in AI responds (rate limit: free 5/day, pro 15/day)
- [ ] Task add / complete / star / delete all work
- [ ] Voice FAB — tap, speak, task created
- [ ] Finance Bills tab loads + add bill works
- [ ] Progress tab loads without errors
- [ ] Settings — persona edit saves + affects next AI response
- [ ] Log out → /login · Log in → /dashboard
- [ ] Forgot password flow works end-to-end

### Visual — Must Match Mockup
- [ ] All 11 tabs QC confirmed by Solver 3
- [x] Zero FocusBuddy references in app or landing page
- [ ] Brand colors correct across all tabs
- [x] Rounded Cinis mark everywhere (not sharp-polygon)

## COMPLETED — Session 27
- [x] Stripe code clean / ready for live key swap
- [x] Onboarding animations wired
- [x] Password reset flow built
- [x] Font size corrections (229 fixes)
- [x] All 3 cron routes fixed + CRON_SECRET live
- [x] Landing page sign-in link corrected
- [x] Footer Terms link added
- [x] getcinis.com domain references scrubbed
- [x] OG meta tags fixed to absolute URLs
- [x] Rounded mark canonical component (lib/CinisMark.js)
- [x] Monthly insight distinct from weekly
- [x] Delete account cancels Stripe subscription before deletion
- [x] Nested focusbuddy-app directory deleted
- [x] FocusBuddy references purged from migration comments
- [x] Pricing constants centralized (lib/constants.js PRICING)
- [x] delete-account.js secured with authGuard
- [x] seed-test-data.js and reset-test-data.js gated in production
- [x] backfill-baseline-profiles.js secured with admin key
- [x] Savings percentage consistent (41%) across all pricing files
- [x] authGuard naming normalized across all API routes
- [x] TERMINAL_CONTEXT.md stale references updated

## IMPORTANT — Should have at launch
- [ ] VAPID_KEY + VAPID_PUBLIC_KEY duplicates removed from Vercel
- [x] getcinis.app fully rebranded
- [x] OG meta image updated on cinis.app
- [x] Favicon is rounded Cinis mark
- [x] Push notification toggle in Settings wired end-to-end
- [ ] At least 1 real Pro subscriber confirmed

## BLOCKING — Remaining for launch
- [ ] LLC filed
- [ ] Stripe live mode activated (swap 2 env vars in Vercel)
- [ ] Stripe Pro flip confirmed end-to-end with real card
- [ ] Twilio A2P 10DLC registration
- [ ] All social platform logos updated to rounded mark
- [ ] 5+ beta testers identified and onboarded
- [ ] Resend sender domain verified
- [ ] getcinis.app landing page built and live
- [ ] Supabase custom domain — upgrade to Pro ($25/mo) → Project Settings → Custom Domains → set auth.getcinis.app → replaces raw Supabase URL on Google OAuth consent screen. Do this last before April 14.
- [ ] Human QC pass — every tab, every flow
- [x] Voice FAB built and tested

## Ryan Personal Actions
- [ ] File LLC — CRITICAL
- [ ] Remove LinkedIn "Open to work" badge
- [ ] Identify 5–10 beta testers by name
- [ ] Update Resend sender to cinis.app
- [ ] Re-upload rounded mark to Instagram, X, Reddit, LinkedIn, Google OAuth, Stripe

## POST-LAUNCH — Do not block on these
- A2P 10DLC (Twilio) · SMS check-ins (V1.3) · Google Calendar sync
- Tag Team full build (V1.4) · Nutrition full build (V1.2)
- Finance full build (V1.2) · React Native (V2.0) · DMARC record

## Revenue Gate
628 Pro subscribers = $8,792/month = break-even

*Core reviews at every session close.*
