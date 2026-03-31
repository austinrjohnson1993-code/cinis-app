# 20. LANDING PAGE (getcinis.app)

## 20.1 Overview
- **File:** pages/index.js (serves getcinis.app domain via vercel.json)
- **Components:** components/landing/* — LandingNav, LandingHero, LandingFeatureCard, LandingFeatureDemo, LandingPricing, LandingFooter, LandingBackground
- **Styles:** styles/Landing.module.css
- **Spec:** getcinis_landing_spec.md in Core project files

## 20.2 Waitlist Form (Email + Phone)
- **What happens:** User enters email + optional phone → taps "Get early access"
- **What moves:** POST to /api/waitlist — saves email + phone to waitlist table in Supabase
- **Two instances:** Hero section + Pricing section — both submit to same endpoint
- **Fields:** email (required), phone (optional)
- **Side effects:** None — no auth, no session, no redirect. Shows success state inline.

## 20.3 Feature Card Tap
- **What happens:** User taps any of the 5 feature cards
- **What moves:** JS renders an overlay inside the card element (position: absolute, z-index: 20)
- **Two tabs — both immediately interactive:**
  - Tab 0 "Conversation": Chat bubbles animate in sequentially using setTimeout delays
  - Tab 1 "In the app": Renders the feature's appUI() function immediately — no wait
- **After conversation ends:** "In the app" tab pulses orange (tabPing animation, 4 iterations)
- **Close:** X button removes overlay from DOM, timers cleared
- **Side effects:** None — no API calls, no state changes, pure presentation

## 20.4 Mark Animation (Hero)
- **What happens:** On page load, the Cinis mark builds layer by layer then floats
- **Sequence:** Outer stroke traces (2s) → outer fill pops in → 8 inner layers stagger in (280ms each) → float + glow + embers activate at t=5.2s
- **No sessionStorage gate** — this is the marketing page, not the app intro. Plays every load.
- **Side effects:** None — pure CSS/JS animation

## 20.5 Navigation Links
- Nav: "How it works" scrolls to feature section, "Pricing" scrolls to pricing section, "Sign in" links to cinis.app/login
- CTA button: links to cinis.app/signup
- **Side effects:** None

## 20.6 Responsive Behavior
- < 768px: Mobile layout — single column, mark centered in hero
- ≥ 1024px: Desktop layout — hero splits 2-column (copy left, mark right), feature cards 2-col grid
- Card 05 (One Place): Full-width on desktop with app UI pre-rendered on right panel

---

*Added S28 · March 27, 2026*

---

# 9. FINANCE TAB

## 9.1 Bills sub-tab
- Fetches `bills` table on mount via `supabase.from('bills').select('*')`
- Displays bills grouped by category with monthly totals
- Category breakdown bars computed client-side from bills array
- Add/edit/delete via `supabase.from('bills').insert/update/delete`
- Voice input: SpeechRecognition → POST /api/parse-bill → prefills form fields

## 9.2 Budget sub-tab
- Daily number = `(monthly_income - bills_total - savings) / days_until_payday`
- `days_until_payday`: derived from `income_sources[0].next_pay_date` if present, else falls back to pay frequency period (weekly=7, biweekly=14, bimonthly=15, monthly=30)
- Income: `profile.monthly_income` (updated via PATCH /api/settings) or `budgetData.income`
- Bills total: sum of all bills, normalised to monthly equivalent
- Budget style (Pay Yourself First / 50/30/20 / 80/20 / Zero-based): local state only, saved to localStorage
- Spend log: GET /api/finance/spend?timezone= (today only) + POST /api/finance/spend
- Income sources section: populated from GET /api/finance/budget → income_sources table
- Payday plan card: bills with due_day between today and next payday, computed client-side
- Side effects: Income saves via PATCH /api/settings → updates profile state

## 9.3 Budget API  (/api/finance/budget)
- GET only, withAuth protected
- Fetches: profiles (monthly_income, income_frequency, payday_day), bills, income_sources in parallel
- Returns: { income, income_frequency, bills_total, income_sources, suggested_savings, bills }
- suggested_savings = income * 0.20

## 9.4 Finance Plans — Calculators
- Debt payoff: reads bills WHERE bill_type='loan' to pre-fill balance + interest rate fields; calculates payoff months + total interest client-side (amortisation formula)
- Emergency fund: user-input monthly expenses + coverage target selector (3/6/9/12 mo), calculates goal + monthly save rate
- Subscription true cost: user-input monthly cost; projects 1yr / 5yr / 10yr; shows hours-of-work equivalent if income known
- Compound interest: principal + annual rate + years + monthly contribution; calculates future value client-side
- Auto-budget builder: reads /api/finance/budget income value (falls back to profile.monthly_income), displays pre-filled 50/30/20 breakdown against real bills total
- Side effects: none — all read-only calculations. planCalcInputs local state only.

## 9.5 Spend Log
- Table: spend_log (id, user_id, amount, category, description, impulse, logged_at)
- INSERT via POST /api/finance/spend or POST /api/finance/spend-log
- GET /api/finance/spend?timezone=: returns today's entries + today_total for Budget tab daily number
- GET /api/finance/spend-log: returns last 30 entries across all dates
- Side effects: remaining daily allowance recalculates on next Budget tab load (todaySpendTotal refreshed via fetchSpendLog)

*Added S30 · March 30, 2026*
