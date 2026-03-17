# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

**Development**
- `npm run dev` — Start Next.js dev server on `http://localhost:3000`
- `npm run build` — Build for production
- `npm start` — Start production server
- `npm run lint` — Run ESLint to check code quality

**Testing & Debugging**
- No automated test suite configured. Manual testing is primary.
- API routes can be tested via curl or browser at `http://localhost:3000/api/<endpoint>`
- Supabase queries: test against live Supabase project (dev/staging) — check `.env.local` for credentials

**Database**
- Migrations are SQL files in `database/migrations/`
- Run migrations manually in Supabase SQL Editor; they're additive with `IF NOT EXISTS` guards
- No migration runner script — migrations are reference docs for schema state

**Deployment**
- Deployed to Vercel. Git push to `main` triggers automatic deploy.
- Check `vercel.json` for cron schedules and redirects
- Environment variables managed in Vercel dashboard; local `.env.local` mirrors them

## Architecture

**Tech Stack**
- Next.js 14.1 (React 18) — page routes in `pages/`, API routes in `pages/api/`
- Supabase (PostgreSQL + auth) — initialized in `lib/supabase.js`
- CSS Modules — scoped styles in `styles/*.module.css`; global styles in `styles/globals.css`
- Claude API (Anthropic SDK) — imported as `@anthropic-ai/sdk` for insights, check-ins, chat
- Stripe (payment, not yet fully wired)
- Service Worker — registered in `_app.js`; defined in `public/sw.js` (PWA support)

**Data Model**
- Core tables in Supabase: `profiles`, `tasks`, `bills`, `journal_entries`, `checkins`, `alarms`
- Auth via Supabase (email/password)
- User sessions stored in Supabase auth; user ID from `getUser()` in auth helpers

**Page Structure**
- `index.js` — Landing page (public)
- `login.js` / `signup.js` — Auth pages
- `dashboard.js` — Main app (protected); ~228KB file with all dashboard UI
- `guide.js` — Onboarding/help guide
- `onboarding.js` — Setup wizard
- `pricing.js` — Pricing/subscription page
- `api/` — Backend routes for tasks, bills, journal, check-ins, Stripe, cron jobs

**Key Integrations**
- **Claude API** (`lib/anthropic.js`): Persona blending, insights, check-in messages, financial chat, task breakdowns
- **Supabase Auth** (`@supabase/auth-helpers-nextjs`): Session + user context in pages and API
- **Drag & Drop** (`@dnd-kit`): Task reordering; also `react-beautiful-dnd` (legacy, may be replaced)
- **Cron Jobs** (Vercel): `/api/cron/morning-checkin` and `/api/cron/evening-checkin` run at 8 AM and 8 PM UTC
- **Push Notifications** (`web-push`): Registered in service worker; sent from `/api/push-notification`

**Theme System**
- Theme state: localStorage key `theme` + Supabase `profiles.theme` column
- CSS variables in `styles/globals.css` + theme-specific overrides
- Light themes (Paper, Light): soft backgrounds; dark themes (Dark, Midnight): high contrast
- Icons may need dark overrides on light themes (known issue: Paper theme icons hard to see)

**Module Layout**
- `lib/` — Utilities: Supabase client, Claude API wrapper, date/task/bill helpers, persona system, push notifications, subscription gating
- `components/` — React components (minimal; most UI is inline in `dashboard.js`)
- `styles/` — CSS Modules (one main file: `Dashboard.module.css` at ~94KB)
- `database/` — Migration SQL files
- `scripts/` — Standalone scripts (if any; usually run from API routes)
- `public/` — Static files + service worker

**API Route Patterns**
- POST endpoints typically check `req.method` and extract `req.body`
- Auth via Supabase: `const user = await getUser(req, res)` or `const { data: { user } } = await supabase.auth.getUser()`
- Errors returned as JSON with status codes; no custom error middleware
- Some routes depend on user session in cookie (`_vercel_jwt` from Supabase auth helpers)

## Data Flow

1. **User opens app** → `_app.js` registers service worker → loads theme from localStorage/Supabase
2. **User logs in** → Supabase auth → session cookie set → redirect to dashboard
3. **Dashboard loads** → `dashboard.js` fetches tasks, bills, alarms from Supabase → renders all UI
4. **User creates task** → POST `/api/parse-task` (Claude parses) → stored in tasks table → UI updates (no state management, page refetch)
5. **Cron jobs** → Vercel calls `/api/cron/evening-checkin` at 8 PM → Claude generates check-in message → inserted into checkins table
6. **Check-in modal** → User can chat with Claude, replies sent to `/api/checkin` → persisted in checkins table
7. **Theme change** → POST `/api/settings` → updates `profiles.theme` → localStorage synced

## Notes for Development

**Large Files**
- `dashboard.js` is ~228KB; contains all dashboard UI inline (tasks, bills, alarms, check-ins, journal, chat, settings, theme selector)
- `Dashboard.module.css` is ~94KB with extensive theme variables
- If making UI changes, be aware of the scale and consider breaking into components for future refactoring

**No State Management**
- No Redux, Zustand, or Context API — state lives in Supabase and localStorage
- Page reloads or refetches after mutations; no optimistic UI updates
- This makes code simple but can feel slow; consider adding client state if UX degrades

**Authentication**
- Supabase auth session stored in secure cookie set by auth helpers
- Check `@supabase/auth-helpers-nextjs` docs for middleware/getServerSideProps patterns
- Some API routes check session via `getUser(req, res)`; some query Supabase directly with anon key

**Claude API Usage**
- Instantiated with `ANTHROPIC_API_KEY` in API routes
- Called for: task breakdowns, financial insights, persona blending, check-in generation, chat replies
- Model: typically Claude 3 or later (hardcoded in each route; check recent commits for current model)
- Streaming not used; all responses are full completions

**Env Vars (Required)**
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — public Supabase config
- `SUPABASE_SERVICE_ROLE_KEY` — for server-side operations with elevated privileges
- `ANTHROPIC_API_KEY` — for Claude API calls
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` — Stripe integration (partial)

**Common Tasks**
- **Add a new API endpoint**: Create file in `pages/api/`, handle POST/GET, query Supabase, return JSON
- **Add a new page**: Create file in `pages/`, use Supabase client to fetch data, render JSX
- **Modify theme colors**: Edit CSS variables in `styles/globals.css` and theme sections in `Dashboard.module.css`
- **Debug Supabase queries**: Check browser console (client) or Vercel logs (API) for errors; test queries in Supabase SQL Editor first
- **Test Claude API changes**: Check `/api/checkin.js`, `/api/parse-task.js`, etc.; note that some routes may hardcode model names

**Known Issues & TODOs**
- Paper theme: interactive icons (stars, drag handles, delete buttons) are hard to see due to low opacity on cream background
- Check-in tab: ~900px empty grey space above messages (Journal tab already fixed this; fix needs to be applied to Check-in)
- No automated tests; quality relies on manual QA
- Stripe integration incomplete (checkout/webhook placeholders exist)
- Large monolithic CSS file may benefit from refactoring into component modules
