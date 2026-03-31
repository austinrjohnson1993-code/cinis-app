# 22. NUTRITION TAB (components/tabs/TabNutrition.js)

## 22.1 Overview
- **File:** components/tabs/TabNutrition.js
- **Sub-tabs:** `log | meals | stack | body | insights | knowledge | learn`
- **DB tables:** `nutrition_log`, `supplements`, `body_metrics`, `saved_meals`
- **API routes:** `/api/nutrition/log`, `/api/nutrition/water`, `/api/nutrition/meals`, `/api/nutrition/supplements`, `/api/nutrition/weight`, `/api/nutrition/body`, `/api/nutrition/insights`

## 22.2 Log Sub-tab
- **On mount:** GET `/api/nutrition/log?timezone=` → returns today's `entries` + `totals` + `targets`
- **Macro ring:** calorie progress circle (calories / target) drawn with SVG; protein/carbs/fat bars below
- **Water dots:** count derived client-side from `logEntries.filter(e => e.meal_type === 'water').length`
  - Tap unfilled dot → POST `/api/nutrition/water` → re-fetches log
  - Tap filled dot → DELETE `/api/nutrition/water` → re-fetches log
- **Add meal:** opens `LogMealSheet`; `onSave` → resets `logLoaded` + re-fetches
- **Quick-log saved meal:** POST `/api/nutrition/log` with `{ template_id }` → optimistically updates totals + log_count on saved meal

## 22.3 Stack Sub-tab (Supplements)
- **Lazy load:** fetched only when `nutrSub === 'stack'` and `!suppLoaded`
- **Source:** GET `/api/nutrition/supplements` → returns `supplements[]`
- **Grouping:** client-side `suppGroups` map keyed by timing_group, ordered by TIMING_ORDER array
- **Taken today:** computed as `supp.last_taken_date === todayStr` (no boolean column — date comparison only)
- **Toggle taken:** PATCH `/api/nutrition/supplements` with `{ id, taken: !takenToday }` → optimistic update on supplement item
- **Add supplement:** opens `AddSupplementSheet`; `onSave` → resets `suppLoaded` + re-fetches

## 22.4 Meals Sub-tab (Saved Meals)
- **Lazy load:** fetched only when `nutrSub === 'meals'` and `!mealsLoaded`
- **Source:** GET `/api/nutrition/meals` → returns `meals[]` with `log_count`
- **Create meal:** opens `CreateSavedMealSheet`; `onSave` → resets `mealsLoaded` + re-fetches

## 22.5 Body Sub-tab
- **Lazy load:** fetched only when `nutrSub === 'body'` and `!weightLoaded`
- **Weight log:** GET `/api/nutrition/weight` → returns recent entries for sparkline
- **Body goal:** GET `/api/nutrition/body` → returns `{ goal }` from `body_metrics`; saved via POST
- **Log weight:** opens `LogWeightSheet`; `onSave` → resets `weightLoaded` + re-fetches

## 22.6 Insights Sub-tab
- **Lazy load:** fetched only when `nutrSub === 'insights'` and `!insightsLoaded`
- **Source:** GET `/api/nutrition/insights`
  - Fetches 7-day `nutrition_log` entries + all `supplements` in parallel
  - Computes: avg_meals_per_day, avg_calories_per_day, avg_protein_per_day, avg_water_per_day, supplement_adherence_pct
  - Calls `claude-haiku-4-5-20251001` (120 max_tokens) for a 2–3 sentence coaching insight
  - Returns `{ stats, insight }`
- **No AI call** if no log entries exist in the last 7 days

## 22.7 Knowledge + Learn Sub-tabs
- **Knowledge:** static filter chips (All / Protein / Carbs / Fat / Hydration / Supplements / Weight); renders NCard content cards
- **Learn:** static filter chips + static lesson cards (no API calls)

## 22.8 Supplement API — Key Field Notes
- **Table:** `supplements` (id, user_id, name, dose, form, timing_groups text[], frequency, frequency_days text[], preferred_time, note, last_taken_date date, created_at)
- **POST payload fields:** `name`, `dose`, `form`, `timing_groups` (array), `frequency` ('daily'|'trainingdays'|'weekdays'|'custom'), `frequency_days` (array of day strings when custom), `preferred_time` (HH:MM string, optional), `note`
- **PATCH payload fields:** `id`, `taken` (boolean) — server sets `last_taken_date` to today or null

## 22.9 Water API — Key Notes
- Water NOT tracked as a separate table — stored in `nutrition_log` with `meal_type = 'water'`, `calories = 0`
- GET returns `{ count, entries }` for today by timezone
- DELETE removes the most recently logged water entry for today (LIFO)

*Added S30 · March 30, 2026*

---

# 21. ONBOARDING (pages/onboarding.js)

## 21.1 Overview
- **File:** pages/onboarding.js
- **Styles:** styles/Onboarding.module.css
- **Phases:** `context → intro → questions → part2 → analyzing → reveal → building`

## 21.2 Part 1 — Questions (9 MC, 3 slides of 3)
- **SLIDE_THEMES:** `['Your daily reality', 'Your life systems', 'Your coaching style']`
- **Q1–Q3:** Daily plan relationship, finding out you're behind, money habits
- **Q4–Q6:** Body/health reality, handling boring stuff, mental clutter
- **Q7–Q9:** Stuck task shepherd move, accountability relationship, most unguided area
- **Scoring:** `SCORING[qIdx][optionId]` → weights for 6 personas (drill_sergeant, coach, thinking_partner, hype_person, strategist, empath)
- **On last slide:** `handleNextSlide` transitions to `part2` phase

## 21.3 Part 2 — Shepherd Questions (3 steps)
- **Step 0 (Q10):** Open text — "What is one thing currently weighing on your mind the most?" → saves to `shepherdFocus` state
- **Step 1 (Q11):** 3-option MC — bad pattern interrupt preference (flag / weekly / quiet step) → saves to `shepherdInterrupt` state
- **Step 2 (Q12):** 3-option MC — celebration style (progress / streak / chart) → saves to `shepherdCelebrate` state
- **Submit:** `handlePart2Submit` → `computePersonas(answers)` → `personaBlend` → `analyzing` → 1.5s → `reveal`
- **Progress bar:** `((TOTAL_SLIDES + 1 + part2Step) / (TOTAL_SLIDES + 3)) * 100`

## 21.4 Reveal + Confirm
- Shows primary persona label + secondary persona "energy"
- User picks voice preference (warm_gentle / warm_direct / bold_direct / calm_analytical)
- `handleConfirm` upserts to `profiles`: full_name, onboarded, persona_blend, persona_voice, checkin_times, shepherd_focus, shepherd_interrupt, shepherd_celebrate
- Falls back to upsert without shepherd fields if columns missing

## 21.5 Persona Computation
- `computePersonas(answers)` tallies SCORING weights across all 9 MC answers
- Returns top 3 personas with score > 2, falls back to `['coach']`
- Persona labels come from `PERSONA_DEFS[key].label`

*Added S30 · March 30, 2026*

---

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
